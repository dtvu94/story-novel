import MiniSearch from 'minisearch'

const SORTERS = {
  updated: (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0),
  created: (a, b) => (b.createdAt || 0) - (a.createdAt || 0),
  title: (a, b) => (a.title || '').localeCompare(b.title || ''),
  author: (a, b) => (a.author || '').localeCompare(b.author || '')
}

/**
 * Filter + sort library catalog entries.
 * @param {Array} entries index rows
 * @param {{query?:string, tags?:string[], sort?:string}} opts
 */
export function filterEntries(entries, { query = '', tags = [], sort = 'updated' } = {}) {
  let list = entries

  if (tags.length) {
    list = list.filter((e) => tags.every((t) => (e.tags || []).includes(t)))
  }

  if (query.trim()) {
    const mini = new MiniSearch({
      fields: ['title', 'author', 'tags'],
      storeFields: ['id'],
      searchOptions: { prefix: true, fuzzy: 0.2, boost: { title: 3, author: 2 } }
    })
    mini.addAll(list.map((e) => ({ id: e.id, title: e.title, author: e.author, tags: (e.tags || []).join(' ') })))
    const ids = new Set(mini.search(query).map((r) => r.id))
    list = list.filter((e) => ids.has(e.id))
  }

  return [...list].sort(SORTERS[sort] || SORTERS.updated)
}

/** All distinct tags across the library, sorted by frequency then name. */
export function collectTags(entries) {
  const counts = new Map()
  for (const e of entries) for (const t of e.tags || []) counts.set(t, (counts.get(t) || 0) + 1)
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([tag, count]) => ({ tag, count }))
}
