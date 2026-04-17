import { createEditStyle } from '../shared/base'
import type { Archetype } from '../shared/archetypes'
import type { EditStyleTemplate } from '../shared/types'
import { T_HE_FLASH_CROSS_CROSSFADE_FS } from '../shared/transitions'

import { talkingHead } from './templates/talking-head'
import { tightPunch } from './templates/tight-punch'
import { wideBreather } from './templates/wide-breather'
import { quoteLower } from './templates/quote-lower'
import { splitImage } from './templates/split-image'
import { fullscreenImage } from './templates/fullscreen-image'
import { fullscreenQuote } from './templates/fullscreen-quote'
import { fullscreenHeadline } from './templates/fullscreen-headline'

export const rebelEditStyle: EditStyle = createEditStyle({
  id: 'rebel',
  name: 'Rebel',
  energy: 'high',
  accentColor: '#FF7B3A',
  defaultZoomStyle: 'snap',
  defaultZoomIntensity: 1.12,
  defaultTransition: 'crossfade',
  flashColor: '#FFFFFF',
  transitionDuration: 0.2,
  targetEditsPerSecond: 0.9,
  captionStyle: { highlightColor: '#FF7B3A', wordsPerLine: 4, emphasisColor: '#FF7B3A', supersizeColor: '#FFB870' },
  textAnimation: 'snap-in',
  description: 'Snap zoom with crossfades and dark caption bar — aggressive and stylish',
  colorGrade: { warmth: -0.1, contrast: 1.25, saturation: 0.85, blackLift: 0.02, highlightSoftness: 0.3 },
  transitionMap: T_HE_FLASH_CROSS_CROSSFADE_FS,
  vfxOverlays: [
    { type: 'glowing-ring', opacity: 0.55, applyToCategories: ['main-video', 'main-video-text'] },
    { type: 'diagonal-slash', opacity: 0.40, applyToCategories: ['main-video', 'main-video-text'] },
    { type: 'color-vignette', opacity: 0.28, applyToCategories: 'all' },
    { type: 'video-overlay', opacity: 0.10, applyToCategories: 'all', assetPath: 'shared/film-grain-heavy.mp4', blendMode: 'screen' },
    { type: 'image-overlay', opacity: 0.08, applyToCategories: ['main-video', 'main-video-text'], assetPath: 'shared/noise-heavy.png', blendMode: 'screen' }
  ],
  headlineStyle: { fontSize: 64, outlineColor: '#FF7B3A', animation: 'glitch', animationDurationMs: 100 }
})

export const rebelTemplates: Record<Archetype, EditStyleTemplate> = {
  'talking-head': talkingHead,
  'tight-punch': tightPunch,
  'wide-breather': wideBreather,
  'quote-lower': quoteLower,
  'split-image': splitImage,
  'fullscreen-image': fullscreenImage,
  'fullscreen-quote': fullscreenQuote,
  'fullscreen-headline': fullscreenHeadline
}
