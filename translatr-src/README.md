# nikstil.com: source code

The source for nikstil.com: **nikstilOS** (the homepage desktop) and **TRANSLATR™ Ultra+ Pro Max**
(the game at nikstil.com/translatr).

## What's where

| Path | What it is |
| --- | --- |
| `src/` | The game: React 19 + Zustand 5 + Tailwind CSS 4, built with Vite 6 |
| `src/components/` | Every window, dialog and overlay (`arcade/` holds the Arcade minigames) |
| `src/data/` | Game content: items, ads, mail, endings, achievements, tips, DOOMSCROLL levels, themes… |
| `src/lib/` | Game logic: the economy, the shooter engine, settings, the language and emoji layer, audio |
| `src/store/useGameStore.js` | The whole game state and every action (saved to localStorage) |
| `src/index.css`, `themes.css`, `dark.css`, `lite.css` | The Aero base look, the other themes, dark mode, Lite graphics |
| `index.html` | The game's page (applies the saved theme and settings before the first paint) |
| `public/` | Favicons and the link-preview image |
| `scripts/build-site.mjs` | Builds the game into `../translatr/` |
| `scripts/simulate.mjs` | Balance simulator (plays the game's real economy code) |
| `scripts/fetch-cats.mjs` | Downloads the CC0 cat photos into `src/assets/cats/` |

## Running it

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install
npm run dev
```

Then open the address Vite prints. Add `?debug` to the URL for the debug panel (and `window.game`,
the store, in the browser console).

## Building the site

This folder lives inside the nikstil.github.io repository, next to the site it builds.

```bash
npm run build:site
```

This builds the game straight into `../translatr/` (nikstil.com/translatr/, replacing the old
bundles), keeps the online leaderboards' script tag in its page, and fills nikstilOS in with a few
facts from the game (`../os/cursors.css` and the numbers in `../index.html`). Commit the result.

DOOMSCROLL.EXE's engine, levels, difficulties and sound are shared with nikstil.com/doomscroll/ and
live in `../doomscroll/`: the game imports them as `/doomscroll/…` (the build leaves those imports
for the browser to load from the site; `npm run dev` serves them from the repository).

Other commands:

```bash
npm run build       # just the game, into dist/
npm run simulate    # balance report: how long each milestone takes
npm run fetch-cats  # download the cat photos, then rebuild
```

## Notes

- Saves live in the browser's localStorage under `translatr-save` (the game) and `nikstilos-theme`
  (the homepage's theme). The save format is versioned (`src/lib/save.js`), with migrations for
  older saves.
- The game and nikstilOS share their eight themes (same ids), so a theme picked in one carries over
  to the other. Keep `src/data/themes.js` and the list in `../os/os.js` in step.
- Every emoji the game uses has a stand-in for each emoji-swapping theme in
  `src/data/themeEmoji.js`; add one there when adding a new emoji.
