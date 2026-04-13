import { callGeminiWithRetry, type GeminiCall } from './gemini-client'
import { GoogleGenAI } from '@google/genai'
import { randomUUID } from 'crypto'
import type { TranscriptionResult } from '../transcription'
import type { ClipCandidate } from './curiosity-gap'
import { escapeDrawtext } from '../hook-title'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StoryArc {
  /** Unique identifier for this arc */
  id: string
  /** Short series title (5–8 words) */
  title: string
  /** Ordered array of clips that form this narrative arc */
  clips: ClipCandidate[]
  /** 1–2 sentence explanation of why these clips form a story arc */
  narrativeDescription: string
}

export interface PartInfo {
  /** 1-based position in the series */
  partNumber: number
  /** Total number of parts in this series */
  totalParts: number
  /** Title for this part (derived from clip hookText or generated) */
  title: string
  /** Text for the end card overlay on this part ("Part 2 drops tomorrow", etc.) */
  endCardText: string
}

export interface SeriesMetadata {
  /** Overall series title (same as StoryArc.title) */
  seriesTitle: string
  /** One PartInfo per clip in the arc, ordered chronologically */
  parts: PartInfo[]
}

export interface PartNumberConfig {
  /** Corner to place the badge (default 'top-left') */
  position: 'top-left' | 'top-right'
  /** Font size in pixels on the 1080×1920 canvas (default 48) */
  fontSize: number
  /** Text color in CSS hex format (default '#FFFFFF') */
  textColor: string
  /** Background pill color in CSS hex format (default '#000000') */
  bgColor: string
  /** Background pill opacity 0–1 (default 0.65) */
  bgOpacity: number
  /** Padding around badge text in pixels (default 16) */
  padding: number
  /** Optional absolute path to a TTF/OTF font file for drawtext */
  fontFilePath?: string
}

