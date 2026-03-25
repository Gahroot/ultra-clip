import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

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

export interface WordTimestamp {
  text: string
  start: number // seconds
  end: number // seconds
}

export interface TranscriptionData {
  text: string
  words: WordTimestamp[]
  segments: { text: string; start: number; end: number }[]
  formattedForAI: string // pre-formatted transcript for Gemini
}

export interface CropRegion {
  x: number
  y: number
  width: number
  height: number
  faceDetected: boolean
}

export interface ClipVariantUI {
  id: string               // 'variant-a', 'variant-b', 'variant-c'
  label: string            // 'Hook-first edit', 'Cold open', 'Curiosity builder'
  shortLabel: string       // 'A', 'B', 'C'
  hookText: string         // variant-specific hook text
  startTime: number        // may differ from parent clip
  endTime: number
  overlays: string[]       // which overlay types are active: ['hook-title', 'progress-bar']
  captionStyle?: string    // override caption style id
  description: string      // one-sentence description of the variant strategy
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
  | 'payoff'       // legacy — mapped to main-payoff by backend, kept for compat

export interface StitchSegment {
  startTime: number    // seconds in source video
  endTime: number      // seconds in source video
  text: string         // transcript text for this segment
  role: StitchSegmentRole  // narrative role
  overlayText?: string // optional on-screen text overlay
}

export interface StitchedClipCandidate {
  id: string
  sourceId: string
  segments: StitchSegment[]
  totalDuration: number          // sum of all segment durations
  narrative: string              // AI's description of the story this clip tells
  hookText: string               // hook text for the first 2 seconds
  score: number                  // 0-100 viral potential
  reasoning: string              // why this composite works
  status: 'pending' | 'approved' | 'rejected'
  cropRegion?: CropRegion        // face-centered crop (from first segment's face detection)
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
  sourceId: string // which source video this came from
  startTime: number // seconds
  endTime: number // seconds
  duration: number // endTime - startTime
  text: string // transcript text for this segment
  score: number // 0-100
  /** The score assigned by the initial AI scoring pass — never overwritten after first set. */
  originalScore?: number
  hookText: string // AI-generated hook text
  reasoning: string // AI reasoning for the score
  status: 'pending' | 'approved' | 'rejected'
  cropRegion?: CropRegion // face-centered crop (from face detection)
  thumbnail?: string // base64 thumbnail
  wordTimestamps?: WordTimestamp[] // word timestamps within this clip's range
  loopScore?: number // 0-100 loop quality score
  loopStrategy?: string // strategy used (hard-cut, thematic, crossfade, etc.)
  loopOptimized?: boolean // whether boundaries were adjusted for looping
  crossfadeDuration?: number // audio crossfade duration in seconds (only for crossfade strategy)
  variants?: ClipVariantUI[]
  partInfo?: PartInfoUI // multi-part series info
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
  percent: number // 0-100
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

export type CaptionAnimation = 'karaoke-fill' | 'word-pop' | 'fade-in' | 'glow'

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
}

export type MusicTrack = 'ambient-tech' | 'ambient-motivational' | 'ambient-chill'

export interface SoundDesignSettings {
  enabled: boolean
  backgroundMusicTrack: MusicTrack
  sfxVolume: number   // 0–1
  musicVolume: number // 0–1
}

export type LogoPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

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

export type ZoomIntensity = 'subtle' | 'medium' | 'dynamic'

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

export type HookTitleStyle = 'centered-bold' | 'top-bar' | 'slide-in'

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

/** Visual style for the re-hook / pattern interrupt mid-clip overlay. */
export type RehookStyle = 'bar' | 'text-only' | 'slide-up'

/**
 * Settings for the mid-clip re-hook / pattern interrupt text overlay.
 * This overlay appears at ~40–60% through each clip to reset viewer
 * attention and combat the mid-clip retention dip.
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
  /** Font size in pixels on the 1080×1920 canvas (default 56). */
  fontSize: number
  /** Text color in CSS hex format (default '#FFFF00'). */
  textColor: string
  /** Outline color in CSS hex format (default '#000000'). */
  outlineColor: string
  /** Outline width in pixels (default 3). */
  outlineWidth: number
  /**
   * Fraction through the clip duration to insert the re-hook (0.4–0.6).
   * The render pipeline may shift this to align with a word boundary or
   * pivot word in the transcript. Default: 0.45.
   */
  positionFraction: number
}

/** Visual rendering style for the progress bar. */
export type ProgressBarStyle = 'solid' | 'gradient' | 'glow'

/** Which edge of the frame the progress bar is anchored to. */
export type ProgressBarPosition = 'top' | 'bottom'

/**
 * Settings for the animated completion progress bar overlay.
 * The bar fills left→right over the clip duration to exploit the
 * "sunk-cost" retention effect ("it's almost done, I'll finish it").
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
   * The placement engine targets one B-Roll clip every N seconds.
   * Default: 5
   */
  intervalSeconds: number
  /**
   * Duration of each B-Roll clip in seconds (2–6).
   * Clips are trimmed to this length from Pexels footage.
   * Default: 3
   */
  clipDuration: number
}

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

/**
 * Output aspect ratio for rendered clips.
 * - '9:16' — 1080×1920, vertical (TikTok, Reels, Shorts)
 * - '1:1' — 1080×1080, square (Instagram Feed, Facebook)
 * - '4:5' — 1080×1350, portrait (Instagram Post)
 * - '16:9' — 1920×1080, landscape (YouTube, Twitter)
 */
export type OutputAspectRatio = '9:16' | '1:1' | '4:5' | '16:9'

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
  minScore: number // default 69
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
   * For GPU encoders (NVENC/QSV) the pipeline caps this at 2 to avoid
   * exhausting hardware sessions. For CPU (libx264) all 4 slots can be used.
   * Default: 1 (sequential).
   */
  renderConcurrency: number
}

export type TargetDuration = 'auto' | '15-30' | '30-60' | '60-90' | '90-120'

export interface ProcessingConfig {
  targetDuration: TargetDuration
  enablePerfectLoop: boolean
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
  clipCount?: number
  error?: string
}

// ---------------------------------------------------------------------------
// Hook text templates
// ---------------------------------------------------------------------------

export interface HookTextTemplate {
  id: string
  name: string
  template: string // Uses {hookText}, {score}, {duration} variables
  emoji?: string
  builtIn?: boolean
}

export const DEFAULT_HOOK_TEMPLATES: HookTextTemplate[] = [
  { id: 'ai-default', name: 'AI Default', template: '{hookText}', emoji: '🤖', builtIn: true },
  { id: 'bold-claim', name: 'Bold Claim', template: '🔥 {hookText} 🔥', emoji: '🔥', builtIn: true },
  { id: 'question-hook', name: 'Question Hook', template: '{hookText}?', emoji: '❓', builtIn: true },
  { id: 'warning', name: 'Warning', template: '⚠️ {hookText}', emoji: '⚠️', builtIn: true },
  { id: 'curiosity', name: 'Curiosity', template: "You won't believe {hookText}", emoji: '👀', builtIn: true },
  { id: 'announcement', name: 'Announcement', template: '{hookText} (WATCH THIS)', emoji: '📢', builtIn: true }
]

