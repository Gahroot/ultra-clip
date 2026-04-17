/**
 * Emoji Burst / Reaction Overlay
 *
 * At punchlines, shocking moments, or funny beats, this overlay pops
 * animated emoji characters (💀🔥😂) that float upward and fade out —
 * mimicking the live reaction animation seen on viral TikTok / Reels clips.
 *
 * Architecture
 * ────────────
 * • identifyEmojiMoments() — uses Gemini AI to scan the clip transcript
 *   and find high-emotion beats: punchlines, drops, hype moments, etc.
 *   Returns an array of EmojiMoment objects with clip-relative timestamps.
 *
 * • buildEmojiBurstFilters() — converts EmojiMoment[] into an array of
 *   FFmpeg drawtext filter strings. Each emoji character in a burst gets
 *   its own drawtext call with:
 *     • A pre-computed x offset so emojis fan out horizontally.
 *     • A y expression that rises over the animation duration.
 *     • An alpha expression that fades from 1 → 0.
 *   The resulting filters slot directly into any -vf chain.
 *
 * Emoji rendering
 * ───────────────
 * FFmpeg's drawtext filter can render emoji using a color-emoji font
 * (Noto Color Emoji, Apple Color Emoji, Segoe UI Emoji). resolveEmojiFont()
 * searches well-known system font locations. When no emoji font is found the
 * filter still works but the emoji characters may render as boxes — callers
 * are encouraged to bundle NotoColorEmoji.ttf in resources/fonts/ for
 * consistent output across platforms.
 */

import { existsSync } from 'fs'
import { GoogleGenAI } from '@google/genai'
import { escapeDrawtext } from '../hook-title'
import type { TranscriptionResult } from '../transcription'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Thematic preset controlling which emoji characters appear. */
export type EmojiPreset = 'funny' | 'fire' | 'shock' | 'love' | 'custom'

/** Emoji characters assigned to each preset. */
export const EMOJI_PRESETS: Record<EmojiPreset, string[]> = {
  funny: ['😂', '🤣', '💀'],
  fire:  ['🔥', '💯', '👑'],
  shock: ['😱', '😳', '🤯'],
  love:  ['❤️', '😍', '🥰'],
  custom: []
}

/**
 * A single detected high-emotion moment in the clip.
 * All timestamps are **relative to the clip start** (seconds, 0 = clip start).
 */
export interface EmojiMoment {
  /** Seconds from clip start when the burst triggers (0-based). */
  timestamp: number
  /** How long the emoji animation plays in seconds (default 1.5). */
  duration: number
  /** Emoji characters to display (3–6 items). */
  emojis: string[]
  /** Animation intensity — controls count, size, and speed. */
  intensity: 'subtle' | 'normal' | 'explosive'
}

/**
 * Configuration for the emoji burst overlay.
 * Applied globally to all moments in a clip.
 */
export interface EmojiBurstConfig {
  /** Whether the overlay is burned into rendered clips. */
  enabled: boolean
  /**
   * Thematic preset that selects the emoji character set.
   * 'custom' uses the `customEmojis` list.
   */
  preset: EmojiPreset
  /** Emoji characters used when `preset` is 'custom'. */
  customEmojis?: string[]
  /**
   * Base font size in pixels on the 1080×1920 canvas.
   * Intensity multipliers are applied on top of this value.
   * Default: 80.
   */
  fontSize: number
  /**
   * How far each emoji floats upward over its animation duration (pixels).
   * Default: 200. Explosive intensity doubles this.
   */
  floatDistance: number
  /**
   * Number of emoji characters to show per burst for 'normal' intensity.
   * 'subtle' uses Math.ceil(burstCount * 0.6), 'explosive' uses burstCount + 2.
   * Default: 4.
   */
  burstCount: number
  /**
   * Horizontal spread: emojis are distributed within ±spread pixels of
   * the frame centre. Default: 300.
   */
  spread: number
  /**
   * Vertical baseline (y) where the emoji burst begins its upward float,
   * measured from the top of the 1080×1920 frame. Default: 1400 (lower third).
   */
  startY: number
}

/** Default config applied when fields are omitted. */
export const DEFAULT_EMOJI_BURST_CONFIG: EmojiBurstConfig = {
  enabled: false,
  preset: 'funny',
  fontSize: 80,
  floatDistance: 200,
  burstCount: 4,
  spread: 300,
  startY: 1400
}

// ---------------------------------------------------------------------------
// Emoji font resolution
// ---------------------------------------------------------------------------

/**
 * Well-known system paths for color-emoji fonts.
 * Checked in order; first existing path is returned.
 */
