/**
 * Fake Comment Overlay
 *
 * Renders a realistic "top comment" style overlay near the bottom of the clip,
 * exploiting social proof psychology to hold viewer attention. The overlay
 * looks like a pinned TikTok / Reels comment floating over the video:
 *
 *   ┌──────────────────────────────────────────────────────┐
 *   │  [A]  @username                          ♥ 2.4k     │
 *   │       Wait till he says the thing about...           │
 *   └──────────────────────────────────────────────────────┘
 *
 * Uses only FFmpeg `drawbox` + `drawtext` filters so it slots into any
 * existing `-vf` chain without requiring a `filter_complex` graph.
 *
 * Timing: the overlay fades in at `appearTime`, holds for `displayDuration`
 * seconds, then fades out — leveraging the same alpha-expression pattern
 * used by rehook.ts and hook-title.ts.
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import { escapeDrawtext, resolveHookFont } from '../hook-title'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * The comment content returned by `generateFakeComment` (or constructed
 * manually). This data is then passed to `buildFakeCommentFilter`.
 */
export interface FakeCommentData {
  /** TikTok-style username (no @ prefix — added in the rendered label). */
  username: string
  /** The comment body. Keep under 60 chars for best readability. */
  text: string
  /** Optional emoji appended after the comment text (e.g. '💀'). */
  emoji?: string
  /** Avatar background color in CSS hex format (e.g. '#FF6B6B'). */
  profileColor: string
  /**
   * Formatted like count displayed next to the heart icon (e.g. '2.4k').
   * Chosen automatically by `generateFakeComment` for consistency.
   */
  likeCount: string
}

/** Visual style preset for the comment card. */
export type FakeCommentStyle = 'tiktok' | 'youtube' | 'reels'

/** Vertical placement of the comment card on the 1080×1920 canvas. */
export type FakeCommentPosition =
  | 'lower-third'  // just above the caption / UI dead zone (~y=1440)
  | 'middle-left'  // vertically centred, left-aligned (~y=870)

/**
 * Full configuration for the fake comment overlay.
 * All timing values are in seconds (relative to clip start).
 */
