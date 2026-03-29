// ---------------------------------------------------------------------------
// IPC Channel Registry
//
// Single source of truth for every IPC channel name used across the Electron
// main process, preload bridge, and renderer.  Import `Ch` (or individual
// sub-objects) instead of writing string literals.
//
// The companion type maps (`IpcInvokeChannels` / `IpcSendChannels`) let you
// derive argument and return types from a channel name at compile time via
// the `IpcInvokeArgs`, `IpcInvokeReturn`, and `IpcSendArgs` helper types.
// ---------------------------------------------------------------------------

// ---- Invoke channels (renderer → main, request/response) -----------------

export const InvokeChannels = {
  // Dialog
  DIALOG_OPEN_FILES: 'dialog:openFiles',
  DIALOG_OPEN_DIRECTORY: 'dialog:openDirectory',

  // FFmpeg
  FFMPEG_GET_METADATA: 'ffmpeg:getMetadata',
  FFMPEG_EXTRACT_AUDIO: 'ffmpeg:extractAudio',
  FFMPEG_THUMBNAIL: 'ffmpeg:thumbnail',
  FFMPEG_GET_WAVEFORM: 'ffmpeg:getWaveform',
  FFMPEG_SPLIT_SEGMENTS: 'ffmpeg:splitSegments',

  // YouTube
  YOUTUBE_DOWNLOAD: 'youtube:download',

  // Transcription
  TRANSCRIBE_VIDEO: 'transcribe:video',
  TRANSCRIBE_FORMAT_FOR_AI: 'transcribe:formatForAI',

  // AI scoring & generation
  AI_SCORE_TRANSCRIPT: 'ai:scoreTranscript',
  AI_GENERATE_HOOK_TEXT: 'ai:generateHookText',
  AI_GENERATE_REHOOK_TEXT: 'ai:generateRehookText',
  AI_RESCORE_SINGLE_CLIP: 'ai:rescoreSingleClip',
  AI_VALIDATE_GEMINI_KEY: 'ai:validateGeminiKey',
  AI_VALIDATE_PEXELS_KEY: 'ai:validatePexelsKey',
  AI_DETECT_CURIOSITY_GAPS: 'ai:detectCuriosityGaps',
  AI_OPTIMIZE_CLIP_BOUNDARIES: 'ai:optimizeClipBoundaries',
  AI_OPTIMIZE_CLIP_ENDPOINTS: 'ai:optimizeClipEndpoints',
  AI_RANK_CLIPS_BY_CURIOSITY: 'ai:rankClipsByCuriosity',
  AI_GENERATE_CLIP_DESCRIPTION: 'ai:generateClipDescription',
  AI_GENERATE_BATCH_DESCRIPTIONS: 'ai:generateBatchDescriptions',
  AI_ANALYZE_WORD_EMPHASIS: 'ai:analyzeWordEmphasis',
  AI_GENERATE_EDIT_PLAN: 'ai:generateEditPlan',
  AI_GENERATE_BATCH_EDIT_PLANS: 'ai:generateBatchEditPlans',
  AI_EDIT_PLAN_CACHE_CLEAR: 'ai:editPlanCacheClear',
  AI_EDIT_PLAN_CACHE_SIZE: 'ai:editPlanCacheSize',

  // Face detection
  FACE_DETECT_CROPS: 'face:detectCrops',

  // Render pipeline
  RENDER_START_BATCH: 'render:startBatch',
  RENDER_CANCEL: 'render:cancel',
  RENDER_PREVIEW: 'render:preview',
  RENDER_CLEANUP_PREVIEW: 'render:cleanupPreview',

  // Captions
  CAPTIONS_GENERATE: 'captions:generate',

  // Brand Kit
  BRANDKIT_SELECT_LOGO: 'brandkit:selectLogo',
  BRANDKIT_SELECT_INTRO_BUMPER: 'brandkit:selectIntroBumper',
  BRANDKIT_SELECT_OUTRO_BUMPER: 'brandkit:selectOutroBumper',
  BRANDKIT_COPY_LOGO: 'brandkit:copyLogo',
  BRANDKIT_COPY_BUMPER: 'brandkit:copyBumper',

  // Safe Zones
  SAFEZONES_GET_PLACEMENT: 'safezones:getPlacement',
  SAFEZONES_GET_SAFE_ZONE: 'safezones:getSafeZone',
  SAFEZONES_GET_DEAD_ZONES: 'safezones:getDeadZones',
  SAFEZONES_CLAMP: 'safezones:clamp',
  SAFEZONES_IS_INSIDE: 'safezones:isInside',
  SAFEZONES_TO_ASS_MARGINS: 'safezones:toAssMargins',
  SAFEZONES_GET_ALL_PLATFORMS: 'safezones:getAllPlatforms',

  // Layouts
  LAYOUT_BUILD_BLUR_BACKGROUND: 'layout:buildBlurBackground',
  LAYOUT_BUILD_SPLIT_SCREEN: 'layout:buildSplitScreen',

  // Loop Optimizer
  LOOP_ANALYZE_LOOP_POTENTIAL: 'loop:analyzeLoopPotential',
  LOOP_OPTIMIZE_FOR_LOOP: 'loop:optimizeForLoop',
  LOOP_BUILD_CROSSFADE_FILTER: 'loop:buildCrossfadeFilter',
  LOOP_SCORE_LOOP_QUALITY: 'loop:scoreLoopQuality',

  // Clip Variants
  VARIANTS_GENERATE: 'variants:generate',
  VARIANTS_BUILD_RENDER_CONFIGS: 'variants:buildRenderConfigs',
  VARIANTS_GENERATE_LABELS: 'variants:generateLabels',

  // Story Arc
  STORYARC_DETECT: 'storyarc:detectStoryArcs',
  STORYARC_GENERATE_SERIES_METADATA: 'storyarc:generateSeriesMetadata',
  STORYARC_BUILD_PART_NUMBER_FILTER: 'storyarc:buildPartNumberFilter',
  STORYARC_BUILD_END_CARD_FILTER: 'storyarc:buildEndCardFilter',

  // Clip Stitcher
  STITCH_GENERATE_COMPOSITE_CLIPS: 'stitch:generateCompositeClips',

  // Overlays
  OVERLAY_IDENTIFY_EMOJI_MOMENTS: 'overlay:identifyEmojiMoments',
  OVERLAY_BUILD_EMOJI_BURST_FILTERS: 'overlay:buildEmojiBurstFilters',
  OVERLAY_GENERATE_FAKE_COMMENT: 'overlay:generateFakeComment',
  OVERLAY_BUILD_FAKE_COMMENT_FILTER: 'overlay:buildFakeCommentFilter',

  // B-Roll
  BROLL_GENERATE_PLACEMENTS: 'broll:generatePlacements',

  // Export
  EXPORT_DESCRIPTIONS: 'export:descriptions',
  EXPORT_GENERATE_MANIFEST: 'export:generateManifest',

  // Project
  PROJECT_SAVE: 'project:save',
  PROJECT_LOAD: 'project:load',
  PROJECT_LOAD_FROM_PATH: 'project:loadFromPath',
  PROJECT_AUTO_SAVE: 'project:autoSave',
  PROJECT_LOAD_RECOVERY: 'project:loadRecovery',
  PROJECT_CLEAR_RECOVERY: 'project:clearRecovery',
  PROJECT_GET_RECENT: 'project:getRecent',
  PROJECT_ADD_RECENT: 'project:addRecent',
  PROJECT_REMOVE_RECENT: 'project:removeRecent',
  PROJECT_CLEAR_RECENT: 'project:clearRecent',

  // Python setup
  PYTHON_GET_STATUS: 'python:getStatus',
  PYTHON_START_SETUP: 'python:startSetup',

  // System
  SYSTEM_GET_DISK_SPACE: 'system:getDiskSpace',
  SYSTEM_NOTIFY: 'system:notify',
  SYSTEM_GET_ENCODER: 'system:getEncoder',
  SYSTEM_GET_AVAILABLE_FONTS: 'system:getAvailableFonts',
  SYSTEM_GET_TEMP_SIZE: 'system:getTempSize',
  SYSTEM_CLEANUP_TEMP: 'system:cleanupTemp',
  SYSTEM_GET_CACHE_SIZE: 'system:getCacheSize',
  SYSTEM_SET_AUTO_CLEANUP: 'system:setAutoCleanup',
  SYSTEM_GET_LOG_PATH: 'system:getLogPath',
  SYSTEM_GET_LOG_SIZE: 'system:getLogSize',
  SYSTEM_EXPORT_LOGS: 'system:exportLogs',
  SYSTEM_OPEN_LOG_FOLDER: 'system:openLogFolder',
  SYSTEM_GET_RESOURCE_USAGE: 'system:getResourceUsage',

  // Shell
  SHELL_OPEN_PATH: 'shell:openPath',
  SHELL_SHOW_ITEM_IN_FOLDER: 'shell:showItemInFolder',
} as const

