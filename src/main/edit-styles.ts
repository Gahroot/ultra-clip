/**
 * Edit Style Presets — Captions.ai-style edit styles
 *
 * Defines all edit style presets extracted from video analysis.
 * Each style combines energy tier, zoom type, transition type,
 * caption background, letterbox, and accent color.
 */

// Types are declared globally in src/preload/index.d.ts (EditStyle)

type Energy = 'low' | 'medium' | 'high'

// ---------------------------------------------------------------------------
// Segment style IDs available per energy tier
// ---------------------------------------------------------------------------

const LOW_ENERGY_SEGMENTS = [
  'main-video-normal',
  'main-video-wide',
  'main-video-text-lower',
  'fullscreen-text-center'
]

const MEDIUM_ENERGY_SEGMENTS = [
  'main-video-normal',
  'main-video-tight',
  'main-video-wide',
  'main-video-text-lower',
  'main-video-text-center',
  'fullscreen-text-center'
]

const HIGH_ENERGY_SEGMENTS = [
  'main-video-normal',
  'main-video-tight',
  'main-video-text-lower',
  'main-video-text-center',
  'fullscreen-text-center',
  'fullscreen-text-headline'
]

// ---------------------------------------------------------------------------
// Per-energy defaults
// ---------------------------------------------------------------------------

const ENERGY_DEFAULTS: Record<Energy, {
  availableSegmentStyles: string[]
  segmentDurationTarget: { min: number; max: number; ideal: number }
}> = {
  low: {
    availableSegmentStyles: LOW_ENERGY_SEGMENTS,
    segmentDurationTarget: { min: 4, max: 10, ideal: 6 }
  },
  medium: {
    availableSegmentStyles: MEDIUM_ENERGY_SEGMENTS,
    segmentDurationTarget: { min: 3, max: 7, ideal: 5 }
  },
  high: {
    availableSegmentStyles: HIGH_ENERGY_SEGMENTS,
    segmentDurationTarget: { min: 2, max: 5, ideal: 3 }
  }
}

// ---------------------------------------------------------------------------
// Caption + headline baselines (the shape ~14/15 styles share)
// ---------------------------------------------------------------------------

const CAPTION_BASE: CaptionStyleInput = {
  fontName: 'Montserrat',
  fontSize: 0.055,
  primaryColor: '#FFFFFF',
  highlightColor: '#FFFFFF',
  outlineColor: '#000000',
  backColor: '#00000000',
  outline: 2,
  shadow: 1,
  borderStyle: 1,
  wordsPerLine: 5,
  animation: 'captions-ai',
  emphasisColor: '#FFFFFF',
  supersizeColor: '#FFFFFF'
}

const HEADLINE_BASE: HeadlineStyleConfig = {
  fontSize: 60,
  textColor: '#FFFFFF',
  outlineColor: '#000000',
  outlineWidth: 3,
  shadowDepth: 2,
  borderStyle: 1,
  bold: true,
  animation: 'fade',
  animationDurationMs: 400,
  fadeOutMs: 400,
  verticalPosition: 0.12
}

// ---------------------------------------------------------------------------
// Transition matrix templates. Low/medium-energy styles cover the 3x3 grid
// of {main-video, main-video-text, fullscreen-text}; high-energy styles add
// the fullscreen-image rows/columns.
// ---------------------------------------------------------------------------

type TMap = Record<string, TransitionType>

// All hard-cut except a soft return out of fullscreen-text. (Ember, Lumen.)
const T_HARD_SOFT_RETURN: TMap = {
  'main-video→main-video':           'hard-cut',
  'main-video→main-video-text':      'hard-cut',
  'main-video→fullscreen-text':      'hard-cut',
  'main-video-text→main-video':      'hard-cut',
  'main-video-text→main-video-text': 'hard-cut',
  'main-video-text→fullscreen-text': 'hard-cut',
  'fullscreen-text→main-video':      'crossfade',
  'fullscreen-text→main-video-text': 'crossfade',
  'fullscreen-text→fullscreen-text': 'hard-cut'
}

