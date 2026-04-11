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
