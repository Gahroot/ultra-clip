import { writeFile, mkdir } from 'fs/promises'
import { join, dirname } from 'path'
import { tmpdir } from 'os'

// ---------------------------------------------------------------------------
// Types (mirrors renderer CaptionStyle / WordTimestamp)
// ---------------------------------------------------------------------------

export type CaptionAnimation = 'karaoke-fill' | 'word-pop' | 'fade-in' | 'glow'

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
}

export interface WordInput {
  text: string
  start: number // seconds (relative to clip start)
  end: number // seconds (relative to clip start)
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
 * to highlightColor.
 */
function buildKaraokeLine(
  group: WordGroup,
  style: CaptionStyleInput
): string {
  const start = formatASSTime(group.start)
  const end = formatASSTime(group.end)

  const highlightASS = hexToASS(style.highlightColor)

  // \kf duration is in centiseconds
  const parts = group.words.map((w) => {
    const dur = Math.round((w.end - w.start) * 100)
    return `{\\kf${dur}}${w.text}`
  })

  // \1c sets the "post-karaoke" color (highlight), \k fills from primary→highlight
  return `Dialogue: 0,${start},${end},Default,,0,0,0,,{\\1c${highlightASS}}${parts.join(' ')}`
}

/**
 * Word pop: each word appears at its timestamp with a brief scale-up effect.
 * We emit one dialogue event per word-group, using override blocks that
 * make words invisible until their start time, then pop in.
 */
function buildWordPopLines(
  group: WordGroup,
  style: CaptionStyleInput
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

    // Use \t for timed transform: word starts transparent, scales up, then settles
    // \alpha&HFF& = fully transparent, \alpha&H00& = fully visible
    const popDuration = Math.min(8, wordDur) // 80ms pop-in
    const suffix = isLast ? '' : ' '

    return (
      `{\\alpha&HFF&\\t(${wordStart},${wordStart + popDuration},\\alpha&H00&\\fscx110\\fscy110)` +
      `\\t(${wordStart + popDuration},${wordStart + popDuration + 5},\\fscx100\\fscy100)` +
      `\\t(${wordStart},${wordStart + wordDur},\\1c${highlightASS})` +
      `\\t(${wordStart + wordDur},${wordStart + wordDur},\\1c${primaryASS})}` +
      `${w.text}${suffix}`
    )
  })

  lines.push(`Dialogue: 0,${start},${end},Default,,0,0,0,,${parts.join('')}`)
  return lines
}

/**
 * Fade-in: each word fades in sequentially at its timestamp.
 */
function buildFadeInLines(
  group: WordGroup,
  _style: CaptionStyleInput
): string[] {
  const start = formatASSTime(group.start)
  const end = formatASSTime(group.end)

  const parts = group.words.map((w, idx) => {
    const wordStart = Math.round((w.start - group.start) * 100)
    const fadeDur = Math.min(15, Math.round((w.end - w.start) * 100))
    const isLast = idx === group.words.length - 1
    const suffix = isLast ? '' : ' '

    return (
      `{\\alpha&HFF&\\t(${wordStart},${wordStart + fadeDur},\\alpha&H00&)}` +
      `${w.text}${suffix}`
    )
  })

  return [`Dialogue: 0,${start},${end},Default,,0,0,0,,${parts.join('')}`]
}

/**
 * Glow: each word gets a colored glow (border) when it's the active word.
 */
function buildGlowLines(
  group: WordGroup,
  style: CaptionStyleInput
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

    // Switch outline/border color to highlight during the word's active time
    return (
      `{\\3c${outlineASS}` +
      `\\t(${wordStart},${wordStart},\\3c${highlightASS}\\bord${style.outline + 2})` +
      `\\t(${wordEnd},${wordEnd},\\3c${outlineASS}\\bord${style.outline})}` +
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
    '',
    '[Events]',
    'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text'
  ]

  const groups = groupWords(words, style.wordsPerLine)
  const dialogueLines: string[] = []

  for (const group of groups) {
    if (group.words.length === 0) continue

    switch (style.animation) {
      case 'karaoke-fill':
        dialogueLines.push(buildKaraokeLine(group, style))
        break
      case 'word-pop':
        dialogueLines.push(...buildWordPopLines(group, style))
        break
      case 'fade-in':
        dialogueLines.push(...buildFadeInLines(group, style))
        break
      case 'glow':
        dialogueLines.push(...buildGlowLines(group, style))
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
