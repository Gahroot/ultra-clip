import { app, shell, BrowserWindow, ipcMain, dialog, clipboard, Notification } from 'electron'
import { join } from 'path'
import { tmpdir, homedir } from 'os'
import { readFileSync, writeFileSync, statfs, existsSync, mkdirSync, copyFileSync } from 'fs'
import { readdir, stat, unlink } from 'fs/promises'
import { initLogger, getLogPath, getLogSize, getLogDir, closeLogger, log } from './logger'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { setUsageWebContents } from './ai-usage'
import { isPythonAvailable } from './python'
import { checkPythonSetup, runFullSetup } from './python-setup'
import { setupFFmpeg, getVideoMetadata, extractAudio, generateThumbnail, splitSegments, getWaveformPeaks, SplitSegment, getEncoder } from './ffmpeg'
import { downloadYouTube } from './youtube'
import { transcribeVideo, formatTranscriptForAI } from './transcription'
import { scoreTranscript, generateHookText, rescoreSingleClip } from './ai-scoring'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { generateRehookText } from './overlays/rehook'
import {
  generateFakeComment,
  buildFakeCommentFilter,
  type FakeCommentData,
  type FakeCommentConfig
} from './overlays/fake-comment'
import {
  identifyEmojiMoments,
  buildEmojiBurstFilters,
  resolveEmojiFont,
  type EmojiMoment,
  type EmojiBurstConfig
} from './overlays/emoji-burst'
import type { TranscriptionResult } from './transcription'
import { detectFaceCrops } from './face-detection'
import { startBatchRender, cancelRender, RenderBatchOptions } from './render-pipeline'
import { generateSoundPlacements } from './sound-design'
import { generateCaptions, WordInput, CaptionStyleInput } from './captions'
import { selectAndCopyLogo, selectAndCopyBumper, copyLogoFromPath, copyBumperFromPath } from './brand-kit'
import {
  getElementPlacement,
  getSafeZone,
  getDeadZones,
  clampToSafeZone,
  isInsideSafeZone,
  rectToAssMargins,
  PLATFORM_SAFE_ZONES,
  type Platform,
  type ElementType,
  type SafeZoneRect
} from './safe-zones'
import { buildBlurBackgroundFilter, type BlurBackgroundConfig } from './layouts/blur-background'
import { buildSplitScreenFilter } from './layouts/split-screen'
import type { SplitScreenLayout, VideoSource, SplitScreenConfig } from './layouts/split-screen'
import {
  detectCuriosityGaps,
  optimizeClipBoundaries,
  rankClipsByCuriosity
} from './ai/curiosity-gap'
import type { CuriosityGap, ClipCandidate } from './ai/curiosity-gap'
import {
  detectStoryArcs,
  generateSeriesMetadata,
  buildPartNumberFilter,
  buildEndCardFilter
} from './ai/story-arc'
import type { StoryArc, PartNumberConfig, EndCardConfig } from './ai/story-arc'
import { resolveHookFont } from './hook-title'
import {
  analyzeLoopPotential,
  optimizeForLoop,
  buildLoopCrossfadeFilter,
  scoreLoopQuality
} from './ai/loop-optimizer'
import type { LoopAnalysis, LoopOptimizedClip } from './ai/loop-optimizer'
import {
  generateVariants,
  buildVariantRenderConfigs,
  generateVariantLabels
} from './ai/clip-variants'
import type { OverlayCapabilities, ClipVariant } from './ai/clip-variants'
import {
  generateClipDescription,
  generateBatchDescriptions
} from './ai/description-generator'
import type { DescriptionClipInput } from './ai/description-generator'
import { generateStitchedClips } from './ai/clip-stitcher'
import type { StitchingProgress } from './ai/clip-stitcher'
import { extractBRollKeywords } from './broll-keywords'
import type { WordTimestamp as BRollWordTimestamp } from './broll-keywords'
import { fetchBRollClips } from './broll-pexels'
import { buildBRollPlacements } from './broll-placement'
import type { BRollSettings as BRollSettingsConfig } from './broll-placement'
import {
  generateRenderManifest,
  generateManifestCSV,
  writeManifestFiles,
  type ManifestJobMeta
} from './export-manifest'
import type { RenderClipJob } from './render-pipeline'

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

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
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

  // IPC: FFmpeg — get video metadata
  ipcMain.handle('ffmpeg:getMetadata', (_event, filePath: string) => {
    return getVideoMetadata(filePath)
  })

  // IPC: FFmpeg — extract audio as 16kHz mono WAV for transcription
  ipcMain.handle('ffmpeg:extractAudio', async (_event, videoPath: string) => {
    const outputPath = join(tmpdir(), `batchcontent-audio-${Date.now()}.wav`)
    return extractAudio(videoPath, outputPath)
  })

  // IPC: FFmpeg — generate thumbnail as base64 data URI
  ipcMain.handle('ffmpeg:thumbnail', (_event, videoPath: string) => {
    return generateThumbnail(videoPath)
  })

  // IPC: FFmpeg — extract audio waveform peaks for the trim editor visualizer
  ipcMain.handle(
    'ffmpeg:getWaveform',
    (_event, videoPath: string, startTime: number, endTime: number, numPoints: number) => {
      return getWaveformPeaks(videoPath, startTime, endTime, numPoints ?? 500)
    }
  )

  // IPC: Open file dialog for video selection
  ipcMain.handle('dialog:openFiles', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Videos', extensions: ['mp4', 'mov', 'avi', 'mkv', 'webm', 'mts', 'm4v'] }
      ]
    })
    return result.filePaths
  })

  // IPC: Open directory dialog for output
  ipcMain.handle('dialog:openDirectory', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory']
    })
    return result.filePaths[0] || null
  })

  // IPC: YouTube download
  ipcMain.handle('youtube:download', async (event, url: string) => {
    const outputDir = join(tmpdir(), 'batchcontent-yt')
    return downloadYouTube(url, outputDir, (percent) => {
      event.sender.send('youtube:progress', { percent })
    })
  })

  // IPC: Transcribe video — extract audio + run Parakeet TDT v3
  ipcMain.handle('transcribe:video', async (event, videoPath: string) => {
    return transcribeVideo(videoPath, (progress) => {
      event.sender.send('transcribe:progress', progress)
    })
  })

  // IPC: Format transcript for AI scoring
  ipcMain.handle('transcribe:formatForAI', (_event, result: Parameters<typeof formatTranscriptForAI>[0]) => {
    return formatTranscriptForAI(result)
  })

  // IPC: AI — score transcript segments for viral potential
  ipcMain.handle(
    'ai:scoreTranscript',
    async (event, apiKey: string, formattedTranscript: string, videoDuration: number, targetDuration?: string) => {
      return scoreTranscript(apiKey, formattedTranscript, videoDuration, (progress) => {
        event.sender.send('ai:scoringProgress', progress)
      }, (targetDuration as import('./ai-scoring').TargetDuration) || 'auto')
    }
  )

  // IPC: AI — generate hook text for a clip
  ipcMain.handle(
    'ai:generateHookText',
    async (_event, apiKey: string, transcript: string) => {
      return generateHookText(apiKey, transcript)
    }
  )

  // IPC: AI — generate re-hook / pattern interrupt text for the mid-clip overlay
  ipcMain.handle(
    'ai:generateRehookText',
    async (_event, apiKey: string, transcript: string, clipStart: number, clipEnd: number) => {
      return generateRehookText(apiKey, transcript, clipStart, clipEnd)
    }
  )

  // IPC: AI — re-score a single clip after the user edits its boundaries
  ipcMain.handle(
    'ai:rescoreSingleClip',
    async (_event, apiKey: string, clipText: string, clipDuration: number) => {
      return rescoreSingleClip(apiKey, clipText, clipDuration)
    }
  )

  // IPC: AI — validate a Gemini API key by making a minimal generateContent call
  ipcMain.handle(
    'ai:validateGeminiKey',
    async (_event, apiKey: string): Promise<{ valid: boolean; error?: string }> => {
      if (!apiKey || !apiKey.trim()) {
        return { valid: false, error: 'API key is empty' }
      }
      try {
        const genAI = new GoogleGenerativeAI(apiKey.trim())
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' })
        await model.generateContent('Hi')
        return { valid: true }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        const status = (err as { status?: number })?.status
        if (status === 400 && /api.key|API_KEY/i.test(msg)) {
          return { valid: false, error: 'Invalid API key' }
        }
        if (status === 401 || status === 403 || /api.key|API_KEY/i.test(msg)) {
          return { valid: false, error: 'Invalid API key' }
        }
        if (status === 429 || /resource.exhausted|rate.limit|quota/i.test(msg)) {
          // Key is valid but rate limited
          return { valid: true }
        }
        if (/ENOTFOUND|ECONNREFUSED|ETIMEDOUT|fetch failed/i.test(msg)) {
          return { valid: false, error: 'Network error — check your internet connection' }
        }
        return { valid: false, error: msg.slice(0, 120) }
      }
    }
  )

  // IPC: AI — validate a Pexels API key with a lightweight search request
  ipcMain.handle(
    'ai:validatePexelsKey',
    async (_event, apiKey: string): Promise<{ valid: boolean; error?: string }> => {
      if (!apiKey || !apiKey.trim()) {
        return { valid: false, error: 'API key is empty' }
      }
      try {
        const url = new URL('https://api.pexels.com/videos/search')
        url.searchParams.set('query', 'nature')
        url.searchParams.set('per_page', '1')
        const response = await fetch(url.toString(), {
          headers: { Authorization: apiKey.trim() }
        })
        if (response.ok) {
          return { valid: true }
        }
        if (response.status === 401 || response.status === 403) {
          return { valid: false, error: 'Invalid API key' }
        }
        return { valid: false, error: `API error: ${response.status} ${response.statusText}` }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        if (/ENOTFOUND|ECONNREFUSED|ETIMEDOUT|fetch failed/i.test(msg)) {
          return { valid: false, error: 'Network error — check your internet connection' }
        }
        return { valid: false, error: msg.slice(0, 120) }
      }
    }
  )

  // IPC: Face detection — smart 9:16 crop regions via MediaPipe
  ipcMain.handle(
    'face:detectCrops',
    async (event, videoPath: string, segments: { start: number; end: number }[]) => {
      return detectFaceCrops(videoPath, segments, (progress) => {
        event.sender.send('face:progress', progress)
      })
    }
  )

  // IPC: Render — start a batch render of approved clips
  ipcMain.handle('render:startBatch', async (event, options: RenderBatchOptions) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) throw new Error('No BrowserWindow found for render request')

    // If sound design is enabled globally, compute placements for each clip
    // that hasn't disabled it via clipOverrides.enableSoundDesign
    if (options.soundDesign?.enabled) {
      for (const job of options.jobs) {
        const soundDesignOv = job.clipOverrides?.enableSoundDesign
        const soundEnabled = soundDesignOv === undefined ? true : soundDesignOv
        if (!soundEnabled) {
          console.log(`[SoundDesign] Clip ${job.clipId}: disabled by per-clip override`)
          continue
        }
        const clipDuration = job.endTime - job.startTime
        // Word timestamps are relative to the source video; filter to clip range
        const clipWords = (job.wordTimestamps ?? []).filter(
          (w) => w.start >= job.startTime && w.end <= job.endTime
        )
        // Shift timestamps to be 0-based within the clip
        const localWords = clipWords.map((w) => ({
          text: w.text,
          start: w.start - job.startTime,
          end: w.end - job.startTime
        }))
        job.soundPlacements = generateSoundPlacements(
          clipDuration,
          localWords,
          options.soundDesign
        )
        console.log(
          `[SoundDesign] Clip ${job.clipId}: ${job.soundPlacements.length} sound placement(s)`
        )
      }
    }

    // Run in background — caller receives progress via render:clip* / render:batch* events
    startBatchRender(options, win).catch((err) => {
      console.error('[render-pipeline] Unhandled error:', err)
      event.sender.send('render:batchDone', { completed: 0, failed: options.jobs.length, total: options.jobs.length })
    })
    return { started: true }
  })

  // IPC: Render — cancel the active batch
  ipcMain.handle('render:cancel', () => {
    cancelRender()
  })

  // IPC: Captions — generate an .ass subtitle file from word timestamps + style
  ipcMain.handle(
    'captions:generate',
    async (
      _event,
      words: WordInput[],
      style: CaptionStyleInput,
      outputPath?: string
    ) => {
      return generateCaptions(words, style, outputPath)
    }
  )

  // IPC: Brand Kit — select and copy logo image to stable userData path
  ipcMain.handle('brandkit:selectLogo', () => selectAndCopyLogo())

  // IPC: Brand Kit — select and copy intro bumper video to stable userData path
  ipcMain.handle('brandkit:selectIntroBumper', () => selectAndCopyBumper('intro'))

  // IPC: Brand Kit — select and copy outro bumper video to stable userData path
  ipcMain.handle('brandkit:selectOutroBumper', () => selectAndCopyBumper('outro'))

  // IPC: Brand Kit — copy logo from a specific path (used by drag-and-drop)
  ipcMain.handle('brandkit:copyLogo', (_event, filePath: string) => copyLogoFromPath(filePath))

  // IPC: Brand Kit — copy bumper from a specific path (used by drag-and-drop)
  ipcMain.handle('brandkit:copyBumper', (_event, filePath: string) => copyBumperFromPath(filePath))

  // IPC: Safe Zones — get element placement rect for a platform + element type
  ipcMain.handle(
    'safezones:getPlacement',
    (_event, platform: Platform, element: ElementType): SafeZoneRect => {
      return getElementPlacement(platform, element)
    }
  )

  // IPC: Safe Zones — get the full safe zone rect for a platform
  ipcMain.handle(
    'safezones:getSafeZone',
    (_event, platform: Platform): SafeZoneRect => {
      return getSafeZone(platform)
    }
  )

  // IPC: Safe Zones — get dead zone measurements for a platform
  ipcMain.handle(
    'safezones:getDeadZones',
    (_event, platform: Platform) => {
      return getDeadZones(platform)
    }
  )

  // IPC: Safe Zones — clamp a rect to the safe zone of a platform
  ipcMain.handle(
    'safezones:clamp',
    (_event, rect: SafeZoneRect, platform: Platform): SafeZoneRect => {
      return clampToSafeZone(rect, platform)
    }
  )

  // IPC: Safe Zones — check if a rect is fully inside the safe zone
  ipcMain.handle(
    'safezones:isInside',
    (_event, rect: SafeZoneRect, platform: Platform): boolean => {
      return isInsideSafeZone(rect, platform)
    }
  )

  // IPC: Safe Zones — convert a placement rect to ASS subtitle margin values
  ipcMain.handle(
    'safezones:toAssMargins',
    (_event, rect: SafeZoneRect) => {
      return rectToAssMargins(rect)
    }
  )

  // IPC: Safe Zones — return all platform safe zone definitions
  ipcMain.handle('safezones:getAllPlatforms', () => {
    return PLATFORM_SAFE_ZONES
  })

  // ---------------------------------------------------------------------------
  // Recent Projects helpers
  // ---------------------------------------------------------------------------

  interface RecentProjectEntry {
    path: string
    name: string
    lastOpened: number
    clipCount: number
    sourceCount: number
  }

  const RECENT_PROJECTS_MAX = 10

  function getRecentProjectsFilePath(): string {
    return join(app.getPath('userData'), 'recent-projects.json')
  }

  function loadRecentProjects(): RecentProjectEntry[] {
    try {
      const filePath = getRecentProjectsFilePath()
      if (!existsSync(filePath)) return []
      const raw = readFileSync(filePath, 'utf-8')
      return JSON.parse(raw) as RecentProjectEntry[]
    } catch {
      return []
    }
  }

  function saveRecentProjects(entries: RecentProjectEntry[]): void {
    try {
      const filePath = getRecentProjectsFilePath()
      mkdirSync(join(filePath, '..'), { recursive: true })
      writeFileSync(filePath, JSON.stringify(entries, null, 2), 'utf-8')
    } catch {
      // Silently ignore write errors
    }
  }

  function addRecentProject(entry: RecentProjectEntry): void {
    const entries = loadRecentProjects()
    // Remove any existing entry for the same path
    const filtered = entries.filter((e) => e.path !== entry.path)
    // Prepend the new entry and cap at max
    const updated = [entry, ...filtered].slice(0, RECENT_PROJECTS_MAX)
    saveRecentProjects(updated)
    // Also register with the OS (dock on macOS, JumpList on Windows)
    try { app.addRecentDocument(entry.path) } catch { /* ignore on Linux */ }
  }

  // IPC: Project — get recent projects list
  ipcMain.handle('project:getRecent', (): RecentProjectEntry[] => {
    return loadRecentProjects()
  })

  // IPC: Project — add a project to the recent list
  ipcMain.handle('project:addRecent', (_event, entry: RecentProjectEntry) => {
    addRecentProject(entry)
  })

  // IPC: Project — remove a specific path from the recent list
  ipcMain.handle('project:removeRecent', (_event, path: string) => {
    const entries = loadRecentProjects().filter((e) => e.path !== path)
    saveRecentProjects(entries)
  })

  // IPC: Project — clear the entire recent list
  ipcMain.handle('project:clearRecent', () => {
    saveRecentProjects([])
    try { app.clearRecentDocuments() } catch { /* ignore on Linux */ }
  })

  // IPC: Project — save project JSON to a .batchcontent file chosen by user
  ipcMain.handle('project:save', async (_event, json: string) => {
    const result = await dialog.showSaveDialog({
      title: 'Save Project',
      defaultPath: 'project.batchcontent',
      filters: [{ name: 'BatchContent Project', extensions: ['batchcontent'] }]
    })
    if (result.canceled || !result.filePath) return null
    writeFileSync(result.filePath, json, 'utf-8')
    // Parse the project to extract metadata for the recent list
    try {
      const project = JSON.parse(json)
      const name = result.filePath.split('/').pop()?.replace('.batchcontent', '') ?? 'Untitled'
      addRecentProject({
        path: result.filePath,
        name,
        lastOpened: Date.now(),
        clipCount: Object.values(project.clips ?? {}).flat().length,
        sourceCount: (project.sources ?? []).length
      })
    } catch { /* ignore metadata extraction errors */ }
    return result.filePath
  })

  // IPC: Project — load project JSON from a .batchcontent file chosen by user
  ipcMain.handle('project:load', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Open Project',
      properties: ['openFile'],
      filters: [{ name: 'BatchContent Project', extensions: ['batchcontent'] }]
    })
    if (result.canceled || result.filePaths.length === 0) return null
    const filePath = result.filePaths[0]
    const data = readFileSync(filePath, 'utf-8')
    // Track in recent list
    try {
      const project = JSON.parse(data)
      const name = filePath.split('/').pop()?.replace('.batchcontent', '') ?? 'Untitled'
      addRecentProject({
        path: filePath,
        name,
        lastOpened: Date.now(),
        clipCount: Object.values(project.clips ?? {}).flat().length,
        sourceCount: (project.sources ?? []).length
      })
    } catch { /* ignore metadata extraction errors */ }
    return data
  })

  // IPC: Project — load project JSON from a specific path (recent project click)
  ipcMain.handle('project:loadFromPath', async (_event, filePath: string) => {
    if (!existsSync(filePath)) return null
    const data = readFileSync(filePath, 'utf-8')
    // Update lastOpened in recent list
    try {
      const project = JSON.parse(data)
      const name = filePath.split('/').pop()?.replace('.batchcontent', '') ?? 'Untitled'
      addRecentProject({
        path: filePath,
        name,
        lastOpened: Date.now(),
        clipCount: Object.values(project.clips ?? {}).flat().length,
        sourceCount: (project.sources ?? []).length
      })
    } catch { /* ignore */ }
    return data
  })

  // IPC: System — get disk space info for a directory
  ipcMain.handle('system:getDiskSpace', (_event, dirPath: string) => {
    return new Promise<{ free: number; total: number }>((resolve, reject) => {
      statfs(dirPath, (err, stats) => {
        if (err) {
          reject(err)
          return
        }
        resolve({
          free: stats.bavail * stats.bsize,
          total: stats.blocks * stats.bsize
        })
      })
    })
  })

  // IPC: System — show an OS-level notification
  ipcMain.handle(
    'system:notify',
    (_event, opts: { title: string; body: string; silent?: boolean }) => {
      if (!Notification.isSupported()) return
      new Notification({ title: opts.title, body: opts.body, silent: opts.silent ?? false }).show()
    }
  )

  // IPC: System — get active video encoder info
  ipcMain.handle('system:getEncoder', () => {
    const { encoder } = getEncoder()
    const isHardware = encoder === 'h264_nvenc' || encoder === 'h264_qsv'
    return { encoder, isHardware }
  })

  // IPC: System — enumerate available fonts (bundled + common system fonts)
  ipcMain.handle('system:getAvailableFonts', async () => {
    type FontEntry = { name: string; path: string; source: 'bundled' | 'system' }
    const fonts: FontEntry[] = []

    // 1. Bundled fonts in resources/fonts/
    const resourcesPath = app.isPackaged
      ? join(process.resourcesPath, 'fonts')
      : join(__dirname, '../../resources/fonts')

    if (existsSync(resourcesPath)) {
      try {
        const entries = await readdir(resourcesPath)
        for (const file of entries) {
          if (!/\.(ttf|otf)$/i.test(file)) continue
          // Derive display name: strip extension and replace dashes/underscores with spaces
          const name = file.replace(/\.(ttf|otf)$/i, '').replace(/[-_]/g, ' ')
          fonts.push({ name, path: join(resourcesPath, file), source: 'bundled' })
        }
      } catch {
        // Ignore readdir errors
      }
    }

    // 2. Well-known system font candidates — only include those that exist on disk
    const SYSTEM_FONT_CANDIDATES: Array<{ name: string; path: string }> = [
      // Liberation (Linux)
      { name: 'Liberation Sans Bold', path: '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf' },
      { name: 'Liberation Sans', path: '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf' },
      // DejaVu (Linux)
      { name: 'DejaVu Sans Bold', path: '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf' },
      { name: 'DejaVu Sans', path: '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf' },
      // FreeSans (Debian/Ubuntu)
      { name: 'FreeSans Bold', path: '/usr/share/fonts/truetype/freefont/FreeSansBold.ttf' },
      { name: 'FreeSans', path: '/usr/share/fonts/truetype/freefont/FreeSans.ttf' },
      // Ubuntu (Ubuntu)
      { name: 'Ubuntu Bold', path: '/usr/share/fonts/truetype/ubuntu/Ubuntu-B.ttf' },
      { name: 'Ubuntu', path: '/usr/share/fonts/truetype/ubuntu/Ubuntu-R.ttf' },
      // Noto Sans (common Linux)
      { name: 'Noto Sans Bold', path: '/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf' },
      { name: 'Noto Sans', path: '/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf' },
      // macOS
      { name: 'Helvetica', path: '/System/Library/Fonts/Helvetica.ttc' },
      { name: 'Arial Bold', path: '/Library/Fonts/Arial Bold.ttf' },
      { name: 'Arial', path: '/Library/Fonts/Arial.ttf' },
      // Windows
      { name: 'Arial Bold', path: 'C:\\Windows\\Fonts\\arialbd.ttf' },
      { name: 'Arial', path: 'C:\\Windows\\Fonts\\arial.ttf' },
      { name: 'Impact', path: 'C:\\Windows\\Fonts\\impact.ttf' },
      { name: 'Calibri Bold', path: 'C:\\Windows\\Fonts\\calibrib.ttf' },
      { name: 'Calibri', path: 'C:\\Windows\\Fonts\\calibri.ttf' },
    ]

    const seenPaths = new Set(fonts.map((f) => f.path))
    for (const candidate of SYSTEM_FONT_CANDIDATES) {
      if (!seenPaths.has(candidate.path) && existsSync(candidate.path)) {
        fonts.push({ ...candidate, source: 'system' })
        seenPaths.add(candidate.path)
      }
    }

    return fonts
  })

  // IPC: Shell — open a path (folder or file) in the OS file manager
  ipcMain.handle('shell:openPath', async (_event, path: string) => {
    return shell.openPath(path)
  })

  // IPC: Shell — show a file in its parent folder in the OS file manager
  ipcMain.handle('shell:showItemInFolder', (_event, path: string) => {
    shell.showItemInFolder(path)
  })

  // IPC: FFmpeg — split a video into segments using stream copy
  ipcMain.handle(
    'ffmpeg:splitSegments',
    async (_event, inputPath: string, segments: SplitSegment[], outputDir: string) => {
      return splitSegments(inputPath, segments, outputDir)
    }
  )

  // IPC: Layout — build an FFmpeg filter_complex string for blur-background fill
  ipcMain.handle(
    'layout:buildBlurBackground',
    (
      _event,
      inputWidth: number,
      inputHeight: number,
      outputWidth: number,
      outputHeight: number,
      config: BlurBackgroundConfig
    ) => {
      return buildBlurBackgroundFilter(inputWidth, inputHeight, outputWidth, outputHeight, config)
    }
  )

  // IPC: Layout — build an FFmpeg filter_complex string for split-screen layouts
  ipcMain.handle(
    'layout:buildSplitScreen',
    (
      _event,
      layout: SplitScreenLayout,
      mainSource: VideoSource,
      secondarySource: VideoSource | null,
      config: SplitScreenConfig
    ) => {
      return buildSplitScreenFilter(layout, mainSource, secondarySource, config)
    }
  )

  // IPC: AI — detect curiosity gaps in a transcript
  ipcMain.handle(
    'ai:detectCuriosityGaps',
    async (
      _event,
      apiKey: string,
      transcript: Parameters<typeof detectCuriosityGaps>[1],
      formattedTranscript: string,
      videoDuration: number
    ) => {
      return detectCuriosityGaps(apiKey, transcript, formattedTranscript, videoDuration)
    }
  )

  // IPC: AI — optimize clip boundaries to frame around a curiosity gap
  ipcMain.handle(
    'ai:optimizeClipBoundaries',
    (
      _event,
      gap: CuriosityGap,
      originalStart: number,
      originalEnd: number,
      transcript: Parameters<typeof optimizeClipBoundaries>[3]
    ) => {
      return optimizeClipBoundaries(gap, originalStart, originalEnd, transcript)
    }
  )

  // IPC: AI — re-rank clip candidates by blending virality + curiosity gap scores
  ipcMain.handle(
    'ai:rankClipsByCuriosity',
    (_event, clips: ClipCandidate[], gaps: CuriosityGap[]) => {
      return rankClipsByCuriosity(clips, gaps)
    }
  )

  // IPC: Loop Optimizer — analyze a clip's transcript for natural loop points
  ipcMain.handle(
    'loop:analyzeLoopPotential',
    async (
      _event,
      apiKey: string,
      transcript: Parameters<typeof analyzeLoopPotential>[1],
      clipStart: number,
      clipEnd: number
    ) => {
      return analyzeLoopPotential(apiKey, transcript, clipStart, clipEnd)
    }
  )

  // IPC: Loop Optimizer — apply loop analysis to produce adjusted clip boundaries
  ipcMain.handle(
    'loop:optimizeForLoop',
    (
      _event,
      clipStart: number,
      clipEnd: number,
      transcript: Parameters<typeof optimizeForLoop>[2],
      analysis: LoopAnalysis
    ): LoopOptimizedClip => {
      return optimizeForLoop(clipStart, clipEnd, transcript, analysis)
    }
  )

  // IPC: Loop Optimizer — build FFmpeg audio crossfade filter for loop boundaries
  ipcMain.handle(
    'loop:buildCrossfadeFilter',
    (_event, clipDuration: number, crossfadeDuration: number): string => {
      return buildLoopCrossfadeFilter(clipDuration, crossfadeDuration)
    }
  )

  // IPC: Loop Optimizer — compute composite loop quality score (0–100)
  ipcMain.handle(
    'loop:scoreLoopQuality',
    (_event, analysis: LoopAnalysis): number => {
      return scoreLoopQuality(analysis)
    }
  )

  // IPC: Clip Variants — generate A/B/C packaging variants for a clip
  ipcMain.handle(
    'variants:generate',
    async (
      _event,
      apiKey: string,
      clip: ClipCandidate,
      transcript: Parameters<typeof generateVariants>[2],
      capabilities: OverlayCapabilities
    ): Promise<ClipVariant[]> => {
      return generateVariants(apiKey, clip, transcript, capabilities)
    }
  )

  // IPC: Clip Variants — convert variants into render pipeline configs
  ipcMain.handle(
    'variants:buildRenderConfigs',
    (
      _event,
      variants: ClipVariant[],
      baseClip: ClipCandidate,
      baseName: string
    ) => {
      return buildVariantRenderConfigs(variants, baseClip, baseName)
    }
  )

  // IPC: Clip Variants — generate UI labels for a set of variants
  ipcMain.handle(
    'variants:generateLabels',
    (_event, variants: ClipVariant[]) => {
      return generateVariantLabels(variants)
    }
  )

  // IPC: Story Arc — detect multi-clip narrative arcs with AI
  ipcMain.handle(
    'storyarc:detectStoryArcs',
    async (
      _event,
      apiKey: string,
      transcript: Parameters<typeof detectStoryArcs>[1],
      clips: Parameters<typeof detectStoryArcs>[2]
    ) => {
      return detectStoryArcs(apiKey, transcript, clips)
    }
  )

  // IPC: Story Arc — derive series metadata (part numbers, titles, end-card text)
  ipcMain.handle(
    'storyarc:generateSeriesMetadata',
    (_event, arc: StoryArc) => {
      return generateSeriesMetadata(arc)
    }
  )

  // IPC: Story Arc — build FFmpeg drawtext filter for "Part N/M" badge
  ipcMain.handle(
    'storyarc:buildPartNumberFilter',
    async (
      _event,
      partNumber: number,
      totalParts: number,
      seriesTitle: string,
      config: Partial<PartNumberConfig>
    ) => {
      const fontFilePath = await resolveHookFont()
      return buildPartNumberFilter(partNumber, totalParts, seriesTitle, {
        ...config,
        fontFilePath: config.fontFilePath ?? fontFilePath ?? undefined
      })
    }
  )

  // IPC: Story Arc — build FFmpeg filter for end-card overlay
  ipcMain.handle(
    'storyarc:buildEndCardFilter',
    async (
      _event,
      nextPartTeaser: string,
      clipDuration: number,
      config: Partial<EndCardConfig>
    ) => {
      const fontFilePath = await resolveHookFont()
      return buildEndCardFilter(nextPartTeaser, clipDuration, {
        ...config,
        fontFilePath: config.fontFilePath ?? fontFilePath ?? undefined
      })
    }
  )

  // IPC: Clip Stitcher — generate composite clips from non-contiguous segments
  ipcMain.handle(
    'stitch:generateCompositeClips',
    async (
      event,
      apiKey: string,
      formattedTranscript: string,
      videoDuration: number,
      wordTimestamps: { text: string; start: number; end: number }[]
    ) => {
      return generateStitchedClips(apiKey, formattedTranscript, videoDuration, wordTimestamps, (p: StitchingProgress) => {
        event.sender.send('stitch:progress', p)
      })
    }
  )

  // IPC: Description Generator — generate description + hashtag for a single clip
  ipcMain.handle(
    'ai:generateClipDescription',
    async (
      _event,
      apiKey: string,
      transcript: string,
      clipContext?: string,
      hookTitle?: string
    ) => {
      return generateClipDescription(apiKey, transcript, clipContext, hookTitle)
    }
  )

  // IPC: Description Generator — batch-generate descriptions for all clips in one AI call
  ipcMain.handle(
    'ai:generateBatchDescriptions',
    async (_event, apiKey: string, clips: DescriptionClipInput[]) => {
      return generateBatchDescriptions(apiKey, clips)
    }
  )

  // IPC: Export Descriptions — write descriptions.csv, descriptions.json, descriptions.txt
  ipcMain.handle(
    'export:descriptions',
    async (
      _event,
      clips: Array<{
        clipName: string
        score: number
        duration: number
        hookText: string
        platforms: Array<{ platform: string; text: string; hashtags: string[] }>
        shortDescription: string
        hashtag: string
      }>,
      outputDirectory: string,
      format: 'csv' | 'json' | 'txt'
    ): Promise<string> => {
      if (!existsSync(outputDirectory)) mkdirSync(outputDirectory, { recursive: true })

      if (format === 'csv') {
        const csvPath = join(outputDirectory, 'descriptions.csv')
        const escapeCSV = (s: string) => `"${s.replace(/"/g, '""')}"`
        const headers = ['Clip Name', 'Platform', 'Description', 'Hashtags', 'Hook Text', 'Score', 'Duration (s)']
        const rows: string[] = [headers.map(escapeCSV).join(',')]
        for (const clip of clips) {
          for (const p of clip.platforms) {
            rows.push([
              escapeCSV(clip.clipName),
              escapeCSV(p.platform),
              escapeCSV(p.text),
              escapeCSV(p.hashtags.map((h) => `#${h}`).join(' ')),
              escapeCSV(clip.hookText),
              String(clip.score),
              clip.duration.toFixed(1)
            ].join(','))
          }
        }
        writeFileSync(csvPath, rows.join('\n'), 'utf-8')
        return csvPath
      }

      if (format === 'json') {
        const jsonPath = join(outputDirectory, 'descriptions.json')
        const data = {
          exportedAt: new Date().toISOString(),
          clipCount: clips.length,
          clips: clips.map((clip) => ({
            clipName: clip.clipName,
            score: clip.score,
            duration: clip.duration,
            hookText: clip.hookText,
            shortDescription: clip.shortDescription,
            hashtag: clip.hashtag,
            platforms: clip.platforms
          }))
        }
        writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf-8')
        return jsonPath
      }

      // txt
      const txtPath = join(outputDirectory, 'descriptions.txt')
      const sections: string[] = [
        `BatchContent — Social Media Descriptions`,
        `Exported: ${new Date().toLocaleString()}`,
        `Clips: ${clips.length}`,
        '='.repeat(60)
      ]
      for (let i = 0; i < clips.length; i++) {
        const clip = clips[i]
        sections.push('')
        sections.push(`Clip ${i + 1}: ${clip.clipName}`)
        sections.push(`Score: ${clip.score}/100  |  Duration: ${clip.duration.toFixed(1)}s`)
        sections.push(`Hook: ${clip.hookText}`)
        sections.push('-'.repeat(40))
        for (const p of clip.platforms) {
          const label =
            p.platform === 'youtube-shorts' ? 'YouTube Shorts'
            : p.platform === 'instagram-reels' ? 'Instagram Reels'
            : 'TikTok'
          sections.push(`[${label}]`)
          sections.push(p.text)
          sections.push('')
        }
      }
      writeFileSync(txtPath, sections.join('\n'), 'utf-8')
      return txtPath
    }
  )

  // IPC: B-Roll — extract keywords + fetch Pexels clips + compute placement schedule
  ipcMain.handle(
    'broll:generatePlacements',
    async (
      _event,
      geminiApiKey: string,
      pexelsApiKey: string,
      transcriptText: string,
      wordTimestamps: BRollWordTimestamp[],
      clipStart: number,
      clipEnd: number,
      settings: { intervalSeconds: number; clipDuration: number }
    ) => {
      const brollSettings: BRollSettingsConfig = {
        enabled: true,
        pexelsApiKey,
        intervalSeconds: settings.intervalSeconds,
        clipDuration: settings.clipDuration
      }

      const clipDuration = clipEnd - clipStart

      // Step 1: Extract visual keywords from transcript
      const keywords = await extractBRollKeywords(
        transcriptText,
        wordTimestamps,
        clipStart,
        clipEnd,
        geminiApiKey
      )

      if (keywords.length === 0) {
        console.log('[B-Roll] No keywords extracted — skipping B-Roll generation')
        return []
      }

      // Step 2: Fetch stock footage clips from Pexels for each keyword
      const uniqueKeywords = [...new Set(keywords.map((k) => k.keyword))]
      const downloadedClips = await fetchBRollClips(
        uniqueKeywords,
        pexelsApiKey,
        settings.clipDuration
      )

      if (downloadedClips.size === 0) {
        console.log('[B-Roll] No clips downloaded — skipping B-Roll generation')
        return []
      }

      // Step 3: Compute placement schedule
      const placements = buildBRollPlacements(
        clipDuration,
        keywords,
        downloadedClips,
        brollSettings
      )

      console.log(`[B-Roll] Generated ${placements.length} placement(s) for clip at ${clipStart}–${clipEnd}s`)
      return placements
    }
  )

  // IPC: Emoji Burst — identify high-emotion moments via AI
  ipcMain.handle(
    'overlay:identifyEmojiMoments',
    async (
      _event,
      apiKey: string,
      transcript: TranscriptionResult,
      clipStart: number,
      clipEnd: number,
      config: EmojiBurstConfig
    ) => {
      return identifyEmojiMoments(apiKey, transcript, clipStart, clipEnd, config)
    }
  )

  // IPC: Emoji Burst — build FFmpeg drawtext filter strings for floating emoji
  ipcMain.handle(
    'overlay:buildEmojiBurstFilters',
    (_event, moments: EmojiMoment[], config: EmojiBurstConfig) => {
      const fontFilePath = resolveEmojiFont()
      return buildEmojiBurstFilters(moments, config, fontFilePath)
    }
  )

  // IPC: Fake Comment Overlay — generate a believable viewer comment with AI
  ipcMain.handle(
    'overlay:generateFakeComment',
    async (_event, apiKey: string, transcript: string, clipContext?: string) => {
      return generateFakeComment(apiKey, transcript, clipContext)
    }
  )

  // IPC: Fake Comment Overlay — build FFmpeg drawbox/drawtext filter chain
  ipcMain.handle(
    'overlay:buildFakeCommentFilter',
    async (_event, comment: FakeCommentData, config: FakeCommentConfig) => {
      const fontFilePath = await resolveHookFont()
      return buildFakeCommentFilter(comment, config, fontFilePath)
    }
  )

  // IPC: Export Manifest — manually (re-)generate manifest.json + manifest.csv
  ipcMain.handle(
    'export:generateManifest',
    async (
      _event,
      outputDirectory: string,
      jobs: RenderClipJob[],
      clipMetaArray: ManifestJobMeta[],
      sourceMeta: { name: string; path: string; duration: number }
    ): Promise<{ jsonPath: string; csvPath: string }> => {
      const { encoder } = getEncoder()

      // Build a minimal options object for the manifest (no active render context)
      const options = { jobs, outputDirectory }

      const manifest = generateRenderManifest({
        jobs,
        options: options as Parameters<typeof generateRenderManifest>[0]['options'],
        clipMeta: clipMetaArray,
        clipResults: new Map(jobs.map((j) => [j.clipId, null])),
        clipRenderTimes: new Map(),
        totalRenderTimeMs: 0,
        encoder,
        sourceName: sourceMeta.name,
        sourcePath: sourceMeta.path,
        sourceDuration: sourceMeta.duration
      })

      return writeManifestFiles(manifest, outputDirectory)
    }
  )

  // IPC: Python setup — check status
  ipcMain.handle('python:getStatus', () => checkPythonSetup())

  // IPC: Python setup — start installation
  ipcMain.handle('python:startSetup', async (event) => {
    runFullSetup(event.sender).catch((err) => {
      event.sender.send('python:setupDone', { success: false, error: err.message })
    })
    return { started: true }
  })

  // ---------------------------------------------------------------------------
  // Temp File Cleanup — helpers shared by IPC handlers and auto-cleanup on quit
  // ---------------------------------------------------------------------------

  /**
   * Scan os.tmpdir() for files whose name starts with 'batchcontent-'.
   * Also scans the YouTube download directory (batchcontent-yt) and the
   * B-Roll cache directory (batchcontent-broll-cache).
   *
   * Returns the list of matching file paths (not directories).
   */
  async function scanBatchContentTempFiles(): Promise<string[]> {
    const found: string[] = []
    const tmp = tmpdir()

    // Scan tmpdir for batchcontent-* files (WAV, PNG, ASS, MP4, TXT, JSON)
    try {
      const entries = await readdir(tmp)
      for (const name of entries) {
        if (!name.startsWith('batchcontent-')) continue
        const fullPath = join(tmp, name)
        try {
          const s = await stat(fullPath)
          if (s.isFile()) found.push(fullPath)
        } catch {
          // ignore stat errors (file may have been removed already)
        }
      }
    } catch {
      // ignore readdir errors
    }

    // Scan batchcontent-yt directory (YouTube downloads)
    const ytDir = join(tmp, 'batchcontent-yt')
    try {
      const entries = await readdir(ytDir)
      for (const name of entries) {
        const fullPath = join(ytDir, name)
        try {
          const s = await stat(fullPath)
          if (s.isFile()) found.push(fullPath)
        } catch {
          // ignore
        }
      }
    } catch {
      // directory may not exist — ignore
    }

    // Scan batchcontent-broll-cache directory (downloaded B-Roll stock footage)
    const brollDir = join(tmp, 'batchcontent-broll-cache')
    try {
      const entries = await readdir(brollDir)
      for (const name of entries) {
        const fullPath = join(brollDir, name)
        try {
          const s = await stat(fullPath)
          if (s.isFile()) found.push(fullPath)
        } catch {
          // ignore
        }
      }
    } catch {
      // directory may not exist — ignore
    }

    return found
  }

  /**
   * Delete all identified BatchContent temp files.
   * Returns the number deleted and total bytes freed.
   */
  async function deleteBatchContentTempFiles(): Promise<{ deleted: number; freed: number }> {
    const files = await scanBatchContentTempFiles()
    let deleted = 0
    let freed = 0
    for (const filePath of files) {
      try {
        const s = await stat(filePath)
        await unlink(filePath)
        freed += s.size
        deleted++
      } catch {
        // File may have been removed already — ignore
      }
    }
    return { deleted, freed }
  }

  // IPC: System — scan temp files and return total size + count
  ipcMain.handle('system:getTempSize', async (): Promise<{ bytes: number; count: number }> => {
    const files = await scanBatchContentTempFiles()
    let bytes = 0
    for (const filePath of files) {
      try {
        const s = await stat(filePath)
        bytes += s.size
      } catch {
        // ignore
      }
    }
    return { bytes, count: files.length }
  })

  // IPC: System — delete all identified temp files
  ipcMain.handle(
    'system:cleanupTemp',
    async (): Promise<{ deleted: number; freed: number }> => {
      return deleteBatchContentTempFiles()
    }
  )

  // IPC: System — get current log file path
  ipcMain.handle('system:getLogPath', (): string => {
    return getLogPath()
  })

  // IPC: System — get current log file size in bytes
  ipcMain.handle('system:getLogSize', (): number => {
    return getLogSize()
  })

  // IPC: System — export the session log + renderer errors to a user-chosen directory
  ipcMain.handle(
    'system:exportLogs',
    async (
      _event,
      rendererErrors: Array<{ timestamp: number; source: string; message: string; details?: string }>
    ): Promise<{ exportPath: string } | null> => {
      const result = await dialog.showOpenDialog({
        title: 'Choose Export Folder',
        properties: ['openDirectory', 'createDirectory']
      })
      if (result.canceled || result.filePaths.length === 0) return null

      const exportDir = result.filePaths[0]
      const now = new Date()
      const pad = (n: number) => n.toString().padStart(2, '0')
      const stamp =
        `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` +
        `_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`
      const exportPath = join(exportDir, `batchcontent-debug-${stamp}.log`)

      // Collect system info
      const { encoder } = getEncoder()
      const nodeVersion = process.version
      const electronVersion = process.versions.electron ?? 'unknown'
      const platform = `${process.platform} ${process.arch}`

      const lines: string[] = [
        '='.repeat(80),
        'BatchContent — Full Debug Log Export',
        `Exported: ${now.toISOString()}`,
        '='.repeat(80),
        '',
        '--- System Info ---',
        `Platform:  ${platform}`,
        `Node:      ${nodeVersion}`,
        `Electron:  ${electronVersion}`,
        `Encoder:   ${encoder}`,
        `Log file:  ${getLogPath()}`,
        `Log size:  ${getLogSize()} bytes`,
        '',
      ]

      // Include the session log file content
      const sessionLogPath = getLogPath()
      if (sessionLogPath && existsSync(sessionLogPath)) {
        lines.push('--- Session Log (Main Process) ---')
        try {
          const logContent = readFileSync(sessionLogPath, 'utf-8')
          lines.push(logContent)
        } catch {
          lines.push('(could not read session log)')
        }
      } else {
        lines.push('--- Session Log (Main Process) ---')
        lines.push('(no session log available)')
      }

      // Include renderer error log entries
      lines.push('')
      lines.push('--- Renderer Error Log ---')
      if (rendererErrors.length === 0) {
        lines.push('(no renderer errors)')
      } else {
        for (const entry of rendererErrors) {
          const d = new Date(entry.timestamp)
          const ts = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${d.getMilliseconds().toString().padStart(3, '0')}`
          lines.push(`[${ts}] [ERROR] [${entry.source}] ${entry.message}`)
          if (entry.details) {
            lines.push(`  → ${entry.details.slice(0, 500)}`)
          }
        }
      }

      lines.push('')
      lines.push('='.repeat(80))
      lines.push('End of log export')
      lines.push('='.repeat(80))

      writeFileSync(exportPath, lines.join('\n'), 'utf-8')
      log('info', 'Main', `Debug log exported to: ${exportPath}`)

      return { exportPath }
    }
  )

  // IPC: System — open the logs directory in the OS file manager
  ipcMain.handle('system:openLogFolder', async (): Promise<void> => {
    const dir = getLogDir()
    if (dir && existsSync(dir)) {
      shell.openPath(dir)
    }
  })

  // IPC: System — get HuggingFace model cache size (~/.cache/huggingface)
  ipcMain.handle('system:getCacheSize', async (): Promise<{ bytes: number }> => {
    const cacheDir = join(homedir(), '.cache', 'huggingface')
    let bytes = 0

    async function walkDir(dir: string): Promise<void> {
      let entries: string[]
      try {
        entries = await readdir(dir)
      } catch {
        return
      }
      for (const name of entries) {
        const fullPath = join(dir, name)
        try {
          const s = await stat(fullPath)
          if (s.isFile()) {
            bytes += s.size
          } else if (s.isDirectory()) {
            await walkDir(fullPath)
          }
        } catch {
          // ignore
        }
      }
    }

    await walkDir(cacheDir)
    return { bytes }
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Auto-cleanup on quit: if the user enabled the preference, delete temp files
// before the app exits. The preference is stored in localStorage (renderer),
// but we read it via a flag set by an IPC call so main process can act on it.
let autoCleanupOnExit = false

ipcMain.handle('system:setAutoCleanup', (_event, enabled: boolean) => {
  autoCleanupOnExit = enabled
})

app.on('before-quit', async (event) => {
  if (!autoCleanupOnExit) return
  event.preventDefault()
  try {
    await (async () => {
      const tmp = tmpdir()
      const entries = await readdir(tmp).catch(() => [] as string[])
      for (const name of entries) {
        if (!name.startsWith('batchcontent-')) continue
        try {
          const fullPath = join(tmp, name)
          const s = await stat(fullPath)
          if (s.isFile()) await unlink(fullPath)
        } catch { /* ignore */ }
      }
    })()
  } catch { /* ignore */ }
  autoCleanupOnExit = false // prevent re-entry
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
