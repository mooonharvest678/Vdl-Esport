import { makeLane, type Roster } from '../state/model';
import type { LaneTag } from '../data/catalog';

interface LaneSpec {
  name: string;
  tag?: LaneTag;
}

export interface Preset {
  id: string;
  label: string;
  description: string;
  lanes: LaneSpec[];
  slotsPerLane: number;
}

/** The standard club clash split: one sub-team per race category. */
const CLASSIC_LANES: LaneSpec[] = [
  { name: 'Sprint', tag: 'Sprint' },
  { name: 'Mile', tag: 'Mile' },
  { name: 'Medium', tag: 'Medium' },
  { name: 'Long', tag: 'Long' },
  { name: 'Dirt', tag: 'Dirt' },
];

export const PRESETS: Preset[] = [
  {
    id: 'classic-15',
    label: '15 players — Sprint / Mile / Medium / Long / Dirt',
    description: 'The usual club clash format: five sub-teams of three.',
    lanes: CLASSIC_LANES,
    slotsPerLane: 3,
  },
  {
    id: 'classic-10',
    label: '10 players — Sprint / Mile / Medium / Long / Dirt',
    description: 'Same five categories with two players each.',
    lanes: CLASSIC_LANES,
    slotsPerLane: 2,
  },
  {
    id: 'turf-12',
    label: '12 players — Sprint / Mile / Medium / Long',
    description: 'Turf-only format, four sub-teams of three.',
    lanes: CLASSIC_LANES.slice(0, 4),
    slotsPerLane: 3,
  },
  {
    id: 'turf-9',
    label: '9 players — Mile / Medium / Long',
    description: 'Three sub-teams of three, no sprint or dirt.',
    lanes: CLASSIC_LANES.slice(1, 4),
    slotsPerLane: 3,
  },
  {
    id: 'flat-15',
    label: '15 players — one group',
    description: 'No sub-teams, just fifteen slots sharing the unique-uma rule.',
    lanes: [{ name: 'Team' }],
    slotsPerLane: 15,
  },
];

export function rosterFromPreset(preset: Preset, title = 'Our Team'): Roster {
  return {
    title,
    lanes: preset.lanes.map((lane) => makeLane(lane.name, preset.slotsPerLane, lane.tag)),
    settings: { uniqueMode: 'character' },
  };
}

export function defaultRoster(): Roster {
  return rosterFromPreset(PRESETS[0]);
}
