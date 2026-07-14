import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { loadData, saveData } from './store'
import { buildMenu } from './menu'
import { initUpdateCheck } from './updateCheck'

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 820,
    minHeight: 520,
    show: false,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: '#f6f6f6',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  buildMenu(mainWindow)
  initUpdateCheck(mainWindow)

  if (is.dev) {
    mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
      console.log(`[renderer:${level}] ${message} (${sourceId}:${line})`)
    })
  }

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    // In dev cache e service worker possono appartenere ad altri progetti
    // serviti in passato sulla stessa porta (es. PWA su localhost:5173)
    const ses = mainWindow.webContents.session
    Promise.all([
      ses.clearCache(),
      ses.clearStorageData({ storages: ['serviceworkers', 'cachestorage'] })
    ]).then(() => mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']))
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.movesolutions.macnotes')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.handle('store:load', () => loadData())
  ipcMain.handle('store:save', (_event, data) => {
    saveData(data)
    return true
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
