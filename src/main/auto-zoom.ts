/**
 * Auto-Zoom Engine — animated zoom/pan for rendered clips.
 *
 * Supports three modes:
 * - ken-burns:  smooth sinusoidal breathing zoom (cosine wave)
 * - reactive:   zoom responds to word emphasis moments (keyframe-driven)
 * - jump-cut:   instant zoom level changes simulating multi-camera editing
 *
 * The filter must be inserted AFTER `scale=1080:1920` in the filter chain
 * and BEFORE any subtitle burn-in (e.g. `ass=...`).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

import type { ZoomIntensity, ZoomMode, WordTimestamp } from '@shared/types'
export type { ZoomIntensity, ZoomMode }

export interface ZoomSettings {
  /** Whether auto-zoom is applied to rendered clips */
  enabled: boolean
  /**
   * Zoom animation mode.
   * - ken-burns:  smooth sinusoidal breathing (default)
   * - reactive:   zoom responds to word emphasis moments (keyframe-driven)
   * - jump-cut:   instant zoom level changes simulating multi-camera editing
   */
  mode: ZoomMode
  /**
   * How pronounced the zoom/pan motion is.
   * - subtle:  ±5% zoom, no horizontal drift  (default)
   * - medium:  ±9% zoom, gentle horizontal drift
   * - dynamic: ±13% zoom, noticeable horizontal drift
   */
  intensity: ZoomIntensity
  /**
   * Seconds between zoom direction reversals (half-period of the sine wave).
   * Default: 4 → full zoom cycle every 8 seconds.
   */
  intervalSeconds: number
}

export interface ZoomKeyframe {
  time: number
  zoom: number   // absolute zoom factor, e.g. 1.08
  panX: number   // normalised x of view centre (0–1)
  panY: number   // normalised y of view centre (0–1)
}

// ---------------------------------------------------------------------------
// Intensity config
// ---------------------------------------------------------------------------

interface IntensityConfig {
  /** Max zoom above 1.0 (amplitude of cosine oscillation) */
  amplitude: number
  /**
   * Horizontal pan expressed as a fraction of the zoomed visible width
   * on either side of centre. 0 = no horizontal drift.
   */
  panFrac: number
}