const EMOJI_FONT_CANDIDATES: string[] = [
  // Linux — various distro locations for Noto Color Emoji
  '/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf',
  '/usr/share/fonts/noto/NotoColorEmoji.ttf',
  '/usr/share/fonts/google-noto-color-emoji/NotoColorEmoji.ttf',
  '/usr/share/fonts/noto-color-emoji/NotoColorEmoji.ttf',
  '/usr/share/fonts/truetype/NotoColorEmoji.ttf',
  '/usr/share/fonts/NotoColorEmoji.ttf',
  // macOS — Apple Color Emoji (TTF wrapper available via Homebrew or system)
  '/System/Library/Fonts/Apple Color Emoji.ttc',
  '/Library/Fonts/NotoColorEmoji.ttf',
  // Windows — Segoe UI Emoji
  'C:\\Windows\\Fonts\\seguiemj.ttf'
]

/**
 * Returns the path to a color-emoji font usable by FFmpeg's drawtext filter.
 *
 * Resolution order:
 *   1. `resources/fonts/` directory (user-bundled NotoColorEmoji.ttf)
 *   2. Well-known system font locations (Linux / macOS / Windows)
 *   3. `null` — drawtext will use the system fontconfig default, which
 *      may not render colour emoji correctly.
 */
export function resolveEmojiFont(): string | null {
  // 1. Check resources/fonts/ for a bundled emoji font
  const resourcesCandidates: string[] = []
  try {
    const { join } = require('path')
    const { app } = require('electron')
    const fontsDir: string = app.isPackaged
      ? join(process.resourcesPath, 'fonts')
      : join(__dirname, '../../resources/fonts')

    const { readdirSync } = require('fs')
    if (existsSync(fontsDir)) {
      const entries: string[] = readdirSync(fontsDir)
      for (const entry of entries) {
        if (/emoji/i.test(entry) && /\.(ttf|ttc|otf)$/i.test(entry)) {
          resourcesCandidates.push(join(fontsDir, entry))
        }
      }
    }
  } catch {
    // Ignore — fall through to system paths
  }

  for (const p of resourcesCandidates) {
    if (existsSync(p)) return p
  }

  // 2. Well-known system paths
  for (const p of EMOJI_FONT_CANDIDATES) {
    if (existsSync(p)) return p
  }

  return null
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Seeded pseudo-random float in [0, 1).
 * Deterministic so the same inputs always produce the same x offsets.
 */
function seededRand(seed: number): number {
  // Simple LCG — good enough for visual jitter
  const x = Math.sin(seed * 9301 + 49297) * 233280
  return x - Math.floor(x)
}

/**
 * Build one FFmpeg drawtext filter string for a single floating emoji.
 *
 * @param emoji        Single emoji character (or short string).
 * @param xPos         Horizontal centre of the emoji on the 1080-wide canvas.
 * @param startY       Y coordinate where the emoji starts (bottom of upward float).
 * @param appearTime   Clip-relative time when this emoji appears (seconds).
 * @param duration     How long the emoji is visible (seconds).
 * @param floatPx      Total pixels the emoji travels upward over `duration`.
 * @param fontSize     Font size in pixels.
 * @param fontFilePath Absolute path to an emoji font file, or null.
 */
function buildEmojiDrawtext(
  emoji: string,
  xPos: number,
  startY: number,
  appearTime: number,
  duration: number,
  floatPx: number,
  fontSize: number,
  fontFilePath: string | null
): string {
  const safeEmoji = escapeDrawtext(emoji)

  // Guard against divide-by-zero
  const dur = Math.max(duration, 0.05).toFixed(3)
  const appear = appearTime.toFixed(3)
  const disappear = (appearTime + duration).toFixed(3)

  // tRel: seconds elapsed since this emoji appeared (clamped ≥ 0)
  // Rewritten to avoid commas — escaped commas (\,) break some Windows FFmpeg builds.
  // max(0, x) = (x + abs(x)) / 2
  const tDiff = `(t-${appear})`
  const tRel = `(${tDiff}+abs(${tDiff}))/2`

  // y floats upward: startY decreasing by (tRel/dur)*floatPx
  const yExpr = `${startY}-${tRel}/${dur}*${Math.round(floatPx)}`

  // alpha: linear fade from 1 → 0 over the duration
  // max(0, 1-tRel/dur) = ((1-tRel/dur) + abs(1-tRel/dur)) / 2
  const fadeVal = `(1-${tRel}/${dur})`
  const alphaExpr = `(${fadeVal}+abs(${fadeVal}))/2`

  // enable: restrict filter to the animation window
  // between(t,a,b) → (t>=a)*(t<=b) — infix operators avoid commas
  const enableExpr = `(t>=${appear})*(t<=${disappear})`

  // Font spec
  const fontSpec = fontFilePath
    ? `fontfile='${fontFilePath.replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, "\\'")}':fontsize=${fontSize}`
    : `font='NotoColorEmoji':fontsize=${fontSize}`

  return (
    `drawtext=${fontSpec}` +
    `:text='${safeEmoji}'` +
    `:fontcolor=white` +
    `:x=${Math.round(xPos)}-text_w/2` +
    `:y='${yExpr}'` +
    `:alpha='${alphaExpr}'` +
    `:enable='${enableExpr}'`
  )
}

// ---------------------------------------------------------------------------
// buildEmojiBurstFilters
// ---------------------------------------------------------------------------

/**
 * Convert an array of `EmojiMoment` objects into FFmpeg drawtext filter strings.
 *
 * Each string in the returned array is one drawtext call that can be joined
 * with commas and appended to a `-vf` filter chain. Multiple emoji characters
 * in a single burst each get their own drawtext call with jittered x positions
 * and a small stagger offset so they feel organic rather than synchronised.
 *
 * @param moments        Detected high-emotion moments (clip-relative timestamps).
 * @param config         Global display configuration.
 * @param fontFilePath   Resolved emoji font path (from `resolveEmojiFont()`).
 *                       Pass `null` to let FFmpeg use the system fontconfig default.
 * @returns              Array of drawtext filter strings (one per emoji particle).
 */
export function buildEmojiBurstFilters(
  moments: EmojiMoment[],
  config: EmojiBurstConfig,
  fontFilePath: string | null
): string[] {
  if (!config.enabled || moments.length === 0) return []

  const CANVAS_W = 1080
  const emojiPool = config.preset === 'custom'
    ? (config.customEmojis ?? EMOJI_PRESETS.funny)
    : EMOJI_PRESETS[config.preset]

  if (emojiPool.length === 0) return []

  const filters: string[] = []

  moments.forEach((moment, momentIdx) => {
    // ── Intensity modifiers ─────────────────────────────────────────────────
    let count: number
    let sizeMultiplier: number
    let floatMultiplier: number

    switch (moment.intensity) {
      case 'subtle':
        count = Math.max(2, Math.ceil(config.burstCount * 0.6))
        sizeMultiplier = 0.75
        floatMultiplier = 0.7
        break
      case 'explosive':
        count = config.burstCount + 2
        sizeMultiplier = 1.25
        floatMultiplier = 1.6
        break
      default: // 'normal'
        count = config.burstCount
        sizeMultiplier = 1.0
        floatMultiplier = 1.0
    }

    const fontSize = Math.round(config.fontSize * sizeMultiplier)
    const floatPx = Math.round(config.floatDistance * floatMultiplier)
    const halfSpread = config.spread / 2
    const centerX = CANVAS_W / 2

    // ── Place each emoji in the burst ────────────────────────────────────────
    for (let i = 0; i < count; i++) {
      // Deterministic x jitter within ±spread/2
      const seed = momentIdx * 100 + i
      const rand = seededRand(seed)
      // Distribute across [-spread/2, +spread/2] then offset slightly upward
      const xOffset = (rand * 2 - 1) * halfSpread
      const xPos = centerX + xOffset

      // Small time stagger so emojis don't all appear in the same frame
      const stagger = i * 0.12 // 120ms between each
      const appearTime = moment.timestamp + stagger
      const dur = moment.duration

      // Cycle through the emoji pool
      const emoji = moment.emojis.length > 0
        ? moment.emojis[i % moment.emojis.length]
        : emojiPool[i % emojiPool.length]

      // Slight y jitter so not all emojis start at exactly the same baseline
      const yJitter = Math.round(seededRand(seed + 50) * 60 - 30)
      const startY = config.startY + yJitter

      filters.push(
        buildEmojiDrawtext(
          emoji,
          xPos,
          startY,
          appearTime,
          dur,
          floatPx,
          fontSize,
          fontFilePath
        )
      )
    }
  })

  return filters
}

// ---------------------------------------------------------------------------
// identifyEmojiMoments  (AI-powered)
// ---------------------------------------------------------------------------

/**
 * Emoji moment detected by the AI before resolving into EmojiMoment objects.
 * Mirrors the shape we ask Gemini to return.
 */
interface AIEmojiHit {
  timestamp: number      // absolute source-video timestamp (seconds)
  preset: EmojiPreset
  intensity: 'subtle' | 'normal' | 'explosive'
  reason?: string
}

/**
 * Use Gemini to identify punchlines, hype moments, and emotional peaks in
 * a clip's transcript, and assign appropriate emoji presets to each.
 *
 * The returned moments have **clip-relative** timestamps (0 = clipStart),
 * ready to pass directly to `buildEmojiBurstFilters`.
 *
 * Falls back to a rule-based scan when the API key is missing or the call
 * fails, so the feature degrades gracefully.
 *
 * @param apiKey        Gemini API key. Pass '' to skip AI and use rule-based.
 * @param transcript    Full transcription result (words + segments).
 * @param clipStart     Clip start time in the source video (seconds).
 * @param clipEnd       Clip end time in the source video (seconds).
 * @param config        Emoji burst configuration (preset fallback, etc.).
 */
export async function identifyEmojiMoments(
  apiKey: string,
  transcript: TranscriptionResult,
  clipStart: number,
  clipEnd: number,
  config: EmojiBurstConfig
): Promise<EmojiMoment[]> {
  const clipDuration = clipEnd - clipStart
  if (clipDuration <= 0) return []

  // Collect words within the clip window
  const clipWords = transcript.words.filter(
    (w) => w.start >= clipStart && w.end <= clipEnd
  )
  if (clipWords.length === 0) return []

  // Build a formatted excerpt for the AI prompt
  const formattedLines: string[] = []
  const CHUNK = 6
  for (let i = 0; i < clipWords.length; i += CHUNK) {
    const chunk = clipWords.slice(i, i + CHUNK)
    const chunkStart = chunk[0].start
    const chunkEnd = chunk[chunk.length - 1].end
    const text = chunk.map((w) => w.text).join(' ')
    const relStart = (chunkStart - clipStart).toFixed(1)
    const relEnd = (chunkEnd - clipStart).toFixed(1)
    formattedLines.push(`[${relStart}s-${relEnd}s] ${text}`)
  }
  const formattedTranscript = formattedLines.join('\n')

  let aiHits: AIEmojiHit[] = []

  if (apiKey) {
    try {
      aiHits = await callGeminiForMoments(apiKey, formattedTranscript, clipDuration)
    } catch {
      // Fall through to rule-based
      aiHits = []
    }
  }

  // If AI returned nothing, fall back to rule-based detection
  if (aiHits.length === 0) {
    aiHits = detectMomentsRuleBased(clipWords, clipStart, clipEnd)
  }

  // Convert AI hits into EmojiMoment objects
  const emojiPool = config.preset === 'custom'
    ? (config.customEmojis ?? EMOJI_PRESETS.funny)
    : EMOJI_PRESETS[config.preset]

  return aiHits
    .filter((hit) => {
      // Relative timestamp must be within [0, clipDuration - 0.5]
      const rel = hit.timestamp - clipStart
      return rel >= 0 && rel < clipDuration - 0.5
    })
    .map((hit): EmojiMoment => {
      const relTimestamp = hit.timestamp - clipStart
      const presetEmojis = EMOJI_PRESETS[hit.preset] ?? emojiPool
      const chosenEmojis = presetEmojis.length > 0 ? presetEmojis : emojiPool

      const burstDuration = hit.intensity === 'explosive' ? 2.0
        : hit.intensity === 'subtle' ? 1.0
        : 1.5

      return {
        timestamp: Math.max(0, relTimestamp),
        duration: burstDuration,
        emojis: chosenEmojis,
        intensity: hit.intensity
      }
    })
    .slice(0, 8) // cap at 8 bursts per clip to avoid filter-chain bloat
}

// ---------------------------------------------------------------------------
// Gemini AI call
// ---------------------------------------------------------------------------

async function callGeminiForMoments(
  apiKey: string,
  formattedTranscript: string,
  clipDuration: number
): Promise<AIEmojiHit[]> {
  const ai = new GoogleGenAI({ apiKey })

  const prompt =
    `You are an expert short-form video editor who knows exactly when to trigger emoji reaction bursts to amplify emotion and increase viewer engagement.

Analyze this clip transcript (${Math.round(clipDuration)} seconds total) and identify up to 6 high-emotion moments where floating emoji animations would pop — punchlines, shocking reveals, hype moments, funny drops, impressive achievements, etc.

Transcript:
${formattedTranscript.slice(0, 2000)}

For each moment, choose:
- preset: "funny" (😂🤣💀 — jokes, self-deprecation, absurdity), "fire" (🔥💯👑 — hype, achievement, impressive), "shock" (😱😳🤯 — reveals, twists, surprising facts), "love" (❤️😍🥰 — wholesome, positive, uplifting)
- intensity: "subtle" (soft moment), "normal" (clear beat), "explosive" (big punchline / peak moment)
- timestamp: seconds from clip start (float, use the relative timestamp from the transcript)

Return ONLY valid JSON array, no markdown fences, no explanation:
[{"timestamp":2.4,"preset":"funny","intensity":"explosive"},{"timestamp":8.1,"preset":"fire","intensity":"normal"}]

If no strong moments exist, return an empty array: []`

  const result = await ai.models.generateContent({
    model: 'gemini-2.5-flash-lite',
    contents: prompt
  })
  const raw = (result.text ?? '').trim()

  // Extract JSON array from response (strip any surrounding markdown)
  const jsonMatch = raw.match(/\[[\s\S]*\]/)
  if (!jsonMatch) return []

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonMatch[0])
  } catch {
    return []
  }

  if (!Array.isArray(parsed)) return []

  const VALID_PRESETS = new Set<string>(['funny', 'fire', 'shock', 'love', 'custom'])
  const VALID_INTENSITIES = new Set<string>(['subtle', 'normal', 'explosive'])

  return parsed
    .filter(
      (item): item is AIEmojiHit =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as Record<string, unknown>).timestamp === 'number' &&
        VALID_PRESETS.has(String((item as Record<string, unknown>).preset)) &&
        VALID_INTENSITIES.has(String((item as Record<string, unknown>).intensity))
    )
    .map((item) => ({
      timestamp: (item as AIEmojiHit).timestamp,   // already clip-relative from prompt
      preset: (item as AIEmojiHit).preset as EmojiPreset,
      intensity: (item as AIEmojiHit).intensity
    }))
}

