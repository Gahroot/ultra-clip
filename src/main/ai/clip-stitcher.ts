/**
 * Clip Stitcher — AI-Composed Composite Clips from Non-Contiguous Segments
 *
 * Analyzes the full transcript and creates composite clips by cherry-picking
 * non-contiguous segments from across the entire video, stitching them into
 * one cohesive short-form clip.
 *
 * Each stitched clip follows a hook → rehook → payoff → rehook → payoff rhythm.
 * There is no maximum number of segments or length limit — the only constraint
 * is that the composition must stay engaging throughout.
 */

import { GoogleGenerativeAI, type GenerativeModel } from '@google/generative-ai'
import type { TranscriptionResult } from '../transcription'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SegmentRole =
  | 'hook'          // Opening attention-grabber (1-3s)
  | 'rehook'        // Mid-clip attention reset (1-3s)
  | 'context'       // Background/setup connector
  | 'why'           // Why the audience should care
  | 'what'          // What the insight/solution is
  | 'how'           // How to execute/apply
  | 'mini-payoff'   // Secondary payoff (delivered early)
  | 'main-payoff'   // Primary payoff (climax)
  | 'bonus-payoff'  // Optional third payoff
  | 'bridge'        // Brief connector between distant moments

export interface StitchSegment {
  /** Start time in seconds in the source video */
  startTime: number
  /** End time in seconds in the source video */
  endTime: number
  /** Transcript text for this segment */
  text: string
  /** Narrative role of this segment in the composite clip */
  role: SegmentRole
  /** Optional on-screen text overlay for this specific segment (hook text, rehook text, etc.) */
  overlayText?: string
}

export type StitchFramework = 'hook-escalate-payoff' | 'why-what-how'

export interface StitchedClip {
  /** Unique identifier */
  id: string
  /** Ordered list of non-contiguous segments */
  segments: StitchSegment[]
  /** Sum of all segment durations */
  totalDuration: number
  /** AI's description of the story this clip tells */
  narrative: string
  /** Hook text for the first 2 seconds */
  hookText: string
  /** 0.0–100.0 viral potential score (one decimal place, sum of four rubric dimensions) */
  score: number
  /** Why this composite works */
  reasoning: string
  /** Which structural framework the AI chose */
  framework: StitchFramework
  /** AI-generated rehook text for the first rehook segment */
  rehookText?: string
}

export interface StitchingResult {
  clips: StitchedClip[]
  summary: string
}

export interface StitchingProgress {
  stage: 'analyzing' | 'composing' | 'validating'
  message: string
}

// ---------------------------------------------------------------------------
// Internal AI response types
// ---------------------------------------------------------------------------

interface RawStitchSegment {
  start_time?: unknown
  end_time?: unknown
  text?: unknown
  role?: unknown
  overlay_text?: unknown
}

interface RawStitchedClip {
  segments?: unknown
  narrative?: unknown
  hook_text?: unknown
  rehook_text?: unknown
  score?: unknown
  reasoning?: unknown
  framework?: unknown
}

interface RawStitchingResponse {
  stitched_clips?: unknown
  summary?: unknown
}

// ---------------------------------------------------------------------------
// Gemini helpers (same patterns as ai-scoring.ts)
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

async function callGeminiWithRetry(model: GenerativeModel, prompt: string): Promise<string> {
  try {
    const result = await model.generateContent(prompt)
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
        return result.response.text().trim()
      } catch (retryErr) {
        classifyGeminiError(retryErr)
      }
    }
    classifyGeminiError(err)
  }
}

// ---------------------------------------------------------------------------
// Timestamp parsing
// ---------------------------------------------------------------------------

/**
 * Parse a timestamp string (MM:SS or HH:MM:SS) into seconds.
 * Also handles raw numeric values (already in seconds).
 */
