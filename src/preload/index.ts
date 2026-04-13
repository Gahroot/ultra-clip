import { contextBridge, ipcRenderer, IpcRendererEvent, webUtils } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { Ch, IpcSendChannelMap, SendChannel } from '@shared/ipc-channels'

// ---------------------------------------------------------------------------
// Factory helpers — eliminate boilerplate for IPC wrappers
// ---------------------------------------------------------------------------

/** Create an invoke wrapper that forwards all arguments to ipcRenderer.invoke. */
function invoke<T = unknown>(channel: string) {
  return (...args: unknown[]): Promise<T> => ipcRenderer.invoke(channel, ...args)
}

/** Create a listener wrapper that subscribes to a send channel and returns an unsubscribe function. */
function listen<C extends SendChannel>(channel: C) {
  return (callback: (data: IpcSendChannelMap[C]) => void): (() => void) => {
    const handler = (_: IpcRendererEvent, data: IpcSendChannelMap[C]) => callback(data)
    ipcRenderer.on(channel, handler)
    return () => ipcRenderer.removeListener(channel, handler)
  }
}

// ---------------------------------------------------------------------------
// Shorthand aliases
// ---------------------------------------------------------------------------

const I = Ch.Invoke
const S = Ch.Send

// ---------------------------------------------------------------------------
// API object — shape must match the Api interface in index.d.ts
// ---------------------------------------------------------------------------

