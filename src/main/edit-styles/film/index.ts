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

export const filmEditStyle: EditStyle = createEditStyle({
  id: 'film',
  name: 'Film',
  energy: 'low',
  accentColor: '#FF7B3A',
  defaultZoomStyle: 'drift',
  defaultZoomIntensity: 1.05,
  defaultTransition: 'crossfade',
  flashColor: '#FFFFFF',
  transitionDuration: 0.5,
  targetEditsPerSecond: 0.3,
  captionStyle: { highlightColor: '#FF7B3A', emphasisColor: '#FF7B3A', supersizeColor: '#FFB870' },
  textAnimation: 'fade-in',
  description: 'Gentle drifting zoom with crossfades and subtle warmth — cinematic and unhurried',
  colorGrade: { warmth: 0.3, contrast: 1.15, saturation: 1.0, blackLift: 0.05, highlightSoftness: 0.7 },
  transitionMap: T_CROSSFADE_WASH_INTO_FT,
  vfxOverlays: [
    { type: 'color-vignette', opacity: 0.18, applyToCategories: 'all' },
    { type: 'video-overlay', opacity: 0.08, applyToCategories: 'all', assetPath: 'shared/film-grain-minimal.mp4', blendMode: 'screen' },
    { type: 'image-overlay', opacity: 0.15, applyToCategories: ['main-video', 'main-video-text'], assetPath: 'cinematic/warm-wash-left.png', blendMode: 'screen' }
  ],
  headlineStyle: { fontSize: 58, textColor: '#FFFDD0', outlineColor: '#1A1A1A', animationDurationMs: 500 }
})

export const filmTemplates: Record<Archetype, EditStyleTemplate> = {
  'talking-head': talkingHead,
  'tight-punch': tightPunch,
  'wide-breather': wideBreather,
  'quote-lower': quoteLower,
  'split-image': splitImage,
  'fullscreen-image': fullscreenImage,
  'fullscreen-quote': fullscreenQuote,
  'fullscreen-headline': fullscreenHeadline
}
