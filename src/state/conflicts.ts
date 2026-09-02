import type { Catalog, UmaCard } from '../data/catalog';
import { isLockedIn, type Roster, type Slot } from './model';

export interface ClaimRef {
  slotId: string;
  laneName: string;
  /** The slot's player name, or a positional fallback like "Mile #2" when it's blank. */
  who: string;
  /** The exact card that produced this claim, which may be an alt of the one asked about. */
  cardId: string;
}

export type PickStatus =
  /** Free to take. */
  | { kind: 'available' }
  /** Locked in by another slot; selecting it elsewhere is blocked. */
  | { kind: 'taken'; by: ClaimRef }
  /** Locked in by this very slot. */
  | { kind: 'mine' }
  /** Only on maybe-lists, in more than one slot. Never blocks — it's a nudge to talk. */
  | { kind: 'contested'; by: ClaimRef[] };

export interface ConflictMap {
  /** Card id -> the slot that locked it in (directly or via another outfit of the same uma). */
  claims: Map<string, ClaimRef>;
  /** Card id -> every slot listing it as a maybe. */
  maybes: Map<string, ClaimRef[]>;
}

function describeSlot(slot: Slot, laneName: string, index: number): string {
  const player = slot.player.trim();
  return player || `${laneName} #${index + 1}`;
}

/**
 * Which card ids a single card claims. In `character` mode a locked-in pick claims every
 * outfit of the same uma, since alts normally count as the same character.
 */
function claimedIds(card: UmaCard, roster: Roster, catalog: Catalog): string[] {
  if (roster.settings.uniqueMode === 'outfit') return [card.cardId];
  const alts = catalog.byCharacterId.get(card.characterId);
  return alts && alts.length > 0 ? alts.map((alt) => alt.cardId) : [card.cardId];
}

export function buildConflictMap(roster: Roster, catalog: Catalog): ConflictMap {
  const claims = new Map<string, ClaimRef>();
  const maybes = new Map<string, ClaimRef[]>();
  if (roster.settings.uniqueMode === 'off') return { claims, maybes };

  for (const lane of roster.lanes) {
    lane.slots.forEach((slot, index) => {
      const ref = (cardId: string): ClaimRef => ({
        slotId: slot.id,
        laneName: lane.name,
        who: describeSlot(slot, lane.name, index),
        cardId,
      });

      if (isLockedIn(slot)) {
        const card = catalog.byCardId.get(slot.picks[0]);
        if (!card) return;
        for (const cardId of claimedIds(card, roster, catalog)) {
          // First lock-in wins, so a later duplicate is reported against the original.
          if (!claims.has(cardId)) claims.set(cardId, ref(card.cardId));
        }
        return;
      }

      for (const cardId of slot.picks) {
        const existing = maybes.get(cardId);
        if (existing) existing.push(ref(cardId));
        else maybes.set(cardId, [ref(cardId)]);
      }
    });
  }

  return { claims, maybes };
}

/** Status of `cardId` as seen from `slotId` (pass null for a neutral, board-wide view). */
export function statusFor(
  conflicts: ConflictMap,
  cardId: string,
  slotId: string | null,
): PickStatus {
  const claim = conflicts.claims.get(cardId);
  if (claim) return claim.slotId === slotId ? { kind: 'mine' } : { kind: 'taken', by: claim };

  const listedBy = conflicts.maybes.get(cardId);
  if (listedBy && listedBy.length > 1) return { kind: 'contested', by: listedBy };

  return { kind: 'available' };
}

/**
 * Whether a slot may add this card. Only hard claims block; a contested maybe never does,
 * because the whole point of a maybe-list is to let people overlap while they decide.
 */
export function canPick(conflicts: ConflictMap, cardId: string, slotId: string): boolean {
  const status = statusFor(conflicts, cardId, slotId);
  return status.kind !== 'taken';
}

export interface BoardIssue {
  slotId: string;
  message: string;
}

/** Problems worth surfacing at the top of the board. */
export function boardIssues(
  roster: Roster,
  catalog: Catalog,
  conflicts: ConflictMap,
): BoardIssue[] {
  if (roster.settings.uniqueMode === 'off') return [];
  const issues: BoardIssue[] = [];

  for (const lane of roster.lanes) {
    lane.slots.forEach((slot, index) => {
      if (!isLockedIn(slot)) return;
      const card = catalog.byCardId.get(slot.picks[0]);
      if (!card) return;
      const claim = conflicts.claims.get(card.cardId);
      // A lock-in that someone else already claimed: two players ended up on the same uma.
      if (claim && claim.slotId !== slot.id) {
        const who = describeSlot(slot, lane.name, index);
        const sameCard = claim.cardId === card.cardId;
        issues.push({
          slotId: slot.id,
          message: sameCard
            ? `${who} and ${claim.who} both locked in ${card.characterName}.`
            : `${who} locked in an alt of ${card.characterName}, already taken by ${claim.who}.`,
        });
      }
    });
  }

  return issues;
}
