import { useSyncExternalStore } from 'react';
import { makeLane, makeSlot, type Lane, type Roster, type Slot } from './model';
import type { LaneTag } from '../data/catalog';
import type { UniqueMode } from './model';

export type RosterAction =
  | { type: 'replace'; roster: Roster }
  | { type: 'setTitle'; title: string }
  | { type: 'setUniqueMode'; mode: UniqueMode }
  | { type: 'setPlayer'; slotId: string; player: string }
  | { type: 'addPick'; slotId: string; cardId: string }
  | { type: 'removePick'; slotId: string; cardId: string }
  | { type: 'setPicks'; slotId: string; cardIds: string[] }
  | { type: 'clearSlot'; slotId: string }
  | { type: 'setLaneName'; laneId: string; name: string }
  | { type: 'setLaneTag'; laneId: string; tag?: LaneTag }
  | { type: 'addLane' }
  | { type: 'removeLane'; laneId: string }
  | { type: 'addSlot'; laneId: string }
  | { type: 'removeSlot'; laneId: string; slotId: string }
  | { type: 'setLaneSlotCount'; laneId: string; count: number };

const MAX_SLOTS_PER_LANE = 30;
const MAX_LANES = 12;

function mapLanes(roster: Roster, fn: (lane: Lane) => Lane): Roster {
  return { ...roster, lanes: roster.lanes.map(fn) };
}

function mapSlot(roster: Roster, slotId: string, fn: (slot: Slot) => Slot): Roster {
  return mapLanes(roster, (lane) =>
    lane.slots.some((slot) => slot.id === slotId)
      ? { ...lane, slots: lane.slots.map((slot) => (slot.id === slotId ? fn(slot) : slot)) }
      : lane,
  );
}

function resizeSlots(slots: Slot[], count: number): Slot[] {
  const target = Math.max(1, Math.min(MAX_SLOTS_PER_LANE, Math.floor(count)));
  if (target === slots.length) return slots;
  if (target < slots.length) return slots.slice(0, target);
  return [...slots, ...Array.from({ length: target - slots.length }, makeSlot)];
}

export function rosterReducer(roster: Roster, action: RosterAction): Roster {
  switch (action.type) {
    case 'replace':
      return action.roster;

    case 'setTitle':
      return { ...roster, title: action.title };

    case 'setUniqueMode':
      return { ...roster, settings: { ...roster.settings, uniqueMode: action.mode } };

    case 'setPlayer':
      return mapSlot(roster, action.slotId, (slot) => ({ ...slot, player: action.player }));

    case 'addPick':
      return mapSlot(roster, action.slotId, (slot) =>
        slot.picks.includes(action.cardId)
          ? slot
          : { ...slot, picks: [...slot.picks, action.cardId] },
      );

    case 'removePick':
      return mapSlot(roster, action.slotId, (slot) => ({
        ...slot,
        picks: slot.picks.filter((cardId) => cardId !== action.cardId),
      }));

    case 'setPicks':
      return mapSlot(roster, action.slotId, (slot) => ({
        ...slot,
        picks: [...new Set(action.cardIds)],
      }));

    case 'clearSlot':
      return mapSlot(roster, action.slotId, (slot) => ({ ...slot, player: '', picks: [] }));

    case 'setLaneName':
      return mapLanes(roster, (lane) =>
        lane.id === action.laneId ? { ...lane, name: action.name } : lane,
      );

    case 'setLaneTag':
      return mapLanes(roster, (lane) =>
        lane.id === action.laneId ? { ...lane, tag: action.tag } : lane,
      );

    case 'addLane': {
      if (roster.lanes.length >= MAX_LANES) return roster;
      const slotCount = roster.lanes.at(-1)?.slots.length ?? 3;
      return { ...roster, lanes: [...roster.lanes, makeLane('New group', slotCount)] };
    }

    case 'removeLane':
      // Keep at least one lane so there is always somewhere to put a player.
      if (roster.lanes.length <= 1) return roster;
      return { ...roster, lanes: roster.lanes.filter((lane) => lane.id !== action.laneId) };

    case 'addSlot':
      return mapLanes(roster, (lane) =>
        lane.id === action.laneId && lane.slots.length < MAX_SLOTS_PER_LANE
          ? { ...lane, slots: [...lane.slots, makeSlot()] }
          : lane,
      );

    case 'removeSlot':
      return mapLanes(roster, (lane) =>
        lane.id === action.laneId && lane.slots.length > 1
          ? { ...lane, slots: lane.slots.filter((slot) => slot.id !== action.slotId) }
          : lane,
      );

    case 'setLaneSlotCount':
      return mapLanes(roster, (lane) =>
        lane.id === action.laneId ? { ...lane, slots: resizeSlots(lane.slots, action.count) } : lane,
      );
  }
}

/**
 * Single owner of the roster. Every mutation goes through `dispatch`, which is what lets a
 * future real-time adapter observe and broadcast changes without the UI knowing about it.
 */
export class RosterStore {
  private roster: Roster;
  private listeners = new Set<() => void>();

  constructor(initial: Roster) {
    this.roster = initial;
  }

  getState = (): Roster => this.roster;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  dispatch = (action: RosterAction): void => {
    const next = rosterReducer(this.roster, action);
    if (next === this.roster) return;
    this.roster = next;
    for (const listener of this.listeners) listener();
  };
}

export function useRoster(store: RosterStore): Roster {
  return useSyncExternalStore(store.subscribe, store.getState, store.getState);
}
