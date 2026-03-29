import type {
  WordTimestamp,
  SegmentTimestamp,
  TranscriptionResult,
  CropRegion,
  TargetDuration,
  ClipEndMode,
  CaptionAnimation,
  MusicTrack,
  Platform,
  OutputAspectRatio,
  ZoomIntensity,
  HookTitleStyle,
  RehookStyle,
  ProgressBarStyle,
  ProgressBarPosition,
  LogoPosition,
  ScoredSegment,
  ScoringResult,
  ScoringProgress,
  FaceDetectionProgress,
  CuriosityGap,
  ClipBoundary,
  CuriosityClipCandidate
} from '../../../shared/types'

// Re-export shared types so existing component imports from store don't break
export type {
  WordTimestamp,
  SegmentTimestamp,
  TranscriptionResult,
  CropRegion,
  TargetDuration,
  ClipEndMode,
  CaptionAnimation,
  MusicTrack,
  Platform,
  OutputAspectRatio,
  ZoomIntensity,
  HookTitleStyle,
  RehookStyle,
  ProgressBarStyle,
  ProgressBarPosition,
  LogoPosition,
  ScoredSegment,
  ScoringResult,
  ScoringProgress,
  FaceDetectionProgress,
  CuriosityGap,
  ClipBoundary,
  CuriosityClipCandidate
}

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface TemplateLayout {
  titleText: { x: number; y: number }
  subtitles: { x: number; y: number }
  rehookText: { x: number; y: number }
  media: { x: number; y: number }
}

export interface SourceVideo {
  id: string
  path: string
  name: string
  duration: number
  width: number
  height: number
  thumbnail?: string
  origin: 'file' | 'youtube'
  youtubeUrl?: string
}

/** Extends the shared TranscriptionResult with the pre-formatted AI transcript. */
export interface TranscriptionData extends TranscriptionResult {
  formattedForAI: string
}

export interface ClipVariantUI {
  id: string
  label: string
  shortLabel: string
  hookText: string
  startTime: number
  endTime: number
  overlays: string[]
  captionStyle?: string
  description: string
  status: 'pending' | 'approved' | 'rejected'
}

export type StitchSegmentRole =
  | 'hook'
  | 'rehook'
  | 'context'
  | 'why'
  | 'what'
  | 'how'
  | 'mini-payoff'
  | 'main-payoff'
  | 'bonus-payoff'
  | 'bridge'
  | 'payoff'

export interface StitchSegment {
  startTime: number
  endTime: number
  text: string
  role: StitchSegmentRole
  overlayText?: string
}

export interface StitchedClipCandidate {
  id: string
  sourceId: string
  segments: StitchSegment[]
  totalDuration: number
  narrative: string
  hookText: string
  score: number
  reasoning: string
  status: 'pending' | 'approved' | 'rejected'
  cropRegion?: CropRegion
}

export interface PartInfoUI {
  arcId: string
  partNumber: number
  totalParts: number
  partTitle: string
  endCardText: string
}

export interface StoryArcUI {
  id: string
  title: string
  clipIds: string[]
  narrativeDescription: string
}

/**
 * Per-clip render setting overrides.
 * Each key is either `true` (force on), `false` (force off), or absent (use global).
 */
export interface ClipRenderSettings {
  enableCaptions?: boolean
  enableHookTitle?: boolean
  enableProgressBar?: boolean
  enableAutoZoom?: boolean
  enableSoundDesign?: boolean
  enableBrandKit?: boolean
  /** 'default' = face-centred crop; 'blur-background' = letterboxed with blurred background */
  layout?: 'default' | 'blur-background'
}