// Crossfade baseline, hard-cut same-category, no color-wash. (Clarity.)
const T_CROSSFADE_NO_WASH: TMap = {
  'main-video→main-video':           'hard-cut',
  'main-video→main-video-text':      'crossfade',
  'main-video→fullscreen-text':      'crossfade',
  'main-video-text→main-video':      'crossfade',
  'main-video-text→main-video-text': 'hard-cut',
  'main-video-text→fullscreen-text': 'crossfade',
  'fullscreen-text→main-video':      'crossfade',
  'fullscreen-text→main-video-text': 'crossfade',
  'fullscreen-text→fullscreen-text': 'hard-cut'
}

// Crossfade baseline, color-wash entering fullscreen-text. (Film, Elevate.)
const T_CROSSFADE_WASH_INTO_FT: TMap = {
  'main-video→main-video':           'crossfade',
  'main-video→main-video-text':      'crossfade',
  'main-video→fullscreen-text':      'color-wash',
  'main-video-text→main-video':      'crossfade',
  'main-video-text→main-video-text': 'hard-cut',
  'main-video-text→fullscreen-text': 'color-wash',
  'fullscreen-text→main-video':      'crossfade',
  'fullscreen-text→main-video-text': 'crossfade',
  'fullscreen-text→fullscreen-text': 'hard-cut'
}

// Hard-cut same-category, flash-cut cross-category, color-wash into
// fullscreen-text. (Align, Growth, Impact.)
const T_FLASH_CROSS_WASH_FT: TMap = {
  'main-video→main-video':           'hard-cut',
  'main-video→main-video-text':      'flash-cut',
  'main-video→fullscreen-text':      'color-wash',
  'main-video-text→main-video':      'flash-cut',
  'main-video-text→main-video-text': 'hard-cut',
  'main-video-text→fullscreen-text': 'color-wash',
  'fullscreen-text→main-video':      'flash-cut',
  'fullscreen-text→main-video-text': 'flash-cut',
  'fullscreen-text→fullscreen-text': 'hard-cut'
}

// All hard-cut except flash-cut entering fullscreen-text. (Recess.)
const T_HARD_FLASH_INTO_FT: TMap = {
  'main-video→main-video':           'hard-cut',
  'main-video→main-video-text':      'hard-cut',
  'main-video→fullscreen-text':      'flash-cut',
  'main-video-text→main-video':      'hard-cut',
  'main-video-text→main-video-text': 'hard-cut',
  'main-video-text→fullscreen-text': 'flash-cut',
  'fullscreen-text→main-video':      'hard-cut',
  'fullscreen-text→main-video-text': 'hard-cut',
  'fullscreen-text→fullscreen-text': 'hard-cut'
}

// Color-wash everywhere except hard-cut same-cat & soft return from FT. (Cinematic.)
const T_WASH_HEAVY: TMap = {
  'main-video→main-video':           'hard-cut',
  'main-video→main-video-text':      'color-wash',
  'main-video→fullscreen-text':      'color-wash',
  'main-video-text→main-video':      'color-wash',
  'main-video-text→main-video-text': 'hard-cut',
  'main-video-text→fullscreen-text': 'color-wash',
  'fullscreen-text→main-video':      'crossfade',
  'fullscreen-text→main-video-text': 'crossfade',
  'fullscreen-text→fullscreen-text': 'hard-cut'
}

// High-energy crossfade baseline with flash-cut return from fullscreen. (Paper II.)
const T_HE_CROSSFADE_FLASH_RETURN: TMap = {
  'main-video→main-video':            'hard-cut',
  'main-video→main-video-text':       'crossfade',
  'main-video→fullscreen-text':       'crossfade',
  'main-video→fullscreen-image':      'crossfade',
  'main-video-text→main-video':       'crossfade',
  'main-video-text→main-video-text':  'hard-cut',
  'main-video-text→fullscreen-text':  'crossfade',
  'main-video-text→fullscreen-image': 'crossfade',
  'fullscreen-text→main-video':       'flash-cut',
  'fullscreen-text→main-video-text':  'flash-cut',
  'fullscreen-text→fullscreen-image': 'crossfade',
  'fullscreen-image→main-video':      'flash-cut',
  'fullscreen-image→main-video-text': 'flash-cut',
  'fullscreen-image→fullscreen-text': 'crossfade'
}

