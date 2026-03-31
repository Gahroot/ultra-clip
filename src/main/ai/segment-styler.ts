/**
 * AI Segment Styler
 *
 * Uses Gemini to analyze each segment's caption text and assign the best
 * visual layout category + variant. This creates the Captions.ai-style
 * variety where consecutive segments alternate between speaker shots,
 * image overlays, fullscreen text moments, etc.
 *
 * Distribution targets (based on analysis of 10 real Captions.ai videos):
 *   - main-video-images: ~36% of segments (~70% of time — longest segments)
 *   - main-video:        ~36% of segments (~15% of time — shorter segments)
 *   - fullscreen-image:  ~19% of segments (~15% of time — brief cutaways)
 *   - fullscreen-text:    ~9% of segments (~1% of time — quick punctuation)
 */

import { GoogleGenerativeAI, type GenerativeModel } from '@google/generative-ai'
import { emitUsageFromResponse } from '../ai-usage'
import { SEGMENT_STYLE_VARIANTS } from '../segment-styles'
import type { VideoSegment, EditStyle, SegmentStyleCategory } from '@shared/types'

// ---------------------------------------------------------------------------
// Gemini helpers (shared pattern across AI modules)
// ---------------------------------------------------------------------------

function classifyGeminiError(err: unknown): never {
  const msg = err instanceof Error ? err.message : String(err)
  const status = (err as { status?: number })?.status

  if (status === 401 || status === 403 || /api.key/i.test(msg)) {
    throw new Error('Invalid Gemini API key. Check your key in Settings.')
  }
  if (status === 429 || /resource.exhausted|rate.limit|quota/i.test(msg)) {
    throw new Error('Gemini API rate limit exceeded. Please wait and try again.')
  }
  if (/ENOTFOUND|ECONNREFUSED|ETIMEDOUT|fetch failed/i.test(msg)) {
    throw new Error('Network error: cannot reach Gemini API. Check your internet connection.')
  }
  throw err
}

async function callGeminiWithRetry(model: GenerativeModel, prompt: string, usageSource: string): Promise<string> {
  try {
    const result = await model.generateContent(prompt)
    emitUsageFromResponse(usageSource, 'gemini-2.5-flash-lite', result.response)
    return result.response.text().trim()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const status = (err as { status?: number })?.status
    const isTransient =
      status === 429 ||
      /resource.exhausted|rate.limit|quota/i.test(msg) ||
      /ENOTFOUND|ECONNREFUSED|ETIMEDOUT|fetch failed/i.test(msg)

    if (isTransient) {
      await new Promise((r) => setTimeout(r, 2000))
      try {
        const result = await model.generateContent(prompt)
        emitUsageFromResponse(usageSource, 'gemini-2.5-flash-lite', result.response)
        return result.response.text().trim()
      } catch (retryErr) {
        classifyGeminiError(retryErr)
      }
    }
    classifyGeminiError(err)
  }
}

// ---------------------------------------------------------------------------
// Prompt construction
// ---------------------------------------------------------------------------

/** Build the variant list block for the prompt, grouped by category. */
function buildVariantList(availableStyleIds: string[] | undefined): string {
  const variants = availableStyleIds
    ? SEGMENT_STYLE_VARIANTS.filter((v) => availableStyleIds.includes(v.id))
    : SEGMENT_STYLE_VARIANTS

  const byCategory = new Map<SegmentStyleCategory, typeof variants>()
  for (const v of variants) {
    const list = byCategory.get(v.category) ?? []
    list.push(v)
    byCategory.set(v.category, list)
  }

  const lines: string[] = []
  for (const [category, vars] of byCategory) {
    lines.push(`\n${category}:`)
    for (const v of vars) {
      lines.push(`  - "${v.id}" (${v.name}): ${v.description}`)
    }
  }
  return lines.join('\n')
}

function buildSegmentList(segments: VideoSegment[]): string {
  return segments
    .map((s, i) => `${i}. [${s.startTime.toFixed(1)}s–${s.endTime.toFixed(1)}s] "${s.captionText}"`)
    .join('\n')
}

function buildPrompt(segments: VideoSegment[], editStyle: EditStyle): string {
  const variantList = buildVariantList(editStyle.availableSegmentStyles)
  const segmentList = buildSegmentList(segments)

  return `You are a professional short-form video editor assigning visual styles to segments of a 9:16 vertical video.
Each segment has caption text and a time range. Assign each one a style category and a specific variant ID.

EDIT STYLE: "${editStyle.name}" (energy: ${editStyle.energy})

Available categories and variants:${variantList}

DISTRIBUTION GUIDELINES:
- Use main-video-images for 30-40% of segments (concepts, descriptions, things being explained)
- Use main-video for 30-40% of segments (speaker is the focus, personal stories, direct address)
- Use fullscreen-image for 10-20% of segments (visual emphasis, brief cutaways, topic transitions)
- Use fullscreen-text sparingly, max 1-2 per video (key quotes, shocking statements, important numbers)
- main-video-text for emphasis moments (key points, calls to action)

RULES:
- NEVER use the same category for 3+ consecutive segments — variety is key
- First segment: prefer main-video or main-video-text (hook the viewer with the speaker)
- Last segment: prefer main-video (call to action, personal close)
- Short segments (<3 seconds) work well as fullscreen-text or fullscreen-image
- Longer segments (>6 seconds) work better as main-video or main-video-images
- When the speaker describes a concept/thing/place, use main-video-images; prefer "main-video-images-topbottom" when the concept can be visualized (products, places, data, ideas) — it keeps the speaker visible while showing context below
- When the speaker makes a bold claim or quote, consider fullscreen-text
- When the speaker tells a personal story, use main-video (tight or normal)
- Energy level "${editStyle.energy}" means ${editStyle.energy === 'high' ? 'more variety, more fullscreen cuts, faster pacing' : editStyle.energy === 'low' ? 'more main-video, fewer cuts, calmer pacing' : 'balanced variety between speaker and visual cuts'}

Segments:
${segmentList}

Return a JSON array with one object per segment:
[{"index": 0, "category": "main-video", "variantId": "main-video-normal"}, ...]

The "index" must match the segment number. Every segment must be assigned exactly one category and variantId from the available variants listed above.`
}

