import type {
  AppSettings,
  SettingsProfile,
  CaptionStyle,
  SoundDesignSettings,
  ZoomSettings,
  BrandKit,
  HookTitleOverlaySettings,
  RehookOverlaySettings,
  ProgressBarOverlaySettings,
  BRollSettings,
  FillerRemovalSettings,
  RenderQualitySettings,
  ProcessingConfig,
  HookTextTemplate,
  TemplateLayout,
  SourceVideo,
  TranscriptionData,
  ClipCandidate,
  StitchedClipCandidate,
  Platform,
  EditStylePreset,
} from './types'
import { DEFAULT_MIN_SCORE, DEFAULT_FILENAME_TEMPLATE } from '@shared/constants'

// ---------------------------------------------------------------------------
// Generic helpers
// ---------------------------------------------------------------------------

/**
 * Update a single item by ID in an array of objects.
 * Accepts either a partial object or a function that receives the current item
 * and returns a partial update.
 */
export function updateItemById<T extends { id: string }>(
  items: T[],
  itemId: string,
  update: Partial<T> | ((item: T) => Partial<T>)
): T[] {
  return items.map(item =>
    item.id === itemId
      ? { ...item, ...(typeof update === 'function' ? update(item) : update) }
      : item
  )
}

// ---------------------------------------------------------------------------
// Caption presets
// ---------------------------------------------------------------------------

