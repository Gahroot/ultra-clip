// ---------------------------------------------------------------------------
// Shot Transition render feature — visual transitions at shot boundaries
// ---------------------------------------------------------------------------

import { buildShotTransitionFilters } from '../../shot-transitions'
import type { RenderFeature, FilterContext } from './feature'
import type { RenderClipJob } from '../types'

export const shotTransitionFeature: RenderFeature = {
  name: 'shot-transition',

  videoFilter(job: RenderClipJob, context: FilterContext): string | null {
    if (!job.shotStyleConfigs || job.shotStyleConfigs.length < 2) return null

    const hasTransitions = job.shotStyleConfigs.some(
      (s) =>
        (s.transitionIn && s.transitionIn.type !== 'none') ||
        (s.transitionOut && s.transitionOut.type !== 'none')
    )
    if (!hasTransitions) return null

    const filter = buildShotTransitionFilters(job.shotStyleConfigs, context.clipDuration)
    return filter || null
  }
}
