/**
 * @typedef {Object} Chapter
 * @property {string} id
 * @property {string} title
 * @property {number} order
 * @property {string} markdown
 * @property {number} wordCount
 * @property {number} createdAt
 * @property {number} updatedAt
 *
 * @typedef {Object} Book
 * @property {string} id
 * @property {string} title
 * @property {string} author
 * @property {string} description
 * @property {string[]} tags
 * @property {string|null} cover   Relative asset path, e.g. "assets/<id>/cover.jpg"
 * @property {{type:string,url?:string,site?:string}} source
 * @property {Chapter[]} chapters
 * @property {number} createdAt
 * @property {number} updatedAt
 *
 * @typedef {Object} IndexEntry   Lightweight catalog row (books/<id>.json minus chapter bodies)
 * @property {string} id
 * @property {string} title
 * @property {string} author
 * @property {string[]} tags
 * @property {string|null} cover
 * @property {number} chapterCount
 * @property {number} wordCount
 * @property {{type:string,url?:string,site?:string}} source
 * @property {number} createdAt
 * @property {number} updatedAt
 */

const ID_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz'

/** Short random id, using Web Crypto (available in both Node and the renderer). */
export function newId(len = 12) {
  const bytes = new Uint8Array(len)
  globalThis.crypto.getRandomValues(bytes)
  let out = ''
  for (let i = 0; i < len; i++) out += ID_ALPHABET[bytes[i] % 36]
  return out
}

/** Word count that also works reasonably for CJK-free (Vietnamese/English) text. */
export function countWords(text) {
  if (!text) return 0
  const trimmed = String(text).trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).length
}

export function newChapter(partial = {}) {
  const now = Date.now()
  return {
    id: partial.id || newId(),
    title: partial.title || 'Untitled chapter',
    order: partial.order ?? 0,
    markdown: partial.markdown || '',
    wordCount: countWords(partial.markdown || ''),
    createdAt: partial.createdAt || now,
    updatedAt: partial.updatedAt || now
  }
}

export function newBook(partial = {}) {
  const now = Date.now()
  const chapters = (partial.chapters || []).map((c, i) => newChapter({ ...c, order: c.order ?? i }))
  return {
    id: partial.id || newId(),
    title: partial.title || 'Untitled',
    author: partial.author || '',
    description: partial.description || '',
    tags: partial.tags || [],
    cover: partial.cover || null,
    source: partial.source || { type: 'manual' },
    chapters,
    createdAt: partial.createdAt || now,
    updatedAt: partial.updatedAt || now
  }
}

/** Derive a catalog row from a full book. */
export function toIndexEntry(book) {
  return {
    id: book.id,
    title: book.title,
    author: book.author,
    tags: book.tags || [],
    cover: book.cover || null,
    chapterCount: book.chapters?.length || 0,
    wordCount: (book.chapters || []).reduce((sum, c) => sum + (c.wordCount || 0), 0),
    source: book.source || { type: 'manual' },
    createdAt: book.createdAt,
    updatedAt: book.updatedAt
  }
}

/** Recompute derived fields (word counts, chapter order) before persisting. */
export function normalizeBook(book) {
  const chapters = [...(book.chapters || [])]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((c, i) => ({
      ...c,
      order: i,
      wordCount: countWords(c.markdown)
    }))
  return { ...book, chapters, updatedAt: Date.now() }
}
