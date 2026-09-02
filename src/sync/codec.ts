import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import { LANE_TAGS, type LaneTag } from '../data/catalog';
import { makeLane, newId, type Roster, type Slot } from '../state/model';
import type { UniqueMode } from '../state/model';

// A share link has to survive being pasted into Discord, so the roster is squeezed into
// positional arrays before compression. Slot ids are dropped and regenerated on load —
// they only identify a slot within one browser session.

const FORMAT_VERSION = 1;

const UNIQUE_MODES: UniqueMode[] = ['character', 'outfit', 'off'];

type EncodedSlot = [player: string, picks: string];
type EncodedLane = [name: string, tag: number, slots: EncodedSlot[]];
type EncodedRoster = [version: number, title: string, uniqueMode: number, lanes: EncodedLane[]];

function encodeRoster(roster: Roster): EncodedRoster {
  return [
    FORMAT_VERSION,
    roster.title,
    Math.max(0, UNIQUE_MODES.indexOf(roster.settings.uniqueMode)),
    roster.lanes.map((lane) => [
      lane.name,
      lane.tag ? LANE_TAGS.indexOf(lane.tag) : -1,
      lane.slots.map((slot): EncodedSlot => [slot.player, slot.picks.join(',')]),
    ]),
  ];
}

function decodeSlot(raw: unknown): Slot {
  const [player, picks] = Array.isArray(raw) ? raw : [];
  return {
    id: newId('s'),
    player: typeof player === 'string' ? player : '',
    picks:
      typeof picks === 'string' && picks
        ? [...new Set(picks.split(',').filter((id) => /^\d{4,}$/.test(id)))]
        : [],
  };
}

function decodeRoster(raw: unknown): Roster | null {
  if (!Array.isArray(raw)) return null;
  const [version, title, uniqueMode, lanes] = raw as EncodedRoster;
  if (version !== FORMAT_VERSION || !Array.isArray(lanes) || lanes.length === 0) return null;

  const decodedLanes = lanes.map((rawLane) => {
    const [name, tagIndex, slots] = Array.isArray(rawLane) ? rawLane : [];
    const tag: LaneTag | undefined =
      typeof tagIndex === 'number' && tagIndex >= 0 && tagIndex < LANE_TAGS.length
        ? LANE_TAGS[tagIndex]
        : undefined;
    const lane = makeLane(typeof name === 'string' ? name : 'Group', 0, tag);
    lane.slots = (Array.isArray(slots) ? slots : []).map(decodeSlot);
    if (lane.slots.length === 0) lane.slots = makeLane('', 1).slots;
    return lane;
  });

  return {
    title: typeof title === 'string' ? title : 'Our Team',
    lanes: decodedLanes,
    settings: {
      uniqueMode: UNIQUE_MODES[uniqueMode as number] ?? 'character',
    },
  };
}

export function serializeRoster(roster: Roster): string {
  return compressToEncodedURIComponent(JSON.stringify(encodeRoster(roster)));
}

export function deserializeRoster(payload: string): Roster | null {
  try {
    const json = decompressFromEncodedURIComponent(payload);
    if (!json) return null;
    return decodeRoster(JSON.parse(json));
  } catch {
    return null;
  }
}
