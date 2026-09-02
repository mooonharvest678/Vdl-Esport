# Club Clash Picker

A roster coordinator for umamusume club clash tournaments. Lay out your team's lanes and
slots, have everyone claim the uma they're running, and share the whole board as a single
link. No sign-in, no server — it's a static site on GitHub Pages.

## What it does

- **Lane/slot grid.** Default layout is the common Sprint / Mile / Medium / Long / Dirt
  split with 3 players each, but lanes can be renamed, added, removed, and resized for
  9-, 12-, or any-player formats.
- **Unique-uma locking.** When a player locks in a pick, that uma is greyed out for
  everyone else. Alternate outfits count as the same character by default, since that's
  the usual tournament rule — switch to per-outfit or turn locking off entirely.
- **"I may run this" picks.** Add several umas to one slot to signal you haven't decided.
  Tentative picks never block anyone; if two players list the same uma as a maybe, both
  slots flag it as contested so you can sort it out.
- **Live uma list.** Characters are read from the TazunaBot catalog at runtime, so new
  releases show up without any change to this site.
- **Share links.** The entire board is compressed into the URL, so sharing is copy-paste.

## Sharing model

Clicking **Copy share link** encodes the board into the URL hash. Anyone opening that link
sees the board exactly as it was; their own edits stay local until they share a link back.
It's a snapshot, not a live document — the person maintaining the board is usually the one
re-sharing after updates.

The state layer sits behind a `SyncAdapter` interface (`src/sync/`), so a real-time backend
can be added later by writing one more adapter without touching the UI.

## Development

```bash
npm install
npm run dev
```

`npm run build` produces `dist/`. The GitHub Pages base path is set from the repo name by
the deploy workflow; for a custom domain, set `BASE_PATH=/` when building.

`npm run sync-catalog` refreshes `public/character.json`, the offline fallback used only
when the live catalog can't be fetched.

## Deployment

Push to `main` and the workflow in `.github/workflows/deploy.yml` builds and publishes to
GitHub Pages. Enable Pages for the repo with source set to **GitHub Actions** first.

## Data source

Character data comes from
[TazunaDiscordBot's `character.json`](https://raw.githubusercontent.com/JustWastingTime/TazunaDiscordBot/heads/main/assets/character.json).
Portraits are hotlinked from GameTora.