export interface ClipCandidate {
  id: string
  sourceId: string
  startTime: number
  endTime: number
  duration: number
  text: string
  score: number
  /** The score assigned by the initial AI scoring pass — never overwritten after first set. */
  originalScore?: number
  hookText: string
  reasoning: string
  status: 'pending' | 'approved' | 'rejected'
  cropRegion?: CropRegion
  thumbnail?: string
  customThumbnail?: string
  wordTimestamps?: WordTimestamp[]
  loopScore?: number
  loopStrategy?: string
  loopOptimized?: boolean
  crossfadeDuration?: number
  variants?: ClipVariantUI[]
  partInfo?: PartInfoUI
  /** Per-clip render overrides — take precedence over global settings at render time. */
  overrides?: ClipRenderSettings
  /** Original AI-selected start/end — set once in setClips, never overwritten. */
  aiStartTime?: number
  aiEndTime?: number
}

export type PipelineStage =
  | 'idle'
  | 'downloading'
  | 'transcribing'
  | 'scoring'
  | 'optimizing-loops'
  | 'generating-variants'
  | 'stitching'
  | 'detecting-faces'
  | 'detecting-arcs'
  | 'ready'
  | 'rendering'
  | 'done'
  | 'error'

export interface PipelineProgress {
  stage: PipelineStage
  message: string
  percent: number
}

export interface RenderProgress {
  clipId: string
  percent: number
  status: 'queued' | 'rendering' | 'done' | 'error'
  error?: string
  outputPath?: string
  /** FFmpeg command string captured at render time (populated on error, or always in developer mode). */
  ffmpegCommand?: string
}

export interface CaptionStyle {
  id: string
  label: string
  fontName: string
  fontFile: string
  fontSize: number
  primaryColor: string
  highlightColor: string
  outlineColor: string
  backColor: string
  outline: number
  shadow: number
  borderStyle: number
  wordsPerLine: number
  animation: CaptionAnimation
  /** Color for emphasis-level words (bigger + this color). Defaults to highlightColor. */
  emphasisColor?: string
  /** Color for supersize-level words (huge + bold + this color). Defaults to '#FFD700' gold. */
  supersizeColor?: string
}

export interface SoundDesignSettings {
  enabled: boolean
  backgroundMusicTrack: MusicTrack
  sfxVolume: number
  musicVolume: number
}

export interface BrandKit {
  enabled: boolean
  /** Stable path to logo image (copied to userData/brand-assets). */
  logoPath: string | null
  logoPosition: LogoPosition
  /** Fraction of frame width (1080px). e.g. 0.1 = 108px wide. Range 0.05–0.30. */
  logoScale: number
  /** 0–1 opacity for the logo overlay. */
  logoOpacity: number
  /** Stable path to intro bumper video (optional). */
  introBumperPath: string | null
  /** Stable path to outro bumper video (optional). */
  outroBumperPath: string | null
}

export interface ZoomSettings {
  /** Whether auto-zoom (Ken Burns) is applied during rendering */
  enabled: boolean
  /**
   * How pronounced the zoom/pan motion is.
   * - subtle:  ±5% zoom  (default)
   * - medium:  ±9% zoom + horizontal drift
   * - dynamic: ±13% zoom + more pronounced drift
   */
  intensity: ZoomIntensity
  /**
   * Seconds between zoom reversals (half the sine period).
   * Default: 4 seconds → full cycle every 8 s.
   */
  intervalSeconds: number
}

export interface HookTitleOverlaySettings {
  /** Whether hook title overlay is burned into rendered clips. */
  enabled: boolean
  /** Visual style for the hook title. */
  style: HookTitleStyle
  /** How long (seconds) the hook text stays on screen (default 2.5). */
  displayDuration: number
  /** Fade-in duration in seconds (default 0.3). */
  fadeIn: number
  /** Fade-out duration in seconds (default 0.4). */
  fadeOut: number
  /** Font size in pixels on the 1080×1920 canvas (default 72). */
  fontSize: number
  /** Text color in CSS hex format (default '#FFFFFF'). */
  textColor: string
  /** Outline color in CSS hex format (default '#000000'). */
  outlineColor: string
  /** Outline width in pixels (default 4). */
  outlineWidth: number
}

/**
 * Settings for the mid-clip re-hook / pattern interrupt text overlay.
 */