const api = {
  // File dialogs
  openFiles: invoke(I.DIALOG_OPEN_FILES),
  openDirectory: invoke(I.DIALOG_OPEN_DIRECTORY),
  getPathForFile: (file: File) => webUtils.getPathForFile(file),

  // FFmpeg
  getMetadata: invoke(I.FFMPEG_GET_METADATA),
  extractAudio: invoke(I.FFMPEG_EXTRACT_AUDIO),
  getThumbnail: invoke(I.FFMPEG_THUMBNAIL),
  getWaveform: (videoPath: string, startTime: number, endTime: number, numPoints?: number) =>
    ipcRenderer.invoke(I.FFMPEG_GET_WAVEFORM, videoPath, startTime, endTime, numPoints ?? 500),
  splitSegments: invoke(I.FFMPEG_SPLIT_SEGMENTS),

  // YouTube
  downloadYouTube: invoke(I.YOUTUBE_DOWNLOAD),
  onYouTubeProgress: listen(S.YOUTUBE_PROGRESS),

  // Transcription
  transcribeVideo: invoke(I.TRANSCRIBE_VIDEO),
  formatTranscriptForAI: invoke(I.TRANSCRIBE_FORMAT_FOR_AI),
  onTranscribeProgress: listen(S.TRANSCRIBE_PROGRESS),

  // AI scoring & generation
  scoreTranscript: invoke(I.AI_SCORE_TRANSCRIPT),
  onScoringProgress: listen(S.AI_SCORING_PROGRESS),
  generateHookText: invoke(I.AI_GENERATE_HOOK_TEXT),
  rescoreSingleClip: invoke(I.AI_RESCORE_SINGLE_CLIP),
  generateRehookText: invoke(I.AI_GENERATE_REHOOK_TEXT),
  validateGeminiKey: invoke(I.AI_VALIDATE_GEMINI_KEY),
  validatePexelsKey: invoke(I.AI_VALIDATE_PEXELS_KEY),

  // Face detection
  detectFaceCrops: invoke(I.FACE_DETECT_CROPS),
  onFaceDetectionProgress: listen(S.FACE_PROGRESS),

  // Captions
  generateCaptions: invoke(I.CAPTIONS_GENERATE),

  // Brand Kit
  selectBrandLogo: invoke(I.BRANDKIT_SELECT_LOGO),
  selectIntroBumper: invoke(I.BRANDKIT_SELECT_INTRO_BUMPER),
  selectOutroBumper: invoke(I.BRANDKIT_SELECT_OUTRO_BUMPER),
  copyBrandLogo: invoke(I.BRANDKIT_COPY_LOGO),
  copyBrandBumper: invoke(I.BRANDKIT_COPY_BUMPER),

  // Render pipeline
  startBatchRender: invoke(I.RENDER_START_BATCH),
  cancelRender: invoke(I.RENDER_CANCEL),
  onRenderClipStart: listen(S.RENDER_CLIP_START),
  onRenderClipPrepare: listen(S.RENDER_CLIP_PREPARE),
  onRenderClipProgress: listen(S.RENDER_CLIP_PROGRESS),
  onRenderClipDone: listen(S.RENDER_CLIP_DONE),
  onRenderClipError: listen(S.RENDER_CLIP_ERROR),
  onRenderBatchDone: listen(S.RENDER_BATCH_DONE),
  onRenderCancelled: listen(S.RENDER_CANCELLED),
  renderPreview: invoke(I.RENDER_PREVIEW),
  cleanupPreview: invoke(I.RENDER_CLEANUP_PREVIEW),

  // Safe Zones
  getSafeZonePlacement: invoke(I.SAFEZONES_GET_PLACEMENT),
  getSafeZoneRect: invoke(I.SAFEZONES_GET_SAFE_ZONE),
  getSafeZoneDeadZones: invoke(I.SAFEZONES_GET_DEAD_ZONES),
  clampToSafeZone: invoke(I.SAFEZONES_CLAMP),
  isInsideSafeZone: invoke(I.SAFEZONES_IS_INSIDE),
  safeZoneToAssMargins: invoke(I.SAFEZONES_TO_ASS_MARGINS),
  getAllPlatformSafeZones: invoke(I.SAFEZONES_GET_ALL_PLATFORMS),

  // Layouts
  buildBlurBackgroundFilter: invoke(I.LAYOUT_BUILD_BLUR_BACKGROUND),
  buildSplitScreenFilter: invoke(I.LAYOUT_BUILD_SPLIT_SCREEN),

  // Curiosity Gap Detector
  detectCuriosityGaps: invoke(I.AI_DETECT_CURIOSITY_GAPS),
  optimizeClipBoundaries: invoke(I.AI_OPTIMIZE_CLIP_BOUNDARIES),
  optimizeClipEndpoints: invoke(I.AI_OPTIMIZE_CLIP_ENDPOINTS),
  rankClipsByCuriosity: invoke(I.AI_RANK_CLIPS_BY_CURIOSITY),

  // Loop Optimizer
  analyzeLoopPotential: invoke(I.LOOP_ANALYZE_LOOP_POTENTIAL),
  optimizeForLoop: invoke(I.LOOP_OPTIMIZE_FOR_LOOP),
  buildLoopCrossfadeFilter: invoke(I.LOOP_BUILD_CROSSFADE_FILTER),
  scoreLoopQuality: invoke(I.LOOP_SCORE_LOOP_QUALITY),

  // Clip Variant Generator
  generateClipVariants: invoke(I.VARIANTS_GENERATE),
  buildVariantRenderConfigs: invoke(I.VARIANTS_BUILD_RENDER_CONFIGS),
  generateVariantLabels: invoke(I.VARIANTS_GENERATE_LABELS),

  // Story Arc
  detectStoryArcs: invoke(I.STORYARC_DETECT),
  generateSeriesMetadata: invoke(I.STORYARC_GENERATE_SERIES_METADATA),
  buildPartNumberFilter: invoke(I.STORYARC_BUILD_PART_NUMBER_FILTER),
  buildEndCardFilter: invoke(I.STORYARC_BUILD_END_CARD_FILTER),

  // Description Generator
  generateClipDescription: invoke(I.AI_GENERATE_CLIP_DESCRIPTION),
  generateBatchDescriptions: invoke(I.AI_GENERATE_BATCH_DESCRIPTIONS),

  // Word Emphasis
  analyzeWordEmphasis: invoke(I.AI_ANALYZE_WORD_EMPHASIS),
  generateEditPlan: invoke(I.AI_GENERATE_EDIT_PLAN),
  generateBatchEditPlans: invoke(I.AI_GENERATE_BATCH_EDIT_PLANS),
  onAiEditProgress: listen(S.AI_EDIT_PROGRESS),
  clearEditPlanCache: invoke(I.AI_EDIT_PLAN_CACHE_CLEAR),
  getEditPlanCacheSize: invoke(I.AI_EDIT_PLAN_CACHE_SIZE),

  // B-Roll
  generateBRollPlacements: invoke(I.BROLL_GENERATE_PLACEMENTS),
  generateBRollImage: invoke(I.BROLL_GENERATE_IMAGE),
  regenerateBRollImage: invoke(I.BROLL_REGENERATE_IMAGE),

  // fal.ai Image Generation
  generateFalImage: invoke(I.FAL_GENERATE_IMAGE),
  generateSegmentImage: invoke(I.FAL_GENERATE_SEGMENT_IMAGE),

  // Segment Editor
  splitSegmentsForEditor: invoke(I.SEGMENTS_SPLIT),
  assignSegmentStyles: invoke(I.SEGMENTS_ASSIGN_STYLES),
  generateSegmentImages: invoke(I.SEGMENTS_GENERATE_IMAGES),
  updateSegmentCaption: invoke(I.SEGMENTS_UPDATE_CAPTION),
  updateSegmentStyle: invoke(I.SEGMENTS_UPDATE_STYLE),
  getSegmentStyleVariants: invoke(I.SEGMENTS_GET_STYLE_VARIANTS),
  getVariantsForCategory: invoke(I.SEGMENTS_GET_VARIANTS_FOR_CATEGORY),

  // Edit Styles
  getEditStyles: invoke(I.EDIT_STYLES_GET_ALL),
  getEditStyleById: invoke(I.EDIT_STYLES_GET_BY_ID),

  // Shot Segmentation
  segmentClipIntoShots: invoke(I.SHOT_SEGMENT_CLIP),

  // Emoji Burst / Reaction Overlay
  identifyEmojiMoments: invoke(I.OVERLAY_IDENTIFY_EMOJI_MOMENTS),
  buildEmojiBurstFilters: invoke(I.OVERLAY_BUILD_EMOJI_BURST_FILTERS),

  // Fake Comment Overlay
  generateFakeComment: invoke(I.OVERLAY_GENERATE_FAKE_COMMENT),
  buildFakeCommentFilter: invoke(I.OVERLAY_BUILD_FAKE_COMMENT_FILTER),

  // Clip Stitcher
  generateStitchedClips: invoke(I.STITCH_GENERATE_COMPOSITE_CLIPS),
  onStitchingProgress: listen(S.STITCH_PROGRESS),

  // Export
  generateManifest: invoke(I.EXPORT_GENERATE_MANIFEST),
  exportDescriptions: invoke(I.EXPORT_DESCRIPTIONS),

  // Project save / load / recent
  saveProject: invoke(I.PROJECT_SAVE),
  loadProject: invoke(I.PROJECT_LOAD),
  loadProjectFromPath: invoke(I.PROJECT_LOAD_FROM_PATH),
  autoSaveProject: invoke(I.PROJECT_AUTO_SAVE),
  loadRecovery: invoke(I.PROJECT_LOAD_RECOVERY),
  clearRecovery: invoke(I.PROJECT_CLEAR_RECOVERY),
  getRecentProjects: invoke(I.PROJECT_GET_RECENT),
  addRecentProject: invoke(I.PROJECT_ADD_RECENT),
  removeRecentProject: invoke(I.PROJECT_REMOVE_RECENT),
  clearRecentProjects: invoke(I.PROJECT_CLEAR_RECENT),

  // System
  getDiskSpace: invoke(I.SYSTEM_GET_DISK_SPACE),
  getEncoder: invoke(I.SYSTEM_GET_ENCODER),
  getAvailableFonts: invoke(I.SYSTEM_GET_AVAILABLE_FONTS),
  getFontData: invoke(I.SYSTEM_GET_FONT_DATA),
  sendNotification: invoke(I.SYSTEM_NOTIFY),
  getTempSize: invoke(I.SYSTEM_GET_TEMP_SIZE),
  cleanupTemp: invoke(I.SYSTEM_CLEANUP_TEMP),
  getCacheSize: invoke(I.SYSTEM_GET_CACHE_SIZE),
  setAutoCleanup: invoke(I.SYSTEM_SET_AUTO_CLEANUP),
  getLogPath: invoke(I.SYSTEM_GET_LOG_PATH),
  getLogSize: invoke(I.SYSTEM_GET_LOG_SIZE),
  exportLogs: invoke(I.SYSTEM_EXPORT_LOGS),
  openLogFolder: invoke(I.SYSTEM_OPEN_LOG_FOLDER),
  getResourceUsage: invoke(I.SYSTEM_GET_RESOURCE_USAGE),

  // Shell
  openPath: invoke(I.SHELL_OPEN_PATH),
  showItemInFolder: invoke(I.SHELL_SHOW_ITEM_IN_FOLDER),

  // Python setup
  getPythonStatus: invoke(I.PYTHON_GET_STATUS),
  startPythonSetup: invoke(I.PYTHON_START_SETUP),
  onPythonSetupProgress: listen(S.PYTHON_SETUP_PROGRESS),
  onPythonSetupDone: listen(S.PYTHON_SETUP_DONE),

  // AI Token Usage
  onAiTokenUsage: listen(S.AI_TOKEN_USAGE),

  // Filler Detection
  detectFillers: invoke(I.FILLER_DETECT),

  // Image Cache
  clearImageCache: invoke(I.IMAGE_CACHE_CLEAR),
  getImageCacheStats: invoke(I.IMAGE_CACHE_STATS),

  // Settings Window
  openSettingsWindow: invoke(I.SETTINGS_WINDOW_OPEN),
  closeSettingsWindow: invoke(I.SETTINGS_WINDOW_CLOSE),
  isSettingsWindowOpen: invoke<boolean>(I.SETTINGS_WINDOW_IS_OPEN),
  onSettingsWindowClosed: listen(S.SETTINGS_WINDOW_CLOSED),

  // Secrets — encrypted API key storage (safeStorage-backed)
  secrets: {
    get: (name: string): Promise<string | null> => ipcRenderer.invoke(I.SECRETS_GET, name),
    set: (name: string, value: string): Promise<void> => ipcRenderer.invoke(I.SECRETS_SET, name, value),
    has: (name: string): Promise<boolean> => ipcRenderer.invoke(I.SECRETS_HAS, name),
    clear: (name: string): Promise<void> => ipcRenderer.invoke(I.SECRETS_CLEAR, name),
  },
}

// ---------------------------------------------------------------------------
// Expose to renderer
// ---------------------------------------------------------------------------

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
