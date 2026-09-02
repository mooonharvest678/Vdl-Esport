import type { Roster } from '../state/model';

/**
 * How a roster gets in and out of somewhere durable. Two implementations ship today
 * (local autosave and share links); a real-time backend would be a third, implementing
 * `subscribe` to push remote edits back into the store.
 */
export interface SyncAdapter {
  load(): Promise<Roster | null>;
  save(roster: Roster): Promise<void>;
  subscribe?(onRemoteChange: (roster: Roster) => void): () => void;
}
