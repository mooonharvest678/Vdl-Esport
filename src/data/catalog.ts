// Playable-uma catalog, read from the TazunaBot asset repo at runtime so that newly
// released characters appear here without this site having to be rebuilt.

const CATALOG_URL =
  'https://raw.githubusercontent.com/JustWastingTime/TazunaDiscordBot/heads/main/assets/character.json';

const CACHE_KEY = 'ccp.catalog.v1';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export const APTITUDE_GRADES = ['S', 'A', 'B', 'C', 'D', 'E', 'F', 'G'] as const;
export type Aptitude = (typeof APTITUDE_GRADES)[number];

export const DISTANCES = ['Sprint', 'Mile', 'Medium', 'Long'] as const;
export type Distance = (typeof DISTANCES)[number];

export const SURFACES = ['Turf', 'Dirt'] as const;
export type Surface = (typeof SURFACES)[number];

/** What a lane can be tagged with, so slots in it can show a relevant aptitude grade. */
export const LANE_TAGS = [...DISTANCES, 'Dirt'] as const;
export type LaneTag = (typeof LANE_TAGS)[number];

export interface UmaCard {
  /** Outfit-level id, e.g. "100102". Unique per entry; this is what a slot stores. */
  cardId: string;
  /** Character-level id, e.g. "1001". Shared by every outfit of the same uma. */
  characterId: string;
  characterName: string;
  /** Variant label: "Original", "Summer", "Christmas", ... */
  type: string;
  costume: string;
  rarity: string;
  thumbnail: string;
  url: string;
  distance: Record<Distance, Aptitude>;
  surface: Record<Surface, Aptitude>;
  /** Lowercased name + costume + aliases, precomputed for the picker's search. */
  searchText: string;
}

export interface Catalog {
  cards: UmaCard[];
  byCardId: Map<string, UmaCard>;
  /** Outfits of each character, in release order. Keyed by characterId. */
  byCharacterId: Map<string, UmaCard[]>;
}

/** Grade for a lane's tag: distances read from the distance aptitudes, Dirt from surface. */
export function aptitudeForLane(card: UmaCard, tag: LaneTag): Aptitude {
  return tag === 'Dirt' ? card.surface.Dirt : card.distance[tag];
}

/** True for grades good enough to actually run in a tournament. */
export function isStrongAptitude(grade: Aptitude): boolean {
  return grade === 'S' || grade === 'A' || grade === 'B';
}

export function displayName(card: UmaCard): string {
  return card.type && card.type !== 'Original'
    ? `${card.characterName} (${card.type})`
    : card.characterName;
}

// --- Normalization -------------------------------------------------------------

type RawEntry = Record<string, unknown>;

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asGrade(value: unknown): Aptitude {
  const grade = asString(value).trim().toUpperCase();
  return (APTITUDE_GRADES as readonly string[]).includes(grade) ? (grade as Aptitude) : 'G';
}

/**
 * `aptitudes` is a 3-element array of loose objects: surface, distance, running style.
 * The keys are read by name rather than position within each object, since only the
 * ordering of the three groups is dependable.
 */
function readAptitudeGroup(entry: RawEntry, keys: readonly string[]): RawEntry {
  const groups = Array.isArray(entry.aptitudes) ? entry.aptitudes : [];
  const match = groups.find(
    (group): group is RawEntry =>
      !!group && typeof group === 'object' && keys.every((key) => key in group),
  );
  return match ?? {};
}

function normalizeEntry(entry: RawEntry): UmaCard | null {
  // `id` looks like "100102 - Special Week Summer"; the leading number is the card id
  // and its first four digits identify the character across all of its outfits.
  const cardId = asString(entry.id).split('-')[0]?.trim() ?? '';
  const characterName = asString(entry.character_name).trim();
  if (!/^\d{4,}$/.test(cardId) || !characterName) return null;

  const surfaceGroup = readAptitudeGroup(entry, SURFACES);
  const distanceGroup = readAptitudeGroup(entry, DISTANCES);

  const costume = asString(entry.costume).trim();
  const type = asString(entry.type).trim();
  const aliases = Array.isArray(entry.aliases) ? entry.aliases.map(asString) : [];

  return {
    cardId,
    characterId: cardId.slice(0, 4),
    characterName,
    type,
    costume,
    rarity: asString(entry.rarity),
    thumbnail: asString(entry.thumbnail),
    url: asString(entry.url),
    distance: {
      Sprint: asGrade(distanceGroup.Sprint),
      Mile: asGrade(distanceGroup.Mile),
      Medium: asGrade(distanceGroup.Medium),
      Long: asGrade(distanceGroup.Long),
    },
    surface: {
      Turf: asGrade(surfaceGroup.Turf),
      Dirt: asGrade(surfaceGroup.Dirt),
    },
    searchText: [characterName, type, costume, ...aliases].join(' ').toLowerCase(),
  };
}

