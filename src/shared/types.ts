// ---------------------------------------------------------------------------
// Shared Domain Types
//
// Canonical type definitions used across both the Electron main process and
// the React renderer. Import from '@shared/types' (aliased) or via relative
// path '../../shared/types'.
//
// RULE: Only types that genuinely cross the IPC boundary belong here.
//       UI-only types stay in store.ts; main-only types stay in their module.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Transcription
// ---------------------------------------------------------------------------

/** A single word with its start/end timestamps from ASR transcription. */
export interface WordTimestamp {
  text: string
  /** Start time in seconds */
  start: number
  /** End time in seconds */
  end: number
}

/** A sentence/paragraph segment from ASR transcription. */
export interface SegmentTimestamp {
  text: string
  /** Start time in seconds */
  start: number
  /** End time in seconds */
  end: number
}

/** Raw transcription output from the ASR pipeline. */
export interface TranscriptionResult {
  /** Full transcript text */
  text: string
  /** Word-level timestamps */
  words: WordTimestamp[]
  /** Sentence/segment-level timestamps */
  segments: SegmentTimestamp[]
}

// ---------------------------------------------------------------------------
// Face Detection
// ---------------------------------------------------------------------------

/** A 9:16 crop rectangle for face-centered framing. */
export interface CropRegion {
  x: number
  y: number
  width: number
  height: number
  /** Whether a face was actually detected (false = fallback center crop). */
  faceDetected: boolean
}

/** Progress callback data for multi-segment face detection. */
export interface FaceDetectionProgress {
  segment: number
  total: number
}

// ---------------------------------------------------------------------------
// AI Scoring
// ---------------------------------------------------------------------------

/** Target clip duration range for AI transcript scoring. */
export type TargetDuration = 'auto' | '15-30' | '30-60' | '60-90' | '90-120'

/** A single scored segment returned by the Gemini AI scoring pass. */
export interface ScoredSegment {
  /** Start time in seconds */
  startTime: number
  /** End time in seconds */
  endTime: number
  /** Transcript text for this segment */
  text: string
  /** Viral potential score 0–100 */
  score: number
  /** AI-generated hook/title text for the clip */
  hookText: string
  /** AI reasoning for the score */
  reasoning: string
}

/** Full result from the AI transcript scoring pipeline. */
export interface ScoringResult {
  segments: ScoredSegment[]
  summary: string
  keyTopics: string[]
}

/** Progress callback data for the AI scoring stage. */
export interface ScoringProgress {
  stage: 'sending' | 'analyzing' | 'validating'
  message: string
}

// ---------------------------------------------------------------------------
// Curiosity Gap
// ---------------------------------------------------------------------------

/** A detected curiosity gap moment in the transcript. */
export interface CuriosityGap {
  /** Timestamp (seconds) where the gap opens — question asked, story begins, claim made */
  openTimestamp: number
  /** Timestamp (seconds) where the gap resolves — answer given, payoff lands */
  resolveTimestamp: number
  /** Structural type of the curiosity trigger */
  type: 'question' | 'story' | 'claim' | 'pivot' | 'tease'
  /** Engagement strength 1–10 */
  score: number
  /** Human-readable explanation of what makes this moment compelling */
  description: string
}

/** Adjusted clip boundaries after curiosity gap optimization. */
export interface ClipBoundary {
  /** Adjusted clip start in seconds */
  start: number
  /** Adjusted clip end in seconds */
  end: number
  /** Short explanation of why the boundaries were chosen */
  reason: string
}

/**
 * Simplified clip candidate used for curiosity-gap ranking and variant generation.
 * This is NOT the full UI ClipCandidate from store.ts — it only carries the
 * fields needed for AI analysis passes.
 */
export interface CuriosityClipCandidate {
  startTime: number
  endTime: number
  /** Original virality score 0–100 */
  score: number
  text?: string
  hookText?: string
  reasoning?: string
  /** Curiosity gap strength 1–10 injected by rankClipsByCuriosity */
  curiosityScore?: number
  /** Combined engagement rank score used for final ordering */
  combinedScore?: number
}

// ---------------------------------------------------------------------------
// Clip End Mode
// ---------------------------------------------------------------------------

/** Strategy for optimizing clip endpoints. */
export type ClipEndMode = 'loop-first' | 'completion-first' | 'cliffhanger'

// ---------------------------------------------------------------------------
// Captions
// ---------------------------------------------------------------------------