// ---------------------------------------------------------------------------
// Response parsing
// ---------------------------------------------------------------------------

interface RawAssignment {
  index?: unknown
  category?: unknown
  variantId?: unknown
}

const VALID_CATEGORIES: Set<string> = new Set([
  'main-video',
  'main-video-text',
  'main-video-images',
  'fullscreen-image',
  'fullscreen-text'
])

function parseAssignments(
  text: string,
  segmentCount: number,
  availableStyleIds: string[] | undefined
): Array<{ index: number; category: SegmentStyleCategory; variantId: string }> {
  let raw: RawAssignment[]
  try {
    raw = JSON.parse(text) as RawAssignment[]
  } catch {
    // Try to extract JSON array from within the text
    const match = text.match(/\[[\s\S]*\]/)
    if (!match) {
      throw new Error('Gemini returned an unparseable response for segment style assignment')
    }
    raw = JSON.parse(match[0]) as RawAssignment[]
  }

  if (!Array.isArray(raw)) {
    throw new Error('Gemini did not return an array for segment style assignment')
  }

  const validVariantIds = new Set(
    availableStyleIds
      ? SEGMENT_STYLE_VARIANTS.filter((v) => availableStyleIds.includes(v.id)).map((v) => v.id)
      : SEGMENT_STYLE_VARIANTS.map((v) => v.id)
  )

  const result: Array<{ index: number; category: SegmentStyleCategory; variantId: string }> = []

  for (const item of raw) {
    const idx = typeof item.index === 'number' ? item.index : Number(item.index)
    if (isNaN(idx) || idx < 0 || idx >= segmentCount) continue

    const category = typeof item.category === 'string' ? item.category : ''
    if (!VALID_CATEGORIES.has(category)) continue

    const variantId = typeof item.variantId === 'string' ? item.variantId : ''
    if (!validVariantIds.has(variantId)) {
      // Fall back to the first variant in this category
      const fallback = SEGMENT_STYLE_VARIANTS.find(
        (v) => v.category === category && (!availableStyleIds || availableStyleIds.includes(v.id))
      )
      if (!fallback) continue
      result.push({ index: idx, category: category as SegmentStyleCategory, variantId: fallback.id })
    } else {
      result.push({ index: idx, category: category as SegmentStyleCategory, variantId })
    }
  }

  return result
}

// ---------------------------------------------------------------------------
// Fallback: deterministic assignment without AI
// ---------------------------------------------------------------------------

function assignFallbackStyles(
  segments: VideoSegment[],
  editStyle: EditStyle
): VideoSegment[] {
  const availableIds = editStyle.availableSegmentStyles
  const available = availableIds
    ? SEGMENT_STYLE_VARIANTS.filter((v) => availableIds.includes(v.id))
    : SEGMENT_STYLE_VARIANTS

  // Group by category for round-robin
  const mainVideoVariants = available.filter((v) => v.category === 'main-video')
  const mainVideoImagesVariants = available.filter((v) => v.category === 'main-video-images')
  const defaultVariant = mainVideoVariants[0] ?? available[0]

  return segments.map((seg, i) => {
    let variant = defaultVariant
    // Simple alternation: even = main-video, odd = main-video-images
    if (i % 2 === 0 && mainVideoVariants.length > 0) {
      variant = mainVideoVariants[i % mainVideoVariants.length]
    } else if (mainVideoImagesVariants.length > 0) {
      variant = mainVideoImagesVariants[i % mainVideoImagesVariants.length]
    }

    return {
      ...seg,
      segmentStyleCategory: variant.category,
      segmentStyleId: variant.id
    }
  })
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Use Gemini AI to assign a visual style category and variant to each segment
 * based on its caption content, the edit style energy level, and distribution
 * guidelines derived from real Captions.ai videos.
 *
 * Falls back to deterministic assignment if the AI call fails.
 */
export async function assignSegmentStyles(
  segments: VideoSegment[],
  editStyle: EditStyle,
  apiKey: string
): Promise<VideoSegment[]> {
  if (segments.length === 0) return segments

  // If no API key, use deterministic fallback
  if (!apiKey || !apiKey.trim()) {
    return assignFallbackStyles(segments, editStyle)
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash-lite',
    generationConfig: { responseMimeType: 'application/json' }
  })

  const prompt = buildPrompt(segments, editStyle)

  let assignments: Array<{ index: number; category: SegmentStyleCategory; variantId: string }>
  try {
    const text = await callGeminiWithRetry(model, prompt, 'segment-styler')
    assignments = parseAssignments(text, segments.length, editStyle.availableSegmentStyles)
  } catch {
    // Fall back to deterministic assignment on AI failure
    return assignFallbackStyles(segments, editStyle)
  }

  // Build a map of index → assignment for quick lookup
  const assignmentMap = new Map(assignments.map((a) => [a.index, a]))

  // Apply assignments, falling back to deterministic for any missing segments
  const fallback = assignFallbackStyles(segments, editStyle)

  return segments.map((seg, i) => {
    const assignment = assignmentMap.get(i)
    if (assignment) {
      return {
        ...seg,
        segmentStyleCategory: assignment.category,
        segmentStyleId: assignment.variantId
      }
    }
    // Use the fallback for this index
    return fallback[i]
  })
}
