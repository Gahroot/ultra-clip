import { createEditStyle } from '../shared/base'
import type { Archetype } from '../shared/archetypes'
import type { EditStyleTemplate } from '../shared/types'
import { T_WASH_HEAVY } from '../shared/transitions'

import { talkingHead } from './templates/talking-head'
import { tightPunch } from './templates/tight-punch'
import { wideBreather } from './templates/wide-breather'
import { quoteLower } from './templates/quote-lower'
import { splitImage } from './templates/split-image'
import { fullscreenImage } from './templates/fullscreen-image'
import { fullscreenQuote } from './templates/fullscreen-quote'
import { fullscreenHeadline } from './templates/fullscreen-headline'

export const cinematicEditStyle: EditStyle = createEditStyle({
  id: 'cinematic',
  name: 'Cinematic',
  energy: 'medium',
  accentColor: '#FF6B35',
  defaultZoomStyle: 'none',
  defaultZoomIntensity: 1.0,
  defaultTransition: 'color-wash',
  flashColor: '#FF6B35',
  transitionDuration: 0.35,
  targetEditsPerSecond: 0.7,
  captionStyle: { highlightColor: '#FF6B35', emphasisColor: '#FF6B35', supersizeColor: '#FF8C42' },
  textAnimation: 'fade-in',
  description: 'Color wash transitions with warm glow and smooth pacing — epic and cinematic',
  colorGrade: { warmth: 0.35, contrast: 1.2, saturation: 1.1, blackLift: 0.03, highlightSoftness: 0.5 },
  transitionMap: T_WASH_HEAVY,
  vfxOverlays: [
    { type: 'color-vignette', opacity: 0.25, applyToCategories: 'all' },
    { type: 'image-overlay', opacity: 0.18, applyToCategories: ['main-video', 'main-video-text'], assetPath: 'cinematic/warm-wash-left.png', blendMode: 'screen' },
    { type: 'image-overlay', opacity: 0.12, applyToCategories: ['main-video', 'main-video-text'], assetPath: 'cinematic/warm-wash-right.png', blendMode: 'screen' },
    { type: 'video-overlay', opacity: 0.08, applyToCategories: 'all', assetPath: 'shared/film-grain-minimal.mp4', blendMode: 'screen' }
  ],
  headlineStyle: { fontSize: 62, outlineColor: '#FF6B35', animation: 'slide-down' }
})

export const cinematicTemplates: Record<Archetype, EditStyleTemplate> = {
  'talking-head': talkingHead,
  'tight-punch': tightPunch,
  'wide-breather': wideBreather,
  'quote-lower': quoteLower,
  'split-image': splitImage,
  'fullscreen-image': fullscreenImage,
  'fullscreen-quote': fullscreenQuote,
  'fullscreen-headline': fullscreenHeadline
}
