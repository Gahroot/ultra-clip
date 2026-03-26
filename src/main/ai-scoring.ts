import { GoogleGenerativeAI, type GenerativeModel } from '@google/generative-ai'
import { emitUsageFromResponse } from './ai-usage'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TargetDuration = 'auto' | '15-30' | '30-60' | '60-90' | '90-120'

export interface ScoredSegment {
  startTime: number  // seconds
  endTime: number    // seconds
  text: string       // transcript text for this segment
  score: number      // 0-100 viral potential score
  hookText: string   // suggested hook/title text for the clip
  reasoning: string  // why this segment is viral-worthy
}

export interface ScoringResult {
  segments: ScoredSegment[]
  summary: string
  keyTopics: string[]
}

export interface ScoringProgress {
  stage: 'sending' | 'analyzing' | 'validating'
  message: string
}

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

/**
 * Map targetDuration to the TIMING RULES line used in the Gemini prompt.
 */
function getTimingRule(targetDuration: TargetDuration): string {
  switch (targetDuration) {
    case '15-30':
      return 'Each segment MUST be 15-30 seconds (optimal: 18-25 seconds)'
    case '30-60':
      return 'Each segment MUST be 30-60 seconds (optimal: 35-50 seconds)'
    case '60-90':
      return 'Each segment MUST be 60-90 seconds (optimal: 65-80 seconds)'
    case '90-120':
      return 'Each segment MUST be 90-120 seconds (optimal: 95-110 seconds)'
    case 'auto':
    default:
      return 'Each segment MUST be 15-60 seconds (optimal: 20-45 seconds)'
  }
}

/**
 * Minimum acceptable duration for validation, based on targetDuration.
 */
function getMinDuration(targetDuration: TargetDuration): number {
  switch (targetDuration) {
    case '15-30':
      return 10
    case '30-60':
      return 20
    case '60-90':
      return 40
    case '90-120':
      return 60
    case 'auto':
    default:
      return 10
  }
}

function buildSystemPrompt(targetDuration: TargetDuration): string {
  return `You are an expert at analyzing video transcripts to find the most engaging segments for short-form vertical video content (TikTok, Instagram Reels, YouTube Shorts).

FIND AS MANY COMPELLING SEGMENTS AS POSSIBLE. Do not limit yourself — if there are 20 good clips, return all 20.

SEGMENT SELECTION CRITERIA:
1. STRONG HOOKS: Attention-grabbing opening lines that stop the scroll
2. VALUABLE CONTENT: Tips, insights, interesting facts, stories, how-tos
3. EMOTIONAL MOMENTS: Excitement, surprise, humor, inspiration, controversy
4. COMPLETE THOUGHTS: Self-contained ideas that make sense standalone without context
5. SHAREABLE: Content people would want to share or save

SCORING (0-100):
- 90-100: Guaranteed viral — perfect hook + high emotion + universally relatable
- 80-89: Very strong — great hook, compelling content, broad appeal
- 70-79: Strong — good standalone clip, clear value or entertainment
- 69: Minimum threshold — decent content but may need editing to shine
- Below 69: Do not include

TIMING RULES:
- ${getTimingRule(targetDuration)}
- start_time MUST be LESS than end_time
- Segments must not overlap
- Use EXACT timestamps from the transcript
- Start at natural sentence beginnings, end at natural conclusions

HOOK TEXT:
For each segment, write 1-5 words of on-screen hook text that appears in the first 2 seconds. 80%+ viewers watch with sound off — the hook must work silently.

The hook must do ONE of these:
- CALL OUT the target audience: "Freelancers: stop doing this"
- NAME the specific problem or desire: "$47K/month from rentals?"
- OPEN a curiosity loop with a SPECIFIC detail: "The 3am rule changed everything"
- ATTACK a common belief: "College is a scam and here's why"

Rules:
- Use a SPECIFIC noun, number, or detail from the transcript — never generic filler
- NOT a summary of the clip
- No generic hooks like "Wait for it", "Watch this", "You need to see this"
- Must make the RIGHT audience stop scrolling — filter IN your people

Return valid JSON with this exact structure:
{
  "segments": [
    {
      "start_time": "MM:SS",
      "end_time": "MM:SS",
      "text": "transcript text for this segment",
      "score": 85,
      "hook_text": "Introverts: this changes everything",
      "reasoning": "Strong opening hook with surprising insight about..."
    }
  ],
  "summary": "Brief summary of the full video",
  "key_topics": ["topic1", "topic2"]
}`
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse a timestamp string (MM:SS or HH:MM:SS) into seconds.
 * Returns NaN if the format is unrecognised.
 */
function parseTimestamp(ts: string): number {
  const parts = ts.trim().split(':').map(Number)
  if (parts.some(isNaN)) return NaN
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1]
  }
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2]
  }
  return NaN
}

