import { GoogleGenerativeAI, type GenerativeModel } from '@google/generative-ai'
import type { TranscriptionResult } from '../transcription'
import { emitUsageFromResponse } from '../ai-usage'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CuriosityGap {
  /** Timestamp (seconds) where the gap opens — question asked, story begins, claim made */
  openTimestamp: number
  /** Timestamp (seconds) where the gap resolves — answer given, payoff lands */
  resolveTimestamp: number
  /** Structural type of the curiosity trigger */
  type: 'question' | 'story' | 'claim' | 'pivot' | 'tease'
  /** Engagement strength 1–10 */
  score: number
  /** Human-readable explanation of what makes this moment compelling */
  description: string
}

export interface ClipBoundary {
  /** Adjusted clip start in seconds */
  start: number
  /** Adjusted clip end in seconds */
  end: number
  /** Short explanation of why the boundaries were chosen */
  reason: string
}

export interface ClipCandidate {
  startTime: number
  endTime: number
  /** Original virality score 0–100 */
  score: number
  text?: string
  hookText?: string
  reasoning?: string
  /** Curiosity gap strength 1–10 injected by rankClipsByCuriosity */
  curiosityScore?: number
  /** Combined engagement rank score used for final ordering */
  combinedScore?: number
}

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

const CURIOSITY_GAP_SYSTEM_PROMPT = `You are an expert in viral content psychology and narrative structure. Your task is to analyze a video transcript and identify every "curiosity gap" moment — structural patterns that compel viewers to keep watching.

CURIOSITY GAP TYPES:
1. QUESTION: Speaker poses a direct or rhetorical question (e.g. "Have you ever wondered why…?", "What if I told you…?")
2. STORY: Speaker begins an anecdote or story with a clear setup that needs a payoff (e.g. "So this one time I was…", "Let me tell you about…")
3. CLAIM: Speaker makes a bold, surprising, or counterintuitive claim that begs explanation (e.g. "This is the biggest mistake people make", "Everything you know about X is wrong")
4. PIVOT: Speaker signals a dramatic shift using language like "but", "however", "here's the thing", "the truth is", "wait" — the pivot creates tension between before/after
5. TEASE: Speaker hints at something coming without immediately revealing it (e.g. "And then I discovered something that changed everything", "The answer surprised me")

FOR EACH GAP FOUND:
- open_timestamp: when the tension opens (MM:SS)
- resolve_timestamp: when the payoff lands — the answer, punchline, or resolution (MM:SS)
- type: question | story | claim | pivot | tease
- score: 1–10 (10 = irresistible, viewer cannot stop watching; 1 = weak)
- description: 1–2 sentences explaining exactly what makes this gap compelling for short-form content

SCORING CRITERIA:
- 9–10: Universal emotional hook — surprise, stakes, identity, or strong narrative tension
- 7–8: Clear gap with satisfying payoff, works well as a standalone clip
- 5–6: Moderate tension — functional but not exceptional
- 3–4: Weak gap — easy to skip
- 1–2: Barely noticeable — informational drift, not a real gap

IMPORTANT:
- open_timestamp must always be LESS THAN resolve_timestamp
- The gap should span at least 5 seconds
- Return ALL gaps scoring 5 or above — do not limit the count
- Use EXACT timestamps from the transcript

Return valid JSON:
{
  "gaps": [
    {
      "open_timestamp": "MM:SS",
      "resolve_timestamp": "MM:SS",
      "type": "question",
      "score": 8,
      "description": "Speaker asks why top creators succeed while hiding the actual answer for 30 seconds, creating genuine suspense."
    }
  ]
}`

// ---------------------------------------------------------------------------
// Helpers (shared with ai-scoring.ts pattern)
// ---------------------------------------------------------------------------

/**
 * Parse a timestamp string (MM:SS or HH:MM:SS) into seconds.
 * Returns NaN if the format is unrecognised.
 */
function parseTimestamp(ts: string): number {
  const parts = ts.trim().split(':').map(Number)
  if (parts.some(isNaN)) return NaN
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  return NaN
}

/**
 * Classify a Gemini API error and throw a user-friendly message.
 */
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

/**
 * Call Gemini with a single retry on transient errors (429, network).
 * Emits token usage via the ai-usage module after each successful call.
 */
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
// Raw response shapes
// ---------------------------------------------------------------------------

interface RawGap {
  open_timestamp?: unknown
  resolve_timestamp?: unknown
  type?: unknown
  score?: unknown
  description?: unknown
}

interface RawGapResponse {
  gaps?: unknown
}