export const CAPTION_PRESETS: Record<string, CaptionStyle> = {
  'captions-ai': {
    id: 'captions-ai',
    label: 'Captions.AI',
    fontName: 'Montserrat',
    fontFile: 'Montserrat-Bold.ttf',
    fontSize: 0.07,
    primaryColor: '#FFFFFF',
    highlightColor: '#00FF00',
    outlineColor: '#000000',
    backColor: '#80000000',
    outline: 4,
    shadow: 2,
    borderStyle: 1,
    wordsPerLine: 2,
    animation: 'captions-ai',
    emphasisColor: '#00FF00',
    supersizeColor: '#FFD700'
  },
  'hormozi-bold': {
    id: 'hormozi-bold',
    label: 'Hormozi Bold',
    fontName: 'Montserrat',
    fontFile: 'Montserrat-Bold.ttf',
    fontSize: 0.07,
    primaryColor: '#FFFFFF',
    highlightColor: '#00FF00',
    outlineColor: '#000000',
    backColor: '#80000000',
    outline: 4,
    shadow: 2,
    borderStyle: 1,
    wordsPerLine: 2,
    animation: 'word-pop',
    emphasisColor: '#00FF00',
    supersizeColor: '#FFD700'
  },
  'tiktok-glow': {
    id: 'tiktok-glow',
    label: 'TikTok Glow',
    fontName: 'Poppins',
    fontFile: 'Poppins-Bold.ttf',
    fontSize: 0.06,
    primaryColor: '#FFFFFF',
    highlightColor: '#00FFFF',
    outlineColor: '#FF00FF',
    backColor: '#00000000',
    outline: 2,
    shadow: 0,
    borderStyle: 1,
    wordsPerLine: 3,
    animation: 'glow',
    emphasisColor: '#00FFFF',
    supersizeColor: '#FF6B35'
  },
  'reels-clean': {
    id: 'reels-clean',
    label: 'Reels Clean',
    fontName: 'Inter',
    fontFile: 'Inter-Bold.ttf',
    fontSize: 0.06,
    primaryColor: '#FFFFFF',
    highlightColor: '#FFFFFF',
    outlineColor: '#000000',
    backColor: '#C8191919',
    outline: 0,
    shadow: 0,
    borderStyle: 3,
    wordsPerLine: 1,
    animation: 'word-pop',
    emphasisColor: '#FFFFFF',
    supersizeColor: '#FFD700'
  },
  'clarity-boxes': {
    id: 'clarity-boxes',
    label: 'Clarity Boxes',
    fontName: 'Inter',
    fontFile: 'Inter-Bold.ttf',
    fontSize: 0.065,
    primaryColor: '#FFFFFF',
    highlightColor: '#FFFFFF',
    outlineColor: '#E0192033',
    backColor: '#00000000',
    outline: 15,
    shadow: 0,
    borderStyle: 3,
    wordsPerLine: 3,
    animation: 'word-box',
    emphasisColor: '#2563EB',
    supersizeColor: '#DC2626'
  },
  'classic-karaoke': {
    id: 'classic-karaoke',
    label: 'Classic Karaoke',
    fontName: 'Inter',
    fontFile: 'Inter-Bold.ttf',
    fontSize: 0.05,
    primaryColor: '#FFFFFF',
    highlightColor: '#FFFF00',
    outlineColor: '#000000',
    backColor: '#80000000',
    outline: 3,
    shadow: 1,
    borderStyle: 1,
    wordsPerLine: 4,
    animation: 'karaoke-fill',
    emphasisColor: '#FFFF00',
    supersizeColor: '#FF4444'
  },
  'impact-two': {
    id: 'impact-two',
    label: 'Impact II',
    fontName: 'Montserrat',
    fontFile: 'Montserrat-Bold.ttf',
    fontSize: 0.065,
    primaryColor: '#FFFFFF',
    highlightColor: '#00FF00',
    outlineColor: '#000000',
    backColor: '#80000000',
    outline: 4,
    shadow: 2,
    borderStyle: 1,
    wordsPerLine: 3,
    animation: 'impact-two',
    emphasisColor: '#00FF00',
    supersizeColor: '#FFFFFF'
  },

  // ---------------------------------------------------------------------------
  // Clean & Minimal family — constellation-named basic caption styles
  // ---------------------------------------------------------------------------

  /** Acamar — white text with subtle fade-in. Clean and understated. */
  'acamar': {
    id: 'acamar',
    label: 'Acamar',
    fontName: 'Inter',
    fontFile: 'Inter.ttf',
    fontSize: 0.055,
    primaryColor: '#FFFFFF',
    highlightColor: '#FFFFFF',
    outlineColor: '#000000',
    backColor: '#00000000',
    outline: 2,
    shadow: 0,
    borderStyle: 1,
    wordsPerLine: 3,
    animation: 'fade-in',
    emphasisColor: '#E0E7FF',
    supersizeColor: '#C7D2FE'
  },

  /** Sirius — white text with pop animation. Crisp and attention-grabbing. */
  'sirius': {
    id: 'sirius',
    label: 'Sirius',
    fontName: 'Poppins',
    fontFile: 'Poppins-Bold.ttf',
    fontSize: 0.06,
    primaryColor: '#FFFFFF',
    highlightColor: '#FFFFFF',
    outlineColor: '#000000',
    backColor: '#00000000',
    outline: 3,
    shadow: 0,
    borderStyle: 1,
    wordsPerLine: 2,
    animation: 'word-pop',
    emphasisColor: '#F0ABFC',
    supersizeColor: '#E879F9'
  },

  /** Vega — light gray with thin outline. Soft and refined. */
  'vega': {
    id: 'vega',
    label: 'Vega',
    fontName: 'Outfit',
    fontFile: 'Outfit.ttf',
    fontSize: 0.055,
    primaryColor: '#E5E7EB',
    highlightColor: '#F3F4F6',
    outlineColor: '#1F2937',
    backColor: '#00000000',
    outline: 1,
    shadow: 0,
    borderStyle: 1,
    wordsPerLine: 3,
    animation: 'fade-in',
    emphasisColor: '#D1D5DB',
    supersizeColor: '#FFFFFF'
  },

  /** Capella — clean sans-serif with colored emphasis words. */
  'capella': {
    id: 'capella',
    label: 'Capella',
    fontName: 'Inter',
    fontFile: 'Inter-Bold.ttf',
    fontSize: 0.06,
    primaryColor: '#FFFFFF',
    highlightColor: '#60A5FA',
    outlineColor: '#000000',
    backColor: '#00000000',
    outline: 2,
    shadow: 0,
    borderStyle: 1,
    wordsPerLine: 3,
    animation: 'captions-ai',
    emphasisColor: '#60A5FA',
    supersizeColor: '#3B82F6'
  },

  /** Mira — minimal with rounded background boxes. */
  'mira': {
    id: 'mira',
    label: 'Mira',
    fontName: 'Poppins',
    fontFile: 'Poppins-Regular.ttf',
    fontSize: 0.055,
    primaryColor: '#FFFFFF',
    highlightColor: '#FFFFFF',
    outlineColor: '#00000000',
    backColor: '#B3000000',
    outline: 12,
    shadow: 0,
    borderStyle: 3,
    wordsPerLine: 3,
    animation: 'fade-in',
    emphasisColor: '#FDE68A',
    supersizeColor: '#FBBF24'
  },

  /** Lyra — thin weight elegant with gentle bounce. */
  'lyra': {
    id: 'lyra',
    label: 'Lyra',
    fontName: 'Outfit',
    fontFile: 'Outfit.ttf',
    fontSize: 0.055,
    primaryColor: '#FFFFFF',
    highlightColor: '#FFFFFF',
    outlineColor: '#000000',
    backColor: '#00000000',
    outline: 1,
    shadow: 0,
    borderStyle: 1,
    wordsPerLine: 3,
    animation: 'elastic-bounce',
    emphasisColor: '#A78BFA',
    supersizeColor: '#8B5CF6'
  },

  /** Rigel — small caps with slide-up reveal. Structured and editorial. */
  'rigel': {
    id: 'rigel',
    label: 'Rigel',
    fontName: 'Montserrat',
    fontFile: 'Montserrat.ttf',
    fontSize: 0.05,
    primaryColor: '#F9FAFB',
    highlightColor: '#F9FAFB',
    outlineColor: '#111827',
    backColor: '#00000000',
    outline: 2,
    shadow: 0,
    borderStyle: 1,
    wordsPerLine: 3,
    animation: 'cascade',
    emphasisColor: '#FCA5A5',
    supersizeColor: '#F87171'
  },

  /** Polaris — centered single-word-at-a-time with fade. Bold and focused. */
  'polaris': {
    id: 'polaris',
    label: 'Polaris',
    fontName: 'Montserrat',
    fontFile: 'Montserrat-Bold.ttf',
    fontSize: 0.075,
    primaryColor: '#FFFFFF',
    highlightColor: '#FFFFFF',
    outlineColor: '#000000',
    backColor: '#00000000',
    outline: 3,
    shadow: 0,
    borderStyle: 1,
    wordsPerLine: 1,
    animation: 'fade-in',
    emphasisColor: '#34D399',
    supersizeColor: '#10B981'
  },

  /** Aldebaran — two-word grouping with clean highlight. */
  'aldebaran': {
    id: 'aldebaran',
    label: 'Aldebaran',
    fontName: 'Inter',
    fontFile: 'Inter-Bold.ttf',
    fontSize: 0.06,
    primaryColor: '#FFFFFF',
    highlightColor: '#FBBF24',
    outlineColor: '#000000',
    backColor: '#00000000',
    outline: 2,
    shadow: 0,
    borderStyle: 1,
    wordsPerLine: 2,
    animation: 'captions-ai',
    emphasisColor: '#FBBF24',
    supersizeColor: '#F59E0B'
  },

  /** Antares — bold sans-serif with drop shadow. Strong and readable. */
  'antares': {
    id: 'antares',
    label: 'Antares',
    fontName: 'Poppins',
    fontFile: 'Poppins-Bold.ttf',
    fontSize: 0.065,
    primaryColor: '#FFFFFF',
    highlightColor: '#FFFFFF',
    outlineColor: '#000000',
    backColor: '#00000000',
    outline: 0,
    shadow: 3,
    borderStyle: 1,
    wordsPerLine: 2,
    animation: 'word-pop',
    emphasisColor: '#FB923C',
    supersizeColor: '#F97316'
  },

  // ---------------------------------------------------------------------------
  // Neon & Glow family — vivid colored text with glow shadows, dark-optimized
  // ---------------------------------------------------------------------------

  /** Alcyone — electric blue text with blue glow shadow. Inspired by the Pleiades. */
  'alcyone': {
    id: 'alcyone',
    label: 'Alcyone Blue',
    fontName: 'Poppins',
    fontFile: 'Poppins-Bold.ttf',
    fontSize: 0.065,
    primaryColor: '#4DA6FF',
    highlightColor: '#FFFFFF',
    outlineColor: '#0055DD',
    backColor: '#CC003399',
    outline: 4,
    shadow: 3,
    borderStyle: 1,
    wordsPerLine: 2,
    animation: 'glow',
    emphasisColor: '#80D4FF',
    supersizeColor: '#FFFFFF'
  },

  /** Spica — hot pink text with pink neon glow. Vivid and eye-catching. */
  'spica': {
    id: 'spica',
    label: 'Spica Pink',
    fontName: 'Poppins',
    fontFile: 'Poppins-Bold.ttf',
    fontSize: 0.065,
    primaryColor: '#FF69B4',
    highlightColor: '#FFFFFF',
    outlineColor: '#CC1166',
    backColor: '#CC880044',
    outline: 4,
    shadow: 3,
    borderStyle: 1,
    wordsPerLine: 2,
    animation: 'glow',
    emphasisColor: '#FFB6D9',
    supersizeColor: '#FFFFFF'
  },

  /** Deneb — purple text with deep purple glow. Rich and atmospheric. */
  'deneb': {
    id: 'deneb',
    label: 'Deneb Purple',
    fontName: 'Montserrat',
    fontFile: 'Montserrat-Bold.ttf',
    fontSize: 0.065,
    primaryColor: '#B388FF',
    highlightColor: '#FFFFFF',
    outlineColor: '#6A1B9A',
    backColor: '#CC440088',
    outline: 4,
    shadow: 3,
    borderStyle: 1,
    wordsPerLine: 2,
    animation: 'glow',
    emphasisColor: '#D1C4E9',
    supersizeColor: '#FFFFFF'
  },

  /** Arcturus — white text with rainbow-cycling emphasis colors. Prismatic. */
  'arcturus': {
    id: 'arcturus',
    label: 'Arcturus Prism',
    fontName: 'Montserrat',
    fontFile: 'Montserrat-Bold.ttf',
    fontSize: 0.065,
    primaryColor: '#FFFFFF',
    highlightColor: '#00FF88',
    outlineColor: '#111111',
    backColor: '#00000000',
    outline: 3,
    shadow: 2,
    borderStyle: 1,
    wordsPerLine: 3,
    animation: 'captions-ai',
    emphasisColor: '#FF4488',
    supersizeColor: '#FFD700'
  },

  /** Gemma — cyan text with magenta glow. High-contrast split coloring. */
  'gemma': {
    id: 'gemma',
    label: 'Gemma Split',
    fontName: 'Bangers',
    fontFile: 'Bangers-Regular.ttf',
    fontSize: 0.07,
    primaryColor: '#00FFFF',
    highlightColor: '#FF00FF',
    outlineColor: '#880088',
    backColor: '#CC440055',
    outline: 3,
    shadow: 2,
    borderStyle: 1,
    wordsPerLine: 2,
    animation: 'word-pop',
    emphasisColor: '#FF00FF',
    supersizeColor: '#FFFFFF'
  },

  /** Serpens — neon green on black with typewriter reveal. Matrix terminal vibe. */
  'serpens': {
    id: 'serpens',
    label: 'Serpens Matrix',
    fontName: 'JetBrains Mono',
    fontFile: 'JetBrainsMono.ttf',
    fontSize: 0.055,
    primaryColor: '#39FF14',
    highlightColor: '#FFFFFF',
    outlineColor: '#003300',
    backColor: '#E6000000',
    outline: 1,
    shadow: 2,
    borderStyle: 1,
    wordsPerLine: 3,
    animation: 'typewriter',
    emphasisColor: '#7CFF55',
    supersizeColor: '#FFFFFF'
  },

  /** Electra — electric yellow with hard glow. Charged and intense. */
  'electra': {
    id: 'electra',
    label: 'Electra Volt',
    fontName: 'Anton',
    fontFile: 'Anton-Regular.ttf',
    fontSize: 0.07,
    primaryColor: '#FFE400',
    highlightColor: '#FFFFFF',
    outlineColor: '#AA8800',
    backColor: '#CC005588',
    outline: 5,
    shadow: 3,
    borderStyle: 1,
    wordsPerLine: 2,
    animation: 'elastic-bounce',
    emphasisColor: '#FFF176',
    supersizeColor: '#FFFFFF'
  },

  /** Nashira — gradient-feel through alternating vivid word colors. Chromatic. */
  'nashira': {
    id: 'nashira',
    label: 'Nashira Gradient',
    fontName: 'Poppins',
    fontFile: 'Poppins-Bold.ttf',
    fontSize: 0.06,
    primaryColor: '#FF6EC7',
    highlightColor: '#7DF9FF',
    outlineColor: '#222222',
    backColor: '#00000000',
    outline: 3,
    shadow: 1,
    borderStyle: 1,
    wordsPerLine: 3,
    animation: 'cascade',
    emphasisColor: '#FFD700',
    supersizeColor: '#FF4444'
  },

  /** Betelgeuse — warm orange text with fiery bounce glow. Supergiant energy. */
  'betelgeuse': {
    id: 'betelgeuse',
    label: 'Betelgeuse Ember',
    fontName: 'Montserrat',
    fontFile: 'Montserrat-Bold.ttf',
    fontSize: 0.065,
    primaryColor: '#FF6B00',
    highlightColor: '#FFDD44',
    outlineColor: '#882200',
    backColor: '#CC001166',
    outline: 4,
    shadow: 3,
    borderStyle: 1,
    wordsPerLine: 2,
    animation: 'elastic-bounce',
    emphasisColor: '#FFAB40',
    supersizeColor: '#FFFFFF'
  },

  /** Fomalhaut — cool teal text with frosted semi-transparent background boxes. */
  'fomalhaut': {
    id: 'fomalhaut',
    label: 'Fomalhaut Frost',
    fontName: 'Inter',
    fontFile: 'Inter-Bold.ttf',
    fontSize: 0.06,
    primaryColor: '#00E5CC',
    highlightColor: '#FFFFFF',
    outlineColor: '#00000000',
    backColor: '#B31A2A3A',
    outline: 12,
    shadow: 0,
    borderStyle: 3,
    wordsPerLine: 3,
    animation: 'fade-in',
    emphasisColor: '#5EEAD4',
    supersizeColor: '#FFFFFF'
  },

  // ---------------------------------------------------------------------------
  // Handwritten & Playful family — warm, human, approachable caption styles
  // ---------------------------------------------------------------------------

  /** Procyon — handwritten Caveat with gentle fade-in. Warm and personal. */
  'procyon': {
    id: 'procyon',
    label: 'Procyon Whisper',
    fontName: 'Caveat',
    fontFile: 'Caveat.ttf',
    fontSize: 0.075,
    primaryColor: '#FFFFFF',
    highlightColor: '#FFFFFF',
    outlineColor: '#000000',
    backColor: '#00000000',
    outline: 2,
    shadow: 1,
    borderStyle: 1,
    wordsPerLine: 3,
    animation: 'fade-in',
    emphasisColor: '#FDE68A',
    supersizeColor: '#FBBF24'
  },

  /** Altair — Permanent Marker with punchy pop animation. Bold and raw. */
  'altair': {
    id: 'altair',
    label: 'Altair Marker',
    fontName: 'Permanent Marker',
    fontFile: 'PermanentMarker-Regular.ttf',
    fontSize: 0.065,
    primaryColor: '#FFFFFF',
    highlightColor: '#FF6B6B',
    outlineColor: '#000000',
    backColor: '#00000000',
    outline: 3,
    shadow: 2,
    borderStyle: 1,
    wordsPerLine: 2,
    animation: 'word-pop',
    emphasisColor: '#FF6B6B',
    supersizeColor: '#FF3333'
  },

  /** Castor — Dancing Script with colored emphasis. Elegant and flowing. */
  'castor': {
    id: 'castor',
    label: 'Castor Script',
    fontName: 'Dancing Script',
    fontFile: 'DancingScript.ttf',
    fontSize: 0.07,
    primaryColor: '#FFFFFF',
    highlightColor: '#7DD3FC',
    outlineColor: '#000000',
    backColor: '#00000000',
    outline: 2,
    shadow: 1,
    borderStyle: 1,
    wordsPerLine: 3,
    animation: 'captions-ai',
    emphasisColor: '#7DD3FC',
    supersizeColor: '#38BDF8'
  },

  /** Pollux — Caveat handwriting on warm rounded background boxes. Cozy. */
  'pollux': {
    id: 'pollux',
    label: 'Pollux Sticky',
    fontName: 'Caveat',
    fontFile: 'Caveat.ttf',
    fontSize: 0.07,
    primaryColor: '#1C1917',
    highlightColor: '#1C1917',
    outlineColor: '#FDE68A',
    backColor: '#E8FDE68A',
    outline: 14,
    shadow: 0,
    borderStyle: 3,
    wordsPerLine: 3,
    animation: 'fade-in',
    emphasisColor: '#B45309',
    supersizeColor: '#92400E'
  },

  /** Canopus — Dancing Script with elastic bounce. Light and bubbly. */
  'canopus': {
    id: 'canopus',
    label: 'Canopus Bounce',
    fontName: 'Dancing Script',
    fontFile: 'DancingScript.ttf',
    fontSize: 0.07,
    primaryColor: '#FFFFFF',
    highlightColor: '#C4B5FD',
    outlineColor: '#000000',
    backColor: '#00000000',
    outline: 2,
    shadow: 0,
    borderStyle: 1,
    wordsPerLine: 2,
    animation: 'elastic-bounce',
    emphasisColor: '#C4B5FD',
    supersizeColor: '#A78BFA'
  },

  /** Bellatrix — Permanent Marker all-caps feel with hard drop shadow. Gritty. */
  'bellatrix': {
    id: 'bellatrix',
    label: 'Bellatrix Shout',
    fontName: 'Permanent Marker',
    fontFile: 'PermanentMarker-Regular.ttf',
    fontSize: 0.07,
    primaryColor: '#FFFFFF',
    highlightColor: '#FFE600',
    outlineColor: '#000000',
    backColor: '#00000000',
    outline: 0,
    shadow: 4,
    borderStyle: 1,
    wordsPerLine: 2,
    animation: 'word-pop',
    emphasisColor: '#FFE600',
    supersizeColor: '#FF4444'
  },

  /** Adhara — Dancing Script in soft pastels with cascade reveal. Dreamy. */
  'adhara': {
    id: 'adhara',
    label: 'Adhara Pastel',
    fontName: 'Dancing Script',
    fontFile: 'DancingScript.ttf',
    fontSize: 0.07,
    primaryColor: '#FBCFE8',
    highlightColor: '#A5F3FC',
    outlineColor: '#831843',
    backColor: '#00000000',
    outline: 2,
    shadow: 1,
    borderStyle: 1,
    wordsPerLine: 3,
    animation: 'cascade',
    emphasisColor: '#A5F3FC',
    supersizeColor: '#67E8F9'
  },

  /** Mimosa — Bangers with oversized pop and playful energy. Fun and loud. */
  'mimosa': {
    id: 'mimosa',
    label: 'Mimosa Pop',
    fontName: 'Bangers',
    fontFile: 'Bangers-Regular.ttf',
    fontSize: 0.07,
    primaryColor: '#FFFFFF',
    highlightColor: '#4ADE80',
    outlineColor: '#000000',
    backColor: '#00000000',
    outline: 3,
    shadow: 2,
    borderStyle: 1,
    wordsPerLine: 2,
    animation: 'impact-two',
    emphasisColor: '#4ADE80',
    supersizeColor: '#FB923C'
  },

  /** Shaula — Caveat with karaoke fill for a hand-drawn underline feel. Organic. */
  'shaula': {
    id: 'shaula',
    label: 'Shaula Trace',
    fontName: 'Caveat',
    fontFile: 'Caveat.ttf',
    fontSize: 0.075,
    primaryColor: '#FFFFFF',
    highlightColor: '#F9A8D4',
    outlineColor: '#000000',
    backColor: '#00000000',
    outline: 2,
    shadow: 1,
    borderStyle: 1,
    wordsPerLine: 3,
    animation: 'karaoke-fill',
    emphasisColor: '#F9A8D4',
    supersizeColor: '#EC4899'
  },

  /** Albireo — Caveat base with bold sans-serif emphasis contrast. Expressive. */
  'albireo': {
    id: 'albireo',
    label: 'Albireo Duo',
    fontName: 'Caveat',
    fontFile: 'Caveat.ttf',
    fontSize: 0.07,
    primaryColor: '#F5F5F4',
    highlightColor: '#FBBF24',
    outlineColor: '#000000',
    backColor: '#00000000',
    outline: 3,
    shadow: 1,
    borderStyle: 1,
    wordsPerLine: 3,
    animation: 'captions-ai',
    emphasisColor: '#FBBF24',
    supersizeColor: '#F59E0B'
  },

  // -----------------------------------------------------------------------
  // Street & High-Impact — bold decorative fonts, heavy outlines, max energy
  // -----------------------------------------------------------------------

  /** Thuban — Bangers all-caps with punchy colored word boxes. Street poster energy. */
  'thuban': {
    id: 'thuban',
    label: 'Thuban Boxed',
    fontName: 'Bangers',
    fontFile: 'Bangers-Regular.ttf',
    fontSize: 0.08,
    primaryColor: '#FFFFFF',
    highlightColor: '#FF2D55',
    outlineColor: '#000000',
    backColor: '#E6FF2D55',
    outline: 2,
    shadow: 0,
    borderStyle: 3,
    wordsPerLine: 2,
    animation: 'word-box',
    emphasisColor: '#FFE600',
    supersizeColor: '#00FF88'
  },

  /** Izar — High-contrast white-on-black with snappy word pop. Bold and clean. */
  'izar': {
    id: 'izar',
    label: 'Izar Snap',
    fontName: 'Anton',
    fontFile: 'Anton-Regular.ttf',
    fontSize: 0.085,
    primaryColor: '#FFFFFF',
    highlightColor: '#FFFFFF',
    outlineColor: '#000000',
    backColor: '#FF000000',
    outline: 0,
    shadow: 0,
    borderStyle: 3,
    wordsPerLine: 2,
    animation: 'word-pop',
    emphasisColor: '#FF3B30',
    supersizeColor: '#FFE600'
  },

  /** Zaniah — Press Start 2P pixel font with retro game aesthetic. 8-bit energy. */
  'zaniah': {
    id: 'zaniah',
    label: 'Zaniah Pixel',
    fontName: 'Press Start 2P',
    fontFile: 'PressStart2P-Regular.ttf',
    fontSize: 0.04,
    primaryColor: '#00FF41',
    highlightColor: '#FFE600',
    outlineColor: '#000000',
    backColor: '#CC111111',
    outline: 2,
    shadow: 3,
    borderStyle: 1,
    wordsPerLine: 3,
    animation: 'typewriter',
    emphasisColor: '#FF2D55',
    supersizeColor: '#00CFFF'
  },

  /** Hadar — Massive outline with bright contrasting fill. Pure impact. */
  'hadar': {
    id: 'hadar',
    label: 'Hadar Impact',
    fontName: 'Bangers',
    fontFile: 'Bangers-Regular.ttf',
    fontSize: 0.09,
    primaryColor: '#FFE600',
    highlightColor: '#FF2D55',
    outlineColor: '#000000',
    backColor: '#00000000',
    outline: 6,
    shadow: 4,
    borderStyle: 1,
    wordsPerLine: 2,
    animation: 'impact-two',
    emphasisColor: '#FF2D55',
    supersizeColor: '#FFFFFF'
  },

  /** Sabik — Graffiti-style with Permanent Marker, tilted energy and colored shadow. Raw. */
  'sabik': {
    id: 'sabik',
    label: 'Sabik Graffiti',
    fontName: 'Permanent Marker',
    fontFile: 'PermanentMarker-Regular.ttf',
    fontSize: 0.075,
    primaryColor: '#FFFFFF',
    highlightColor: '#FF6B00',
    outlineColor: '#4A0080',
    backColor: '#00000000',
    outline: 4,
    shadow: 5,
    borderStyle: 1,
    wordsPerLine: 2,
    animation: 'elastic-bounce',
    emphasisColor: '#FF6B00',
    supersizeColor: '#00FF88'
  },

  /** Kochab — Stencil feel with Oswald, wide letter spacing, slide reveal. Military edge. */
  'kochab': {
    id: 'kochab',
    label: 'Kochab Stencil',
    fontName: 'Oswald',
    fontFile: 'Oswald.ttf',
    fontSize: 0.07,
    primaryColor: '#E5E5E5',
    highlightColor: '#FF3B30',
    outlineColor: '#1A1A1A',
    backColor: '#CC1A1A1A',
    outline: 1,
    shadow: 0,
    borderStyle: 3,
    wordsPerLine: 3,
    animation: 'cascade',
    emphasisColor: '#FF3B30',
    supersizeColor: '#FFE600'
  },

  /** Rasalhague — Bold condensed with alternating black/white word boxes. Graphic rhythm. */
  'rasalhague': {
    id: 'rasalhague',
    label: 'Rasalhague Bars',
    fontName: 'Bebas Neue',
    fontFile: 'BebasNeue-Regular.ttf',
    fontSize: 0.08,
    primaryColor: '#000000',
    highlightColor: '#FFFFFF',
    outlineColor: '#000000',
    backColor: '#FFFFFFFF',
    outline: 0,
    shadow: 0,
    borderStyle: 3,
    wordsPerLine: 2,
    animation: 'word-box',
    emphasisColor: '#FF2D55',
    supersizeColor: '#FFE600'
  },

  /** Lesath — Maximum outline thickness with hot glow. Neon sign on steroids. */
  'lesath': {
    id: 'lesath',
    label: 'Lesath Mega',
    fontName: 'Bangers',
    fontFile: 'Bangers-Regular.ttf',
    fontSize: 0.085,
    primaryColor: '#FFFFFF',
    highlightColor: '#FF2D55',
    outlineColor: '#FF2D55',
    backColor: '#00000000',
    outline: 7,
    shadow: 6,
    borderStyle: 1,
    wordsPerLine: 2,
    animation: 'glow',
    emphasisColor: '#00CFFF',
    supersizeColor: '#FFE600'
  },

  /** Dschubba — Street-style mixed color emphasis with Bangers. Every word pops different. */
  'dschubba': {
    id: 'dschubba',
    label: 'Dschubba Street',
    fontName: 'Bangers',
    fontFile: 'Bangers-Regular.ttf',
    fontSize: 0.08,
    primaryColor: '#FFFFFF',
    highlightColor: '#00FF88',
    outlineColor: '#000000',
    backColor: '#00000000',
    outline: 5,
    shadow: 3,
    borderStyle: 1,
    wordsPerLine: 2,
    animation: 'captions-ai',
    emphasisColor: '#FF6B00',
    supersizeColor: '#FF2D55'
  },

  /** Grumium — Brutalist all-caps monospace with hard edges. No curves, no mercy. */
  'grumium': {
    id: 'grumium',
    label: 'Grumium Brutalist',
    fontName: 'JetBrains Mono',
    fontFile: 'JetBrainsMono.ttf',
    fontSize: 0.055,
    primaryColor: '#FFFFFF',
    highlightColor: '#FF3B30',
    outlineColor: '#FFFFFF',
    backColor: '#FF000000',
    outline: 1,
    shadow: 0,
    borderStyle: 3,
    wordsPerLine: 3,
    animation: 'fade-in',
    emphasisColor: '#FF3B30',
    supersizeColor: '#FFE600'
  }
}

