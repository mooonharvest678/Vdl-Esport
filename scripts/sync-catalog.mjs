// Refreshes the bundled offline fallback copy of the uma catalog.
// The live site fetches the same URL at runtime; this snapshot only matters when
// GitHub is unreachable, so running it occasionally is enough.
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SOURCE =
  'https://raw.githubusercontent.com/JustWastingTime/TazunaDiscordBot/heads/main/assets/character.json';
const DEST = fileURLToPath(new URL('../public/character.json', import.meta.url));

const res = await fetch(SOURCE);
if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);

const data = await res.json();
if (!Array.isArray(data) || data.length === 0) throw new Error('Catalog is not a non-empty array');

await mkdir(dirname(DEST), { recursive: true });
await writeFile(DEST, JSON.stringify(data));
console.log(`Wrote ${data.length} entries to public/character.json`);