// ---- Send channels (main → renderer, fire-and-forget) ---------------------

export const SendChannels = {
  YOUTUBE_PROGRESS: 'youtube:progress',
  TRANSCRIBE_PROGRESS: 'transcribe:progress',
  AI_SCORING_PROGRESS: 'ai:scoringProgress',
  FACE_PROGRESS: 'face:progress',
  RENDER_CLIP_START: 'render:clipStart',
  RENDER_CLIP_PROGRESS: 'render:clipProgress',
  RENDER_CLIP_DONE: 'render:clipDone',
  RENDER_CLIP_ERROR: 'render:clipError',
  RENDER_BATCH_DONE: 'render:batchDone',
  RENDER_CANCELLED: 'render:cancelled',
  STITCH_PROGRESS: 'stitch:progress',
  PYTHON_SETUP_PROGRESS: 'python:setupProgress',
  PYTHON_SETUP_DONE: 'python:setupDone',
  AI_TOKEN_USAGE: 'ai:tokenUsage',
  AI_EDIT_PROGRESS: 'ai:editProgress',
} as const

// ---- Combined shorthand -------------------------------------------------

/** All channel name constants. Use `Ch.Invoke.FOO` or `Ch.Send.BAR`. */
export const Ch = {
  Invoke: InvokeChannels,
  Send: SendChannels,
} as const

