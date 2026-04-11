/** Animation style for word-level captions. */
export type CaptionAnimation = 'captions-ai' | 'karaoke-fill' | 'word-pop' | 'fade-in' | 'glow' | 'word-box' | 'elastic-bounce' | 'typewriter' | 'impact-two' | 'cascade'

/** Word animation type for the live preview and CSS-based rendering. */
export type WordAnimationType = 'none' | 'fade' | 'pop' | 'slide' | 'bounce' | 'typewriter'

/** Text case transformation applied to caption words. */
export type TextCase = 'normal' | 'upper' | 'lower'

/** Shadow style applied behind caption text. */
export interface CaptionShadowStyle {
  /** Shadow rendering type. 'drop' = directional shadow, 'glow' = omnidirectional blur. */
  type: 'drop' | 'glow'
  /** Shadow color in hex (e.g. '#000000'). */
  color: string
  /** Horizontal offset in pixels (ignored for 'glow'). */
  offsetX: number
  /** Vertical offset in pixels (ignored for 'glow'). */
  offsetY: number
  /** Blur radius in pixels. */
  blur: number
}

/** Background box rendered behind each word or line of caption text. */
export interface CaptionBackgroundBox {
  /** Whether the background box is enabled. */
  enabled: boolean
  /** Box fill color in hex (e.g. '#000000'). */
  color: string
  /** Box opacity from 0 (transparent) to 1 (opaque). */
  opacity: number
  /** Corner radius in pixels. 0 = sharp corners. */
  cornerRadius: number
  /** Inner padding in pixels between text and box edge. */
  padding: number
}

/** Emphasis tier overrides — applied to words tagged 'emphasis' by the AI edit plan. */
export interface CaptionEmphasisStyle {
  /** Scale multiplier for emphasis words relative to base fontSize (e.g. 1.25 = 25% larger). */
  scaleFactor: number
  /** Override text color for emphasis words. Hex string. Falls back to highlightColor if omitted. */
  color?: string
  /** Override font weight for emphasis words. Falls back to base fontWeight if omitted. */
  fontWeight?: number
}

/** Supersize tier overrides — applied to words tagged 'supersize' by the AI edit plan. */
export interface CaptionSupersizeStyle {
  /** Scale multiplier for supersize words relative to base fontSize (e.g. 1.6 = 60% larger). */
  scaleFactor: number
  /** Override text color for supersize words. Hex string. Defaults to '#FFD700' gold. */
  color: string
  /** Override font weight for supersize words. Defaults to 800 (extra-bold). */
  fontWeight: number
}

/** Box emphasis tier overrides — word sits on a colored opaque rectangle. */
export interface CaptionBoxEmphasisStyle {
  /** Box fill color in hex (e.g. '#FF0000'). Falls back to highlightColor if omitted. */
  color?: string
  /** Box opacity from 0 (transparent) to 1 (opaque). Defaults to 0.85. */
  opacity: number
  /** Padding around the text in pixels. Defaults to 10. */
  padding: number
  /** Override text color for box-emphasis words. Falls back to base textColor if omitted. */
  textColor?: string
  /** Override font weight for box-emphasis words. Falls back to base fontWeight if omitted. */
  fontWeight?: number
}

/**
 * Rich caption style schema — the complete DNA of how words look on screen.
 *
 * Captures every visual property needed to render captions in both the ASS
 * burn-in pipeline (FFmpeg) and the CSS-based live preview overlay. Used by
 * basic "captions only" presets and as the caption layer of premium AI edit
 * style presets alike.
 *
 * Grouped into logical sections: typography, colors, outline/shadow/box,
 * emphasis tiers, animation, layout, and positioning.
 */
export interface CaptionStyleSchema {
  // ---------------------------------------------------------------------------
  // Typography
  // ---------------------------------------------------------------------------

  /** Font family name (e.g. 'Montserrat', 'Inter', 'Poppins'). */
  fontFamily: string
  /** Font weight as a numeric value (100–900). 400 = normal, 700 = bold. */
  fontWeight: number
  /** Text case transformation applied to all caption words. */
  textCase: TextCase
  /** Base font size as a fraction of frame height (e.g. 0.07 = 7%). */
  fontSize: number
  /** Letter spacing in pixels. 0 = normal. Positive values spread characters. */
  letterSpacing: number

  // ---------------------------------------------------------------------------
  // Colors
  // ---------------------------------------------------------------------------

  /** Primary text color in hex (e.g. '#FFFFFF'). */
  textColor: string
  /** Highlight color for the currently-spoken word in hex. */
  highlightColor: string

  // ---------------------------------------------------------------------------
  // Outline, Shadow & Background Box
  // ---------------------------------------------------------------------------

  /** Outline (stroke) color around each glyph in hex. */
  outlineColor: string
  /** Outline (stroke) width in pixels. 0 = no outline. */
  outlineWidth: number
  /** Text shadow configuration. `null` = no shadow. */
  shadow: CaptionShadowStyle | null
  /** Background box behind text. When disabled, no box is drawn. */
  backgroundBox: CaptionBackgroundBox

  // ---------------------------------------------------------------------------
  // Emphasis & Supersize Tiers
  // ---------------------------------------------------------------------------

  /** Visual overrides for words tagged 'emphasis' by the AI edit plan. */
  emphasis: CaptionEmphasisStyle
  /** Visual overrides for words tagged 'supersize' by the AI edit plan. */
  supersize: CaptionSupersizeStyle
  /** Visual overrides for words tagged 'box' — opaque background rectangle. */
  boxEmphasis: CaptionBoxEmphasisStyle

  // ---------------------------------------------------------------------------
  // Animation
  // ---------------------------------------------------------------------------

  /** Word-level entrance animation type. */
  wordAnimation: WordAnimationType
  /** Animation duration in milliseconds (e.g. 150). */
  animationDurationMs: number

  // ---------------------------------------------------------------------------
  // Layout & Positioning
  // ---------------------------------------------------------------------------

  /** Maximum number of words displayed at once per caption group/line. */
  wordsPerLine: number
  /**
   * Vertical position of the caption block as a fraction of frame height
   * measured from the bottom (0 = bottom edge, 1 = top edge).
   * Typical range: 0.08–0.25. Default ~0.12.
   */
  verticalPosition: number
}

/** Emphasis level for a single word in the transcript. */
export type EmphasisLevel = 'normal' | 'emphasis' | 'supersize' | 'box'

/** A word with its emphasis level determined by AI or heuristic analysis. */
export interface EmphasizedWord {
  text: string
  /** Start time in seconds */
  start: number
  /** End time in seconds */
  end: number
  /** Emphasis classification for caption styling. */
  emphasis: EmphasisLevel
}

/** Result of word emphasis analysis for a clip or segment. */
export interface WordEmphasisResult {
  words: EmphasizedWord[]
  /** Whether AI was used (true) or heuristic fallback (false). */
  usedAI: boolean
}