export interface RehookOverlaySettings {
  /** Whether the re-hook overlay is burned into rendered clips. */
  enabled: boolean
  /** Visual style. */
  style: RehookStyle
  /** How long (seconds) the re-hook text stays visible (default 1.5). */
  displayDuration: number
  /** Fade-in duration in seconds (default 0.2). */
  fadeIn: number
  /** Fade-out duration in seconds (default 0.3). */
  fadeOut: number
  /**
   * Fraction through the clip duration to insert the re-hook (0.4–0.6).
   * Default: 0.45.
   */
  positionFraction: number
}

/**
 * Settings for the animated completion progress bar overlay.
 */
export interface ProgressBarOverlaySettings {
  /** Whether the progress bar is burned into rendered clips. */
  enabled: boolean
  /**
   * Edge of the frame to anchor the bar.
   * 'bottom' (default) sits below captions; 'top' avoids caption overlap.
   */
  position: ProgressBarPosition
  /** Bar thickness in pixels on the 1080×1920 canvas (2–8 px). Default: 4. */
  height: number
  /** Bar color in CSS hex format. Default: '#FFFFFF'. */
  color: string
  /** Bar opacity 0–1. Default: 0.9. */
  opacity: number
  /**
   * Visual style:
   *   'solid'    — flat single-color bar
   *   'gradient' — bar with white highlight strip for a dimensional look
   *   'glow'     — bar with a soft outer glow halo behind it
   */
  style: ProgressBarStyle
}

export interface BRollSettings {
  /** Whether B-Roll insertion is enabled at render time */
  enabled: boolean
  /** Pexels API key for stock footage search */
  pexelsApiKey: string
  /**
   * Target interval between B-Roll insertions in seconds.
   * Default: 5
   */
  intervalSeconds: number
  /**
   * Duration of each B-Roll clip in seconds (2–6).
   * Default: 3
   */
  clipDuration: number
  /** Display mode for B-Roll overlays. Default: 'split-top' */
  displayMode: BRollDisplayMode
  /** Transition type for B-Roll entry/exit. Default: 'crossfade' */
  transition: BRollTransition
  /** PiP size as fraction of canvas width (0.2–0.4). Default: 0.25 */
  pipSize: number
  /** PiP corner position. Default: 'bottom-right' */
  pipPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
}

export type BRollDisplayMode = 'fullscreen' | 'split-top' | 'split-bottom' | 'pip'
export type BRollTransition = 'hard-cut' | 'crossfade' | 'swipe-up' | 'swipe-down'

export interface FillerRemovalSettings {
  /** Master toggle — enables/disables the entire filler removal feature */
  enabled: boolean
  /** Detect and remove filler words (um, uh, like, etc.) */
  removeFillerWords: boolean
  /** Trim long silences between words */
  trimSilences: boolean
  /** Remove stuttered/repeated word starts (e.g. "I I I think") */
  removeRepeats: boolean
  /** Minimum gap (seconds) between words to consider as removable silence. Default: 0.8 */
  silenceThreshold: number
  /** Custom filler word list */
  fillerWords: string[]
}

/** Named quality preset that drives CRF, resolution, and encoding speed. */
export type RenderQualityPreset = 'draft' | 'normal' | 'high' | 'custom'

/** Output resolution for rendered clips (width×height). */
export type OutputResolution = '1080x1920' | '720x1280' | '540x960'

/** Container / codec format for rendered clips. */
export type OutputFormat = 'mp4' | 'webm'

/** x264/x265 encoding speed preset. */
export type EncodingPreset = 'ultrafast' | 'veryfast' | 'medium' | 'slow'

export interface RenderQualitySettings {
  /** Named preset. 'custom' unlocks the individual controls below. */
  preset: RenderQualityPreset
  /**
   * CRF value used when preset === 'custom' (15–35).
   * Lower = better quality / larger file. Default: 23.
   */
  customCrf: number
  /** Output resolution used when preset === 'custom'. Default: '1080x1920'. */
  outputResolution: OutputResolution
  /** Container format. Default: 'mp4'. */
  outputFormat: OutputFormat
  /** x264 encoding speed preset used when preset === 'custom'. Default: 'veryfast'. */
  encodingPreset: EncodingPreset
}

