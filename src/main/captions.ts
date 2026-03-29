import { writeFile, mkdir } from 'fs/promises'
import { join, dirname } from 'path'
import { tmpdir } from 'os'

// ---------------------------------------------------------------------------
// Types (canonical definitions live in @shared/types)
// ---------------------------------------------------------------------------

import type { CaptionAnimation } from '@shared/types'
export type { CaptionAnimation }

export interface CaptionStyleInput {
  fontName: string
  fontSize: number // fraction of frame height (e.g. 0.07)
  primaryColor: string // hex e.g. '#FFFFFF'
  highlightColor: string // hex e.g. '#00FF00'
  outlineColor: string // hex e.g. '#000000'
  backColor: string // hex with optional alpha e.g. '#80000000'
  outline: number
  shadow: number
  borderStyle: number // 1 = outline+shadow, 3 = opaque box
  wordsPerLine: number
  animation: CaptionAnimation
  /** Color for emphasis-level words (bigger + this color). Defaults to highlightColor. */
  emphasisColor?: string
  /** Color for supersize-level words (huge + bold + this color). Defaults to '#FFD700' gold. */
  supersizeColor?: string
}

export interface WordInput {
  text: string
  start: number // seconds (relative to clip start)
  end: number // seconds (relative to clip start)
  /** Emphasis level from word-emphasis analysis. Defaults to 'normal'. */
  emphasis?: 'normal' | 'emphasis' | 'supersize'
}

// ---------------------------------------------------------------------------
// Default canvas constants — 9:16 vertical frame
// ---------------------------------------------------------------------------

const DEFAULT_FRAME_WIDTH = 1080
const DEFAULT_FRAME_HEIGHT = 1920

// ---------------------------------------------------------------------------
// Color conversion helpers
// ---------------------------------------------------------------------------

/**
 * Convert a CSS hex color (with optional alpha) to ASS &HAABBGGRR format.
 * Accepts: '#RRGGBB', '#AARRGGBB', '#RGB'
 */
function hexToASS(hex: string): string {
  let r: number, g: number, b: number, a: number

  const h = hex.replace('#', '')

  if (h.length === 8) {
    // AARRGGBB
    a = parseInt(h.slice(0, 2), 16)
    r = parseInt(h.slice(2, 4), 16)
    g = parseInt(h.slice(4, 6), 16)
    b = parseInt(h.slice(6, 8), 16)
  } else if (h.length === 6) {
    a = 0
    r = parseInt(h.slice(0, 2), 16)
    g = parseInt(h.slice(2, 4), 16)
    b = parseInt(h.slice(4, 6), 16)
  } else if (h.length === 3) {
    a = 0
    r = parseInt(h[0] + h[0], 16)
    g = parseInt(h[1] + h[1], 16)
    b = parseInt(h[2] + h[2], 16)
  } else {
    return '&H00FFFFFF'
  }

  const pad = (n: number): string => n.toString(16).toUpperCase().padStart(2, '0')
  // ASS format: &HAABBGGRR (alpha, blue, green, red)
  return `&H${pad(a)}${pad(b)}${pad(g)}${pad(r)}`
}

// ---------------------------------------------------------------------------
// Time formatting
// ---------------------------------------------------------------------------

