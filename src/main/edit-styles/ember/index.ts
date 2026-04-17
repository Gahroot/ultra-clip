import { createEditStyle } from '../shared/base'
import type { Archetype } from '../shared/archetypes'
import type { EditStyleTemplate } from '../shared/types'
import { T_HARD_SOFT_RETURN } from '../shared/transitions'

import { talkingHead } from './templates/talking-head'
import { tightPunch } from './templates/tight-punch'
import { wideBreather } from './templates/wide-breather'
import { quoteLower } from './templates/quote-lower'
import { splitImage } from './templates/split-image'
import { fullscreenImage } from './templates/fullscreen-image'
import { fullscreenQuote } from './templates/fullscreen-quote'
import { fullscreenHeadline } from './templates/fullscreen-headline'

export const emberEditStyle: EditStyle = createEditStyle({
  id: 'ember',
  name: 'Ember',
  energy: 'low',
  accentColor: '#FF6B35',
  letterbox: 'bottom',
  defaultZoomStyle: 'zoom-out',
  defaultZoomIntensity: 1.10,
  defaultTransition: 'hard-cut',
  flashColor: '#FFFFFF',
  transitionDuration: 0.4,
  targetEditsPerSecond: 0.2,
  captionStyle: { highlightColor: '#FF6B35', emphasisColor: '#FF6B35', supersizeColor: '#FF8C42' },
  textAnimation: 'fade-in',
  description: 'Slow zoom-out reveals with warm bottom bar and hard cuts — calm and contemplative',
  colorGrade: { warmth: 0.4, contrast: 1.15, saturation: 1.05, blackLift: 0.04, highlightSoftness: 0.6 },
  transitionMap: T_HARD_SOFT_RETURN,
  vfxOverlays: [
    { type: 'gradient-bar-bottom', opacity: 0.30, applyToCategories: ['main-video', 'main-video-text'] },
    { type: 'image-overlay', opacity: 0.12, applyToCategories: 'all', assetPath: 'cinematic/warm-wash-left.png', blendMode: 'screen' },
    { type: 'video-overlay', opacity: 0.06, applyToCategories: ['main-video', 'main-video-text'], assetPath: 'shared/film-grain-minimal.mp4', blendMode: 'screen' }
  ],
  headlineStyle: { outlineColor: '#FF6B35', animationDurationMs: 600 }
})

export const emberTemplates: Record<Archetype, EditStyleTemplate> = {
  'talking-head': talkingHead,
  'tight-punch': tightPunch,
  'wide-breather': wideBreather,
  'quote-lower': quoteLower,
  'split-image': splitImage,
  'fullscreen-image': fullscreenImage,
  'fullscreen-quote': fullscreenQuote,
  'fullscreen-headline': fullscreenHeadline
}