function parseTimestamp(ts: unknown): number {
  if (typeof ts === 'number') return ts
  if (typeof ts !== 'string') return NaN
  const trimmed = ts.trim()

  // Try parsing as a number first (e.g. "123.5")
  const asNum = Number(trimmed)
  if (!isNaN(asNum) && trimmed.length > 0 && !trimmed.includes(':')) return asNum

  const parts = trimmed.split(':').map(Number)
  if (parts.some(isNaN)) return NaN
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  return NaN
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const VALID_ROLES: SegmentRole[] = [
  'hook', 'rehook', 'context', 'why', 'what', 'how',
  'mini-payoff', 'main-payoff', 'bonus-payoff', 'bridge'
]

/** Map legacy role names to their v2 equivalents for backward compatibility. */
const LEGACY_ROLE_MAP: Record<string, SegmentRole> = {
  'payoff': 'main-payoff'
}

const VALID_FRAMEWORKS: StitchFramework[] = ['hook-escalate-payoff', 'why-what-how']

function validateStitchedClips(
  rawClips: RawStitchedClip[],
  videoDuration: number
): StitchedClip[] {
  const result: StitchedClip[] = []
  let clipIndex = 0

  for (const raw of rawClips) {
    if (!Array.isArray(raw.segments) || raw.segments.length < 2) continue

    const segments: StitchSegment[] = []
    let valid = true

    for (const rawSeg of raw.segments as RawStitchSegment[]) {
      const startTime = parseTimestamp(rawSeg.start_time)
      const endTime = parseTimestamp(rawSeg.end_time)

      if (isNaN(startTime) || isNaN(endTime)) { valid = false; break }
      if (startTime >= endTime) { valid = false; break }
      if (startTime < 0 || endTime > videoDuration + 1) { valid = false; break }

      const text = typeof rawSeg.text === 'string' ? rawSeg.text.trim() : ''
      const roleStr = typeof rawSeg.role === 'string' ? rawSeg.role.trim().toLowerCase() : 'context'
      const mappedRole = LEGACY_ROLE_MAP[roleStr] ?? roleStr
      const role = VALID_ROLES.includes(mappedRole as SegmentRole) ? (mappedRole as SegmentRole) : 'context'

      const overlayText = typeof rawSeg.overlay_text === 'string' ? rawSeg.overlay_text.trim() : undefined

      segments.push({
        startTime: Math.max(0, startTime),
        endTime: Math.min(endTime, videoDuration),
        text,
        role,
        ...(overlayText ? { overlayText } : {})
      })
    }

    if (!valid || segments.length < 2) continue

    // At least one segment must be a hook (should be the first)
    const hasHook = segments.some((s) => s.role === 'hook')
    if (!hasHook) continue

    // At least one segment must be a payoff variant
    const hasPayoff = segments.some((s) => s.role.includes('payoff'))
    if (!hasPayoff) continue

    // Verify segments within this clip don't overlap with each other
    const sorted = [...segments].sort((a, b) => a.startTime - b.startTime)
    let hasOverlap = false
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].startTime < sorted[i - 1].endTime) {
        hasOverlap = true
        break
      }
    }
    if (hasOverlap) continue

    const totalDuration = segments.reduce((sum, s) => sum + (s.endTime - s.startTime), 0)
    if (totalDuration < 3) continue // Micro-segment clips can be short, but not under 3s

    const score = typeof raw.score === 'number' ? raw.score : Number(raw.score)
    if (isNaN(score) || score < 70) continue

    const narrative = typeof raw.narrative === 'string' ? raw.narrative.trim() : ''
    const hookText = typeof raw.hook_text === 'string' ? raw.hook_text.trim() : ''
    const rehookText = typeof raw.rehook_text === 'string' ? raw.rehook_text.trim() : undefined
    const reasoning = typeof raw.reasoning === 'string' ? raw.reasoning.trim() : ''

    const frameworkStr = typeof raw.framework === 'string' ? raw.framework.trim().toLowerCase() : ''
    const framework = VALID_FRAMEWORKS.includes(frameworkStr as StitchFramework)
      ? (frameworkStr as StitchFramework)
      : 'hook-escalate-payoff'

    result.push({
      id: `stitched-${clipIndex++}`,
      segments,
      totalDuration: Math.round(totalDuration * 10) / 10,
      narrative,
      hookText,
      score: Math.min(100, Math.max(0, Math.round(score * 10) / 10)),
      reasoning,
      framework,
      ...(rehookText ? { rehookText } : {})
    })
  }

  // Sort by score descending
  result.sort((a, b) => b.score - a.score)

  return result
}

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

