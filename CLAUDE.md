# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Story Shelf — an Electron + React desktop app to create, import and read stories/novels. The library is plain files on disk. Plain JavaScript throughout (no TypeScript), JSDoc typedefs in `src/shared/model.js`.

## Commands

```bash
npm run dev        # launch app with hot reload (electron-vite)
npm run build      # compile main + preload + renderer into out/
npm run start      # preview the built app
npm run dist:win   # build + package a Windows installer into dist/
npm run samples    # regenerate samples/ from src/main/samples.js
```

There are no tests and no linter configured.

Set `STORY_SHELF_DATA=<absolute path>` to point the app at a different library folder (default: `<project root>/data/library` in dev, next to the `.exe` when packaged). Electron's own caches also go to `data/app` instead of `%APPDATA%` (see `app.setPath('userData', …)` in `src/main/index.js`).

## Architecture

### Process boundary (four files per IPC feature)

Standard Electron split with context isolation on; the renderer has no Node access. A feature that crosses the boundary touches all four layers:

1. `src/shared/ipc.js` — the central list of IPC channel names (shared so main/preload never drift)
2. `src/main/ipc.js` — `ipcMain.handle` implementations (mostly thin wrappers over `src/main/storage.js`)
3. `src/preload/index.js` — whitelisted wrappers exposed as `window.api.*` via contextBridge
4. `src/renderer/src/lib/api.js` — the renderer-side accessor the UI actually imports

`src/shared/` is imported by both main and renderer, so it must stay environment-neutral (no Node or Electron imports). Vite aliases: `@renderer` → `src/renderer/src`, `@shared` → `src/shared` (renderer only).

### Data model: books are self-contained folders

```
data/library/
  index.json        derived catalog (IndexEntry rows — book metadata minus chapter bodies)
  settings.json     reader + app preferences
  state.json        per-book reading progress & bookmarks
  books/<id>/
    book.json       full book: metadata + chapters (chapter content is Markdown)
    assets/         cover + chapter images as real image files (never base64)
```

Key invariants, all enforced in `src/main/storage.js`:

- **Always persist through `saveBook()`** — it runs `normalizeBook()` (re-sorts chapters, recomputes word counts, bumps `updatedAt`) and updates `index.json`. Writing `book.json` directly desyncs the catalog; `rebuildIndex()` exists as the self-heal for manual copies.
- JSON writes are atomic (temp file + rename); corrupt files are renamed aside and replaced with the fallback.
- Images always land in the book's `assets/` folder via `saveAsset()`, which returns the relative path (`assets/<name>.<ext>`) stored on the book/in Markdown. This keeps book folders portable — export/import is just copying the folder.

The renderer displays those images through a custom `asset://book/<id>/<relpath>` protocol registered in `src/main/index.js` and resolved by `resolveAssetUrl()`.

### Import pipeline

All importers produce the same payload shape — `{ book: {title, author, chapters}, images: [{name, data}], cover: {data, ext} }` — which `createFromPayload()` in `src/main/ipc.js` turns into a stored book, writing images as asset files.

- `.txt` / `.md` / pasted text → `src/main/importers/text.js`, chapter-split by heuristics in `src/shared/parse-text.js` (Markdown headings, then "Chapter N"-style lines; English and Vietnamese keywords).
- `.epub` → `src/main/importers/epub.js` (JSZip + fast-xml-parser), HTML converted by `src/main/lib/html-to-markdown.js`.
- Web import → `src/main/scraper/registry.js` resolves the URL to an adapter: a site-specific selector config from `src/main/scraper/adapters/index.js`, else the generic cheerio article extractor (`generic.js`, single page only). **To support a new site**, add one `createSelectorAdapter({ hosts, titleSel, chapterLinkSel, chapterContentSel, … })` config to `adapters/index.js` — a commented template is in that file. Site adapters can list a full table of contents; chapter HTML is converted to Markdown and remote images are downloaded into the book's assets.

### Renderer

React SPA with `HashRouter` (routes in `App.jsx`): Library / Import / Studio inside the shared `Layout`, Reader full-screen at `read/:bookId/:chapterId`. Pages live in `src/renderer/src/features/<name>/` with their CSS alongside. Global state is two Zustand stores (`useLibrary` for catalog + filters, `useSettings` for optimistic-updating persisted preferences); book editing state stays local to Studio. Reader theme/font definitions and `DEFAULT_SETTINGS` are in `src/shared/reader-themes.js`; library search uses MiniSearch (`lib/search.js`).
