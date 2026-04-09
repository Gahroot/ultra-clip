/**
 * Edit Style Presets — Captions.ai-style edit styles
 *
 * Defines all edit style presets extracted from video analysis.
 * Each style combines energy tier, zoom type, transition type,
 * caption background, letterbox, and accent color.
 */

// Types are declared globally in src/preload/index.d.ts (EditStyle)

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
// Edit style presets
// ---------------------------------------------------------------------------

export const EDIT_STYLES: EditStyle[] = [
  // ── LOW ENERGY (0.2–0.3 edits/sec) ─────────────────────────────────────

  {
    id: 'ember',
    name: 'Ember',
    energy: 'low',
    accentColor: '#FF6B35',
    captionBgOpacity: 0,
    letterbox: 'bottom',
    defaultZoomStyle: 'zoom-out',
    defaultZoomIntensity: 1.10,
    defaultTransition: 'hard-cut',
    flashColor: '#FFFFFF',
    transitionDuration: 0.4,
    targetEditsPerSecond: 0.2,
    captionStyle: {
      fontName: 'Montserrat',
      fontSize: 0.055,
      primaryColor: '#FFFFFF',
      highlightColor: '#FF6B35',
      outlineColor: '#000000',
      backColor: '#00000000',
      outline: 2,
      shadow: 1,
      borderStyle: 1,
      wordsPerLine: 5,
      animation: 'captions-ai',
      emphasisColor: '#FF6B35',
      supersizeColor: '#FF8C42'
    },
    availableSegmentStyles: LOW_ENERGY_SEGMENTS,
    textAnimation: 'fade-in',
    description: 'Slow zoom-out reveals with warm bottom bar and hard cuts — calm and contemplative',
    colorGrade: { warmth: 0.4, contrast: 1.15, saturation: 1.05, blackLift: 0.04, highlightSoftness: 0.6 },
    segmentDurationTarget: { min: 4, max: 10, ideal: 6 },
    // Hard-cut dominant — contemplative stillness from absence of effects.
    // Crossfade only when leaving fullscreen-text back to video (gentle re-entry).
    transitionMap: {
      'main-video→main-video':             'hard-cut',
      'main-video→main-video-text':        'hard-cut',
      'main-video→fullscreen-text':        'hard-cut',
      'main-video-text→main-video':        'hard-cut',
      'main-video-text→main-video-text':   'hard-cut',
      'main-video-text→fullscreen-text':   'hard-cut',
      'fullscreen-text→main-video':        'crossfade',
      'fullscreen-text→main-video-text':   'crossfade',
      'fullscreen-text→fullscreen-text':   'hard-cut',
    },
    vfxOverlays: [
      { type: 'gradient-bar-bottom', opacity: 0.30, applyToCategories: ['main-video', 'main-video-text'] },
      { type: 'image-overlay', opacity: 0.12, applyToCategories: 'all', assetPath: 'cinematic/warm-wash-left.png', blendMode: 'screen' },
      { type: 'video-overlay', opacity: 0.06, applyToCategories: ['main-video', 'main-video-text'], assetPath: 'shared/film-grain-minimal.mp4', blendMode: 'screen' }
    ]
  },
  {
    id: 'clarity',
    name: 'Clarity',
    energy: 'low',
    accentColor: '#FF8C42',
    captionBgOpacity: 0,
    letterbox: 'none',
    defaultZoomStyle: 'snap',
    defaultZoomIntensity: 1.08,
    defaultTransition: 'crossfade',
    flashColor: '#FFFFFF',
    transitionDuration: 0.45,
    targetEditsPerSecond: 0.3,
    captionStyle: {
      fontName: 'Montserrat',
      fontSize: 0.055,
      primaryColor: '#FFFFFF',
      highlightColor: '#FF8C42',
      outlineColor: '#000000',
      backColor: '#00000000',
      outline: 2,
      shadow: 1,
      borderStyle: 1,
      wordsPerLine: 5,
      animation: 'captions-ai',
      emphasisColor: '#FF8C42',
      supersizeColor: '#FFB870'
    },
    availableSegmentStyles: LOW_ENERGY_SEGMENTS,
    textAnimation: 'none',
    description: 'Clean open captions with snap zoom and smooth fades — minimal and focused',
    colorGrade: { warmth: 0.05, contrast: 1.05, saturation: 1.0, blackLift: 0.06, highlightSoftness: 0.8 },
    segmentDurationTarget: { min: 4, max: 10, ideal: 6 },
    // Crossfade baseline for smooth minimal feel.
    // Hard-cut between same-category to avoid dissolve clutter.
    // No color-wash — too dramatic for "minimal and focused".
    transitionMap: {
      'main-video→main-video':             'hard-cut',
      'main-video→main-video-text':        'crossfade',
      'main-video→fullscreen-text':        'crossfade',
      'main-video-text→main-video':        'crossfade',
      'main-video-text→main-video-text':   'hard-cut',
      'main-video-text→fullscreen-text':   'crossfade',
      'fullscreen-text→main-video':        'crossfade',
      'fullscreen-text→main-video-text':   'crossfade',
      'fullscreen-text→fullscreen-text':   'hard-cut',
    },
    vfxOverlays: [
      { type: 'image-overlay', opacity: 0.10, applyToCategories: 'all', assetPath: 'shared/vignette-dark.png', blendMode: 'normal' }
    ]
  },
  {
    id: 'film',
    name: 'Film',
    energy: 'low',
    accentColor: '#FF7B3A',
    captionBgOpacity: 0,
    letterbox: 'none',
    defaultZoomStyle: 'drift',
    defaultZoomIntensity: 1.05,
    defaultTransition: 'crossfade',
    flashColor: '#FFFFFF',
    transitionDuration: 0.5,
    targetEditsPerSecond: 0.3,
    captionStyle: {
      fontName: 'Montserrat',
      fontSize: 0.055,
      primaryColor: '#FFFFFF',
      highlightColor: '#FF7B3A',
      outlineColor: '#000000',
      backColor: '#00000000',
      outline: 2,
      shadow: 1,
      borderStyle: 1,
      wordsPerLine: 5,
      animation: 'captions-ai',
      emphasisColor: '#FF7B3A',
      supersizeColor: '#FFB870'
    },
    availableSegmentStyles: LOW_ENERGY_SEGMENTS,
    textAnimation: 'fade-in',
    description: 'Gentle drifting zoom with crossfades and subtle warmth — cinematic and unhurried',
    colorGrade: { warmth: 0.3, contrast: 1.15, saturation: 1.0, blackLift: 0.05, highlightSoftness: 0.7 },
    segmentDurationTarget: { min: 4, max: 10, ideal: 6 },
    // Crossfade baseline matching Elevate — cinematic, unhurried.
    // Color-wash entering fullscreen-text acts as a warm page-turn moment.
    // Hard-cut between text-heavy same-category to keep text legible.
    transitionMap: {
      'main-video→main-video':             'crossfade',
      'main-video→main-video-text':        'crossfade',
      'main-video→fullscreen-text':        'color-wash',
      'main-video-text→main-video':        'crossfade',
      'main-video-text→main-video-text':   'hard-cut',
      'main-video-text→fullscreen-text':   'color-wash',
      'fullscreen-text→main-video':        'crossfade',
      'fullscreen-text→main-video-text':   'crossfade',
      'fullscreen-text→fullscreen-text':   'hard-cut',
    },
    vfxOverlays: [
      { type: 'color-vignette', opacity: 0.18, applyToCategories: 'all' },
      { type: 'video-overlay', opacity: 0.08, applyToCategories: 'all', assetPath: 'shared/film-grain-minimal.mp4', blendMode: 'screen' },
      { type: 'image-overlay', opacity: 0.15, applyToCategories: ['main-video', 'main-video-text'], assetPath: 'cinematic/warm-wash-left.png', blendMode: 'screen' }
    ]
  },

  // ── MEDIUM ENERGY (0.4–0.7 edits/sec) ──────────────────────────────────

  {
    id: 'align',
    name: 'Align',
    energy: 'medium',
    accentColor: '#FF8C42',
    captionBgOpacity: 0,
    letterbox: 'none',
    defaultZoomStyle: 'none',
    defaultZoomIntensity: 1.0,
    defaultTransition: 'flash-cut',
    flashColor: '#FFFFFF',
    transitionDuration: 0.25,
    targetEditsPerSecond: 0.4,
    captionStyle: {
      fontName: 'Inter',
      fontSize: 0.055,
      primaryColor: '#FFFFFF',
      highlightColor: '#FF8C42',
      outlineColor: '#000000',
      backColor: '#00000000',
      outline: 2,
      shadow: 1,
      borderStyle: 1,
      wordsPerLine: 5,
      animation: 'captions-ai',
      emphasisColor: '#FFFFFF',
      supersizeColor: '#FFFFFF'
    },
    availableSegmentStyles: MEDIUM_ENERGY_SEGMENTS,
    textAnimation: 'slide-up',
    description: 'Flash cuts with clean layout and no zoom — structured and precise',
    colorGrade: { warmth: 0.1, contrast: 1.1, saturation: 1.0, blackLift: 0.03, highlightSoftness: 0.5 },
    segmentDurationTarget: { min: 3, max: 7, ideal: 5 },
    // Same pattern as Growth — structured, predictable transitions.
    // Hard-cut same-category, flash-cut cross-category, color-wash into fullscreen-text.
    transitionMap: {
      'main-video→main-video':             'hard-cut',
      'main-video→main-video-text':        'flash-cut',
      'main-video→fullscreen-text':        'color-wash',
      'main-video-text→main-video':        'flash-cut',
      'main-video-text→main-video-text':   'hard-cut',
      'main-video-text→fullscreen-text':   'color-wash',
      'fullscreen-text→main-video':        'flash-cut',
      'fullscreen-text→main-video-text':   'flash-cut',
      'fullscreen-text→fullscreen-text':   'hard-cut',
    },
    vfxOverlays: [
      { type: 'gradient-bar-bottom', opacity: 0.28, applyToCategories: ['main-video', 'main-video-text'] },
      { type: 'color-tint', opacity: 0.05, applyToCategories: 'all' },
      { type: 'image-overlay', opacity: 0.08, applyToCategories: 'all', assetPath: 'shared/vignette-dark.png', blendMode: 'normal' }
    ]
  },
  {
    id: 'growth',
    name: 'Growth',
    energy: 'medium',
    accentColor: '#CC3333',
    captionBgOpacity: 0,
    letterbox: 'bottom',
    defaultZoomStyle: 'snap',
    defaultZoomIntensity: 1.10,
    defaultTransition: 'flash-cut',
    flashColor: '#CC3333',
    transitionDuration: 0.25,
    targetEditsPerSecond: 0.4,
    captionStyle: {
      fontName: 'Montserrat',
      fontSize: 0.055,
      primaryColor: '#FFFFFF',
      highlightColor: '#CC3333',
      outlineColor: '#000000',
      backColor: '#00000000',
      outline: 2,
      shadow: 1,
      borderStyle: 1,
      wordsPerLine: 5,
      animation: 'captions-ai',
      emphasisColor: '#CC3333',
      supersizeColor: '#FF4444'
    },
    availableSegmentStyles: MEDIUM_ENERGY_SEGMENTS,
    textAnimation: 'scale-up',
    description: 'Snap zoom with red flash cuts and bottom bar — bold and educational',
    colorGrade: { warmth: 0.15, contrast: 1.2, saturation: 1.1, blackLift: 0.02, highlightSoftness: 0.4 },
    segmentDurationTarget: { min: 3, max: 7, ideal: 5 },
    // Transition matrix: hard-cut for same-category (tight rhythm, no embellishment).
    // Flash-cut (red) when crossing between video and text-augmented categories —
    // the signature Growth punctuation mark. Color-wash (red) entering fullscreen-text
    // as a "threshold" moment stepping fully out of video into a statement card.
    transitionMap: {
      'main-video→main-video':             'hard-cut',
      'main-video→main-video-text':        'flash-cut',
      'main-video→fullscreen-text':        'color-wash',
      'main-video-text→main-video':        'flash-cut',
      'main-video-text→main-video-text':   'hard-cut',
      'main-video-text→fullscreen-text':   'color-wash',
      'fullscreen-text→main-video':        'flash-cut',
      'fullscreen-text→main-video-text':   'flash-cut',
      'fullscreen-text→fullscreen-text':   'hard-cut',
    },
    vfxOverlays: [
      { type: 'diagonal-slash', opacity: 0.35, applyToCategories: ['main-video', 'main-video-text'] },
      { type: 'color-tint', opacity: 0.06, applyToCategories: 'all' },
      { type: 'image-overlay', opacity: 0.55, applyToCategories: ['main-video', 'main-video-text'], assetPath: 'growth/border-frame-red.png', blendMode: 'normal' },
      { type: 'image-overlay', opacity: 0.30, applyToCategories: ['fullscreen-text'], assetPath: 'growth/grid-lines.png', blendMode: 'normal' }
    ]
  },
  {
    id: 'impact',
    name: 'Impact',
    energy: 'medium',
    accentColor: '#FF7B3A',
    captionBgOpacity: 0,
    letterbox: 'both',
    defaultZoomStyle: 'snap',
    defaultZoomIntensity: 1.15,
    defaultTransition: 'flash-cut',
    flashColor: '#FFFFFF',
    transitionDuration: 0.3,
    targetEditsPerSecond: 0.5,
    captionStyle: {
      fontName: 'Montserrat',
      fontSize: 0.055,
      primaryColor: '#FFFFFF',
      highlightColor: '#4A90E2',
      outlineColor: '#000000',
      backColor: '#00000000',
      outline: 2,
      shadow: 1,
      borderStyle: 1,
      wordsPerLine: 4,
      animation: 'captions-ai',
      emphasisColor: '#4A90E2',
      supersizeColor: '#FFD700'
    },
    availableSegmentStyles: MEDIUM_ENERGY_SEGMENTS,
    textAnimation: 'snap-in',
    description: 'Snap zoom with white flash cuts and dark cinematic bars — dramatic and powerful',
    colorGrade: { warmth: -0.2, contrast: 1.25, saturation: 0.9, blackLift: 0.0, highlightSoftness: 0.3 },
    segmentDurationTarget: { min: 3, max: 7, ideal: 5 },
    // Transition matrix: hard-cut for same-category (tight, punchy rhythm).
    // Flash-cut (white) is the signature punctuation crossing between video and
    // text-augmented categories — dramatic snap energy. Color-wash (white) entering
    // fullscreen-text as a cinematic "impact" moment that pairs with the letterbox bars.
    transitionMap: {
      'main-video→main-video':             'hard-cut',
      'main-video→main-video-text':        'flash-cut',
      'main-video→fullscreen-text':        'color-wash',
      'main-video-text→main-video':        'flash-cut',
      'main-video-text→main-video-text':   'hard-cut',
      'main-video-text→fullscreen-text':   'color-wash',
      'fullscreen-text→main-video':        'flash-cut',
      'fullscreen-text→main-video-text':   'flash-cut',
      'fullscreen-text→fullscreen-text':   'hard-cut',
    },
    vfxOverlays: [
      { type: 'glowing-ring', opacity: 0.45, applyToCategories: ['main-video', 'main-video-text'] },
      { type: 'color-vignette', opacity: 0.22, applyToCategories: 'all' },
      { type: 'image-overlay', opacity: 0.12, applyToCategories: 'all', assetPath: 'shared/vignette-dark.png', blendMode: 'normal' },
      { type: 'video-overlay', opacity: 0.05, applyToCategories: ['main-video', 'main-video-text'], assetPath: 'shared/film-grain-heavy.mp4', blendMode: 'screen' }
    ]
  },
  {
    id: 'lumen',
    name: 'Lumen',
    energy: 'medium',
    accentColor: '#CC3333',
    captionBgOpacity: 0,
    letterbox: 'none',
    defaultZoomStyle: 'drift',
    defaultZoomIntensity: 1.05,
    defaultTransition: 'hard-cut',
    flashColor: '#FFFFFF',
    transitionDuration: 0.3,
    targetEditsPerSecond: 0.5,
    captionStyle: {
      fontName: 'Montserrat',
      fontSize: 0.055,
      primaryColor: '#FFFFFF',
      highlightColor: '#CC3333',
      outlineColor: '#000000',
      backColor: '#00000000',
      outline: 2,
      shadow: 1,
      borderStyle: 1,
      wordsPerLine: 5,
      animation: 'captions-ai',
      emphasisColor: '#CC3333',
      supersizeColor: '#FF4444'
    },
    availableSegmentStyles: MEDIUM_ENERGY_SEGMENTS,
    textAnimation: 'scale-up',
    description: 'Drifting zoom with hard cuts and transparent captions — raw and authentic',
    colorGrade: { warmth: 0.0, contrast: 1.05, saturation: 0.95, blackLift: 0.05, highlightSoftness: 0.9 },
    segmentDurationTarget: { min: 3, max: 7, ideal: 5 },
    // Transition matrix: hard-cut everywhere for a raw, unpolished aesthetic.
    // Crossfade only when returning FROM fullscreen-text back to video — a soft
    // re-entry that contrasts the otherwise blunt editing rhythm.
    transitionMap: {
      'main-video→main-video':             'hard-cut',
      'main-video→main-video-text':        'hard-cut',
      'main-video→fullscreen-text':        'hard-cut',
      'main-video-text→main-video':        'hard-cut',
      'main-video-text→main-video-text':   'hard-cut',
      'main-video-text→fullscreen-text':   'hard-cut',
      'fullscreen-text→main-video':        'crossfade',
      'fullscreen-text→main-video-text':   'crossfade',
      'fullscreen-text→fullscreen-text':   'hard-cut',
    },
    vfxOverlays: [
      { type: 'color-tint', opacity: 0.04, applyToCategories: 'all' },
      { type: 'video-overlay', opacity: 0.15, applyToCategories: ['main-video', 'main-video-text'], assetPath: 'shared/light-leak-warm.mp4', blendMode: 'screen' },
      { type: 'video-overlay', opacity: 0.06, applyToCategories: 'all', assetPath: 'shared/dust-particles.mp4', blendMode: 'screen' }
    ]
  },
  // ── ELEVATE AI ────────────────────────────────────────────────────────────
  // Premium cinematic-documentary aesthetic: warm lifted shadows, teal-orange
  // split tone, zoom-out reveals, long crossfade transitions, shadow-only
  // captions (no harsh outline), and a deliberate slow pace that creates
  // breathing room and emotional resonance. Inspired by short-film / high-end
  // brand storytelling — not viral/trending formats.

  {
    id: 'elevate',
    name: 'Elevate',
    energy: 'low',
    accentColor: '#D4AF37',
    captionBgOpacity: 0.0,
    letterbox: 'none',
    defaultZoomStyle: 'zoom-out',
    defaultZoomIntensity: 1.06,
    defaultTransition: 'crossfade',
    flashColor: '#FFFDD0',
    transitionDuration: 0.5,
    targetEditsPerSecond: 0.3,
    captionStyle: {
      fontName: 'Montserrat',
      fontSize: 0.060,
      primaryColor: '#FFFDD0',
      highlightColor: '#D4AF37',
      outlineColor: '#000000',
      backColor: '#00000000',
      outline: 0,
      shadow: 1,
      borderStyle: 1,
      wordsPerLine: 4,
      animation: 'fade-in',
      emphasisColor: '#D4AF37',
      supersizeColor: '#FFFFFF'
    },
    availableSegmentStyles: LOW_ENERGY_SEGMENTS,
    textAnimation: 'fade-in',
    description: 'Premium cinematic documentary — slow zoom-out reveals, long crossfades, warm teal-orange grade, shadow-only captions. Reflective, intimate, aspirational.',
    colorGrade: {
      warmth: 0.55,          // push reds/oranges in highlights for golden warmth
      contrast: 1.05,        // soft, not punchy — preserve natural light
      saturation: 0.88,      // slightly desaturated for filmic look (-12%)
      blackLift: 0.07,       // lift shadows significantly for cinematic "lifted black" look
      highlightSoftness: 0.80 // gentle highlight roll-off (filmic, not harsh)
    },
    segmentDurationTarget: { min: 4, max: 8, ideal: 6 },
    // Transition matrix: crossfade is the baseline (calm, documentary breathing room).
    // Color-wash (cream #FFFDD0) marks "threshold" moments entering fullscreen-text —
    // a warm luminous page-turn. Hard-cut only where two text-heavy segments adjoin
    // to avoid illegible dissolve overlap.
    transitionMap: {
      'main-video→main-video':             'crossfade',
      'main-video→main-video-text':        'crossfade',
      'main-video→fullscreen-text':        'color-wash',
      'main-video-text→main-video':        'crossfade',
      'main-video-text→main-video-text':   'hard-cut',
      'main-video-text→fullscreen-text':   'color-wash',
      'fullscreen-text→main-video':        'crossfade',
      'fullscreen-text→main-video-text':   'crossfade',
      'fullscreen-text→fullscreen-text':   'hard-cut',
    },
    vfxOverlays: [
      // Subtle vignette to draw eyes inward — restrained (0.18 opacity)
      { type: 'color-vignette', opacity: 0.18, applyToCategories: 'all' },
      { type: 'video-overlay', opacity: 0.07, applyToCategories: 'all', assetPath: 'shared/film-grain-minimal.mp4', blendMode: 'screen' },
      { type: 'image-overlay', opacity: 0.10, applyToCategories: ['main-video-images'], assetPath: 'elevate/divider-star.png', blendMode: 'normal' },
      { type: 'video-overlay', opacity: 0.08, applyToCategories: ['main-video', 'main-video-text'], assetPath: 'shared/light-leak-warm.mp4', blendMode: 'screen' }
    ]
  },
  {
    id: 'recess',
    name: 'Recess',
    energy: 'medium',
    accentColor: '#FF8C42',
    captionBgOpacity: 0,
    letterbox: 'none',
    defaultZoomStyle: 'none',
    defaultZoomIntensity: 1.0,
    defaultTransition: 'hard-cut',
    flashColor: '#FFFFFF',
    transitionDuration: 0.25,
    targetEditsPerSecond: 0.6,
    captionStyle: {
      fontName: 'Inter',
      fontSize: 0.060,
      primaryColor: '#FFFFFF',
      highlightColor: '#FF8C42',
      outlineColor: '#000000',
      backColor: '#00000000',
      outline: 2,
      shadow: 1,
      borderStyle: 1,
      wordsPerLine: 5,
      animation: 'captions-ai',
      emphasisColor: '#FF8C42',
      supersizeColor: '#FFB870'
    },
    availableSegmentStyles: MEDIUM_ENERGY_SEGMENTS,
    textAnimation: 'none',
    description: 'Hard cuts with no zoom and minimal captions — raw and unfiltered',
    colorGrade: { warmth: 0.0, contrast: 1.0, saturation: 1.0, blackLift: 0.03, highlightSoftness: 0.5 },
    segmentDurationTarget: { min: 3, max: 7, ideal: 5 },
    // Transition matrix: almost all hard-cuts — the most stripped-down style.
    // Flash-cut only when entering fullscreen-text (one moment of punctuation).
    // Everything else is hard-cut; "raw and unfiltered" means minimal effects.
    transitionMap: {
      'main-video→main-video':             'hard-cut',
      'main-video→main-video-text':        'hard-cut',
      'main-video→fullscreen-text':        'flash-cut',
      'main-video-text→main-video':        'hard-cut',
      'main-video-text→main-video-text':   'hard-cut',
      'main-video-text→fullscreen-text':   'flash-cut',
      'fullscreen-text→main-video':        'hard-cut',
      'fullscreen-text→main-video-text':   'hard-cut',
      'fullscreen-text→fullscreen-text':   'hard-cut',
    },
    vfxOverlays: [
      { type: 'color-tint', opacity: 0.04, applyToCategories: 'all' },
      { type: 'diagonal-slash', opacity: 0.25, applyToCategories: ['main-video', 'main-video-text'] },
      { type: 'video-overlay', opacity: 0.05, applyToCategories: 'all', assetPath: 'shared/dust-particles.mp4', blendMode: 'screen' }
    ]
  },
  {
    id: 'cinematic',
    name: 'Cinematic',
    energy: 'medium',
    accentColor: '#FF6B35',
    captionBgOpacity: 0,
    letterbox: 'none',
    defaultZoomStyle: 'none',
    defaultZoomIntensity: 1.0,
    defaultTransition: 'color-wash',
    flashColor: '#FF6B35',
    transitionDuration: 0.35,
    targetEditsPerSecond: 0.7,
    captionStyle: {
      fontName: 'Montserrat',
      fontSize: 0.055,
      primaryColor: '#FFFFFF',
      highlightColor: '#FF6B35',
      outlineColor: '#000000',
      backColor: '#00000000',
      outline: 2,
      shadow: 1,
      borderStyle: 1,
      wordsPerLine: 5,
      animation: 'captions-ai',
      emphasisColor: '#FF6B35',
      supersizeColor: '#FF8C42'
    },
    availableSegmentStyles: MEDIUM_ENERGY_SEGMENTS,
    textAnimation: 'fade-in',
    description: 'Color wash transitions with warm glow and smooth pacing — epic and cinematic',
    colorGrade: { warmth: 0.35, contrast: 1.2, saturation: 1.1, blackLift: 0.03, highlightSoftness: 0.5 },
    segmentDurationTarget: { min: 3, max: 7, ideal: 5 },
    // Transition matrix: color-wash (warm orange #FF6B35) is the signature move
    // for all cross-category boundaries — this is the style where color-wash stars.
    // Hard-cut between same-category; crossfade for soft re-entry from fullscreen-text.
    transitionMap: {
      'main-video→main-video':             'hard-cut',
      'main-video→main-video-text':        'color-wash',
      'main-video→fullscreen-text':        'color-wash',
      'main-video-text→main-video':        'color-wash',
      'main-video-text→main-video-text':   'hard-cut',
      'main-video-text→fullscreen-text':   'color-wash',
      'fullscreen-text→main-video':        'crossfade',
      'fullscreen-text→main-video-text':   'crossfade',
      'fullscreen-text→fullscreen-text':   'hard-cut',
    },
    vfxOverlays: [
      { type: 'color-vignette', opacity: 0.25, applyToCategories: 'all' },
      { type: 'image-overlay', opacity: 0.18, applyToCategories: ['main-video', 'main-video-text'], assetPath: 'cinematic/warm-wash-left.png', blendMode: 'screen' },
      { type: 'image-overlay', opacity: 0.12, applyToCategories: ['main-video', 'main-video-text'], assetPath: 'cinematic/warm-wash-right.png', blendMode: 'screen' },
      { type: 'video-overlay', opacity: 0.08, applyToCategories: 'all', assetPath: 'shared/film-grain-minimal.mp4', blendMode: 'screen' }
    ]
  },

  // ── HIGH ENERGY (0.8+ edits/sec) ───────────────────────────────────────

  {
    id: 'paper_ii',
    name: 'Paper II',
    energy: 'high',
    accentColor: '#FF8C42',
    captionBgOpacity: 0,
    letterbox: 'none',
    defaultZoomStyle: 'drift',
    defaultZoomIntensity: 1.06,
    defaultTransition: 'crossfade',
    flashColor: '#FFFFFF',
    transitionDuration: 0.2,
    targetEditsPerSecond: 0.9,
    captionStyle: {
      fontName: 'Inter',
      fontSize: 0.060,
      primaryColor: '#FFFFFF',
      highlightColor: '#FF8C42',
      outlineColor: '#000000',
      backColor: '#00000000',
      outline: 2,
      shadow: 1,
      borderStyle: 1,
      wordsPerLine: 5,
      animation: 'captions-ai',
      emphasisColor: '#FF8C42',
      supersizeColor: '#FFB870'
    },
    availableSegmentStyles: HIGH_ENERGY_SEGMENTS,
    textAnimation: 'none',
    description: 'Fast drifting zoom with smooth fades and open captions — energetic and flowing',
    colorGrade: { warmth: 0.0, contrast: 1.05, saturation: 0.95, blackLift: 0.04, highlightSoftness: 0.7 },
    segmentDurationTarget: { min: 2, max: 5, ideal: 3 },
    // Crossfade baseline keeps the "flowing" feel. Hard-cut for same-category rhythm.
    // Flash-cut punctuates the return from fullscreen categories back to video.
    // All other cross-category boundaries stay crossfade for smooth continuity.
    transitionMap: {
      'main-video→main-video':           'hard-cut',
      'main-video→main-video-text':      'crossfade',
      'main-video→fullscreen-text':      'crossfade',
      'main-video→fullscreen-image':     'crossfade',
      'main-video-text→main-video':      'crossfade',
      'main-video-text→main-video-text': 'hard-cut',
      'main-video-text→fullscreen-text': 'crossfade',
      'main-video-text→fullscreen-image': 'crossfade',
      'fullscreen-text→main-video':      'flash-cut',
      'fullscreen-text→main-video-text': 'flash-cut',
      'fullscreen-text→fullscreen-image': 'crossfade',
      'fullscreen-image→main-video':     'flash-cut',
      'fullscreen-image→main-video-text': 'flash-cut',
      'fullscreen-image→fullscreen-text': 'crossfade',
    },
    vfxOverlays: [
      { type: 'diagonal-slash', opacity: 0.30, applyToCategories: ['main-video', 'main-video-text'] },
      { type: 'color-tint', opacity: 0.06, applyToCategories: 'all' },
      { type: 'video-overlay', opacity: 0.06, applyToCategories: 'all', assetPath: 'shared/dust-particles.mp4', blendMode: 'screen' }
    ]
  },
  {
    id: 'rebel',
    name: 'Rebel',
    energy: 'high',
    accentColor: '#FF7B3A',
    captionBgOpacity: 0,
    letterbox: 'none',
    defaultZoomStyle: 'snap',
    defaultZoomIntensity: 1.12,
    defaultTransition: 'crossfade',
    flashColor: '#FFFFFF',
    transitionDuration: 0.2,
    targetEditsPerSecond: 0.9,
    captionStyle: {
      fontName: 'Montserrat',
      fontSize: 0.055,
      primaryColor: '#FFFFFF',
      highlightColor: '#FF7B3A',
      outlineColor: '#000000',
      backColor: '#00000000',
      outline: 2,
      shadow: 1,
      borderStyle: 1,
      wordsPerLine: 4,
      animation: 'captions-ai',
      emphasisColor: '#FF7B3A',
      supersizeColor: '#FFB870'
    },
    availableSegmentStyles: HIGH_ENERGY_SEGMENTS,
    textAnimation: 'snap-in',
    description: 'Snap zoom with crossfades and dark caption bar — aggressive and stylish',
    colorGrade: { warmth: -0.1, contrast: 1.25, saturation: 0.85, blackLift: 0.02, highlightSoftness: 0.3 },
    segmentDurationTarget: { min: 2, max: 5, ideal: 3 },
    // Flash-cut at cross-category boundaries for aggressive punctuation.
    // Crossfade softens the jump into fullscreen-image/text (visual density shift).
    // Hard-cut keeps same-category segments tight and rhythmic.
    transitionMap: {
      'main-video→main-video':           'hard-cut',
      'main-video→main-video-text':      'flash-cut',
      'main-video→fullscreen-text':      'crossfade',
      'main-video→fullscreen-image':     'crossfade',
      'main-video-text→main-video':      'flash-cut',
      'main-video-text→main-video-text': 'hard-cut',
      'main-video-text→fullscreen-text': 'crossfade',
      'main-video-text→fullscreen-image': 'crossfade',
      'fullscreen-text→main-video':      'flash-cut',
      'fullscreen-text→main-video-text': 'flash-cut',
      'fullscreen-text→fullscreen-image': 'crossfade',
      'fullscreen-image→main-video':     'flash-cut',
      'fullscreen-image→main-video-text': 'flash-cut',
      'fullscreen-image→fullscreen-text': 'crossfade',
    },
    vfxOverlays: [
      { type: 'glowing-ring', opacity: 0.55, applyToCategories: ['main-video', 'main-video-text'] },
      { type: 'diagonal-slash', opacity: 0.40, applyToCategories: ['main-video', 'main-video-text'] },
      { type: 'color-vignette', opacity: 0.28, applyToCategories: 'all' },
      { type: 'video-overlay', opacity: 0.10, applyToCategories: 'all', assetPath: 'shared/film-grain-heavy.mp4', blendMode: 'screen' },
      { type: 'image-overlay', opacity: 0.08, applyToCategories: ['main-video', 'main-video-text'], assetPath: 'shared/noise-heavy.png', blendMode: 'screen' }
    ]
  },
  {
    id: 'prime',
    name: 'Prime',
    energy: 'high',
    accentColor: '#FF8C42',
    captionBgOpacity: 0,
    letterbox: 'none',
    defaultZoomStyle: 'word-pulse',
    defaultZoomIntensity: 1.08,
    defaultTransition: 'crossfade',
    flashColor: '#FFFFFF',
    transitionDuration: 0.15,
    targetEditsPerSecond: 1.1,
    captionStyle: {
      fontName: 'Montserrat',
      fontSize: 0.055,
      primaryColor: '#FFFFFF',
      highlightColor: '#FF8C42',
      outlineColor: '#000000',
      backColor: '#00000000',
      outline: 2,
      shadow: 1,
      borderStyle: 1,
      wordsPerLine: 5,
      animation: 'captions-ai',
      emphasisColor: '#FF8C42',
      supersizeColor: '#FFD700'
    },
    availableSegmentStyles: HIGH_ENERGY_SEGMENTS,
    textAnimation: 'slide-up',
    description: 'Word-synced zoom pulses with smooth fades and warm glow — dynamic and engaging',
    colorGrade: { warmth: 0.1, contrast: 1.15, saturation: 1.05, blackLift: 0.02, highlightSoftness: 0.4 },
    segmentDurationTarget: { min: 2, max: 5, ideal: 3 },
    // Crossfade baseline for smooth warmth. Color-wash into fullscreen-text as a warm threshold.
    // Flash-cut from fullscreen categories back to video for dynamic re-entry.
    // Crossfade into fullscreen-image; hard-cut keeps same-category segments tight.
    transitionMap: {
      'main-video→main-video':           'hard-cut',
      'main-video→main-video-text':      'crossfade',
      'main-video→fullscreen-text':      'color-wash',
      'main-video→fullscreen-image':     'crossfade',
      'main-video-text→main-video':      'crossfade',
      'main-video-text→main-video-text': 'hard-cut',
      'main-video-text→fullscreen-text': 'color-wash',
      'main-video-text→fullscreen-image': 'crossfade',
      'fullscreen-text→main-video':      'flash-cut',
      'fullscreen-text→main-video-text': 'flash-cut',
      'fullscreen-text→fullscreen-image': 'crossfade',
      'fullscreen-image→main-video':     'flash-cut',
      'fullscreen-image→main-video-text': 'flash-cut',
      'fullscreen-image→fullscreen-text': 'color-wash',
    },
    vfxOverlays: [
      { type: 'glowing-ring', opacity: 0.50, applyToCategories: ['main-video', 'main-video-text'] },
      { type: 'gradient-bar-bottom', opacity: 0.35, applyToCategories: ['main-video', 'main-video-text'] },
      { type: 'image-overlay', opacity: 0.10, applyToCategories: 'all', assetPath: 'prime/vignette-teal.png', blendMode: 'normal' },
      { type: 'video-overlay', opacity: 0.08, applyToCategories: ['main-video', 'main-video-text'], assetPath: 'shared/bokeh.mp4', blendMode: 'screen' },
      { type: 'video-overlay', opacity: 0.05, applyToCategories: 'all', assetPath: 'shared/film-grain-minimal.mp4', blendMode: 'screen' }
    ]
  },
  {
    id: 'volt',
    name: 'Volt',
    energy: 'high',
    accentColor: '#39FF14',
    captionBgOpacity: 0,
    letterbox: 'bottom',
    defaultZoomStyle: 'word-pulse',
    defaultZoomIntensity: 1.10,
    defaultTransition: 'flash-cut',
    flashColor: '#FF7B3A',
    transitionDuration: 0.15,
    targetEditsPerSecond: 1.4,
    captionStyle: {
      fontName: 'Montserrat',
      fontSize: 0.055,
      primaryColor: '#FFFFFF',
      highlightColor: '#39FF14',
      outlineColor: '#000000',
      backColor: '#00000000',
      outline: 2,
      shadow: 1,
      borderStyle: 1,
      wordsPerLine: 4,
      animation: 'captions-ai',
      emphasisColor: '#39FF14',
      supersizeColor: '#FFFFFF'
    },
    availableSegmentStyles: HIGH_ENERGY_SEGMENTS,
    textAnimation: 'scale-up',
    description: 'Neon-green word pulses with flash cuts and heavy bottom bar — maximum energy',
    colorGrade: { warmth: 0.0, contrast: 1.35, saturation: 1.20, blackLift: 0.0, highlightSoftness: 0.2 },
    segmentDurationTarget: { min: 2, max: 5, ideal: 3 },
    // Flash-cut dominant — maximum energy, no soft transitions anywhere.
    // Hard-cut for same-category; flash-cut for every cross-category boundary.
    // Only exception: fullscreen-image↔fullscreen-text gets crossfade to avoid visual chaos.
    transitionMap: {
      'main-video→main-video':           'hard-cut',
      'main-video→main-video-text':      'flash-cut',
      'main-video→fullscreen-text':      'flash-cut',
      'main-video→fullscreen-image':     'flash-cut',
      'main-video-text→main-video':      'flash-cut',
      'main-video-text→main-video-text': 'hard-cut',
      'main-video-text→fullscreen-text': 'flash-cut',
      'main-video-text→fullscreen-image': 'flash-cut',
      'fullscreen-text→main-video':      'flash-cut',
      'fullscreen-text→main-video-text': 'flash-cut',
      'fullscreen-text→fullscreen-image': 'crossfade',
      'fullscreen-image→main-video':     'flash-cut',
      'fullscreen-image→main-video-text': 'flash-cut',
      'fullscreen-image→fullscreen-text': 'crossfade',
    },
    vfxOverlays: [
      { type: 'gradient-bar-bottom', opacity: 0.45, applyToCategories: ['main-video', 'main-video-text'] },
      { type: 'color-vignette', opacity: 0.22, applyToCategories: ['main-video', 'main-video-text'] },
      { type: 'color-tint', opacity: 0.04, applyToCategories: ['main-video', 'main-video-text'] },
      { type: 'image-overlay', opacity: 0.35, applyToCategories: ['main-video', 'main-video-text'], assetPath: 'volt/hud-bracket.png', blendMode: 'normal' },
      { type: 'image-overlay', opacity: 0.12, applyToCategories: 'all', assetPath: 'volt/scanlines-crt.png', blendMode: 'normal' },
      { type: 'image-overlay', opacity: 0.20, applyToCategories: 'all', assetPath: 'volt/chromatic-edge.png', blendMode: 'screen' }
    ]
  },

  // ── PULSE ────────────────────────────────────────────────────────────────
  // Futuristic tech-interface aesthetic: black + cyan, animated grid, scan
  // lines, corner brackets, and a glowing pulse border. High-energy pacing
  // with word-pulse zoom and flash-cut transitions.

  {
    id: 'pulse',
    name: 'Pulse',
    energy: 'high',
    accentColor: '#00D9FF',
    captionBgOpacity: 0,
    letterbox: 'none',
    defaultZoomStyle: 'word-pulse',
    defaultZoomIntensity: 1.08,
    defaultTransition: 'flash-cut',
    flashColor: '#00D9FF',
    transitionDuration: 0.15,
    targetEditsPerSecond: 1.0,
    captionStyle: {
      fontName: 'Montserrat',
      fontSize: 0.09,
      primaryColor: '#FFFFFF',
      highlightColor: '#00D9FF',
      outlineColor: '#000000',
      backColor: '#00000000',
      outline: 3,
      shadow: 0,
      borderStyle: 1,
      wordsPerLine: 4,
      animation: 'captions-ai',
      emphasisColor: '#00D9FF',
      supersizeColor: '#FFFFFF',
      emphasisScale: 1.08,
      supersizeScale: 1.05
    },
    availableSegmentStyles: HIGH_ENERGY_SEGMENTS,
    textAnimation: 'scale-up',
    description: 'Futuristic tech-interface with cyan grid, scan lines, and animated corner brackets — AI-native and high-tech',
    colorGrade: { warmth: -0.35, contrast: 1.30, saturation: 0.80, blackLift: 0.0, highlightSoftness: 0.25 },
    segmentDurationTarget: { min: 2, max: 6, ideal: 4 },
    // Transition matrix: flash-cut is the default (high-energy, punchy).
    // Crossfade softens the jump into fullscreen-text/image (different visual density).
    // Hard-cut between same-category segments keeps rhythm tight.
    transitionMap: {
      'main-video→main-video':           'hard-cut',
      'main-video→main-video-text':      'flash-cut',
      'main-video→fullscreen-text':      'crossfade',
      'main-video→fullscreen-image':     'crossfade',
      'main-video-text→main-video':      'flash-cut',
      'main-video-text→main-video-text': 'hard-cut',
      'main-video-text→fullscreen-text': 'crossfade',
      'main-video-text→fullscreen-image': 'crossfade',
      'fullscreen-text→main-video':      'flash-cut',
      'fullscreen-text→main-video-text': 'flash-cut',
      'fullscreen-text→fullscreen-image': 'crossfade',
      'fullscreen-image→main-video':     'flash-cut',
      'fullscreen-image→main-video-text': 'flash-cut',
      'fullscreen-image→fullscreen-text': 'crossfade',
    },
    vfxOverlays: [
      { type: 'grid-overlay',    opacity: 0.18, applyToCategories: 'all' },
      { type: 'corner-brackets', opacity: 0.75, applyToCategories: 'all' },
      { type: 'pulse-border',    opacity: 0.55, applyToCategories: ['main-video', 'main-video-text'] },
      { type: 'scan-line',       opacity: 0.22, applyToCategories: ['main-video', 'main-video-text'] },
      { type: 'color-vignette',  opacity: 0.15, applyToCategories: 'all' },
      { type: 'image-overlay',   opacity: 0.40, applyToCategories: ['main-video', 'main-video-text'], assetPath: 'pulse/corner-brackets.png', blendMode: 'normal' },
      { type: 'image-overlay',   opacity: 0.30, applyToCategories: ['main-video', 'main-video-text'], assetPath: 'pulse/rounded-frame.png', blendMode: 'normal' },
      { type: 'image-overlay',   opacity: 0.08, applyToCategories: 'all', assetPath: 'pulse/scanlines.png', blendMode: 'normal' }
    ]
  }
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