export interface AppSettings {
  geminiApiKey: string
  outputDirectory: string | null
  minScore: number
  captionStyle: CaptionStyle
  captionsEnabled: boolean
  soundDesign: SoundDesignSettings
  autoZoom: ZoomSettings
  brandKit: BrandKit
  hookTitleOverlay: HookTitleOverlaySettings
  rehookOverlay: RehookOverlaySettings
  progressBarOverlay: ProgressBarOverlaySettings
  broll: BRollSettings
  fillerRemoval: FillerRemovalSettings
  enableNotifications: boolean
  /** When true, all FFmpeg commands are logged to the error log during rendering. */
  developerMode: boolean
  /** Render quality / output format settings. */
  renderQuality: RenderQualitySettings
  /**
   * Output aspect ratio. Controls the canvas dimensions and center-crop fallback.
   * Default: '9:16' (1080×1920 vertical).
   */
  outputAspectRatio: OutputAspectRatio
  /**
   * Template for rendered clip filenames. Supports: {source}, {index}, {score},
   * {hook}, {duration}, {start}, {end}, {date}, {quality}.
   * Default: '{source}_clip{index}_{score}'
   */
  filenameTemplate: string
  /**
   * Number of clips to render in parallel (1–4).
   * Default: 1 (sequential).
   */
  renderConcurrency: number
}

// ---------------------------------------------------------------------------
// Settings Profiles
// ---------------------------------------------------------------------------

/**
 * A settings profile captures all render-related settings (everything except
 * API keys, output directory, and developer mode).
 */
export interface SettingsProfile {
  captionStyle: CaptionStyle
  captionsEnabled: boolean
  soundDesign: SoundDesignSettings
  autoZoom: ZoomSettings
  brandKit: BrandKit
  hookTitleOverlay: HookTitleOverlaySettings
  rehookOverlay: RehookOverlaySettings
  progressBarOverlay: ProgressBarOverlaySettings
  broll: Omit<BRollSettings, 'pexelsApiKey'>
  fillerRemoval: FillerRemovalSettings
  renderQuality: RenderQualitySettings
  outputAspectRatio: OutputAspectRatio
  filenameTemplate: string
  renderConcurrency: number
  minScore: number
  enableNotifications: boolean
}

/** Names of profiles that ship with the app and cannot be deleted. */
export const BUILT_IN_PROFILE_NAMES = ['TikTok Optimized', 'Reels Clean', 'Minimal'] as const

export interface ProcessingConfig {
  targetDuration: TargetDuration
  enablePerfectLoop: boolean
  clipEndMode: ClipEndMode
  enableVariants: boolean
  enableMultiPart: boolean
  enableClipStitching: boolean
}

export interface AutoModeConfig {
  /** Whether hands-free auto-approve + auto-render is active */
  enabled: boolean
  /** Clips scoring at or above this value are auto-approved (0-100) */
  approveThreshold: number
  /** When true, rendering starts automatically after clips are approved */
  autoRender: boolean
}

export interface ErrorLogEntry {
  id: string
  timestamp: number
  source: string
  message: string
  /** Optional extra detail (e.g. FFmpeg command string) shown in an expandable section. */
  details?: string
}

// ---------------------------------------------------------------------------
// Batch queue
// ---------------------------------------------------------------------------

export type QueueItemStatus = 'pending' | 'processing' | 'done' | 'error'

export interface QueueResult {
  status: QueueItemStatus
  error?: string
  clipCount?: number
}

// ---------------------------------------------------------------------------
// Hook text templates
// ---------------------------------------------------------------------------

export interface HookTextTemplate {
  id: string
  name: string
  template: string
  emoji?: string
  builtIn?: boolean
}

