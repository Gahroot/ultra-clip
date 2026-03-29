// ---------------------------------------------------------------------------
// Auto-Zoom feature — Ken Burns-style zoom/pan via crop+scale filter
// ---------------------------------------------------------------------------

import { generateZoomFilter } from '../../auto-zoom'
import type { ZoomSettings } from '../../auto-zoom'
import { analyzeEmphasisHeuristic } from '../../word-emphasis'
import type { RenderFeature, PrepareResult, FilterContext } from './feature'
import type { RenderClipJob, RenderBatchOptions } from '../types'

/**
 * Applies subtle Ken Burns-style zoom and pan movements using FFmpeg's crop
 * filter with time-based expressions. The zoom filter is inserted into the
 * base video filter chain AFTER `scale` and BEFORE any subtitle burn-in.
 *
 * Unlike overlay features (which run as separate FFmpeg passes), auto-zoom is
 * part of the base video filter chain via `videoFilter()`.
 */
class AutoZoomFeature implements RenderFeature {
  readonly name = 'auto-zoom'

  /**
   * Effective zoom settings resolved per-clip during prepare().
   * Keyed by clipId so concurrent renders don't clash.
   */
  private clipZoomSettings = new Map<string, ZoomSettings | null>()

  async prepare(
    job: RenderClipJob,
    batchOptions: RenderBatchOptions
  ): Promise<PrepareResult> {
    const globalSettings = batchOptions.autoZoom

    // No global auto-zoom configured → skip
    if (!globalSettings?.enabled) {
      this.clipZoomSettings.set(job.clipId, null)
      return { tempFiles: [], modified: false }
    }

    // Per-clip override can disable auto-zoom for this clip
    if (job.clipOverrides?.enableAutoZoom === false) {
      this.clipZoomSettings.set(job.clipId, null)
      console.log(`[AutoZoom] Disabled for clip ${job.clipId} (per-clip override)`)
      return { tempFiles: [], modified: false }
    }

    // Store the effective settings for videoFilter() to consume
    this.clipZoomSettings.set(job.clipId, globalSettings)

    const clipDuration = job.endTime - job.startTime

    // For reactive mode, ensure emphasis keyframes are available on the job.
    // Captions feature populates them during its own prepare() (which runs
    // before this feature). If captions were disabled (or produced no words),
    // compute them here as a fallback so reactive zoom still works.
    if (globalSettings.mode === 'reactive' && !job.emphasisKeyframes) {
      const clipWords = (job.wordTimestamps ?? [])
        .filter((w) => w.start >= job.startTime && w.end <= job.endTime)
        .map((w) => ({
          text: w.text,
          start: w.start - job.startTime,
          end: w.end - job.startTime
        }))

      if (clipWords.length > 0) {
        const emphasized = analyzeEmphasisHeuristic(clipWords)
        job.emphasisKeyframes = emphasized
          .filter((w) => w.emphasis === 'emphasis' || w.emphasis === 'supersize')
          .map((w) => ({ time: w.start, end: w.end, level: w.emphasis as 'emphasis' | 'supersize' }))
        console.log(
          `[AutoZoom] Reactive mode — computed ${job.emphasisKeyframes.length} emphasis keyframes ` +
            `for clip ${job.clipId} (captions were not active)`
        )
      }
    }

    console.log(
      `[AutoZoom] Enabled — mode: ${globalSettings.mode}, intensity: ${globalSettings.intensity}, ` +
        `interval: ${globalSettings.intervalSeconds}s, clip duration: ${clipDuration.toFixed(1)}s`
    )

    return { tempFiles: [], modified: true }
  }

  videoFilter(job: RenderClipJob, context: FilterContext): string | null {
    const settings = this.clipZoomSettings.get(job.clipId)
    if (!settings) return null

    const filter = generateZoomFilter(
      context.clipDuration,
      settings,
      0.38,
      context.targetWidth,
      context.targetHeight,
      job.wordTimestamps,
      job.emphasisKeyframes
    )

    // Clean up the stored settings now that we've consumed them
    this.clipZoomSettings.delete(job.clipId)

    return filter || null
  }
}

export const autoZoomFeature = new AutoZoomFeature()
