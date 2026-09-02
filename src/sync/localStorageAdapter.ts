import type { Roster } from '../state/model';
import { deserializeRoster, serializeRoster } from './codec';
import type { SyncAdapter } from './types';

const STORAGE_KEY = 'ccp.roster.v1';

/** Keeps whatever you're working on between visits. */
export class LocalStorageAdapter implements SyncAdapter {
  async load(): Promise<Roster | null> {
    try {
      const payload = localStorage.getItem(STORAGE_KEY);
      return payload ? deserializeRoster(payload) : null;
    } catch {
      return null;
    }
  }

  async save(roster: Roster): Promise<void> {
    try {
      localStorage.setItem(STORAGE_KEY, serializeRoster(roster));
    } catch {
      // Private-mode browsers block writes; losing autosave is survivable.
    }
  }
}
