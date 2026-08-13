import { ipcMain, dialog, shell, BrowserWindow } from 'electron'
import fs from 'node:fs/promises'
import * as cheerio from 'cheerio'
import { IPC } from '../shared/ipc.js'
import { newChapter } from '../shared/model.js'
import * as store from './storage.js'
import { importEpubBuffer } from './importers/epub.js'
import { importTextFile } from './importers/text.js'
import { SAMPLE_BOOKS } from './samples.js'
import { resolveAdapter } from './scraper/registry.js'
import { fetchImage } from './scraper/fetch.js'
import { htmlToMarkdown } from './lib/html-to-markdown.js'

/** Convert chapter HTML to markdown, downloading its images into the book folder. */
async function htmlToMarkdownWithImages(html, bookId, baseUrl) {
  const $ = cheerio.load(html)
  const srcMap = new Map()
  for (const el of $('img').toArray()) {
    const src = el.attribs?.src
    if (!src || /^data:/.test(src)) continue
    try {
      const abs = new URL(src, baseUrl).toString()
      const { data, ext } = await fetchImage(abs)
      const rel = await store.saveAsset(bookId, data, ext)
      srcMap.set(src, rel)
    } catch {
      /* skip images that fail to download */
    }
  }
  return htmlToMarkdown(html, { resolveImg: (s) => srcMap.get(s) || null })
}

const ownerWindow = (e) => BrowserWindow.fromWebContents(e.sender)

// Persist a long web import every N chapters instead of only at the end.
const SAVE_EVERY = 25

/**
 * Progress sender for the window that started an import. Web imports run for
 * minutes (sites are fetched politely, one chapter at a time), so the renderer
 * gets a push per step instead of waiting on the single invoke() promise.
 * Silently drops events if the window went away mid-import.
 */
function progressReporter(e) {
  return (patch) => {
    if (!e.sender.isDestroyed()) e.sender.send(IPC.importProgress, patch)
  }
}

function splitExt(name) {
  const dot = name.lastIndexOf('.')
  return dot > 0 ? [name.slice(0, dot), name.slice(dot)] : [name, '']
}

/** Turn an importer payload into a stored book, writing cover + images as real files. */
async function createFromPayload(payload) {
  const book = await store.createBook({
    title: payload.book.title,
    author: payload.book.author || '',
    chapters: payload.book.chapters,
    source: payload.source || { type: 'import-file' }
  })
  // Chapter markdown already references assets/<name>; write those files.
  for (const img of payload.images || []) {
    const [base, ext] = splitExt(img.name)
    await store.saveAsset(book.id, img.data, ext || '.img', base)
  }
  if (payload.cover?.data) {
    const cover = await store.saveAsset(book.id, payload.cover.data, payload.cover.ext, 'cover')
    return store.saveBook({ ...book, cover })
  }
  return book
}

