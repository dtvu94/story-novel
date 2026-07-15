import { create } from 'zustand'
import { api } from '../lib/api'
import { DEFAULT_SETTINGS } from '@shared/reader-themes'

export const useSettings = create((set, get) => ({
  settings: DEFAULT_SETTINGS,
  loaded: false,

  load: async () => {
    const settings = await api.settings.get()
    set({ settings, loaded: true })
  },

  // Patch reader prefs (merged + persisted). Optimistic local update first.
  updateReader: async (patch) => {
    const next = { ...get().settings, reader: { ...get().settings.reader, ...patch } }
    set({ settings: next })
    await api.settings.set({ reader: patch })
  },

  updateApp: async (patch) => {
    const next = { ...get().settings, app: { ...get().settings.app, ...patch } }
    set({ settings: next })
    await api.settings.set({ app: patch })
  }
}))