// ---------------------------------------------------------------------------
// validateGaps
// ---------------------------------------------------------------------------

const VALID_TYPES = new Set<string>(['question', 'story', 'claim', 'pivot', 'tease'])

function validateGaps(raw: RawGap[], videoDuration: number): CuriosityGap[] {
  const result: CuriosityGap[] = []

  for (const gap of raw) {
    if (typeof gap.open_timestamp !== 'string' || typeof gap.resolve_timestamp !== 'string') {
      continue
    }

    const openTs = parseTimestamp(gap.open_timestamp)
    const resolveTs = parseTimestamp(gap.resolve_timestamp)

    if (isNaN(openTs) || isNaN(resolveTs)) continue
    if (openTs >= resolveTs) continue
    if (resolveTs - openTs < 5) continue
    if (openTs >= videoDuration) continue

    const score = typeof gap.score === 'number' ? gap.score : Number(gap.score)
    if (isNaN(score) || score < 5) continue

    const type = typeof gap.type === 'string' && VALID_TYPES.has(gap.type)
      ? (gap.type as CuriosityGap['type'])
      : null
    if (!type) continue

    result.push({
      openTimestamp: openTs,
      resolveTimestamp: Math.min(resolveTs, videoDuration),
      type,
      score: Math.min(10, Math.max(1, Math.round(score))),
      description: typeof gap.description === 'string' ? gap.description.trim() : ''
    })
  }

  // Sort by score descending
  result.sort((a, b) => b.score - a.score)
  return result
}

// ---------------------------------------------------------------------------
// detectCuriosityGaps
// ---------------------------------------------------------------------------

/**
 * Send the formatted transcript to Gemini and detect all curiosity gap moments.
 *
 * @param apiKey           Gemini API key
 * @param transcript       Full TranscriptionResult from the ASR pipeline
 * @param formattedTranscript  Pre-formatted string (output of formatTranscriptForAI)
 * @param videoDuration    Total video duration in seconds (used for clamping)
 */
export async function detectCuriosityGaps(
  apiKey: string,
  transcript: TranscriptionResult,
  formattedTranscript: string,
  videoDuration: number
): Promise<CuriosityGap[]> {
  // If the transcript is empty there's nothing to analyze
  if (!transcript.words || transcript.words.length === 0) {
    return []
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash-lite',
    generationConfig: { responseMimeType: 'application/json' }
  })

  const prompt = `${CURIOSITY_GAP_SYSTEM_PROMPT}

Analyze this video transcript and identify all curiosity gap moments.

Transcript:
${formattedTranscript}`

  const text = await callGeminiWithRetry(model, prompt, 'curiosity-gaps')

  let rawResponse: RawGapResponse
  try {
    rawResponse = JSON.parse(text) as RawGapResponse
  } catch {
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) {
      throw new Error('Gemini returned an unparseable curiosity gap response')
    }
    rawResponse = JSON.parse(match[0]) as RawGapResponse
  }

  const rawGaps = Array.isArray(rawResponse.gaps) ? (rawResponse.gaps as RawGap[]) : []
  return validateGaps(rawGaps, videoDuration)
}

// ---------------------------------------------------------------------------
// optimizeClipBoundaries
// ---------------------------------------------------------------------------

/**
 * Adjusts clip boundaries to begin 1–2 seconds before the curiosity gap opens
 * and end 1–2 seconds after the payoff resolves.
 *
 * The adjusted boundaries respect the word-level transcript for clean cuts:
 * - Start is pushed back to the nearest word boundary before openTimestamp - 1.5s
 * - End is pushed forward to the nearest word boundary after resolveTimestamp + 1.5s
 * - Result is always clamped within [originalStart, originalEnd]
 *
 * @param gap            The detected curiosity gap to frame around
 * @param originalStart  The original clip start time in seconds
 * @param originalEnd    The original clip end time in seconds
 * @param transcript     Full TranscriptionResult for word-level boundary snapping
 */
