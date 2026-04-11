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

/** Strategy for optimizing clip endpoints. */
export type ClipEndMode = 'loop-first' | 'completion-first' | 'cliffhanger'
