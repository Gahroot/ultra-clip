/**
 * Progress Bar Overlay
 *
 * Renders an animated thin bar (top or bottom of frame) whose width grows
 * from 0 → full frame width over the clip duration. This exploits the
 * "completion commitment" psychological effect — viewers see how much of
 * the clip is left and are significantly more likely to finish watching
 * ("it's almost done, I'll finish it").
 *
 * Implementation note: FFmpeg's `drawbox` filter evaluates its w/h/x/y
 * expressions only once at init time (in FFmpeg ≤6.x). The `t` variable
 * in drawbox refers to the box *thickness*, not the frame timestamp.
 * This means drawbox cannot animate per-frame.
 *
 * Instead, we use a filter_complex approach:
 *   1. `color` source generates a solid-color bar at full width
 *   2. `crop` filter trims the bar width per-frame using the `t` variable
 *      (crop's expressions ARE evaluated per-frame in FFmpeg ≥4.x)
 *   3. `overlay` composites the cropped bar onto the video
 *
 * The returned filter_complex string maps [0:v] → [outv] and is applied
 * as a separate re-encode pass by the overlay runner.
 *
 * Safe zone data from `safe-zones.ts` is accepted as an optional hint so
 * callers can position the bar within the platform-specific safe area rather
 * than at the raw frame edge.
 */

import type { SafeZoneRect } from '../safe-zones'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

import type { ProgressBarStyle, ProgressBarPosition } from '@shared/types'
export type { ProgressBarStyle, ProgressBarPosition }

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
 * Compute the Y-position (integer pixels) for a layer.
 *
 * @param position   'top' | 'bottom'
 * @param frameH     Output frame height (e.g. 1920)
 * @param layerH     Height of this layer in pixels
 * @param offsetUp   Additional pixels to extend upward (for glow halo above bar)
 * @param safeZone   Optional safe zone rect
 */
function computeY(
  position: ProgressBarPosition,
  frameH: number,
  layerH: number,
  offsetUp: number,
  safeZone?: SafeZoneRect
): number {
  if (safeZone) {
    if (position === 'bottom') {
      return safeZone.y + safeZone.height - layerH + offsetUp
    } else {
      return safeZone.y - offsetUp
    }
  }

  if (position === 'bottom') {
    return frameH - layerH - offsetUp
  } else {
    return -offsetUp
  }
}

/**
 * Build a comma-free FFmpeg expression for: max(1, iw * min(t/D, 1))
 *
 * This produces the animated width that grows from 1px to full frame width
 * over the clip duration. Uses algebraic identities to avoid commas:
 *   min(a,b) = (a+b-abs(a-b))/2
 *   max(a,b) = (a+b+abs(a-b))/2
 *
 * The crop filter evaluates this per-frame with `t` = frame PTS in seconds.
 */
function buildAnimatedWidthExpr(dur: string): string {
  // min(t/D, 1) without commas
  const tFrac = `t/${dur}`
  const minExpr = `(${tFrac}+1-abs(${tFrac}-1))/2`

  // iw * min(t/D, 1)
  const scaledExpr = `iw*${minExpr}`

  // max(1, iw*min(t/D,1)) without commas
  return `(1+${scaledExpr}+abs(1-${scaledExpr}))/2`
}

// ---------------------------------------------------------------------------
// buildProgressBarFilter
// ---------------------------------------------------------------------------

/**
 * Build an FFmpeg filter_complex string for the animated progress bar overlay.
 *
 * The bar's width grows from 0 to full frame width over `clipDuration` seconds
 * using the `crop` filter's per-frame `t` variable (frame PTS in seconds).
 * A `color` source generates the bar at full width, `crop` trims it per-frame,
 * and `overlay` composites it onto the video.
 *
 * The returned string is a filter_complex that maps [0:v] → [outv].
 * Returns an empty string when `config.enabled` is false or `clipDuration`
 * is zero or negative.
 *
 * @param clipDuration  Clip duration in seconds.
 * @param config        Progress bar display configuration.
 * @param frameWidth    Output frame width (e.g. 1080). Default: 1080.
 * @param frameHeight   Output frame height (e.g. 1920). Default: 1920.
 * @param safeZone      Optional safe zone rect (from `getElementPlacement`).
 * @returns             Filter_complex string ([0:v] → [outv]), or '' if disabled.
 */
export function buildProgressBarFilter(
  clipDuration: number,
  config: ProgressBarConfig,
  frameWidth: number = 1080,
  frameHeight: number = 1920,
  safeZone?: SafeZoneRect
): string {
  if (!config.enabled || clipDuration <= 0) return ''

  const { position, color, opacity, style } = config
  // Clamp height to the documented 2–8 px range
  const barH = Math.max(2, Math.min(8, Math.round(config.height)))

  // Build the duration string — avoid division by zero with a tiny floor
  const dur = Math.max(clipDuration, 0.001).toFixed(3)

  // Animated width expression (evaluated per-frame by crop filter)
  const widthExpr = buildAnimatedWidthExpr(dur)

  const mainColor = hexToFFmpegColor(color, Math.max(0, Math.min(1, opacity)))

  // Track filter_complex chains and overlay steps
  const chains: string[] = []
  let layerIndex = 0
  // The base video label starts as [0:v], then each overlay produces [_pbi{N}]
  let currentVideoLabel = '[0:v]'

  /**
   * Add a color bar layer: color source → crop → overlay onto current video.
   * Returns the new video label after the overlay.
   */
  function addBarLayer(
    layerColor: string,
    layerH: number,
    yPos: number
  ): void {
    const srcLabel = `_pbs${layerIndex}`
    const cropLabel = `_pbc${layerIndex}`
    const outLabel = `_pbi${layerIndex}`

    // Color source at full width
    chains.push(
      `color=c=${layerColor}:s=${frameWidth}x${layerH}:d=${dur}:r=30[${srcLabel}]`
    )

    // Crop to animated width (per-frame evaluation via crop filter's `t` variable)
    chains.push(
      `[${srcLabel}]crop=w='${widthExpr}':h=ih:x=0:y=0[${cropLabel}]`
    )

    // Overlay onto the current video
    chains.push(
      `${currentVideoLabel}[${cropLabel}]overlay=x=0:y=${yPos}:shortest=1[${outLabel}]`
    )

    currentVideoLabel = `[${outLabel}]`
    layerIndex++
  }

  // ── Glow layer (behind the main bar) ────────────────────────────────────
  if (style === 'glow') {
    const glowSize = Math.max(2, Math.round(barH * 1.5))
    const glowH = barH + glowSize * 2
    const glowColor = hexToFFmpegColor(color, opacity * 0.35)
    const glowY = computeY(position, frameHeight, barH, glowSize, safeZone)
    addBarLayer(glowColor, glowH, glowY)
  }

  // ── Main bar ─────────────────────────────────────────────────────────────
  const barY = computeY(position, frameHeight, barH, 0, safeZone)
  addBarLayer(mainColor, barH, barY)

  // ── Gradient highlight strip (on top of the main bar) ─────────────────
  if (style === 'gradient') {
    const highlightH = Math.max(1, Math.floor(barH / 2))
    const highlightColor = hexToFFmpegColor('#FFFFFF', 0.30)
    const highlightY = computeY(position, frameHeight, barH, 0, safeZone)
    addBarLayer(highlightColor, highlightH, highlightY)
  }

  // Rename the final overlay output to [outv]
  const lastChain = chains[chains.length - 1]
  const lastLabel = `[_pbi${layerIndex - 1}]`
  chains[chains.length - 1] = lastChain.replace(lastLabel, '[outv]')

  return chains.join(';')
}
