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
    label: '15 người — Sprint / Mile / Medium / Long / Dirt',
    description: 'Thể thức Club Clash thông thường: 5 đội phụ, mỗi đội 3 người.',
    lanes: CLASSIC_LANES,
    slotsPerLane: 3,
  },
  {
    id: 'classic-10',
    label: '10 người — Sprint / Mile / Medium / Long / Dirt',
    description: 'Vẫn 5 cự ly như trên nhưng mỗi cự ly gồm 2 người.',
    lanes: CLASSIC_LANES,
    slotsPerLane: 2,
  },
  {
    id: 'turf-12',
    label: '12 người — Sprint / Mile / Medium / Long',
    description: 'Thể thức chỉ đua sân cỏ (Turf-only), 4 đội phụ, mỗi đội 3 người.',
    lanes: CLASSIC_LANES.slice(0, 4),
    slotsPerLane: 3,
  },
  {
    id: 'turf-9',
    label: '9 người — Mile / Medium / Long',
    description: '3 đội phụ, mỗi đội 3 người, không có cự ly Ngắn (Sprint) hay đường Đất (Dirt).',
    lanes: CLASSIC_LANES.slice(1, 4),
    slotsPerLane: 3,
  },
  {
    id: 'flat-15',
    label: '15 người — một nhóm',
    description: 'Không chia đội phụ, chỉ có 15 slot dùng chung quy tắc Uma độc nhất (không trùng lặp).',
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