// ---------------------------------------------------------------------------
// Rule-based fallback detection
// ---------------------------------------------------------------------------

/**
 * Simple rule-based detection when no API key is available.
 *
 * Looks for:
 *   • Sentences ending in '!' or '?' → shock / excitement
 *   • Exclamation clusters (words ending in '!') → fire / funny
 *   • Filler / reaction words ('wow', 'omg', 'crazy', 'insane', etc.) → shock
 *   • Laughter indicators ('haha', 'lol', 'hilarious', 'funny') → funny
 *
 * Returns clip-relative (absolute source-video) timestamps for AIEmojiHit
 * (conversion to relative happens in the calling function).
 */
function detectMomentsRuleBased(
  words: { text: string; start: number; end: number }[],
  clipStart: number,
  clipEnd: number
): AIEmojiHit[] {
  const hits: AIEmojiHit[] = []

  const SHOCK_WORDS = new Set([
    'wow', 'omg', 'crazy', 'insane', 'unbelievable', 'impossible',
    'shocking', 'wild', 'whoa', 'wait', 'no', 'what'
  ])
  const FUNNY_WORDS = new Set([
    'haha', 'lol', 'funny', 'hilarious', 'joke', 'laughing', 'dead',
    'dying', 'lmao', 'lmfao'
  ])
  const FIRE_WORDS = new Set([
    'amazing', 'incredible', 'legendary', 'fire', 'goat', 'best',
    'perfect', 'genius', 'brilliant', 'yes', 'let\'s go', 'incredible'
  ])

  // Minimum gap between hits (seconds) to avoid clustering
  const MIN_GAP = 3.0
  let lastHitTime = -Infinity

  for (const word of words) {
    if (word.start < clipStart || word.end > clipEnd) continue

    const lower = word.text.toLowerCase().replace(/[^a-z]/g, '')
    let preset: EmojiPreset | null = null
    let intensity: 'subtle' | 'normal' | 'explosive' = 'normal'

    if (FUNNY_WORDS.has(lower)) {
      preset = 'funny'
      intensity = 'explosive'
    } else if (SHOCK_WORDS.has(lower)) {
      preset = 'shock'
      intensity = word.text.includes('!') ? 'explosive' : 'normal'
    } else if (FIRE_WORDS.has(lower)) {
      preset = 'fire'
      intensity = 'normal'
    } else if (word.text.endsWith('!') && word.text.length > 3) {
      preset = 'fire'
      intensity = 'subtle'
    }

    if (preset && word.start - lastHitTime >= MIN_GAP) {
      hits.push({ timestamp: word.start, preset, intensity })
      lastHitTime = word.start
    }
  }

  return hits.slice(0, 6)
}