// High-energy: flash-cut cross-cat to text-augmented; crossfade into fullscreen. (Rebel, Pulse.)
const T_HE_FLASH_CROSS_CROSSFADE_FS: TMap = {
  'main-video→main-video':            'hard-cut',
  'main-video→main-video-text':       'flash-cut',
  'main-video→fullscreen-text':       'crossfade',
  'main-video→fullscreen-image':      'crossfade',
  'main-video-text→main-video':       'flash-cut',
  'main-video-text→main-video-text':  'hard-cut',
  'main-video-text→fullscreen-text':  'crossfade',
  'main-video-text→fullscreen-image': 'crossfade',
  'fullscreen-text→main-video':       'flash-cut',
  'fullscreen-text→main-video-text':  'flash-cut',
  'fullscreen-text→fullscreen-image': 'crossfade',
  'fullscreen-image→main-video':      'flash-cut',
  'fullscreen-image→main-video-text': 'flash-cut',
  'fullscreen-image→fullscreen-text': 'crossfade'
}

// Prime: crossfade base, color-wash into fullscreen-text, flash-cut return.
const T_PRIME: TMap = {
  'main-video→main-video':            'hard-cut',
  'main-video→main-video-text':       'crossfade',
  'main-video→fullscreen-text':       'color-wash',
  'main-video→fullscreen-image':      'crossfade',
  'main-video-text→main-video':       'crossfade',
  'main-video-text→main-video-text':  'hard-cut',
  'main-video-text→fullscreen-text':  'color-wash',
  'main-video-text→fullscreen-image': 'crossfade',
  'fullscreen-text→main-video':       'flash-cut',
  'fullscreen-text→main-video-text':  'flash-cut',
  'fullscreen-text→fullscreen-image': 'crossfade',
  'fullscreen-image→main-video':      'flash-cut',
  'fullscreen-image→main-video-text': 'flash-cut',
  'fullscreen-image→fullscreen-text': 'color-wash'
}

