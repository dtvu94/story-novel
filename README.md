# Story Shelf

A private desktop app to **create, import and read** your stories, books and novels.
Built with Electron + React. Your library is plain files on your own machine.

## Two modes

- **Studio** — write books from scratch in Markdown (chapters, cover, tags, images and
  footnote annotations), or import from `.txt` / `.md` / `.epub`, pasted text, or the web.
- **Reader** — a distraction-free reader with adjustable font, size, line spacing, width,
  themes (light / sepia / dark / night) and custom colours, plus reading progress and bookmarks.

## Data model — portable, atomic books

Everything lives in a `data/` folder **next to the app** (dev: project root; packaged:
next to the `.exe`) — not under `%APPDATA%` on C:. Override with the `STORY_SHELF_DATA`
env var (absolute path to the library folder).

```
data/
  app/                 Electron's own caches (kept off C: too)
  library/
    index.json         catalog (fast to load)
    settings.json      reader + app preferences
    state.json         per-book reading progress & bookmarks
    books/
      <bookId>/
        book.json       the book: metadata + chapters (Markdown)
        assets/         cover + chapter images as REAL image files
```

Each **book is a self-contained folder**. To move a book to another PC, copy its folder
(or use **Studio → Export**) and, on the other machine, **Import → Book folder**. Images
travel as ordinary files — no base64, so they stay viewable outside the app.

## Images & annotations

- In Studio, **Image** adds a picture (stored under the book's `assets/`) into the current chapter.
- **Annotation** inserts a Markdown footnote (`[^note1]`) that renders as a numbered note at
  the end of the chapter in the Reader.

## Web import (plugin adapters)

`src/main/scraper/` resolves a URL to an **adapter**:

- Unknown sites → a generic cheerio-based article extractor (single page).
- Known sites → a selector config in `src/main/scraper/adapters/index.js`
  (`createSelectorAdapter({ hosts, titleSel, chapterLinkSel, chapterContentSel, … })`) which
  can list a full table of contents. Add a site by filling in one config object.

> Only import content you have the right to keep for personal use.

## Develop

```bash
npm install
npm run dev        # launch with hot reload
```

## Build / package

```bash
npm run build      # compile main + preload + renderer into out/
npm run dist:win   # produce a Windows installer in dist/ (electron-builder)
```

## Tech

Electron · electron-vite · React · React Router · Zustand · @uiw/react-md-editor ·
react-markdown + remark-gfm · MiniSearch · JSZip + fast-xml-parser (EPUB) · cheerio (web).