export interface FakeCommentConfig {
  /** Whether the overlay is burned into rendered clips. */
  enabled: boolean
  /**
   * Visual style preset.
   *   'tiktok'   — dark card (#161823), coral accent, TikTok-style typography
   *   'youtube'  — dark card (#1E1E1E), softer contrast, Shorts-style typography
   *   'reels'    — dark card (#0A0A0A), stronger contrast, Reels-style typography
   */
  style: FakeCommentStyle
  /** Where on the frame the card appears. */
  position: FakeCommentPosition
  /** Seconds from clip start when the overlay appears (default 1.5). */
  appearTime: number
  /** How long the overlay is visible in seconds (default 4.0). */
  displayDuration: number
  /** Fade-in duration in seconds (default 0.3). */
  fadeIn: number
  /** Fade-out duration in seconds (default 0.4). */
  fadeOut: number
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default config applied when `FakeCommentConfig` fields are omitted. */
export const DEFAULT_FAKE_COMMENT_CONFIG: FakeCommentConfig = {
  enabled: false,
  style: 'tiktok',
  position: 'lower-third',
  appearTime: 1.5,
  displayDuration: 4.0,
  fadeIn: 0.3,
  fadeOut: 0.4
}

/**
 * Curated avatar background colors. Chosen to be vibrant and distinct so
 * each "commenter" has a recognizable profile circle.
 */
const AVATAR_COLORS: readonly string[] = [
  '#FF6B6B', // coral red
  '#4ECDC4', // teal
  '#45B7D1', // sky blue
  '#96CEB4', // sage green
  '#FF9F43', // warm orange
  '#A29BFE', // lavender
  '#FD79A8', // bubblegum pink
  '#00B894'  // mint green
]

/** Like counts that look realistic but not suspiciously round. */
const LIKE_COUNTS: readonly string[] = [
  '847', '1.2k', '2.4k', '3.1k', '892', '1.8k', '4.2k', '567', '2.1k', '988'
]

/**
 * Fallback comments used when AI generation is unavailable.
 * Chosen to be maximally curiosity-inducing without being platform-specific.
 */
const DEFAULT_COMMENT_POOL: ReadonlyArray<Omit<FakeCommentData, 'profileColor' | 'likeCount'>> = [
  { username: 'sarah_vibes23',   text: 'wait till the end',            emoji: '💀' },
  { username: 'realtalkbro',     text: 'the part at the end got me' },
  { username: 'mindblown_daily', text: 'bro this ending changed my life', emoji: '😭' },
  { username: 'justhere4tea',    text: 'wait for what he says at the end' },
  { username: 'xo.vibes_',       text: 'the ending tho',               emoji: '😭' },
  { username: 'factcheckking',   text: 'nah he did NOT just say that' },
  { username: 'lowkey_obsessed', text: 'i replayed this 10 times',     emoji: '😂' },
  { username: 'truth_seeker99',  text: 'this is why i stay till the end' },
  { username: 'notmain.acct',    text: 'the twist at the end',         emoji: '🤯' },
  { username: 'silently.screaming', text: 'nobody is ready for the ending' }
]

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Simple deterministic hash of a string, used to make random-looking
 * selections (avatar color, like count) consistent for a given username.
 */
function stableHash(s: string): number {
  let h = 0
  for (let i = 0; i < Math.min(s.length, 120); i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0
  }
  return h
}

/**
 * Convert a CSS `#RRGGBB` hex string to an FFmpeg color expression.
 * Accepts 6-char and 8-char (AARRGGBB) forms. Falls back to `black`.
 */
function hexToFFmpegColor(hex: string, alpha: number = 1.0): string {
  const h = hex.replace(/^#/, '')
  let r: number, g: number, b: number

  if (h.length === 8) {
    r = parseInt(h.slice(2, 4), 16)
    g = parseInt(h.slice(4, 6), 16)
    b = parseInt(h.slice(6, 8), 16)
  } else if (h.length === 6) {
    r = parseInt(h.slice(0, 2), 16)
    g = parseInt(h.slice(2, 4), 16)
    b = parseInt(h.slice(4, 6), 16)
  } else {
    return `black@${alpha.toFixed(2)}`
  }

  const toHex = (n: number) => n.toString(16).padStart(2, '0')
  return `0x${toHex(r)}${toHex(g)}${toHex(b)}@${alpha.toFixed(2)}`
}

/**
 * Pick a default fake comment deterministically from the pool, based on a
 * seed string (typically the clip transcript). Also assigns the avatar color
 * and like count.
 */
function getDefaultComment(seed: string): FakeCommentData {
  const hash = stableHash(seed)
  const entry = DEFAULT_COMMENT_POOL[hash % DEFAULT_COMMENT_POOL.length]
  const profileColor = AVATAR_COLORS[stableHash(entry.username) % AVATAR_COLORS.length]
  const likeCount = LIKE_COUNTS[stableHash(entry.username + 'likes') % LIKE_COUNTS.length]
  return { ...entry, profileColor, likeCount }
}

// ---------------------------------------------------------------------------
// generateFakeComment
// ---------------------------------------------------------------------------

/**
 * Generate a realistic, curiosity-inducing fake comment using Gemini AI.
 *
 * The comment references something compelling that happens "later" in the
 * clip without revealing specifics — exploiting the curiosity gap to keep
 * viewers watching.
 *
 * Falls back to a deterministic default from `DEFAULT_COMMENT_POOL` if the
 * API key is absent, the call fails, or the response is malformed.
 *
 * @param apiKey      Gemini API key. Pass `''` to skip AI and use the default.
 * @param transcript  Full clip transcript text (used for context + as fallback seed).
 * @param clipContext Optional extra context (clip topic, hook text, etc.).
 * @returns           `FakeCommentData` ready for `buildFakeCommentFilter`.
 */
export async function generateFakeComment(
  apiKey: string,
  transcript: string,
  clipContext: string = ''
): Promise<FakeCommentData> {
  if (!apiKey) return getDefaultComment(transcript)

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' })

    const contextHint = clipContext ? `\nExtra context: ${clipContext}` : ''

    const prompt =
      `You are creating a realistic TikTok comment overlay to boost viewer retention via social proof psychology.

Task: Write ONE fake viewer comment that makes people curious about what's coming later in the clip.

Clip transcript (first 600 chars): "${transcript.slice(0, 600)}"${contextHint}

The comment must:
- Sound like a real human wrote it (casual, authentic tone)
- Create FOMO or anticipation for the clip's ending or a later moment
- Be vague enough to NOT spoil what happens — just tease it
- Be 25–55 characters max (short = more credible)

Return ONLY a valid JSON object, no markdown, no explanation:
{
  "username": "a_realistic_tiktok_username",
  "text": "the comment body here",
  "emoji": "one emoji or null"
}

Username rules: 8–20 chars, lowercase letters/numbers/underscores/dots only, no spaces.
Emoji: one character if used, otherwise null.`

    const result = await model.generateContent(prompt)
    const raw = result.response.text().trim()

    // Strip markdown code fences if the model wraps it
    const jsonStr = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    const parsed = JSON.parse(jsonStr) as {
      username?: string
      text?: string
      emoji?: string | null
    }

    const username = (parsed.username ?? '').trim()
    const text = (parsed.text ?? '').trim()

    if (!username || !text) return getDefaultComment(transcript)

    const profileColor = AVATAR_COLORS[stableHash(username) % AVATAR_COLORS.length]
    const likeCount = LIKE_COUNTS[stableHash(username + 'likes') % LIKE_COUNTS.length]

    return {
      username,
      text,
      emoji: parsed.emoji ?? undefined,
      profileColor,
      likeCount
    }
  } catch {
    return getDefaultComment(transcript)
  }
}

// ---------------------------------------------------------------------------
// buildFakeCommentFilter
// ---------------------------------------------------------------------------

/**
 * Card layout constants on the 1080×1920 canvas.
 *
 *  ← cardX →┌──────────────── cardWidth ────────────────┐
 *            │◀ avPad ▶[avatar]◀ gap ▶ @user   ♥ count  │ cardH
 *            │          [avatar]         comment text     │
 *            └──────────────────────────────────────────-─┘
 */
const CARD_W = 700
const CARD_H = 130
const CARD_X = 24        // left margin
const AV_PAD = 16        // gap between card left edge and avatar
const AV_SIZE = 76       // avatar square side (px)
const AV_GAP = 14        // gap between avatar right edge and text column
const TEXT_X = CARD_X + AV_PAD + AV_SIZE + AV_GAP // = 130

// Vertical positions (relative to card top)
const USERNAME_ROW = 32  // top of username text from card top
const COMMENT_ROW = 76   // top of comment text from card top
const AV_Y_OFF = 27      // avatar top from card top (centers avatar on both rows)

// Card Y positions per layout slot
const LOWER_THIRD_Y = 1440   // sits just above TikTok's bottom dead zone (1600px)
const MIDDLE_Y = 870         // vertically centred on 1920 canvas

// Font sizes (px on 1920px tall canvas)
const FONT_USERNAME = 28
const FONT_COMMENT = 34
const FONT_AVATAR = 38       // initial letter inside avatar

/**
 * Build an array of FFmpeg filter strings that together render the fake
 * comment overlay. The caller should join with `,` and append to `-vf`.
 *
 * Filter order (each is one drawbox or drawtext):
 *   1. Card background (drawbox, hard-cut enable)
 *   2. Avatar colored square (drawbox, hard-cut enable)
 *   3. Avatar initial letter (drawtext, alpha-animated)
 *   4. Username label (drawtext, alpha-animated)
 *   5. Comment text (drawtext, alpha-animated)
 *   6. Heart + like count (drawtext, alpha-animated)
 *
 * @param comment      Comment data from `generateFakeComment`.
 * @param config       Display configuration.
 * @param fontFilePath Absolute path to a TTF/OTF font, or null for fontconfig.
 * @returns            Array of FFmpeg filter strings.
 */
export function buildFakeCommentFilter(
  comment: FakeCommentData,
  config: FakeCommentConfig,
  fontFilePath: string | null
): string[] {
  if (!config.enabled) return []

  const {
    style,
    position,
    appearTime,
    displayDuration,
    fadeIn,
    fadeOut
  } = config

  const endTime = appearTime + displayDuration
  const fadeOutStart = endTime - fadeOut

  // ── Timing expressions ────────────────────────────────────────────────────
  const enableExpr = `between(t,${appearTime.toFixed(3)},${endTime.toFixed(3)})`
  const tRel = `(t-${appearTime.toFixed(3)})`
  const alphaExpr =
    `if(lt(${tRel},${fadeIn.toFixed(3)}),` +
      `${tRel}/${fadeIn.toFixed(3)},` +
      `if(gt(t,${fadeOutStart.toFixed(3)}),` +
        `(${endTime.toFixed(3)}-t)/${fadeOut.toFixed(3)},` +
        `1))`

  // ── Card geometry ─────────────────────────────────────────────────────────
  const cardY = position === 'lower-third' ? LOWER_THIRD_Y : MIDDLE_Y

  const avatarX = CARD_X + AV_PAD
  const avatarY = cardY + AV_Y_OFF

  // ── Style-specific colors ─────────────────────────────────────────────────
  type StyleSpec = { cardBg: string; cardAlpha: number; likeColor: string }
  const styleSpecs: Record<FakeCommentStyle, StyleSpec> = {
    tiktok:  { cardBg: '#161823', cardAlpha: 0.88, likeColor: '#FF2D55' },
    youtube: { cardBg: '#1E1E1E', cardAlpha: 0.85, likeColor: '#FF0000' },
    reels:   { cardBg: '#0A0A0A', cardAlpha: 0.82, likeColor: '#E1306C' }
  }
  const { cardBg, cardAlpha, likeColor } = styleSpecs[style]

  const cardBgColor = hexToFFmpegColor(cardBg, cardAlpha)
  const avatarColor = hexToFFmpegColor(comment.profileColor, 1.0)
  const likeFFColor = hexToFFmpegColor(likeColor, 1.0)

  // ── Text content ──────────────────────────────────────────────────────────
  const initial = (comment.username[0] ?? 'u').toUpperCase()
  const usernameLabel = `@${comment.username}`
  const commentBody = comment.emoji
    ? `${comment.text} ${comment.emoji}`
    : comment.text
  const likeLabel = `${String.fromCharCode(0x2665)} ${comment.likeCount}` // ♥ 2.4k

  const safeInitial = escapeDrawtext(initial)
  const safeUsername = escapeDrawtext(usernameLabel)
  const safeComment = escapeDrawtext(commentBody)
  const safeLike = escapeDrawtext(likeLabel)

  // ── Font spec ─────────────────────────────────────────────────────────────
  const fontPath = fontFilePath
    ? `'${fontFilePath.replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, "\\'")}'`
    : null

  function fontSpec(size: number, bold: boolean = false): string {
    if (fontPath) return `fontfile=${fontPath}:fontsize=${size}`
    return bold
      ? `font='Sans Bold':fontsize=${size}`
      : `font='Sans':fontsize=${size}`
  }

  // ── Like count x position (right-aligned inside card) ────────────────────
  // Place the like count at a fixed position from the right edge of the card
  const likeX = CARD_X + CARD_W - 100

  // ── Build filter list ─────────────────────────────────────────────────────
  const filters: string[] = []

  // 1. Card background
  filters.push(
    `drawbox=x=${CARD_X}:y=${cardY}:w=${CARD_W}:h=${CARD_H}` +
    `:color=${cardBgColor}:t=fill` +
    `:enable='${enableExpr}'`
  )

  // 2. Avatar colored square
  filters.push(
    `drawbox=x=${avatarX}:y=${avatarY}:w=${AV_SIZE}:h=${AV_SIZE}` +
    `:color=${avatarColor}:t=fill` +
    `:enable='${enableExpr}'`
  )

  // 3. Avatar initial letter — centred within the avatar square
  const avTextX = avatarX + Math.round(AV_SIZE / 2) - Math.round(FONT_AVATAR * 0.3)
  const avTextY = avatarY + Math.round(AV_SIZE / 2) - Math.round(FONT_AVATAR * 0.55)
  filters.push(
    `drawtext=${fontSpec(FONT_AVATAR, true)}` +
    `:text='${safeInitial}'` +
    `:fontcolor=white` +
    `:x=${avTextX}:y=${avTextY}` +
    `:borderw=1:bordercolor=black@0.30` +
    `:alpha='${alphaExpr}'` +
    `:enable='${enableExpr}'`
  )

  // 4. Username (@handle) — gray, smaller
  const usernameY = cardY + USERNAME_ROW
  filters.push(
    `drawtext=${fontSpec(FONT_USERNAME)}` +
    `:text='${safeUsername}'` +
    `:fontcolor=0xAAAAAA@1.0` +
    `:x=${TEXT_X}:y=${usernameY}` +
    `:alpha='${alphaExpr}'` +
    `:enable='${enableExpr}'`
  )

  // 5. Comment body — white, slightly larger
  const commentY = cardY + COMMENT_ROW
  filters.push(
    `drawtext=${fontSpec(FONT_COMMENT, true)}` +
    `:text='${safeComment}'` +
    `:fontcolor=white` +
    `:x=${TEXT_X}:y=${commentY}` +
    `:borderw=1:bordercolor=black@0.40` +
    `:alpha='${alphaExpr}'` +
    `:enable='${enableExpr}'`
  )

  // 6. Heart + like count — right side of the card, aligned with username row
  filters.push(
    `drawtext=${fontSpec(FONT_USERNAME)}` +
    `:text='${safeLike}'` +
    `:fontcolor=${likeFFColor}` +
    `:x=${likeX}:y=${usernameY}` +
    `:alpha='${alphaExpr}'` +
    `:enable='${enableExpr}'`
  )

  return filters
}

// ---------------------------------------------------------------------------
// resolveCommentFont — re-export for IPC handler convenience
// ---------------------------------------------------------------------------

export { resolveHookFont as resolveCommentFont }
