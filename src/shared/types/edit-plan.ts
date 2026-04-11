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
  level: 'emphasis' | 'supersize' | 'box'
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