// ---------------------------------------------------------------------------
// Hook text templates
// ---------------------------------------------------------------------------

export const DEFAULT_HOOK_TEMPLATES: HookTextTemplate[] = [
  { id: 'ai-default', name: 'AI Default', template: '{hookText}', emoji: '🤖', builtIn: true },
  { id: 'bold-claim', name: 'Bold Claim', template: '🔥 {hookText} 🔥', emoji: '🔥', builtIn: true },
  { id: 'question-hook', name: 'Question Hook', template: '{hookText}?', emoji: '❓', builtIn: true },
  { id: 'warning', name: 'Warning', template: '⚠️ {hookText}', emoji: '⚠️', builtIn: true },
  { id: 'curiosity', name: 'Curiosity', template: "You won't believe {hookText}", emoji: '👀', builtIn: true },
  { id: 'announcement', name: 'Announcement', template: '{hookText} (WATCH THIS)', emoji: '📢', builtIn: true }
]

/**
 * Apply a hook text template by substituting variables.
 * Variables: {hookText}, {score}, {duration}
 */
export function applyHookTemplate(
  template: string,
  hookText: string,
  score?: number,
  duration?: number
): string {
  return template
    .replace(/\{hookText\}/g, hookText)
    .replace(/\{score\}/g, score !== undefined ? String(score) : '')
    .replace(/\{duration\}/g, duration !== undefined ? String(Math.round(duration)) : '')
}

