/**
 * AI-Powered B-Roll Placement
 *
 * Instead of placing B-Roll on a fixed interval timer, this module sends the
 * full transcript to Gemini and asks it to identify natural "illustration points"
 * — moments where showing something visual would enhance the story.
 *
 * The AI also decides the display mode for each placement:
 * - fullscreen  → dramatic reveals, big visual moments
 * - split-top   → most illustrations (60-70% of placements)
 * - pip          → brief references, minor visual callouts
 *
 * Constraints enforced:
 * - Hook protection: no B-Roll in the first 3 seconds
 * - Minimum gap of 3 seconds between placements
 * - Clip duration within [1.5, 6] seconds
 * - Placements must end before the clip ends
 */

import { GoogleGenerativeAI, type GenerativeModel } from '@google/generative-ai'
import { emitUsageFromResponse } from './ai-usage'
import type { WordTimestamp } from '@shared/types'
import type { BRollDisplayMode, BRollTransition, BRollSettings } from './broll-placement'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AIBRollMoment {
  /** Seconds (0-based relative to clip start) when this B-Roll should appear */
  startTime: number
  /** Suggested duration in seconds */
  duration: number
  /** Visual keyword to search for on Pexels */
  keyword: string
  /** Why this moment needs B-Roll (for debugging / logging) */
  reason: string
  /** AI-chosen display mode */
  displayMode: BRollDisplayMode
}

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

const AI_PLACEMENT_PROMPT = `You are an expert short-form video editor. Your job is to analyze a transcript and identify the PERFECT moments to insert B-Roll (stock footage overlays) to maximize viewer retention and visual storytelling.

RULES:
1. **Hook protection**: NEVER place B-Roll in the first 3 seconds — the speaker's face must be visible for the hook
2. **Natural illustration points**: Place B-Roll at moments where showing something visual would ENHANCE the story — don't just space them evenly
3. **Optimal moments include**:
   - When the speaker mentions a concrete object, place, or action ("I was sitting at my desk" → show desk/office)
   - During lists or examples ("first thing you need is..." → show the thing)
   - Scene transitions or topic shifts (visual break helps the viewer reset)
   - Moments of emphasis where the visual adds weight to the statement
4. **Avoid placing B-Roll during**:
   - Emotional moments where the speaker's face conveys important emotion
   - Punchlines or key reveals (the face reaction matters)
   - Rapid-fire dialogue where visual context from the speaker matters
5. **Spacing**: Leave at least 3 seconds between B-Roll segments. Don't cluster them together
6. **Display mode selection**:
   - \`split-top\` (60-70% of placements): Default for most illustrations. B-Roll in top 65%, speaker stays visible in bottom 35%
   - \`fullscreen\` (15-25%): For dramatic reveals, establishing shots, or when the visual is the main focus
   - \`pip\` (5-15%): For brief visual references where the speaker's reaction matters more than the B-Roll
7. **Keywords**: Each keyword must be 1-3 words, concrete and visually searchable on a stock footage site (e.g. "laptop typing", "city skyline", "running outdoors"). Avoid abstract concepts
8. **Duration**: Each B-Roll should be 2-4 seconds. Use shorter durations (2s) for quick references and longer (3-4s) for establishing shots

Return a JSON array of objects. Each object:
- "startTime": number (seconds, 0-based relative to clip start)
- "duration": number (seconds, 2-4)
- "keyword": string (1-3 words, concrete visual noun/action)
- "reason": string (brief explanation, 5-10 words)
- "displayMode": "split-top" | "fullscreen" | "pip"

Order by startTime ascending. Return 2-6 placements depending on clip length (roughly one per 5-8 seconds of content, but only where it makes sense).

Respond ONLY with a JSON array, no markdown, no explanation.

Example:
[{"startTime":3.5,"duration":3,"keyword":"laptop typing","reason":"speaker mentions working on computer","displayMode":"split-top"},{"startTime":9.2,"duration":2.5,"keyword":"city skyline","reason":"topic shifts to urban life","displayMode":"fullscreen"},{"startTime":15.0,"duration":2,"keyword":"coffee cup","reason":"brief mention of morning routine","displayMode":"pip"}]`

// ---------------------------------------------------------------------------
// Gemini helpers (following project patterns from ai-scoring.ts)
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