interface RawSegment {
  start_time?: unknown
  end_time?: unknown
  text?: unknown
  score?: unknown
  hook_text?: unknown
  reasoning?: unknown
}

interface RawResponse {
  segments?: unknown
  summary?: unknown
  key_topics?: unknown
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
      // Wait 2s then retry once
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

/**
 * Validate and normalise the raw JSON from Gemini into ScoredSegment[].
 * Applies all timing / score / overlap rules.
 */
function validateSegments(raw: RawSegment[], videoDuration: number, targetDuration: TargetDuration = 'auto'): ScoredSegment[] {
  const minDuration = getMinDuration(targetDuration)
  const parsed: ScoredSegment[] = []

  for (const seg of raw) {
    if (typeof seg.start_time !== 'string' || typeof seg.end_time !== 'string') continue
    if (typeof seg.text !== 'string' || seg.text.trim().split(/\s+/).length < 3) continue

    const startTime = parseTimestamp(seg.start_time)
    const endTime = parseTimestamp(seg.end_time)

    if (isNaN(startTime) || isNaN(endTime)) continue
    if (startTime >= endTime) continue

    const duration = endTime - startTime
    if (duration < minDuration) continue

    const score = typeof seg.score === 'number' ? seg.score : Number(seg.score)
    if (isNaN(score) || score < 69) continue

    // Clamp to video duration
    if (startTime >= videoDuration) continue
    const clampedEnd = Math.min(endTime, videoDuration)

    parsed.push({
      startTime,
      endTime: clampedEnd,
      text: String(seg.text).trim(),
      score: Math.min(100, Math.max(0, Math.round(score))),
      hookText: typeof seg.hook_text === 'string' ? seg.hook_text.trim() : '',
      reasoning: typeof seg.reasoning === 'string' ? seg.reasoning.trim() : ''
    })
  }

  // Sort by score descending
  parsed.sort((a, b) => b.score - a.score)

  // Remove overlapping segments — keep the higher-scored one (already sorted)
  const result: ScoredSegment[] = []
  for (const seg of parsed) {
    const overlaps = result.some(
      (kept) => seg.startTime < kept.endTime && seg.endTime > kept.startTime
    )
    if (!overlaps) {
      result.push(seg)
    }
  }

  return result
}

// ---------------------------------------------------------------------------
// scoreTranscript
// ---------------------------------------------------------------------------

export async function scoreTranscript(
  apiKey: string,
  formattedTranscript: string,
  videoDuration: number,
  onProgress: (p: ScoringProgress) => void,
  targetDuration: TargetDuration = 'auto'
): Promise<ScoringResult> {
  onProgress({ stage: 'sending', message: 'Sending transcript to Gemini AI...' })

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash-lite',
    generationConfig: {
      responseMimeType: 'application/json'
    }
  })

  const systemPrompt = buildSystemPrompt(targetDuration)

  const prompt = `${systemPrompt}

Analyze this video transcript and identify the most engaging segments for short-form content.

Transcript:
${formattedTranscript}`

  onProgress({ stage: 'analyzing', message: 'Gemini is analyzing the transcript...' })

  const text = await callGeminiWithRetry(model, prompt, 'scoring')

  onProgress({ stage: 'validating', message: 'Validating and scoring segments...' })

  let rawResponse: RawResponse
  try {
    rawResponse = JSON.parse(text) as RawResponse
  } catch {
    // Try to extract JSON from within the text if the model wrapped it
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) {
      throw new Error('Gemini returned an unparseable response')
    }
    rawResponse = JSON.parse(match[0]) as RawResponse
  }

  const rawSegments = Array.isArray(rawResponse.segments) ? (rawResponse.segments as RawSegment[]) : []
  const segments = validateSegments(rawSegments, videoDuration, targetDuration)

  if (segments.length === 0) {
    throw new Error('AI returned no segments scoring ≥69')
  }

  return {
    segments,
    summary: typeof rawResponse.summary === 'string' ? rawResponse.summary : '',
    keyTopics: Array.isArray(rawResponse.key_topics)
      ? (rawResponse.key_topics as unknown[]).filter((t): t is string => typeof t === 'string')
      : []
  }
}

// ---------------------------------------------------------------------------
// rescoreSingleClip
// ---------------------------------------------------------------------------

export interface SingleClipRescoreResult {
  score: number
  reasoning: string
  hookText: string
}

/**
 * Re-score a single clip after the user has edited its boundaries.
 * Lighter-weight than a full transcript score — single Gemini call for one clip.
 */
