import { contextBridge, ipcRenderer, webUtils } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  // File dialogs
  openFiles: () => ipcRenderer.invoke('dialog:openFiles'),
  openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
  getPathForFile: (file: File) => webUtils.getPathForFile(file),

  // FFmpeg
  getMetadata: (filePath: string) => ipcRenderer.invoke('ffmpeg:getMetadata', filePath),
  extractAudio: (videoPath: string) => ipcRenderer.invoke('ffmpeg:extractAudio', videoPath),
  getThumbnail: (videoPath: string, timeSec?: number) => ipcRenderer.invoke('ffmpeg:thumbnail', videoPath, timeSec),
  getWaveform: (videoPath: string, startTime: number, endTime: number, numPoints?: number) =>
    ipcRenderer.invoke('ffmpeg:getWaveform', videoPath, startTime, endTime, numPoints ?? 500),

  // YouTube
  downloadYouTube: (url: string) => ipcRenderer.invoke('youtube:download', url),
  onYouTubeProgress: (callback: (data: { percent: number }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { percent: number }) => callback(data)
    ipcRenderer.on('youtube:progress', handler)
    return () => ipcRenderer.removeListener('youtube:progress', handler)
  },

  // Transcription
  transcribeVideo: (videoPath: string) => ipcRenderer.invoke('transcribe:video', videoPath),
  formatTranscriptForAI: (result: unknown) =>
    ipcRenderer.invoke('transcribe:formatForAI', result),
  onTranscribeProgress: (callback: (data: { stage: string; message: string }) => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      data: { stage: string; message: string }
    ) => callback(data)
    ipcRenderer.on('transcribe:progress', handler)
    return () => ipcRenderer.removeListener('transcribe:progress', handler)
  },

  // AI scoring
  scoreTranscript: (apiKey: string, transcript: string, duration: number, targetDuration?: string) =>
    ipcRenderer.invoke('ai:scoreTranscript', apiKey, transcript, duration, targetDuration),
  onScoringProgress: (callback: (data: { stage: string; message: string }) => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      data: { stage: string; message: string }
    ) => callback(data)
    ipcRenderer.on('ai:scoringProgress', handler)
    return () => ipcRenderer.removeListener('ai:scoringProgress', handler)
  },
  generateHookText: (apiKey: string, transcript: string) =>
    ipcRenderer.invoke('ai:generateHookText', apiKey, transcript),
  rescoreSingleClip: (apiKey: string, clipText: string, clipDuration: number) =>
    ipcRenderer.invoke('ai:rescoreSingleClip', apiKey, clipText, clipDuration),
  generateRehookText: (apiKey: string, transcript: string, clipStart: number, clipEnd: number) =>
    ipcRenderer.invoke('ai:generateRehookText', apiKey, transcript, clipStart, clipEnd),
  validateGeminiKey: (apiKey: string) =>
    ipcRenderer.invoke('ai:validateGeminiKey', apiKey),
  validatePexelsKey: (apiKey: string) =>
    ipcRenderer.invoke('ai:validatePexelsKey', apiKey),

  // Face detection
  detectFaceCrops: (videoPath: string, segments: { start: number; end: number }[]) =>
    ipcRenderer.invoke('face:detectCrops', videoPath, segments),
  onFaceDetectionProgress: (callback: (data: { segment: number; total: number }) => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      data: { segment: number; total: number }
    ) => callback(data)
    ipcRenderer.on('face:progress', handler)
    return () => ipcRenderer.removeListener('face:progress', handler)
  },

  // Captions
  generateCaptions: (
    words: { text: string; start: number; end: number }[],
    style: {
      fontName: string
      fontSize: number
      primaryColor: string
      highlightColor: string
      outlineColor: string
      backColor: string
      outline: number
      shadow: number
      borderStyle: number
      wordsPerLine: number
      animation: string
    },
    outputPath?: string
  ) => ipcRenderer.invoke('captions:generate', words, style, outputPath),

  // Brand Kit — file picker + asset copy
  selectBrandLogo: () => ipcRenderer.invoke('brandkit:selectLogo'),
  selectIntroBumper: () => ipcRenderer.invoke('brandkit:selectIntroBumper'),
  selectOutroBumper: () => ipcRenderer.invoke('brandkit:selectOutroBumper'),
  // Brand Kit — copy from a given path (drag-and-drop)
  copyBrandLogo: (filePath: string) => ipcRenderer.invoke('brandkit:copyLogo', filePath),
  copyBrandBumper: (filePath: string) => ipcRenderer.invoke('brandkit:copyBumper', filePath),

  // Render pipeline
  startBatchRender: (options: {
    jobs: {
      clipId: string
      sourceVideoPath: string
      startTime: number
      endTime: number
      cropRegion?: { x: number; y: number; width: number; height: number }
      assFilePath?: string
      outputFileName?: string
      wordTimestamps?: { text: string; start: number; end: number }[]
      hookTitleText?: string
      /** Pre-generated re-hook text (optional; main process picks a default if omitted). */
      rehookText?: string
    }[]
    outputDirectory: string
    soundDesign?: {
      enabled: boolean
      backgroundMusicTrack: string
      sfxVolume: number
      musicVolume: number
    }
    autoZoom?: {
      enabled: boolean
      intensity: 'subtle' | 'medium' | 'dynamic'
      intervalSeconds: number
    }
    brandKit?: {
      enabled: boolean
      logoPath: string | null
      logoPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
      logoScale: number
      logoOpacity: number
      introBumperPath: string | null
      outroBumperPath: string | null
    }
    hookTitleOverlay?: {
      enabled: boolean
      style: 'centered-bold' | 'top-bar' | 'slide-in'
      displayDuration: number
      fadeIn: number
      fadeOut: number
      fontSize: number
      textColor: string
      outlineColor: string
      outlineWidth: number
    }
    rehookOverlay?: {
      enabled: boolean
      style: 'bar' | 'text-only' | 'slide-up'
      displayDuration: number
      fadeIn: number
      fadeOut: number
      fontSize: number
      textColor: string
      outlineColor: string
      outlineWidth: number
      positionFraction: number
    }
    templateLayout?: {
      titleText: { x: number; y: number }
      subtitles: { x: number; y: number }
      rehookText: { x: number; y: number }
    }
  }) => ipcRenderer.invoke('render:startBatch', options),

  cancelRender: () => ipcRenderer.invoke('render:cancel'),

  onRenderClipStart: (
    callback: (data: { clipId: string; index: number; total: number; encoder: string; encoderIsHardware: boolean }) => void
  ) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      data: { clipId: string; index: number; total: number; encoder: string; encoderIsHardware: boolean }
    ) => callback(data)
    ipcRenderer.on('render:clipStart', handler)
    return () => ipcRenderer.removeListener('render:clipStart', handler)
  },

  onRenderClipProgress: (callback: (data: { clipId: string; percent: number }) => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      data: { clipId: string; percent: number }
    ) => callback(data)
    ipcRenderer.on('render:clipProgress', handler)
    return () => ipcRenderer.removeListener('render:clipProgress', handler)
  },

  onRenderClipDone: (
    callback: (data: { clipId: string; outputPath: string }) => void
  ) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      data: { clipId: string; outputPath: string }
    ) => callback(data)
    ipcRenderer.on('render:clipDone', handler)
    return () => ipcRenderer.removeListener('render:clipDone', handler)
  },

  onRenderClipError: (callback: (data: { clipId: string; error: string }) => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      data: { clipId: string; error: string }
    ) => callback(data)
    ipcRenderer.on('render:clipError', handler)
    return () => ipcRenderer.removeListener('render:clipError', handler)
  },

  onRenderBatchDone: (
    callback: (data: { completed: number; failed: number; total: number }) => void
  ) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      data: { completed: number; failed: number; total: number }
    ) => callback(data)
    ipcRenderer.on('render:batchDone', handler)
    return () => ipcRenderer.removeListener('render:batchDone', handler)
  },

  onRenderCancelled: (
    callback: (data: { completed: number; failed: number; total: number }) => void
  ) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      data: { completed: number; failed: number; total: number }
    ) => callback(data)
    ipcRenderer.on('render:cancelled', handler)
    return () => ipcRenderer.removeListener('render:cancelled', handler)
  },

  // Safe Zones
  getSafeZonePlacement: (
    platform: 'tiktok' | 'reels' | 'shorts' | 'universal',
    element: 'caption' | 'hook_text' | 'upper_third' | 'middle' | 'lower_third' | 'progress_bar' | 'logo' | 'comment_overlay' | 'full_frame'
  ) => ipcRenderer.invoke('safezones:getPlacement', platform, element),

  getSafeZoneRect: (
    platform: 'tiktok' | 'reels' | 'shorts' | 'universal'
  ) => ipcRenderer.invoke('safezones:getSafeZone', platform),

  getSafeZoneDeadZones: (
    platform: 'tiktok' | 'reels' | 'shorts' | 'universal'
  ) => ipcRenderer.invoke('safezones:getDeadZones', platform),

  clampToSafeZone: (
    rect: { x: number; y: number; width: number; height: number },
    platform: 'tiktok' | 'reels' | 'shorts' | 'universal'
  ) => ipcRenderer.invoke('safezones:clamp', rect, platform),

  isInsideSafeZone: (
    rect: { x: number; y: number; width: number; height: number },
    platform: 'tiktok' | 'reels' | 'shorts' | 'universal'
  ) => ipcRenderer.invoke('safezones:isInside', rect, platform),

  safeZoneToAssMargins: (
    rect: { x: number; y: number; width: number; height: number }
  ) => ipcRenderer.invoke('safezones:toAssMargins', rect),

  getAllPlatformSafeZones: () => ipcRenderer.invoke('safezones:getAllPlatforms'),

  // Layouts — blur background fill
  buildBlurBackgroundFilter: (
    inputWidth: number,
    inputHeight: number,
    outputWidth: number,
    outputHeight: number,
    config: {
      blurIntensity: 'light' | 'medium' | 'heavy'
      darken: number
      vignette: boolean
      borderShadow: boolean
    }
  ) =>
    ipcRenderer.invoke(
      'layout:buildBlurBackground',
      inputWidth,
      inputHeight,
      outputWidth,
      outputHeight,
      config
    ),

  // Script cue segment splitting
  splitSegments: (
    inputPath: string,
    segments: { label: string; startTime: number; endTime: number }[],
    outputDir: string
  ) => ipcRenderer.invoke('ffmpeg:splitSegments', inputPath, segments, outputDir),

  // Project save / load / recent
  saveProject: (json: string) => ipcRenderer.invoke('project:save', json),
  loadProject: () => ipcRenderer.invoke('project:load'),
  loadProjectFromPath: (filePath: string) => ipcRenderer.invoke('project:loadFromPath', filePath),
  getRecentProjects: () => ipcRenderer.invoke('project:getRecent'),
  addRecentProject: (entry: {
    path: string
    name: string
    lastOpened: number
    clipCount: number
    sourceCount: number
  }) => ipcRenderer.invoke('project:addRecent', entry),
  removeRecentProject: (path: string) => ipcRenderer.invoke('project:removeRecent', path),
  clearRecentProjects: () => ipcRenderer.invoke('project:clearRecent'),

  // System
  getDiskSpace: (dirPath: string) => ipcRenderer.invoke('system:getDiskSpace', dirPath),
  getEncoder: () => ipcRenderer.invoke('system:getEncoder'),
  getAvailableFonts: () => ipcRenderer.invoke('system:getAvailableFonts'),
  sendNotification: (opts: { title: string; body: string; silent?: boolean }) =>
    ipcRenderer.invoke('system:notify', opts),
  getTempSize: () => ipcRenderer.invoke('system:getTempSize'),
  cleanupTemp: () => ipcRenderer.invoke('system:cleanupTemp'),
  getCacheSize: () => ipcRenderer.invoke('system:getCacheSize'),
  setAutoCleanup: (enabled: boolean) => ipcRenderer.invoke('system:setAutoCleanup', enabled),

  // Shell
  openPath: (path: string) => ipcRenderer.invoke('shell:openPath', path),
  showItemInFolder: (path: string) => ipcRenderer.invoke('shell:showItemInFolder', path),

  // Curiosity Gap Detector
  detectCuriosityGaps: (
    apiKey: string,
    transcript: unknown,
    formattedTranscript: string,
    videoDuration: number
  ) => ipcRenderer.invoke('ai:detectCuriosityGaps', apiKey, transcript, formattedTranscript, videoDuration),

  optimizeClipBoundaries: (
    gap: unknown,
    originalStart: number,
    originalEnd: number,
    transcript: unknown
  ) => ipcRenderer.invoke('ai:optimizeClipBoundaries', gap, originalStart, originalEnd, transcript),

  rankClipsByCuriosity: (
    clips: unknown[],
    gaps: unknown[]
  ) => ipcRenderer.invoke('ai:rankClipsByCuriosity', clips, gaps),

  // Loop Optimizer
  analyzeLoopPotential: (
    apiKey: string,
    transcript: unknown,
    clipStart: number,
    clipEnd: number
  ) => ipcRenderer.invoke('loop:analyzeLoopPotential', apiKey, transcript, clipStart, clipEnd),

  optimizeForLoop: (
    clipStart: number,
    clipEnd: number,
    transcript: unknown,
    analysis: unknown
  ) => ipcRenderer.invoke('loop:optimizeForLoop', clipStart, clipEnd, transcript, analysis),

  buildLoopCrossfadeFilter: (clipDuration: number, crossfadeDuration: number) =>
    ipcRenderer.invoke('loop:buildCrossfadeFilter', clipDuration, crossfadeDuration),

  scoreLoopQuality: (analysis: unknown) =>
    ipcRenderer.invoke('loop:scoreLoopQuality', analysis),

  // Clip Variant Generator
  generateClipVariants: (
    apiKey: string,
    clip: {
      startTime: number
      endTime: number
      score: number
      text?: string
      hookText?: string
      reasoning?: string
      curiosityScore?: number
      combinedScore?: number
    },
    transcript: unknown,
    capabilities: { hookTitle: boolean; rehook: boolean; progressBar: boolean }
  ) => ipcRenderer.invoke('variants:generate', apiKey, clip, transcript, capabilities),

  buildVariantRenderConfigs: (
    variants: unknown[],
    baseClip: {
      startTime: number
      endTime: number
      score: number
      text?: string
      hookText?: string
      reasoning?: string
    },
    baseName: string
  ) => ipcRenderer.invoke('variants:buildRenderConfigs', variants, baseClip, baseName),

  generateVariantLabels: (variants: unknown[]) =>
    ipcRenderer.invoke('variants:generateLabels', variants),

  // Split-screen layout filter builder
  buildSplitScreenFilter: (
    layout: { type: 'top-bottom' | 'pip-corner' | 'side-by-side' | 'reaction' },
    mainSource: { path: string; sourceWidth: number; sourceHeight: number; crop?: { x: number; y: number; width: number; height: number } },
    secondarySource: { path: string; sourceWidth: number; sourceHeight: number; crop?: { x: number; y: number; width: number; height: number } } | null,
    config: { ratio: number; divider?: { color: string; thickness: number }; pipPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'; pipSize?: number; pipCornerRadius?: number }
  ) => ipcRenderer.invoke('layout:buildSplitScreen', layout, mainSource, secondarySource, config),

  // Story Arc
  detectStoryArcs: (
    apiKey: string,
    transcript: unknown,
    clips: unknown[]
  ) => ipcRenderer.invoke('storyarc:detectStoryArcs', apiKey, transcript, clips),

  generateSeriesMetadata: (arc: unknown) =>
    ipcRenderer.invoke('storyarc:generateSeriesMetadata', arc),

  buildPartNumberFilter: (
    partNumber: number,
    totalParts: number,
    seriesTitle: string,
    config: unknown
  ) => ipcRenderer.invoke('storyarc:buildPartNumberFilter', partNumber, totalParts, seriesTitle, config),

  buildEndCardFilter: (
    nextPartTeaser: string,
    clipDuration: number,
    config: unknown
  ) => ipcRenderer.invoke('storyarc:buildEndCardFilter', nextPartTeaser, clipDuration, config),

  // Description Generator
  generateClipDescription: (
    apiKey: string,
    transcript: string,
    clipContext?: string,
    hookTitle?: string
  ) => ipcRenderer.invoke('ai:generateClipDescription', apiKey, transcript, clipContext, hookTitle),

  generateBatchDescriptions: (
    apiKey: string,
    clips: {
      transcript: string
      hookText?: string
      reasoning?: string
    }[]
  ) => ipcRenderer.invoke('ai:generateBatchDescriptions', apiKey, clips),

  // B-Roll — generate placement data from transcript + keywords for a clip
  generateBRollPlacements: (
    geminiApiKey: string,
    pexelsApiKey: string,
    transcriptText: string,
    wordTimestamps: { text: string; start: number; end: number }[],
    clipStart: number,
    clipEnd: number,
    settings: {
      intervalSeconds: number
      clipDuration: number
    }
  ) => ipcRenderer.invoke(
    'broll:generatePlacements',
    geminiApiKey,
    pexelsApiKey,
    transcriptText,
    wordTimestamps,
    clipStart,
    clipEnd,
    settings
  ),

  // Emoji Burst / Reaction Overlay
  identifyEmojiMoments: (
    apiKey: string,
    transcript: unknown,
    clipStart: number,
    clipEnd: number,
    config: unknown
  ) => ipcRenderer.invoke('overlay:identifyEmojiMoments', apiKey, transcript, clipStart, clipEnd, config),

  buildEmojiBurstFilters: (
    moments: unknown[],
    config: unknown
  ) => ipcRenderer.invoke('overlay:buildEmojiBurstFilters', moments, config),

  // Fake Comment Overlay
  generateFakeComment: (apiKey: string, transcript: string, clipContext?: string) =>
    ipcRenderer.invoke('overlay:generateFakeComment', apiKey, transcript, clipContext),

  buildFakeCommentFilter: (
    comment: {
      username: string
      text: string
      emoji?: string
      profileColor: string
      likeCount: string
    },
    config: {
      enabled: boolean
      style: 'tiktok' | 'youtube' | 'reels'
      position: 'lower-third' | 'middle-left'
      appearTime: number
      displayDuration: number
      fadeIn: number
      fadeOut: number
    }
  ) => ipcRenderer.invoke('overlay:buildFakeCommentFilter', comment, config),

  // Clip Stitcher
  generateStitchedClips: (
    apiKey: string,
    formattedTranscript: string,
    videoDuration: number,
    wordTimestamps: { text: string; start: number; end: number }[]
  ) => ipcRenderer.invoke('stitch:generateCompositeClips', apiKey, formattedTranscript, videoDuration, wordTimestamps),

  onStitchingProgress: (callback: (data: { stage: string; message: string }) => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      data: { stage: string; message: string }
    ) => callback(data)
    ipcRenderer.on('stitch:progress', handler)
    return () => ipcRenderer.removeListener('stitch:progress', handler)
  },

  // Export manifest
  generateManifest: (
    outputDirectory: string,
    jobs: unknown[],
    clipMeta: unknown[],
    sourceMeta: { name: string; path: string; duration: number }
  ) => ipcRenderer.invoke('export:generateManifest', outputDirectory, jobs, clipMeta, sourceMeta),

  // Export descriptions
  exportDescriptions: (
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
  ) => ipcRenderer.invoke('export:descriptions', clips, outputDirectory, format),

  // Python setup
  getPythonStatus: () => ipcRenderer.invoke('python:getStatus'),
  startPythonSetup: () => ipcRenderer.invoke('python:startSetup'),
  onPythonSetupProgress: (callback: (data: { stage: string; message: string; percent: number }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { stage: string; message: string; percent: number }) => callback(data)
    ipcRenderer.on('python:setupProgress', handler)
    return () => ipcRenderer.removeListener('python:setupProgress', handler)
  },
  onPythonSetupDone: (callback: (data: { success: boolean; error?: string }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { success: boolean; error?: string }) => callback(data)
    ipcRenderer.on('python:setupDone', handler)
    return () => ipcRenderer.removeListener('python:setupDone', handler)
  },

  // System — session log
  getLogPath: () => ipcRenderer.invoke('system:getLogPath'),
  getLogSize: () => ipcRenderer.invoke('system:getLogSize'),
  exportLogs: (rendererErrors: Array<{ timestamp: number; source: string; message: string; details?: string }>) =>
    ipcRenderer.invoke('system:exportLogs', rendererErrors),
  openLogFolder: () => ipcRenderer.invoke('system:openLogFolder'),

  // System — resource usage (CPU/RAM/GPU)
  getResourceUsage: () => ipcRenderer.invoke('system:getResourceUsage'),

  // AI Token Usage — emitted after every successful Gemini API call
  onAiTokenUsage: (callback: (data: {
    source: string
    promptTokens: number
    completionTokens: number
    totalTokens: number
    model: string
    timestamp: number
  }) => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      data: {
        source: string
        promptTokens: number
        completionTokens: number
        totalTokens: number
        model: string
        timestamp: number
      }
    ) => callback(data)
    ipcRenderer.on('ai:tokenUsage', handler)
    return () => ipcRenderer.removeListener('ai:tokenUsage', handler)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.electron = electronAPI
  // @ts-ignore
  window.api = api
}