export function optimizeClipBoundaries(
  gap: CuriosityGap,
  originalStart: number,
  originalEnd: number,
  transcript: TranscriptionResult
): ClipBoundary {
  const PAD_OPEN = 1.5    // seconds before gap opens
  const PAD_RESOLVE = 1.5 // seconds after gap resolves

  const targetStart = gap.openTimestamp - PAD_OPEN
  const targetEnd = gap.resolveTimestamp + PAD_RESOLVE

  // Snap start backward to the nearest word boundary
  let snapStart = targetStart
  if (transcript.words.length > 0) {
    // Find the last word that starts at or before targetStart
    const wordsBeforeTarget = transcript.words.filter((w) => w.start <= targetStart)
    if (wordsBeforeTarget.length > 0) {
      snapStart = wordsBeforeTarget[wordsBeforeTarget.length - 1].start
    } else {
      // All words are after targetStart — use first word
      snapStart = transcript.words[0].start
    }
  }

  // Snap end forward to the nearest word boundary
  let snapEnd = targetEnd
  if (transcript.words.length > 0) {
    // Find the first word that ends at or after targetEnd
    const wordsAfterTarget = transcript.words.filter((w) => w.end >= targetEnd)
    if (wordsAfterTarget.length > 0) {
      snapEnd = wordsAfterTarget[0].end
    } else {
      // All words end before targetEnd — use last word
      snapEnd = transcript.words[transcript.words.length - 1].end
    }
  }

  // Clamp to original boundaries — never expand beyond the original clip window
  const clampedStart = Math.max(originalStart, snapStart)
  const clampedEnd = Math.min(originalEnd, snapEnd)

  // Safety: ensure start < end
  const finalStart = clampedStart < clampedEnd ? clampedStart : originalStart
  const finalEnd = clampedStart < clampedEnd ? clampedEnd : originalEnd

  const reason = buildOptimizationReason(gap, originalStart, originalEnd, finalStart, finalEnd)

  return { start: finalStart, end: finalEnd, reason }
}

function buildOptimizationReason(
  gap: CuriosityGap,
  originalStart: number,
  originalEnd: number,
  finalStart: number,
  finalEnd: number
): string {
  const typeLabels: Record<CuriosityGap['type'], string> = {
    question: 'question-answer arc',
    story: 'story setup-payoff arc',
    claim: 'claim-evidence arc',
    pivot: 'pivot moment',
    tease: 'tease-reveal arc'
  }

  const label = typeLabels[gap.type]
  const startAdjusted = Math.abs(finalStart - originalStart) > 0.5
  const endAdjusted = Math.abs(finalEnd - originalEnd) > 0.5

  const parts: string[] = [`Framed around ${label} (score ${gap.score}/10)`]
  if (startAdjusted) {
    parts.push(
      `start pulled ${finalStart < originalStart ? 'back' : 'forward'} to open before the ${gap.type}`
    )
  }
  if (endAdjusted) {
    parts.push(
      `end extended ${finalEnd > originalEnd ? 'out' : 'in'} to include the full payoff`
    )
  }
  if (!startAdjusted && !endAdjusted) {
    parts.push('original boundaries already capture the full arc')
  }

  return parts.join('; ')
}

// ---------------------------------------------------------------------------
// rankClipsByCuriosity
// ---------------------------------------------------------------------------

/**
 * Re-ranks an array of clip candidates by blending the original virality score
 * with any curiosity gap strength detected within the clip's time window.
 *
 * Ranking formula:
 *   combinedScore = viralityScore * 0.65 + curiosityContribution * 0.35
 *
 * curiosityContribution is the highest gap score (1–10, scaled to 0–100) among
 * all curiosity gaps whose open–resolve window overlaps with the clip.
 *
 * Clips with no overlapping gaps receive no curiosity bonus.
 *
 * @param clips  Array of ClipCandidate objects (mutated in place with new fields)
 * @param gaps   Array of CuriosityGap objects detected in the same transcript
 */
export function rankClipsByCuriosity(
  clips: ClipCandidate[],
  gaps: CuriosityGap[]
): ClipCandidate[] {
  const ranked = clips.map((clip) => {
    // Find all curiosity gaps that overlap with this clip's time range
    const overlappingGaps = gaps.filter(
      (gap) => gap.openTimestamp < clip.endTime && gap.resolveTimestamp > clip.startTime
    )

    const topGapScore =
      overlappingGaps.length > 0
        ? Math.max(...overlappingGaps.map((g) => g.score))
        : 0

    // Scale gap score (1–10) to 0–100 for consistent blending with virality score
    const curiosityContribution = topGapScore * 10

    const combinedScore =
      overlappingGaps.length > 0
        ? Math.round(clip.score * 0.65 + curiosityContribution * 0.35)
        : clip.score

    return {
      ...clip,
      curiosityScore: topGapScore > 0 ? topGapScore : undefined,
      combinedScore
    }
  })

  // Sort by combinedScore descending, break ties by original score
  ranked.sort((a, b) => {
    const diff = (b.combinedScore ?? b.score) - (a.combinedScore ?? a.score)
    return diff !== 0 ? diff : b.score - a.score
  })

  return ranked
}