const HOOK_TEMPLATES_KEY = 'batchcontent-hook-templates'
const ACTIVE_HOOK_TEMPLATE_KEY = 'batchcontent-active-hook-template'

function loadHookTemplatesFromStorage(): HookTextTemplate[] {
  try {
    const raw = localStorage.getItem(HOOK_TEMPLATES_KEY)
    if (!raw) return []
    return JSON.parse(raw) as HookTextTemplate[]
  } catch {
    return []
  }
}

function saveHookTemplatesToStorage(templates: HookTextTemplate[]): void {
  localStorage.setItem(HOOK_TEMPLATES_KEY, JSON.stringify(templates))
}

/**
 * Apply a hook text template by substituting variables.
 * Variables: {hookText}, {score}, {duration}
 */
export function applyHookTemplate(
  template: string,
  hookText: string,
  score?: number,
  duration?: number
): string {
  return template
    .replace(/\{hookText\}/g, hookText)
    .replace(/\{score\}/g, score !== undefined ? String(score) : '')
    .replace(/\{duration\}/g, duration !== undefined ? String(Math.round(duration)) : '')
}

// ---------------------------------------------------------------------------
// Caption presets
// ---------------------------------------------------------------------------

export const CAPTION_PRESETS: Record<string, CaptionStyle> = {
  'hormozi-bold': {
    id: 'hormozi-bold',
    label: 'Hormozi Bold',
    fontName: 'Montserrat',
    fontFile: 'Montserrat-Bold.ttf',
    fontSize: 0.07,
    primaryColor: '#FFFFFF',
    highlightColor: '#00FF00',
    outlineColor: '#000000',
    backColor: '#80000000',
    outline: 4,
    shadow: 2,
    borderStyle: 1,
    wordsPerLine: 2,
    animation: 'word-pop'
  },
  'tiktok-glow': {
    id: 'tiktok-glow',
    label: 'TikTok Glow',
    fontName: 'Poppins',
    fontFile: 'Poppins-Bold.ttf',
    fontSize: 0.06,
    primaryColor: '#FFFFFF',
    highlightColor: '#00FFFF',
    outlineColor: '#FF00FF',
    backColor: '#00000000',
    outline: 2,
    shadow: 0,
    borderStyle: 1,
    wordsPerLine: 3,
    animation: 'glow'
  },
  'reels-clean': {
    id: 'reels-clean',
    label: 'Reels Clean',
    fontName: 'Inter',
    fontFile: 'Inter-Bold.ttf',
    fontSize: 0.04,
    primaryColor: '#FFFFFF',
    highlightColor: '#FFFFFF',
    outlineColor: '#000000',
    backColor: '#C8191919',
    outline: 0,
    shadow: 0,
    borderStyle: 3,
    wordsPerLine: 6,
    animation: 'fade-in'
  },
  'classic-karaoke': {
    id: 'classic-karaoke',
    label: 'Classic Karaoke',
    fontName: 'Inter',
    fontFile: 'Inter-Bold.ttf',
    fontSize: 0.05,
    primaryColor: '#FFFFFF',
    highlightColor: '#FFFF00',
    outlineColor: '#000000',
    backColor: '#80000000',
    outline: 3,
    shadow: 1,
    borderStyle: 1,
    wordsPerLine: 4,
    animation: 'karaoke-fill'
  }
}

// ---------------------------------------------------------------------------
// Undo / Redo infrastructure
// ---------------------------------------------------------------------------

/** Subset of state tracked by undo/redo. */
interface UndoableSnapshot {
  clips: Record<string, ClipCandidate[]>
  stitchedClips: Record<string, StitchedClipCandidate[]>
  minScore: number
}

const _undoStack: UndoableSnapshot[] = []
const _redoStack: UndoableSnapshot[] = []
const MAX_UNDO = 50

function _captureSnapshot(state: {
  clips: Record<string, ClipCandidate[]>
  stitchedClips: Record<string, StitchedClipCandidate[]>
  settings: { minScore: number }
}): UndoableSnapshot {
  return {
    clips: JSON.parse(JSON.stringify(state.clips)),
    stitchedClips: JSON.parse(JSON.stringify(state.stitchedClips)),
    minScore: state.settings.minScore
  }
}

/** Push current undoable state onto undo stack and clear redo. */
function _pushUndo(state: {
  clips: Record<string, ClipCandidate[]>
  stitchedClips: Record<string, StitchedClipCandidate[]>
  settings: { minScore: number }
}): void {
  _undoStack.push(_captureSnapshot(state))
  if (_undoStack.length > MAX_UNDO) _undoStack.shift()
  _redoStack.length = 0
}

// ---------------------------------------------------------------------------
// Store interface
// ---------------------------------------------------------------------------

export type PythonSetupState = 'checking' | 'not-setup' | 'installing' | 'ready' | 'skipped' | 'error'

interface AppState {
  // Source videos
  sources: SourceVideo[]
  activeSourceId: string | null

  // Transcriptions (keyed by source ID)
  transcriptions: Record<string, TranscriptionData>

  // Clip candidates (keyed by source ID)
  clips: Record<string, ClipCandidate[]>

  // Pipeline
  pipeline: PipelineProgress

  // Render
  renderProgress: RenderProgress[]
  isRendering: boolean
  activeEncoder: { encoder: string; isHardware: boolean } | null
  renderStartedAt: number | null
  renderCompletedAt: number | null
  clipRenderTimes: Record<string, { started: number; completed: number; duration: number }>
  /** Per-clip render error messages, keyed by clipId. Persists after batch completes for retry. */
  renderErrors: Record<string, string>

  // Single-clip render (separate tracking from batch render)
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
  clipOrder: Record<string, string[]> // keyed by sourceId
  customOrder: boolean

  // View mode
  clipViewMode: 'grid' | 'timeline'
  setClipViewMode: (mode: 'grid' | 'timeline') => void

  // Search
  searchQuery: string
  setSearchQuery: (query: string) => void

  // Undo / Redo
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

  // Actions — Re-hook Overlay
  setRehookEnabled: (enabled: boolean) => void
  setRehookStyle: (style: RehookStyle) => void
  setRehookDisplayDuration: (seconds: number) => void
  setRehookFontSize: (px: number) => void
  setRehookTextColor: (color: string) => void
  setRehookOutlineColor: (color: string) => void
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

  // Project
  saveProject: () => Promise<string | null>
  loadProject: () => Promise<boolean>
  loadProjectFromPath: (filePath: string) => Promise<boolean>
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
}

// ---------------------------------------------------------------------------
// Default settings
// ---------------------------------------------------------------------------

const DEFAULT_SOUND_DESIGN: SoundDesignSettings = {
  enabled: false,
  backgroundMusicTrack: 'ambient-tech',
  sfxVolume: 0.5,
  musicVolume: 0.1
}

const DEFAULT_AUTO_ZOOM: ZoomSettings = {
  enabled: false,
  intensity: 'subtle',
  intervalSeconds: 4
}

