/**
 * Auto-Zoom Engine — Ken Burns-style zoom/pan for rendered clips.
 *
 * Generates FFmpeg zoompan filter expressions that create subtle animated
 * zoom and pan movements every few seconds, preventing static talking-head
 * feel and boosting viewer retention.
 *
 * The filter must be inserted AFTER `scale=1080:1920` in the filter chain
 * and BEFORE any subtitle burn-in (e.g. `ass=...`).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

import type { ZoomIntensity } from '@shared/types'
export type { ZoomIntensity }

export interface ZoomSettings {
  /** Whether auto-zoom is applied to rendered clips */
  enabled: boolean
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
  outH: number = 1920
): string {
  if (!settings.enabled) return ''

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