async function callGeminiWithRetry(
  model: GenerativeModel,
  prompt: string,
  usageSource: string
): Promise<string> {
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
// Validation & post-processing
// ---------------------------------------------------------------------------

const HOOK_PROTECTION_SECONDS = 3
const MIN_GAP_BETWEEN_BROLL = 3
const MIN_BROLL_DURATION = 1.5
const MAX_BROLL_DURATION = 6

interface RawAIPlacement {
  startTime?: unknown
  duration?: unknown
  keyword?: unknown
  reason?: unknown
  displayMode?: unknown
}

function validateAIPlacements(
  raw: RawAIPlacement[],
  clipDuration: number
): AIBRollMoment[] {
  const validModes = new Set<BRollDisplayMode>(['fullscreen', 'split-top', 'split-bottom', 'pip'])

  const parsed: AIBRollMoment[] = []

  for (const item of raw) {
    if (typeof item.startTime !== 'number' || typeof item.duration !== 'number') continue
    if (typeof item.keyword !== 'string' || !item.keyword.trim()) continue

    const startTime = Math.max(0, item.startTime)
    const duration = Math.max(MIN_BROLL_DURATION, Math.min(MAX_BROLL_DURATION, item.duration))

    // Enforce hook protection
    if (startTime < HOOK_PROTECTION_SECONDS) continue

    // Must end before clip ends (0.5s margin)
    if (startTime + duration > clipDuration - 0.5) continue

    const displayMode = (typeof item.displayMode === 'string' && validModes.has(item.displayMode as BRollDisplayMode))
      ? (item.displayMode as BRollDisplayMode)
      : 'split-top'

    const reason = typeof item.reason === 'string' ? item.reason : ''

    parsed.push({
      startTime,
      duration,
      keyword: item.keyword.trim().toLowerCase(),
      reason,
      displayMode
    })
  }

  // Sort by startTime
  parsed.sort((a, b) => a.startTime - b.startTime)

  // Enforce minimum gap between placements (remove overlapping/too-close ones)
  const filtered: AIBRollMoment[] = []
  let lastEnd = 0

  for (const p of parsed) {
    if (p.startTime < lastEnd + MIN_GAP_BETWEEN_BROLL) continue
    filtered.push(p)
    lastEnd = p.startTime + p.duration
  }

  return filtered
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Use Gemini AI to identify the best moments for B-Roll placement in a clip.
 *
 * @param transcriptText  Full text of the clip segment
 * @param wordTimestamps  Word-level timestamps (relative to source video)
 * @param clipStart       Clip start time in source video (seconds)
 * @param clipEnd         Clip end time in source video (seconds)
 * @param geminiApiKey    Gemini API key
 * @returns Array of AI-identified B-Roll moments with timing, keywords, and display modes
 */
export async function identifyBRollMoments(
  transcriptText: string,
  wordTimestamps: WordTimestamp[],
  clipStart: number,
  clipEnd: number,
  geminiApiKey: string
): Promise<AIBRollMoment[]> {
  const clipDuration = clipEnd - clipStart

  // Filter word timestamps to clip range, make 0-based
  const clipWords = wordTimestamps
    .filter((w) => w.start >= clipStart && w.end <= clipEnd)
    .map((w) => ({
      text: w.text,
      start: w.start - clipStart,
      end: w.end - clipStart
    }))

  if (clipWords.length === 0) return []

  // Build timestamped transcript for Gemini
  const timestampedText = clipWords
    .map((w) => `[${w.start.toFixed(1)}] ${w.text}`)
    .join(' ')

  const genAI = new GoogleGenerativeAI(geminiApiKey)
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash-lite',
    generationConfig: { responseMimeType: 'application/json' }
  })

  const prompt = `${AI_PLACEMENT_PROMPT}\n\nClip duration: ${clipDuration.toFixed(1)} seconds\n\nTranscript with timestamps:\n${timestampedText}\n\nFull text: ${transcriptText}`

  const text = await callGeminiWithRetry(model, prompt, 'broll-placement')

  let rawResponse: unknown
  try {
    rawResponse = JSON.parse(text)
  } catch {
    // Try to extract JSON array from surrounding text
    const match = text.match(/\[[\s\S]*\]/)
    if (!match) throw new Error('Gemini returned an unparseable response for B-Roll placement')
    rawResponse = JSON.parse(match[0])
  }

  if (!Array.isArray(rawResponse)) {
    throw new Error('Gemini returned a non-array response for B-Roll placement')
  }

  return validateAIPlacements(rawResponse as RawAIPlacement[], clipDuration)
}

/**
 * Convert AI-identified moments into BRollPlacement-compatible objects,
 * extracting just the keywords for Pexels fetching.
 *
 * This bridges the AI placement module with the existing Pexels download
 * and placement pipeline.
 */
export function getKeywordsFromMoments(moments: AIBRollMoment[]): string[] {
  return [...new Set(moments.map((m) => m.keyword))]
}
