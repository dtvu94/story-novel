// Central list of IPC channel names, shared by main + preload so they never drift.
export const IPC = {
  ping: 'app:ping',
  appOpenLibraryFolder: 'app:openLibraryFolder',
  appLibraryPath: 'app:libraryPath',

  libraryList: 'library:list',
  libraryRebuild: 'library:rebuild',
  librarySeedSamples: 'library:seedSamples',
  bookGet: 'book:get',
  bookSave: 'book:save',
  bookCreate: 'book:create',
  bookDelete: 'book:delete',
  bookExport: 'book:export',
  bookImportFile: 'book:importFile',
  assetSave: 'asset:save',

  settingsGet: 'settings:get',
  settingsSet: 'settings:set',

  stateGet: 'state:get',
  stateSetProgress: 'state:setProgress',
  stateToggleBookmark: 'state:toggleBookmark',

  dialogOpenFiles: 'dialog:openFiles',
  importFiles: 'import:files',

  importUrlPreview: 'import:urlPreview',
  importUrlChapters: 'import:urlChapters',
  // main -> renderer push channel (progress while a web import runs)
  importProgress: 'import:progress',

  libraryExport: 'library:export',
  libraryImport: 'library:import'
}
