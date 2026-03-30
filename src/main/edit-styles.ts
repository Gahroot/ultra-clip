/**
 * Edit Style Presets — Captions.ai-style edit styles
 *
 * Defines all 15 edit style presets extracted from video analysis.
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
  'fullscreen-text-quote'
]

const MEDIUM_ENERGY_SEGMENTS = [
  'main-video-normal',
  'main-video-tight',
  'main-video-wide',
  'main-video-text-lower',
  'main-video-text-upper',
  'main-video-images-pip',
  'fullscreen-text-quote'
]

const HIGH_ENERGY_SEGMENTS = [
  'main-video-normal',
  'main-video-tight',
  'main-video-text-lower',
  'main-video-text-upper',
  'main-video-images-pip',
  'main-video-images-side',
  'fullscreen-image-fill',
  'fullscreen-text-quote',
  'fullscreen-text-bold'
]

// ---------------------------------------------------------------------------
// All 15 edit style presets
// ---------------------------------------------------------------------------

export const EDIT_STYLES: EditStyle[] = [
  // ── LOW ENERGY (0.2–0.3 edits/sec) ─────────────────────────────────────

  {
    id: 'ember',
    name: 'Ember',
    energy: 'low',
    accentColor: '#FF6B35',
    captionBgOpacity: 0.25,
    letterbox: 'bottom',
    defaultZoomStyle: 'zoom-out',
    defaultZoomIntensity: 1.10,
    defaultTransition: 'hard-cut',
    flashColor: '#FFFFFF',
    targetEditsPerSecond: 0.2,
    captionStyle: 'minimal-dark',
    availableSegmentStyles: LOW_ENERGY_SEGMENTS
  },
  {
    id: 'clarity',
    name: 'Clarity',
    energy: 'low',
    accentColor: '#FF8C42',
    captionBgOpacity: 0.03,
    letterbox: 'none',
    defaultZoomStyle: 'snap',
    defaultZoomIntensity: 1.08,
    defaultTransition: 'crossfade',
    flashColor: '#FFFFFF',
    targetEditsPerSecond: 0.3,
    captionStyle: 'white-clean',
    availableSegmentStyles: LOW_ENERGY_SEGMENTS
  },
  {
    id: 'film',
    name: 'Film',
    energy: 'low',
    accentColor: '#FF7B3A',
    captionBgOpacity: 0.16,
    letterbox: 'none',
    defaultZoomStyle: 'drift',
    defaultZoomIntensity: 1.05,
    defaultTransition: 'crossfade',
    flashColor: '#FFFFFF',
    targetEditsPerSecond: 0.3,
    captionStyle: 'colored-vibrant',
    availableSegmentStyles: LOW_ENERGY_SEGMENTS
  },

  // ── MEDIUM ENERGY (0.4–0.7 edits/sec) ──────────────────────────────────

  {
    id: 'align',
    name: 'Align',
    energy: 'medium',
    accentColor: '#FF8C42',
    captionBgOpacity: 0.22,
    letterbox: 'none',
    defaultZoomStyle: 'none',
    defaultZoomIntensity: 1.0,
    defaultTransition: 'flash-cut',
    flashColor: '#FFFFFF',
    targetEditsPerSecond: 0.4,
    captionStyle: 'white-clean',
    availableSegmentStyles: MEDIUM_ENERGY_SEGMENTS
  },
  {
    id: 'growth',
    name: 'Growth',
    energy: 'medium',
    accentColor: '#CC3333',
    captionBgOpacity: 0.25,
    letterbox: 'bottom',
    defaultZoomStyle: 'snap',
    defaultZoomIntensity: 1.10,
    defaultTransition: 'flash-cut',
    flashColor: '#CC3333',
    targetEditsPerSecond: 0.4,
    captionStyle: 'minimal-dark',
    availableSegmentStyles: MEDIUM_ENERGY_SEGMENTS
  },
  {
    id: 'impact',
    name: 'Impact',
    energy: 'medium',
    accentColor: '#FF7B3A',
    captionBgOpacity: 0.44,
    letterbox: 'both',
    defaultZoomStyle: 'snap',
    defaultZoomIntensity: 1.15,
    defaultTransition: 'flash-cut',
    flashColor: '#FFFFFF',
    targetEditsPerSecond: 0.5,
    captionStyle: 'minimal-dark',
    availableSegmentStyles: MEDIUM_ENERGY_SEGMENTS
  },
  {
    id: 'lumen',
    name: 'Lumen',
    energy: 'medium',
    accentColor: '#CC3333',
    captionBgOpacity: 0.02,
    letterbox: 'none',
    defaultZoomStyle: 'drift',
    defaultZoomIntensity: 1.05,
    defaultTransition: 'hard-cut',
    flashColor: '#FFFFFF',
    targetEditsPerSecond: 0.5,
    captionStyle: 'white-clean',
    availableSegmentStyles: MEDIUM_ENERGY_SEGMENTS
  },
  {
    id: 'pulse',
    name: 'Pulse',
    energy: 'medium',
    accentColor: '#CC3333',
    captionBgOpacity: 0.33,
    letterbox: 'both',
    defaultZoomStyle: 'none',
    defaultZoomIntensity: 1.0,
    defaultTransition: 'hard-cut',
    flashColor: '#FFFFFF',
    targetEditsPerSecond: 0.5,
    captionStyle: 'colored-vibrant',
    availableSegmentStyles: MEDIUM_ENERGY_SEGMENTS
  },
  {
    id: 'elevate',
    name: 'Elevate',
    energy: 'medium',
    accentColor: '#FF8C42',
    captionBgOpacity: 0.31,
    letterbox: 'bottom',
    defaultZoomStyle: 'snap',
    defaultZoomIntensity: 1.08,
    defaultTransition: 'hard-cut',
    flashColor: '#FFFFFF',
    targetEditsPerSecond: 0.6,
    captionStyle: 'minimal-dark',
    availableSegmentStyles: MEDIUM_ENERGY_SEGMENTS
  },
  {
    id: 'recess',
    name: 'Recess',
    energy: 'medium',
    accentColor: '#FF8C42',
    captionBgOpacity: 0.04,
    letterbox: 'none',
    defaultZoomStyle: 'none',
    defaultZoomIntensity: 1.0,
    defaultTransition: 'hard-cut',
    flashColor: '#FFFFFF',
    targetEditsPerSecond: 0.6,
    captionStyle: 'white-clean',
    availableSegmentStyles: MEDIUM_ENERGY_SEGMENTS
  },
  {
    id: 'cinematic',
    name: 'Cinematic',
    energy: 'medium',
    accentColor: '#FF6B35',
    captionBgOpacity: 0.12,
    letterbox: 'none',
    defaultZoomStyle: 'none',
    defaultZoomIntensity: 1.0,
    defaultTransition: 'color-wash',
    flashColor: '#FF6B35',
    targetEditsPerSecond: 0.7,
    captionStyle: 'colored-wash',
    availableSegmentStyles: MEDIUM_ENERGY_SEGMENTS
  },

  // ── HIGH ENERGY (0.8+ edits/sec) ───────────────────────────────────────

  {
    id: 'paper_ii',
    name: 'Paper II',
    energy: 'high',
    accentColor: '#FF8C42',
    captionBgOpacity: 0.02,
    letterbox: 'none',
    defaultZoomStyle: 'drift',
    defaultZoomIntensity: 1.06,
    defaultTransition: 'crossfade',
    flashColor: '#FFFFFF',
    targetEditsPerSecond: 0.9,
    captionStyle: 'white-clean',
    availableSegmentStyles: HIGH_ENERGY_SEGMENTS
  },
  {
    id: 'rebel',
    name: 'Rebel',
    energy: 'high',
    accentColor: '#FF7B3A',
    captionBgOpacity: 0.39,
    letterbox: 'none',
    defaultZoomStyle: 'snap',
    defaultZoomIntensity: 1.12,
    defaultTransition: 'crossfade',
    flashColor: '#FFFFFF',
    targetEditsPerSecond: 0.9,
    captionStyle: 'minimal-dark',
    availableSegmentStyles: HIGH_ENERGY_SEGMENTS
  },
  {
    id: 'prime',
    name: 'Prime',
    energy: 'high',
    accentColor: '#FF8C42',
    captionBgOpacity: 0.10,
    letterbox: 'none',
    defaultZoomStyle: 'word-pulse',
    defaultZoomIntensity: 1.08,
    defaultTransition: 'crossfade',
    flashColor: '#FFFFFF',
    targetEditsPerSecond: 1.1,
    captionStyle: 'colored-vibrant',
    availableSegmentStyles: HIGH_ENERGY_SEGMENTS
  },
  {
    id: 'volt',
    name: 'Volt',
    energy: 'high',
    accentColor: '#FF7B3A',
    captionBgOpacity: 0.47,
    letterbox: 'bottom',
    defaultZoomStyle: 'word-pulse',
    defaultZoomIntensity: 1.10,
    defaultTransition: 'flash-cut',
    flashColor: '#FF7B3A',
    targetEditsPerSecond: 1.4,
    captionStyle: 'minimal-dark',
    availableSegmentStyles: HIGH_ENERGY_SEGMENTS
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
