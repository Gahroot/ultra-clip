/**
 * Segment image prompt builder — stub
 *
 * Not yet implemented. Callers handle errors gracefully.
 */

export interface SegmentImagePromptOptions {
  brollSuggestion: string
  overlayText?: string
  editStyleId: string
  accentColor: string
  segmentCategory: 'main-video-images' | 'fullscreen-image'
}

export function buildSegmentImagePrompt(_opts: SegmentImagePromptOptions): string {
  throw new Error('Image prompt builder is not yet implemented')
}