export function registerIpc() {
  ipcMain.handle(IPC.ping, () => 'pong')
  ipcMain.handle(IPC.appLibraryPath, () => store.libraryRoot())
  ipcMain.handle(IPC.appOpenLibraryFolder, () => shell.openPath(store.libraryRoot()))

  // ---- Library / books ----
  ipcMain.handle(IPC.libraryList, () => store.listLibrary())
  ipcMain.handle(IPC.libraryRebuild, () => store.rebuildIndex())
  ipcMain.handle(IPC.bookGet, (_e, id) => store.getBook(id))
  ipcMain.handle(IPC.bookSave, (_e, book) => store.saveBook(book))
  ipcMain.handle(IPC.bookCreate, (_e, partial) => store.createBook(partial))
  ipcMain.handle(IPC.bookDelete, (_e, id) => store.deleteBook(id))

  // ---- Assets ----
  ipcMain.handle(IPC.assetSave, (_e, bookId, data, ext, name) =>
    store.saveAsset(bookId, data, ext, name)
  )

  // ---- Settings / reading state ----
  ipcMain.handle(IPC.settingsGet, () => store.getSettings())
  ipcMain.handle(IPC.settingsSet, (_e, patch) => store.setSettings(patch))
  ipcMain.handle(IPC.stateGet, () => store.getState())
  ipcMain.handle(IPC.stateSetProgress, (_e, bookId, progress) => store.setProgress(bookId, progress))
  ipcMain.handle(IPC.stateToggleBookmark, (_e, bookId, bookmark) =>
    store.toggleBookmark(bookId, bookmark)
  )

  // ---- File dialog ----
  ipcMain.handle(IPC.dialogOpenFiles, async (e, options) => {
    const result = await dialog.showOpenDialog(ownerWindow(e), {
      properties: ['openFile', 'multiSelections'],
      ...options
    })
    return result.canceled ? [] : result.filePaths
  })

  // ---- Local import (txt / md / epub) ----
  ipcMain.handle(IPC.importFiles, async (_e, filePaths) => {
    const results = []
    for (const p of filePaths || []) {
      try {
        const ext = p.toLowerCase().split('.').pop()
        let payload
        if (ext === 'epub') {
          payload = await importEpubBuffer(await fs.readFile(p))
          payload.source = { type: 'import-epub' }
        } else {
          payload = await importTextFile(p)
          payload.source = { type: 'import-file' }
        }
        const book = await createFromPayload(payload)
        results.push({ ok: true, id: book.id, title: book.title, chapters: book.chapters.length })
      } catch (err) {
        results.push({ ok: false, file: p, error: String(err?.message || err) })
      }
    }
    return results
  })

  // ---- Sample library ----
  ipcMain.handle(IPC.librarySeedSamples, async () => {
    let n = 0
    for (const s of SAMPLE_BOOKS) {
      await store.createBook({ ...s, source: { type: 'sample' } })
      n++
    }
    return n
  })

  // ---- Web import (adapter/plugin based) ----
  ipcMain.handle(IPC.importUrlPreview, async (e, url) => {
    const report = progressReporter(e)
    const adapter = resolveAdapter(url)
    // Listing a table of contents can itself take many paged requests.
    report({ phase: 'toc', found: 0 })
    const meta = await adapter.fetchMeta(url, (found) => report({ phase: 'toc', found }))
    report({ phase: 'idle' })
    return { adapterId: adapter.id, adapterName: adapter.name, url, ...meta }
  })

  ipcMain.handle(IPC.importUrlChapters, async (e, payload) => {
    const report = progressReporter(e)
    const adapter = resolveAdapter(payload.url)
    const book = await store.createBook({
      title: payload.title || 'Web import',
      author: payload.author || '',
      source: { type: 'import-web', url: payload.url, site: adapter.id }
    })
    const chapters = []
    const total = (payload.chapters || []).length
    let failed = 0
    let blocked = null
    report({ phase: 'chapters', done: 0, total, failed: 0 })
    for (const ch of payload.chapters || []) {
      let title = ch.title || `Chapter ${chapters.length + 1}`
      try {
        const fetched = await adapter.fetchChapter(ch.url)
        const markdown = await htmlToMarkdownWithImages(fetched.html, book.id, ch.url)
        title = ch.title || fetched.title || title
        chapters.push(newChapter({ title, markdown }))
      } catch (err) {
        // A ban/rate-limit applies to every remaining chapter too: stop now and
        // keep what we have. Carrying on would just deepen the block.
        if (err?.blocked) {
          blocked = String(err.message || err)
          break
        }
        failed++
        chapters.push(
          newChapter({ title: ch.title || 'Chapter', markdown: `*(Failed to fetch: ${err?.message || err})*` })
        )
      }
      // Checkpoint so a long import that dies late keeps its chapters.
      if (chapters.length % SAVE_EVERY === 0) await store.saveBook({ ...book, chapters })
      report({ phase: 'chapters', done: chapters.length, total, failed, title })
    }
    let cover
    if (payload.cover && !blocked) {
      report({ phase: 'cover', done: chapters.length, total, failed })
      try {
        const { data, ext } = await fetchImage(payload.cover)
        cover = await store.saveAsset(book.id, data, ext, 'cover')
      } catch {
        /* ignore cover failure */
      }
    }
    report({ phase: 'saving', done: chapters.length, total, failed })
    const saved = await store.saveBook({ ...book, chapters, ...(cover ? { cover } : {}) })
    report({ phase: 'idle' })
    return {
      ok: true,
      id: saved.id,
      title: saved.title,
      chapters: saved.chapters.length,
      total,
      failed,
      blocked
    }
  })

  // ---- Portable book export / import (folder based) ----
  ipcMain.handle(IPC.bookExport, async (e, id) => {
    const { canceled, filePaths } = await dialog.showOpenDialog(ownerWindow(e), {
      title: 'Choose a folder to export this book into',
      properties: ['openDirectory', 'createDirectory']
    })
    if (canceled || !filePaths[0]) return null
    return store.exportBookTo(id, filePaths[0])
  })

  ipcMain.handle(IPC.bookImportFile, async (e) => {
    const { canceled, filePaths } = await dialog.showOpenDialog(ownerWindow(e), {
      title: 'Choose book folder(s) to import',
      properties: ['openDirectory', 'multiSelections']
    })
    if (canceled) return []
    const results = []
    for (const p of filePaths) {
      try {
        const b = await store.importBookFromDir(p)
        results.push({ ok: true, id: b.id, title: b.title, chapters: b.chapters.length })
      } catch (err) {
        results.push({ ok: false, file: p, error: String(err?.message || err) })
      }
    }
    return results
  })
}