const DEFAULT_BRAND_KIT: BrandKit = {
  enabled: false,
  logoPath: null,
  logoPosition: 'bottom-right',
  logoScale: 0.1,
  logoOpacity: 0.8,
  introBumperPath: null,
  outroBumperPath: null
}

const DEFAULT_HOOK_TITLE_OVERLAY: HookTitleOverlaySettings = {
  enabled: true,
  style: 'centered-bold',
  displayDuration: 2.5,
  fadeIn: 0.3,
  fadeOut: 0.4,
  fontSize: 72,
  textColor: '#FFFFFF',
  outlineColor: '#000000',
  outlineWidth: 4
}

const DEFAULT_REHOOK_OVERLAY: RehookOverlaySettings = {
  enabled: false,
  style: 'bar',
  displayDuration: 1.5,
  fadeIn: 0.2,
  fadeOut: 0.3,
  fontSize: 56,
  textColor: '#FFFF00',
  outlineColor: '#000000',
  outlineWidth: 3,
  positionFraction: 0.45
}

const DEFAULT_PROGRESS_BAR_OVERLAY: ProgressBarOverlaySettings = {
  enabled: false,
  position: 'bottom',
  height: 4,
  color: '#FFFFFF',
  opacity: 0.9,
  style: 'solid'
}

const DEFAULT_BROLL: BRollSettings = {
  enabled: false,
  pexelsApiKey: localStorage.getItem('batchcontent-pexels-key') || '',
  intervalSeconds: 5,
  clipDuration: 3
}

const DEFAULT_FILLER_REMOVAL: FillerRemovalSettings = {
  enabled: true,
  removeFillerWords: true,
  trimSilences: true,
  removeRepeats: true,
  silenceThreshold: 0.8,
  fillerWords: [
    'um', 'uh', 'erm', 'er', 'ah', 'hm', 'hmm', 'mm', 'mhm',
    'like', 'you know', 'i mean', 'sort of', 'kind of',
    'basically', 'actually', 'literally', 'right', 'okay so'
  ]
}

const DEFAULT_RENDER_QUALITY: RenderQualitySettings = {
  preset: 'normal',
  customCrf: 23,
  outputResolution: '1080x1920',
  outputFormat: 'mp4',
  encodingPreset: 'veryfast'
}

export const DEFAULT_SETTINGS: AppSettings = {
  geminiApiKey: localStorage.getItem('batchcontent-gemini-key') || '',
  outputDirectory: null,
  minScore: 69,
  captionStyle: CAPTION_PRESETS['hormozi-bold'],
  captionsEnabled: true,
  soundDesign: DEFAULT_SOUND_DESIGN,
  autoZoom: DEFAULT_AUTO_ZOOM,
  brandKit: DEFAULT_BRAND_KIT,
  hookTitleOverlay: DEFAULT_HOOK_TITLE_OVERLAY,
  rehookOverlay: DEFAULT_REHOOK_OVERLAY,
  progressBarOverlay: DEFAULT_PROGRESS_BAR_OVERLAY,
  broll: DEFAULT_BROLL,
  fillerRemoval: DEFAULT_FILLER_REMOVAL,
  enableNotifications: true,
  developerMode: false,
  renderQuality: DEFAULT_RENDER_QUALITY,
  outputAspectRatio: '9:16',
  filenameTemplate: '{source}_clip{index}_{score}',
  renderConcurrency: 1
}

const DEFAULT_PROCESSING_CONFIG: ProcessingConfig = {
  targetDuration: 'auto',
  enablePerfectLoop: false,
  enableVariants: false,
  enableMultiPart: false,
  enableClipStitching: false
}