// ---------------------------------------------------------------------------
// Default settings values
// ---------------------------------------------------------------------------

export const DEFAULT_SOUND_DESIGN: SoundDesignSettings = {
  enabled: false,
  backgroundMusicTrack: 'ambient-tech',
  sfxVolume: 0.5,
  musicVolume: 0.1,
  musicDucking: true,
  musicDuckLevel: 0.2,
  sfxStyle: 'standard',
}

export const DEFAULT_AUTO_ZOOM: ZoomSettings = {
  enabled: false,
  mode: 'ken-burns',
  intensity: 'subtle',
  intervalSeconds: 4
}

export const DEFAULT_BRAND_KIT: BrandKit = {
  enabled: false,
  logoPath: null,
  logoPosition: 'bottom-right',
  logoScale: 0.1,
  logoOpacity: 0.8,
  introBumperPath: null,
  outroBumperPath: null
}

export const DEFAULT_HOOK_TITLE_OVERLAY: HookTitleOverlaySettings = {
  enabled: true,
  style: 'centered-bold',
  displayDuration: 2.5,
  fadeIn: 0.3,
  fadeOut: 0.4,
  fontSize: 72,
  textColor: '#FFFFFF',
  outlineColor: '#000000',
  outlineWidth: 4
}

export const DEFAULT_REHOOK_OVERLAY: RehookOverlaySettings = {
  enabled: true,
  style: 'bar',
  displayDuration: 1.5,
  fadeIn: 0.2,
  fadeOut: 0.3,
  positionFraction: 0.45
}

export const DEFAULT_PROGRESS_BAR_OVERLAY: ProgressBarOverlaySettings = {
  enabled: false,
  position: 'bottom',
  height: 4,
  color: '#FFFFFF',
  opacity: 0.9,
  style: 'solid'
}

export const DEFAULT_BROLL: BRollSettings = {
  enabled: false,
  pexelsApiKey: localStorage.getItem('batchcontent-pexels-key') || '',
  intervalSeconds: 5,
  clipDuration: 3,
  displayMode: 'split-top',
  transition: 'crossfade',
  pipSize: 0.25,
  pipPosition: 'bottom-right'
}

