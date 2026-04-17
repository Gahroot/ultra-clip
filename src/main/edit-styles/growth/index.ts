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

export const growthEditStyle: EditStyle = createEditStyle({
  id: 'growth',
  name: 'Growth',
  energy: 'medium',
  accentColor: '#CC3333',
  letterbox: 'bottom',
  defaultZoomStyle: 'snap',
  defaultZoomIntensity: 1.10,
  defaultTransition: 'flash-cut',
  flashColor: '#CC3333',
  transitionDuration: 0.25,
  targetEditsPerSecond: 0.4,
  captionStyle: { highlightColor: '#CC3333', emphasisColor: '#CC3333', supersizeColor: '#FF4444' },
  textAnimation: 'scale-up',
  description: 'Snap zoom with red flash cuts and bottom bar — bold and educational',
  colorGrade: { warmth: 0.15, contrast: 1.2, saturation: 1.1, blackLift: 0.02, highlightSoftness: 0.4 },
  transitionMap: T_FLASH_CROSS_WASH_FT,
  vfxOverlays: [
    { type: 'diagonal-slash', opacity: 0.35, applyToCategories: ['main-video', 'main-video-text'] },
    { type: 'color-tint', opacity: 0.06, applyToCategories: 'all' },
    { type: 'image-overlay', opacity: 0.55, applyToCategories: ['main-video', 'main-video-text'], assetPath: 'growth/border-frame-red.png', blendMode: 'normal' },
    { type: 'image-overlay', opacity: 0.30, applyToCategories: ['fullscreen-text'], assetPath: 'growth/grid-lines.png', blendMode: 'normal' }
  ],
  headlineStyle: { fontSize: 64, outlineColor: '#CC3333', outlineWidth: 0, shadowDepth: 0, borderStyle: 3, backColor: '#CC3333', animation: 'scale-pop', animationDurationMs: 250 }
})

export const growthTemplates: Record<Archetype, EditStyleTemplate> = {
  'talking-head': talkingHead,
  'tight-punch': tightPunch,
  'wide-breather': wideBreather,
  'quote-lower': quoteLower,
  'split-image': splitImage,
  'fullscreen-image': fullscreenImage,
  'fullscreen-quote': fullscreenQuote,
  'fullscreen-headline': fullscreenHeadline
}