// Volt: flash-cut everywhere except hard-cut same-cat & crossfade between fullscreens.
const T_VOLT: TMap = {
  'main-video→main-video':            'hard-cut',
  'main-video→main-video-text':       'flash-cut',
  'main-video→fullscreen-text':       'flash-cut',
  'main-video→fullscreen-image':      'flash-cut',
  'main-video-text→main-video':       'flash-cut',
  'main-video-text→main-video-text':  'hard-cut',
  'main-video-text→fullscreen-text':  'flash-cut',
  'main-video-text→fullscreen-image': 'flash-cut',
  'fullscreen-text→main-video':       'flash-cut',
  'fullscreen-text→main-video-text':  'flash-cut',
  'fullscreen-text→fullscreen-image': 'crossfade',
  'fullscreen-image→main-video':      'flash-cut',
  'fullscreen-image→main-video-text': 'flash-cut',
  'fullscreen-image→fullscreen-text': 'crossfade'
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

type EditStyleOverrides = Omit<Partial<EditStyle>, 'captionStyle' | 'headlineStyle'> & {
  id: string
  name: string
  energy: Energy
  accentColor: string
  defaultZoomStyle: EditStyle['defaultZoomStyle']
  defaultZoomIntensity: number
  defaultTransition: TransitionType
  flashColor: string
  transitionDuration: number
  targetEditsPerSecond: number
  description: string
  textAnimation: TextAnimationStyle
  colorGrade: ColorGradeParams
  transitionMap: TMap
  vfxOverlays: VFXOverlay[]
  captionStyle?: Partial<CaptionStyleInput>
  headlineStyle?: Partial<HeadlineStyleConfig>
}

function createEditStyle(o: EditStyleOverrides): EditStyle {
  const energyDefaults = ENERGY_DEFAULTS[o.energy]
  const { captionStyle, headlineStyle, ...rest } = o
  return {
    captionBgOpacity: 0,
    letterbox: 'none',
    availableSegmentStyles: energyDefaults.availableSegmentStyles,
    segmentDurationTarget: energyDefaults.segmentDurationTarget,
    ...rest,
    captionStyle: { ...CAPTION_BASE, ...captionStyle },
    headlineStyle: { ...HEADLINE_BASE, ...headlineStyle }
  }
}

// ---------------------------------------------------------------------------
// Edit style presets
// ---------------------------------------------------------------------------

export const EDIT_STYLES: EditStyle[] = [
  // ── LOW ENERGY (0.2–0.3 edits/sec) ─────────────────────────────────────

  createEditStyle({
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
  }),

  createEditStyle({
    id: 'clarity',
    name: 'Clarity',
    energy: 'low',
    accentColor: '#FF8C42',
    defaultZoomStyle: 'snap',
    defaultZoomIntensity: 1.08,
    defaultTransition: 'crossfade',
    flashColor: '#FFFFFF',
    transitionDuration: 0.45,
    targetEditsPerSecond: 0.3,
    captionStyle: { highlightColor: '#FF8C42', emphasisColor: '#FF8C42', supersizeColor: '#FFB870' },
    textAnimation: 'none',
    description: 'Clean open captions with snap zoom and smooth fades — minimal and focused',
    colorGrade: { warmth: 0.05, contrast: 1.05, saturation: 1.0, blackLift: 0.06, highlightSoftness: 0.8 },
    transitionMap: T_CROSSFADE_NO_WASH,
    vfxOverlays: [
      { type: 'image-overlay', opacity: 0.10, applyToCategories: 'all', assetPath: 'shared/vignette-dark.png', blendMode: 'normal' }
    ],
    headlineStyle: { fontSize: 58 }
  }),

  createEditStyle({
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
  }),

  // ── MEDIUM ENERGY (0.4–0.7 edits/sec) ──────────────────────────────────

  createEditStyle({
    id: 'align',
    name: 'Align',
    energy: 'medium',
    accentColor: '#FF8C42',
    defaultZoomStyle: 'none',
    defaultZoomIntensity: 1.0,
    defaultTransition: 'flash-cut',
    flashColor: '#FFFFFF',
    transitionDuration: 0.25,
    targetEditsPerSecond: 0.4,
    captionStyle: { fontName: 'Inter', highlightColor: '#FF8C42' },
    textAnimation: 'slide-up',
    description: 'Flash cuts with clean layout and no zoom — structured and precise',
    colorGrade: { warmth: 0.1, contrast: 1.1, saturation: 1.0, blackLift: 0.03, highlightSoftness: 0.5 },
    transitionMap: T_FLASH_CROSS_WASH_FT,
    vfxOverlays: [
      { type: 'gradient-bar-bottom', opacity: 0.28, applyToCategories: ['main-video', 'main-video-text'] },
      { type: 'color-tint', opacity: 0.05, applyToCategories: 'all' },
      { type: 'image-overlay', opacity: 0.08, applyToCategories: 'all', assetPath: 'shared/vignette-dark.png', blendMode: 'normal' }
    ],
    headlineStyle: { outlineColor: '#FF8C42', outlineWidth: 0, shadowDepth: 0, borderStyle: 3, backColor: '#FF8C42', animation: 'slide-up', animationDurationMs: 300 }
  }),

  createEditStyle({
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
  }),

  createEditStyle({
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
  }),

  createEditStyle({
    id: 'lumen',
    name: 'Lumen',
    energy: 'medium',
    accentColor: '#CC3333',
    defaultZoomStyle: 'drift',
    defaultZoomIntensity: 1.05,
    defaultTransition: 'hard-cut',
    flashColor: '#FFFFFF',
    transitionDuration: 0.3,
    targetEditsPerSecond: 0.5,
    captionStyle: { highlightColor: '#CC3333', emphasisColor: '#CC3333', supersizeColor: '#FF4444' },
    textAnimation: 'scale-up',
    description: 'Drifting zoom with hard cuts and transparent captions — raw and authentic',
    colorGrade: { warmth: 0.0, contrast: 1.05, saturation: 0.95, blackLift: 0.05, highlightSoftness: 0.9 },
    transitionMap: T_HARD_SOFT_RETURN,
    vfxOverlays: [
      { type: 'color-tint', opacity: 0.04, applyToCategories: 'all' },
      { type: 'video-overlay', opacity: 0.15, applyToCategories: ['main-video', 'main-video-text'], assetPath: 'shared/light-leak-warm.mp4', blendMode: 'screen' },
      { type: 'video-overlay', opacity: 0.06, applyToCategories: 'all', assetPath: 'shared/dust-particles.mp4', blendMode: 'screen' }
    ],
    headlineStyle: { fontSize: 58, outlineColor: '#CC3333' }
  }),

  // ── ELEVATE AI — premium cinematic-documentary aesthetic ──────────────

  createEditStyle({
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
  }),

  createEditStyle({
    id: 'recess',
    name: 'Recess',
    energy: 'medium',
    accentColor: '#FF8C42',
    defaultZoomStyle: 'none',
    defaultZoomIntensity: 1.0,
    defaultTransition: 'hard-cut',
    flashColor: '#FFFFFF',
    transitionDuration: 0.25,
    targetEditsPerSecond: 0.6,
    captionStyle: { fontName: 'Inter', fontSize: 0.060, highlightColor: '#FF8C42', emphasisColor: '#FF8C42', supersizeColor: '#FFB870' },
    textAnimation: 'none',
    description: 'Hard cuts with no zoom and minimal captions — raw and unfiltered',
    colorGrade: { warmth: 0.0, contrast: 1.0, saturation: 1.0, blackLift: 0.03, highlightSoftness: 0.5 },
    transitionMap: T_HARD_FLASH_INTO_FT,
    vfxOverlays: [
      { type: 'color-tint', opacity: 0.04, applyToCategories: 'all' },
      { type: 'diagonal-slash', opacity: 0.25, applyToCategories: ['main-video', 'main-video-text'] },
      { type: 'video-overlay', opacity: 0.05, applyToCategories: 'all', assetPath: 'shared/dust-particles.mp4', blendMode: 'screen' }
    ],
    headlineStyle: { fontSize: 56, outlineColor: '#333333', outlineWidth: 2, shadowDepth: 1, animation: 'snap', animationDurationMs: 0 }
  }),

  createEditStyle({
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
  }),

  // ── HIGH ENERGY (0.8+ edits/sec) ───────────────────────────────────────

  createEditStyle({
    id: 'paper_ii',
    name: 'Paper II',
    energy: 'high',
    accentColor: '#FF8C42',
    defaultZoomStyle: 'drift',
    defaultZoomIntensity: 1.06,
    defaultTransition: 'crossfade',
    flashColor: '#FFFFFF',
    transitionDuration: 0.2,
    targetEditsPerSecond: 0.9,
    captionStyle: { fontName: 'Inter', fontSize: 0.060, highlightColor: '#FF8C42', emphasisColor: '#FF8C42', supersizeColor: '#FFB870' },
    textAnimation: 'none',
    description: 'Fast drifting zoom with smooth fades and open captions — energetic and flowing',
    colorGrade: { warmth: 0.0, contrast: 1.05, saturation: 0.95, blackLift: 0.04, highlightSoftness: 0.7 },
    transitionMap: T_HE_CROSSFADE_FLASH_RETURN,
    vfxOverlays: [
      { type: 'diagonal-slash', opacity: 0.30, applyToCategories: ['main-video', 'main-video-text'] },
      { type: 'color-tint', opacity: 0.06, applyToCategories: 'all' },
      { type: 'video-overlay', opacity: 0.06, applyToCategories: 'all', assetPath: 'shared/dust-particles.mp4', blendMode: 'screen' }
    ],
    headlineStyle: { outlineColor: '#FF8C42', animation: 'slide-up', animationDurationMs: 200 }
  }),

  createEditStyle({
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
  }),

  createEditStyle({
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
  }),

  createEditStyle({
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
  }),

  // ── PULSE — futuristic tech-interface aesthetic ──────────────────────

  createEditStyle({
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
]

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

export const DEFAULT_EDIT_STYLE_ID = 'cinematic'

export function getEditStyleById(id: string): EditStyle | undefined {
  return EDIT_STYLES.find((s) => s.id === id)
}

export function getEditStylesByEnergy(energy: 'low' | 'medium' | 'high'): EditStyle[] {
  return EDIT_STYLES.filter((s) => s.energy === energy)
}

/**
 * Resolve the transition type for a segment boundary from the edit style's
 * transition matrix. Looks up "outCategory→inCategory" in the style's
 * transitionMap; falls back to defaultTransition if no override exists.
 */
export function resolveTransition(
  style: EditStyle,
  outCategory: SegmentStyleCategory,
  inCategory: SegmentStyleCategory
): TransitionType {
  if (style.transitionMap) {
    const key = `${outCategory}→${inCategory}`
    const override = style.transitionMap[key]
    if (override) return override
  }
  return style.defaultTransition
}
