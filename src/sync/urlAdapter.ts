import type { Roster } from '../state/model';
import { deserializeRoster, serializeRoster } from './codec';
import type { SyncAdapter } from './types';

const HASH_PREFIX = '#b=';

/**
 * Share links. The board rides in the URL hash, so a link is self-contained and keeps
 * working with no server behind it. `save` is deliberately a no-op: writing to the address
 * bar on every keystroke would spam history and hand people half-finished links. Use
 * `buildShareUrl` when the user explicitly asks for a link.
 */
export class UrlAdapter implements SyncAdapter {
  async load(): Promise<Roster | null> {
    return readRosterFromHash();
  }

  async save(): Promise<void> {}
}

export function readRosterFromHash(): Roster | null {
  const hash = window.location.hash;
  if (!hash.startsWith(HASH_PREFIX)) return null;
  return deserializeRoster(hash.slice(HASH_PREFIX.length));
}

export function buildShareUrl(roster: Roster): string {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}${HASH_PREFIX}${serializeRoster(roster)}`;
}

/** Drops the shared board out of the address bar without reloading or adding history. */
export function clearHash(): void {
  const { origin, pathname, search } = window.location;
  window.history.replaceState(null, '', `${origin}${pathname}${search}`);
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Clipboard access needs a secure context; fall back to the legacy selection trick.
    try {
      const field = document.createElement('textarea');
      field.value = text;
      field.style.position = 'fixed';
      field.style.opacity = '0';
      document.body.appendChild(field);
      field.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(field);
      return ok;
    } catch {
      return false;
    }
  }
}
