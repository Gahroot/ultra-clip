import { ElectronAPI } from '@electron-toolkit/preload'

interface VideoMetadata {
  duration: number
  width: number
  height: number
  codec: string
  fps: number
  audioCodec: string
}

interface YouTubeDownloadResult {
  path: string
  title: string
  duration: number
}

interface WordTimestamp {
  text: string
  start: number
  end: number
}

interface SegmentTimestamp {
  text: string
  start: number
  end: number
}

interface TranscriptionResult {
  text: string
  words: WordTimestamp[]
  segments: SegmentTimestamp[]
}

interface TranscriptionProgress {
  stage: 'extracting-audio' | 'downloading-model' | 'loading-model' | 'transcribing'
  message: string
  /** 0–100, present during downloading-model stage */
  percent?: number
}

interface ScoredSegment {
  startTime: number
  endTime: number
  text: string
  score: number
  hookText: string
  reasoning: string
}

interface ScoringResult {
  segments: ScoredSegment[]
  summary: string
  keyTopics: string[]
}

interface ScoringProgress {
  stage: 'sending' | 'analyzing' | 'validating'
  message: string
}

interface CropRegion {
  x: number
  y: number
  width: number
  height: number
  faceDetected: boolean
}

interface FaceDetectionProgress {
  segment: number
  total: number
}

/** A single entry in a face-tracking timeline produced by `detectFaceTimeline`. */
interface FaceTimelineEntry {
  /** Timestamp in seconds from the start of the video. */
  t: number
  /** Left edge of the 9:16 crop rectangle (source-video pixels). */
  x: number
  /** Top edge of the 9:16 crop rectangle (source-video pixels). */
  y: number
  /** Width of the crop rectangle. */
  width: number
  /** Height of the crop rectangle. */
  height: number
  /** Whether a face was detected in this frame (false = centre-crop fallback). */
  faceDetected: boolean
}

interface SoundDesignSettings {
  enabled: boolean
  backgroundMusicTrack: 'ambient-tech' | 'ambient-motivational' | 'ambient-chill'
  sfxVolume: number
  musicVolume: number
  musicDucking: boolean
  musicDuckLevel: number
  sfxStyle: 'minimal' | 'standard' | 'energetic'
}

interface AutoZoomSettings {
  enabled: boolean
  mode: 'ken-burns' | 'reactive' | 'jump-cut'
  intensity: 'subtle' | 'medium' | 'dynamic'
  intervalSeconds: number
}

interface BrandKitSettings {
  enabled: boolean
  logoPath: string | null
  logoPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  /** Fraction of frame width (0.05–0.30). */
  logoScale: number
  /** Opacity 0–1. */
  logoOpacity: number
  introBumperPath: string | null
  outroBumperPath: string | null
}