export const DEFAULT_FILLER_REMOVAL: FillerRemovalSettings = {
  enabled: true,
  removeFillerWords: true,
  trimSilences: true,
  removeRepeats: true,
  silenceThreshold: 0.8,
  fillerWords: [
    'um', 'uh', 'erm', 'er', 'ah', 'hm', 'hmm', 'mm', 'mhm',
    'like', 'you know', 'i mean', 'sort of', 'kind of',
    'basically', 'actually', 'literally', 'right', 'okay so'
  ]
}

export const DEFAULT_RENDER_QUALITY: RenderQualitySettings = {
  preset: 'normal',
  customCrf: 23,
  outputResolution: '1080x1920',
  outputFormat: 'mp4',
  encodingPreset: 'veryfast'
}

export const DEFAULT_SETTINGS: AppSettings = {
  geminiApiKey: localStorage.getItem('batchcontent-gemini-key') || '',
  outputDirectory: null,
  minScore: DEFAULT_MIN_SCORE,
  captionStyle: CAPTION_PRESETS['captions-ai'],
  captionsEnabled: true,
  soundDesign: DEFAULT_SOUND_DESIGN,
  autoZoom: DEFAULT_AUTO_ZOOM,
  brandKit: DEFAULT_BRAND_KIT,
  hookTitleOverlay: DEFAULT_HOOK_TITLE_OVERLAY,
  rehookOverlay: DEFAULT_REHOOK_OVERLAY,
  progressBarOverlay: DEFAULT_PROGRESS_BAR_OVERLAY,
  broll: DEFAULT_BROLL,
  fillerRemoval: DEFAULT_FILLER_REMOVAL,
  enableNotifications: true,
  developerMode: false,
  renderQuality: DEFAULT_RENDER_QUALITY,
  outputAspectRatio: '9:16',
  filenameTemplate: DEFAULT_FILENAME_TEMPLATE,
  renderConcurrency: 1
}

export const DEFAULT_PROCESSING_CONFIG: ProcessingConfig = {
  targetDuration: 'auto',
  enablePerfectLoop: false,
  clipEndMode: 'loop-first',
  enableVariants: false,
  enableMultiPart: false,
  enableClipStitching: false,
  enableAiEdit: false
}

export const DEFAULT_PIPELINE = {
  stage: 'idle' as const,
  message: '',
  percent: 0
}

// ---------------------------------------------------------------------------
// Default template layout + project file schema
// ---------------------------------------------------------------------------

export const DEFAULT_TEMPLATE_LAYOUT: TemplateLayout = {
  titleText: { x: 50, y: 12 },
  subtitles: { x: 50, y: 50 },
  rehookText: { x: 50, y: 12 },
  media: { x: 50, y: 75 }
}

/** Canonical shape written to / read from .batchcontent files. */
export interface ProjectFileData {
  version: number
  sources: SourceVideo[]
  transcriptions: Record<string, TranscriptionData>
  clips: Record<string, ClipCandidate[]>
  settings: AppSettings
  templateLayout: TemplateLayout
  targetPlatform: Platform
  stitchedClips?: Record<string, StitchedClipCandidate[]>
}

// ---------------------------------------------------------------------------
// Settings Persistence
// ---------------------------------------------------------------------------

const SETTINGS_STORAGE_KEY = 'batchcontent-settings'
const PROCESSING_CONFIG_STORAGE_KEY = 'batchcontent-processing-config'

export function loadPersistedSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (raw) {
      const saved = JSON.parse(raw) as Partial<AppSettings>
      return {
        ...DEFAULT_SETTINGS,
        ...saved,
        geminiApiKey: localStorage.getItem('batchcontent-gemini-key') || '',
        soundDesign: { ...DEFAULT_SOUND_DESIGN, ...(saved.soundDesign ?? {}) },
        autoZoom: { ...DEFAULT_AUTO_ZOOM, ...(saved.autoZoom ?? {}) },
        brandKit: { ...DEFAULT_BRAND_KIT, ...(saved.brandKit ?? {}) },
        hookTitleOverlay: { ...DEFAULT_HOOK_TITLE_OVERLAY, ...(saved.hookTitleOverlay ?? {}) },
        rehookOverlay: { ...DEFAULT_REHOOK_OVERLAY, ...(saved.rehookOverlay ?? {}) },
        progressBarOverlay: { ...DEFAULT_PROGRESS_BAR_OVERLAY, ...(saved.progressBarOverlay ?? {}) },
        broll: {
          ...DEFAULT_BROLL,
          ...(saved.broll ?? {}),
          pexelsApiKey: localStorage.getItem('batchcontent-pexels-key') || ''
        },
        fillerRemoval: { ...DEFAULT_FILLER_REMOVAL, ...(saved.fillerRemoval ?? {}) },
        renderQuality: { ...DEFAULT_RENDER_QUALITY, ...(saved.renderQuality ?? {}) },
        captionStyle: { ...CAPTION_PRESETS['captions-ai'], ...(saved.captionStyle ?? {}) }
      }
    }
  } catch {
    // JSON parse error — fall back to defaults
  }
  return DEFAULT_SETTINGS
}

export function loadPersistedProcessingConfig(): ProcessingConfig {
  try {
    const raw = localStorage.getItem(PROCESSING_CONFIG_STORAGE_KEY)
    if (raw) {
      const saved = JSON.parse(raw) as Partial<ProcessingConfig>
      return { ...DEFAULT_PROCESSING_CONFIG, ...saved }
    }
  } catch {
    // JSON parse error — fall back to defaults
  }
  return DEFAULT_PROCESSING_CONFIG
}

export function persistSettings(settings: AppSettings): void {
  try {
    const { geminiApiKey: _g, ...rest } = settings
    const toSave = {
      ...rest,
      broll: { ...rest.broll, pexelsApiKey: undefined }
    }
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(toSave))
  } catch {
    // Storage full or unavailable — silently ignore
  }
}

export function persistProcessingConfig(config: ProcessingConfig): void {
  try {
    localStorage.setItem(PROCESSING_CONFIG_STORAGE_KEY, JSON.stringify(config))
  } catch {
    // Storage full or unavailable — silently ignore
  }
}

// ---------------------------------------------------------------------------
// Settings Profiles
// ---------------------------------------------------------------------------

const PROFILES_STORAGE_KEY = 'batchcontent-settings-profiles'
const ACTIVE_PROFILE_STORAGE_KEY = 'batchcontent-active-profile'

/** Extract the profile-relevant fields from the full AppSettings. */
export function extractProfileFromSettings(settings: AppSettings): SettingsProfile {
  const { pexelsApiKey: _p, ...brollWithoutKey } = settings.broll
  return {
    captionStyle: settings.captionStyle,
    captionsEnabled: settings.captionsEnabled,
    soundDesign: settings.soundDesign,
    autoZoom: settings.autoZoom,
    brandKit: settings.brandKit,
    hookTitleOverlay: settings.hookTitleOverlay,
    rehookOverlay: settings.rehookOverlay,
    progressBarOverlay: settings.progressBarOverlay,
    broll: brollWithoutKey,
    fillerRemoval: settings.fillerRemoval,
    renderQuality: settings.renderQuality,
    outputAspectRatio: settings.outputAspectRatio,
    filenameTemplate: settings.filenameTemplate,
    renderConcurrency: settings.renderConcurrency,
    minScore: settings.minScore,
    enableNotifications: settings.enableNotifications
  }
}

/** Apply a profile onto existing AppSettings, preserving secrets and machine-specific values. */
export function applyProfileToSettings(settings: AppSettings, profile: SettingsProfile): AppSettings {
  return {
    ...settings,
    captionStyle: profile.captionStyle,
    captionsEnabled: profile.captionsEnabled,
    soundDesign: profile.soundDesign,
    autoZoom: profile.autoZoom,
    brandKit: profile.brandKit,
    hookTitleOverlay: profile.hookTitleOverlay,
    rehookOverlay: profile.rehookOverlay,
    progressBarOverlay: profile.progressBarOverlay,
    broll: { ...profile.broll, pexelsApiKey: settings.broll.pexelsApiKey },
    fillerRemoval: profile.fillerRemoval,
    renderQuality: profile.renderQuality,
    outputAspectRatio: profile.outputAspectRatio,
    filenameTemplate: profile.filenameTemplate,
    renderConcurrency: profile.renderConcurrency,
    minScore: profile.minScore,
    enableNotifications: profile.enableNotifications
  }
}