/** Animation style for word-level captions. */
export type CaptionAnimation = 'captions-ai' | 'karaoke-fill' | 'word-pop' | 'fade-in' | 'glow' | 'word-box' | 'elastic-bounce' | 'typewriter' | 'impact-two' | 'cascade'

// ---------------------------------------------------------------------------
// Word Emphasis
// ---------------------------------------------------------------------------

/** Emphasis level for a single word in the transcript. */
export type EmphasisLevel = 'normal' | 'emphasis' | 'supersize'

/** A word with its emphasis level determined by AI or heuristic analysis. */
export interface EmphasizedWord {
  text: string
  /** Start time in seconds */
  start: number
  /** End time in seconds */
  end: number
  /** Emphasis classification for caption styling. */
  emphasis: EmphasisLevel
}

/** Result of word emphasis analysis for a clip or segment. */
export interface WordEmphasisResult {
  words: EmphasizedWord[]
  /** Whether AI was used (true) or heuristic fallback (false). */
  usedAI: boolean
}

// ---------------------------------------------------------------------------
// Sound Design
// ---------------------------------------------------------------------------

/** Built-in background music track identifier. */
export type MusicTrack = 'ambient-tech' | 'ambient-motivational' | 'ambient-chill'

// ---------------------------------------------------------------------------
// Platform & Layout
// ---------------------------------------------------------------------------

/** Target social media platform for safe-zone calculations. */
export type Platform = 'tiktok' | 'reels' | 'shorts' | 'universal'

/**
 * Output aspect ratio for rendered clips.
 * - '9:16' — 1080×1920, vertical (TikTok, Reels, Shorts)
 * - '1:1'  — 1080×1080, square (Instagram Feed, Facebook)
 * - '4:5'  — 1080×1350, portrait (Instagram Post)
 * - '16:9' — 1920×1080, landscape (YouTube, Twitter)
 */
export type OutputAspectRatio = '9:16' | '1:1' | '4:5' | '16:9'

// ---------------------------------------------------------------------------
// Auto-Zoom
// ---------------------------------------------------------------------------

/** Zoom motion intensity for Ken Burns effect. */
export type ZoomIntensity = 'subtle' | 'medium' | 'dynamic'

/**
 * Zoom animation mode.
 * - ken-burns:  smooth sinusoidal breathing zoom (default)
 * - reactive:   zoom responds to word emphasis moments (keyframe-driven)
 * - jump-cut:   instant zoom level changes that simulate multi-camera editing
 */
export type ZoomMode = 'ken-burns' | 'reactive' | 'jump-cut'

// ---------------------------------------------------------------------------
// Hook Title Overlay
// ---------------------------------------------------------------------------

/** Visual style for the hook title overlay. */
export type HookTitleStyle = 'centered-bold' | 'top-bar' | 'slide-in'

// ---------------------------------------------------------------------------
// Re-Hook Overlay
// ---------------------------------------------------------------------------

/** Visual style for the mid-clip re-hook / pattern interrupt overlay. */
export type RehookStyle = 'bar' | 'text-only' | 'slide-up'

// ---------------------------------------------------------------------------
// Progress Bar Overlay
// ---------------------------------------------------------------------------

/** Visual rendering style for the progress bar. */
export type ProgressBarStyle = 'solid' | 'gradient' | 'glow'

/** Which edge of the frame the progress bar is anchored to. */
export type ProgressBarPosition = 'top' | 'bottom'

// ---------------------------------------------------------------------------
// Brand Kit
// ---------------------------------------------------------------------------

/** Position of the brand logo watermark on the frame. */
export type LogoPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

// ---------------------------------------------------------------------------
// Shot Segmentation
//
// Within each clip, the transcript is split into 4–6 second "shots" at
// natural break points (sentence boundaries, pauses, topic shifts).
// Each shot is a coherent thought that can receive independent styling.
// ---------------------------------------------------------------------------

/** Reason why a shot boundary was placed at this point. */
export type ShotBreakReason =
  | 'sentence-end'      // Period, question mark, or exclamation at word end
  | 'pause'             // Silent gap > threshold between consecutive words
  | 'clause-boundary'   // Comma, semicolon, or colon followed by a pause
  | 'topic-shift'       // Vocabulary / subject change detected across window
  | 'max-duration'      // Shot exceeded target max (forced split)
  | 'start'             // First shot of the clip (synthetic boundary)
  | 'end'               // Last shot of the clip (synthetic boundary)

