import { app } from 'electron'
import { join, dirname } from 'node:path'
import fs from 'node:fs/promises'
import { toIndexEntry, normalizeBook, newBook, newId } from '../shared/model.js'
import { DEFAULT_SETTINGS } from '../shared/reader-themes.js'

// A book is a self-contained FOLDER:  books/<id>/book.json + books/<id>/assets/*
// Copy that folder to another PC and import it — cover and images travel with it.

// ---- Paths --------------------------------------------------------------

// Data lives in a `data/` folder next to the app — NOT under %APPDATA% on C:.
//   dev       -> <project root>/data/library
//   packaged  -> <folder containing the .exe>/data/library
//   override  -> STORY_SHELF_DATA env var (absolute path to the library folder)
function resolveRoot() {
  if (process.env.STORY_SHELF_DATA) return process.env.STORY_SHELF_DATA
  const base = app.isPackaged ? dirname(app.getPath('exe')) : process.cwd()
  return join(base, 'data', 'library')
}

let ROOT
function paths() {
  if (!ROOT) ROOT = resolveRoot()
  return {
    root: ROOT,
    index: join(ROOT, 'index.json'),
    settings: join(ROOT, 'settings.json'),
    state: join(ROOT, 'state.json'),
    books: join(ROOT, 'books'),
    bookDir: (id) => join(ROOT, 'books', id),
    bookFile: (id) => join(ROOT, 'books', id, 'book.json'),
    bookAssets: (id) => join(ROOT, 'books', id, 'assets')
  }
}

/** Absolute path to the library root folder (where all books live). */
export function libraryRoot() {
  return paths().root
}

function safeName(s) {
  return String(s || 'book').replace(/[\\/:*?"<>|]+/g, '_').trim().slice(0, 80) || 'book'
}

// ---- Low-level JSON I/O -------------------------------------------------

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true })
}

async function readJson(file, fallback) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'))
  } catch (err) {
    if (err.code === 'ENOENT') return fallback
    if (err instanceof SyntaxError) {
      try {
        await fs.rename(file, `${file}.corrupt-${Date.now()}`)
      } catch {
        /* ignore */
      }
      return fallback
    }
    throw err
  }
}

/** Write JSON atomically: temp file then rename over the target. */
async function writeJson(file, data) {
  await ensureDir(dirname(file))
  const tmp = `${file}.tmp-${process.pid}`
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf8')
  await fs.rename(tmp, file)
}

// ---- Init ---------------------------------------------------------------

export async function initStorage() {
  const p = paths()
  await ensureDir(p.books)
  if ((await readJson(p.index, null)) === null) await writeJson(p.index, [])
  if ((await readJson(p.settings, null)) === null) await writeJson(p.settings, DEFAULT_SETTINGS)
  if ((await readJson(p.state, null)) === null) await writeJson(p.state, { books: {} })
}

// ---- Settings -----------------------------------------------------------

export async function getSettings() {
  const stored = await readJson(paths().settings, {})
  return {
    reader: { ...DEFAULT_SETTINGS.reader, ...(stored.reader || {}) },
    app: { ...DEFAULT_SETTINGS.app, ...(stored.app || {}) }
  }
}

export async function setSettings(patch) {
  const current = await getSettings()
  const next = {
    reader: { ...current.reader, ...(patch.reader || {}) },
    app: { ...current.app, ...(patch.app || {}) }
  }
  await writeJson(paths().settings, next)
  return next
}

// ---- Library index ------------------------------------------------------

export async function listLibrary() {
  return readJson(paths().index, [])
}

async function upsertIndex(book) {
  const index = await listLibrary()
  const entry = toIndexEntry(book)
  const i = index.findIndex((e) => e.id === book.id)
  if (i === -1) index.push(entry)
  else index[i] = entry
  await writeJson(paths().index, index)
}

async function removeFromIndex(id) {
  const index = (await listLibrary()).filter((e) => e.id !== id)
  await writeJson(paths().index, index)
}

/** Rebuild index.json by scanning book folders (self-heal / after manual copies). */
export async function rebuildIndex() {
  const p = paths()
  let dirs = []
  try {
    dirs = (await fs.readdir(p.books, { withFileTypes: true }))
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
  } catch {
    dirs = []
  }
  const entries = []
  for (const id of dirs) {
    const book = await readJson(p.bookFile(id), null)
    if (book?.id) entries.push(toIndexEntry(book))
  }
  await writeJson(p.index, entries)
  return entries
}

