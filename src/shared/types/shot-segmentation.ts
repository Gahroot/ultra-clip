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
