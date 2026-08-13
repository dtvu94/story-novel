import { app, shell, protocol, net, BrowserWindow } from 'electron'
import { join, dirname } from 'node:path'
import { readdirSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { initStorage, resolveAssetUrl } from './storage.js'
import { registerIpc } from './ipc.js'

app.setName('Story Shelf')

// Keep ALL app data — including Electron's own caches — next to the app instead
// of under %APPDATA% on C:. Matches the library location in storage.js.
const dataBase = app.isPackaged ? dirname(app.getPath('exe')) : process.cwd()
app.setPath('userData', join(dataBase, 'data', 'app'))

// Linux VMs / remote sessions often have no GPU render node (/dev/dri/renderD*).
// Chromium's GPU process then crash-loops and the window may never paint, so
// fall back to software rendering when none is present.
if (process.platform === 'linux') {
  let hasRenderNode = false
  try {
    hasRenderNode = readdirSync('/dev/dri').some((name) => name.startsWith('renderD'))
  } catch {
    /* no /dev/dri at all */
  }
  if (!hasRenderNode) {
    app.disableHardwareAcceleration()
    // Native Wayland presentation needs GPU buffers and silently fails to show
    // the window without them; the Xwayland/X11 software path is reliable.
    // The hint env var is read during display init (after this script runs) —
    // appendSwitch('ozone-platform', …) would be applied too late.
    if (!process.env.ELECTRON_OZONE_PLATFORM_HINT) {
      process.env.ELECTRON_OZONE_PLATFORM_HINT = 'x11'
    }
  }
}

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
  // Safety net: on GPU-less VMs the first-paint signal may never arrive.
  setTimeout(() => {
    if (!mainWindow.isDestroyed() && !mainWindow.isVisible()) mainWindow.show()
  }, 2000)

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