const DEFAULT_PIPELINE: PipelineProgress = {
  stage: 'idle',
  message: '',
  percent: 0
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useStore = create<AppState>((set, get) => ({
  // Initial state
  sources: [],
  activeSourceId: null,
  transcriptions: {},
  clips: {},
  pipeline: DEFAULT_PIPELINE,
  renderProgress: [],
  isRendering: false,
  activeEncoder: null,
  renderStartedAt: null,
  renderCompletedAt: null,
  clipRenderTimes: {},
  renderErrors: {},
  singleRenderClipId: null,
  singleRenderProgress: 0,
  singleRenderStatus: 'idle' as const,
  singleRenderOutputPath: null,
  singleRenderError: null,
  settings: DEFAULT_SETTINGS,
  pythonStatus: 'checking',
  pythonSetupError: null,
  pythonSetupProgress: null,
  processingConfig: DEFAULT_PROCESSING_CONFIG,
  stitchedClips: {},
  storyArcs: {},
  errorLog: [],
  selectedClipIndex: 0,
  selectedClipIds: new Set<string>(),
  clipOrder: {},
  customOrder: false,
  clipViewMode: 'grid',
  setClipViewMode: (mode: 'grid' | 'timeline') => set({ clipViewMode: mode }),
  searchQuery: '',
  setSearchQuery: (query: string) => set({ searchQuery: query }),
  canUndo: false,
  canRedo: false,
  theme: (localStorage.getItem('batchcontent-theme') as 'light' | 'dark' | 'system') ?? 'dark',
  processingQueue: [],
  queueMode: false,
  queuePaused: false,
  queueResults: {},
  autoMode: { enabled: false, approveThreshold: 80, autoRender: false },
  autoModeResult: null,
  hookTemplates: loadHookTemplatesFromStorage(),
  activeHookTemplateId: localStorage.getItem(ACTIVE_HOOK_TEMPLATE_KEY) ?? null,
  hasCompletedOnboarding: localStorage.getItem('batchcontent-onboarding-done') === 'true',
  lastSeenVersion: localStorage.getItem('batchcontent-last-seen-version') ?? null,
  isOnline: navigator.onLine,
  comparisonClipIds: null,

  // AI Token Usage
  aiUsage: {
    totalPromptTokens: 0,
    totalCompletionTokens: 0,
    totalCalls: 0,
    callHistory: [],
    sessionStarted: Date.now()
  },

  // --- Undo / Redo ---

  undo: () => {
    const snapshot = _undoStack.pop()
    if (!snapshot) return
    _redoStack.push(_captureSnapshot(get()))
    set({
      clips: snapshot.clips,
      stitchedClips: snapshot.stitchedClips,
      settings: { ...get().settings, minScore: snapshot.minScore },
      canUndo: _undoStack.length > 0,
      canRedo: true
    })
  },

  redo: () => {
    const snapshot = _redoStack.pop()
    if (!snapshot) return
    _undoStack.push(_captureSnapshot(get()))
    set({
      clips: snapshot.clips,
      stitchedClips: snapshot.stitchedClips,
      settings: { ...get().settings, minScore: snapshot.minScore },
      canUndo: true,
      canRedo: _redoStack.length > 0
    })
  },

  // --- Sources ---

  addSource: (source) =>
    set((state) => ({
      sources: [...state.sources, source]
    })),

  removeSource: (id) =>
    set((state) => {
      const sources = state.sources.filter((s) => s.id !== id)
      const transcriptions = { ...state.transcriptions }
      delete transcriptions[id]
      const clips = { ...state.clips }
      delete clips[id]
      return {
        sources,
        transcriptions,
        clips,
        activeSourceId: state.activeSourceId === id ? null : state.activeSourceId
      }
    }),

  setActiveSource: (id) => set({ activeSourceId: id }),

  // --- Transcription ---

  setTranscription: (sourceId, data) =>
    set((state) => ({
      transcriptions: { ...state.transcriptions, [sourceId]: data }
    })),

  // --- Clips ---

  setClips: (sourceId, clips) =>
    set((state) => {
      // Stamp aiStartTime/aiEndTime on first set so Reset Boundaries works later.
      // Preserve existing values if clips are re-set (e.g. after re-score).
      const existing = state.clips[sourceId] ?? []
      const existingMap = new Map(existing.map((c) => [c.id, c]))
      const stamped = clips.map((c) => {
        const prev = existingMap.get(c.id)
        return {
          ...c,
          aiStartTime: prev?.aiStartTime ?? c.startTime,
          aiEndTime: prev?.aiEndTime ?? c.endTime
        }
      })
      return { clips: { ...state.clips, [sourceId]: stamped } }
    }),

  updateClipStatus: (sourceId, clipId, status) => {
    _pushUndo(get())
    set((state) => {
      const sourceClips = state.clips[sourceId]
      if (!sourceClips) return { canUndo: true, canRedo: false }
      return {
        clips: {
          ...state.clips,
          [sourceId]: sourceClips.map((c) => (c.id === clipId ? { ...c, status } : c))
        },
        canUndo: true, canRedo: false
      }
    })
  },

  updateClipTrim: (sourceId, clipId, startTime, endTime) => {
    _pushUndo(get())
    set((state) => {
      const sourceClips = state.clips[sourceId]
      if (!sourceClips) return { canUndo: true, canRedo: false }
      return {
        clips: {
          ...state.clips,
          [sourceId]: sourceClips.map((c) =>
            c.id === clipId
              ? { ...c, startTime, endTime, duration: endTime - startTime }
              : c
          )
        },
        canUndo: true, canRedo: false
      }
    })
  },

  updateClipCrop: (sourceId, clipId, crop) =>
    set((state) => {
      const sourceClips = state.clips[sourceId]
      if (!sourceClips) return {}
      return {
        clips: {
          ...state.clips,
          [sourceId]: sourceClips.map((c) =>
            c.id === clipId ? { ...c, cropRegion: crop } : c
          )
        }
      }
    }),

  updateClipHookText: (sourceId, clipId, hookText) => {
    _pushUndo(get())
    set((state) => {
      const sourceClips = state.clips[sourceId]
      if (!sourceClips) return { canUndo: true, canRedo: false }
      return {
        clips: {
          ...state.clips,
          [sourceId]: sourceClips.map((c) =>
            c.id === clipId ? { ...c, hookText } : c
          )
        },
        canUndo: true, canRedo: false
      }
    })
  },

  updateClipLoop: (sourceId, clipId, loopData) =>
    set((state) => {
      const sourceClips = state.clips[sourceId]
      if (!sourceClips) return {}
      return {
        clips: {
          ...state.clips,
          [sourceId]: sourceClips.map((c) =>
            c.id === clipId ? { ...c, ...loopData } : c
          )
        }
      }
    }),

  setClipVariants: (sourceId, clipId, variants) =>
    set((state) => {
      const sourceClips = state.clips[sourceId]
      if (!sourceClips) return {}
      return {
        clips: {
          ...state.clips,
          [sourceId]: sourceClips.map((c) =>
            c.id === clipId ? { ...c, variants } : c
          )
        }
      }
    }),

  updateVariantStatus: (sourceId, clipId, variantId, status) => {
    _pushUndo(get())
    set((state) => {
      const sourceClips = state.clips[sourceId]
      if (!sourceClips) return { canUndo: true, canRedo: false }
      return {
        clips: {
          ...state.clips,
          [sourceId]: sourceClips.map((c) =>
            c.id === clipId && c.variants
              ? { ...c, variants: c.variants.map((v) => v.id === variantId ? { ...v, status } : v) }
              : c
          )
        },
        canUndo: true, canRedo: false
      }
    })
  },

  approveAll: (sourceId) => {
    _pushUndo(get())
    set((state) => {
      const sourceClips = state.clips[sourceId]
      if (!sourceClips) return { canUndo: true, canRedo: false }
      return {
        clips: {
          ...state.clips,
          [sourceId]: sourceClips.map((c) => ({ ...c, status: 'approved' as const }))
        },
        canUndo: true, canRedo: false
      }
    })
  },

  approveClipsAboveScore: (sourceId, minScore) => {
    _pushUndo(get())
    const sourceClips = get().clips[sourceId]
    if (!sourceClips) return { approved: 0, rejected: 0 }
    let approvedCount = 0
    let rejectedCount = 0
    const updated = sourceClips.map((c) => {
      if (c.score >= minScore) {
        if (c.status !== 'approved') approvedCount++
        return { ...c, status: 'approved' as const }
      } else {
        if (c.status !== 'rejected') rejectedCount++
        return { ...c, status: 'rejected' as const }
      }
    })
    set({
      clips: { ...get().clips, [sourceId]: updated },
      canUndo: true, canRedo: false
    })
    return { approved: approvedCount, rejected: rejectedCount }
  },

  rejectAll: (sourceId) => {
    _pushUndo(get())
    set((state) => {
      const sourceClips = state.clips[sourceId]
      if (!sourceClips) return { canUndo: true, canRedo: false }
      return {
        clips: {
          ...state.clips,
          [sourceId]: sourceClips.map((c) => ({ ...c, status: 'rejected' as const }))
        },
        canUndo: true, canRedo: false
      }
    })
  },

  setSelectedClipIndex: (index) => set({ selectedClipIndex: index }),

  reorderClips: (sourceId, activeId, overId) => {
    set((state) => {
      // Get current order or build from existing clip IDs
      const sourceClips = state.clips[sourceId]
      if (!sourceClips) return {}
      let order = state.clipOrder[sourceId] ?? sourceClips.map((c) => c.id)
      const activeIndex = order.indexOf(activeId)
      const overIndex = order.indexOf(overId)
      if (activeIndex === -1 || overIndex === -1) return {}
      // arrayMove: remove from old position, insert at new
      const newOrder = [...order]
      newOrder.splice(activeIndex, 1)
      newOrder.splice(overIndex, 0, activeId)
      return {
        clipOrder: { ...state.clipOrder, [sourceId]: newOrder },
        customOrder: true
      }
    })
  },

  setCustomOrder: (custom) => set({ customOrder: custom }),

  // --- Batch multi-select ---

  toggleClipSelection: (clipId) =>
    set((state) => {
      const next = new Set(state.selectedClipIds)
      if (next.has(clipId)) {
        next.delete(clipId)
      } else {
        next.add(clipId)
      }
      return { selectedClipIds: next }
    }),

  selectAllVisible: (clipIds) =>
    set({ selectedClipIds: new Set(clipIds) }),

  clearSelection: () =>
    set({ selectedClipIds: new Set<string>() }),

  batchUpdateClips: (sourceId, clipIds, updates) => {
    _pushUndo(get())
    set((state) => {
      const sourceClips = state.clips[sourceId]
      if (!sourceClips) return { canUndo: true, canRedo: false }
      const idSet = new Set(clipIds)
      const updated = sourceClips.map((c) => {
        if (!idSet.has(c.id)) return c
        let next = { ...c }
        if (updates.status !== undefined) {
          next = { ...next, status: updates.status }
        }
        if (updates.trimOffsetSeconds !== undefined && updates.trimOffsetSeconds !== 0) {
          const offset = updates.trimOffsetSeconds
          const newStart = Math.max(0, c.startTime + offset)
          const newEnd = c.endTime + offset
          if (newEnd > newStart + 0.5) {
            next = { ...next, startTime: newStart, endTime: newEnd, duration: newEnd - newStart }
          }
        }
        if (updates.overrides !== undefined) {
          next = { ...next, overrides: { ...c.overrides, ...updates.overrides } }
        }
        return next
      })
      return {
        clips: { ...state.clips, [sourceId]: updated },
        canUndo: true,
        canRedo: false
      }
    })
  },

  setClipPartInfo: (sourceId, clipId, partInfo) =>
    set((state) => {
      const sourceClips = state.clips[sourceId]
      if (!sourceClips) return {}
      return {
        clips: {
          ...state.clips,
          [sourceId]: sourceClips.map((c) =>
            c.id === clipId ? { ...c, partInfo } : c
          )
        }
      }
    }),

  setClipOverride: (sourceId, clipId, key, value) =>
    set((state) => {
      const sourceClips = state.clips[sourceId]
      if (!sourceClips) return {}
      return {
        clips: {
          ...state.clips,
          [sourceId]: sourceClips.map((c) =>
            c.id === clipId
              ? { ...c, overrides: { ...c.overrides, [key]: value } }
              : c
          )
        }
      }
    }),

  clearClipOverrides: (sourceId, clipId) =>
    set((state) => {
      const sourceClips = state.clips[sourceId]
      if (!sourceClips) return {}
      return {
        clips: {
          ...state.clips,
          [sourceId]: sourceClips.map((c) =>
            c.id === clipId ? { ...c, overrides: undefined } : c
          )
        }
      }
    }),

  resetClipBoundaries: (sourceId, clipId) => {
    _pushUndo(get())
    set((state) => {
      const sourceClips = state.clips[sourceId]
      if (!sourceClips) return { canUndo: true, canRedo: false }
      return {
        clips: {
          ...state.clips,
          [sourceId]: sourceClips.map((c) => {
            if (c.id !== clipId) return c
            const start = c.aiStartTime ?? c.startTime
            const end = c.aiEndTime ?? c.endTime
            return { ...c, startTime: start, endTime: end, duration: end - start }
          })
        },
        canUndo: true, canRedo: false
      }
    })
  },

  rescoreClip: (sourceId, clipId, newScore, newReasoning, newHookText) =>
    set((state) => {
      const sourceClips = state.clips[sourceId]
      if (!sourceClips) return {}
      return {
        clips: {
          ...state.clips,
          [sourceId]: sourceClips.map((c) => {
            if (c.id !== clipId) return c
            return {
              ...c,
              score: newScore,
              reasoning: newReasoning,
              // Only update hook text if provided and non-empty
              ...(newHookText ? { hookText: newHookText } : {}),
              // Preserve originalScore: set on first rescore only
              originalScore: c.originalScore ?? c.score
            }
          })
        }
      }
    }),

  // --- Stitched Clips ---

  setStitchedClips: (sourceId, clips) =>
    set((state) => ({
      stitchedClips: { ...state.stitchedClips, [sourceId]: clips }
    })),

  updateStitchedClipStatus: (sourceId, clipId, status) => {
    _pushUndo(get())
    set((state) => {
      const sourceClips = state.stitchedClips[sourceId]
      if (!sourceClips) return { canUndo: true, canRedo: false }
      return {
        stitchedClips: {
          ...state.stitchedClips,
          [sourceId]: sourceClips.map((c) => (c.id === clipId ? { ...c, status } : c))
        },
        canUndo: true, canRedo: false
      }
    })
  },

  // --- Story Arcs ---

  setStoryArcs: (sourceId, arcs) =>
    set((state) => ({
      storyArcs: { ...state.storyArcs, [sourceId]: arcs }
    })),

  // --- Pipeline ---

  setPipeline: (progress) => set({ pipeline: progress }),

  // --- Render ---

  setRenderProgress: (progress) => set({ renderProgress: progress }),
  setIsRendering: (rendering) => set({ isRendering: rendering }),
  setRenderError: (clipId, error) =>
    set((state) => ({ renderErrors: { ...state.renderErrors, [clipId]: error } })),
  clearRenderErrors: () => set({ renderErrors: {} }),

  setSingleRenderState: (patch) =>
    set((state) => ({
      singleRenderClipId: 'clipId' in patch ? (patch.clipId ?? null) : state.singleRenderClipId,
      singleRenderProgress: patch.progress !== undefined ? patch.progress : state.singleRenderProgress,
      singleRenderStatus: patch.status !== undefined ? patch.status : state.singleRenderStatus,
      singleRenderOutputPath: 'outputPath' in patch ? (patch.outputPath ?? null) : state.singleRenderOutputPath,
      singleRenderError: 'error' in patch ? (patch.error ?? null) : state.singleRenderError,
    })),

  // --- Settings ---

  setGeminiApiKey: (key) => {
    localStorage.setItem('batchcontent-gemini-key', key)
    set((state) => ({ settings: { ...state.settings, geminiApiKey: key } }))
  },

  setOutputDirectory: (dir) =>
    set((state) => ({ settings: { ...state.settings, outputDirectory: dir } })),

  setMinScore: (score) => {
    _pushUndo(get())
    set((state) => ({ settings: { ...state.settings, minScore: score }, canUndo: true, canRedo: false }))
  },

  setCaptionStyle: (style) =>
    set((state) => ({ settings: { ...state.settings, captionStyle: style } })),

  setCaptionsEnabled: (enabled) =>
    set((state) => ({ settings: { ...state.settings, captionsEnabled: enabled } })),

  setSoundDesignEnabled: (enabled) =>
    set((state) => ({
      settings: {
        ...state.settings,
        soundDesign: { ...state.settings.soundDesign, enabled }
      }
    })),

  setSoundDesignTrack: (track) =>
    set((state) => ({
      settings: {
        ...state.settings,
        soundDesign: { ...state.settings.soundDesign, backgroundMusicTrack: track }
      }
    })),

  setSoundDesignSfxVolume: (volume) =>
    set((state) => ({
      settings: {
        ...state.settings,
        soundDesign: { ...state.settings.soundDesign, sfxVolume: volume }
      }
    })),

  setSoundDesignMusicVolume: (volume) =>
    set((state) => ({
      settings: {
        ...state.settings,
        soundDesign: { ...state.settings.soundDesign, musicVolume: volume }
      }
    })),

  setAutoZoomEnabled: (enabled) =>
    set((state) => ({
      settings: {
        ...state.settings,
        autoZoom: { ...state.settings.autoZoom, enabled }
      }
    })),

  setAutoZoomIntensity: (intensity) =>
    set((state) => ({
      settings: {
        ...state.settings,
        autoZoom: { ...state.settings.autoZoom, intensity }
      }
    })),

  setAutoZoomInterval: (intervalSeconds) =>
    set((state) => ({
      settings: {
        ...state.settings,
        autoZoom: { ...state.settings.autoZoom, intervalSeconds }
      }
    })),

  // --- Hook Title Overlay ---

  setHookTitleEnabled: (enabled) =>
    set((state) => ({
      settings: {
        ...state.settings,
        hookTitleOverlay: { ...state.settings.hookTitleOverlay, enabled }
      }
    })),

  setHookTitleStyle: (style) =>
    set((state) => ({
      settings: {
        ...state.settings,
        hookTitleOverlay: { ...state.settings.hookTitleOverlay, style }
      }
    })),

  setHookTitleDisplayDuration: (displayDuration) =>
    set((state) => ({
      settings: {
        ...state.settings,
        hookTitleOverlay: { ...state.settings.hookTitleOverlay, displayDuration }
      }
    })),

  setHookTitleFontSize: (fontSize) =>
    set((state) => ({
      settings: {
        ...state.settings,
        hookTitleOverlay: { ...state.settings.hookTitleOverlay, fontSize }
      }
    })),

  setHookTitleTextColor: (textColor) =>
    set((state) => ({
      settings: {
        ...state.settings,
        hookTitleOverlay: { ...state.settings.hookTitleOverlay, textColor }
      }
    })),

  setHookTitleOutlineColor: (outlineColor) =>
    set((state) => ({
      settings: {
        ...state.settings,
        hookTitleOverlay: { ...state.settings.hookTitleOverlay, outlineColor }
      }
    })),

  setHookTitleOutlineWidth: (outlineWidth) =>
    set((state) => ({
      settings: {
        ...state.settings,
        hookTitleOverlay: { ...state.settings.hookTitleOverlay, outlineWidth }
      }
    })),

  // --- Re-hook Overlay ---

  setRehookEnabled: (enabled) =>
    set((state) => ({
      settings: {
        ...state.settings,
        rehookOverlay: { ...state.settings.rehookOverlay, enabled }
      }
    })),

  setRehookStyle: (style) =>
    set((state) => ({
      settings: {
        ...state.settings,
        rehookOverlay: { ...state.settings.rehookOverlay, style }
      }
    })),

  setRehookDisplayDuration: (displayDuration) =>
    set((state) => ({
      settings: {
        ...state.settings,
        rehookOverlay: { ...state.settings.rehookOverlay, displayDuration }
      }
    })),

  setRehookFontSize: (fontSize) =>
    set((state) => ({
      settings: {
        ...state.settings,
        rehookOverlay: { ...state.settings.rehookOverlay, fontSize }
      }
    })),

  setRehookTextColor: (textColor) =>
    set((state) => ({
      settings: {
        ...state.settings,
        rehookOverlay: { ...state.settings.rehookOverlay, textColor }
      }
    })),

  setRehookOutlineColor: (outlineColor) =>
    set((state) => ({
      settings: {
        ...state.settings,
        rehookOverlay: { ...state.settings.rehookOverlay, outlineColor }
      }
    })),

  setRehookPositionFraction: (positionFraction) =>
    set((state) => ({
      settings: {
        ...state.settings,
        rehookOverlay: { ...state.settings.rehookOverlay, positionFraction }
      }
    })),

  // --- Progress Bar Overlay ---

  setProgressBarEnabled: (enabled) =>
    set((state) => ({
      settings: {
        ...state.settings,
        progressBarOverlay: { ...state.settings.progressBarOverlay, enabled }
      }
    })),

  setProgressBarPosition: (position) =>
    set((state) => ({
      settings: {
        ...state.settings,
        progressBarOverlay: { ...state.settings.progressBarOverlay, position }
      }
    })),

  setProgressBarHeight: (height) =>
    set((state) => ({
      settings: {
        ...state.settings,
        progressBarOverlay: { ...state.settings.progressBarOverlay, height }
      }
    })),

  setProgressBarColor: (color) =>
    set((state) => ({
      settings: {
        ...state.settings,
        progressBarOverlay: { ...state.settings.progressBarOverlay, color }
      }
    })),

  setProgressBarOpacity: (opacity) =>
    set((state) => ({
      settings: {
        ...state.settings,
        progressBarOverlay: { ...state.settings.progressBarOverlay, opacity }
      }
    })),

  setProgressBarStyle: (style) =>
    set((state) => ({
      settings: {
        ...state.settings,
        progressBarOverlay: { ...state.settings.progressBarOverlay, style }
      }
    })),

  // --- Brand Kit ---

  setBrandKitEnabled: (enabled) =>
    set((state) => ({
      settings: {
        ...state.settings,
        brandKit: { ...state.settings.brandKit, enabled }
      }
    })),

  setBrandKitLogoPath: (path) =>
    set((state) => ({
      settings: {
        ...state.settings,
        brandKit: { ...state.settings.brandKit, logoPath: path }
      }
    })),

  setBrandKitLogoPosition: (position) =>
    set((state) => ({
      settings: {
        ...state.settings,
        brandKit: { ...state.settings.brandKit, logoPosition: position }
      }
    })),

  setBrandKitLogoScale: (scale) =>
    set((state) => ({
      settings: {
        ...state.settings,
        brandKit: { ...state.settings.brandKit, logoScale: scale }
      }
    })),

  setBrandKitLogoOpacity: (opacity) =>
    set((state) => ({
      settings: {
        ...state.settings,
        brandKit: { ...state.settings.brandKit, logoOpacity: opacity }
      }
    })),

  setBrandKitIntroBumperPath: (path) =>
    set((state) => ({
      settings: {
        ...state.settings,
        brandKit: { ...state.settings.brandKit, introBumperPath: path }
      }
    })),

  setBrandKitOutroBumperPath: (path) =>
    set((state) => ({
      settings: {
        ...state.settings,
        brandKit: { ...state.settings.brandKit, outroBumperPath: path }
      }
    })),

  // --- B-Roll ---

  setBRollEnabled: (enabled) =>
    set((state) => ({
      settings: {
        ...state.settings,
        broll: { ...state.settings.broll, enabled }
      }
    })),

  setBRollPexelsApiKey: (key) => {
    localStorage.setItem('batchcontent-pexels-key', key)
    set((state) => ({
      settings: {
        ...state.settings,
        broll: { ...state.settings.broll, pexelsApiKey: key }
      }
    }))
  },

  setBRollIntervalSeconds: (intervalSeconds) =>
    set((state) => ({
      settings: {
        ...state.settings,
        broll: { ...state.settings.broll, intervalSeconds }
      }
    })),

  setBRollClipDuration: (clipDuration) =>
    set((state) => ({
      settings: {
        ...state.settings,
        broll: { ...state.settings.broll, clipDuration }
      }
    })),

  // --- Filler Removal ---

  setFillerRemovalEnabled: (enabled) =>
    set((state) => ({
      settings: {
        ...state.settings,
        fillerRemoval: { ...state.settings.fillerRemoval, enabled }
      }
    })),

  setFillerRemovalFillerWords: (removeFillerWords) =>
    set((state) => ({
      settings: {
        ...state.settings,
        fillerRemoval: { ...state.settings.fillerRemoval, removeFillerWords }
      }
    })),

  setFillerRemovalSilences: (trimSilences) =>
    set((state) => ({
      settings: {
        ...state.settings,
        fillerRemoval: { ...state.settings.fillerRemoval, trimSilences }
      }
    })),

  setFillerRemovalRepeats: (removeRepeats) =>
    set((state) => ({
      settings: {
        ...state.settings,
        fillerRemoval: { ...state.settings.fillerRemoval, removeRepeats }
      }
    })),

  setFillerRemovalSilenceThreshold: (silenceThreshold) =>
    set((state) => ({
      settings: {
        ...state.settings,
        fillerRemoval: { ...state.settings.fillerRemoval, silenceThreshold }
      }
    })),

  setFillerRemovalWordList: (fillerWords) =>
    set((state) => ({
      settings: {
        ...state.settings,
        fillerRemoval: { ...state.settings.fillerRemoval, fillerWords }
      }
    })),

  // --- Notifications ---

  setEnableNotifications: (enabled) =>
    set((state) => ({
      settings: { ...state.settings, enableNotifications: enabled }
    })),

  // --- Developer Mode ---

  setDeveloperMode: (enabled) =>
    set((state) => ({
      settings: { ...state.settings, developerMode: enabled }
    })),

  // --- Render Quality ---

  setRenderQuality: (quality) =>
    set((state) => ({
      settings: {
        ...state.settings,
        renderQuality: { ...state.settings.renderQuality, ...quality }
      }
    })),

  // --- Output Aspect Ratio ---

  setOutputAspectRatio: (ratio) =>
    set((state) => ({
      settings: { ...state.settings, outputAspectRatio: ratio }
    })),

  // --- Filename Template ---

  setFilenameTemplate: (template) =>
    set((state) => ({
      settings: { ...state.settings, filenameTemplate: template }
    })),

  // --- Render Concurrency ---

  setRenderConcurrency: (concurrency) =>
    set((state) => ({
      settings: { ...state.settings, renderConcurrency: Math.max(1, Math.min(4, concurrency)) }
    })),

  // --- Reset Settings ---

  resetSettings: () =>
    set((state) => ({
      settings: {
        ...DEFAULT_SETTINGS,
        // Preserve secrets and machine-specific values
        geminiApiKey: state.settings.geminiApiKey,
        outputDirectory: state.settings.outputDirectory,
        broll: {
          ...DEFAULT_SETTINGS.broll,
          pexelsApiKey: state.settings.broll.pexelsApiKey
        }
      }
    })),

  resetSection: (section) =>
    set((state) => {
      switch (section) {
        case 'aiSettings':
          return { settings: { ...state.settings, minScore: DEFAULT_SETTINGS.minScore } }
        case 'captions':
          return {
            settings: {
              ...state.settings,
              captionsEnabled: DEFAULT_SETTINGS.captionsEnabled,
              captionStyle: DEFAULT_SETTINGS.captionStyle
            }
          }
        case 'soundDesign':
          return { settings: { ...state.settings, soundDesign: DEFAULT_SETTINGS.soundDesign } }
        case 'autoZoom':
          return { settings: { ...state.settings, autoZoom: DEFAULT_SETTINGS.autoZoom } }
        case 'brandKit':
          return { settings: { ...state.settings, brandKit: DEFAULT_SETTINGS.brandKit } }
        case 'hookTitle':
          return { settings: { ...state.settings, hookTitleOverlay: DEFAULT_SETTINGS.hookTitleOverlay } }
        case 'rehook':
          return { settings: { ...state.settings, rehookOverlay: DEFAULT_SETTINGS.rehookOverlay } }
        case 'progressBar':
          return { settings: { ...state.settings, progressBarOverlay: DEFAULT_SETTINGS.progressBarOverlay } }
        case 'fillerRemoval':
          return { settings: { ...state.settings, fillerRemoval: DEFAULT_SETTINGS.fillerRemoval } }
        case 'broll':
          return {
            settings: {
              ...state.settings,
              broll: {
                ...DEFAULT_SETTINGS.broll,
                pexelsApiKey: state.settings.broll.pexelsApiKey
              }
            }
          }
        case 'renderQuality':
          return { settings: { ...state.settings, renderQuality: DEFAULT_SETTINGS.renderQuality } }
        default:
          return {}
      }
    }),

  // --- Processing Config ---

  setProcessingConfig: (config) =>
    set((state) => ({
      processingConfig: { ...state.processingConfig, ...config }
    })),

  resetProcessingConfig: () => set({ processingConfig: DEFAULT_PROCESSING_CONFIG }),

  // --- Auto Mode ---

  setAutoMode: (config) =>
    set((state) => ({
      autoMode: { ...state.autoMode, ...config }
    })),

  setAutoModeResult: (result) => set({ autoModeResult: result }),

  // --- Python setup ---

  setPythonStatus: (status) => set({ pythonStatus: status }),
  setPythonSetupError: (error) => set({ pythonSetupError: error }),
  setPythonSetupProgress: (progress) => set({ pythonSetupProgress: progress }),

  // --- Errors ---

  addError: (entry) =>
    set((state) => ({
      errorLog: [...state.errorLog, { ...entry, id: uuidv4(), timestamp: Date.now() }]
    })),

  clearErrors: () => set({ errorLog: [] }),

  // --- Network Status ---

  setIsOnline: (online) => set({ isOnline: online }),

  // --- Computed ---

  getApprovedClips: (sourceId) => {
    const sourceClips = get().clips[sourceId] ?? []
    return sourceClips.filter((c) => c.status === 'approved')
  },

  getActiveSource: () => {
    const { sources, activeSourceId } = get()
    return sources.find((s) => s.id === activeSourceId) ?? null
  },

  getActiveTranscription: () => {
    const { transcriptions, activeSourceId } = get()
    if (!activeSourceId) return null
    return transcriptions[activeSourceId] ?? null
  },

  getActiveClips: () => {
    const { clips, activeSourceId } = get()
    if (!activeSourceId) return []
    const sourceClips = clips[activeSourceId] ?? []
    return [...sourceClips].sort((a, b) => b.score - a.score)
  },

  // --- Project ---

  saveProject: async () => {
    const state = get()
    const project = {
      version: 1,
      sources: state.sources,
      transcriptions: state.transcriptions,
      clips: state.clips,
      settings: state.settings
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const api = (window as any).api
      if (typeof api?.saveProject === 'function') {
        return await api.saveProject(JSON.stringify(project, null, 2))
      }
      return null
    } catch {
      return null
    }
  },

  loadProject: async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const api = (window as any).api
      if (typeof api?.loadProject !== 'function') return false
      const data = await api.loadProject()
      if (!data) return false
      const project = JSON.parse(data)
      set({
        sources: project.sources ?? [],
        transcriptions: project.transcriptions ?? {},
        clips: project.clips ?? {},
        settings: {
          ...DEFAULT_SETTINGS,
          ...(project.settings ?? {})
        },
        pipeline: DEFAULT_PIPELINE,
        renderProgress: [],
        isRendering: false,
        renderStartedAt: null,
        renderCompletedAt: null,
        clipRenderTimes: {},
        errorLog: [],
        activeSourceId: null
      })
      return true
    } catch {
      return false
    }
  },

  loadProjectFromPath: async (filePath) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const api = (window as any).api
      if (typeof api?.loadProjectFromPath !== 'function') return false
      const data = await api.loadProjectFromPath(filePath)
      if (!data) return false
      const project = JSON.parse(data)
      set({
        sources: project.sources ?? [],
        transcriptions: project.transcriptions ?? {},
        clips: project.clips ?? {},
        settings: {
          ...DEFAULT_SETTINGS,
          ...(project.settings ?? {})
        },
        pipeline: DEFAULT_PIPELINE,
        renderProgress: [],
        isRendering: false,
        renderStartedAt: null,
        renderCompletedAt: null,
        clipRenderTimes: {},
        errorLog: [],
        activeSourceId: null
      })
      return true
    } catch {
      return false
    }
  },

  reset: () =>
    set({
      sources: [],
      activeSourceId: null,
      transcriptions: {},
      clips: {},
      pipeline: DEFAULT_PIPELINE,
      renderProgress: [],
      isRendering: false,
      renderStartedAt: null,
      renderCompletedAt: null,
      clipRenderTimes: {},
      errorLog: []
    }),

  // --- Theme ---

  setTheme: (theme) => {
    localStorage.setItem('batchcontent-theme', theme)
    set({ theme })
  },

  // --- Batch Queue ---

  enqueueSources: (sourceIds) => {
    const initialResults: Record<string, QueueResult> = {}
    for (const id of sourceIds) {
      initialResults[id] = { status: 'pending' }
    }
    set((state) => ({
      processingQueue: sourceIds,
      queueMode: true,
      queuePaused: false,
      queueResults: { ...state.queueResults, ...initialResults }
    }))
  },

  dequeueNext: () => {
    const { processingQueue } = get()
    if (processingQueue.length === 0) return null
    const [next, ...rest] = processingQueue
    set({ processingQueue: rest })
    return next
  },

  markQueueItemProcessing: (sourceId) =>
    set((state) => ({
      queueResults: {
        ...state.queueResults,
        [sourceId]: { status: 'processing' }
      }
    })),

  markQueueItemDone: (sourceId, clipCount) =>
    set((state) => ({
      queueResults: {
        ...state.queueResults,
        [sourceId]: { status: 'done', clipCount }
      }
    })),

  markQueueItemError: (sourceId, error) =>
    set((state) => ({
      queueResults: {
        ...state.queueResults,
        [sourceId]: { status: 'error', error }
      }
    })),

  pauseQueue: () => set({ queuePaused: true }),

  resumeQueue: () => set({ queuePaused: false }),

  clearQueue: () =>
    set({
      processingQueue: [],
      queueMode: false,
      queuePaused: false,
      queueResults: {}
    }),

  skipQueueItem: () => {
    const { processingQueue, activeSourceId, queueResults } = get()
    if (processingQueue.length === 0) {
      // No more items — queue is done
      set({ queueMode: false })
      return
    }
    // Mark current active source as skipped (error with 'Skipped' message)
    const updated: Record<string, QueueResult> = { ...queueResults }
    if (activeSourceId && updated[activeSourceId]?.status === 'processing') {
      updated[activeSourceId] = { status: 'error', error: 'Skipped' }
    }
    set({ queueResults: updated })
  },

  // --- Hook Text Templates ---

  setActiveHookTemplateId: (id) => {
    if (id === null) {
      localStorage.removeItem(ACTIVE_HOOK_TEMPLATE_KEY)
    } else {
      localStorage.setItem(ACTIVE_HOOK_TEMPLATE_KEY, id)
    }
    set({ activeHookTemplateId: id })
  },

  addHookTemplate: (template) => {
    const newTemplate: HookTextTemplate = { ...template, id: uuidv4(), builtIn: false }
    const updated = [...get().hookTemplates, newTemplate]
    saveHookTemplatesToStorage(updated)
    set({ hookTemplates: updated })
  },

  editHookTemplate: (id, updates) => {
    const updated = get().hookTemplates.map((t) =>
      t.id === id && !t.builtIn ? { ...t, ...updates } : t
    )
    saveHookTemplatesToStorage(updated)
    set({ hookTemplates: updated })
  },

  removeHookTemplate: (id) => {
    const updated = get().hookTemplates.filter((t) => t.id !== id || t.builtIn)
    saveHookTemplatesToStorage(updated)
    const activeHookTemplateId = get().activeHookTemplateId === id ? null : get().activeHookTemplateId
    if (activeHookTemplateId === null) localStorage.removeItem(ACTIVE_HOOK_TEMPLATE_KEY)
    set({ hookTemplates: updated, activeHookTemplateId })
  },

  // --- Clip Comparison ---

  setComparisonClips: (idA, idB) => set({ comparisonClipIds: [idA, idB] }),
  clearComparison: () => set({ comparisonClipIds: null }),

  // --- Onboarding ---

  setOnboardingComplete: () => {
    localStorage.setItem('batchcontent-onboarding-done', 'true')
    set({ hasCompletedOnboarding: true })
  },

  // --- What's New / Changelog ---

  setLastSeenVersion: (version) => {
    localStorage.setItem('batchcontent-last-seen-version', version)
    set({ lastSeenVersion: version })
  },

  // --- AI Token Usage ---

  trackTokenUsage: (event) =>
    set((state) => {
      const MAX_HISTORY = 200
      const history = state.aiUsage.callHistory
      const newHistory = history.length >= MAX_HISTORY
        ? [...history.slice(-(MAX_HISTORY - 1)), event]
        : [...history, event]
      return {
        aiUsage: {
          ...state.aiUsage,
          totalPromptTokens: state.aiUsage.totalPromptTokens + event.promptTokens,
          totalCompletionTokens: state.aiUsage.totalCompletionTokens + event.completionTokens,
          totalCalls: state.aiUsage.totalCalls + 1,
          callHistory: newHistory
        }
      }
    }),

  resetAiUsage: () =>
    set({
      aiUsage: {
        totalPromptTokens: 0,
        totalCompletionTokens: 0,
        totalCalls: 0,
        callHistory: [],
        sessionStarted: Date.now()
      }
    })
}))