export type PythonSetupState = 'checking' | 'not-setup' | 'installing' | 'ready' | 'skipped' | 'error'

// ---------------------------------------------------------------------------
// Full AppState
// ---------------------------------------------------------------------------

export interface AppState {
  // Source videos
  sources: SourceVideo[]
  activeSourceId: string | null

  // Transcriptions (keyed by source ID)
  transcriptions: Record<string, TranscriptionData>

  // Clip candidates (keyed by source ID)
  clips: Record<string, ClipCandidate[]>

  // Pipeline
  pipeline: PipelineProgress
  /** Which pipeline stage failed (enables "Retry from stage" UI). */
  failedPipelineStage: PipelineStage | null
  /** Stages that completed successfully — used to skip them on retry. */
  completedPipelineStages: Set<PipelineStage>
  /** Cached sourcePath from download step — avoids re-downloading on retry. */
  cachedSourcePath: string | null

  // Render
  renderProgress: RenderProgress[]
  isRendering: boolean
  activeEncoder: { encoder: string; isHardware: boolean } | null
  renderStartedAt: number | null
  renderCompletedAt: number | null
  clipRenderTimes: Record<string, { started: number; completed: number; duration: number }>
  /** Per-clip render error messages, keyed by clipId. Persists after batch completes for retry. */
  renderErrors: Record<string, string>

  // Single-clip render
  singleRenderClipId: string | null
  singleRenderProgress: number
  singleRenderStatus: 'idle' | 'rendering' | 'done' | 'error'
  singleRenderOutputPath: string | null
  singleRenderError: string | null

  // Settings
  settings: AppSettings

  // Python setup
  pythonStatus: PythonSetupState
  pythonSetupError: string | null
  pythonSetupProgress: {
    stage: string
    message: string
    percent: number
    package?: string
    currentPackage?: number
    totalPackages?: number
  } | null

  // Processing config
  processingConfig: ProcessingConfig

  // Stitched clips (keyed by source ID)
  stitchedClips: Record<string, StitchedClipCandidate[]>

  // Story arcs (keyed by source ID)
  storyArcs: Record<string, StoryArcUI[]>

  // Errors
  errorLog: ErrorLogEntry[]

  // Clip selection (keyboard navigation)
  selectedClipIndex: number

  // Clip ordering (drag-to-reorder)
  clipOrder: Record<string, string[]>
  customOrder: boolean

  // View mode
  clipViewMode: 'grid' | 'timeline'
  setClipViewMode: (mode: 'grid' | 'timeline') => void

  // Search
  searchQuery: string
  setSearchQuery: (query: string) => void

  // Undo / Redo
  _undoStack: import('./history-slice').UndoableSnapshot[]
  _redoStack: import('./history-slice').UndoableSnapshot[]
  canUndo: boolean
  canRedo: boolean

  // Actions — Undo / Redo
  undo: () => void
  redo: () => void

  // Actions — Sources
  addSource: (source: SourceVideo) => void
  removeSource: (id: string) => void
  setActiveSource: (id: string | null) => void

  // Actions — Transcription
  setTranscription: (sourceId: string, data: TranscriptionData) => void

