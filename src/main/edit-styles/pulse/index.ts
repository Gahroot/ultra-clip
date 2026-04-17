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

export const pulseEditStyle: EditStyle = createEditStyle({
  id: 'pulse',
  name: 'Pulse',
  energy: 'high',
  accentColor: '#00D9FF',
  defaultZoomStyle: 'word-pulse',
  defaultZoomIntensity: 1.08,
  defaultTransition: 'flash-cut',
  flashColor: '#00D9FF',
  transitionDuration: 0.15,
  targetEditsPerSecond: 1.0,
  captionStyle: {
    fontSize: 0.09,
    highlightColor: '#00D9FF',
    outline: 3,
    shadow: 0,
    wordsPerLine: 4,
    emphasisColor: '#00D9FF',
    emphasisScale: 1.08,
    supersizeScale: 1.05
  },
  textAnimation: 'scale-up',
  description: 'Futuristic tech-interface with cyan grid, scan lines, and animated corner brackets — AI-native and high-tech',
  colorGrade: { warmth: -0.35, contrast: 1.30, saturation: 0.80, blackLift: 0.0, highlightSoftness: 0.25 },
  segmentDurationTarget: { min: 2, max: 6, ideal: 4 },
  transitionMap: T_HE_FLASH_CROSS_CROSSFADE_FS,
  vfxOverlays: [
    { type: 'grid-overlay',    opacity: 0.18, applyToCategories: 'all' },
    { type: 'corner-brackets', opacity: 0.75, applyToCategories: 'all' },
    { type: 'pulse-border',    opacity: 0.55, applyToCategories: ['main-video', 'main-video-text'] },
    { type: 'scan-line',       opacity: 0.22, applyToCategories: ['main-video', 'main-video-text'] },
    { type: 'color-vignette',  opacity: 0.15, applyToCategories: 'all' },
    { type: 'image-overlay',   opacity: 0.40, applyToCategories: ['main-video', 'main-video-text'], assetPath: 'pulse/corner-brackets.png', blendMode: 'normal' },
    { type: 'image-overlay',   opacity: 0.30, applyToCategories: ['main-video', 'main-video-text'], assetPath: 'pulse/rounded-frame.png', blendMode: 'normal' },
    { type: 'image-overlay',   opacity: 0.08, applyToCategories: 'all', assetPath: 'pulse/scanlines.png', blendMode: 'normal' }
  ],
  headlineStyle: { fontSize: 64, textColor: '#00D9FF', animation: 'pulse-glow', animationDurationMs: 200, verticalPosition: 0.14 }
})

export const pulseTemplates: Record<Archetype, EditStyleTemplate> = {
  'talking-head': talkingHead,
  'tight-punch': tightPunch,
  'wide-breather': wideBreather,
  'quote-lower': quoteLower,
  'split-image': splitImage,
  'fullscreen-image': fullscreenImage,
  'fullscreen-quote': fullscreenQuote,
  'fullscreen-headline': fullscreenHeadline
}
