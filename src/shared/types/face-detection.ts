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
