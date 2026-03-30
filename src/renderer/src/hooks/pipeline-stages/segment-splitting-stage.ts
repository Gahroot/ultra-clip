// ---------------------------------------------------------------------------
// Segment Splitting Stage — split approved clips into styled segments
//
// Optional pipeline stage that runs after AI editing (or scoring when AI edit
// is disabled). For each approved clip, splits the transcript words into 4–7
// segments using natural sentence/pause boundaries, then assigns visual style
// variants using the selected edit style preset. Segments are stored in the
// Zustand store for the segment timeline editor and consumed at render time.
// ---------------------------------------------------------------------------

import type { ClipCandidate, VideoSegment } from '../../store'
import { createStageReporter } from '../../lib/progress-reporter'
import type { PipelineContext } from './types'
import { handleStageError } from './types'

/**
 * Split approved clips into segments and assign visual styles.
 * Only runs when the user has selected an edit style preset.
 */
export async function segmentSplittingStage(
  ctx: PipelineContext,
  clips: ClipCandidate[]
): Promise<void> {
  const { check, setPipeline, addError, store, source, geminiApiKey } = ctx

  const selectedEditStyleId = ctx.getState().selectedEditStyleId

  if (clips.length === 0) return

  const reporter = createStageReporter(setPipeline, 'segmenting')
  reporter.start('Splitting clips into segments…')
  check()

  const clipWithWords = clips.filter(
    (c) => c.wordTimestamps && c.wordTimestamps.length > 0
  )

  if (clipWithWords.length === 0) {
    reporter.done('No clips with transcript data — skipping')
    ctx.markStageCompleted('segmenting')
    return
  }

  let processedCount = 0
  let totalSegments = 0

  for (const clip of clipWithWords) {
    check()

    const clipWords = clip.wordTimestamps!.filter(
      (w) => w.start >= clip.startTime && w.end <= clip.endTime
    )

    if (clipWords.length === 0) {
      processedCount++
      continue
    }

    reporter.update(
      `Splitting clip ${processedCount + 1}/${clipWithWords.length}…`,
      Math.round((processedCount / clipWithWords.length) * 80)
    )

    try {
      // Step 1: Split words into segments
      const segments: VideoSegment[] = await window.api.splitSegmentsForEditor(
        clip.id,
        clipWords,
        undefined // use default target duration (~5s)
      )

      if (segments.length === 0) {
        processedCount++
        continue
      }

      // Step 2: Assign visual styles using the selected edit style
      reporter.update(
        `Styling ${segments.length} segments for clip ${processedCount + 1}/${clipWithWords.length}…`,
        Math.round(((processedCount + 0.5) / clipWithWords.length) * 80)
      )

      const styledSegments: VideoSegment[] = await window.api.assignSegmentStyles(
        segments,
        selectedEditStyleId,
        geminiApiKey || undefined
      )

      // Step 3: Store segments in the Zustand store
      store.setSegments(clip.id, styledSegments)
      totalSegments += styledSegments.length
    } catch (err) {
      // Non-critical — log and continue with remaining clips
      handleStageError(err, `Segment splitting for clip ${clip.id}`, addError)
    }

    processedCount++
  }

  reporter.done(
    totalSegments > 0
      ? `${totalSegments} segment${totalSegments !== 1 ? 's' : ''} across ${processedCount} clip${processedCount !== 1 ? 's' : ''}`
      : 'No segments created'
  )
  ctx.markStageCompleted('segmenting')
}