interface HookTitleOverlaySettings {
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

interface RehookOverlaySettings {
  enabled: boolean
  style: 'bar' | 'text-only' | 'slide-up'
  displayDuration: number
  fadeIn: number
  fadeOut: number
  positionFraction: number
}

// ---- Velocity Style -------------------------------------------------------

type VelocitySegmentStyle = 'default' | 'impact' | 'chill' | 'emphasis' | 'split-screen'
type VelocityTransition = 'cut' | 'flash' | 'fade' | 'zoom-blur'

interface VelocityOptions {
  enabled: boolean
  segmentStyle: VelocitySegmentStyle
  glitchScanlines: boolean
  glitchIntensity: number
  lightLeak: boolean
  lightLeakOpacity: number
  particles: boolean
  vignette: boolean
  vignetteStrength: number
  colorGrade: boolean
  saturation: number
  contrast: number
  warmth: number
  primaryText: string
  primaryTextDuration: number
  secondaryText: string
  secondaryTextDuration: number
  accentTag: string
  lowerThird: boolean
  lowerThirdText: string
  calloutRing: boolean
  calloutX: number
  calloutY: number
  priceStatCard: boolean
  priceStatValue: string
  priceStatLabel: string
  stepCounter: boolean
  stepNumber: number
  stepTotal: number
  arrowPointer: boolean
  arrowX: number
  arrowY: number
  velocityProgressBar: boolean
  velocityProgressBarColor: string
  transitionIn: VelocityTransition
  transitionDuration: number
}

// ---- Prime AI Render Style ------------------------------------------------

type PrimeSegmentStyle = 'clean' | 'cinematic' | 'spotlight' | 'editorial'

interface PrimeTextOverlay {
  text: string
  startTime: number
  duration: number
  yFraction?: number
  fontSize?: number
  color?: string
  withPanel?: boolean
}

interface PrimeImageOverlay {
  imagePath: string
  startTime: number
  duration: number
  x?: number
  y?: number
  width?: number
  opacity?: number
}

interface PrimeAIOptions {
  enabled: boolean
  segmentStyle: PrimeSegmentStyle
  accentColor: string
  showBanner: boolean
  showFloatingCurrency: boolean
  currencyText: string
  showSparkles: boolean
  showFullscreenText: boolean
  fullscreenText: string
  fullscreenTextTime: number
  fullscreenTextDuration: number
  showBadge: boolean
  badgeText: string
  badgePosition: 'top-left' | 'top-right'
  showSubtitleStyle: boolean
  showProgressBar: boolean
  textOverlays: PrimeTextOverlay[]
  imageOverlays: PrimeImageOverlay[]
}

interface RenderClipJob {
  clipId: string
  sourceVideoPath: string
  startTime: number
  endTime: number
  cropRegion?: { x: number; y: number; width: number; height: number }
  /**
   * Face-tracking timeline for animated crop.
   * When ≥ 2 entries are present, the render pipeline uses an animated crop
   * that pans with the face instead of the static cropRegion.
   * Times are clip-relative (0-based, seconds).
   */
  faceTimeline?: Array<{ t: number; x: number; y: number; w: number; h: number }>
  /** Path to a pre-generated .ass subtitle file to burn in */
  assFilePath?: string
  /** Optional override for the output filename (without extension) */
  outputFileName?: string
  /**
   * Word-level timestamps (relative to source video) for sound design.
   * The main process uses these to compute sound placements per clip.
   */
  wordTimestamps?: { text: string; start: number; end: number }[]
  /**
   * AI-generated hook title text to overlay in the first few seconds.
   * Corresponds to ClipCandidate.hookText from the scoring step.
   */
  hookTitleText?: string
  /**
   * Pre-generated re-hook / pattern interrupt text for the mid-clip overlay.
   * If omitted, the main process picks a deterministic default phrase.
   */
  rehookText?: string
  /** Loop optimization strategy (e.g. 'crossfade', 'hard-cut', 'thematic') */
  loopStrategy?: string
  /** Audio crossfade duration in seconds (only used when loopStrategy === 'crossfade') */
  crossfadeDuration?: number
  /**
   * When present, this job represents a stitched (multi-segment) clip.
   * The pipeline assembles the segments into a single MP4 then runs the
   * regular feature pipeline on the assembled output — stitched clips go
   * through the same editing pipeline as regular clips.
   */
  stitchedSegments?: Array<{
    startTime: number
    endTime: number
    overlayText?: string
    role?: string
  }>
  /** Pre-computed word emphasis (normal/emphasis/supersize per word). Bypasses heuristic when present. */
  wordEmphasis?: Array<{ text: string; start: number; end: number; emphasis: 'normal' | 'emphasis' | 'supersize' }>
  /** Pre-computed emphasis keyframes for reactive zoom. Bypasses in-pipeline computation when present. */
  emphasisKeyframesInput?: Array<{ time: number; end: number; level: 'emphasis' | 'supersize' }>
  /** Pre-computed edit events for sound design sync. Merged with internally derived events. */
  editEvents?: Array<{ type: 'broll-transition' | 'jump-cut'; time: number; transition?: string }>
  /** AI edit plan SFX suggestions — injected as edit events for sound design. */
  aiSfxSuggestions?: Array<{ timestamp: number; type: string }>
  /** AI edit plan B-Roll suggestions — seeds keyword search for B-Roll placement engine. */
  brollSuggestions?: Array<{
    timestamp: number
    duration: number
    keyword: string
    displayMode: 'fullscreen' | 'split-top' | 'split-bottom' | 'pip'
    transition: 'hard-cut' | 'crossfade' | 'swipe-up' | 'swipe-down'
  }>
  /** ID of the active edit style preset (informational, not consumed by render features). */
  stylePresetId?: string
  /**
   * When present, the pipeline routes this job through renderSegmentedClip()
   * which renders each segment independently with its own layout, zoom, and caption
   * settings, then concatenates with transitions.
   */
  segmentedSegments?: Array<{
    startTime: number
    endTime: number
    styleVariantId?: string
    zoomStyle: 'none' | 'drift' | 'snap' | 'word-pulse' | 'zoom-out'
    zoomIntensity: number
    transitionIn: string
    overlayText?: string
    accentColor?: string
    captionBgOpacity?: number
    imagePath?: string
    cropRect?: { x: number; y: number; width: number; height: number }
  }>
}

// ---- Pulse AI Render Style ------------------------------------------------

interface PulseAIOptions {
  enabled: boolean
  accentColor: string
  showGrid: boolean
  gridSize: number
  gridOpacity: number
  showFrameBorder: boolean
  borderThickness: number
  showStatusBar: boolean
  statusBarText: string
  showCornerBrackets: boolean
  showDataReadouts: boolean
  showProgressBar: boolean
  showGlowPulse: boolean
  glowPulsePeriod: number
  showScanLine: boolean
  showDataParticles: boolean
}

interface RenderBatchOptions {
  jobs: RenderClipJob[]
  outputDirectory: string
  /** Sound design settings — if enabled, the main process computes SFX/music placements */
  soundDesign?: SoundDesignSettings
  /** Ken Burns auto-zoom settings applied to every rendered clip */
  autoZoom?: AutoZoomSettings
  /** Brand kit (logo watermark + bumpers) applied to every rendered clip */
  brandKit?: BrandKitSettings
  /** Hook title overlay — burns AI-generated hook text into first 1-3 seconds of each clip */
  hookTitleOverlay?: HookTitleOverlaySettings
  /** Re-hook overlay — burns mid-clip pattern interrupt text to reset viewer attention */
  rehookOverlay?: RehookOverlaySettings
  /** When true, all FFmpeg commands are sent back in render events for debug logging. */
  developerMode?: boolean
  /** Number of clips to render concurrently (1–4). GPU encoders are capped at 2. */
  renderConcurrency?: number
  /** Render quality and output format settings. */
  renderQuality?: {
    preset: 'draft' | 'normal' | 'high' | 'custom'
    customCrf: number
    outputResolution: '1080x1920' | '720x1280' | '540x960'
    outputFormat: 'mp4' | 'webm'
    encodingPreset: 'ultrafast' | 'veryfast' | 'medium' | 'slow'
  }
  /** Template layout — controls on-screen text placement (hook title, re-hook, subtitles) */
  templateLayout?: {
    titleText: { x: number; y: number }
    subtitles: { x: number; y: number }
    /** @deprecated Always mirrors titleText — do not set independently */
    rehookText: { x: number; y: number }
  }
  /** Whether captions are enabled (needed to know whether to re-sync captions) */
  captionsEnabled?: boolean
  /** Caption style for re-generating captions after filler removal */
  captionStyle?: CaptionStyleInput
  /** Filler & silence removal settings */
  fillerRemoval?: {
    enabled: boolean
    removeFillerWords: boolean
    trimSilences: boolean
    removeRepeats: boolean
    silenceThreshold: number
    silenceTargetGap: number
    fillerWords: string[]
  }
  /** B-Roll overlay settings — when enabled, generates AI image placements */
  broll?: {
    enabled: boolean
    intervalSeconds: number
    clipDuration: number
    displayMode: 'fullscreen' | 'split-top' | 'split-bottom' | 'pip'
    transition: 'hard-cut' | 'crossfade' | 'swipe-up' | 'swipe-down'
    pipSize: number
    pipPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  }
  /** Gemini API key — used for AI-generated B-Roll images and other AI features */
  geminiApiKey?: string
  /** Style category hint for AI image generation (e.g. 'custom', 'cinematic', 'anime') */
  styleCategory?: string
  /** Style presets for per-shot style resolution at render time */
  stylePresets?: Array<{
    id: string
    captions: {
      enabled: boolean
      style: {
        animation: string
        primaryColor: string
        highlightColor: string
        outlineColor: string
        emphasisColor?: string
        supersizeColor?: string
        fontSize: number
        outline: number
        shadow: number
        borderStyle: number
        wordsPerLine: number
        fontName: string
        backColor: string
      }
    }
    zoom: {
      enabled: boolean
      mode: string
      intensity: string
      intervalSeconds: number
    }
    colorGrade?: unknown
    transitionIn?: unknown
    transitionOut?: unknown
    brollMode?: 'fullscreen' | 'split-top' | 'split-bottom' | 'pip'
  }>
  /** Source video metadata for auto-manifest generation */
  sourceMeta?: {
    name: string
    path: string
    duration: number
  }
  /** Output aspect ratio for rendered clips */
  outputAspectRatio?: '9:16' | '1:1' | '4:5' | '16:9'
  /** Filename template for rendered clips */
  filenameTemplate?: string
  /** Velocity high-energy style — applied as a -vf filter chain during render */
  velocity?: VelocityOptions
  /** Prime AI render style — Amazon Prime Video-inspired overlay */
  primeAI?: PrimeAIOptions
  /** Pulse AI render style — futuristic tech-interface overlay */
  pulseAI?: PulseAIOptions
}

interface RenderClipStartEvent {
  clipId: string
  index: number
  total: number
  encoder: string
  encoderIsHardware: boolean
}

interface RenderClipProgressEvent {
  clipId: string
  percent: number
}

interface RenderClipDoneEvent {
  clipId: string
  outputPath: string
}

interface RenderClipErrorEvent {
  clipId: string
  error: string
  /** Full FFmpeg command string (always present; included on error and in developer mode). */
  ffmpegCommand?: string
}

interface RenderBatchResultEvent {
  completed: number
  failed: number
  total: number
}

interface CaptionStyleInput {
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
  emphasisColor?: string
  supersizeColor?: string
}

// ---------------------------------------------------------------------------
// Story Arc types
// ---------------------------------------------------------------------------

interface StoryArcClip {
  startTime: number
  endTime: number
  score: number
  text?: string
  hookText?: string
  reasoning?: string
  curiosityScore?: number
  combinedScore?: number
}

interface StoryArc {
  id: string
  title: string
  clips: StoryArcClip[]
  narrativeDescription: string
}

interface PartInfo {
  partNumber: number
  totalParts: number
  title: string
  endCardText: string
}

interface SeriesMetadata {
  seriesTitle: string
  parts: PartInfo[]
}

interface PartNumberConfig {
  position?: 'top-left' | 'top-right'
  fontSize?: number
  textColor?: string
  bgColor?: string
  bgOpacity?: number
  padding?: number
  fontFilePath?: string
}

interface EndCardConfig {
  bgColor?: string
  bgOpacity?: number
  fontSize?: number
  textColor?: string
  fadeDuration?: number
  position?: 'center' | 'bottom-third'
  fontFilePath?: string
}

// ---------------------------------------------------------------------------
// Curiosity Gap types
// ---------------------------------------------------------------------------

interface CuriosityGap {
  openTimestamp: number
  resolveTimestamp: number
  type: 'question' | 'story' | 'claim' | 'pivot' | 'tease'
  score: number
  description: string
}

interface ClipBoundary {
  start: number
  end: number
  reason: string
}

interface CuriosityClipCandidate {
  startTime: number
  endTime: number
  score: number
  text?: string
  hookText?: string
  reasoning?: string
  curiosityScore?: number
  combinedScore?: number
}

// ---------------------------------------------------------------------------
// Split-screen layout types
// ---------------------------------------------------------------------------

interface SplitScreenVideoSource {
  path: string
  sourceWidth: number
  sourceHeight: number
  crop?: { x: number; y: number; width: number; height: number }
}

interface SplitScreenConfig {
  ratio: number
  divider?: { color: string; thickness: number }
  pipPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  pipSize?: number
  pipCornerRadius?: number
}

interface SplitScreenFilterResult {
  filterComplex: string
  inputCount: number
}

// ---------------------------------------------------------------------------
// Loop Optimizer types
// ---------------------------------------------------------------------------

type LoopStrategy = 'hard-cut' | 'thematic' | 'audio-match' | 'crossfade' | 'none'

interface LoopAnalysis {
  loopScore: number
  strategy: LoopStrategy
  suggestedEndAdjust: number
  suggestedStartAdjust: number
  reason: string
}

interface LoopOptimizedClip {
  start: number
  end: number
  strategy: LoopStrategy
  crossfadeDuration?: number
}

// ---------------------------------------------------------------------------
// Safe Zone types
// ---------------------------------------------------------------------------

type Platform = 'tiktok' | 'reels' | 'shorts' | 'universal'

type ElementType =
  | 'caption'
  | 'hook_text'
  | 'upper_third'
  | 'middle'
  | 'lower_third'
  | 'progress_bar'
  | 'logo'
  | 'comment_overlay'
  | 'full_frame'

interface SafeZoneRect {
  x: number
  y: number
  width: number
  height: number
}

interface PlatformDeadZones {
  top: number
  bottom: number
  left: number
  right: number
}

interface PlatformSafeZone {
  name: string
  safeRect: SafeZoneRect
  deadZones: PlatformDeadZones
  engagementButtonColumn: SafeZoneRect
}

interface AssMargins {
  MarginL: number
  MarginR: number
  MarginV: number
}

// ---------------------------------------------------------------------------
// Description Generator types
// ---------------------------------------------------------------------------

interface PlatformDescription {
  platform: 'youtube-shorts' | 'instagram-reels' | 'tiktok'
  text: string
  hashtags: string[]
}

interface ClipDescription {
  shortDescription: string
  hashtag: string
  longDescription?: string
  platforms: PlatformDescription[]
}

interface DescriptionClipInput {
  transcript: string
  hookText?: string
  reasoning?: string
}

// ---------------------------------------------------------------------------
// Word Emphasis types
// ---------------------------------------------------------------------------

interface EmphasizedWord {
  text: string
  start: number
  end: number
  emphasis: 'normal' | 'emphasis' | 'supersize'
}

interface WordEmphasisResult {
  words: EmphasizedWord[]
  usedAI: boolean
}

// ---------------------------------------------------------------------------
// AI Edit Plan types
// ---------------------------------------------------------------------------

type AIEditPlanSFXType =
  | 'whoosh-soft'
  | 'whoosh-hard'
  | 'impact-low'
  | 'impact-high'
  | 'rise-tension'
  | 'notification-pop'
  | 'word-pop'
  | 'bass-drop'
  | 'rise-tension-short'

interface AIEditPlanWordEmphasis {
  wordIndex: number
  text: string
  start: number
  end: number
  level: 'emphasis' | 'supersize' | 'box'
}

interface AIEditPlanBRollSuggestion {
  timestamp: number
  duration: number
  keyword: string
  displayMode: 'fullscreen' | 'split-top' | 'split-bottom' | 'pip'
  transition: 'hard-cut' | 'crossfade' | 'swipe-up' | 'swipe-down'
  reason: string
}

interface AIEditPlanSFXSuggestion {
  timestamp: number
  type: AIEditPlanSFXType
  reason: string
}

interface AIEditPlan {
  clipId: string
  stylePresetId: string
  stylePresetName: string
  wordEmphasis: AIEditPlanWordEmphasis[]
  brollSuggestions: AIEditPlanBRollSuggestion[]
  sfxSuggestions: AIEditPlanSFXSuggestion[]
  reasoning: string
  generatedAt: number
}

/** Input descriptor for a single clip in a batch edit plan request. */
interface BatchEditPlanInput {
  clipId: string
  clipStart: number
  clipEnd: number
  words: WordTimestamp[]
  transcriptText: string
}

/** Progress event emitted per-clip during a batch edit plan run. */
interface BatchEditPlanProgress {
  clipIndex: number
  totalClips: number
  clipId: string
  stage: 'generating' | 'done' | 'error'
  message: string
}

// ---------------------------------------------------------------------------
// Clip Variant Generator types
// ---------------------------------------------------------------------------

type OverlayType = 'hook-title' | 'rehook'

interface VariantOverlayConfig {
  type: OverlayType
  style?: string
  text?: string
  color?: string
}

type CaptionStylePreset = 'bold' | 'minimal' | 'none' | 'default'

type VariantLayout = 'standard' | 'blur-background'

interface ClipVariant {
  id: string
  label: string
  startTime: number
  endTime: number
  overlays: VariantOverlayConfig[]
  captionStyle: CaptionStylePreset
  layout: VariantLayout
  hookText?: string
  description: string
}

interface VariantRenderConfig {
  clipId: string
  outputFileName: string
  startTime: number
  endTime: number
  hookTitleText?: string
  hookTitleStyle?: 'centered-bold' | 'top-bar' | 'slide-in'
  rehookText?: string
  rehookStyle?: 'bar' | 'text-only' | 'slide-up'
  captionStyle: CaptionStylePreset
  layout: VariantLayout
  overlays: VariantOverlayConfig[]
}

interface VariantLabel {
  id: string
  label: string
  description: string
  badge: string
}

interface OverlayCapabilities {
  hookTitle: boolean
  rehook: boolean
}

// ---------------------------------------------------------------------------
// Fake Comment Overlay types
// ---------------------------------------------------------------------------

/**
 * Comment content data produced by `generateFakeComment` (or constructed
 * manually). Pass this to `buildFakeCommentFilter` to render the overlay.
 */
interface FakeCommentData {
  /** TikTok-style username (no @ prefix — added automatically in the overlay). */
  username: string
  /** The comment body text. Keep under 60 chars for best readability. */
  text: string
  /** Optional emoji appended after the comment text (e.g. '💀'). */
  emoji?: string
  /** Avatar background color in CSS hex format (e.g. '#FF6B6B'). */
  profileColor: string
  /** Formatted like count (e.g. '2.4k'). Assigned automatically by `generateFakeComment`. */
  likeCount: string
}

/** Configuration for the fake comment overlay. All timing in seconds. */
interface FakeCommentConfig {
  /** Whether the overlay is rendered. */
  enabled: boolean
  /** Visual style preset: 'tiktok' | 'youtube' | 'reels'. */
  style: 'tiktok' | 'youtube' | 'reels'
  /** Frame position: 'lower-third' (just above caption zone) or 'middle-left'. */
  position: 'lower-third' | 'middle-left'
  /** When the overlay appears (seconds from clip start). */
  appearTime: number
  /** How long the overlay is visible (seconds). */
  displayDuration: number
  /** Fade-in duration (seconds). */
  fadeIn: number
  /** Fade-out duration (seconds). */
  fadeOut: number
}

// ---------------------------------------------------------------------------
// Emoji Burst / Reaction Overlay types
// ---------------------------------------------------------------------------

/** Thematic preset controlling which emoji characters appear. */
type EmojiPreset = 'funny' | 'fire' | 'shock' | 'love' | 'custom'

/**
 * A single detected high-emotion moment in the clip.
 * All timestamps are clip-relative (seconds, 0 = clip start).
 */
interface EmojiMoment {
  /** Seconds from clip start when the burst triggers. */
  timestamp: number
  /** How long the emoji animation plays (seconds). */
  duration: number
  /** Emoji characters to display at this moment. */
  emojis: string[]
  /** Animation intensity. */
  intensity: 'subtle' | 'normal' | 'explosive'
}

/** Configuration for the emoji burst overlay. */
interface EmojiBurstConfig {
  /** Whether the overlay is burned into rendered clips. */
  enabled: boolean
  /** Thematic preset selecting the emoji character set. */
  preset: EmojiPreset
  /** Custom emoji list (used when preset is 'custom'). */
  customEmojis?: string[]
  /** Base font size in pixels on the 1080×1920 canvas (default 80). */
  fontSize: number
  /** How far each emoji floats upward over its animation duration (px, default 200). */
  floatDistance: number
  /** Number of emoji characters per burst for 'normal' intensity (default 4). */
  burstCount: number
  /** Horizontal spread: emojis are placed within ±spread of frame centre (px, default 300). */
  spread: number
  /** Y baseline where the burst starts (px from top, default 1400 / lower-third). */
  startY: number
}

// ---------------------------------------------------------------------------
// Blur Background Fill layout types
// ---------------------------------------------------------------------------

interface BlurBackgroundConfig {
  /** Gaussian blur strength: 'light' (sigma 12), 'medium' (sigma 25), 'heavy' (sigma 40). */
  blurIntensity: 'light' | 'medium' | 'heavy'
  /**
   * Darken the blurred background (0 = no change, 0.5 = very dark).
   * Increases contrast between background and foreground subject.
   */
  darken: number
  /** Apply a radial vignette to the blurred background, darkening the corners. */
  vignette: boolean
  /** Draw a subtle drop-shadow behind the foreground video. */
  borderShadow: boolean
}

// ---------------------------------------------------------------------------
// Python Setup types
// ---------------------------------------------------------------------------

interface PythonSetupStatus {
  ready: boolean
  stage: string
  venvPath: string | null
  embeddedPythonAvailable: boolean
}

interface PythonSetupProgress {
  stage: 'downloading-python' | 'extracting' | 'creating-venv' | 'installing-packages' | 'verifying'
  message: string
  percent: number
  /** Current package being downloaded/installed (installing-packages stage only) */
  package?: string
  /** Number of packages installed so far */
  currentPackage?: number
  /** Total packages to install (estimated) */
  totalPackages?: number
}

// ---------------------------------------------------------------------------
// Clip Stitcher types
// ---------------------------------------------------------------------------

type StitchSegmentRole =
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

type StitchFramework = 'hook-escalate-payoff' | 'why-what-how'

interface StitchSegment {
  startTime: number
  endTime: number
  text: string
  role: StitchSegmentRole
  overlayText?: string
}

interface StitchedClip {
  id: string
  segments: StitchSegment[]
  totalDuration: number
  narrative: string
  hookText: string
  score: number
  reasoning: string
  framework: StitchFramework
  rehookText?: string
}

interface StitchingResult {
  clips: StitchedClip[]
  summary: string
}

interface StitchingProgress {
  stage: 'analyzing' | 'composing' | 'validating'
  message: string
}

// ---------------------------------------------------------------------------
// Segment Editor types (Captions.ai-style per-segment editing)
// ---------------------------------------------------------------------------

type SegmentStyleCategory =
  | 'main-video'
  | 'main-video-text'
  | 'main-video-images'
  | 'fullscreen-image'
  | 'fullscreen-text'

interface SegmentStyleVariant {
  id: string
  category: SegmentStyleCategory
  name: string
  description: string
  zoomStyle: 'none' | 'drift' | 'snap' | 'word-pulse' | 'zoom-out'
  zoomIntensity: number
  captionPosition: 'lower-third' | 'center' | 'top'
  imageLayout?: 'pip' | 'side-by-side' | 'behind-speaker' | 'fullscreen' | 'top-bottom'
  imagePlacement?: 'left' | 'right' | 'top' | 'bottom'
}

interface ZoomKeyframe {
  time: number
  scale: number
  x: number
  y: number
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'snap'
}

type TransitionType = 'none' | 'hard-cut' | 'crossfade' | 'flash-cut' | 'color-wash'

type Archetype =
  | 'talking-head'
  | 'tight-punch'
  | 'wide-breather'
  | 'quote-lower'
  | 'split-image'
  | 'fullscreen-image'
  | 'fullscreen-quote'
  | 'fullscreen-headline'

interface EditStyleTemplateView {
  archetype: Archetype
  editStyleId: string
  name: string
  description: string
  category: SegmentStyleCategory
  variantId: string
  zoomStyle: 'none' | 'drift' | 'snap' | 'word-pulse' | 'zoom-out'
  zoomIntensity: number
  captionPosition: 'lower-third' | 'center' | 'top'
  imageLayout?: 'pip' | 'side-by-side' | 'behind-speaker' | 'fullscreen' | 'top-bottom'
  imagePlacement?: 'left' | 'right' | 'top' | 'bottom'
}

interface VideoSegment {
  id: string
  clipId: string
  index: number
  startTime: number
  endTime: number
  captionText: string
  words: WordTimestamp[]
  archetype: Archetype
  segmentStyleCategory: SegmentStyleCategory
  zoomKeyframes: ZoomKeyframe[]
  transitionIn: TransitionType
  transitionOut: TransitionType
  /** Local file path of the fal.ai-generated B-roll image for this segment. */
  imagePath?: string
}

type VFXOverlayType =
  | 'glowing-ring'
  | 'bokeh-blobs'
  | 'diagonal-slash'
  | 'color-vignette'
  | 'gradient-bar-bottom'
  | 'gradient-bar-top'
  | 'color-tint'
  | 'grid-overlay'
  | 'scan-line'
  | 'corner-brackets'
  | 'pulse-border'
  | 'image-overlay'
  | 'video-overlay'

type OverlayBlendMode = 'normal' | 'screen' | 'multiply'

interface VFXOverlay {
  type: VFXOverlayType
  opacity: number
  /** Which segment categories this overlay applies to. 'all' matches every category. */
  applyToCategories: SegmentStyleCategory[] | 'all'
  /** Path relative to resources/overlays/ for asset-based overlays. */
  assetPath?: string
  /** Blend mode for asset-based overlays (default: 'normal'). */
  blendMode?: OverlayBlendMode
}

interface ColorGradeParams {
  /** Warmth shift: -1.0 (cool/blue) to 1.0 (warm/orange). 0 = neutral */
  warmth: number
  /** Contrast: 0.8 (flat) to 1.4 (punchy). 1.0 = no change */
  contrast: number
  /** Saturation: 0.0 (grayscale) to 1.5 (oversaturated). 1.0 = no change */
  saturation: number
  /** Black level lift: 0.0 (deep blacks) to 0.15 (lifted/faded shadows) */
  blackLift: number
  /** Highlight rolloff: 0.0 (harsh) to 1.0 (soft highlight rolloff) */
  highlightSoftness: number
}

type TextAnimationStyle =
  | 'fade-in'    // smooth opacity fade from 0→1 over 0.3s
  | 'snap-in'    // instant appear, 0-frame
  | 'scale-up'   // start at 80% size, scale to 100% over 0.2s
  | 'slide-up'   // slide in from below + fade
  | 'none'       // no animation, static

interface EditStyle {
  id: string
  name: string
  energy: 'low' | 'medium' | 'high'
  accentColor: string
  captionBgOpacity: number
  letterbox: 'none' | 'bottom' | 'both'
  defaultZoomStyle: 'none' | 'drift' | 'snap' | 'word-pulse' | 'zoom-out'
  defaultZoomIntensity: number
  defaultTransition: TransitionType
  flashColor: string
  targetEditsPerSecond: number
  /** Full caption visual identity — self-contained, overrides basic caption preset. */
  captionStyle: CaptionStyleInput
  availableSegmentStyles: string[]
  /** One-sentence summary of the style's visual character, shown as a tooltip. */
  description?: string
  /** VFX overlay layers applied per segment (optional — empty = no overlays). */
  vfxOverlays?: VFXOverlay[]
  /** Per-style color grading applied to every segment rendered with this style. */
  colorGrade?: ColorGradeParams
  /** Text reveal animation for drawtext overlays in text-based segment layouts. */
  textAnimation?: TextAnimationStyle
  /** Per-energy-tier segment duration target for viewer retention optimization. */
  segmentDurationTarget?: { min: number; max: number; ideal: number }
  /** Duration in seconds for xfade/color-wash transitions between segments. */
  transitionDuration?: number
}

// ---------------------------------------------------------------------------
// Shot Segmentation types
// ---------------------------------------------------------------------------

type ShotBreakReason =
  | 'sentence-end'
  | 'pause'
  | 'clause-boundary'
  | 'topic-shift'
  | 'max-duration'
  | 'start'
  | 'end'

interface ShotSegment {
  startTime: number
  endTime: number
  text: string
  startWordIndex: number
  endWordIndex: number
  breakReason: ShotBreakReason
  confidence: number
}

interface ShotSegmentationResult {
  shots: ShotSegment[]
  shotCount: number
  avgDuration: number
}

// ---------------------------------------------------------------------------
// Recent Projects types
// ---------------------------------------------------------------------------

interface RecentProjectEntry {
  path: string
  name: string
  lastOpened: number
  clipCount: number
  sourceCount: number
}

// ---------------------------------------------------------------------------
// Filler Detection types
// ---------------------------------------------------------------------------

interface FillerSegment {
  start: number
  end: number
  type: 'filler' | 'silence' | 'repeat'
  label: string
}

interface FillerDetectionSettings {
  removeFillerWords: boolean
  trimSilences: boolean
  removeRepeats: boolean
  silenceThreshold: number
  silenceTargetGap: number
  fillerWords: string[]
}

interface FillerDetectionResult {
  segments: FillerSegment[]
  timeSaved: number
  counts: { filler: number; silence: number; repeat: number }
}

interface Api {
  openFiles: () => Promise<string[]>
  openDirectory: () => Promise<string | null>
  openImageFile: () => Promise<string | null>
  getPathForFile: (file: File) => string
  getMetadata: (filePath: string) => Promise<VideoMetadata>
  extractAudio: (videoPath: string) => Promise<string>
  getThumbnail: (videoPath: string, timeSec?: number) => Promise<string>
  /** Extract audio amplitude peaks for the trim editor waveform visualizer. Returns ~500 normalized [0,1] values. */
  getWaveform: (videoPath: string, startTime: number, endTime: number, numPoints?: number) => Promise<number[]>
  downloadYouTube: (url: string) => Promise<YouTubeDownloadResult>
  onYouTubeProgress: (callback: (data: { percent: number }) => void) => () => void
  transcribeVideo: (videoPath: string) => Promise<TranscriptionResult>
  formatTranscriptForAI: (result: TranscriptionResult) => Promise<string>
  onTranscribeProgress: (callback: (data: TranscriptionProgress) => void) => () => void
  scoreTranscript: (apiKey: string, transcript: string, duration: number, targetDuration?: string, targetAudience?: string) => Promise<ScoringResult>
  onScoringProgress: (callback: (data: ScoringProgress) => void) => () => void
  generateHookText: (apiKey: string, transcript: string, videoSummary?: string, keyTopics?: string[]) => Promise<string>
  rescoreSingleClip: (apiKey: string, clipText: string, clipDuration: number) => Promise<{ score: number; reasoning: string; hookText: string }>
  generateRehookText: (apiKey: string, transcript: string, clipStart: number, clipEnd: number, videoSummary?: string, keyTopics?: string[]) => Promise<string>
  validateGeminiKey: (apiKey: string) => Promise<{ valid: boolean; error?: string; warning?: string }>
  detectFaceCrops: (videoPath: string, segments: { start: number; end: number }[]) => Promise<CropRegion[]>
  /**
   * Run face tracking on the entire source video at 2 FPS and return a timeline
   * of per-frame 9:16 crop positions. Use this instead of `detectFaceCrops` when
   * you need smooth tracking of a moving speaker rather than a single static crop.
   */
  detectFaceTimeline: (sourceVideoPath: string) => Promise<FaceTimelineEntry[]>
  onFaceDetectionProgress: (callback: (data: FaceDetectionProgress) => void) => () => void
  generateCaptions: (
    words: WordTimestamp[],
    style: CaptionStyleInput,
    outputPath?: string
  ) => Promise<string>
  selectBrandLogo: () => Promise<string | null>
  selectIntroBumper: () => Promise<string | null>
  selectOutroBumper: () => Promise<string | null>
  copyBrandLogo: (filePath: string) => Promise<string>
  copyBrandBumper: (filePath: string) => Promise<string>
  startBatchRender: (options: RenderBatchOptions) => Promise<{ started: boolean }>
  cancelRender: () => Promise<void>
  onRenderClipStart: (callback: (data: RenderClipStartEvent) => void) => () => void
  onRenderClipPrepare: (callback: (data: { clipId: string; message: string; percent: number }) => void) => () => void
  onRenderClipProgress: (callback: (data: RenderClipProgressEvent) => void) => () => void
  onRenderClipDone: (callback: (data: RenderClipDoneEvent) => void) => () => void
  onRenderClipError: (callback: (data: RenderClipErrorEvent) => void) => () => void
  onRenderBatchDone: (callback: (data: RenderBatchResultEvent) => void) => () => void
  onRenderCancelled: (callback: (data: RenderBatchResultEvent) => void) => () => void
  onSegmentFallback: (
    callback: (data: {
      clipId: string
      segmentIndex: number
      archetype: string
      reason: string
    }) => void
  ) => () => void
  splitSegments: (
    inputPath: string,
    segments: { label: string; startTime: number; endTime: number }[],
    outputDir: string
  ) => Promise<{ label: string; outputPath: string }[]>
  saveProject: (json: string) => Promise<string | null>
  loadProject: () => Promise<string | null>
  loadProjectFromPath: (filePath: string) => Promise<string | null>
  autoSaveProject: (json: string) => Promise<string>
  loadRecovery: () => Promise<string | null>
  clearRecovery: () => Promise<void>
  getRecentProjects: () => Promise<RecentProjectEntry[]>
  addRecentProject: (entry: RecentProjectEntry) => Promise<void>
  removeRecentProject: (path: string) => Promise<void>
  clearRecentProjects: () => Promise<void>
  // System
  getDiskSpace: (dirPath: string) => Promise<{ free: number; total: number }>
  getEncoder: () => Promise<{ encoder: string; isHardware: boolean }>
  getAvailableFonts: () => Promise<Array<{ name: string; path: string; source: 'bundled' | 'system'; category?: string; weight?: string }>>
  /** Get font file data as base64 string for renderer FontFace loading. */
  getFontData: (fontPath: string) => Promise<string | null>
  sendNotification: (opts: { title: string; body: string; silent?: boolean }) => Promise<void>
  getTempSize: () => Promise<{ bytes: number; count: number }>
  cleanupTemp: () => Promise<{ deleted: number; freed: number }>
  getCacheSize: () => Promise<{ bytes: number }>
  setAutoCleanup: (enabled: boolean) => Promise<void>
  getLogPath: () => Promise<string>
  getLogSize: () => Promise<number>
  exportLogs: (rendererErrors: Array<{ timestamp: number; source: string; message: string; details?: string }>) => Promise<{ exportPath: string } | null>
  openLogFolder: () => Promise<void>
  // Shell
  openPath: (path: string) => Promise<string>
  showItemInFolder: (path: string) => Promise<void>
  // Safe Zones
  getSafeZonePlacement: (platform: Platform, element: ElementType) => Promise<SafeZoneRect>
  getSafeZoneRect: (platform: Platform) => Promise<SafeZoneRect>
  getSafeZoneDeadZones: (platform: Platform) => Promise<PlatformDeadZones>
  clampToSafeZone: (rect: SafeZoneRect, platform: Platform) => Promise<SafeZoneRect>
  isInsideSafeZone: (rect: SafeZoneRect, platform: Platform) => Promise<boolean>
  safeZoneToAssMargins: (rect: SafeZoneRect) => Promise<AssMargins>
  getAllPlatformSafeZones: () => Promise<Record<Platform, PlatformSafeZone>>
  buildSplitScreenFilter: (
    layout: { type: 'top-bottom' | 'pip-corner' | 'side-by-side' | 'reaction' },
    mainSource: SplitScreenVideoSource,
    secondarySource: SplitScreenVideoSource | null,
    config: SplitScreenConfig
  ) => Promise<SplitScreenFilterResult>
  buildBlurBackgroundFilter: (
    inputWidth: number,
    inputHeight: number,
    outputWidth: number,
    outputHeight: number,
    config: BlurBackgroundConfig
  ) => Promise<string>
  // Curiosity Gap Detector
  detectCuriosityGaps: (
    apiKey: string,
    transcript: TranscriptionResult,
    formattedTranscript: string,
    videoDuration: number
  ) => Promise<CuriosityGap[]>
  optimizeClipBoundaries: (
    gap: CuriosityGap,
    originalStart: number,
    originalEnd: number,
    transcript: TranscriptionResult
  ) => Promise<ClipBoundary>
  optimizeClipEndpoints: (
    mode: string,
    clipStart: number,
    clipEnd: number,
    transcript: TranscriptionResult,
    gap?: CuriosityGap
  ) => Promise<ClipBoundary>
  rankClipsByCuriosity: (
    clips: CuriosityClipCandidate[],
    gaps: CuriosityGap[]
  ) => Promise<CuriosityClipCandidate[]>
  // Loop Optimizer
  analyzeLoopPotential: (
    apiKey: string,
    transcript: TranscriptionResult,
    clipStart: number,
    clipEnd: number
  ) => Promise<LoopAnalysis>
  optimizeForLoop: (
    clipStart: number,
    clipEnd: number,
    transcript: TranscriptionResult,
    analysis: LoopAnalysis
  ) => Promise<LoopOptimizedClip>
  buildLoopCrossfadeFilter: (clipDuration: number, crossfadeDuration: number) => Promise<string>
  scoreLoopQuality: (analysis: LoopAnalysis) => Promise<number>
  // Story Arc
  detectStoryArcs: (
    apiKey: string,
    transcript: TranscriptionResult,
    clips: StoryArcClip[]
  ) => Promise<StoryArc[]>
  generateSeriesMetadata: (arc: StoryArc) => Promise<SeriesMetadata>
  buildPartNumberFilter: (
    partNumber: number,
    totalParts: number,
    seriesTitle: string,
    config: PartNumberConfig
  ) => Promise<string>
  buildEndCardFilter: (
    nextPartTeaser: string,
    clipDuration: number,
    config: EndCardConfig
  ) => Promise<string>
  // Clip Variant Generator
  generateClipVariants: (
    apiKey: string,
    clip: CuriosityClipCandidate,
    transcript: TranscriptionResult,
    capabilities: OverlayCapabilities
  ) => Promise<ClipVariant[]>
  buildVariantRenderConfigs: (
    variants: ClipVariant[],
    baseClip: CuriosityClipCandidate,
    baseName: string
  ) => Promise<VariantRenderConfig[]>
  generateVariantLabels: (variants: ClipVariant[]) => Promise<VariantLabel[]>
  // Description Generator — single clip
  generateClipDescription: (
    apiKey: string,
    transcript: string,
    clipContext?: string,
    hookTitle?: string
  ) => Promise<ClipDescription>
  // Description Generator — batch (all clips in one AI call)
  generateBatchDescriptions: (
    apiKey: string,
    clips: DescriptionClipInput[]
  ) => Promise<ClipDescription[]>
  // Word Emphasis
  analyzeWordEmphasis: (words: WordTimestamp[], apiKey?: string) => Promise<WordEmphasisResult>
  // AI Edit Plan — single-shot complete edit plan for a clip
  generateEditPlan: (
    apiKey: string,
    clipId: string,
    clipStart: number,
    clipEnd: number,
    words: WordTimestamp[],
    transcriptText: string,
    stylePresetId: string,
    stylePresetName: string,
    stylePresetCategory: string
  ) => Promise<AIEditPlan>
  // AI Edit Plan — batch orchestrator: generate plans for all clips in one pipeline step
  generateBatchEditPlans: (
    apiKey: string,
    clips: BatchEditPlanInput[],
    stylePresetId: string,
    stylePresetName: string,
    stylePresetCategory: string
  ) => Promise<AIEditPlan[]>
  onAiEditProgress: (callback: (data: BatchEditPlanProgress) => void) => () => void
  // AI Edit Plan Cache
  clearEditPlanCache: () => Promise<{ removed: number }>
  getEditPlanCacheSize: () => Promise<{ bytes: number }>
  // B-Roll
  generateBRollPlacements: (
    geminiApiKey: string,
    transcriptText: string,
    wordTimestamps: WordTimestamp[],
    clipStart: number,
    clipEnd: number,
    settings: {
      intervalSeconds: number
      clipDuration: number
      displayMode?: 'fullscreen' | 'split-top' | 'split-bottom' | 'pip'
      transition?: 'hard-cut' | 'crossfade' | 'swipe-up' | 'swipe-down'
      pipSize?: number
      pipPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
    }
  ) => Promise<Array<{
    startTime: number
    duration: number
    videoPath: string
    keyword: string
    displayMode: 'fullscreen' | 'split-top' | 'split-bottom' | 'pip'
    transition: 'hard-cut' | 'crossfade' | 'swipe-up' | 'swipe-down'
    pipSize: number
    pipPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  }>>
  // B-Roll AI Image Generation
  generateBRollImage: (
    geminiApiKey: string,
    keyword: string,
    transcriptContext: string,
    styleCategory: string,
    duration: number
  ) => Promise<{
    filePath: string
    keyword: string
    width: number
    height: number
    source: 'ai-generated'
    videoPath: string
  } | null>
  regenerateBRollImage: (
    geminiApiKey: string,
    keyword: string,
    transcriptContext: string,
    styleCategory: string,
    duration: number
  ) => Promise<{
    filePath: string
    keyword: string
    width: number
    height: number
    source: 'ai-generated'
    videoPath: string
  } | null>
  // fal.ai Image Generation
  generateFalImage: (params: {
    prompt: string
    aspectRatio: '9:16' | '1:1' | '16:9'
    apiKey: string
  }) => Promise<string>
  /** Generate a contextual B-roll image for one segment, with disk caching. */
  generateSegmentImage: (params: {
    brollSuggestion: string
    overlayText?: string
    editStyleId: string
    accentColor: string
    segmentCategory: 'main-video-images' | 'fullscreen-image'
    apiKey: string
  }) => Promise<string>
  // Emoji Burst / Reaction Overlay
  identifyEmojiMoments: (
    apiKey: string,
    transcript: TranscriptionResult,
    clipStart: number,
    clipEnd: number,
    config: EmojiBurstConfig
  ) => Promise<EmojiMoment[]>
  buildEmojiBurstFilters: (
    moments: EmojiMoment[],
    config: EmojiBurstConfig
  ) => Promise<string[]>
  // Fake Comment Overlay
  generateFakeComment: (
    apiKey: string,
    transcript: string,
    clipContext?: string
  ) => Promise<FakeCommentData>
  buildFakeCommentFilter: (
    comment: FakeCommentData,
    config: FakeCommentConfig
  ) => Promise<string[]>
  buildVelocityFilter: (
    options: VelocityOptions,
    width: number,
    height: number,
    durationSeconds: number,
    segmentStart: number
  ) => Promise<string>
  // Clip Stitcher
  generateStitchedClips: (
    apiKey: string,
    formattedTranscript: string,
    videoDuration: number,
    wordTimestamps: WordTimestamp[]
  ) => Promise<StitchingResult>
  onStitchingProgress: (callback: (data: StitchingProgress) => void) => () => void
  // Export manifest — manually generate manifest.json + manifest.csv
  generateManifest: (
    outputDirectory: string,
    jobs: unknown[],
    clipMeta: unknown[],
    sourceMeta: { name: string; path: string; duration: number }
  ) => Promise<{ jsonPath: string; csvPath: string }>
  // Export descriptions — write descriptions.{csv,json,txt} to outputDirectory
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
  ) => Promise<string>
  // Python setup
  getPythonStatus: () => Promise<PythonSetupStatus>
  startPythonSetup: () => Promise<{ started: boolean }>
  onPythonSetupProgress: (callback: (data: PythonSetupProgress) => void) => () => void
  onPythonSetupDone: (callback: (data: { success: boolean; error?: string }) => void) => () => void
  // System — resource usage (CPU/RAM/GPU)
  getResourceUsage: () => Promise<{
    cpu: { percent: number }
    ram: { usedBytes: number; totalBytes: number; appBytes: number }
    gpu: { percent: number; usedMB: number; totalMB: number; name: string } | null
  }>
  // Render — fast low-quality preview with all overlays applied (540×960, ultrafast)
  renderPreview: (config: {
    sourceVideoPath: string
    startTime: number
    endTime: number
    cropRegion?: { x: number; y: number; width: number; height: number }
    wordTimestamps?: WordTimestamp[]
    hookTitleText?: string
    captionsEnabled?: boolean
    captionStyle?: CaptionStyleInput
    hookTitleOverlay?: HookTitleOverlaySettings
    autoZoom?: AutoZoomSettings
    brandKit?: {
      logoPath: string | null
      logoPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
      logoScale: number
      logoOpacity: number
    }
    /** Per-clip accent color — overrides highlight/emphasis colors across all overlays */
    accentColor?: string
    /**
     * Per-segment archetype plan. When present and non-empty, the preview
     * renders each segment with its own layout/zoom/captions via the
     * segmented render path — matching the batch render exactly.
     */
    segments?: VideoSegment[]
    /** Active edit style id (resolved to default when absent). */
    stylePresetId?: string
    /** Optional pre-computed word emphasis for the segmented preview path. */
    wordEmphasis?: EmphasizedWord[]
  }) => Promise<{ previewPath: string }>
  cleanupPreview: (previewPath: string) => Promise<void>
  // AI Token Usage
  onAiTokenUsage: (callback: (data: {
    source: string
    promptTokens: number
    completionTokens: number
    totalTokens: number
    model: string
    timestamp: number
  }) => void) => () => void
  // Filler Detection — detect filler words, silences, and repeats
  detectFillers: (
    words: WordTimestamp[],
    settings: FillerDetectionSettings
  ) => Promise<FillerDetectionResult>