function normalize(raw: unknown): UmaCard[] {
  if (!Array.isArray(raw)) return [];
  const cards: UmaCard[] = [];
  const seen = new Set<string>();
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const card = normalizeEntry(entry as RawEntry);
    if (!card || seen.has(card.cardId)) continue;
    seen.add(card.cardId);
    cards.push(card);
  }
  cards.sort(
    (a, b) => a.characterName.localeCompare(b.characterName) || a.cardId.localeCompare(b.cardId),
  );
  return cards;
}

export function indexCards(cards: UmaCard[]): Catalog {
  const byCardId = new Map<string, UmaCard>();
  const byCharacterId = new Map<string, UmaCard[]>();
  for (const card of cards) {
    byCardId.set(card.cardId, card);
    const group = byCharacterId.get(card.characterId);
    if (group) group.push(card);
    else byCharacterId.set(card.characterId, [card]);
  }
  for (const group of byCharacterId.values()) group.sort((a, b) => a.cardId.localeCompare(b.cardId));
  return { cards, byCardId, byCharacterId };
}

// --- Caching -------------------------------------------------------------------

interface CacheEnvelope {
  fetchedAt: number;
  cards: UmaCard[];
}

function readCache(): CacheEnvelope | null {
  try {
    const stored = localStorage.getItem(CACHE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as CacheEnvelope;
    if (!Array.isArray(parsed?.cards) || parsed.cards.length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(cards: UmaCard[]): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ fetchedAt: Date.now(), cards }));
  } catch {
    // A full or disabled localStorage only costs us the cache, not the feature.
  }
}

async function fetchFrom(url: string): Promise<UmaCard[]> {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const cards = normalize(await res.json());
  if (cards.length === 0) throw new Error('Catalog contained no usable entries');
  return cards;
}

/** The bundled snapshot, used only when the live catalog can't be reached. */
async function fetchFallback(): Promise<UmaCard[]> {
  return fetchFrom(`${import.meta.env.BASE_URL}character.json`);
}

export interface CatalogLoad {
  catalog: Catalog;
  /** Where the data came from, so the UI can say whether it might be out of date. */
  source: 'network' | 'cache' | 'bundled';
  fetchedAt: number;
}

/**
 * Resolves as soon as anything usable is available — a fresh cache short-circuits the
 * network entirely, a stale one is returned immediately and refreshed in the background
 * via `onRefresh`.
 */
export async function loadCatalog(
  onRefresh?: (load: CatalogLoad) => void,
): Promise<CatalogLoad> {
  const cached = readCache();
  const isFresh = cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS;

  if (cached && isFresh) {
    return { catalog: indexCards(cached.cards), source: 'cache', fetchedAt: cached.fetchedAt };
  }

  if (cached) {
    // Serve the stale copy now, then quietly swap in fresh data if it arrives.
    void fetchFrom(CATALOG_URL)
      .then((cards) => {
        writeCache(cards);
        onRefresh?.({ catalog: indexCards(cards), source: 'network', fetchedAt: Date.now() });
      })
      .catch(() => {});
    return { catalog: indexCards(cached.cards), source: 'cache', fetchedAt: cached.fetchedAt };
  }

  try {
    const cards = await fetchFrom(CATALOG_URL);
    writeCache(cards);
    return { catalog: indexCards(cards), source: 'network', fetchedAt: Date.now() };
  } catch {
    const cards = await fetchFallback();
    return { catalog: indexCards(cards), source: 'bundled', fetchedAt: 0 };
  }
}
