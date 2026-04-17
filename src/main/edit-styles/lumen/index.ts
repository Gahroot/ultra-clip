import { createEditStyle } from '../shared/base'
import type { Archetype } from '../shared/archetypes'
import type { EditStyleTemplate } from '../shared/types'
import { T_HARD_SOFT_RETURN } from '../shared/transitions'

import { talkingHead } from './templates/talking-head'
import { tightPunch } from './templates/tight-punch'
import { wideBreather } from './templates/wide-breather'
import { quoteLower } from './templates/quote-lower'
import { splitImage } from './templates/split-image'
import { fullscreenImage } from './templates/fullscreen-image'
import { fullscreenQuote } from './templates/fullscreen-quote'
import { fullscreenHeadline } from './templates/fullscreen-headline'

export const lumenEditStyle: EditStyle = createEditStyle({
  id: 'lumen',
  name: 'Lumen',
  energy: 'medium',
  accentColor: '#CC3333',
  defaultZoomStyle: 'drift',
  defaultZoomIntensity: 1.05,
  defaultTransition: 'hard-cut',
  flashColor: '#FFFFFF',
  transitionDuration: 0.3,
  targetEditsPerSecond: 0.5,
  captionStyle: { highlightColor: '#CC3333', emphasisColor: '#CC3333', supersizeColor: '#FF4444' },
  textAnimation: 'scale-up',
  description: 'Drifting zoom with hard cuts and transparent captions — raw and authentic',
  colorGrade: { warmth: 0.0, contrast: 1.05, saturation: 0.95, blackLift: 0.05, highlightSoftness: 0.9 },
  transitionMap: T_HARD_SOFT_RETURN,
  vfxOverlays: [
    { type: 'color-tint', opacity: 0.04, applyToCategories: 'all' },
    { type: 'video-overlay', opacity: 0.15, applyToCategories: ['main-video', 'main-video-text'], assetPath: 'shared/light-leak-warm.mp4', blendMode: 'screen' },
    { type: 'video-overlay', opacity: 0.06, applyToCategories: 'all', assetPath: 'shared/dust-particles.mp4', blendMode: 'screen' }
  ],
  headlineStyle: { fontSize: 58, outlineColor: '#CC3333' }
})

export const lumenTemplates: Record<Archetype, EditStyleTemplate> = {
  'talking-head': talkingHead,
  'tight-punch': tightPunch,
  'wide-breather': wideBreather,
  'quote-lower': quoteLower,
  'split-image': splitImage,
  'fullscreen-image': fullscreenImage,
  'fullscreen-quote': fullscreenQuote,
  'fullscreen-headline': fullscreenHeadline
}