  // Actions — Clips
  setClips: (sourceId: string, clips: ClipCandidate[]) => void
  updateClipStatus: (sourceId: string, clipId: string, status: ClipCandidate['status']) => void
  updateClipTrim: (
    sourceId: string,
    clipId: string,
    startTime: number,
    endTime: number
  ) => void
  updateClipThumbnail: (sourceId: string, clipId: string, thumbnail: string) => void
  setClipCustomThumbnail: (sourceId: string, clipId: string, thumbnail: string | null) => void
  updateClipCrop: (sourceId: string, clipId: string, crop: CropRegion) => void
  updateClipHookText: (sourceId: string, clipId: string, hookText: string) => void
  updateClipLoop: (sourceId: string, clipId: string, loopData: { loopScore: number; loopStrategy: string; loopOptimized: boolean; crossfadeDuration?: number }) => void
  setClipVariants: (sourceId: string, clipId: string, variants: ClipVariantUI[]) => void
  updateVariantStatus: (sourceId: string, clipId: string, variantId: string, status: 'pending' | 'approved' | 'rejected') => void
  setClipPartInfo: (sourceId: string, clipId: string, partInfo: PartInfoUI) => void
  setClipOverride: (sourceId: string, clipId: string, key: keyof ClipRenderSettings, value: ClipRenderSettings[keyof ClipRenderSettings]) => void
  clearClipOverrides: (sourceId: string, clipId: string) => void
  resetClipBoundaries: (sourceId: string, clipId: string) => void
  rescoreClip: (sourceId: string, clipId: string, newScore: number, newReasoning: string, newHookText?: string) => void
  approveAll: (sourceId: string) => void
  approveClipsAboveScore: (sourceId: string, minScore: number) => { approved: number; rejected: number }
  rejectAll: (sourceId: string) => void
  setSelectedClipIndex: (index: number) => void
  reorderClips: (sourceId: string, activeId: string, overId: string) => void
  setCustomOrder: (custom: boolean) => void

  // Actions — Batch multi-select
  selectedClipIds: Set<string>
  toggleClipSelection: (clipId: string) => void
  selectAllVisible: (clipIds: string[]) => void
  clearSelection: () => void
  batchUpdateClips: (sourceId: string, clipIds: string[], updates: Partial<Pick<ClipCandidate, 'status'> & { trimOffsetSeconds: number; overrides: Partial<ClipRenderSettings> }>) => void

  // Actions — Stitched Clips
  setStitchedClips: (sourceId: string, clips: StitchedClipCandidate[]) => void
  updateStitchedClipStatus: (sourceId: string, clipId: string, status: 'pending' | 'approved' | 'rejected') => void

  // Actions — Story Arcs
  setStoryArcs: (sourceId: string, arcs: StoryArcUI[]) => void

  // Actions — Pipeline
  setPipeline: (progress: PipelineProgress) => void
  /** Record which stage failed and mark stages that completed before it. */
  setFailedPipelineStage: (stage: PipelineStage) => void
  /** Cache the resolved source path (from download or local file) for retry. */
  setCachedSourcePath: (path: string) => void
  /** Mark a pipeline stage as completed (for retry-from-stage logic). */
  markStageCompleted: (stage: PipelineStage) => void
  /** Clear all pipeline cache (failed stage, completed stages, cached path). */
  clearPipelineCache: () => void

  // Actions — Render
  setRenderProgress: (progress: RenderProgress[]) => void
  setIsRendering: (rendering: boolean) => void
  setRenderError: (clipId: string, error: string) => void
  clearRenderErrors: () => void
  /** Update single-clip render state (only the provided keys are changed). */
  setSingleRenderState: (patch: {
    clipId?: string | null
    progress?: number
    status?: 'idle' | 'rendering' | 'done' | 'error'
    outputPath?: string | null
    error?: string | null
  }) => void

  // Actions — Settings
  setGeminiApiKey: (key: string) => void
  setOutputDirectory: (dir: string) => void
  setMinScore: (score: number) => void
  setCaptionStyle: (style: CaptionStyle) => void
  setCaptionsEnabled: (enabled: boolean) => void
  setSoundDesignEnabled: (enabled: boolean) => void
  setSoundDesignTrack: (track: MusicTrack) => void
  setSoundDesignSfxVolume: (volume: number) => void
  setSoundDesignMusicVolume: (volume: number) => void
  setAutoZoomEnabled: (enabled: boolean) => void
  setAutoZoomIntensity: (intensity: ZoomIntensity) => void
  setAutoZoomInterval: (seconds: number) => void

