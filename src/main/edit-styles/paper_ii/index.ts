import { createEditStyle } from '../shared/base'
import type { Archetype } from '../shared/archetypes'
import type { EditStyleTemplate } from '../shared/types'
import { T_HE_CROSSFADE_FLASH_RETURN } from '../shared/transitions'

import { talkingHead } from './templates/talking-head'
import { tightPunch } from './templates/tight-punch'
import { wideBreather } from './templates/wide-breather'
import { quoteLower } from './templates/quote-lower'
import { splitImage } from './templates/split-image'
import { fullscreenImage } from './templates/fullscreen-image'
import { fullscreenQuote } from './templates/fullscreen-quote'
import { fullscreenHeadline } from './templates/fullscreen-headline'

export const paperIiEditStyle: EditStyle = createEditStyle({
  id: 'paper_ii',
  name: 'Paper II',
  energy: 'high',
  accentColor: '#FF8C42',
  defaultZoomStyle: 'drift',
  defaultZoomIntensity: 1.06,
  defaultTransition: 'crossfade',
  flashColor: '#FFFFFF',
  transitionDuration: 0.2,
  targetEditsPerSecond: 0.9,
  captionStyle: { fontName: 'Inter', fontSize: 0.060, highlightColor: '#FF8C42', emphasisColor: '#FF8C42', supersizeColor: '#FFB870' },
  textAnimation: 'none',
  description: 'Fast drifting zoom with smooth fades and open captions — energetic and flowing',
  colorGrade: { warmth: 0.0, contrast: 1.05, saturation: 0.95, blackLift: 0.04, highlightSoftness: 0.7 },
  transitionMap: T_HE_CROSSFADE_FLASH_RETURN,
  vfxOverlays: [
    { type: 'diagonal-slash', opacity: 0.30, applyToCategories: ['main-video', 'main-video-text'] },
    { type: 'color-tint', opacity: 0.06, applyToCategories: 'all' },
    { type: 'video-overlay', opacity: 0.06, applyToCategories: 'all', assetPath: 'shared/dust-particles.mp4', blendMode: 'screen' }
  ],
  headlineStyle: { outlineColor: '#FF8C42', animation: 'slide-up', animationDurationMs: 200 }
})

export const paperIiTemplates: Record<Archetype, EditStyleTemplate> = {
  'talking-head': talkingHead,
  'tight-punch': tightPunch,
  'wide-breather': wideBreather,
  'quote-lower': quoteLower,
  'split-image': splitImage,
  'fullscreen-image': fullscreenImage,
  'fullscreen-quote': fullscreenQuote,
  'fullscreen-headline': fullscreenHeadline
}
