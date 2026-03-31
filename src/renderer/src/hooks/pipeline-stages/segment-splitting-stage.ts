// ---------------------------------------------------------------------------
// Segment Splitting Stage — split approved clips into styled segments
//
// Optional pipeline stage that runs after AI editing (or scoring when AI edit
// is disabled). For each approved clip, splits the transcript words into 4–7
// segments using natural sentence/pause boundaries, then assigns visual style
// variants using the selected edit style preset. Segments are stored in the
// Zustand store for the segment timeline editor and consumed at render time.
//
// After style assignment, any segment with category 'main-video-images' or
// 'fullscreen-image' will have a fal.ai B-roll image generated in the
// background (if falApiKey is set). Image generation runs in parallel with
// Promise.allSettled so one failure never blocks the rest.
// ---------------------------------------------------------------------------

import type { ClipCandidate, EditStyle, VideoSegment } from '../../store'
import { createStageReporter } from '../../lib/progress-reporter'
import type { PipelineContext } from './types'
import { handleStageError } from './types'

/** Segment categories that require a B-roll image. */
const IMAGE_CATEGORIES = new Set<string>(['main-video-images', 'fullscreen-image'])

/**
 * Generate fal.ai images for segments that need visuals.
 *
 * Runs in parallel — one request per segment. Uses Promise.allSettled so a
 * single failure never blocks the rest.  On success, each segment's imagePath
 * is updated in the Zustand store.  On failure, a warning is logged and the
 * segment is left without an imagePath (render pipeline falls back gracefully).
 */
async function generateImagesForSegments(
  ctx: PipelineContext,
  clipId: string,
  segments: VideoSegment[],
  editStyleId: string,
  accentColor: string,
  totalImageSegments: number,
  completedBefore: number,
  setPipeline: PipelineContext['setPipeline']
): Promise<void> {
  const { falApiKey, store } = ctx

  const imageSegments = segments.filter(
    (s) => IMAGE_CATEGORIES.has(s.segmentStyleCategory) && !s.imagePath
  )

  if (imageSegments.length === 0) return

  let completedCount = completedBefore

  const tasks = imageSegments.map(async (segment) => {
    try {
      const imagePath = await window.api.generateSegmentImage({
        brollSuggestion: segment.captionText,
        editStyleId,
        accentColor,
        segmentCategory: segment.segmentStyleCategory as 'main-video-images' | 'fullscreen-image',
        apiKey: falApiKey
      })

      store.updateSegment(clipId, segment.id, { imagePath })
    } catch (err) {
      console.warn(
        `[Segment Images] Failed for segment "${segment.id}":`,
        err instanceof Error ? err.message : String(err)
      )
      // Leave imagePath unset — render pipeline falls back to main-video layout
    } finally {
      completedCount++
      setPipeline({
        stage: 'segmenting',
        message: `Generating B-roll images (${completedCount}/${totalImageSegments})…`,
        percent: Math.round(80 + (completedCount / totalImageSegments) * 20)
      })
    }
  })

  await Promise.allSettled(tasks)
}

/**
 * Split approved clips into segments and assign visual styles.
 * Only runs when the user has selected an edit style preset.
 */
export async function segmentSplittingStage(
  ctx: PipelineContext,
  clips: ClipCandidate[]
): Promise<void> {
  const { check, setPipeline, addError, store, geminiApiKey, falApiKey } = ctx

  const selectedEditStyleId = ctx.getState().selectedEditStyleId

  if (clips.length === 0) return

  // Look up the edit style's default transition and accent color
  const editStyles = ctx.getState().editStyles
  const selectedEditStyle: EditStyle | undefined = selectedEditStyleId
    ? editStyles.find((s: EditStyle) => s.id === selectedEditStyleId)
    : undefined
  const defaultTransition = selectedEditStyle?.defaultTransition
  const accentColor = selectedEditStyle?.accentColor ?? '#FF6B35'

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

  // Collect all styled segments per clip so we can do image generation after
  // all clips are split (lets us report accurate totals in the progress message)
  const allStyledSegmentsByClip: Array<{ clipId: string; segments: VideoSegment[] }> = []

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
        undefined, // use default target duration (~5s)
        defaultTransition
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

      allStyledSegmentsByClip.push({ clipId: clip.id, segments: styledSegments })
    } catch (err) {
      // Non-critical — log and continue with remaining clips
      handleStageError(err, `Segment splitting for clip ${clip.id}`, addError)
    }

    processedCount++
  }

  // ── Step 4: Generate fal.ai B-roll images (optional) ────────────────────

  if (falApiKey && selectedEditStyleId && allStyledSegmentsByClip.length > 0) {
    // Count how many segments across all clips actually need images
    const totalImageSegments = allStyledSegmentsByClip.reduce((sum, { segments }) => {
      return sum + segments.filter(
        (s) => IMAGE_CATEGORIES.has(s.segmentStyleCategory) && !s.imagePath
      ).length
    }, 0)

    if (totalImageSegments > 0) {
      reporter.update(
        `Generating B-roll images (0/${totalImageSegments})…`,
        80
      )

      let completedBefore = 0

      for (const { clipId, segments } of allStyledSegmentsByClip) {
        check()
        const clipImageCount = segments.filter(
          (s) => IMAGE_CATEGORIES.has(s.segmentStyleCategory) && !s.imagePath
        ).length

        if (clipImageCount === 0) continue

        await generateImagesForSegments(
          ctx,
          clipId,
          segments,
          selectedEditStyleId,
          accentColor,
          totalImageSegments,
          completedBefore,
          setPipeline
        )

        completedBefore += clipImageCount
      }
    }
  }

  reporter.done(
    totalSegments > 0
      ? `${totalSegments} segment${totalSegments !== 1 ? 's' : ''} across ${processedCount} clip${processedCount !== 1 ? 's' : ''}`
      : 'No segments created'
  )
  ctx.markStageCompleted('segmenting')
}