  // Actions — Hook Title Overlay
  setHookTitleEnabled: (enabled: boolean) => void
  setHookTitleStyle: (style: HookTitleStyle) => void
  setHookTitleDisplayDuration: (seconds: number) => void
  setHookTitleFontSize: (px: number) => void
  setHookTitleTextColor: (color: string) => void
  setHookTitleOutlineColor: (color: string) => void
  setHookTitleOutlineWidth: (px: number) => void
  setHookTitleFadeIn: (seconds: number) => void
  setHookTitleFadeOut: (seconds: number) => void

  // Actions — Re-hook Overlay
  setRehookEnabled: (enabled: boolean) => void
  setRehookStyle: (style: RehookStyle) => void
  setRehookDisplayDuration: (seconds: number) => void
  setRehookPositionFraction: (fraction: number) => void

  // Actions — Progress Bar Overlay
  setProgressBarEnabled: (enabled: boolean) => void
  setProgressBarPosition: (position: ProgressBarPosition) => void
  setProgressBarHeight: (height: number) => void
  setProgressBarColor: (color: string) => void
  setProgressBarOpacity: (opacity: number) => void
  setProgressBarStyle: (style: ProgressBarStyle) => void

  // Actions — Brand Kit
  setBrandKitEnabled: (enabled: boolean) => void
  setBrandKitLogoPath: (path: string | null) => void
  setBrandKitLogoPosition: (position: LogoPosition) => void
  setBrandKitLogoScale: (scale: number) => void
  setBrandKitLogoOpacity: (opacity: number) => void
  setBrandKitIntroBumperPath: (path: string | null) => void
  setBrandKitOutroBumperPath: (path: string | null) => void

  // Actions — B-Roll
  setBRollEnabled: (enabled: boolean) => void
  setBRollPexelsApiKey: (key: string) => void
  setBRollIntervalSeconds: (seconds: number) => void
  setBRollClipDuration: (seconds: number) => void

  // Actions — Filler Removal
  setFillerRemovalEnabled: (enabled: boolean) => void
  setFillerRemovalFillerWords: (enabled: boolean) => void
  setFillerRemovalSilences: (enabled: boolean) => void
  setFillerRemovalRepeats: (enabled: boolean) => void
  setFillerRemovalSilenceThreshold: (seconds: number) => void
  setFillerRemovalWordList: (words: string[]) => void

  // Actions — Notifications
  setEnableNotifications: (enabled: boolean) => void

  // Actions — Developer Mode
  setDeveloperMode: (enabled: boolean) => void

  // Actions — Render Quality
  setRenderQuality: (quality: Partial<RenderQualitySettings>) => void

  // Actions — Output Aspect Ratio
  setOutputAspectRatio: (ratio: OutputAspectRatio) => void

  // Actions — Filename Template
  setFilenameTemplate: (template: string) => void

  // Actions — Render Concurrency
  setRenderConcurrency: (concurrency: number) => void

  // Actions — Reset
  resetSettings: () => void
  resetSection: (section: 'captions' | 'soundDesign' | 'autoZoom' | 'brandKit' | 'hookTitle' | 'rehook' | 'progressBar' | 'fillerRemoval' | 'broll' | 'aiSettings' | 'renderQuality') => void

  // Actions — Python setup
  setPythonStatus: (status: PythonSetupState) => void
  setPythonSetupError: (error: string | null) => void
  setPythonSetupProgress: (progress: {
    stage: string
    message: string
    percent: number
    package?: string
    currentPackage?: number
    totalPackages?: number
  } | null) => void

  // Actions — Processing Config
  setProcessingConfig: (config: Partial<ProcessingConfig>) => void
  resetProcessingConfig: () => void

  // Auto Mode
  autoMode: AutoModeConfig
  setAutoMode: (config: Partial<AutoModeConfig>) => void
  /** Set when auto-mode ran: captures what it did for the banner in ClipGrid */
  autoModeResult: { sourceId: string; approved: number; threshold: number; didRender: boolean } | null
  setAutoModeResult: (result: { sourceId: string; approved: number; threshold: number; didRender: boolean } | null) => void