export interface EndCardConfig {
  /** Background overlay color in CSS hex format (default '#000000') */
  bgColor: string
  /** Background overlay opacity 0–1 (default 0.75) */
  bgOpacity: number
  /** Font size for the main teaser text in pixels (default 64) */
  fontSize: number
  /** Text color in CSS hex format (default '#FFFFFF') */
  textColor: string
  /** Duration of the end card text fade-in in seconds (default 0.4) */
  fadeDuration: number
  /** Vertical position of the text block on the canvas */
  position: 'center' | 'bottom-third'
  /** Optional absolute path to a TTF/OTF font file for drawtext */
  fontFilePath?: string
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Convert a CSS hex color to an FFmpeg color expression with alpha. */
function hexToFFmpegColor(hex: string, alpha: number = 1.0): string {
  const h = hex.replace('#', '')
  let r: number, g: number, b: number

  if (h.length === 6) {
    r = parseInt(h.slice(0, 2), 16)
    g = parseInt(h.slice(2, 4), 16)
    b = parseInt(h.slice(4, 6), 16)
  } else {
    return `white@${alpha.toFixed(2)}`
  }

  const toHex = (n: number) => n.toString(16).padStart(2, '0')
  return `0x${toHex(r)}${toHex(g)}${toHex(b)}@${alpha.toFixed(2)}`
}

/** Format seconds to MM:SS for transcript display. */
function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = Math.floor(seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

/**
 * Build the fontfile/font spec fragment for a drawtext filter.
 * When fontFilePath is supplied the result references that file;
 * otherwise it falls back to fontconfig names.
 */
function fontSpec(fontSize: number, fontFilePath?: string, bold = true): string {
  if (fontFilePath) {
    const safePath = fontFilePath
      .replace(/\\/g, '/')
      .replace(/:/g, '\\:')
      .replace(/'/g, "\\'")
    return `fontfile='${safePath}':fontsize=${fontSize}`
  }
  return `font='Sans${bold ? ' Bold' : ''}':fontsize=${fontSize}`
}


// ---------------------------------------------------------------------------
// AI system prompt
// ---------------------------------------------------------------------------

const STORY_ARC_SYSTEM_PROMPT = `You are an expert in long-form video content strategy and narrative structure. Analyze a video transcript and a list of pre-identified clip candidates, then group clips that together form a coherent MULTI-PART story arc.

WHAT QUALIFIES AS A STORY ARC?
A story arc spans multiple clips and is MORE compelling as a series than any individual clip alone:
- Multi-step process (setup → execution → result)
- Chronological journey (beginning → conflict → resolution)
- Structured argument (claim → evidence → counterpoint → conclusion)
- Transformation narrative told across sequential moments
- Complex topic broken into digestible sequential parts

REQUIREMENTS:
1. An arc MUST contain exactly 2–5 clips
2. Clips in an arc must be ordered chronologically by timestamp
3. Each clip may belong to only ONE arc
4. Only create arcs where a series structure genuinely adds value — the viewer should feel compelled to watch all parts
5. If no meaningful arcs exist, return an empty array

OUTPUT: Return valid JSON only — no markdown, no explanation:
{
  "arcs": [
    {
      "title": "Short compelling series title (5-8 words)",
      "narrativeDescription": "1-2 sentences on why these clips form a cohesive story and why viewers should watch all parts",
      "clipIndices": [0, 2, 4]
    }
  ]
}`

// ---------------------------------------------------------------------------
// Raw types for Gemini response parsing
// ---------------------------------------------------------------------------

interface RawArc {
  title?: unknown
  narrativeDescription?: unknown
  clipIndices?: unknown
}

interface RawArcResponse {
  arcs?: unknown
}

// ---------------------------------------------------------------------------
// detectStoryArcs
// ---------------------------------------------------------------------------

/**
 * Uses Gemini AI to analyze a full transcript and a set of clip candidates,
 * then identifies multi-clip narrative arcs where related clips form a series.
 *
 * @param apiKey   Gemini API key
 * @param transcript  Full transcription result (text + word timestamps)
 * @param clips    Pre-scored clip candidates to group into arcs
 * @returns Ordered list of story arcs, each containing 2–5 related clips
 */
export async function detectStoryArcs(
  apiKey: string,
  transcript: TranscriptionResult,
  clips: ClipCandidate[]
): Promise<StoryArc[]> {
  if (clips.length < 2) return []

  const ai = new GoogleGenAI({ apiKey })
  const call: GeminiCall = {
    model: 'gemini-2.5-flash-lite',
    config: { responseMimeType: 'application/json' }
  }

  // Format clips as a numbered list with timestamp + score + text preview
  const clipsFormatted = clips
    .map((clip, i) => {
      const start = formatTimestamp(clip.startTime)
      const end = formatTimestamp(clip.endTime)
      const text = clip.text?.slice(0, 180) ?? '(no text)'
      return `[${i}] ${start}–${end} score:${clip.score} "${text}"`
    })
    .join('\n')

  // Keep transcript summary manageable — first 2 500 chars
  const transcriptSummary = transcript.text.slice(0, 2500)

  const prompt = `${STORY_ARC_SYSTEM_PROMPT}

FULL TRANSCRIPT (excerpt):
${transcriptSummary}

CLIP CANDIDATES (${clips.length} clips, 0-indexed):
${clipsFormatted}

Identify multi-clip story arcs from the clips above. Return JSON only.`

  const text = await callGeminiWithRetry(ai, call, prompt, 'story-arcs')

  let rawResponse: RawArcResponse
  try {
    rawResponse = JSON.parse(text) as RawArcResponse
  } catch {
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return []
    try {
      rawResponse = JSON.parse(match[0]) as RawArcResponse
    } catch {
      return []
    }
  }

  const rawArcs = Array.isArray(rawResponse.arcs) ? (rawResponse.arcs as RawArc[]) : []
  const result: StoryArc[] = []
  const usedIndices = new Set<number>()

  for (const rawArc of rawArcs) {
    if (typeof rawArc.title !== 'string' || !rawArc.title.trim()) continue
    if (!Array.isArray(rawArc.clipIndices)) continue

    const indices = (rawArc.clipIndices as unknown[])
      .map(Number)
      .filter((i) => !isNaN(i) && Number.isInteger(i) && i >= 0 && i < clips.length)
      .filter((i) => !usedIndices.has(i))

    // Enforce 2–5 clip constraint
    if (indices.length < 2 || indices.length > 5) continue

    for (const i of indices) usedIndices.add(i)

    // Sort chronologically by startTime
    const arcClips = indices
      .map((i) => clips[i])
      .sort((a, b) => a.startTime - b.startTime)

    result.push({
      id: randomUUID(),
      title: rawArc.title.trim(),
      clips: arcClips,
      narrativeDescription:
        typeof rawArc.narrativeDescription === 'string'
          ? rawArc.narrativeDescription.trim()
          : ''
    })
  }

  return result
}

// ---------------------------------------------------------------------------
// generateSeriesMetadata
// ---------------------------------------------------------------------------

/** End-card phrase variants for non-final parts. */
const NEXT_PART_PHRASES = [
  'drops tomorrow',
  'coming tomorrow',
  'coming soon',
  'drops next'
]

/**
 * Derive series metadata (part numbers, titles, end-card text) from a StoryArc.
 * This is pure computation — no AI call required.
 *
 * @param arc  A StoryArc produced by `detectStoryArcs`
 * @returns    SeriesMetadata with one PartInfo per clip in the arc
 */
export function generateSeriesMetadata(arc: StoryArc): SeriesMetadata {
  const totalParts = arc.clips.length

  const parts: PartInfo[] = arc.clips.map((clip, index) => {
    const partNumber = index + 1
    const isLast = partNumber === totalParts

    // Use the clip's hookText as the part title, fall back to "Part N of M"
    const title = clip.hookText?.trim() || `Part ${partNumber} of ${totalParts}`

    // Cycle through phrase variants to avoid repetition in long series
    const phrase = NEXT_PART_PHRASES[index % NEXT_PART_PHRASES.length]
    const endCardText = isLast
      ? 'Follow for more content like this'
      : `Part ${partNumber + 1} ${phrase}`

    return { partNumber, totalParts, title, endCardText }
  })

  return { seriesTitle: arc.title, parts }
}

// ---------------------------------------------------------------------------
// buildPartNumberFilter
// ---------------------------------------------------------------------------

/**
 * Build an FFmpeg drawtext (+ drawbox background) filter for a "Part N/M"
 * badge rendered in the corner of the video.
 *
 * The badge consists of:
 *   1. A semi-transparent rounded rectangle (drawbox)
 *   2. "Part N/M" text in bold (drawtext)
 *   3. The series title in smaller text just below the badge (drawtext)
 *
 * The returned string is a comma-separated FFmpeg filter chain that can be
 * appended to the `-vf` argument alongside crop, scale, and caption filters.
 *
 * @param partNumber   1-based part number
 * @param totalParts   Total number of parts in the series
 * @param seriesTitle  Series title to show beneath the badge (truncated to 40 chars)
 * @param config       Visual configuration
 */
export function buildPartNumberFilter(
  partNumber: number,
  totalParts: number,
  seriesTitle: string,
  config: Partial<PartNumberConfig> = {}
): string {
  const {
    position = 'top-left',
    fontSize = 48,
    textColor = '#FFFFFF',
    bgColor = '#000000',
    bgOpacity = 0.65,
    padding = 16,
    fontFilePath
  } = config

  const badgeText = `Part ${partNumber}/${totalParts}`
  const safeBadge = escapeDrawtext(badgeText)

  // Estimate badge pill width: ~0.55 × fontSize per character + 2 × padding
  const estimatedBadgeW = Math.max(180, Math.round(badgeText.length * fontSize * 0.55) + padding * 2 + 20)
  const badgeH = fontSize + padding * 2

  // 32px margin from edges; 120px from top to clear platform status/camera UI
  const marginX = 32
  const marginY = 120

  const boxX = position === 'top-right' ? `iw-${estimatedBadgeW + marginX}` : String(marginX)
  const textX = position === 'top-right' ? `iw-${estimatedBadgeW + marginX - padding}` : String(marginX + padding)
  const boxY = marginY
  const textY = marginY + padding

  const bgFFmpegColor = hexToFFmpegColor(bgColor, bgOpacity)
  const fgFFmpegColor = hexToFFmpegColor(textColor, 1.0)

  // Background pill
  const drawbox =
    `drawbox=x=${boxX}:y=${boxY}:w=${estimatedBadgeW}:h=${badgeH}` +
    `:color=${bgFFmpegColor}:t=fill`

  // Badge text
  const drawBadge =
    `drawtext=${fontSpec(fontSize, fontFilePath, true)}` +
    `:text='${safeBadge}'` +
    `:fontcolor=${fgFFmpegColor}` +
    `:x=${textX}:y=${textY}` +
    `:borderw=1:bordercolor=black@0.80`

  // Series title in smaller text below the badge
  const titleFontSize = Math.round(fontSize * 0.60)
  const titleY = boxY + badgeH + 8
  const titleX = position === 'top-right' ? `iw-text_w-${marginX}` : String(marginX + padding)
  const safeSeries = escapeDrawtext(seriesTitle.slice(0, 40))
  const drawTitle =
    `drawtext=${fontSpec(titleFontSize, fontFilePath, false)}` +
    `:text='${safeSeries}'` +
    `:fontcolor=${hexToFFmpegColor(textColor, 0.85)}` +
    `:x=${titleX}:y=${titleY}` +
    `:borderw=1:bordercolor=black@0.70`

  return `${drawbox},${drawBadge},${drawTitle}`
}

// ---------------------------------------------------------------------------
// buildEndCardFilter
// ---------------------------------------------------------------------------

/**
 * Build an FFmpeg filter chain for a 2.5-second end card that appears at the
 * tail of the clip. The end card contains:
 *   1. A semi-transparent dark overlay over the full frame (drawbox)
 *   2. Main teaser text ("Part 2 drops tomorrow") with fade-in (drawtext)
 *   3. Follow CTA sub-text with fade-in (drawtext)
 *
 * The overlay appears suddenly at `clipDuration - 2.5s`; only the text fades in.
 * This matches the visual rhythm of end cards on TikTok/Reels/Shorts.
 *
 * @param nextPartTeaser  The text to display, e.g. "Part 2 drops tomorrow"
 * @param clipDuration    Total duration of the clip in seconds
 * @param config          Visual configuration
 */
export function buildEndCardFilter(
  nextPartTeaser: string,
  clipDuration: number,
  config: Partial<EndCardConfig> = {}
): string {
  const {
    bgColor = '#000000',
    bgOpacity = 0.75,
    fontSize = 64,
    textColor = '#FFFFFF',
    fadeDuration = 0.4,
    position = 'center',
    fontFilePath
  } = config

  // End card occupies the last 2.5 seconds of the clip
  const endCardDuration = 2.5
  const startT = Math.max(0, clipDuration - endCardDuration)

  const enableExpr = `gte(t,${startT.toFixed(3)})`

  // Text alpha: fade in from 0 → 1 over fadeDuration starting at startT
  // Uses infix operators to avoid commas in filter expressions (Windows compat).
  const fadeEndT = (startT + fadeDuration).toFixed(3)
  const stStr = startT.toFixed(3)
  const fdStr = fadeDuration.toFixed(3)
  const alphaExpr =
    `(t<${stStr})*0` +
    `+(t>=${stStr})*(t<${fadeEndT})*(t-${stStr})/${fdStr}` +
    `+(t>=${fadeEndT})*1`

  const bgFFmpegColor = hexToFFmpegColor(bgColor, bgOpacity)
  const fgFFmpegColor = hexToFFmpegColor(textColor, 1.0)

  // Full-frame dark overlay — appears instantly at startT (no fade on the box)
  const overlayBox =
    `drawbox=x=0:y=0:w=iw:h=ih` +
    `:color=${bgFFmpegColor}:t=fill` +
    `:enable='${enableExpr}'`

  // Main teaser text y-position
  const textY = position === 'center' ? '(ih-text_h)/2-40' : 'ih*2/3'

  const safeTeaser = escapeDrawtext(nextPartTeaser)
  const teaserText =
    `drawtext=${fontSpec(fontSize, fontFilePath, true)}` +
    `:text='${safeTeaser}'` +
    `:fontcolor=${fgFFmpegColor}` +
    `:x=(w-text_w)/2` +
    `:y=${textY}` +
    `:borderw=3:bordercolor=black@0.80` +
    `:alpha='${alphaExpr}'` +
    `:enable='${enableExpr}'`

  // Follow CTA in smaller text below the teaser
  const ctaFontSize = Math.round(fontSize * 0.55)
  const ctaY = position === 'center' ? '(ih-text_h)/2+60' : 'ih*2/3+80'
  const safeCta = escapeDrawtext("Follow so you don't miss it")
  const ctaText =
    `drawtext=${fontSpec(ctaFontSize, fontFilePath, false)}` +
    `:text='${safeCta}'` +
    `:fontcolor=${hexToFFmpegColor(textColor, 0.80)}` +
    `:x=(w-text_w)/2` +
    `:y=${ctaY}` +
    `:borderw=2:bordercolor=black@0.70` +
    `:alpha='${alphaExpr}'` +
    `:enable='${enableExpr}'`

  return `${overlayBox},${teaserText},${ctaText}`
}
