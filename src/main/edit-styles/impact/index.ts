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

export const impactEditStyle: EditStyle = createEditStyle({
  id: 'impact',
  name: 'Impact',
  energy: 'medium',
  accentColor: '#FF7B3A',
  letterbox: 'both',
  defaultZoomStyle: 'snap',
  defaultZoomIntensity: 1.15,
  defaultTransition: 'flash-cut',
  flashColor: '#FFFFFF',
  transitionDuration: 0.3,
  targetEditsPerSecond: 0.5,
  captionStyle: { highlightColor: '#4A90E2', wordsPerLine: 4, emphasisColor: '#4A90E2', supersizeColor: '#FFD700' },
  textAnimation: 'snap-in',
  description: 'Snap zoom with white flash cuts and dark cinematic bars — dramatic and powerful',
  colorGrade: { warmth: -0.2, contrast: 1.25, saturation: 0.9, blackLift: 0.0, highlightSoftness: 0.3 },
  transitionMap: T_FLASH_CROSS_WASH_FT,
  vfxOverlays: [
    { type: 'glowing-ring', opacity: 0.45, applyToCategories: ['main-video', 'main-video-text'] },
    { type: 'color-vignette', opacity: 0.22, applyToCategories: 'all' },
    { type: 'image-overlay', opacity: 0.12, applyToCategories: 'all', assetPath: 'shared/vignette-dark.png', blendMode: 'normal' },
    { type: 'video-overlay', opacity: 0.05, applyToCategories: ['main-video', 'main-video-text'], assetPath: 'shared/film-grain-heavy.mp4', blendMode: 'screen' }
  ],
  headlineStyle: { fontSize: 68, outlineColor: '#4A90E2', outlineWidth: 4, animation: 'snap', animationDurationMs: 0 }
})

export const impactTemplates: Record<Archetype, EditStyleTemplate> = {
  'talking-head': talkingHead,
  'tight-punch': tightPunch,
  'wide-breather': wideBreather,
  'quote-lower': quoteLower,
  'split-image': splitImage,
  'fullscreen-image': fullscreenImage,
  'fullscreen-quote': fullscreenQuote,
  'fullscreen-headline': fullscreenHeadline
}
