import { app, shell, BrowserWindow, dialog, clipboard } from 'electron'
import { join } from 'path'
import { inspect } from 'util'
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
  const r = reason as { message?: unknown; stack?: unknown; code?: unknown; errno?: unknown; url?: unknown } | null
  const parts = [
    `message=${r?.message ?? '<none>'}`,
    `code=${r?.code ?? '<none>'}`,
    `errno=${r?.errno ?? '<none>'}`,
    `url=${r?.url ?? '<none>'}`,
    `inspect=${inspect(reason, { depth: 4, breakLength: 200 })}`,
    `stack=${r?.stack ?? '<none>'}`
  ]
  console.error('[Main] Unhandled rejection:\n  ' + parts.join('\n  '))
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
    console.log('[Main] ready-to-show fired — showing window')
    mainWindow.show()
  })

  // DIAG: force-show fallback in case ready-to-show never fires
  setTimeout(() => {
    if (!mainWindow.isDestroyed() && !mainWindow.isVisible()) {
      console.warn('[Main] DIAG: ready-to-show did not fire within 5s — force-showing window')
      mainWindow.show()
      mainWindow.webContents.openDevTools({ mode: 'detach' })
    }
  }, 5000)

  // Allow F12 / Ctrl+Shift+I to open DevTools in any build (diagnostics)
  mainWindow.webContents.on('before-input-event', (_event, input) => {
    if (
      input.key === 'F12' ||
      (input.control && input.shift && input.key.toLowerCase() === 'i')
    ) {
      mainWindow.webContents.toggleDevTools()
    }
  })

  // Forward ALL renderer console messages to main process log (diagnostics)
  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    const levelName = ['verbose', 'info', 'warn', 'error'][level] ?? `lvl${level}`
    console.log(`[Renderer:${levelName}] ${message}  (${sourceId}:${line})`)
  })

  // DIAG: surface every possible failure mode for window load
  mainWindow.webContents.on('did-fail-load', (_e, errorCode, errorDescription, validatedURL, isMainFrame) => {
    console.error(`[Main] did-fail-load: code=${errorCode} desc=${errorDescription} url=${validatedURL} mainFrame=${isMainFrame}`)
  })
  mainWindow.webContents.on('did-fail-provisional-load', (_e, errorCode, errorDescription, validatedURL) => {
    console.error(`[Main] did-fail-provisional-load: code=${errorCode} desc=${errorDescription} url=${validatedURL}`)
  })
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[Main] did-finish-load')
  })
  mainWindow.webContents.on('dom-ready', () => {
    console.log('[Main] dom-ready')
  })
  mainWindow.webContents.on('preload-error', (_e, preloadPath, error) => {
    console.error(`[Main] preload-error: path=${preloadPath} err=${error?.stack || error?.message || error}`)
  })
  mainWindow.webContents.on('render-process-gone', (_e, details) => {
    console.error(`[Main] render-process-gone: ${inspect(details)}`)
  })
  mainWindow.webContents.on('unresponsive', () => {
    console.error('[Main] webContents unresponsive')
  })

  // Register webContents for AI token usage reporting
  setUsageWebContents(mainWindow.webContents)

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  const rendererIndex = join(__dirname, '../renderer/index.html')
  console.log(`[Main] Loading renderer from: ${rendererIndex}`)
  const loadPromise = is.dev && process.env['ELECTRON_RENDERER_URL']
    ? mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    : mainWindow.loadFile(rendererIndex)
  loadPromise
    .then(() => console.log('[Main] loadFile resolved'))
    .catch((err) => {
      console.error(`[Main] loadFile REJECTED: ${inspect(err, { depth: 4 })}`)
    })

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
  }).catch((err) => {
    log('error', 'Python', `Failed to check Python availability: ${err}`)
  })

  // Register all IPC handlers (domain-specific modules).
  // Each registration is wrapped so one broken handler cannot prevent window creation.
  const handlerModules = [
    ['ffmpeg', registerFfmpegHandlers],
    ['ai', registerAiHandlers],
    ['render', registerRenderHandlers],
    ['project', registerProjectHandlers],
    ['system', registerSystemHandlers],
    ['media', registerMediaHandlers],
    ['export', registerExportHandlers],
    ['secrets', registerSecretsHandlers],
  ] as const
  for (const [name, register] of handlerModules) {
    try {
      register()
    } catch (err) {
      log('error', 'IPC', `Failed to register ${name} handlers: ${err instanceof Error ? err.message : err}`)
      console.error(`[IPC] Failed to register ${name} handlers:`, err)
    }
  }

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
