/**
 * Blur Background Fill layout
 *
 * For horizontal/wide videos that don't crop well to 9:16, fills the background
 * with a blurred, scaled-up mirror of the video itself instead of black bars.
 * This is the standard approach used by every major repost account and looks
 * significantly more professional than letterboxing.
 *
 * Filter chain (single video input):
 *   split → [bg] scale-to-cover → gaussian blur → optional darken/vignette/shadow → [bgfinal]
 *           [fg] scale-to-fit (letterbox) → [fgfinal]
 *   [bgfinal][fgfinal] overlay centered → setsar=1 → format=yuv420p → [outv]
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BlurIntensity = 'light' | 'medium' | 'heavy'

export interface BlurBackgroundConfig {
  /** Gaussian blur strength applied to the background fill. */
  blurIntensity: BlurIntensity
  /**
   * How much to darken the blurred background (0 = no darkening, 0.5 = very dark).
   * Useful to increase contrast between background and foreground subject.
   */
  darken: number
  /**
   * Apply a radial vignette effect to the blurred background, darkening the
   * corners and drawing the eye toward the center foreground.
   */
  vignette: boolean
  /**
   * Draw a subtle dark drop-shadow box behind the foreground video, visually
   * "lifting" it off the blurred background.
   */
  borderShadow: boolean
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maps blur intensity label → gblur sigma value. */
const BLUR_SIGMA: Record<BlurIntensity, number> = {
  light: 12,
  medium: 25,
  heavy: 40
}

/** Shadow margin in pixels on the 1080×1920 canvas. */
const SHADOW_MARGIN = 12

/** Aspect ratio match tolerance (within 5% → treated as already-portrait). */
const ASPECT_TOLERANCE = 0.05

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build the FFmpeg `filter_complex` string for the blur-background fill layout.
 *
 * @param inputWidth   Source video width in pixels (from ffprobe).
 * @param inputHeight  Source video height in pixels (from ffprobe).
 * @param outputWidth  Target canvas width  (default 1080).
 * @param outputHeight Target canvas height (default 1920).
 * @param config       Visual configuration.
 * @returns            A complete `filter_complex` string with output label `[outv]`.
 *                     Pass this string directly to `-filter_complex` in FFmpeg.
 *                     The caller must supply a single `-i <video>` input.
 */
export function buildBlurBackgroundFilter(
  inputWidth: number,
  inputHeight: number,
  outputWidth: number = 1080,
  outputHeight: number = 1920,
  config: BlurBackgroundConfig
): string {
  const W = outputWidth
  const H = outputHeight
  const inputAspect = inputWidth / inputHeight
  const targetAspect = outputWidth / outputHeight

  // -------------------------------------------------------------------------
  // Edge case: already portrait / close enough to target aspect ratio
  // Just scale directly — no blur fill needed.
  // -------------------------------------------------------------------------
  if (Math.abs(inputAspect / targetAspect - 1) < ASPECT_TOLERANCE) {
    return `[0:v]scale=${W}:${H},setsar=1,format=yuv420p[outv]`
  }

  const sigma = BLUR_SIGMA[config.blurIntensity]

  // -------------------------------------------------------------------------
  // Compute foreground dimensions after scale-to-fit
  // (needed for the optional border shadow drawbox)
  // -------------------------------------------------------------------------
  let fgW: number
  let fgH: number

  if (inputAspect > targetAspect) {
    // Wide source (e.g. 16:9) → fg fills full width, height is pillarboxed
    fgW = W
    fgH = Math.round(W / inputAspect)
  } else {
    // Tall source (taller than 9:16) → fg fills full height, width is pillarboxed
    fgH = H
    fgW = Math.round(H * inputAspect)
  }

  // Most video codecs require even dimensions
  fgW = fgW % 2 === 0 ? fgW : fgW - 1
  fgH = fgH % 2 === 0 ? fgH : fgH - 1

  // -------------------------------------------------------------------------
  // Build filter nodes
  // -------------------------------------------------------------------------

  // 1. Split the single input into two streams
  const splitFilter = `[0:v]split=2[bg][fg]`

  // 2. Background chain:
  //    scale-to-cover (fill) → crop center → gaussian blur → optional eq darken
  //    → optional vignette → optional shadow drawbox
  const bgParts: string[] = [
    `[bg]scale=${W}:${H}:force_original_aspect_ratio=increase`,
    `crop=${W}:${H}`,
    `gblur=sigma=${sigma}`
  ]

  if (config.darken > 0) {
    // eq brightness range: -1 (black) to 1 (white), 0 = no change
    const darkenAmt = -Math.min(config.darken, 0.5)
    bgParts.push(`eq=brightness=${darkenAmt.toFixed(2)}`)
  }

  if (config.vignette) {
    // FFmpeg built-in vignette filter — darkens corners radially
    bgParts.push(`vignette=angle=PI/4`)
  }

  if (config.borderShadow) {
    // Draw a semi-transparent dark rectangle slightly larger than where the
    // foreground will land, creating a drop-shadow effect.
    const shadowX = Math.round((W - fgW) / 2) - SHADOW_MARGIN
    const shadowY = Math.round((H - fgH) / 2) - SHADOW_MARGIN
    const shadowW = fgW + SHADOW_MARGIN * 2
    const shadowH = fgH + SHADOW_MARGIN * 2
    bgParts.push(
      `drawbox=x=${shadowX}:y=${shadowY}:w=${shadowW}:h=${shadowH}:color=black@0.5:t=fill`
    )
  }

  const bgChain = bgParts.join(',') + '[bgfinal]'

  // 3. Foreground chain: scale-to-fit (letterbox / pillarbox)
  const fgChain = `[fg]scale=${W}:${H}:force_original_aspect_ratio=decrease[fgfinal]`

  // 4. Overlay fg centered on bg, then normalise
  const overlayFilter = `[bgfinal][fgfinal]overlay=(W-w)/2:(H-h)/2,setsar=1,format=yuv420p[outv]`

  return [splitFilter, bgChain, fgChain, overlayFilter].join(';')
}
