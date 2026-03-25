/**
 * Progress Bar Overlay
 *
 * Renders an animated thin bar (top or bottom of frame) whose width grows
 * from 0 → full frame width over the clip duration. This exploits the
 * "completion commitment" psychological effect — viewers see how much of
 * the clip is left and are significantly more likely to finish watching
 * ("it's almost done, I'll finish it").
 *
 * Uses FFmpeg's `drawbox` filter with a time-based width expression so no
 * additional inputs or filter_complex nodes are needed — it slots cleanly
 * into the existing -vf chain alongside crops, scales, captions, and other
 * drawtext overlays.
 *
 * Safe zone data from `safe-zones.ts` is accepted as an optional hint so
 * callers can position the bar within the platform-specific safe area rather
 * than at the raw frame edge.
 */

import type { SafeZoneRect } from '../safe-zones'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Visual rendering style for the progress bar. */
export type ProgressBarStyle = 'solid' | 'gradient' | 'glow'

/** Which edge of the frame the progress bar is anchored to. */
export type ProgressBarPosition = 'top' | 'bottom'

/**
 * Full configuration for the animated progress bar overlay.
 * All pixel values are on the 1080×1920 canvas.
 */
export interface ProgressBarConfig {
  /** Whether the progress bar is burned into rendered clips. */
  enabled: boolean
  /**
   * Edge of the frame to anchor the bar to.
   *   'bottom' (default) — typically preferred; sits below captions on most platforms.
   *   'top'              — useful when captions occupy the bottom zone.
   */
  position: ProgressBarPosition
  /**
   * Bar thickness in pixels (clamped to 2–8 px). Default: 4.
   * Thinner bars (2–3 px) are subtle; thicker bars (6–8 px) are more visible
   * but may feel heavier on short clips.
   */
  height: number
  /** Bar color in CSS hex format (e.g. '#FFFFFF'). Default: '#FFFFFF'. */
  color: string
  /** Bar opacity 0–1. Default: 0.9. */
  opacity: number
  /**
   * Visual style:
   *   'solid'    — single flat color bar. Clean, minimal, works on any content.
   *   'gradient' — bar with a white top-edge highlight strip for a dimensional look.
   *   'glow'     — bar with a soft outer glow halo (extra drawbox at ~35% opacity).
   *                Adds visual prominence without increasing bar thickness.
   */
  style: ProgressBarStyle
}

// ---------------------------------------------------------------------------
// Default config
// ---------------------------------------------------------------------------

