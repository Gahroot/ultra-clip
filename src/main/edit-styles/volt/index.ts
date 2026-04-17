import { createEditStyle } from '../shared/base'
import type { Archetype } from '../shared/archetypes'
import type { EditStyleTemplate } from '../shared/types'
import { T_VOLT } from '../shared/transitions'

import { talkingHead } from './templates/talking-head'
import { tightPunch } from './templates/tight-punch'
import { wideBreather } from './templates/wide-breather'
import { quoteLower } from './templates/quote-lower'
import { splitImage } from './templates/split-image'
import { fullscreenImage } from './templates/fullscreen-image'
import { fullscreenQuote } from './templates/fullscreen-quote'
import { fullscreenHeadline } from './templates/fullscreen-headline'

export const voltEditStyle: EditStyle = createEditStyle({
  id: 'volt',
  name: 'Volt',
  energy: 'high',
  accentColor: '#39FF14',
  letterbox: 'bottom',
  defaultZoomStyle: 'word-pulse',
  defaultZoomIntensity: 1.10,
  defaultTransition: 'flash-cut',
  flashColor: '#FF7B3A',
  transitionDuration: 0.15,
  targetEditsPerSecond: 1.4,
  captionStyle: { highlightColor: '#39FF14', wordsPerLine: 4, emphasisColor: '#39FF14' },
  textAnimation: 'scale-up',
  description: 'Neon-green word pulses with flash cuts and heavy bottom bar — maximum energy',
  colorGrade: { warmth: 0.0, contrast: 1.35, saturation: 1.20, blackLift: 0.0, highlightSoftness: 0.2 },
  transitionMap: T_VOLT,
  vfxOverlays: [
    { type: 'gradient-bar-bottom', opacity: 0.45, applyToCategories: ['main-video', 'main-video-text'] },
    { type: 'color-vignette', opacity: 0.22, applyToCategories: ['main-video', 'main-video-text'] },
    { type: 'color-tint', opacity: 0.04, applyToCategories: ['main-video', 'main-video-text'] },
    { type: 'image-overlay', opacity: 0.35, applyToCategories: ['main-video', 'main-video-text'], assetPath: 'volt/hud-bracket.png', blendMode: 'normal' },
    { type: 'image-overlay', opacity: 0.12, applyToCategories: 'all', assetPath: 'volt/scanlines-crt.png', blendMode: 'normal' },
    { type: 'image-overlay', opacity: 0.20, applyToCategories: 'all', assetPath: 'volt/chromatic-edge.png', blendMode: 'screen' }
  ],
  headlineStyle: { fontSize: 66, textColor: '#39FF14', animation: 'scale-pop', animationDurationMs: 150, accentUnderline: true }
})

export const voltTemplates: Record<Archetype, EditStyleTemplate> = {
  'talking-head': talkingHead,
  'tight-punch': tightPunch,
  'wide-breather': wideBreather,
  'quote-lower': quoteLower,
  'split-image': splitImage,
  'fullscreen-image': fullscreenImage,
  'fullscreen-quote': fullscreenQuote,
  'fullscreen-headline': fullscreenHeadline
}
