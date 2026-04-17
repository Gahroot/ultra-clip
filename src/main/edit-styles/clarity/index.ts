import { createEditStyle } from '../shared/base'
import type { Archetype } from '../shared/archetypes'
import type { EditStyleTemplate } from '../shared/types'
import { T_CROSSFADE_NO_WASH } from '../shared/transitions'

import { talkingHead } from './templates/talking-head'
import { tightPunch } from './templates/tight-punch'
import { wideBreather } from './templates/wide-breather'
import { quoteLower } from './templates/quote-lower'
import { splitImage } from './templates/split-image'
import { fullscreenImage } from './templates/fullscreen-image'
import { fullscreenQuote } from './templates/fullscreen-quote'
import { fullscreenHeadline } from './templates/fullscreen-headline'

export const clarityEditStyle: EditStyle = createEditStyle({
  id: 'clarity',
  name: 'Clarity',
  energy: 'low',
  accentColor: '#FF8C42',
  defaultZoomStyle: 'snap',
  defaultZoomIntensity: 1.08,
  defaultTransition: 'crossfade',
  flashColor: '#FFFFFF',
  transitionDuration: 0.45,
  targetEditsPerSecond: 0.3,
  captionStyle: { highlightColor: '#FF8C42', emphasisColor: '#FF8C42', supersizeColor: '#FFB870' },
  textAnimation: 'none',
  description: 'Clean open captions with snap zoom and smooth fades — minimal and focused',
  colorGrade: { warmth: 0.05, contrast: 1.05, saturation: 1.0, blackLift: 0.06, highlightSoftness: 0.8 },
  transitionMap: T_CROSSFADE_NO_WASH,
  vfxOverlays: [
    { type: 'image-overlay', opacity: 0.10, applyToCategories: 'all', assetPath: 'shared/vignette-dark.png', blendMode: 'normal' }
  ],
  headlineStyle: { fontSize: 58 }
})

export const clarityTemplates: Record<Archetype, EditStyleTemplate> = {
  'talking-head': talkingHead,
  'tight-punch': tightPunch,
  'wide-breather': wideBreather,
  'quote-lower': quoteLower,
  'split-image': splitImage,
  'fullscreen-image': fullscreenImage,
  'fullscreen-quote': fullscreenQuote,
  'fullscreen-headline': fullscreenHeadline
}
