import { createEditStyle } from '../shared/base'
import type { Archetype } from '../shared/archetypes'
import type { EditStyleTemplate } from '../shared/types'
import { T_CROSSFADE_WASH_INTO_FT } from '../shared/transitions'

import { talkingHead } from './templates/talking-head'
import { tightPunch } from './templates/tight-punch'
import { wideBreather } from './templates/wide-breather'
import { quoteLower } from './templates/quote-lower'
import { splitImage } from './templates/split-image'
import { fullscreenImage } from './templates/fullscreen-image'
import { fullscreenQuote } from './templates/fullscreen-quote'
import { fullscreenHeadline } from './templates/fullscreen-headline'

export const elevateEditStyle: EditStyle = createEditStyle({
  id: 'elevate',
  name: 'Elevate',
  energy: 'low',
  accentColor: '#D4AF37',
  defaultZoomStyle: 'zoom-out',
  defaultZoomIntensity: 1.06,
  defaultTransition: 'crossfade',
  flashColor: '#FFFDD0',
  transitionDuration: 0.5,
  targetEditsPerSecond: 0.3,
  captionStyle: {
    fontSize: 0.060,
    primaryColor: '#FFFDD0',
    highlightColor: '#D4AF37',
    outline: 0,
    wordsPerLine: 4,
    animation: 'fade-in',
    emphasisColor: '#D4AF37'
  },
  textAnimation: 'fade-in',
  description: 'Premium cinematic documentary — slow zoom-out reveals, long crossfades, warm teal-orange grade, shadow-only captions. Reflective, intimate, aspirational.',
  colorGrade: { warmth: 0.55, contrast: 1.05, saturation: 0.88, blackLift: 0.07, highlightSoftness: 0.80 },
  segmentDurationTarget: { min: 4, max: 8, ideal: 6 },
  transitionMap: T_CROSSFADE_WASH_INTO_FT,
  vfxOverlays: [
    { type: 'color-vignette', opacity: 0.18, applyToCategories: 'all' },
    { type: 'video-overlay', opacity: 0.07, applyToCategories: 'all', assetPath: 'shared/film-grain-minimal.mp4', blendMode: 'screen' },
    { type: 'image-overlay', opacity: 0.10, applyToCategories: ['main-video-images'], assetPath: 'elevate/divider-star.png', blendMode: 'normal' },
    { type: 'video-overlay', opacity: 0.08, applyToCategories: ['main-video', 'main-video-text'], assetPath: 'shared/light-leak-warm.mp4', blendMode: 'screen' }
  ],
  headlineStyle: { fontSize: 62, textColor: '#D4AF37', outlineWidth: 0, shadowDepth: 3, animationDurationMs: 600 }
})

export const elevateTemplates: Record<Archetype, EditStyleTemplate> = {
  'talking-head': talkingHead,
  'tight-punch': tightPunch,
  'wide-breather': wideBreather,
  'quote-lower': quoteLower,
  'split-image': splitImage,
  'fullscreen-image': fullscreenImage,
  'fullscreen-quote': fullscreenQuote,
  'fullscreen-headline': fullscreenHeadline
}