/** The 3 built-in presets that ship with the app. */
export const BUILT_IN_PROFILES: Record<string, SettingsProfile> = {
  'TikTok Optimized': {
    captionStyle: CAPTION_PRESETS['hormozi-bold'],
    captionsEnabled: true,
    soundDesign: DEFAULT_SOUND_DESIGN,
    autoZoom: { enabled: true, mode: 'ken-burns', intensity: 'medium', intervalSeconds: 4 },
    brandKit: DEFAULT_BRAND_KIT,
    hookTitleOverlay: { ...DEFAULT_HOOK_TITLE_OVERLAY, enabled: true, style: 'centered-bold' },
    rehookOverlay: DEFAULT_REHOOK_OVERLAY,
    progressBarOverlay: { ...DEFAULT_PROGRESS_BAR_OVERLAY, enabled: true, style: 'glow', position: 'bottom' },
    broll: { enabled: false, intervalSeconds: 5, clipDuration: 3, displayMode: 'split-top', transition: 'crossfade', pipSize: 0.25, pipPosition: 'bottom-right' },
    fillerRemoval: DEFAULT_FILLER_REMOVAL,
    renderQuality: DEFAULT_RENDER_QUALITY,
    outputAspectRatio: '9:16',
    filenameTemplate: DEFAULT_FILENAME_TEMPLATE,
    renderConcurrency: 1,
    minScore: DEFAULT_MIN_SCORE,
    enableNotifications: true
  },
  'Reels Clean': {
    captionStyle: CAPTION_PRESETS['captions-ai'],
    captionsEnabled: true,
    soundDesign: DEFAULT_SOUND_DESIGN,
    autoZoom: { enabled: true, mode: 'ken-burns', intensity: 'subtle', intervalSeconds: 4 },
    brandKit: DEFAULT_BRAND_KIT,
    hookTitleOverlay: { ...DEFAULT_HOOK_TITLE_OVERLAY, enabled: true, style: 'slide-in' },
    rehookOverlay: DEFAULT_REHOOK_OVERLAY,
    progressBarOverlay: { ...DEFAULT_PROGRESS_BAR_OVERLAY, enabled: false },
    broll: { enabled: false, intervalSeconds: 5, clipDuration: 3, displayMode: 'split-top', transition: 'crossfade', pipSize: 0.25, pipPosition: 'bottom-right' },
    fillerRemoval: DEFAULT_FILLER_REMOVAL,
    renderQuality: DEFAULT_RENDER_QUALITY,
    outputAspectRatio: '9:16',
    filenameTemplate: DEFAULT_FILENAME_TEMPLATE,
    renderConcurrency: 1,
    minScore: DEFAULT_MIN_SCORE,
    enableNotifications: true
  },
  'Minimal': {
    captionStyle: CAPTION_PRESETS['captions-ai'],
    captionsEnabled: false,
    soundDesign: { ...DEFAULT_SOUND_DESIGN, enabled: false },
    autoZoom: { enabled: false, mode: 'ken-burns', intensity: 'subtle', intervalSeconds: 4 },
    brandKit: DEFAULT_BRAND_KIT,
    hookTitleOverlay: { ...DEFAULT_HOOK_TITLE_OVERLAY, enabled: false },
    rehookOverlay: { ...DEFAULT_REHOOK_OVERLAY, enabled: false },
    progressBarOverlay: { ...DEFAULT_PROGRESS_BAR_OVERLAY, enabled: false },
    broll: { enabled: false, intervalSeconds: 5, clipDuration: 3, displayMode: 'split-top', transition: 'crossfade', pipSize: 0.25, pipPosition: 'bottom-right' },
    fillerRemoval: { ...DEFAULT_FILLER_REMOVAL, enabled: false },
    renderQuality: DEFAULT_RENDER_QUALITY,
    outputAspectRatio: '9:16',
    filenameTemplate: DEFAULT_FILENAME_TEMPLATE,
    renderConcurrency: 1,
    minScore: DEFAULT_MIN_SCORE,
    enableNotifications: true
  }
}

export function loadPersistedProfiles(): Record<string, SettingsProfile> {
  const profiles = { ...BUILT_IN_PROFILES }
  try {
    const raw = localStorage.getItem(PROFILES_STORAGE_KEY)
    if (raw) {
      const saved = JSON.parse(raw) as Record<string, SettingsProfile>
      Object.assign(profiles, saved)
    }
  } catch {
    // ignore
  }
  return profiles
}

export function persistProfiles(profiles: Record<string, SettingsProfile>): void {
  try {
    const userOnly: Record<string, SettingsProfile> = {}
    for (const [name, profile] of Object.entries(profiles)) {
      if (!(name in BUILT_IN_PROFILES)) {
        userOnly[name] = profile
      }
    }
    localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(userOnly))
  } catch {
    // ignore
  }
}

export function loadActiveProfileName(): string | null {
  try {
    return localStorage.getItem(ACTIVE_PROFILE_STORAGE_KEY)
  } catch {
    return null
  }
}

export function persistActiveProfileName(name: string | null): void {
  try {
    if (name === null) {
      localStorage.removeItem(ACTIVE_PROFILE_STORAGE_KEY)
    } else {
      localStorage.setItem(ACTIVE_PROFILE_STORAGE_KEY, name)
    }
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Hook template persistence
// ---------------------------------------------------------------------------

const HOOK_TEMPLATES_KEY = 'batchcontent-hook-templates'
export const ACTIVE_HOOK_TEMPLATE_KEY = 'batchcontent-active-hook-template'

export function loadHookTemplatesFromStorage(): HookTextTemplate[] {
  try {
    const raw = localStorage.getItem(HOOK_TEMPLATES_KEY)
    if (!raw) return []
    return JSON.parse(raw) as HookTextTemplate[]
  } catch {
    return []
  }
}

export function saveHookTemplatesToStorage(templates: HookTextTemplate[]): void {
  localStorage.setItem(HOOK_TEMPLATES_KEY, JSON.stringify(templates))
}

// ---------------------------------------------------------------------------
// Edit Style Presets
// ---------------------------------------------------------------------------

const ACTIVE_STYLE_PRESET_KEY = 'batchcontent-active-style-preset'
const ACTIVE_VARIANT_KEY = 'batchcontent-active-variant'

export function loadActiveStylePresetId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_STYLE_PRESET_KEY)
  } catch {
    return null
  }
}

export function persistActiveStylePresetId(id: string | null): void {
  try {
    if (id === null) {
      localStorage.removeItem(ACTIVE_STYLE_PRESET_KEY)
    } else {
      localStorage.setItem(ACTIVE_STYLE_PRESET_KEY, id)
    }
  } catch {
    // ignore
  }
}

export function loadActiveVariantId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_VARIANT_KEY)
  } catch {
    return null
  }
}

export function persistActiveVariantId(id: string | null): void {
  try {
    if (id === null) {
      localStorage.removeItem(ACTIVE_VARIANT_KEY)
    } else {
      localStorage.setItem(ACTIVE_VARIANT_KEY, id)
    }
  } catch {
    // ignore
  }
}

/**
 * Deep merge utility — recursively merges `override` into `base`.
 * Only overrides keys that are explicitly present in the override object.
 * Primitive values replace; objects recurse.
 */
function deepMerge<T extends Record<string, unknown>>(base: T, override: Record<string, unknown>): T {
  const result = { ...base } as Record<string, unknown>
  for (const key of Object.keys(override)) {
    const baseVal = result[key]
    const overVal = override[key]
    if (
      overVal !== null &&
      overVal !== undefined &&
      typeof overVal === 'object' &&
      !Array.isArray(overVal) &&
      typeof baseVal === 'object' &&
      baseVal !== null &&
      !Array.isArray(baseVal)
    ) {
      result[key] = deepMerge(
        baseVal as Record<string, unknown>,
        overVal as Record<string, unknown>
      )
    } else if (overVal !== undefined) {
      result[key] = overVal
    }
  }
  return result as T
}

/**
 * Resolve a preset + optional variant into a fully concrete EditStylePreset.
 * If variantId is null or not found, returns the preset as-is.
 */
export function resolvePresetVariant(preset: EditStylePreset, variantId: string | null): EditStylePreset {
  if (!variantId || !preset.variants || preset.variants.length === 0) return preset
  const variant = preset.variants.find((v) => v.id === variantId)
  if (!variant) return preset

  // Merge each domain that has overrides
  const resolved = { ...preset }
  if (variant.captions) {
    resolved.captions = deepMerge(preset.captions, variant.captions as Record<string, unknown>) as typeof preset.captions
  }
  if (variant.zoom) {
    resolved.zoom = deepMerge(preset.zoom, variant.zoom as Record<string, unknown>) as typeof preset.zoom
  }
  if (variant.broll) {
    resolved.broll = deepMerge(preset.broll, variant.broll as Record<string, unknown>) as typeof preset.broll
  }
  if (variant.sound) {
    resolved.sound = deepMerge(preset.sound, variant.sound as Record<string, unknown>) as typeof preset.sound
  }
  if (variant.overlays) {
    resolved.overlays = deepMerge(preset.overlays, variant.overlays as Record<string, unknown>) as typeof preset.overlays
  }
  return resolved
}

