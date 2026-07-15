import { app, shell, protocol, net, BrowserWindow } from 'electron'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { initStorage, resolveAssetUrl } from './storage.js'
import { registerIpc } from './ipc.js'

// Custom scheme so the renderer can display images stored inside book folders,
// e.g. <img src="asset://book/<id>/assets/cover.jpg">.
protocol.registerSchemesAsPrivileged([
  { scheme: 'asset', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }
])

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 940,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#131317',
    title: 'Story Shelf',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow.show())

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  await initStorage()
  registerIpc()

  // asset://book/<id>/<relative-path> -> file inside that book's folder.
  protocol.handle('asset', (request) => {
    const rest = request.url.slice('asset://book/'.length)
    return net.fetch(pathToFileURL(resolveAssetUrl(rest)).toString())
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
