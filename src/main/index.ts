import { app, shell, BrowserWindow, dialog, clipboard } from 'electron'
import { join } from 'path'
import { initLogger, closeLogger, log } from './logger'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { setUsageWebContents } from './ai-usage'
import { isPythonAvailable } from './python'
import { setupFFmpeg } from './ffmpeg'

// IPC handler registrations
import { registerFfmpegHandlers } from './ipc/ffmpeg-handlers'
import { registerAiHandlers } from './ipc/ai-handlers'
import { registerRenderHandlers } from './ipc/render-handlers'
import { registerProjectHandlers } from './ipc/project-handlers'
import { registerSystemHandlers, getAutoCleanupOnExit, setAutoCleanupOnExit, deleteBatchContentTempFiles } from './ipc/system-handlers'
import { registerMediaHandlers } from './ipc/media-handlers'
import { registerExportHandlers } from './ipc/export-handlers'
import { registerSecretsHandlers } from './ipc/secrets-handlers'
import { registerSettingsWindowHandlers, closeSettingsWindow } from './settings-window'

process.on('uncaughtException', (error) => {
  const detail = `${error.message}\n\n${error.stack || ''}`
  const choice = dialog.showMessageBoxSync({
    type: 'error',
    title: 'Error',
    message: 'A JavaScript error occurred in the main process',
    detail,
    buttons: ['Copy Error & Close', 'Close'],
    defaultId: 0
  })
  if (choice === 0) {
    clipboard.writeText(detail)
  }
  app.exit(1)
})

process.on('unhandledRejection', (reason) => {
  console.error('[Main] Unhandled rejection:', reason)
})

function createWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  // Allow F12 / Ctrl+Shift+I to open DevTools in development only
  if (is.dev) {
    mainWindow.webContents.on('before-input-event', (_event, input) => {
      if (
        input.key === 'F12' ||
        (input.control && input.shift && input.key.toLowerCase() === 'i')
      ) {
        mainWindow.webContents.toggleDevTools()
      }
    })
  }

  // Forward renderer console messages to main process log
  mainWindow.webContents.on('console-message', (_event, level, message) => {
    if (level >= 2) { // warnings and errors only
      console.warn(`[Renderer] ${message}`)
    }
  })

  // Register webContents for AI token usage reporting
  setUsageWebContents(mainWindow.webContents)

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  registerSettingsWindowHandlers(mainWindow)

  return mainWindow
}

app.whenReady().then(() => {
  // Initialise file logger first — intercepts console.log/warn/error going forward
  initLogger()
  log('info', 'Main', 'App ready — BatchContent starting up')

  electronApp.setAppUserModelId('com.batchcontent.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  setupFFmpeg()

  // Check Python environment availability
  isPythonAvailable().then((ok) => {
    console.log(`[Python] Environment available: ${ok}`)
  })

  // Register all IPC handlers (domain-specific modules)
  registerFfmpegHandlers()
  registerAiHandlers()
  registerRenderHandlers()
  registerProjectHandlers()
  registerSystemHandlers()
  registerMediaHandlers()
  registerExportHandlers()
  registerSecretsHandlers()

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Auto-cleanup on quit: if the user enabled the preference, delete temp files
app.on('before-quit', async (event) => {
  closeSettingsWindow()
  if (!getAutoCleanupOnExit()) return
  event.preventDefault()
  try {
    await deleteBatchContentTempFiles()
  } catch { /* ignore */ }
  setAutoCleanupOnExit(false) // prevent re-entry
  app.quit()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('quit', () => {
  closeLogger()
})