/**
 * Apply an EditStylePreset (optionally with a variant) onto existing AppSettings,
 * preserving secrets and machine-specific values.
 */
export function applyEditStylePresetToSettings(
  settings: AppSettings,
  preset: EditStylePreset,
  variantId?: string | null
): AppSettings {
  const resolved = resolvePresetVariant(preset, variantId ?? null)
  return {
    ...settings,
    captionStyle: resolved.captions.style,
    captionsEnabled: resolved.captions.enabled,
    autoZoom: resolved.zoom,
    soundDesign: resolved.sound,
    broll: {
      ...resolved.broll,
      pexelsApiKey: settings.broll.pexelsApiKey,
    },
    hookTitleOverlay: {
      ...settings.hookTitleOverlay,
      enabled: resolved.overlays.hookTitle.enabled,
      style: resolved.overlays.hookTitle.style,
      displayDuration: resolved.overlays.hookTitle.displayDuration,
      fontSize: resolved.overlays.hookTitle.fontSize,
      textColor: resolved.overlays.hookTitle.textColor,
      outlineColor: resolved.overlays.hookTitle.outlineColor,
      outlineWidth: resolved.overlays.hookTitle.outlineWidth,
    },
    rehookOverlay: {
      ...settings.rehookOverlay,
      enabled: resolved.overlays.rehook.enabled,
      style: resolved.overlays.rehook.style,
      displayDuration: resolved.overlays.rehook.displayDuration,
    },
    progressBarOverlay: resolved.overlays.progressBar,
  }
}