/** A single shot segment within a clip — a coherent visual thought unit. */
export interface ShotSegment {
  /** Clip-relative start time in seconds (0 = clip start). */
  startTime: number
  /** Clip-relative end time in seconds. */
  endTime: number
  /** Transcript text for this shot. */
  text: string
  /** Index of the first word (in the clip's wordTimestamps array) belonging to this shot. */
  startWordIndex: number
  /** Exclusive index of the last word belonging to this shot. */
  endWordIndex: number
  /** Why the boundary at the END of this shot was placed. */
  breakReason: ShotBreakReason
  /** Confidence score for this boundary (0–1). Higher = more natural break. */
  confidence: number
}

/** Result of shot segmentation for a single clip. */
export interface ShotSegmentationResult {
  shots: ShotSegment[]
  /** Total number of shots produced. */
  shotCount: number
  /** Average shot duration in seconds. */
  avgDuration: number
}

// ---------------------------------------------------------------------------
// AI Edit Plan
//
// A complete per-clip edit plan produced by a single Gemini AI call.
// Contains word emphasis tags, B-Roll placement suggestions, and SFX
// recommendations — all calibrated to the active style preset.
// ---------------------------------------------------------------------------

/** A word tagged for emphasis by the AI edit plan. */
export interface AIEditPlanWordEmphasis {
  /** 0-based index in the clip's word timestamps array (for fast lookup). */
  wordIndex: number
  /** Word text — used to validate the index match at apply time. */
  text: string
  /** Clip-relative start timestamp in seconds. */
  start: number
  /** Clip-relative end timestamp in seconds. */
  end: number
  /** How much visual weight this word should carry in captions. */
  level: 'emphasis' | 'supersize'
}

/** A B-Roll placement suggestion from the AI edit plan. */
export interface AIEditPlanBRollSuggestion {
  /** Clip-relative start time in seconds. */
  timestamp: number
  /** How long the B-Roll should run in seconds (2–6). */
  duration: number
  /** Pexels search query for this visual moment. */
  keyword: string
  /** Recommended layout for this B-Roll moment. */
  displayMode: 'fullscreen' | 'split-top' | 'split-bottom' | 'pip'
  /** Recommended transition style. */
  transition: 'hard-cut' | 'crossfade' | 'swipe-up' | 'swipe-down'
  /** Brief editorial justification (1 sentence). */
  reason: string
}

/** SFX type identifiers that cross the IPC boundary in the edit plan. */
export type AIEditPlanSFXType =
  | 'whoosh-soft'
  | 'whoosh-hard'
  | 'impact-low'
  | 'impact-high'
  | 'rise-tension'
  | 'notification-pop'
  | 'word-pop'
  | 'bass-drop'
  | 'rise-tension-short'

/** A sound effect recommendation from the AI edit plan. */
export interface AIEditPlanSFXSuggestion {
  /** Clip-relative timestamp in seconds. */
  timestamp: number
  /** SFX type to trigger. */
  type: AIEditPlanSFXType
  /** Brief editorial justification (1 sentence). */
  reason: string
}

/**
 * A complete AI-generated edit plan for a single clip.
 *
 * Produced by a single Gemini call that analyzes the clip transcript through
 * the lens of the active style preset and returns all three edit layers in
 * one shot: word emphasis, B-Roll suggestions, and SFX recommendations.
 */
export interface AIEditPlan {
  /** ID of the clip this plan belongs to. */
  clipId: string
  /** ID of the style preset that was active when the plan was generated. */
  stylePresetId: string
  /** Human-readable name of that style preset (for display). */
  stylePresetName: string
  /**
   * Word emphasis overrides.
   * Applied to captions at render time instead of the heuristic analysis.
   */
  wordEmphasis: AIEditPlanWordEmphasis[]
  /**
   * B-Roll placement suggestions.
   * Used to seed the Pexels keyword search when B-Roll is enabled.
   */
  brollSuggestions: AIEditPlanBRollSuggestion[]
  /**
   * SFX placement recommendations.
   * Shown in the UI and passed as edit events to the sound design engine.
   */
  sfxSuggestions: AIEditPlanSFXSuggestion[]
  /** 2–3 sentence overall editorial reasoning from the AI. */
  reasoning: string
  /** Unix timestamp (ms) when the plan was generated. */
  generatedAt: number
}