function buildStitchingPrompt(): string {
  return `You are an elite short-form content editor who creates viral composite clips by cherry-picking the most compelling moments from across an entire video and stitching them into one cohesive narrative.

YOUR TASK:
Read the full transcript below and identify 3-8 composite clips that can be assembled from NON-CONTIGUOUS segments scattered across the video. Each composite tells a story that is MORE compelling than any single continuous segment could be.

═══════════════════════════════════════════════════════
STITCHING ADVANTAGE TEST
═══════════════════════════════════════════════════════

For EVERY candidate composite, ask: "What does stitching buy here that a single continuous segment couldn't?"

The answer must be exactly one of these four:

  COMPRESSION — The composite cuts filler, tangents, or dead air between the best moments, creating a denser, more valuable clip than any contiguous section. The viewer gets more signal per second than any unedited run of the video can deliver.

  ESCALATION — Segments from different parts of the video build on each other in a way that no single section achieves. The second payoff lands harder BECAUSE of what came before it; the full arc only exists in the composite.

  CONTRAST — Combining segments creates a comparison, a before/after, or an irony that doesn't exist in any individual section. The meaning emerges from the juxtaposition, not from either segment alone.

  REFRAMING — An earlier moment takes on new meaning in light of a later one. The composite creates a narrative arc — a punchline, a reversal, a revelation — that the raw chronological video never produces.

If the stitching advantage isn't clearly one of these four, the composite does NOT justify being a stitched clip. Use a regular single-segment clip instead, and invest that slot in a composite that genuinely earns its complexity.

═══════════════════════════════════════════════════════
FRAMEWORKS — Pick the best one for each clip
═══════════════════════════════════════════════════════

FRAMEWORK A: Hook-Escalate-Payoff ("hook-escalate-payoff")
Best for: tips, how-tos, educational, lists, factual reveals

  HOOK (1-3s)                           — A specific tension, result, or unanswered question that the rest of the clip resolves. Must make the viewer think "wait, what — I need to know more." The segment must feel INCOMPLETE on its own; the viewer needs the rest of the clip for resolution. DISQUALIFIED if it: opens with a greeting or intro ("hey guys, today we're…"), sets a scene without raising specific stakes, or could stand alone as a complete thought.
  REHOOK / STAKES (2-5s)                — [STAKES REHOOK] Makes the viewer personally feel why this matters to THEM. Must reference the viewer's specific situation, fear, desire, or problem ("If you've ever…", "The reason most people fail at X is…"). Fails if it could apply to anyone about anything ("this is really important" ✗, "you need to hear this" ✗, "this changes everything" ✗). A rehook must be EARNED — it only works if the hook already established something real to hook back onto.
  MINI-PAYOFF (3-10s)                   — A concrete early reward: a specific tip, surprising fact, or actionable insight the viewer can immediately use or remember. NOT a tease or setup — an actual answer or revelation that makes the viewer feel they already got something worth watching for.
  REHOOK / ESCALATION (1-3s)            — [ESCALATION REHOOK] Signals that something even better is coming. Must create a specific expectation gap — the viewer should feel "okay, I need to stay for this." Tease using the actual content of what's coming so the promise is concrete ("But the number that actually surprised me…", "But that's not even the part that changed everything"). Fails if it's a filler transition phrase ("and here's the thing" ✗, "so anyway" ✗, "but wait" ✗). Must be EARNED — only works if the mini-payoff already delivered something real to escalate from.
  MAIN-PAYOFF (3-15s)                   — The single most rewarding moment in the clip. Must deliver one of: (a) a specific actionable insight the viewer can apply, (b) a surprising fact or reframe that changes how they see something, (c) a concrete result with proof (numbers, transformation, before/after), or (d) a quotable one-liner that crystallizes the entire point. The viewer should feel genuinely rewarded for watching — not just informed that something is important.
  [Optional] REHOOK / ESCALATION (1-2s) — [ESCALATION REHOOK] Signals the bonus payoff is worth staying for. Must hint at something specific ("And there's one more thing most people completely miss…") — not a generic "one more thing." Only include if the bonus-payoff is genuinely surprising and the escalation promise is honest.
  [Optional] BONUS-PAYOFF (2-8s)        — A third concrete reward that adds new value — an additional tip, result, or revelation. Only include if it delivers something genuinely new; never use as filler.

FRAMEWORK B: Why-What-How ("why-what-how")
Best for: persuasion, motivation, process, transformation

  HOOK (1-3s)                        — A specific tension, result, or shocking statement that creates an open loop the rest of the clip must close. Must make the viewer ask "wait, what? I need to keep watching." The segment must feel INCOMPLETE on its own — the viewer needs the rest of the clip for resolution. DISQUALIFIED if it: opens with a greeting or intro, establishes context without tension, or lets the viewer feel they've missed nothing if they stop watching now.
  WHY (3-8s)                         — Why the audience should care (stakes, problem, pain)
  REHOOK / STAKES (1-3s)             — [STAKES REHOOK] Bridges from the specific problem in WHY to the solution. Must tie back to the viewer's pain and make the promise of what's coming feel personally relevant ("So if you're someone who…", "And that's exactly why this matters if you've ever tried to…"). Fails if it's a generic pivot that could sit between any two segments ("So here's what you need to know" ✗, "Moving on" ✗). Must be EARNED — only works if WHY already established a real, specific pain.
  WHAT (3-10s)                       — What the solution/insight/concept is
  REHOOK / ESCALATION (1-3s)         — [ESCALATION REHOOK] Signals that the HOW is more concrete and surprising than the WHAT — creates a specific expectation gap about what the viewer is about to see or learn ("And here's the exact step most people skip", "Watch what actually happens when you apply this"). Fails if it's just a filler connector ("And here's exactly how to do it" ✗, "Watch this" ✗). Must be EARNED — only works if WHAT already delivered something real to escalate from.
  HOW (3-15s)                        — Concrete steps, demonstration, proof
  [Optional] MAIN-PAYOFF (2-5s)      — The transformation reveal: a concrete before/after, a specific result, or the moment the viewer can see/hear the proof that it works

═══════════════════════════════════════════════════════
SEGMENT ROLES
═══════════════════════════════════════════════════════

- "hook": First segment (1-3 seconds). Must tease a SPECIFIC tension, result, or unanswered question that the rest of the clip resolves — not generic energy, not a dramatic tone. A good hook makes the viewer ask "wait, what? I need to know more." A bad hook is a generic opener, a slow buildup, or a polite intro that could be anyone's first sentence. DISQUALIFIERS: greetings or intros ("hey guys, today we're talking about…"), scene-setting without tension, any segment where the viewer could stop watching and feel they missed nothing. The hook must feel INCOMPLETE on its own — the viewer needs the rest of the clip to get resolution.
- "rehook": Two distinct types — choose based on position in the clip:
    STAKES REHOOK (after hook or why): Makes the viewer personally feel why this matters to THEM. Must reference the viewer's specific situation, fear, desire, or problem. Fails if it could apply to anyone about anything. Disqualifiers: vague affirmations ("this is really important" ✗), pure transitions ("so anyway" ✗), anything that doesn't connect the previous segment's tension to the viewer's personal stakes. A rehook must be EARNED — it only works if the previous segment created something real to hook back onto.
    ESCALATION REHOOK (after mini-payoff or what): Signals that something even better is coming. Must create a specific expectation gap — the viewer should feel "okay, I need to stay for this." Disqualifiers: filler transition phrases ("and here's the thing" ✗, "but wait" ✗, "moving on" ✗), anything that doesn't promise something specific. Must be EARNED — only works if the previous segment already delivered something real to escalate from.
- "context": ONLY use when the payoff is INCOMPREHENSIBLE without it — i.e., the viewer would be genuinely confused, not just less informed, without this setup. Must be the MINIMUM necessary setup; if the payoff still makes sense without it, omit it entirely. DISQUALIFIERS: interesting-but-not-required background, speaker biography, topic introductions, anything that slows the pace without directly unlocking the payoff's meaning. CAP: maximum ONE context segment per clip — if you need more than one, the core hook/payoff combination isn't strong enough on its own.
- "why": Why the audience should care (Framework B)
- "what": What the insight/solution is (Framework B)
- "how": How to execute/apply (Framework B)
- "mini-payoff": A concrete early reward — a specific tip, fact, or insight the viewer can immediately use or remember. Delivered early so the viewer feels they ALREADY got value. NOT a tease — an actual answer or revelation.
- "main-payoff": The single most rewarding moment in the clip. Must make the viewer feel the video was worth watching. Qualifies only if it delivers: a specific actionable insight, a surprising reframe, a concrete result with proof, or a quotable line that crystallizes the whole point. Reject anything that just sounds emphatic without giving the viewer something real.
- "bonus-payoff": A third concrete reward — an additional tip, result, or revelation. Only use if it adds something genuinely new. Never a repeat or a vague affirmation.
- "bridge": ONLY use when there is a meaningful time gap between two segments AND the jump would be jarring or confusing without it. Must be a single short phrase or sentence from the transcript — not a full segment of setup. DISQUALIFIERS: smoothing a transition that isn't actually jarring, adding runtime, bridging segments that already connect naturally. CAP: maximum ONE bridge per clip — if you need more than one, the segments don't belong together.

⚠️  CONNECTIVE TISSUE WARNING: If you are reaching for "context" or "bridge" to make a clip work, that is a signal the core hook/payoff combination isn't strong enough on its own. Strong composites need minimal connective tissue — if the clip only holds together with multiple context or bridge segments, discard it and find a better combination.

═══════════════════════════════════════════════════════
MICRO-SEGMENT RULES
═══════════════════════════════════════════════════════

Short segments are PREFERRED for hooks and rehooks:
- A hook can be just 1-2 words from a sentence — a bold claim fragment
- A rehook can be a single transitional phrase ("but here's the thing")
- 1-2 second segments are ideal for hooks and rehooks
- Longer segments (3-15s) are for payoffs, why/what/how sections

═══════════════════════════════════════════════════════
OVERLAY TEXT
═══════════════════════════════════════════════════════

For every "hook" and "rehook" segment, provide overlay_text (1-6 words) that will appear as bold on-screen text. Examples:
- Hook: "They Lied To You", "Nobody Talks About This", "Watch What Happens"
- Rehook: "But wait", "Here's the crazy part", "It gets worse"

═══════════════════════════════════════════════════════
PAYOFF ORDERING
═══════════════════════════════════════════════════════

Deliver the second-best concrete payoff FIRST (mini-payoff), then the best (main-payoff). The mini-payoff must be a real reward on its own — not a warmup act. The main-payoff must be MORE specific, MORE surprising, or MORE actionable than the mini. If the main-payoff isn't clearly better than the mini, you have the wrong segments — keep looking.

═══════════════════════════════════════════════════════
COHESION CHECK
═══════════════════════════════════════════════════════

Run each of these five checks before finalizing a clip. If ANY check fails, adjust segment selection or boundaries — do not assign a score until all five pass.

1. ENTRY CHECK — Does each segment (except the first) open in a way that connects to what just happened? If a segment starts mid-thought with no apparent link to the previous segment's close, either trim the boundary or insert a bridge.

2. EXIT CHECK — Does the clip end on resolution, not mid-thought? The final segment should land cleanly — a conclusion, a revelation, a memorable line. Not a sentence that trails off, not a setup without a payoff.

3. TOPIC CONSISTENCY — Do all segments serve the same central point? If you have to stretch to explain how a segment connects to the clip's narrative, it doesn't belong.

4. REPETITION CHECK — Does any segment say something the viewer already heard in an earlier segment? Repetition kills pace. Each segment must add new information, new stakes, or new perspective — never re-state.

5. ARC CHECK — Reading all segments in order: is there a clear direction of travel? The clip should move somewhere — from problem to solution, from question to answer, from setup to payoff. If the segments could be reordered without losing anything, the arc is broken.

If ANY of these checks fail, adjust the segment selection or boundaries before assigning a score.

═══════════════════════════════════════════════════════
VALUE TEST
═══════════════════════════════════════════════════════

Before finalizing each clip, ask: "What does the viewer walk away with?" If the answer is vague — "they'll feel inspired" or "they'll understand it better" — the clip fails. The answer must be specific: a named tactic, a concrete number, a reframed belief, a step they can take today, or a surprising fact they'll repeat to someone else.

A payoff fails the value test if it:
- Tells the viewer something is important without saying WHY or HOW
- Ends on a rhetorical question with no answer
- Is a call-to-action ("go follow me", "check the link")
- Is pure hype or energy with no substance ("this is HUGE", "you need to know this")
- Is a setup or teaser for content NOT in this clip

If a clip can only produce vague payoffs, it's not ready to be a stitched clip — skip it.

═══════════════════════════════════════════════════════
CLIP ANTI-PATTERNS
═══════════════════════════════════════════════════════

Before assigning any score, check the full clip against each failure mode below. If ANY anti-pattern applies, REJECT the clip entirely — do not include it in the output regardless of how strong individual segments appear.

- PSEUDO-NON-CONTIGUOUS: All segments come from the same narrow window of the video (e.g., within a 2-minute span). This isn't stitching — it's just trimming. Genuine composites pull from meaningfully different parts of the video (at least 5 minutes apart where possible). If every segment could have been captured in one contiguous cut, the composition fails.

- SAME POINT, DIFFERENT WORDS: The segments all make the same point or cover the same idea from slightly different angles. A composite must present DISTINCT ideas, steps, or revelations — not variations on one theme. Ask: "Does each segment add something the previous one didn't?" If the answer is no for more than one segment, reject the clip.

- UNRESOLVED SETUP: The clip creates a specific expectation (a question, a tension, a promised reveal) that is never resolved within the clip itself. If the payoff to a setup exists somewhere in the video, include it — otherwise don't set it up. A clip that ends with an open loop it created is broken, not mysterious.

- ORPHANED OPENING: The first segment starts mid-thought, references something not established in this clip, or requires prior knowledge the viewer doesn't have. The hook must be self-contained enough to make sense to a cold viewer — someone who has never seen this video and knows nothing about the speaker. If the hook only works because of context the viewer doesn't have, it isn't a hook.

- PACE COLLAPSE: More than half the segments are context, bridge, or why/what — with only one short payoff at the end. Good composites deliver value early and often, not just at the finish line. If the ratio of setup to payoff is greater than 2:1 by segment count, the clip is front-loaded with debt it can't repay.

- TOPIC DRIFT: The clip starts about one topic and ends about a different one, with no through-line connecting them. Every segment must serve the same central premise stated or implied in the hook. If the clip's opening question and closing answer are about different things, the composition is incoherent regardless of how good each individual segment is.

═══════════════════════════════════════════════════════
SCORING RUBRIC
═══════════════════════════════════════════════════════

Score each composite clip out of 100.0 by summing four dimensions (0.0–25.0 each).
Use tenths of a point — e.g. 21.4, 18.7. Anchor every score to the bands below.
A perfect 100.0 is the theoretical ceiling; scores above 90.0 are extremely rare.

────────────────────────────────────────────────────
1. PAYOFF STRENGTH (0.0–25.0)
────────────────────────────────────────────────────
What does the viewer ACTUALLY walk away with?

25.0  PERFECT. One named, specific, immediately usable thing — a tactic with a proper name,
      a number the viewer will cite in conversation, a belief reframe they can apply today
      without Googling, or a step-by-step method they can execute in the next hour. The
      viewer will repeat it word-for-word to someone else. No inferential steps required.
      Example: "The speaker gives the exact 3-word phrase to say in a salary negotiation."

22.0–24.9  Concrete and actionable but requires one small inferential step to apply, OR
      memorable and specific but the application isn't quite immediate (needs a tool,
      a context, a follow-up). Still something real the viewer will remember.

18.0–21.9  The viewer learns something genuinely true and interesting — a real fact, a
      clear principle — but it's informational rather than actionable. They know something
      new; they don't know what to DO differently yet.

13.0–17.9  Somewhat interesting. The viewer got a thing, but if asked 10 minutes later
      they'd struggle to articulate it precisely. The payoff was diluted by setup, hedging,
      or competing points. Vaguely rewarding.

8.0–12.9  Mostly setup or tease. The clip hints at something valuable but never delivers
      it — the payoff is "you should care about X" rather than "here is X."

3.0–7.9   Vague, hype-laden, or energy-only. "This will change everything." "Most people
      get this wrong." No specifics. Emotional signaling without substance.

0.0–2.9   No payoff whatsoever. The clip ends on a call-to-action, a cliffhanger for
      content outside this clip, or pure filler. The viewer got nothing.

────────────────────────────────────────────────────
2. HOOK TENSION (0.0–25.0)
────────────────────────────────────────────────────
Does the opening force the viewer to keep watching?

25.0  PERFECT. One specific, irresolvable open loop. The hook is INCOMPLETE — it raises a
      question or shows a result that makes NO sense without the rest of the clip. Removing
      the hook would leave a stranger confused. The viewer cannot pause here without feeling
      they abandoned something. No greeting, no context, no warmup — pure unresolved tension
      in the first word.
      Example: "The hook is the speaker mid-sentence: '…and that's when I realized the
      number wasn't 40% — it was 4%.' The viewer has no idea what '40%' refers to yet."

22.0–24.9  Highly specific tension — a named result, a counterintuitive claim, a mid-action
      moment — but with one small element of context that slightly softens the urgency, or
      a frame that slightly resolves before the clip needs it to.

18.0–21.9  Genuinely curious opener that creates a real question in the viewer's mind, but
      the viewer could stop watching and feel they missed something interesting rather than
      something they absolutely need.

13.0–17.9  Vaguely interesting. Implies something is coming. Raises a topic rather than a
      tension. The viewer might keep watching out of mild curiosity, not compulsion.

8.0–12.9  Soft, ambient opener. Sets a scene or tone. No specific question raised. The
      viewer keeps watching because the topic interests them, not because the hook hooked.

3.0–7.9   Generic. Could open any video on this subject. "Today I want to talk about…"
      energy. No tension, no stakes, no urgency.

0.0–2.9   Anti-hook. Greeting, intro, slow scene-setting, or a moment that actively
      signals "we're just getting started" — which tells the viewer it's safe to leave.

────────────────────────────────────────────────────
3. NON-CONTIGUOUSNESS VALUE (0.0–25.0)
────────────────────────────────────────────────────
Does stitching EARN its complexity? Would a contiguous cut be worse?

25.0  PERFECT. The composite is provably, demonstrably better than any contiguous version.
      The hook comes from a moment where the resolution only exists 20+ minutes later.
      OR: two moments from different parts of the video create a meaning together that
      neither has alone (e.g., a question asked at 2:10 answered at 44:30, with all the
      dead air between stripped out). OR: stitching skips a section that would kill
      momentum and the jump makes the narrative SHARPER. The editing is the insight.

22.0–24.9  Clear, decisive stitching advantage. The composite avoids dead air, redundancy,
      or setup that would meaningfully weaken a contiguous version. A contiguous cut
      could exist but would be noticeably inferior.

18.0–21.9  Stitching helps. A contiguous version would be weaker — slower, or padded —
      but still viable. The stitching is good craft, not a structural requirement.

13.0–17.9  Segments are from different timestamps but the narrative they form isn't
      meaningfully better than what a well-chosen contiguous cut would produce. The
      non-contiguousness is incidental, not load-bearing.

8.0–12.9  The gap between segments adds no value. This is a contiguous clip in disguise —
      the segments could be from a single continuous run and nothing would change.

3.0–7.9   The segments actively resist each other. Different contexts, different energy
      levels, different reference frames. The stitching created a problem, not a solution.

0.0–2.9   The clip would be strictly better as a contiguous cut. Stitching hurt it — the
      jumps introduce confusion or tonal whiplash that a single take wouldn't have.

────────────────────────────────────────────────────
4. COHESION (0.0–25.0)
────────────────────────────────────────────────────
Does it play as a single, unified piece of content?

25.0  PERFECT. Reads like a tightly scripted monologue. Every cut is invisible — a viewer
      watching without timestamps would not know segments were stitched. Sentence endings
      feed naturally into the next beginning. Energy, pace, and tone are continuous.
      The grammar across cuts is clean: pronouns resolve, verb tenses match, no orphaned
      references. If read aloud it sounds like one unbroken take.

22.0–24.9  Flows naturally with one micro-seam visible on close inspection — a slight tonal
      shift, a sentence that starts slightly abruptly, or one pronoun that needs a beat
      to resolve. A casual viewer wouldn't notice; an editor would.

18.0–21.9  Mostly unified but has one noticeable transition — a moment where the viewer
      thinks "wait, did something get cut?" They recover within a second and stay engaged,
      but immersion briefly broke.

13.0–17.9  Generally coherent but has one rough cut that produces a beat of confusion. The
      viewer follows the narrative but is aware they're watching edited content. Could
      have been avoided with better segment selection or trimming.

8.0–12.9  Multiple rough transitions. The viewer is continuously aware of the stitching.
      Reference mismatches, energy gaps, or tonal inconsistencies across more than one cut.

3.0–7.9   Disjointed. The segments don't form a unified voice. The viewer has to actively
      work to follow what's being said and why it connects.

0.0–2.9   Incoherent. The composite contradicts itself, references things not established,
      or produces a narrative the viewer cannot parse as intentional.

────────────────────────────────────────────────────
FINAL SCORE
────────────────────────────────────────────────────
Add the four dimension scores. Express as a single decimal (e.g. 83.6).
Clips scoring below 70.0 must be discarded — do not include them in the output.
Before assigning any score, ask: "If I were the viewer, would I share this clip?"
A 90+ clip gets shared because it's the best version of this insight anyone has seen.
A 70–79 clip is solid but forgettable — passes the bar but won't go viral on its own.

═══════════════════════════════════════════════════════
RULES
═══════════════════════════════════════════════════════

- Each composite MUST have at least 2 segments from DIFFERENT parts of the video
- Segments within a composite must NOT overlap with each other
- Use EXACT timestamps from the transcript — start at natural sentence beginnings, end at natural conclusions
- Prioritize composites where combining segments creates a STRONGER narrative than any individual contiguous segment
- There is NO maximum number of segments or duration limit — the only constraint is it must stay engaging throughout
- Score each composite using the SCORING RUBRIC above (four dimensions × 25 pts = 100 total); discard any clip scoring below 70
- First segment MUST have role "hook"
- At least one segment MUST have a payoff role (mini-payoff, main-payoff, or bonus-payoff)
- Before finalizing a composite, identify its stitching advantage (compression, escalation, contrast, or reframing). If you cannot name one, discard the composite.

HOOK TEXT:
For each composite, write 1-6 words of on-screen hook text for the first 2 seconds. Stop the scroll — create curiosity, shock, or intrigue. NOT a summary.

REHOOK TEXT:
For each composite, write the rehook text for the first rehook segment (used as a mid-clip pattern interrupt overlay).

Return valid JSON with this exact structure:
{
  "stitched_clips": [
    {
      "framework": "hook-escalate-payoff",
      "segments": [
        { "start_time": "MM:SS", "end_time": "MM:SS", "text": "transcript text", "role": "hook", "overlay_text": "They Lied To You" },
        { "start_time": "MM:SS", "end_time": "MM:SS", "text": "more text", "role": "rehook", "overlay_text": "Here's why it matters" },
        { "start_time": "MM:SS", "end_time": "MM:SS", "text": "insight text", "role": "mini-payoff" },
        { "start_time": "MM:SS", "end_time": "MM:SS", "text": "transition", "role": "rehook", "overlay_text": "But wait" },
        { "start_time": "MM:SS", "end_time": "MM:SS", "text": "best moment", "role": "main-payoff" }
      ],
      "narrative": "This clip combines the shocking opener with the final revelation...",
      "hook_text": "They Lied To You",
      "rehook_text": "But that's not even the craziest part",
      "score": 84.3,
      "reasoning": "Payoff: 22.0 (concrete tactic, one inferential step). Hook: 23.5 (specific mid-sentence drop, no warmup). Non-contiguousness: 21.0 (clear advantage, contiguous version would be slower). Cohesion: 17.8 (one slightly rough pronoun resolution across cut 2→3). Total: 84.3."
    }
  ],
  "summary": "Brief summary of the composite clips generated and why they work"
}`
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate composite clips from non-contiguous segments using AI analysis.
 *
 * @param apiKey              Gemini API key
 * @param formattedTranscript Pre-formatted transcript with timestamps
 * @param videoDuration       Source video duration in seconds
 * @param wordTimestamps      Word-level timestamps for the full video
 * @param onProgress          Progress callback
 */
export async function generateStitchedClips(
  apiKey: string,
  formattedTranscript: string,
  videoDuration: number,
  _wordTimestamps: { text: string; start: number; end: number }[],
  onProgress: (p: StitchingProgress) => void
): Promise<StitchingResult> {
  onProgress({ stage: 'analyzing', message: 'Analyzing full transcript for stitching opportunities…' })

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash-lite',
    generationConfig: {
      responseMimeType: 'application/json'
    }
  })

  const systemPrompt = buildStitchingPrompt()
  const prompt = `${systemPrompt}

Video duration: ${Math.round(videoDuration)} seconds (${Math.floor(videoDuration / 60)}m ${Math.round(videoDuration % 60)}s)

Full transcript:
${formattedTranscript}`

  onProgress({ stage: 'composing', message: 'AI is composing multi-segment clips…' })

  const text = await callGeminiWithRetry(model, prompt)

  onProgress({ stage: 'validating', message: 'Validating stitched clip compositions…' })

  let rawResponse: RawStitchingResponse
  try {
    rawResponse = JSON.parse(text) as RawStitchingResponse
  } catch {
    // Try to extract JSON from within the text
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) {
      throw new Error('Gemini returned an unparseable response for clip stitching')
    }
    rawResponse = JSON.parse(match[0]) as RawStitchingResponse
  }

  const rawClips = Array.isArray(rawResponse.stitched_clips)
    ? (rawResponse.stitched_clips as RawStitchedClip[])
    : []

  const clips = validateStitchedClips(rawClips, videoDuration)

  if (clips.length === 0) {
    throw new Error('AI returned no valid stitched clips (all scored below 70 or had invalid segments)')
  }

  return {
    clips,
    summary: typeof rawResponse.summary === 'string' ? rawResponse.summary : ''
  }
}
