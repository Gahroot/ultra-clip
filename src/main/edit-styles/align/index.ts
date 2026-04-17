import { createEditStyle } from '../shared/base'
import type { Archetype } from '../shared/archetypes'
import type { EditStyleTemplate } from '../shared/types'
import { T_FLASH_CROSS_WASH_FT } from '../shared/transitions'

import { talkingHead } from './templates/talking-head'
import { tightPunch } from './templates/tight-punch'
import { wideBreather } from './templates/wide-breather'
import { quoteLower } from './templates/quote-lower'
import { splitImage } from './templates/split-image'
import { fullscreenImage } from './templates/fullscreen-image'
import { fullscreenQuote } from './templates/fullscreen-quote'
import { fullscreenHeadline } from './templates/fullscreen-headline'

export const alignEditStyle: EditStyle = createEditStyle({
  id: 'align',
  name: 'Align',
  energy: 'medium',
  accentColor: '#FF8C42',
  defaultZoomStyle: 'none',
  defaultZoomIntensity: 1.0,
  defaultTransition: 'flash-cut',
  flashColor: '#FFFFFF',
  transitionDuration: 0.25,
  targetEditsPerSecond: 0.4,
  captionStyle: { fontName: 'Inter', highlightColor: '#FF8C42' },
  textAnimation: 'slide-up',
  description: 'Flash cuts with clean layout and no zoom — structured and precise',
  colorGrade: { warmth: 0.1, contrast: 1.1, saturation: 1.0, blackLift: 0.03, highlightSoftness: 0.5 },
  transitionMap: T_FLASH_CROSS_WASH_FT,
  vfxOverlays: [
    { type: 'gradient-bar-bottom', opacity: 0.28, applyToCategories: ['main-video', 'main-video-text'] },
    { type: 'color-tint', opacity: 0.05, applyToCategories: 'all' },
    { type: 'image-overlay', opacity: 0.08, applyToCategories: 'all', assetPath: 'shared/vignette-dark.png', blendMode: 'normal' }
  ],
  headlineStyle: { outlineColor: '#FF8C42', outlineWidth: 0, shadowDepth: 0, borderStyle: 3, backColor: '#FF8C42', animation: 'slide-up', animationDurationMs: 300 }
})

export const alignTemplates: Record<Archetype, EditStyleTemplate> = {
  'talking-head': talkingHead,
  'tight-punch': tightPunch,
  'wide-breather': wideBreather,
  'quote-lower': quoteLower,
  'split-image': splitImage,
  'fullscreen-image': fullscreenImage,
  'fullscreen-quote': fullscreenQuote,
  'fullscreen-headline': fullscreenHeadline
}
