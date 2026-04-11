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
