import { create } from 'zustand'
import { api } from '../lib/api'

export const useLibrary = create((set, get) => ({
  entries: [],
  loading: false,
  loaded: false,
  query: '',
  activeTags: [],
  sort: 'updated',
  view: 'grid',

  load: async () => {
    set({ loading: true })
    const entries = await api.library.list()
    set({ entries, loading: false, loaded: true })
  },

  setQuery: (query) => set({ query }),
  setSort: (sort) => set({ sort }),
  setView: (view) => set({ view }),
  toggleTag: (tag) =>
    set((s) => ({
      activeTags: s.activeTags.includes(tag)
        ? s.activeTags.filter((t) => t !== tag)
        : [...s.activeTags, tag]
    })),
  clearFilters: () => set({ query: '', activeTags: [] }),

  createBook: async (partial) => {
    const book = await api.book.create(partial)
    await get().load()
    return book
  },

  deleteBook: async (id) => {
    await api.book.delete(id)
    await get().load()
  }
}))