// ---- Derived literal-union types -----------------------------------------

/** Union of all invoke channel name strings. */
export type InvokeChannel = (typeof InvokeChannels)[keyof typeof InvokeChannels]

/** Union of all send channel name strings. */
export type SendChannel = (typeof SendChannels)[keyof typeof SendChannels]

/** Union of every IPC channel name. */
export type AnyChannel = InvokeChannel | SendChannel

// ---- Type maps -----------------------------------------------------------
//
// Map each channel name string to its argument tuple and return type.
// These are intentionally thin — they reference the canonical domain types
// from `@shared/types` and `src/preload/index.d.ts` rather than re-declaring
// them.  Use the helper types below to extract args/return from a channel.
// ---------------------------------------------------------------------------

import type {
  WordTimestamp,
  TranscriptionResult,
  ScoringResult,
  ScoringProgress,
  CuriosityGap,
  ClipBoundary,
  CuriosityClipCandidate,
  ClipEndMode,
  CropRegion,
  FaceDetectionProgress,
  Platform,
} from './types'

// We only type the send channels (smaller set, high-value for safety).
// Invoke channels are already fully typed via the Api interface in index.d.ts.

export interface IpcSendChannelMap {
  [SendChannels.YOUTUBE_PROGRESS]: { percent: number }
  [SendChannels.TRANSCRIBE_PROGRESS]: { stage: string; message: string }
  [SendChannels.AI_SCORING_PROGRESS]: ScoringProgress
  [SendChannels.FACE_PROGRESS]: FaceDetectionProgress
  [SendChannels.RENDER_CLIP_START]: {
    clipId: string
    index: number
    total: number
    encoder: string
    encoderIsHardware: boolean
  }
  [SendChannels.RENDER_CLIP_PROGRESS]: { clipId: string; percent: number }
  [SendChannels.RENDER_CLIP_DONE]: { clipId: string; outputPath: string }
  [SendChannels.RENDER_CLIP_ERROR]: {
    clipId: string
    error: string
    ffmpegCommand?: string
  }
  [SendChannels.RENDER_BATCH_DONE]: {
    completed: number
    failed: number
    total: number
  }
  [SendChannels.RENDER_CANCELLED]: {
    completed: number
    failed: number
    total: number
  }
  [SendChannels.STITCH_PROGRESS]: { stage: string; message: string }
  [SendChannels.PYTHON_SETUP_PROGRESS]: {
    stage: string
    message: string
    percent: number
    package?: string
    currentPackage?: number
    totalPackages?: number
  }
  [SendChannels.PYTHON_SETUP_DONE]: { success: boolean; error?: string }
  [SendChannels.AI_TOKEN_USAGE]: {
    source: string
    promptTokens: number
    completionTokens: number
    totalTokens: number
    model: string
    timestamp: number
  }
  [SendChannels.AI_EDIT_PROGRESS]: {
    clipIndex: number
    totalClips: number
    clipId: string
    stage: 'generating' | 'done' | 'error'
    message: string
  }
}

// ---- Helper types --------------------------------------------------------

/** Extract the data payload type for a main→renderer send channel. */
export type IpcSendData<C extends SendChannel> = C extends keyof IpcSendChannelMap
  ? IpcSendChannelMap[C]
  : never
