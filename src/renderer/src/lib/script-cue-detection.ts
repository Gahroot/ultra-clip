export interface WordTimestamp {
  text: string
  start: number
  end: number
}

export interface ScriptCue {
  id: string
  label: string            // "Script 1", "Script 2", ...
  scriptNumber: number
  startTime: number        // seconds — content starts after cue phrase
  endTime: number          // seconds — content ends before next cue phrase
  cueWordIndices: number[] // indices in word array that form the cue phrase (excluded from clip)
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
  sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20
}

const SMALL_BUFFER = 0.15 // seconds of buffer before the next cue
const MIN_CLIP_DURATION = 0.5 // clips shorter than this are dropped as hallucinations

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeToken(token: string): string {
  return token.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function editDistance(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)])
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
      }
    }
  }
  return dp[m][n]
}

function isScriptToken(token: string): boolean {
  const normalized = normalizeToken(token)
  if (normalized === 'script') return true
  // Allow fuzzy match for words ≥ 5 chars (e.g. "scrypt", "scripted")
  if (normalized.length >= 5 && editDistance(normalized, 'script') <= 1) return true
  return false
}

function parseNumber(token: string): number | null {
  const normalized = normalizeToken(token)
  // Digit string
  const asInt = parseInt(normalized, 10)
  if (!isNaN(asInt) && asInt >= 1 && asInt <= 99) return asInt
  // Number word — exact
  if (NUMBER_WORDS[normalized] !== undefined) return NUMBER_WORDS[normalized]
  // Number word — fuzzy (edit distance ≤ 1 for longer words)
  for (const [word, num] of Object.entries(NUMBER_WORDS)) {
    if (word.length >= 4 && editDistance(normalized, word) <= 1) return num
  }
  return null
}

// ---------------------------------------------------------------------------
// Fused-token pass (e.g. "scripttwo", "script2")
// ---------------------------------------------------------------------------

interface RawDetection {
  scriptNumber: number
  firstWordIdx: number
  lastWordIdx: number
}

function tryFusedToken(token: string, wordIdx: number): RawDetection | null {
  const normalized = normalizeToken(token)
  // Must start with "script" (or fuzzy variant)
  const SCRIPT_BASE = 'script'
  // Try all prefix lengths that could correspond to "script" ±1 edit
  for (let prefixLen = Math.max(4, SCRIPT_BASE.length - 1); prefixLen <= Math.min(normalized.length - 1, SCRIPT_BASE.length + 2); prefixLen++) {
    const prefix = normalized.slice(0, prefixLen)
    if (editDistance(prefix, SCRIPT_BASE) <= 1) {
      const suffix = normalized.slice(prefixLen)
      const num = parseNumber(suffix)
      if (num !== null) {
        return { scriptNumber: num, firstWordIdx: wordIdx, lastWordIdx: wordIdx }
      }
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// Main detection
// ---------------------------------------------------------------------------

export function detectScriptCues(words: WordTimestamp[], duration: number): ScriptCue[] {
  const detections: RawDetection[] = []

  for (let i = 0; i < words.length; i++) {
    // Pass 0: fused token ("scripttwo", "script2", etc.)
    const fused = tryFusedToken(words[i].text, i)
    if (fused) {
      detections.push(fused)
      continue
    }

    // Pass 1: two-token match ("script" + number)
    if (isScriptToken(words[i].text)) {
      // Check immediate next word
      if (i + 1 < words.length) {
        const num = parseNumber(words[i + 1].text)
        if (num !== null) {
          detections.push({ scriptNumber: num, firstWordIdx: i, lastWordIdx: i + 1 })
          i++ // consume the number word
          continue
        }
      }
      // Check one-word gap (e.g. "script... number" with a filler in between)
      if (i + 2 < words.length) {
        const num = parseNumber(words[i + 2].text)
        if (num !== null) {
          detections.push({ scriptNumber: num, firstWordIdx: i, lastWordIdx: i + 2 })
          i += 2
          continue
        }
      }
    }
  }

  if (detections.length === 0) return []

  // Sort by position
  detections.sort((a, b) => a.firstWordIdx - b.firstWordIdx)

  // Deduplicate retakes: if the same script number appears more than once, keep the last
  const byNumber = new Map<number, RawDetection>()
  for (const d of detections) {
    byNumber.set(d.scriptNumber, d)
  }
  const deduped = Array.from(byNumber.values()).sort((a, b) => a.firstWordIdx - b.firstWordIdx)

  // Build ScriptCue objects with timing
  const cues: ScriptCue[] = []

  for (let ci = 0; ci < deduped.length; ci++) {
    const det = deduped[ci]
    const nextDet = deduped[ci + 1] ?? null

    // Content starts at the first word after the cue phrase
    const contentStartIdx = det.lastWordIdx + 1
    if (contentStartIdx >= words.length) continue // no content words after cue

    const startTime = words[contentStartIdx].start

    // Content ends before the next cue phrase (or at video end)
    let endTime: number
    if (nextDet !== null) {
      const lastContentIdx = nextDet.firstWordIdx - 1
      if (lastContentIdx < contentStartIdx) continue // empty clip
      endTime = Math.min(
        words[lastContentIdx].end + SMALL_BUFFER,
        words[nextDet.firstWordIdx].start,
        duration
      )
    } else {
      endTime = duration
    }

    if (endTime - startTime < MIN_CLIP_DURATION) continue

    const cueWordIndices: number[] = []
    for (let wi = det.firstWordIdx; wi <= det.lastWordIdx; wi++) {
      cueWordIndices.push(wi)
    }

    cues.push({
      id: `script-cue-${det.scriptNumber}`,
      label: `Script ${det.scriptNumber}`,
      scriptNumber: det.scriptNumber,
      startTime,
      endTime,
      cueWordIndices
    })
  }

  // Final sort by script number
  cues.sort((a, b) => a.scriptNumber - b.scriptNumber)

  return cues
}