  // Image Cache — management for AI-generated segment images
  clearImageCache: () => Promise<{ deletedCount: number; freedBytes: number }>
  getImageCacheStats: () => Promise<{ count: number; totalBytes: number; oldestDate: string }>

  // Settings Window
  openSettingsWindow: () => Promise<void>
  closeSettingsWindow: () => Promise<void>
  isSettingsWindowOpen: () => Promise<boolean>
  onSettingsWindowClosed: (callback: (data: Record<string, never>) => void) => () => void

  // Secrets — encrypted API key storage (safeStorage-backed)
  secrets: {
    get: (name: string) => Promise<string | null>
    set: (name: string, value: string) => Promise<void>
    has: (name: string) => Promise<boolean>
    clear: (name: string) => Promise<void>
  }

  // Segment Editor — split clip into styled segments for Captions.ai-style editing
  splitSegmentsForEditor: (
    clipId: string,
    words: WordTimestamp[],
    targetSegmentDuration?: number,
    defaultTransition?: TransitionType
  ) => Promise<VideoSegment[]>
  assignSegmentStyles: (
    segments: VideoSegment[],
    styleId: string,
    apiKey?: string,
    hasFalKey?: boolean
  ) => Promise<VideoSegment[]>
  generateSegmentImages: (
    segments: VideoSegment[],
    geminiApiKey: string,
    outputDir?: string,
    styleCategory?: string
  ) => Promise<{ results: Record<string, string>; failures: Array<{ segmentId: string; query: string; error: string }> }>
  updateSegmentCaption: (
    segmentId: string,
    newText: string
  ) => Promise<VideoSegment>
  // Edit Styles — Captions.ai-style edit style presets
  getEditStyles: () => Promise<EditStyle[]>
  getEditStyleById: (id: string) => Promise<EditStyle | null>
  getEditStyleTemplates: (editStyleId: string) => Promise<EditStyleTemplateView[]>
  resolveEditStyleTemplate: (
    archetype: Archetype,
    editStyleId: string
  ) => Promise<EditStyleTemplateView>
  getArchetypes: () => Promise<{
    keys: readonly Archetype[]
    categories: Record<Archetype, SegmentStyleCategory>
  }>

  // AI Edit — orchestrate the full AI edit preparation pipeline for a clip
  generateEditPlanSegments: (opts: {
    clipId: string
    segments: VideoSegment[]
    editStyleId: string
    geminiApiKey: string
    accentColor?: string
  }) => Promise<{ segments: VideoSegment[] }>

  // Shot Segmentation — segment a clip's transcript into natural 4-6 second "shots"
  segmentClipIntoShots: (
    words: WordTimestamp[],
    clipStart: number,
    clipEnd: number,
    config?: { targetDuration?: number; minDuration?: number; maxDuration?: number }
  ) => Promise<ShotSegmentationResult>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: Api
  }
}
