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
export type CaptionAnimation = 'karaoke-fill' | 'word-pop' | 'fade-in' | 'glow' | 'word-box'

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