const INTENSITY_CONFIG: Record<ZoomIntensity, IntensityConfig> = {
  subtle:  { amplitude: 0.05, panFrac: 0.00 },
  medium:  { amplitude: 0.09, panFrac: 0.03 },
  dynamic: { amplitude: 0.13, panFrac: 0.05 },
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate an FFmpeg `zoompan` filter string for Ken Burns-style motion.
 *
 * @param clipDuration   Duration of the clip in seconds (used to floor the period).
 * @param settings       Zoom settings from the user.
 * @param faceYNorm      Optional normalised Y position (0–1) of the face centre
 *                       within the output frame.  Defaults to 0.38
 *                       (upper-middle — typical for talking-head after face crop).
 * @param outW           Output frame width in pixels (default: 1080).
 * @param outH           Output frame height in pixels (default: 1920).
 * @returns              A zoompan filter string (empty string when zoom is disabled).
 */
export function generateZoomFilter(
  clipDuration: number,
  settings: ZoomSettings,
  faceYNorm: number = 0.38,
  outW: number = 1080,
  outH: number = 1920,
  wordTimestamps?: WordTimestamp[]
): string {
  if (!settings.enabled) return ''

  const mode = settings.mode ?? 'ken-burns'

  // Jump-cut mode: hard step-function zoom changes simulating multi-cam editing
  if (mode === 'jump-cut') {
    return generateJumpCutZoomFilter(clipDuration, settings, faceYNorm, outW, outH, wordTimestamps)
  }

  // Reactive mode is not yet implemented
  if (mode !== 'ken-burns') return ''

  const { amplitude, panFrac } = INTENSITY_CONFIG[settings.intensity]

  // Full sine cycle = 2× the user's interval.  Never allow the period to
  // exceed 2× the clip duration so there is at least one visible cycle.
  const rawPeriod = settings.intervalSeconds * 2
  const period = Math.min(rawPeriod, clipDuration > 0 ? clipDuration * 2 : rawPeriod)

  const T  = period.toFixed(2)
  const A  = amplitude.toFixed(4)
  const FY = Math.max(0, Math.min(1, faceYNorm)).toFixed(3)
  const PF = panFrac.toFixed(4)

  // ── Zoom expression ────────────────────────────────────────────────────────
  // Uses cosine so zoom starts at maximum (1+A) at t=0 and descends to 1.0
  // at t=T/2, then returns to maximum at t=T.  This avoids a jarring "jump"
  // at the very first frame (the clip opens slightly zoomed in and gently
  // breathes out/in).
  //
  //   z(t) = 1 + A × (0.5 + 0.5 × cos(2π t / T))
  //        range: [1.0, 1+A]
  // The crop filter uses `t` for timestamp (not `in_time` like zoompan).
  // It also has no built-in `zoom` variable, so we inline the zoom expression
  // everywhere it's referenced.
  // Use literal PI value instead of relying on FFmpeg's built-in constant
  // which may not be available on all builds (especially Windows).
  const PI_VAL = '3.141592653589793'
  const zExpr = `1+${A}*(0.5+0.5*cos(2*${PI_VAL}*t/${T}))`

  // ── X (horizontal) expression ──────────────────────────────────────────────
  // For the crop filter, x/y represent the top-left corner of the crop window.
  // `iw/2-(iw/z/2)` centres the crop horizontally.  Since the crop filter
  // doesn't have a `zoom` variable, we inline the zoom expression as `z`.
  //
  // For medium/dynamic we add a gentle horizontal drift proportional to
  // the visible width (iw/z), offset by a quarter-phase so it feels
  // independent from the zoom rhythm.
  let xExpr: string
  if (panFrac > 0) {
    xExpr = `iw/2-(iw/(${zExpr})/2)+${PF}*(iw/(${zExpr}))*sin(2*${PI_VAL}*t/${T}+${PI_VAL}/2)`
  } else {
    xExpr = `iw/2-(iw/(${zExpr})/2)`
  }

  // ── Y (vertical) expression ────────────────────────────────────────────────
  // We want to keep the face (at normalised position FY) in view.
  // Clamp to [0, ih − ih/z] to stay within frame bounds.
  //
  // We implement clamp(ideal, 0, hi) using only abs() — a single-argument
  // function that requires no commas.  This avoids the '\,' escape that FFmpeg
  // needs inside filter option values; that escape is handled inconsistently
  // by different Windows FFmpeg builds and causes "Error opening output file:
  // Invalid argument" on the Windows packaged binary.
  //
  //   min(a, b) = (a + b - abs(a - b)) / 2   — no commas needed
  //   max(0, v) = (v + abs(v)) / 2            — no commas needed
  //
  // ideal_y = ih * FY − ih / z / 2
  // hi      = ih − ih / z          (maximum valid y so crop stays in frame)
  // y       = max(0, min(ideal_y, hi))
  const ideal = `ih*${FY}-ih/(${zExpr})/2`
  const hi    = `ih-ih/(${zExpr})`
  const minVal = `((${ideal})+(${hi})-abs((${ideal})-(${hi})))/2`
  const yExpr  = `((${minVal})+abs(${minVal}))/2`

  // ── Assemble as crop+scale instead of zoompan for much better performance ──
  // zoompan with d=1 evaluates per-frame expressions through a slow expression
  // engine. Using crop with time-based expressions + scale is significantly
  // faster because crop is a native, optimised FFmpeg filter.
  //
  // The crop filter extracts a region of size (iw/zoom × ih/zoom) from the
  // 1080×1920 input, centred at (x, y), then scale restores it to 1080×1920.
  // This produces the same visual result as zoompan but with much less overhead.
  //
  // crop width/height expressions: iw and ih refer to the input (1080×1920).
  // We divide by the zoom factor to get the visible sub-region.
  const cropW = `iw/(${zExpr})`
  const cropH = `ih/(${zExpr})`
  // crop x/y use the same expressions adapted for crop semantics
  // (crop x/y = top-left corner of the visible region)
  const cropX = xExpr
  const cropY = yExpr

  return `crop=w=${cropW}:h=${cropH}:x=${cropX}:y=${cropY},scale=${outW}:${outH}`
}

// ---------------------------------------------------------------------------
// Jump-Cut Multi-Cam Simulation
// ---------------------------------------------------------------------------

/**
 * Zoom range per intensity level for jump-cut mode.
 * Each "cut" alternates between 1.0 (wide) and a random zoom in [min, max].
 */
const JUMP_CUT_ZOOM_RANGE: Record<ZoomIntensity, { min: number; max: number }> = {
  subtle:  { min: 1.06, max: 1.10 },
  medium:  { min: 1.08, max: 1.13 },
  dynamic: { min: 1.10, max: 1.15 },
}

/**
 * Maximum horizontal crop shift in pixels (±) at each cut point.
 * Applied to the 1080-wide canvas to enhance the multi-cam illusion.
 */
const JUMP_CUT_MAX_PAN_PX = 20

/** Simple seeded PRNG (mulberry32) for deterministic per-clip randomness. */
function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Derive a deterministic seed from clip duration so same clip = same cuts. */
function clipSeed(duration: number): number {
  return Math.round(duration * 1000) ^ 0xdeadbeef
}

/**
 * Segment definition for one "shot" in the simulated multi-cam edit.
 */
interface JumpCutSegment {
  /** Start time in seconds (0-based, relative to clip start) */
  start: number
  /** End time in seconds */
  end: number
  /** Zoom factor for this segment (1.0 = wide, >1.0 = punched in) */
  zoom: number
  /** Horizontal crop offset in pixels from centre (can be negative) */
  panOffsetPx: number
}

/**
 * Compute cut points aligned to sentence boundaries when word timestamps are
 * available. A "sentence boundary" is detected after words ending in sentence-
 * ending punctuation (. ! ? …) with a pause ≥ 150ms before the next word.
 *
 * Falls back to randomised 3–5 second intervals when no word data is available.
 */
function computeJumpCutPoints(
  clipDuration: number,
  intervalSeconds: number,
  rng: () => number,
  wordTimestamps?: WordTimestamp[]
): number[] {
  const cuts: number[] = [0]

  if (wordTimestamps && wordTimestamps.length > 0) {
    // Find sentence boundaries from word timestamps
    const sentenceEnders = /[.!?…]+$/
    for (let i = 0; i < wordTimestamps.length - 1; i++) {
      const word = wordTimestamps[i]
      const next = wordTimestamps[i + 1]
      if (sentenceEnders.test(word.text.trim()) && (next.start - word.end) >= 0.15) {
        // Use the start of the next word as the cut point (clean transition)
        const cutTime = next.start
        const lastCut = cuts[cuts.length - 1]
        // Enforce minimum 2s between cuts, maximum 6s
        if (cutTime - lastCut >= 2.0 && cutTime < clipDuration - 0.5) {
          // If gap since last cut > 6s, we should have cut earlier —
          // but sentence-aligned cuts are better so we allow up to 8s
          if (cutTime - lastCut <= 8.0) {
            cuts.push(cutTime)
          }
        }
      }
    }

    // If sentence detection produced too few cuts (< 2 cuts for a long clip),
    // fill gaps > 5s with randomised cuts
    const minCuts = Math.max(2, Math.floor(clipDuration / 5))
    if (cuts.length < minCuts) {
      // Find gaps > 5s and insert random cuts
      const filled: number[] = [0]
      for (let i = 1; i < cuts.length; i++) {
        const gap = cuts[i] - filled[filled.length - 1]
        if (gap > 5.5) {
          // Insert one or more random cuts in this gap
          const nInsert = Math.floor(gap / (3 + rng() * 2))
          const segLen = gap / (nInsert + 1)
          for (let j = 1; j <= nInsert; j++) {
            filled.push(filled[filled.length - 1] + segLen)
          }
        }
        filled.push(cuts[i])
      }
      // Fill the tail gap
      const tailGap = clipDuration - filled[filled.length - 1]
      if (tailGap > 5.5) {
        const nInsert = Math.floor(tailGap / (3 + rng() * 2))
        const segLen = tailGap / (nInsert + 1)
        for (let j = 1; j <= nInsert; j++) {
          filled.push(filled[filled.length - 1] + segLen)
        }
      }
      return filled
    }
  } else {
    // No word timestamps — randomised 3–5 second intervals
    let t = 0
    while (t < clipDuration - 1.5) {
      const interval = 3 + rng() * 2 // 3–5 seconds
      t += interval
      if (t < clipDuration - 0.5) {
        cuts.push(t)
      }
    }
  }

  return cuts
}

/**
 * Build the segment list for jump-cut multi-cam simulation.
 * Alternates between 1.0 (wide shot) and a random zoomed level.
 * Each segment also gets a slight horizontal pan offset.
 */
function buildJumpCutSegments(
  clipDuration: number,
  settings: ZoomSettings,
  wordTimestamps?: WordTimestamp[]
): JumpCutSegment[] {
  const rng = mulberry32(clipSeed(clipDuration))
  const { min: zoomMin, max: zoomMax } = JUMP_CUT_ZOOM_RANGE[settings.intensity]

  const cutPoints = computeJumpCutPoints(
    clipDuration,
    settings.intervalSeconds,
    rng,
    wordTimestamps
  )

  const segments: JumpCutSegment[] = []
  for (let i = 0; i < cutPoints.length; i++) {
    const start = cutPoints[i]
    const end = i + 1 < cutPoints.length ? cutPoints[i + 1] : clipDuration

    // Alternate: even segments = wide (1.0), odd = punched in
    const isZoomed = i % 2 === 1
    const zoom = isZoomed ? zoomMin + rng() * (zoomMax - zoomMin) : 1.0

    // Random horizontal shift (only for zoomed segments to enhance the illusion)
    const panOffsetPx = isZoomed
      ? Math.round((rng() * 2 - 1) * JUMP_CUT_MAX_PAN_PX)
      : 0

    segments.push({ start, end, zoom, panOffsetPx })
  }

  return segments
}

/**
 * Generate an FFmpeg crop+scale filter with piecewise step-function zoom
 * that simulates multi-camera editing. Each segment has a constant zoom
 * level with zero easing — the viewer's brain reads each transition as
 * a camera cut, resetting attention.
 *
 * The expression uses nested `if(between(t,start,end), value, ...)` to
 * build a step function evaluated per-frame by FFmpeg's expression engine.
 * Since crop is a native filter, this is fast even with many segments.
 */
function generateJumpCutZoomFilter(
  clipDuration: number,
  settings: ZoomSettings,
  faceYNorm: number,
  outW: number,
  outH: number,
  wordTimestamps?: WordTimestamp[]
): string {
  if (clipDuration <= 0) return ''

  const segments = buildJumpCutSegments(clipDuration, settings, wordTimestamps)
  if (segments.length === 0) return ''

  const FY = Math.max(0, Math.min(1, faceYNorm)).toFixed(3)

  // ── Build piecewise zoom expression ────────────────────────────────────
  // Nested if(between(t, start, end), zoomValue, nextBranch)
  // The last segment is the fallback (no between check needed).
  const zExpr = buildStepExpr(
    segments,
    (seg) => seg.zoom.toFixed(4)
  )

  // ── Build piecewise X-offset expression ────────────────────────────────
  // Centre + per-segment horizontal shift. The offset is in pixels on the
  // input canvas (1080 wide), so we add it directly to the centre formula.
  const xExpr = buildStepExpr(
    segments,
    (seg) => {
      const centre = `iw/2-(iw/(${seg.zoom.toFixed(4)})/2)`
      if (seg.panOffsetPx === 0) return centre
      return `${centre}+${seg.panOffsetPx}`
    }
  )

  // ── Y expression (same clamped face-tracking as ken-burns) ─────────────
  // Since jump-cut zoom is constant per segment, we can simplify slightly,
  // but we still need the step function for the zoom value in y calculations.
  // We use the same abs()-based clamp to avoid commas (Windows compat).
  const yExpr = buildStepExpr(
    segments,
    (seg) => {
      const z = seg.zoom.toFixed(4)
      const ideal = `ih*${FY}-ih/(${z})/2`
      const hi = `ih-ih/(${z})`
      const minVal = `((${ideal})+(${hi})-abs((${ideal})-(${hi})))/2`
      return `((${minVal})+abs(${minVal}))/2`
    }
  )

  // Crop dimensions also need the step function zoom
  const cropW = buildStepExpr(segments, (seg) => `iw/${seg.zoom.toFixed(4)}`)
  const cropH = buildStepExpr(segments, (seg) => `ih/${seg.zoom.toFixed(4)}`)

  // Wrap each expression in single quotes so FFmpeg's option parser doesn't
  // interpret commas inside between()/if() as filter chain separators.
  // The expression evaluator receives the unquoted string and handles commas
  // as function argument delimiters correctly.
  return `crop=w='${cropW}':h='${cropH}':x='${xExpr}':y='${yExpr}',scale=${outW}:${outH}`
}

/**
 * Build a nested if(between(t,...), val, ...) step-function expression.
 *
 * For N segments the expression is:
 *   if(between(t,s0,e0), v0, if(between(t,s1,e1), v1, ... vN))
 *
 * The last segment's value is the fallback (covers end-of-clip rounding).
 *
 * Commas inside FFmpeg expression function calls (between, if, etc.) are
 * parsed by the expression evaluator, NOT the option-value parser. The
 * '\,' escaping issue only applies to the filter-chain boundary between
 * filters (e.g. `crop=...\,scale=...`). Inside a single filter's option
 * value, expression commas are safe on all platforms including Windows.
 */
function buildStepExpr(
  segments: JumpCutSegment[],
  valueFn: (seg: JumpCutSegment) => string
): string {
  if (segments.length === 1) return valueFn(segments[0])

  // Build from the last segment backwards — last segment is the fallback
  let expr = valueFn(segments[segments.length - 1])
  for (let i = segments.length - 2; i >= 0; i--) {
    const seg = segments[i]
    const s = seg.start.toFixed(3)
    const e = seg.end.toFixed(3)
    const v = valueFn(seg)
    expr = `if(between(t,${s},${e}),${v},${expr})`
  }
  return expr
}

/**
 * Derive a set of representative ZoomKeyframes for a given clip duration and
 * settings.  These are not used by FFmpeg directly (the filter uses continuous
 * expressions), but they can be useful for previews or debugging.
 */
export function getZoomKeyframes(
  clipDuration: number,
  settings: ZoomSettings,
  faceYNorm: number = 0.38
): ZoomKeyframe[] {
  if (!settings.enabled || clipDuration <= 0) return []

  const mode = settings.mode ?? 'ken-burns'

  // Jump-cut mode: one keyframe per segment (step function, no interpolation)
  if (mode === 'jump-cut') {
    const segments = buildJumpCutSegments(clipDuration, settings)
    return segments.map((seg) => ({
      time: seg.start,
      zoom: seg.zoom,
      panX: 0.5 + seg.panOffsetPx / 1080,
      panY: Math.max(0, Math.min(1, faceYNorm - 0.5 / seg.zoom)),
    }))
  }

  // Only ken-burns generates continuous preview keyframes
  if (mode !== 'ken-burns') return []

  const { amplitude, panFrac } = INTENSITY_CONFIG[settings.intensity]
  const period = Math.min(settings.intervalSeconds * 2, clipDuration * 2)
  const sampleInterval = period / 4 // quarter-phase samples
  const keyframes: ZoomKeyframe[] = []

  for (let t = 0; t <= clipDuration; t += sampleInterval) {
    const theta = (2 * Math.PI * t) / period
    const zoom = 1 + amplitude * (0.5 + 0.5 * Math.cos(theta))
    const panX = 0.5 + panFrac * Math.sin(theta + Math.PI / 2)
    const panY = Math.max(0, Math.min(1, faceYNorm - 0.5 / zoom))
    keyframes.push({ time: t, zoom, panX, panY })
  }

  return keyframes
}