// ---- Books --------------------------------------------------------------

export async function getBook(id) {
  return readJson(paths().bookFile(id), null)
}

export async function saveBook(book) {
  const normalized = normalizeBook(book)
  await writeJson(paths().bookFile(normalized.id), normalized)
  await upsertIndex(normalized)
  return normalized
}

export async function createBook(partial = {}) {
  return saveBook(newBook(partial))
}

export async function deleteBook(id) {
  const p = paths()
  await fs.rm(p.bookDir(id), { recursive: true, force: true })
  await removeFromIndex(id)
  const state = await readJson(p.state, { books: {} })
  delete state.books[id]
  await writeJson(p.state, state)
  return true
}

// ---- Assets (real image files inside the book folder) -------------------

/**
 * Save an image into books/<id>/assets/.
 * @param {string} bookId
 * @param {Buffer|Uint8Array} data
 * @param {string} ext  e.g. ".jpg"
 * @param {string} [name] base name without extension (e.g. "cover"); random if omitted
 * @returns {Promise<string>} relative path stored on the book, e.g. "assets/cover.jpg"
 */
export async function saveAsset(bookId, data, ext, name) {
  const dir = paths().bookAssets(bookId)
  await ensureDir(dir)
  const clean = (ext || '.jpg').replace(/^\.?/, '.').toLowerCase()
  const base = name ? safeName(name) : `img-${newId()}`
  const filename = `${base}${clean}`
  await fs.writeFile(join(dir, filename), Buffer.from(data))
  return `assets/${filename}`
}

/** Resolve an asset:// request (asset://book/<id>/<relpath>) to an absolute file path. */
export function resolveAssetUrl(urlPath) {
  // urlPath is the part after "asset://book/"; drop any ?cache-bust query.
  const decoded = decodeURIComponent(urlPath.split('?')[0])
  const [id, ...rest] = decoded.split('/')
  const rel = rest.join('/').replace(/^[/\\]+/, '').replace(/\.\.[/\\]/g, '')
  return join(paths().bookDir(id), rel)
}

// ---- Portable book export / import (folder-based) -----------------------

/** Copy a book folder into a user-chosen destination directory. */
export async function exportBookTo(id, destDir) {
  const book = await getBook(id)
  if (!book) throw new Error('Book not found')
  const dest = join(destDir, safeName(book.title))
  await fs.cp(paths().bookDir(id), dest, { recursive: true })
  return dest
}

/** Import a copied book folder (containing book.json + assets) into the library. */
export async function importBookFromDir(srcDir) {
  const parsed = await readJson(join(srcDir, 'book.json'), null)
  if (!parsed || !Array.isArray(parsed.chapters)) {
    throw new Error('Not a valid book folder (missing book.json)')
  }
  const collision = parsed.id ? await getBook(parsed.id) : true
  const id = collision ? newId() : parsed.id
  await fs.cp(srcDir, paths().bookDir(id), { recursive: true })
  return saveBook(newBook({ ...parsed, id }))
}

// ---- Reading state (progress + bookmarks) -------------------------------

export async function getState() {
  return readJson(paths().state, { books: {} })
}

export async function setProgress(bookId, progress) {
  const state = await getState()
  const entry = state.books[bookId] || { bookmarks: [] }
  state.books[bookId] = { ...entry, ...progress }
  await writeJson(paths().state, state)
  return state.books[bookId]
}

export async function toggleBookmark(bookId, bookmark) {
  const state = await getState()
  const entry = state.books[bookId] || { bookmarks: [] }
  const marks = entry.bookmarks || []
  const i = marks.findIndex(
    (b) =>
      b.chapterId === bookmark.chapterId &&
      Math.abs((b.scrollRatio || 0) - (bookmark.scrollRatio || 0)) < 0.02
  )
  if (i === -1) marks.push({ ...bookmark, createdAt: Date.now() })
  else marks.splice(i, 1)
  state.books[bookId] = { ...entry, bookmarks: marks }
  await writeJson(paths().state, state)
  return state.books[bookId]
}