// ---------------------------------------------------------------------------
// Color Grade
//
// Per-shot or global color treatment applied as FFmpeg eq/hue filters.
// ---------------------------------------------------------------------------

/** Named color grade preset that maps to concrete FFmpeg eq/hue parameters. */
export type ColorGradePreset =
  | 'none'           // No color treatment
  | 'warm'           // Warm golden tones
  | 'cool'           // Cool blue-shifted
  | 'cinematic'      // Desaturated, crushed blacks
  | 'vintage'        // Faded, lifted blacks
  | 'high-contrast'  // Punchy, vivid
  | 'bw'             // Black and white
  | 'film'           // Film grain look (slight desaturation + warm shift)

/** Color grade configuration with optional fine-tuning overrides. */
export interface ColorGradeConfig {
  preset: ColorGradePreset
  /** Fine-tune brightness adjustment (-1.0 to 1.0). Default: 0 */
  brightness?: number
  /** Fine-tune contrast adjustment (0.0 to 3.0). Default: 1.0 */
  contrast?: number
  /** Fine-tune saturation adjustment (0.0 to 3.0). Default: 1.0 */
  saturation?: number
}

// ---------------------------------------------------------------------------
// Shot Transitions
//
// Visual transitions applied at shot boundaries within a clip.
// Implemented as time-limited FFmpeg filter effects at boundary points.
// ---------------------------------------------------------------------------

/** Visual transition type between shots within a clip. */
export type ShotTransitionType =
  | 'none'         // Hard cut (no transition)
  | 'crossfade'    // Alpha dissolve between shots
  | 'dip-black'    // Fade to black then fade up
  | 'swipe-left'   // Horizontal wipe
  | 'swipe-up'     // Vertical wipe
  | 'zoom-in'      // Zoom transition into next shot

/** Transition configuration for a shot boundary. */
export interface ShotTransitionConfig {
  type: ShotTransitionType
  /** Transition duration in seconds (0.15–1.0). Default: 0.3 */
  duration?: number
}

// ---------------------------------------------------------------------------
// Per-Shot Style Assignments
//
// Maps each shot segment within a clip to a style preset ID, enabling
// piecewise style variation within a single clip render. A 45-second clip
// with 8 shots can assign different caption animations, zoom behaviors,
// and B-Roll display modes to each shot.
// ---------------------------------------------------------------------------

/**
 * Assignment of a style preset to a single shot segment within a clip.
 *
 * The `shotIndex` corresponds to the index in the `ClipCandidate.shots` array.
 * When present on a `RenderClipJob`, the render pipeline resolves the preset
 * by ID and applies its settings only during that shot's time range.
 *
 * Shot indices not present in the array fall back to the global batch style.
 */
export interface ShotStyleAssignment {
  /** 0-based index into the clip's `shots` array. */
  shotIndex: number
  /**
   * ID of the EditStylePreset to apply during this shot's time range.
   * Must match a preset in the store's `editStylePresets` array.
   * When empty or undefined, the global batch style is used for this shot.
   */
  presetId: string
}

/**
 * Resolved style configuration for a single shot — the concrete rendering
 * parameters extracted from a style preset, ready for the render engine.
 *
 * Built by `resolveShotStyles()` at IPC time from `ShotStyleAssignment[]`
 * + the preset definitions. Carried on `RenderClipJob.shotStyleConfigs`.
 */
export interface ShotStyleConfig {
  /** 0-based shot index (matches ShotSegment position in clip.shots). */
  shotIndex: number
  /** Clip-relative start time in seconds. */
  startTime: number
  /** Clip-relative end time in seconds. */
  endTime: number
  /** Caption style override for this shot. `null` = use global. */
  captionStyle?: {
    animation: CaptionAnimation
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
  } | null
  /** Zoom settings override for this shot. `null` = use global. */
  zoom?: {
    mode: ZoomMode
    intensity: ZoomIntensity
    intervalSeconds: number
  } | null
  /** Color treatment for this shot. `null` = use global. */
  colorGrade?: ColorGradeConfig | null
  /** Transition INTO this shot (from previous shot). `null` = hard cut. */
  transitionIn?: ShotTransitionConfig | null
  /** Transition OUT of this shot (to next shot). `null` = hard cut. */
  transitionOut?: ShotTransitionConfig | null
  /** B-Roll display mode override for this shot. `null` = use global. */
  brollMode?: 'fullscreen' | 'split-top' | 'split-bottom' | 'pip' | null
}
