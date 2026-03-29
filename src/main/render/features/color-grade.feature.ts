// ---------------------------------------------------------------------------
// Color Grade render feature — per-shot color treatment via FFmpeg eq/hue
// ---------------------------------------------------------------------------

import { buildPiecewiseColorGradeFilter } from '../../color-grade'
import type { RenderFeature, FilterContext } from './feature'
import type { RenderClipJob } from '../types'

export const colorGradeFeature: RenderFeature = {
  name: 'color-grade',

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