export async function rescoreSingleClip(
  apiKey: string,
  clipText: string,
  clipDuration: number
): Promise<SingleClipRescoreResult> {
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash-lite',
    generationConfig: { responseMimeType: 'application/json' }
  })

  const prompt = `You are an expert at scoring short-form video clips for viral potential on TikTok, Instagram Reels, and YouTube Shorts.

Given this clip transcript (${Math.round(clipDuration)}s), score it and generate hook text.

SCORING (0-100):
- 90-100: Guaranteed viral — perfect hook + high emotion + universally relatable
- 80-89: Very strong — great hook, compelling content, broad appeal
- 70-79: Strong — good standalone clip, clear value or entertainment
- 60-69: Decent — may need editing to shine
- Below 60: Weak — limited viral potential

HOOK TEXT: Write 5 words or less of on-screen text for the first 2 seconds. 80%+ viewers watch with sound off — the hook must work silently.

The hook must do ONE of these:
- CALL OUT the target audience (e.g. "Freelancers: stop doing this")
- NAME the specific problem or desire (e.g. "$47K/month from rentals?")
- OPEN a curiosity loop with a SPECIFIC detail from the transcript
- ATTACK a common belief with specifics

Rules:
- Pull a SPECIFIC noun, number, or detail from the transcript
- No generic hooks like "Wait for it", "Watch this", "Nobody talks about this"
- Must make the RIGHT audience stop scrolling

Return valid JSON:
{
  "score": 85,
  "reasoning": "Why this clip has viral potential (or lacks it)",
  "hook_text": "$47K/month from rentals?"
}

Transcript: "${clipText.trim()}"`

  const text = await callGeminiWithRetry(model, prompt, 'rescore')

  let raw: { score?: unknown; reasoning?: unknown; hook_text?: unknown }
  try {
    raw = JSON.parse(text) as typeof raw
  } catch {
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('Gemini returned an unparseable response for re-score')
    raw = JSON.parse(match[0]) as typeof raw
  }

  const score = typeof raw.score === 'number' ? raw.score : Number(raw.score)
  if (isNaN(score)) throw new Error('Gemini returned an invalid score')

  return {
    score: Math.min(100, Math.max(0, Math.round(score))),
    reasoning: typeof raw.reasoning === 'string' ? raw.reasoning.trim() : '',
    hookText: typeof raw.hook_text === 'string' ? raw.hook_text.trim() : ''
  }
}

// ---------------------------------------------------------------------------
// generateHookText
// ---------------------------------------------------------------------------

export async function generateHookText(apiKey: string, transcript: string, videoSummary?: string, keyTopics?: string[]): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

  let contextBlock = ''
  if (videoSummary || (keyTopics && keyTopics.length > 0)) {
    const parts: string[] = []
    if (videoSummary) parts.push(`Video context: ${videoSummary}`)
    if (keyTopics && keyTopics.length > 0) parts.push(`Key topics: ${keyTopics.join(', ')}`)
    contextBlock = parts.join('\n') + '\n\n'
  }

  try {
    return await callGeminiWithRetry(
      model,
      `You are an expert short-form content creator specializing in organic (non-ad) TikTok, Instagram Reels, and YouTube Shorts.

Your job is to write on-screen hook text that appears in the first 2 seconds of a clip. 80%+ viewers watch with sound off — the hook must work silently, hooking attention AND adding context so the right audience stays.

Rules:
- 5 words or LESS — no exceptions
- Stop the scroll — curiosity, shock, intrigue, or a question
- Feel native and authentic — NOT like an ad
- Be SPECIFIC to the transcript — fill in real details from the content

The hook MUST do one of:
• AUDIENCE CALLOUT: Name who this is for — "Freelancers: stop doing this", "New parents: watch this", "Gym bros hate this"
• SPECIFIC PROBLEM/DESIRE: Name the exact outcome — "$47K/month from rentals?", "Lost 30lbs eating pizza", "3x your close rate"
• CURIOSITY LOOP with DETAIL: Use a specific noun/number from the transcript — "The 3am rule changed everything", "One word killed his deal", "She said 4 words..."
• BELIEF ATTACK: Challenge with specifics — "College is a scam", "8 hours of sleep is a lie", "Stretching doesn't work"

BANNED (too generic, adds no context):
"Wait for it", "Watch this", "You won't believe", "This changes everything",
"Nobody talks about this", "Must watch", "Check this out", "Here's the thing",
"Game changer", "Mind blown", "Unpopular opinion"

Do NOT:
- Summarize the clip
- Add hashtags, emojis, or extra punctuation

Given the transcript below, write ONE piece of on-screen hook text. Return ONLY the text, nothing else.

${contextBlock}Transcript: "${transcript}"`,
      'hooks'
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new Error(`Failed to generate hook text: ${msg}`)
  }
}
