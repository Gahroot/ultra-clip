import { createEditStyle } from '../shared/base'
import type { Archetype } from '../shared/archetypes'
import type { EditStyleTemplate } from '../shared/types'
import { T_PRIME } from '../shared/transitions'

import { talkingHead } from './templates/talking-head'
import { tightPunch } from './templates/tight-punch'
import { wideBreather } from './templates/wide-breather'
import { quoteLower } from './templates/quote-lower'
import { splitImage } from './templates/split-image'
import { fullscreenImage } from './templates/fullscreen-image'
import { fullscreenQuote } from './templates/fullscreen-quote'
import { fullscreenHeadline } from './templates/fullscreen-headline'

export const primeEditStyle: EditStyle = createEditStyle({
  id: 'prime',
  name: 'Prime',
  energy: 'high',
  accentColor: '#FF8C42',
  defaultZoomStyle: 'word-pulse',
  defaultZoomIntensity: 1.08,
  defaultTransition: 'crossfade',
  flashColor: '#FFFFFF',
  transitionDuration: 0.15,
  targetEditsPerSecond: 1.1,
  captionStyle: { highlightColor: '#FF8C42', emphasisColor: '#FF8C42', supersizeColor: '#FFD700' },
  textAnimation: 'slide-up',
  description: 'Word-synced zoom pulses with smooth fades and warm glow — dynamic and engaging',
  colorGrade: { warmth: 0.1, contrast: 1.15, saturation: 1.05, blackLift: 0.02, highlightSoftness: 0.4 },
  transitionMap: T_PRIME,
  vfxOverlays: [
    { type: 'glowing-ring', opacity: 0.50, applyToCategories: ['main-video', 'main-video-text'] },
    { type: 'gradient-bar-bottom', opacity: 0.35, applyToCategories: ['main-video', 'main-video-text'] },
    { type: 'image-overlay', opacity: 0.10, applyToCategories: 'all', assetPath: 'prime/vignette-teal.png', blendMode: 'normal' },
    { type: 'video-overlay', opacity: 0.08, applyToCategories: ['main-video', 'main-video-text'], assetPath: 'shared/bokeh.mp4', blendMode: 'screen' },
    { type: 'video-overlay', opacity: 0.05, applyToCategories: 'all', assetPath: 'shared/film-grain-minimal.mp4', blendMode: 'screen' }
  ],
  headlineStyle: { fontSize: 62, outlineColor: '#FF8C42', animation: 'scale-bounce', animationDurationMs: 350 }
})

export const primeTemplates: Record<Archetype, EditStyleTemplate> = {
  'talking-head': talkingHead,
  'tight-punch': tightPunch,
  'wide-breather': wideBreather,
  'quote-lower': quoteLower,
  'split-image': splitImage,
  'fullscreen-image': fullscreenImage,
  'fullscreen-quote': fullscreenQuote,
  'fullscreen-headline': fullscreenHeadline
}
