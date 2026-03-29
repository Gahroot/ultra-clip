// ---------------------------------------------------------------------------
// Color Grade render feature — per-shot color treatment via FFmpeg eq/hue
// ---------------------------------------------------------------------------
//
// Cross-feature integration:
//   prepare()     — validates color grade configs, logs diagnostic summary
//   videoFilter() — builds piecewise eq/hue filters per shot time range
// ---------------------------------------------------------------------------

import { buildPiecewiseColorGradeFilter } from '../../color-grade'
import type { RenderFeature, PrepareResult, FilterContext } from './feature'
import type { RenderClipJob, RenderBatchOptions } from '../types'

export const colorGradeFeature: RenderFeature = {
  name: 'color-grade',

  async prepare(
    job: RenderClipJob,
    _batchOptions: RenderBatchOptions
  ): Promise<PrepareResult> {
    if (!job.shotStyleConfigs || job.shotStyleConfigs.length === 0) {
      return { tempFiles: [], modified: false }
    }

    const shotsWithGrade = job.shotStyleConfigs.filter(
      (s) => s.colorGrade !== null && s.colorGrade !== undefined
    )

    if (shotsWithGrade.length === 0) {
      return { tempFiles: [], modified: false }
    }

    const presetSummary = shotsWithGrade
      .map((s) => `shot${s.shotIndex}:${s.colorGrade!.preset}`)
      .join(', ')

    console.log(
      `[ColorGrade] Clip ${job.clipId}: ${shotsWithGrade.length}/${job.shotStyleConfigs.length} ` +
        `shot(s) with color grade [${presetSummary}]`
    )

    return { tempFiles: [], modified: true }
  },

  videoFilter(job: RenderClipJob, _context: FilterContext): string | null {
    if (!job.shotStyleConfigs || job.shotStyleConfigs.length === 0) return null

    const shotsWithGrade = job.shotStyleConfigs.filter(
      (s) => s.colorGrade !== null && s.colorGrade !== undefined
    )
    if (shotsWithGrade.length === 0) return null

    const filter = buildPiecewiseColorGradeFilter(job.shotStyleConfigs)
    return filter || null
  }
}