/** The 10 built-in edit style presets shipped with the app. */
export const BUILT_IN_EDIT_STYLE_PRESETS: EditStylePreset[] = [
  // ── Viral ───────────────────────────────────────────────────────────────
  {
    id: 'hormozi-fire',
    name: 'Hormozi Fire',
    description: 'High-energy bold captions with pop animations and hype SFX. The classic viral formula.',
    thumbnail: '🔥',
    category: 'viral',
    tags: ['bold', 'hype', 'motivational', 'high-energy'],
    builtIn: true,
    captions: {
      enabled: true,
      style: CAPTION_PRESETS['hormozi-bold'],
    },
    zoom: { enabled: true, mode: 'ken-burns', intensity: 'medium', intervalSeconds: 4 },
    broll: { enabled: false, displayMode: 'split-top', transition: 'crossfade', pipSize: 0.25, pipPosition: 'bottom-right', intervalSeconds: 5, clipDuration: 3 },
    sound: { enabled: true, sfxStyle: 'energetic', backgroundMusicTrack: 'ambient-motivational', sfxVolume: 0.6, musicVolume: 0.1, musicDucking: true, musicDuckLevel: 0.15 },
    overlays: {
      hookTitle: { enabled: true, style: 'centered-bold', displayDuration: 2.5, fontSize: 72, textColor: '#FFFFFF', outlineColor: '#000000', outlineWidth: 4 },
      rehook: { enabled: true, style: 'bar', displayDuration: 1.5 },
      progressBar: { enabled: true, style: 'glow', position: 'bottom', height: 4, color: '#FF6B35', opacity: 0.9 },
    },
    colorGrade: { preset: 'high-contrast' },
    transitionIn: { type: 'zoom-punch', duration: 0.2 },
    transitionOut: { type: 'zoom-punch', duration: 0.2 },
  },
  {
    id: 'tiktok-hype',
    name: 'TikTok Hype',
    description: 'Glowing cyan captions, reactive zoom, and top progress bar — built for the For You Page.',
    thumbnail: '⚡',
    category: 'viral',
    tags: ['tiktok', 'glow', 'reactive', 'fyp'],
    builtIn: true,
    captions: {
      enabled: true,
      style: CAPTION_PRESETS['tiktok-glow'],
    },
    zoom: { enabled: true, mode: 'reactive', intensity: 'dynamic', intervalSeconds: 3 },
    broll: { enabled: false, displayMode: 'split-top', transition: 'crossfade', pipSize: 0.25, pipPosition: 'bottom-right', intervalSeconds: 5, clipDuration: 3 },
    sound: { enabled: true, sfxStyle: 'energetic', backgroundMusicTrack: 'ambient-tech', sfxVolume: 0.5, musicVolume: 0.12, musicDucking: true, musicDuckLevel: 0.2 },
    overlays: {
      hookTitle: { enabled: true, style: 'slide-in', displayDuration: 2.0, fontSize: 68, textColor: '#FFFFFF', outlineColor: '#FF00FF', outlineWidth: 3 },
      rehook: { enabled: true, style: 'slide-up', displayDuration: 1.5 },
      progressBar: { enabled: true, style: 'gradient', position: 'top', height: 5, color: '#00FFFF', opacity: 0.85 },
    },
    colorGrade: { preset: 'high-contrast' },
    transitionIn: { type: 'glitch', duration: 0.2 },
    transitionOut: { type: 'glitch', duration: 0.2 },
  },

  // ── Educational ──────────────────────────────────────────────────────────
  {
    id: 'edu-clear',
    name: 'Edu Clear',
    description: 'Boxed captions keep eyes on the lesson. B-Roll context, no distractions.',
    thumbnail: '📚',
    category: 'educational',
    tags: ['educational', 'clear', 'readable', 'broll'],
    builtIn: true,
    captions: {
      enabled: true,
      style: CAPTION_PRESETS['clarity-boxes'],
    },
    zoom: { enabled: true, mode: 'ken-burns', intensity: 'subtle', intervalSeconds: 6 },
    broll: { enabled: true, displayMode: 'split-top', transition: 'crossfade', pipSize: 0.25, pipPosition: 'bottom-right', intervalSeconds: 6, clipDuration: 4 },
    sound: { enabled: false, sfxStyle: 'minimal', backgroundMusicTrack: 'ambient-tech', sfxVolume: 0.3, musicVolume: 0.08, musicDucking: true, musicDuckLevel: 0.2 },
    overlays: {
      hookTitle: { enabled: true, style: 'top-bar', displayDuration: 2.5, fontSize: 64, textColor: '#FFFFFF', outlineColor: '#000000', outlineWidth: 3 },
      rehook: { enabled: true, style: 'text-only', displayDuration: 1.5 },
      progressBar: { enabled: true, style: 'solid', position: 'bottom', height: 3, color: '#2563EB', opacity: 0.9 },
    },
    colorGrade: { preset: 'none' },
    transitionIn: { type: 'none' },
    transitionOut: { type: 'none' },
  },
  {
    id: 'podcast-cuts',
    name: 'Podcast Cuts',
    description: 'Clean one-word-at-a-time captions, subtle music. Pure audio-first storytelling.',
    thumbnail: '🎙️',
    category: 'educational',
    tags: ['podcast', 'clean', 'readable', 'audio'],
    builtIn: true,
    captions: {
      enabled: true,
      style: CAPTION_PRESETS['reels-clean'],
    },
    zoom: { enabled: false, mode: 'ken-burns', intensity: 'subtle', intervalSeconds: 4 },
    broll: { enabled: false, displayMode: 'split-top', transition: 'crossfade', pipSize: 0.25, pipPosition: 'bottom-right', intervalSeconds: 5, clipDuration: 3 },
    sound: { enabled: true, sfxStyle: 'minimal', backgroundMusicTrack: 'ambient-chill', sfxVolume: 0.2, musicVolume: 0.08, musicDucking: true, musicDuckLevel: 0.25 },
    overlays: {
      hookTitle: { enabled: true, style: 'slide-in', displayDuration: 2.0, fontSize: 64, textColor: '#FFFFFF', outlineColor: '#000000', outlineWidth: 3 },
      rehook: { enabled: false, style: 'bar', displayDuration: 1.5 },
      progressBar: { enabled: true, style: 'solid', position: 'bottom', height: 3, color: '#FFFFFF', opacity: 0.7 },
    },
    colorGrade: { preset: 'warm', brightness: 0.01 },
    transitionIn: { type: 'none' },
    transitionOut: { type: 'none' },
  },

  // ── Cinematic ────────────────────────────────────────────────────────────
  {
    id: 'cinematic-dark',
    name: 'Cinematic Dark',
    description: 'Slow ken-burns, impact captions, restrained overlays. Premium, film-quality feel.',
    thumbnail: '🎬',
    category: 'cinematic',
    tags: ['cinematic', 'dark', 'premium', 'film'],
    builtIn: true,
    captions: {
      enabled: true,
      style: CAPTION_PRESETS['impact-two'],
    },
    zoom: { enabled: true, mode: 'ken-burns', intensity: 'subtle', intervalSeconds: 6 },
    broll: { enabled: false, displayMode: 'fullscreen', transition: 'crossfade', pipSize: 0.25, pipPosition: 'bottom-right', intervalSeconds: 8, clipDuration: 4 },
    sound: { enabled: true, sfxStyle: 'minimal', backgroundMusicTrack: 'ambient-tech', sfxVolume: 0.25, musicVolume: 0.09, musicDucking: true, musicDuckLevel: 0.2 },
    overlays: {
      hookTitle: { enabled: true, style: 'centered-bold', displayDuration: 3.0, fontSize: 76, textColor: '#FFFFFF', outlineColor: '#000000', outlineWidth: 5 },
      rehook: { enabled: false, style: 'bar', displayDuration: 1.5 },
      progressBar: { enabled: true, style: 'solid', position: 'bottom', height: 2, color: '#FFFFFF', opacity: 0.6 },
    },
    colorGrade: { preset: 'cinematic' },
    transitionIn: { type: 'dip-black', duration: 0.4 },
    transitionOut: { type: 'dip-black', duration: 0.4 },
  },
  {
    id: 'chill-vibes',
    name: 'Chill Vibes',
    description: 'Lo-fi karaoke captions, chill music, B-Roll bottom strip. Relaxed and watchable.',
    thumbnail: '🌊',
    category: 'cinematic',
    tags: ['chill', 'lofi', 'karaoke', 'relaxed'],
    builtIn: true,
    captions: {
      enabled: true,
      style: CAPTION_PRESETS['classic-karaoke'],
    },
    zoom: { enabled: true, mode: 'ken-burns', intensity: 'subtle', intervalSeconds: 5 },
    broll: { enabled: true, displayMode: 'split-bottom', transition: 'crossfade', pipSize: 0.25, pipPosition: 'bottom-right', intervalSeconds: 7, clipDuration: 4 },
    sound: { enabled: true, sfxStyle: 'minimal', backgroundMusicTrack: 'ambient-chill', sfxVolume: 0.2, musicVolume: 0.12, musicDucking: true, musicDuckLevel: 0.3 },
    overlays: {
      hookTitle: { enabled: true, style: 'slide-in', displayDuration: 2.5, fontSize: 64, textColor: '#FFFFFF', outlineColor: '#000000', outlineWidth: 3 },
      rehook: { enabled: false, style: 'bar', displayDuration: 1.5 },
      progressBar: { enabled: false, style: 'solid', position: 'bottom', height: 4, color: '#FFFFFF', opacity: 0.9 },
    },
    colorGrade: { preset: 'vintage' },
    transitionIn: { type: 'crossfade', duration: 0.5 },
    transitionOut: { type: 'crossfade', duration: 0.5 },
  },

  // ── Minimal ──────────────────────────────────────────────────────────────
  {
    id: 'ghost-clean',
    name: 'Ghost Clean',
    description: 'No overlays, no music, no distractions. Pure content — let the clip speak.',
    thumbnail: '🤍',
    category: 'minimal',
    tags: ['minimal', 'clean', 'no-overlays', 'pure'],
    builtIn: true,
    captions: {
      enabled: false,
      style: CAPTION_PRESETS['captions-ai'],
    },
    zoom: { enabled: false, mode: 'ken-burns', intensity: 'subtle', intervalSeconds: 4 },
    broll: { enabled: false, displayMode: 'split-top', transition: 'hard-cut', pipSize: 0.25, pipPosition: 'bottom-right', intervalSeconds: 5, clipDuration: 3 },
    sound: { enabled: false, sfxStyle: 'minimal', backgroundMusicTrack: 'ambient-tech', sfxVolume: 0.3, musicVolume: 0.1, musicDucking: true, musicDuckLevel: 0.2 },
    overlays: {
      hookTitle: { enabled: false, style: 'centered-bold', displayDuration: 2.5, fontSize: 72, textColor: '#FFFFFF', outlineColor: '#000000', outlineWidth: 4 },
      rehook: { enabled: false, style: 'bar', displayDuration: 1.5 },
      progressBar: { enabled: false, style: 'solid', position: 'bottom', height: 4, color: '#FFFFFF', opacity: 0.9 },
    },
    colorGrade: { preset: 'none' },
    transitionIn: { type: 'none' },
    transitionOut: { type: 'none' },
  },
  {
    id: 'reels-minimal',
    name: 'Reels Minimal',
    description: 'One word at a time in clean box captions, gentle zoom. Effortlessly scroll-stopping.',
    thumbnail: '✨',
    category: 'minimal',
    tags: ['minimal', 'reels', 'clean', 'box-captions'],
    builtIn: true,
    captions: {
      enabled: true,
      style: CAPTION_PRESETS['reels-clean'],
    },
    zoom: { enabled: true, mode: 'ken-burns', intensity: 'subtle', intervalSeconds: 4 },
    broll: { enabled: false, displayMode: 'split-top', transition: 'crossfade', pipSize: 0.25, pipPosition: 'bottom-right', intervalSeconds: 5, clipDuration: 3 },
    sound: { enabled: false, sfxStyle: 'minimal', backgroundMusicTrack: 'ambient-tech', sfxVolume: 0.3, musicVolume: 0.1, musicDucking: true, musicDuckLevel: 0.2 },
    overlays: {
      hookTitle: { enabled: true, style: 'centered-bold', displayDuration: 2.0, fontSize: 64, textColor: '#FFFFFF', outlineColor: '#000000', outlineWidth: 3 },
      rehook: { enabled: false, style: 'bar', displayDuration: 1.5 },
      progressBar: { enabled: false, style: 'solid', position: 'bottom', height: 4, color: '#FFFFFF', opacity: 0.9 },
    },
    colorGrade: { preset: 'none' },
    transitionIn: { type: 'crossfade', duration: 0.3 },
    transitionOut: { type: 'crossfade', duration: 0.3 },
  },

  // ── Branded ──────────────────────────────────────────────────────────────
  {
    id: 'premium-brand',
    name: 'Premium Brand',
    description: 'Gradient progress bar, motivational music, and AI captions — polished and on-brand.',
    thumbnail: '💎',
    category: 'branded',
    tags: ['brand', 'premium', 'polished', 'gradient'],
    builtIn: true,
    captions: {
      enabled: true,
      style: CAPTION_PRESETS['captions-ai'],
    },
    zoom: { enabled: true, mode: 'ken-burns', intensity: 'subtle', intervalSeconds: 5 },
    broll: { enabled: false, displayMode: 'pip', transition: 'crossfade', pipSize: 0.28, pipPosition: 'bottom-right', intervalSeconds: 6, clipDuration: 3 },
    sound: { enabled: true, sfxStyle: 'standard', backgroundMusicTrack: 'ambient-motivational', sfxVolume: 0.4, musicVolume: 0.1, musicDucking: true, musicDuckLevel: 0.2 },
    overlays: {
      hookTitle: { enabled: true, style: 'centered-bold', displayDuration: 2.5, fontSize: 72, textColor: '#FFFFFF', outlineColor: '#000000', outlineWidth: 4 },
      rehook: { enabled: true, style: 'bar', displayDuration: 1.5 },
      progressBar: { enabled: true, style: 'gradient', position: 'bottom', height: 5, color: '#FFFFFF', opacity: 0.9 },
    },
    colorGrade: { preset: 'film' },
    transitionIn: { type: 'crossfade', duration: 0.3 },
    transitionOut: { type: 'crossfade', duration: 0.3 },
  },
  {
    id: 'creator-mode',
    name: 'Creator Mode',
    description: 'PiP B-Roll, bold captions, swipe-in transitions. The full creator toolkit activated.',
    thumbnail: '🌟',
    category: 'branded',
    tags: ['creator', 'pip', 'broll', 'full-kit'],
    builtIn: true,
    captions: {
      enabled: true,
      style: CAPTION_PRESETS['hormozi-bold'],
    },
    zoom: { enabled: true, mode: 'ken-burns', intensity: 'medium', intervalSeconds: 4 },
    broll: { enabled: true, displayMode: 'pip', transition: 'swipe-up', pipSize: 0.28, pipPosition: 'bottom-right', intervalSeconds: 5, clipDuration: 3 },
    sound: { enabled: true, sfxStyle: 'standard', backgroundMusicTrack: 'ambient-tech', sfxVolume: 0.45, musicVolume: 0.1, musicDucking: true, musicDuckLevel: 0.2 },
    overlays: {
      hookTitle: { enabled: true, style: 'centered-bold', displayDuration: 2.5, fontSize: 72, textColor: '#FFFFFF', outlineColor: '#000000', outlineWidth: 4 },
      rehook: { enabled: true, style: 'slide-up', displayDuration: 1.5 },
      progressBar: { enabled: true, style: 'glow', position: 'bottom', height: 4, color: '#FFFFFF', opacity: 0.9 },
    },
    colorGrade: { preset: 'warm' },
    transitionIn: { type: 'swipe-down', duration: 0.3 },
    transitionOut: { type: 'swipe-down', duration: 0.3 },
  },
]