export const DEFAULT_PROGRESS_BAR_CONFIG: ProgressBarConfig = {
  enabled: false,
  position: 'bottom',
  height: 4,
  color: '#FFFFFF',
  opacity: 0.9,
  style: 'solid'
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Converts a CSS hex color string to FFmpeg's `0xRRGGBB@alpha` format.
 * Accepts 3-char (#RGB), 6-char (#RRGGBB), and 8-char (#AARRGGBB) forms.
 * Falls back to `white@alpha` for unrecognized input.
 */
function hexToFFmpegColor(hex: string, alpha: number): string {
  const h = hex.replace(/^#/, '')
  let r: number, g: number, b: number

  if (h.length === 8) {
    // 8-char: AARRGGBB — use rgb portion, override alpha with parameter
    r = parseInt(h.slice(2, 4), 16)
    g = parseInt(h.slice(4, 6), 16)
    b = parseInt(h.slice(6, 8), 16)
  } else if (h.length === 6) {
    r = parseInt(h.slice(0, 2), 16)
    g = parseInt(h.slice(2, 4), 16)
    b = parseInt(h.slice(4, 6), 16)
  } else if (h.length === 3) {
    r = parseInt(h[0] + h[0], 16)
    g = parseInt(h[1] + h[1], 16)
    b = parseInt(h[2] + h[2], 16)
  } else {
    return `white@${alpha.toFixed(2)}`
  }

  const toHex = (n: number) => n.toString(16).padStart(2, '0')
  return `0x${toHex(r)}${toHex(g)}${toHex(b)}@${alpha.toFixed(2)}`
}

/**
 * Build the FFmpeg y-position expression for the bar or glow layer.
 *
 * @param position   'top' | 'bottom'
 * @param layerH     Height of this layer in pixels
 * @param offsetUp   Additional pixels to extend upward (for glow halo above bar)
 * @param safeZone   Optional safe zone rect; when provided, anchors within the safe area
 *                   instead of the raw frame edge
 */
function buildYExpr(
  position: ProgressBarPosition,
  layerH: number,
  offsetUp: number,
  safeZone?: SafeZoneRect
): string {
  if (safeZone) {
    if (position === 'bottom') {
      // Anchor to bottom edge of safe zone, with glow extending above
      const y = safeZone.y + safeZone.height - layerH + offsetUp
      return `${y}`
    } else {
      // Anchor to top edge of safe zone, with glow extending above (into negative space)
      const y = safeZone.y - offsetUp
      return `${y}`
    }
  }

  // No safe zone: use raw frame edges
  if (position === 'bottom') {
    // ih - layerH places bottom of layer at bottom of frame
    // offsetUp shifts it upward (for glow extension above bar)
    return `ih-${layerH + offsetUp}`
  } else {
    // top: 0 minus offsetUp (may go negative — FFmpeg clips it to frame)
    return offsetUp > 0 ? `-${offsetUp}` : '0'
  }
}

// ---------------------------------------------------------------------------
// buildProgressBarFilter
// ---------------------------------------------------------------------------

/**
 * Build an FFmpeg drawbox filter string for the animated progress bar overlay.
 *
 * The bar's width grows from 0 to full frame width over `clipDuration` seconds
 * using FFmpeg's `t` (current presentation timestamp, seconds from clip start)
 * variable in the filter expression. The expression `iw*min(t/D,1)` ensures
 * the bar fills exactly at the last frame and never overflows the frame width.
 *
 * The returned string is a comma-separated sequence of drawbox filters that
 * can be appended to any -vf filter chain. Returns an empty string when
 * `config.enabled` is false or `clipDuration` is zero or negative.
 *
 * @param clipDuration  Clip duration in seconds.
 * @param config        Progress bar display configuration.
 * @param safeZone      Optional safe zone rect (from `getElementPlacement`).
 *                      When provided, anchors the bar within the safe area;
 *                      otherwise anchors to the raw frame top/bottom edge.
 * @returns             Comma-separated drawbox filter fragment, or '' if disabled.
 */
export function buildProgressBarFilter(
  clipDuration: number,
  config: ProgressBarConfig,
  safeZone?: SafeZoneRect
): string {
  if (!config.enabled || clipDuration <= 0) return ''

  const { position, color, opacity, style } = config
  // Clamp height to the documented 2–8 px range
  const barH = Math.max(2, Math.min(8, Math.round(config.height)))

  // Build the duration string — avoid division by zero with a tiny floor
  const dur = Math.max(clipDuration, 0.001).toFixed(3)

  // Width expression: grows from 0 → iw over the clip, capped at iw.
  // Rewritten to avoid commas — escaped commas (\,) break some Windows FFmpeg builds.
  // min(a,b) = (a+b-abs(a-b))/2
  const tFrac = `t/${dur}`
  const widthExpr = `iw*(${tFrac}+1-abs(${tFrac}-1))/2`

  const mainColor = hexToFFmpegColor(color, Math.max(0, Math.min(1, opacity)))
  const filters: string[] = []

  // ── Glow layer (behind the main bar) ────────────────────────────────────
  if (style === 'glow') {
    // Glow extends `glowSize` pixels beyond each side of the bar.
    // For 'bottom': glow goes above the bar. For 'top': glow goes below.
    // The part that falls outside the frame is naturally clipped by FFmpeg.
    const glowSize = Math.max(2, Math.round(barH * 1.5))
    const glowH = barH + glowSize * 2
    const glowColor = hexToFFmpegColor(color, opacity * 0.35)
    const glowY = buildYExpr(position, barH, glowSize, safeZone)

    filters.push(
      `drawbox=x=0:y=${glowY}:w='${widthExpr}':h=${glowH}:color=${glowColor}:t=fill`
    )
  }

  // ── Main bar ─────────────────────────────────────────────────────────────
  const barY = buildYExpr(position, barH, 0, safeZone)
  filters.push(
    `drawbox=x=0:y=${barY}:w='${widthExpr}':h=${barH}:color=${mainColor}:t=fill`
  )

  // ── Gradient highlight strip (on top of the main bar) ─────────────────
  if (style === 'gradient') {
    // Draw a semi-transparent white strip on the top half of the bar to
    // simulate a top-lit gradient without requiring a true gradient filter.
    const highlightH = Math.max(1, Math.floor(barH / 2))
    const highlightColor = hexToFFmpegColor('#FFFFFF', 0.30)
    // Highlight anchors to the same top edge as the bar
    const highlightY = buildYExpr(position, barH, 0, safeZone)

    filters.push(
      `drawbox=x=0:y=${highlightY}:w='${widthExpr}':h=${highlightH}:color=${highlightColor}:t=fill`
    )
  }

  return filters.join(',')
}