  // Template layout
  templateLayout: TemplateLayout
  setTemplateLayout: (layout: TemplateLayout) => void
  targetPlatform: Platform
  setTargetPlatform: (platform: Platform) => void

  // Network status
  isOnline: boolean
  setIsOnline: (online: boolean) => void

  // Actions — Errors
  addError: (entry: Omit<ErrorLogEntry, 'id' | 'timestamp'>) => void
  clearErrors: () => void

  // Computed
  getApprovedClips: (sourceId: string) => ClipCandidate[]
  getActiveSource: () => SourceVideo | null
  getActiveTranscription: () => TranscriptionData | null
  getActiveClips: () => ClipCandidate[]

  // Settings lock
  /** Snapshot of render-relevant settings captured at pipeline start. null = no snapshot. */
  settingsSnapshot: SettingsProfile | null
  /** True when current settings differ from the snapshot taken at pipeline start. */
  settingsChanged: boolean
  /** Capture current render-relevant settings as a snapshot. */
  snapshotSettings: () => void
  /** Clear the settings snapshot (e.g. on project reset). */
  clearSettingsSnapshot: () => void
  /** Restore settings from the snapshot (revert changes made after processing). */
  revertToSnapshot: () => void
  /** Dismiss the settings-changed warning without reverting. */
  dismissSettingsWarning: () => void
  /** Return list of human-readable names of settings that changed since the snapshot. */
  getSettingsDiff: () => string[]

  // Dirty state (unsaved changes)
  isDirty: boolean
  lastSavedAt: number | null

  // Project (pure state — persistence lives in services/project-service.ts)
  reset: () => void

  // Theme
  theme: 'light' | 'dark' | 'system'
  setTheme: (theme: 'light' | 'dark' | 'system') => void

  // Batch queue
  processingQueue: string[]
  queueMode: boolean
  queuePaused: boolean
  queueResults: Record<string, QueueResult>
  enqueueSources: (sourceIds: string[]) => void
  dequeueNext: () => string | null
  markQueueItemProcessing: (sourceId: string) => void
  markQueueItemDone: (sourceId: string, clipCount: number) => void
  markQueueItemError: (sourceId: string, error: string) => void
  pauseQueue: () => void
  resumeQueue: () => void
  clearQueue: () => void
  skipQueueItem: () => void

  // Hook text templates
  /** User-created templates (built-ins are in DEFAULT_HOOK_TEMPLATES constant). */
  hookTemplates: HookTextTemplate[]
  /** ID of the active template, or null for no template (pass-through). */
  activeHookTemplateId: string | null
  setActiveHookTemplateId: (id: string | null) => void
  addHookTemplate: (template: Omit<HookTextTemplate, 'id' | 'builtIn'>) => void
  editHookTemplate: (id: string, updates: Partial<Pick<HookTextTemplate, 'name' | 'template' | 'emoji'>>) => void
  removeHookTemplate: (id: string) => void

  // Clip comparison
  comparisonClipIds: [string, string] | null
  setComparisonClips: (idA: string, idB: string) => void
  clearComparison: () => void

  // Onboarding
  hasCompletedOnboarding: boolean
  setOnboardingComplete: () => void

  // What's New / Changelog
  lastSeenVersion: string | null
  setLastSeenVersion: (version: string) => void

  // AI Token Usage
  aiUsage: {
    totalPromptTokens: number
    totalCompletionTokens: number
    totalCalls: number
    callHistory: Array<{ source: string; promptTokens: number; completionTokens: number; totalTokens: number; model: string; timestamp: number }>
    sessionStarted: number
  }
  trackTokenUsage: (event: { source: string; promptTokens: number; completionTokens: number; totalTokens: number; model: string; timestamp: number }) => void
  resetAiUsage: () => void

  // Settings profiles
  settingsProfiles: Record<string, SettingsProfile>
  activeProfileName: string | null
  saveProfile: (name: string) => void
  loadProfile: (name: string) => void
  deleteProfile: (name: string) => void
  renameProfile: (oldName: string, newName: string) => void
}
