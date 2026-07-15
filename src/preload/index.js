import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/ipc.js'

// Whitelisted API exposed to the renderer as `window.api`.
// The renderer never imports Node/Electron directly (context isolation on).
const api = {
  ping: () => ipcRenderer.invoke(IPC.ping),
  openLibraryFolder: () => ipcRenderer.invoke(IPC.appOpenLibraryFolder),
  libraryPath: () => ipcRenderer.invoke(IPC.appLibraryPath),

  library: {
    list: () => ipcRenderer.invoke(IPC.libraryList),
    rebuild: () => ipcRenderer.invoke(IPC.libraryRebuild),
    seedSamples: () => ipcRenderer.invoke(IPC.librarySeedSamples)
  },

  book: {
    get: (id) => ipcRenderer.invoke(IPC.bookGet, id),
    save: (book) => ipcRenderer.invoke(IPC.bookSave, book),
    create: (partial) => ipcRenderer.invoke(IPC.bookCreate, partial),
    delete: (id) => ipcRenderer.invoke(IPC.bookDelete, id),
    export: (id) => ipcRenderer.invoke(IPC.bookExport, id),
    importFile: () => ipcRenderer.invoke(IPC.bookImportFile)
  },

  assets: {
    save: (bookId, data, ext, name) => ipcRenderer.invoke(IPC.assetSave, bookId, data, ext, name)
  },

  settings: {
    get: () => ipcRenderer.invoke(IPC.settingsGet),
    set: (patch) => ipcRenderer.invoke(IPC.settingsSet, patch)
  },

  state: {
    get: () => ipcRenderer.invoke(IPC.stateGet),
    setProgress: (bookId, progress) => ipcRenderer.invoke(IPC.stateSetProgress, bookId, progress),
    toggleBookmark: (bookId, bookmark) =>
      ipcRenderer.invoke(IPC.stateToggleBookmark, bookId, bookmark)
  },

  dialog: {
    openFiles: (options) => ipcRenderer.invoke(IPC.dialogOpenFiles, options)
  },

  import: {
    files: (paths) => ipcRenderer.invoke(IPC.importFiles, paths),
    urlPreview: (url) => ipcRenderer.invoke(IPC.importUrlPreview, url),
    urlChapters: (payload) => ipcRenderer.invoke(IPC.importUrlChapters, payload)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  window.api = api
}