/** Format seconds to ASS timestamp: H:MM:SS.CC (centiseconds) */
function formatASSTime(seconds: number): string {
  const s = Math.max(0, seconds)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = Math.floor(s % 60)
  const cs = Math.round((s % 1) * 100)
  return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(cs).padStart(2, '0')}`
}

// ---------------------------------------------------------------------------
// Emphasis override helpers
// ---------------------------------------------------------------------------

/** Scale multipliers for emphasis levels relative to the base font size. */
const EMPHASIS_SCALE = 1.25 // 25% bigger
const SUPERSIZE_SCALE = 1.6 // 60% bigger

/**
 * Build ASS inline override tags for an emphasized or supersized word.
 * Returns an empty string for normal words.
 *
 * Uses \fs for absolute font size, \1c for primary color, and \b1 for bold.
 * A \r tag resets overrides after the word (appended by the caller as the
 * next word's override block or end of line).
 */
function buildEmphasisTags(
  word: WordInput,
  style: CaptionStyleInput,
  baseFontSize: number
): { prefix: string; suffix: string } {
  const level = word.emphasis ?? 'normal'
  if (level === 'normal') return { prefix: '', suffix: '' }

  if (level === 'supersize') {
    const size = Math.round(baseFontSize * SUPERSIZE_SCALE)
    const color = hexToASS(style.supersizeColor ?? '#FFD700')
    return {
      prefix: `\\fs${size}\\1c${color}\\b1`,
      suffix: `\\r`
    }
  }

  // emphasis
  const size = Math.round(baseFontSize * EMPHASIS_SCALE)
  const color = hexToASS(style.emphasisColor ?? style.highlightColor)
  return {
    prefix: `\\fs${size}\\1c${color}`,
    suffix: `\\r`
  }
}

// ---------------------------------------------------------------------------
// Word grouping
// ---------------------------------------------------------------------------

interface WordGroup {
  words: WordInput[]
  start: number
  end: number
  text: string
}

function groupWords(words: WordInput[], wordsPerLine: number): WordGroup[] {
  const groups: WordGroup[] = []
  for (let i = 0; i < words.length; i += wordsPerLine) {
    const chunk = words.slice(i, i + wordsPerLine)
    groups.push({
      words: chunk,
      start: chunk[0].start,
      end: chunk[chunk.length - 1].end,
      text: chunk.map((w) => w.text).join(' ')
    })
  }
  return groups
}

// ---------------------------------------------------------------------------
// ASS dialogue line builders per animation type
// ---------------------------------------------------------------------------

/**
 * Karaoke fill: uses \kf tags so each word fills with the highlight color
 * over its duration. The line starts in primaryColor and each word transitions
 * to highlightColor. Emphasis/supersize words get larger font + distinct color.
 */
function buildKaraokeLine(
  group: WordGroup,
  style: CaptionStyleInput,
  baseFontSize: number
): string {
  const start = formatASSTime(group.start)
  const end = formatASSTime(group.end)

  const highlightASS = hexToASS(style.highlightColor)

  // \kf duration is in centiseconds
  const parts = group.words.map((w) => {
    const dur = Math.round((w.end - w.start) * 100)
    const emp = buildEmphasisTags(w, style, baseFontSize)
    // Emphasis prefix goes inside the override block; suffix (\r) resets after the word
    return `{\\kf${dur}${emp.prefix}}${w.text}${emp.suffix ? `{${emp.suffix}}` : ''}`
  })

  // \1c sets the "post-karaoke" color (highlight), \k fills from primary→highlight
  return `Dialogue: 0,${start},${end},Default,,0,0,0,,{\\1c${highlightASS}}${parts.join(' ')}`
}

/**
 * Word pop: each word appears at its timestamp with a brief scale-up effect.
 * We emit one dialogue event per word-group, using override blocks that
 * make words invisible until their start time, then pop in.
 * Emphasis/supersize words pop in at a larger scale and use distinct colors.
 */
function buildWordPopLines(
  group: WordGroup,
  style: CaptionStyleInput,
  baseFontSize: number
): string[] {
  const lines: string[] = []
  const highlightASS = hexToASS(style.highlightColor)
  const primaryASS = hexToASS(style.primaryColor)

  const start = formatASSTime(group.start)
  const end = formatASSTime(group.end)

  // Build a single line where each word pops in at its timestamp
  // Words before their time are transparent, then become visible with a scale animation
  const parts = group.words.map((w, idx) => {
    const wordStart = Math.round((w.start - group.start) * 100)
    const wordDur = Math.round((w.end - w.start) * 100)
    const isLast = idx === group.words.length - 1

    const emp = buildEmphasisTags(w, style, baseFontSize)
    const level = w.emphasis ?? 'normal'

    // Emphasis/supersize words pop in bigger and use their own color instead of highlight
    const popScaleX = level === 'supersize' ? 130 : level === 'emphasis' ? 120 : 110
    const popScaleY = popScaleX
    const activeColor = level !== 'normal' ? '' : `\\t(${wordStart},${wordStart + wordDur},\\1c${highlightASS})`
    const resetColor = level !== 'normal' ? '' : `\\t(${wordStart + wordDur},${wordStart + wordDur},\\1c${primaryASS})`

    // Use \t for timed transform: word starts transparent, scales up, then settles
    // \alpha&HFF& = fully transparent, \alpha&H00& = fully visible
    const popDuration = Math.min(8, wordDur) // 80ms pop-in
    const suffix = isLast ? '' : ' '

    return (
      `{${emp.prefix}\\alpha&HFF&\\t(${wordStart},${wordStart + popDuration},\\alpha&H00&\\fscx${popScaleX}\\fscy${popScaleY})` +
      `\\t(${wordStart + popDuration},${wordStart + popDuration + 5},\\fscx100\\fscy100)` +
      `${activeColor}` +
      `${resetColor}}` +
      `${w.text}${emp.suffix ? `{${emp.suffix}}` : ''}${suffix}`
    )
  })

  lines.push(`Dialogue: 0,${start},${end},Default,,0,0,0,,${parts.join('')}`)
  return lines
}

/**
 * Fade-in: each word fades in sequentially at its timestamp.
 * Emphasis/supersize words fade in at a larger size and distinct color.
 */
function buildFadeInLines(
  group: WordGroup,
  style: CaptionStyleInput,
  baseFontSize: number
): string[] {
  const start = formatASSTime(group.start)
  const end = formatASSTime(group.end)

  const parts = group.words.map((w, idx) => {
    const wordStart = Math.round((w.start - group.start) * 100)
    const fadeDur = Math.min(15, Math.round((w.end - w.start) * 100))
    const isLast = idx === group.words.length - 1
    const suffix = isLast ? '' : ' '

    const emp = buildEmphasisTags(w, style, baseFontSize)

    return (
      `{${emp.prefix}\\alpha&HFF&\\t(${wordStart},${wordStart + fadeDur},\\alpha&H00&)}` +
      `${w.text}${emp.suffix ? `{${emp.suffix}}` : ''}${suffix}`
    )
  })

  return [`Dialogue: 0,${start},${end},Default,,0,0,0,,${parts.join('')}`]
}

/**
 * Glow: each word gets a colored glow (border) when it's the active word.
 * Emphasis/supersize words get a larger font and distinct glow color.
 */
function buildGlowLines(
  group: WordGroup,
  style: CaptionStyleInput,
  baseFontSize: number
): string[] {
  const start = formatASSTime(group.start)
  const end = formatASSTime(group.end)

  const highlightASS = hexToASS(style.highlightColor)
  const outlineASS = hexToASS(style.outlineColor)

  const parts = group.words.map((w, idx) => {
    const wordStart = Math.round((w.start - group.start) * 100)
    const wordEnd = Math.round((w.end - group.start) * 100)
    const isLast = idx === group.words.length - 1
    const suffix = isLast ? '' : ' '

    const emp = buildEmphasisTags(w, style, baseFontSize)
    const level = w.emphasis ?? 'normal'

    // Emphasis/supersize words get a thicker glow border
    const glowBord = level === 'supersize'
      ? style.outline + 5
      : level === 'emphasis'
        ? style.outline + 3
        : style.outline + 2

    // Switch outline/border color to highlight during the word's active time
    return (
      `{${emp.prefix}\\3c${outlineASS}` +
      `\\t(${wordStart},${wordStart},\\3c${highlightASS}\\bord${glowBord})` +
      `\\t(${wordEnd},${wordEnd},\\3c${outlineASS}\\bord${style.outline})}` +
      `${w.text}${emp.suffix ? `{${emp.suffix}}` : ''}${suffix}`
    )
  })

  return [`Dialogue: 0,${start},${end},Default,,0,0,0,,${parts.join('')}`]
}

/**
 * Word box (Clarity): each word gets its own positioned dialogue event with
 * BorderStyle=3 so every word sits on an individual opaque background box.
 * Emphasis/supersize words receive a distinct box color via \3c override.
 * Words pop in at their timestamp with a brief scale-up animation.
 *
 * In BorderStyle=3 mode:
 *   - OutlineColour (\3c) = box fill color
 *   - Outline (\bord)     = box padding around the text
 *   - BackColour (\4c)    = box drop-shadow color (we keep transparent)
 */
function buildWordBoxLines(
  group: WordGroup,
  style: CaptionStyleInput,
  baseFontSize: number,
  frameWidth: number,
  frameHeight: number,
  marginV: number
): string[] {
  const lines: string[] = []
  const primaryASS = hexToASS(style.primaryColor)

  // Box colors: OutlineColour is the box fill in BorderStyle=3
  const normalBoxASS = hexToASS(style.outlineColor)
  const emphasisBoxASS = hexToASS(style.emphasisColor ?? style.highlightColor)
  const supersizeBoxASS = hexToASS(style.supersizeColor ?? '#FFD700')

  const start = formatASSTime(group.start)
  const end = formatASSTime(group.end)

  // --- Estimate word widths for horizontal layout ---
  // Average character width ratio for bold sans-serif at a given font size.
  const AVG_CHAR_WIDTH_RATIO = 0.58
  const boxPadding = Math.max(8, Math.round(baseFontSize * 0.18))
  const wordGap = Math.round(baseFontSize * 0.18)

  interface WordMetric {
    word: WordInput
    level: 'normal' | 'emphasis' | 'supersize'
    effectiveSize: number
    textWidth: number
    boxWidth: number
  }

  const metrics: WordMetric[] = group.words.map((w) => {
    const level = w.emphasis ?? 'normal'
    const scale =
      level === 'supersize'
        ? SUPERSIZE_SCALE
        : level === 'emphasis'
          ? EMPHASIS_SCALE
          : 1
    const effectiveSize = Math.round(baseFontSize * scale)
    const charWidth = effectiveSize * AVG_CHAR_WIDTH_RATIO
    const textWidth = w.text.length * charWidth
    const boxWidth = textWidth + boxPadding * 2
    return { word: w, level, effectiveSize, textWidth, boxWidth }
  })

  // Total width of all boxes + gaps
  const totalRowWidth =
    metrics.reduce((sum, m) => sum + m.boxWidth, 0) +
    Math.max(0, metrics.length - 1) * wordGap

  // Start X so the row is centered horizontally
  let curX = (frameWidth - totalRowWidth) / 2

  // Y position: bottom-up from frame edge (same semantics as ASS marginV)
  const yPos = frameHeight - marginV

  for (let i = 0; i < metrics.length; i++) {
    const m = metrics[i]
    const w = m.word
    const centerX = Math.round(curX + m.boxWidth / 2)

    // Per-word box color
    const boxColor =
      m.level === 'supersize'
        ? supersizeBoxASS
        : m.level === 'emphasis'
          ? emphasisBoxASS
          : normalBoxASS

    // Word timing relative to group start (centiseconds)
    const wordStartCs = Math.round((w.start - group.start) * 100)
    const wordDurCs = Math.round((w.end - w.start) * 100)
    const popDur = Math.min(8, wordDurCs) // 80ms pop-in

    const overrides: string[] = [
      `\\an5`,
      `\\pos(${centerX},${yPos})`,
      `\\1c${primaryASS}`,
      `\\3c${boxColor}`,
      `\\4c&H00000000`,
      `\\bord${boxPadding}`,
      `\\shad0`
    ]

    // Font size override for emphasis/supersize
    if (m.level === 'emphasis') {
      overrides.push(`\\fs${m.effectiveSize}`)
    } else if (m.level === 'supersize') {
      overrides.push(`\\fs${m.effectiveSize}`, `\\b1`)
    }

    // Pop-in animation: invisible → scale-up → settle
    overrides.push(
      `\\alpha&HFF&`,
      `\\t(${wordStartCs},${wordStartCs + popDur},\\alpha&H00&\\fscx108\\fscy108)`,
      `\\t(${wordStartCs + popDur},${wordStartCs + popDur + 5},\\fscx100\\fscy100)`
    )

    lines.push(
      `Dialogue: 0,${start},${end},WordBox,,0,0,0,,{${overrides.join('')}}${w.text}`
    )

    curX += m.boxWidth + wordGap
  }

  return lines
}

/**
 * Elastic bounce: each word starts invisible and oversized, then snaps in with
 * a playful spring overshoot — like it's tossed onto the screen and bounces
 * into place. Emphasis words bounce harder (bigger initial scale and wider
 * oscillation), supersize words are even more dramatic.
 *
 * The elastic curve is modeled as a series of \t() keyframes:
 *   0 → t1  : invisible + oversized → visible + undershoot (shrink past 100%)
 *   t1 → t2 : undershoot → slight overshoot
 *   t2 → t3 : slight overshoot → settle at 100%
 */
function buildElasticBounceLines(
  group: WordGroup,
  style: CaptionStyleInput,
  baseFontSize: number
): string[] {
  const lines: string[] = []
  const highlightASS = hexToASS(style.highlightColor)
  const primaryASS = hexToASS(style.primaryColor)

  const start = formatASSTime(group.start)
  const end = formatASSTime(group.end)

  const parts = group.words.map((w, idx) => {
    const wordStart = Math.round((w.start - group.start) * 100)
    const wordDur = Math.round((w.end - w.start) * 100)
    const isLast = idx === group.words.length - 1

    const emp = buildEmphasisTags(w, style, baseFontSize)
    const level = w.emphasis ?? 'normal'

    // Elastic parameters per emphasis level
    // initialScale: how big the word starts (oversized, invisible)
    // undershoot:   how small it bounces past 100% on the way down
    // overshoot:    slight bounce back above 100%
    const params =
      level === 'supersize'
        ? { initial: 180, undershoot: 88, overshoot: 108, totalCs: 24 }
        : level === 'emphasis'
          ? { initial: 155, undershoot: 91, overshoot: 106, totalCs: 20 }
          : { initial: 135, undershoot: 93, overshoot: 104, totalCs: 16 }

    // Clamp total elastic duration to word duration
    const total = Math.min(params.totalCs, wordDur)

    // Phase timing (fractions of total elastic duration)
    const t1 = Math.round(total * 0.40) // snap-in phase (biggest motion)
    const t2 = Math.round(total * 0.70) // undershoot → overshoot
    const t3 = total                      // overshoot → settle

    // Color animation: highlight while active, reset after (skip for emphasis/supersize)
    const activeColor = level !== 'normal' ? '' : `\\t(${wordStart},${wordStart + wordDur},\\1c${highlightASS})`
    const resetColor = level !== 'normal' ? '' : `\\t(${wordStart + wordDur},${wordStart + wordDur},\\1c${primaryASS})`

    const suffix = isLast ? '' : ' '

    return (
      `{${emp.prefix}` +
      // Initial state: invisible + oversized
      `\\alpha&HFF&\\fscx${params.initial}\\fscy${params.initial}` +
      // Phase 1: snap in — become visible + shrink to undershoot
      `\\t(${wordStart},${wordStart + t1},\\alpha&H00&\\fscx${params.undershoot}\\fscy${params.undershoot})` +
      // Phase 2: bounce up from undershoot to slight overshoot
      `\\t(${wordStart + t1},${wordStart + t2},\\fscx${params.overshoot}\\fscy${params.overshoot})` +
      // Phase 3: settle to 100%
      `\\t(${wordStart + t2},${wordStart + t3},\\fscx100\\fscy100)` +
      `${activeColor}` +
      `${resetColor}}` +
      `${w.text}${emp.suffix ? `{${emp.suffix}}` : ''}${suffix}`
    )
  })

  lines.push(`Dialogue: 0,${start},${end},Default,,0,0,0,,${parts.join('')}`)
  return lines
}

/**
 * Typewriter: characters appear one at a time, left to right, like a subtitle
 * machine printing in real time. Each character's reveal timing is derived from
 * its parent word's duration divided by the word's character count, so fast
 * speech types faster and slow speech types slower.
 *
 * Implementation: every character starts fully transparent (\alpha&HFF&) and
 * becomes visible at its precise centisecond via an instant \t() transform.
 * Emphasis/supersize words keep their enlarged font and color overrides.
 */
function buildTypewriterLines(
  group: WordGroup,
  style: CaptionStyleInput,
  baseFontSize: number
): string[] {
  const start = formatASSTime(group.start)
  const end = formatASSTime(group.end)

  const charBlocks: string[] = []

  for (let wIdx = 0; wIdx < group.words.length; wIdx++) {
    const w = group.words[wIdx]
    const emp = buildEmphasisTags(w, style, baseFontSize)

    const wordStartCs = Math.round((w.start - group.start) * 100)
    const wordDurCs = Math.round((w.end - w.start) * 100)

    const chars = [...w.text] // spread handles multi-byte characters correctly
    const charCount = chars.length
    // Duration per character in centiseconds
    const csPerChar = charCount > 0 ? wordDurCs / charCount : wordDurCs

    for (let cIdx = 0; cIdx < charCount; cIdx++) {
      const revealCs = Math.round(wordStartCs + cIdx * csPerChar)
      // Instant reveal: \t from revealCs to revealCs flips alpha to visible
      const tags = `${emp.prefix}\\alpha&HFF&\\t(${revealCs},${revealCs},\\alpha&H00&)`
      charBlocks.push(`{${tags}}${chars[cIdx]}${emp.suffix ? `{${emp.suffix}}` : ''}`)
    }

    // Add space between words (visible immediately when first char of next word appears)
    if (wIdx < group.words.length - 1) {
      const nextWord = group.words[wIdx + 1]
      const nextStartCs = Math.round((nextWord.start - group.start) * 100)
      charBlocks.push(`{\\alpha&HFF&\\t(${nextStartCs},${nextStartCs},\\alpha&H00&)} `)
    }
  }

  return [`Dialogue: 0,${start},${end},Default,,0,0,0,,${charBlocks.join('')}`]
}

/**
 * Impact Two — two-line layout inspired by captions.ai "Impact II" / "Velocity".
 *
 * For each word group, one KEY word is pulled out and rendered absolutely MASSIVE
 * on its own line below. The remaining context words sit above it, small and
 * unassuming. The visual hierarchy is extreme and unmistakable.
 *
 * Layout (bottom-center aligned):
 *   Line 1:  {\fs<small>} context words          (e.g. 40% of base)
 *   Line 2:  {\fs<huge>}  KEY WORD               (e.g. 280% of base)
 *
 * KEY word selection priority:
 *   1. The first supersize-emphasis word in the group
 *   2. The first emphasis word in the group
 *   3. The last word in the group (natural sentence stress)
 *
 * Animation: context words fade in gently, then the key word SLAMS in with an
 * elastic overshoot (scale 140% → settle to 100%) and uses the supersizeColor.
 */
function buildImpactTwoLines(
  group: WordGroup,
  style: CaptionStyleInput,
  baseFontSize: number
): string[] {
  const primaryASS = hexToASS(style.primaryColor)
  const supersizeASS = hexToASS(style.supersizeColor ?? '#FFD700')
  const emphasisASS = hexToASS(style.emphasisColor ?? style.highlightColor)
  const outlineASS = hexToASS(style.outlineColor)

  const start = formatASSTime(group.start)
  const end = formatASSTime(group.end)

  // --- Pick the KEY word ---
  // Priority: first supersize > first emphasis > last word
  let keyIdx = -1
  for (let i = 0; i < group.words.length; i++) {
    if (group.words[i].emphasis === 'supersize') { keyIdx = i; break }
  }
  if (keyIdx === -1) {
    for (let i = 0; i < group.words.length; i++) {
      if (group.words[i].emphasis === 'emphasis') { keyIdx = i; break }
    }
  }
  if (keyIdx === -1) keyIdx = group.words.length - 1

  const keyWord = group.words[keyIdx]
  const contextWords = group.words.filter((_, i) => i !== keyIdx)

  // Font sizes: context = 40% of base, key = 280% of base
  const contextSize = Math.round(baseFontSize * 0.40)
  const keySize = Math.round(baseFontSize * 2.80)

  // If there's only one word, just render it huge (no context line)
  if (group.words.length === 1) {
    const w = group.words[0]
    const wordStartCs = Math.round((w.start - group.start) * 100)
    const wordDurCs = Math.round((w.end - w.start) * 100)
    const slamDur = Math.min(10, wordDurCs)
    const settleDur = Math.min(8, wordDurCs)

    const line =
      `Dialogue: 0,${start},${end},Default,,0,0,0,,` +
      `{\\fs${keySize}\\b1\\1c${supersizeASS}\\bord${Math.round(style.outline * 1.8)}` +
      `\\alpha&HFF&\\fscx140\\fscy140` +
      `\\t(${wordStartCs},${wordStartCs + slamDur},\\alpha&H00&)` +
      `\\t(${wordStartCs + slamDur},${wordStartCs + slamDur + settleDur},0.4,\\fscx100\\fscy100)}` +
      `${w.text.toUpperCase()}`

    return [line]
  }

  // --- Build the two-line dialogue ---
  // Line 1: small context words with gentle fade-in
  // Line 2: \N + massive KEY word with elastic slam

  const contextParts = contextWords.map((w) => {
    const wordStartCs = Math.round((w.start - group.start) * 100)
    const fadeDur = Math.min(12, Math.round((w.end - w.start) * 100))
    const level = w.emphasis ?? 'normal'
    // Context words that happen to be emphasis get a subtle color hint
    const colorTag = level === 'emphasis' ? `\\1c${emphasisASS}` : `\\1c${primaryASS}`

    return (
      `{\\fs${contextSize}${colorTag}\\bord${Math.max(1, Math.round(style.outline * 0.5))}` +
      `\\alpha&HFF&\\t(${wordStartCs},${wordStartCs + fadeDur},\\alpha&H00&)}` +
      `${w.text}`
    )
  })

  // KEY word timing + animation
  const keyStartCs = Math.round((keyWord.start - group.start) * 100)
  const keyDurCs = Math.round((keyWord.end - keyWord.start) * 100)
  const slamDur = Math.min(10, keyDurCs)   // 100ms slam-in
  const settleDur = Math.min(8, keyDurCs)  // 80ms settle

  const keyPart =
    `{\\fs${keySize}\\b1\\1c${supersizeASS}\\3c${outlineASS}` +
    `\\bord${Math.round(style.outline * 1.8)}` +
    `\\alpha&HFF&\\fscx140\\fscy140` +
    // Slam in: invisible → visible at 140% overshoot
    `\\t(${keyStartCs},${keyStartCs + slamDur},\\alpha&H00&)` +
    // Settle: 140% → 100% with deceleration
    `\\t(${keyStartCs + slamDur},${keyStartCs + slamDur + settleDur},0.4,\\fscx100\\fscy100)}` +
    `${keyWord.text.toUpperCase()}`

  const line =
    `Dialogue: 0,${start},${end},Default,,0,0,0,,` +
    `${contextParts.join(' ')}\\N${keyPart}`

  return [line]
}

/**
 * Captions.AI — the signature animation style.
 *
 * The contrast between word types is what defines this look:
 *   • Normal words: gentle fade-in (alpha ramp over ~150ms), stay at 100% scale.
 *   • Emphasis words: POP — snap to visible at 130% scale, fast settle to 100%.
 *     Uses the emphasisColor, bold weight, and a slight blur-to-sharp transition.
 *   • Supersize words: MASSIVE — appear instantly at 220% scale, settle to 200%
 *     and HOLD there. Standout color (supersizeColor), extra-bold, thick outline.
 *
 * The quiet gentleness of normal words makes the emphasis pops feel explosive.
 */
function buildCaptionsAILines(
  group: WordGroup,
  style: CaptionStyleInput,
  baseFontSize: number
): string[] {
  const primaryASS = hexToASS(style.primaryColor)
  const emphasisASS = hexToASS(style.emphasisColor ?? style.highlightColor)
  const supersizeASS = hexToASS(style.supersizeColor ?? '#FFD700')

  const start = formatASSTime(group.start)
  const end = formatASSTime(group.end)

  const parts = group.words.map((w, idx) => {
    const wordStartCs = Math.round((w.start - group.start) * 100)
    const wordDurCs = Math.round((w.end - w.start) * 100)
    const isLast = idx === group.words.length - 1
    const suffix = isLast ? '' : ' '
    const level = w.emphasis ?? 'normal'

    if (level === 'supersize') {
      // SUPERSIZE: massive, held at 200%+, standout color.
      // Snap to 220% then ease down to 200% and HOLD there.
      const bigSize = Math.round(baseFontSize * 2.0)
      const snapScale = 220
      const holdScale = 200
      const snapDur = Math.min(6, wordDurCs) // 60ms snap-in
      const settleDur = Math.min(10, wordDurCs) // 100ms settle

      return (
        `{\\fs${bigSize}\\b1\\1c${supersizeASS}\\bord${Math.round(style.outline * 1.5)}` +
        `\\alpha&HFF&\\fscx${snapScale}\\fscy${snapScale}` +
        // Snap to visible at overshoot scale
        `\\t(${wordStartCs},${wordStartCs + snapDur},\\alpha&H00&)` +
        // Settle from 220% → 200% with deceleration
        `\\t(${wordStartCs + snapDur},${wordStartCs + snapDur + settleDur},0.4,\\fscx${holdScale}\\fscy${holdScale})}` +
        `${w.text}{\\r}${suffix}`
      )
    }

    if (level === 'emphasis') {
      // EMPHASIS: pop — snap to visible at 130%, fast settle to 100%.
      const empSize = Math.round(baseFontSize * EMPHASIS_SCALE)
      const popScale = 130
      const snapDur = Math.min(4, wordDurCs) // 40ms instant snap
      const settleDur = Math.min(10, wordDurCs) // 100ms spring settle

      return (
        `{\\fs${empSize}\\1c${emphasisASS}\\b1` +
        `\\alpha&HFF&\\fscx${popScale}\\fscy${popScale}` +
        // Instant snap to visible
        `\\t(${wordStartCs},${wordStartCs + snapDur},\\alpha&H00&)` +
        // Spring settle: overshoot → 95% → 100%
        `\\t(${wordStartCs + snapDur},${wordStartCs + snapDur + Math.round(settleDur * 0.6)},\\fscx95\\fscy95)` +
        `\\t(${wordStartCs + snapDur + Math.round(settleDur * 0.6)},${wordStartCs + snapDur + settleDur},\\fscx100\\fscy100)}` +
        `${w.text}{\\r}${suffix}`
      )
    }

    // NORMAL: gentle fade-in. Quiet, unobtrusive.
    const fadeDur = Math.min(15, wordDurCs) // 150ms gentle fade

    return (
      `{\\1c${primaryASS}\\alpha&HFF&` +
      `\\t(${wordStartCs},${wordStartCs + fadeDur},\\alpha&H00&)}` +
      `${w.text}${suffix}`
    )
  })

  return [`Dialogue: 0,${start},${end},Default,,0,0,0,,${parts.join('')}`]
}

// ---------------------------------------------------------------------------
// ASS document generator
// ---------------------------------------------------------------------------

function buildASSDocument(
  words: WordInput[],
  style: CaptionStyleInput,
  frameWidth: number = DEFAULT_FRAME_WIDTH,
  frameHeight: number = DEFAULT_FRAME_HEIGHT,
  marginVOverride?: number
): string {
  const fontSize = Math.round(style.fontSize * frameHeight)
  const primaryASS = hexToASS(style.primaryColor)
  const outlineASS = hexToASS(style.outlineColor)
  const backASS = hexToASS(style.backColor)

  // Vertical alignment: bottom-center (AN2) with a comfortable margin
  const marginV = marginVOverride ?? Math.round(frameHeight * 0.12) // ~12% from bottom

  const header = [
    '[Script Info]',
    'ScriptType: v4.00+',
    `PlayResX: ${frameWidth}`,
    `PlayResY: ${frameHeight}`,
    'WrapStyle: 0',
    'ScaledBorderAndShadow: yes',
    '',
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    `Style: Default,${style.fontName},${fontSize},${primaryASS},${primaryASS},${outlineASS},${backASS},-1,0,0,0,100,100,0,0,${style.borderStyle},${style.outline},${style.shadow},2,40,40,${marginV},1`,
    // WordBox style: BorderStyle=3 for per-word opaque boxes; padding via Outline field
    ...(style.animation === 'word-box'
      ? [
          `Style: WordBox,${style.fontName},${fontSize},${primaryASS},${primaryASS},${outlineASS},&H00000000,-1,0,0,0,100,100,0,0,3,${Math.max(8, Math.round(fontSize * 0.18))},0,5,0,0,0,1`
        ]
      : []),
    '',
    '[Events]',
    'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text'
  ]

  const groups = groupWords(words, style.wordsPerLine)
  const dialogueLines: string[] = []

  for (const group of groups) {
    if (group.words.length === 0) continue

    switch (style.animation) {
      case 'captions-ai':
        dialogueLines.push(...buildCaptionsAILines(group, style, fontSize))
        break
      case 'karaoke-fill':
        dialogueLines.push(buildKaraokeLine(group, style, fontSize))
        break
      case 'word-pop':
        dialogueLines.push(...buildWordPopLines(group, style, fontSize))
        break
      case 'fade-in':
        dialogueLines.push(...buildFadeInLines(group, style, fontSize))
        break
      case 'glow':
        dialogueLines.push(...buildGlowLines(group, style, fontSize))
        break
      case 'word-box':
        dialogueLines.push(
          ...buildWordBoxLines(group, style, fontSize, frameWidth, frameHeight, marginV)
        )
        break
      case 'elastic-bounce':
        dialogueLines.push(...buildElasticBounceLines(group, style, fontSize))
        break
      case 'typewriter':
        dialogueLines.push(...buildTypewriterLines(group, style, fontSize))
        break
      case 'impact-two':
        dialogueLines.push(...buildImpactTwoLines(group, style, fontSize))
        break
    }
  }

  return [...header, ...dialogueLines, ''].join('\n')
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate an ASS subtitle file from word-level timestamps and a caption style.
 *
 * @param words       Word-level timestamps (relative to clip start, i.e. first word near 0)
 * @param style       Caption style configuration
 * @param outputPath  Where to write the .ass file. If omitted, writes to a temp file.
 * @param frameWidth  Canvas width in pixels (default: 1080). Must match the output video width.
 * @param frameHeight Canvas height in pixels (default: 1920). Must match the output video height.
 * @returns The absolute path to the written .ass file.
 */
export async function generateCaptions(
  words: WordInput[],
  style: CaptionStyleInput,
  outputPath?: string,
  frameWidth: number = DEFAULT_FRAME_WIDTH,
  frameHeight: number = DEFAULT_FRAME_HEIGHT,
  marginVOverride?: number
): Promise<string> {
  if (words.length === 0) {
    throw new Error('No words provided for caption generation')
  }

  const assContent = buildASSDocument(words, style, frameWidth, frameHeight, marginVOverride)

  const filePath =
    outputPath ?? join(tmpdir(), `batchcontent-captions-${Date.now()}.ass`)

  // Ensure parent directory exists
  await mkdir(dirname(filePath), { recursive: true })
  await writeFile(filePath, assContent, 'utf-8')

  return filePath
}
