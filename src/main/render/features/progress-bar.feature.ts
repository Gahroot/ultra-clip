// ---------------------------------------------------------------------------
// Progress Bar feature — animated completion bar overlay
// ---------------------------------------------------------------------------

import { buildProgressBarFilter } from '../../overlays/progress-bar'
import type { RenderFeature, PrepareResult, OverlayPassResult, OverlayContext } from './feature'
import type { RenderClipJob, RenderBatchOptions } from '../types'

/**
 * Renders an animated thin bar (top or bottom of frame) that fills left→right
 * over the clip duration, exploiting the "completion commitment" psychological
 * effect. Uses FFmpeg's `drawbox` filter — no temp files needed.
 */
export const progressBarFeature: RenderFeature = {
  name: 'progress-bar',

  async prepare(
    job: RenderClipJob,
    batchOptions: RenderBatchOptions
  ): Promise<PrepareResult> {
    const config = batchOptions.progressBarOverlay
    if (!config?.enabled) return { tempFiles: [], modified: false }

    // Per-clip override can disable progress bar for this clip
    if (job.clipOverrides?.enableProgressBar === false) {
      return { tempFiles: [], modified: false }
    }

    // Inject config into the job for overlayPass to consume
    job.progressBarConfig = config

    console.log(
      `[ProgressBar] Overlay enabled — position: ${config.position}, height: ${config.height}px, style: ${config.style}`
    )

    return { tempFiles: [], modified: true }
  },

  overlayPass(
    job: RenderClipJob,
    context: OverlayContext
  ): OverlayPassResult | null {
    if (!job.progressBarConfig?.enabled) return null

    const barFilter = buildProgressBarFilter(context.clipDuration, job.progressBarConfig)
    if (!barFilter) return null

    return { name: 'progress-bar', filter: barFilter }
  }
}
