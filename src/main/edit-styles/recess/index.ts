import { createEditStyle } from '../shared/base'
import type { Archetype } from '../shared/archetypes'
import type { EditStyleTemplate } from '../shared/types'
import { T_HARD_FLASH_INTO_FT } from '../shared/transitions'

import { talkingHead } from './templates/talking-head'
import { tightPunch } from './templates/tight-punch'
import { wideBreather } from './templates/wide-breather'
import { quoteLower } from './templates/quote-lower'
import { splitImage } from './templates/split-image'
import { fullscreenImage } from './templates/fullscreen-image'
import { fullscreenQuote } from './templates/fullscreen-quote'
import { fullscreenHeadline } from './templates/fullscreen-headline'

export const recessEditStyle: EditStyle = createEditStyle({
  id: 'recess',
  name: 'Recess',
  energy: 'medium',
  accentColor: '#FF8C42',
  defaultZoomStyle: 'none',
  defaultZoomIntensity: 1.0,
  defaultTransition: 'hard-cut',
  flashColor: '#FFFFFF',
  transitionDuration: 0.25,
  targetEditsPerSecond: 0.6,
  captionStyle: { fontName: 'Inter', fontSize: 0.060, highlightColor: '#FF8C42', emphasisColor: '#FF8C42', supersizeColor: '#FFB870' },
  textAnimation: 'none',
  description: 'Hard cuts with no zoom and minimal captions — raw and unfiltered',
  colorGrade: { warmth: 0.0, contrast: 1.0, saturation: 1.0, blackLift: 0.03, highlightSoftness: 0.5 },
  transitionMap: T_HARD_FLASH_INTO_FT,
  vfxOverlays: [
    { type: 'color-tint', opacity: 0.04, applyToCategories: 'all' },
    { type: 'diagonal-slash', opacity: 0.25, applyToCategories: ['main-video', 'main-video-text'] },
    { type: 'video-overlay', opacity: 0.05, applyToCategories: 'all', assetPath: 'shared/dust-particles.mp4', blendMode: 'screen' }
  ],
  headlineStyle: { fontSize: 56, outlineColor: '#333333', outlineWidth: 2, shadowDepth: 1, animation: 'snap', animationDurationMs: 0 }
})

export const recessTemplates: Record<Archetype, EditStyleTemplate> = {
  'talking-head': talkingHead,
  'tight-punch': tightPunch,
  'wide-breather': wideBreather,
  'quote-lower': quoteLower,
  'split-image': splitImage,
  'fullscreen-image': fullscreenImage,
  'fullscreen-quote': fullscreenQuote,
  'fullscreen-headline': fullscreenHeadline
}
