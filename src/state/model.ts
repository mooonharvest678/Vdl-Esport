import type { LaneTag } from '../data/catalog';

export interface Slot {
  id: string;
  /** Free-text; there is no sign-in, so this is the only identity a pick has. */
  player: string;
  /** Card ids. Exactly one means the pick is locked in; several mean "maybe one of these". */
  picks: string[];
}

export interface Lane {
  id: string;
  name: string;
  /** Optional aptitude hint for slots in this lane. */
  tag?: LaneTag;
  slots: Slot[];
}

/**
 * How strictly an uma may be reused across the team.
 * - `character`: locking in any outfit claims every outfit of that uma (the usual rule)
 * - `outfit`: only the exact outfit is claimed
 * - `off`: no restriction
 */
export type UniqueMode = 'character' | 'outfit' | 'off';

export interface Settings {
  uniqueMode: UniqueMode;
}

export interface Roster {
  title: string;
  lanes: Lane[];
  settings: Settings;
}

export function isLockedIn(slot: Slot): boolean {
  return slot.picks.length === 1;
}

export function isTentative(slot: Slot): boolean {
  return slot.picks.length > 1;
}

export function totalSlots(roster: Roster): number {
  return roster.lanes.reduce((sum, lane) => sum + lane.slots.length, 0);
}

export function filledSlots(roster: Roster): number {
  return roster.lanes.reduce(
    (sum, lane) => sum + lane.slots.filter((slot) => slot.picks.length > 0).length,
    0,
  );
}

let idCounter = 0;

export function newId(prefix: string): string {
  idCounter += 1;
  return `${prefix}${Date.now().toString(36)}${idCounter.toString(36)}`;
}

export function makeSlot(): Slot {
  return { id: newId('s'), player: '', picks: [] };
}

export function makeLane(name: string, slotCount: number, tag?: LaneTag): Lane {
  return {
    id: newId('l'),
    name,
    tag,
    slots: Array.from({ length: slotCount }, makeSlot),
  };
}
