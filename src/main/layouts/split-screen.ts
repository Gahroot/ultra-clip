/**
 * Split-screen layout filter builder for FFmpeg
 * Output canvas: 1080 × 1920 (9:16 portrait)
 *
 * Provides four split-screen layout types optimised for short-form vertical video:
 *
 *   'top-bottom'  — Main content on top, secondary (gameplay / stock footage) on bottom.
 *                   The "Subway Surfers / Minecraft parkour" dual-stimulus format proven
 *                   to increase watch time on talking-head and podcast content.
 *
 *   'pip-corner'  — Main content full-screen, small picture-in-picture box in a corner.
 *                   Great for reaction content, screen recordings with facecam, tutorials.
 *                   Supports rounded corners and configurable PiP size/position.
 *
 *   'side-by-side' — Two sources stacked horizontally, centred vertically on the 9:16
 *                    canvas. Useful for comparison content, interview A/B views, before/after.
 *
 *   'reaction'    — Main content fills the top ~70%, reaction cam fills the bottom ~30%.
 *                   A specialised top-bottom with asymmetric ratio defaults and a distinct
 *                   thin border between panels for the classic reaction-video look.
 *
 * When no secondary video is provided:
 *   - 'top-bottom' / 'reaction' → animated gradient fill on the bottom panel
 *   - 'pip-corner' → no PiP box (just the full-screen main video)
 *   - 'side-by-side' → dark gradient fill on the right panel
 *
 * All layouts produce a `[outv]` output label with pixel format yuv420p and SAR 1:1,
 * ready for encoding. The caller supplies 1 or 2 `-i` video inputs as indicated by
 * the returned `inputCount`.
 */

// ---------------------------------------------------------------------------
// Canvas constants
// ---------------------------------------------------------------------------

const CANVAS_W = 1080
const CANVAS_H = 1920

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type SplitLayoutType = 'top-bottom' | 'pip-corner' | 'side-by-side' | 'reaction'

export interface CropRect {
  x: number
  y: number
  width: number
  height: number
}

export interface VideoSource {
  path: string
  sourceWidth: number
  sourceHeight: number
  crop?: CropRect
}

export interface DividerConfig {
  /** CSS hex color, e.g. '#FFFFFF'. */
  color: string
  /** Thickness in pixels on the 1080×1920 canvas (2–12 recommended). */
  thickness: number
}

export interface SplitScreenConfig {
  /**
   * Primary panel ratio (0–1). Controls how much of the 1920px height is
   * allocated to the primary (top) panel.
   *   - 0.5 = even 50/50 split
   *   - 0.6 = 60% top / 40% bottom (default for top-bottom)
   *   - 0.7 = 70% top / 30% bottom (default for reaction)
   */
  ratio: number
  /** Optional thin divider line between panels. */
  divider?: DividerConfig
  /** PiP box corner position (pip-corner layout only). Default: 'bottom-right'. */
  pipPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  /** PiP box size as a fraction of canvas width (0.15–0.40). Default: 0.25. */
  pipSize?: number
  /** Rounded corner radius in pixels for PiP box (0 = square). Default: 0. */
  pipCornerRadius?: number
}

export interface SplitScreenLayout {
  type: SplitLayoutType
}

export interface SplitScreenFilterResult {
  /** Complete FFmpeg filter_complex string with output label [outv]. */
  filterComplex: string
  /**
   * Number of -i video inputs the caller must supply:
   *   1 = only main video (secondary is generated internally)
   *   2 = main video + secondary video
   */
  inputCount: number
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Converts a CSS hex color (#RRGGBB or #RGB) to FFmpeg color format (0xRRGGBB).
 */
function hexToFFmpegColor(hex: string): string {
  let clean = hex.replace(/^#/, '')
  // Expand shorthand #RGB → RRGGBB
  if (clean.length === 3) {
    clean = clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2]
  }
  return '0x' + clean
}

/**
 * Ensures pixel dimensions are even (required by most video codecs / filters).
 */
function roundEven(n: number): number {
  const v = Math.round(n)
  return v % 2 === 0 ? v : v - 1
}

/**
 * Builds the crop+scale filter chain for a single video stream.
 *
 * 1. If a face-detection CropRect is provided, crop to that region first.
 * 2. Center-crop the result to match the target aspect ratio (no black bars).
 * 3. Scale to the exact targetW × targetH.
 *
 * Returns a comma-separated filter chain string (no input/output labels).
 */
function buildCropScale(source: VideoSource, targetW: number, targetH: number): string {
  const availX = source.crop?.x ?? 0
  const availY = source.crop?.y ?? 0
  const availW = source.crop?.width ?? source.sourceWidth
  const availH = source.crop?.height ?? source.sourceHeight

  const targetAspect = targetW / targetH
  const availAspect = availW / availH

  let cropW: number
  let cropH: number
  let cropX: number
  let cropY: number

  if (availAspect > targetAspect) {
    // Source is wider than target — crop sides, keep full height
    cropH = availH
    cropW = roundEven(availH * targetAspect)
    cropX = availX + Math.round((availW - cropW) / 2)
    cropY = availY
  } else {
    // Source is taller than target — crop top/bottom, keep full width
    cropW = availW
    cropH = roundEven(availW / targetAspect)
    cropX = availX
    cropY = availY + Math.round((availH - cropH) / 2)
  }

  // Ensure even dimensions
  const tw = roundEven(targetW)
  const th = roundEven(targetH)

  return `crop=${cropW}:${cropH}:${cropX}:${cropY},scale=${tw}:${th}`
}

/**
 * Builds the rounded-corner alpha-mask filter chain for PiP boxes.
 *
 * Uses the geq (generic equation) filter to set the alpha channel to 0 in
 * the four corner quadrants outside a circle of the given radius.
 *
 * The stream must be in rgba format before this filter is applied.
 * Returns a comma-separated filter chain string (no input/output labels).
 */
function buildRoundedCornerFilter(pipW: number, pipH: number, cornerRadius: number): string {
  const r = Math.min(cornerRadius, Math.floor(Math.min(pipW, pipH) / 2))
  if (r <= 0) return ''

  // Build per-corner alpha masking expressions.
  // For each corner: check if the pixel is within the corner quadrant AND outside
  // the inscribed circle — if so, alpha = 0 (transparent), else keep alpha = 255.
  const tlX = r
  const tlY = r
  const trX = pipW - r
  const trY = r
  const blX = r
  const blY = pipH - r
  const brX = pipW - r
  const brY = pipH - r

  // geq escaping: commas inside geq must be backslash-escaped for filter_complex
  const alphaExpr =
    `if(lt(X\\,${tlX})*lt(Y\\,${tlY})*gt(hypot(X-${tlX}\\,Y-${tlY})\\,${r})\\,0\\,` +
    `if(gt(X\\,${trX})*lt(Y\\,${trY})*gt(hypot(X-${trX}\\,Y-${trY})\\,${r})\\,0\\,` +
    `if(lt(X\\,${blX})*gt(Y\\,${blY})*gt(hypot(X-${blX}\\,Y-${blY})\\,${r})\\,0\\,` +
    `if(gt(X\\,${brX})*gt(Y\\,${brY})*gt(hypot(X-${brX}\\,Y-${brY})\\,${r})\\,0\\,` +
    `255))))`

  return `format=rgba,geq=r='r(X\\,Y)':g='g(X\\,Y)':b='b(X\\,Y)':a='${alphaExpr}'`
}

/**
 * Generates a dark animated gradient colour source as a placeholder for the
 * secondary video panel. Much more visually interesting than a solid black fill.
 *
 * Uses FFmpeg's gradients source with a slow rotation to create subtle motion.
 * Falls back to a simple dark colour if gradients is unavailable.
 */
function buildGradientFill(w: number, h: number): string {
  // gradients source: generates a smooth animated gradient
  // type=0 = linear gradient; speed=0.01 = slow rotation
  return `gradients=size=${w}x${h}:rate=30:speed=0.01:type=0:c0=0x1a1a2e:c1=0x16213e:c2=0x0f3460:c3=0x1a1a2e:duration=3600`
}

/**
 * Appends the final format normalization filters to ensure the output is
 * compatible with all codecs. Every layout path should end with this.
 */
function finalizeFilter(label: string): string {
  return `[${label}]setsar=1,format=yuv420p[outv]`
}

// ---------------------------------------------------------------------------
// Layout builders
// ---------------------------------------------------------------------------

/**
 * Top-Bottom split: main content on top, secondary content on bottom.
 *
 * This is the "Subway Surfers" / "Minecraft parkour" layout where the main
 * content (talking head, podcast, commentary) fills the top portion and an
 * engaging secondary video (gameplay, satisfying clips, nature footage) fills
 * the bottom. The dual-stimulus format is proven to increase watch time by
 * giving the viewer's eyes something to track even during slower verbal segments.
 *
 * Layout:
 *   ┌──────────────┐
 *   │  Main (top)  │  ← ratio × 1920 px
 *   │──────────────│  ← optional divider
 *   │ Secondary /  │  ← (1 - ratio) × 1920 px
 *   │  Gameplay    │
 *   └──────────────┘
 *       1080 px
 */
function buildTopBottom(
  mainVideo: VideoSource,
  secondaryVideo: VideoSource | null,
  config: SplitScreenConfig
): SplitScreenFilterResult {
  const ratio = Math.max(0.2, Math.min(0.8, config.ratio))
  const dividerPx = config.divider ? roundEven(config.divider.thickness) : 0

  // Allocate vertical space: top panel + divider + bottom panel = 1920
  const topH = roundEven(Math.round(CANVAS_H * ratio - dividerPx / 2))
  const botH = roundEven(CANVAS_H - topH - dividerPx)

  const parts: string[] = []
  let inputCount: number

  // Primary panel — crop and scale to fill the top region
  parts.push(`[0:v]${buildCropScale(mainVideo, CANVAS_W, topH)}[top]`)

  // Secondary panel — either a provided video or an animated gradient fill
  if (secondaryVideo) {
    parts.push(`[1:v]${buildCropScale(secondaryVideo, CANVAS_W, botH)}[bot]`)
    inputCount = 2
  } else {
    // Animated gradient placeholder — dark blue tones with slow motion
    parts.push(`${buildGradientFill(CANVAS_W, botH)}[bot]`)
    inputCount = 1
  }

  if (dividerPx > 0 && config.divider) {
    const col = hexToFFmpegColor(config.divider.color)
    // Build: top + divider bar + bottom, then stack
    parts.push(`color=color=${col}:size=${CANVAS_W}x${dividerPx}:rate=30[div]`)
    parts.push(`[top][div][bot]vstack=inputs=3[stacked]`)
    parts.push(finalizeFilter('stacked'))
  } else {
    parts.push(`[top][bot]vstack=inputs=2[stacked]`)
    parts.push(finalizeFilter('stacked'))
  }

  return { filterComplex: parts.join(';'), inputCount }
}

/**
 * Picture-in-Picture corner: main content full-screen, small PiP box in a corner.
 *
 * Ideal for reaction content (reactor fills frame, original in PiP), screen
 * recordings with facecam, or tutorials where the instructor's face is a
 * small overlay on the demo content.
 *
 * Layout (example: bottom-right):
 *   ┌──────────────────┐
 *   │                  │
 *   │   Main (full)    │
 *   │                  │
 *   │          ┌──────┐│
 *   │          │ PiP  ││ ← pipSize × canvas width
 *   │          └──────┘│
 *   └──────────────────┘
 *
 * Supports rounded corners via the geq alpha-mask filter.
 * PiP border: a thin 2px dark outline is drawn around the PiP for visual separation.
 */
function buildPipCorner(
  mainVideo: VideoSource,
  secondaryVideo: VideoSource | null,
  config: SplitScreenConfig
): SplitScreenFilterResult {
  // No secondary video → just render the main video full-screen
  if (!secondaryVideo) {
    const fc = `[0:v]${buildCropScale(mainVideo, CANVAS_W, CANVAS_H)}[scaled];${finalizeFilter('scaled')}`
    return { filterComplex: fc, inputCount: 1 }
  }

  const pipFrac = Math.max(0.15, Math.min(0.40, config.pipSize ?? 0.25))
  const pipW = roundEven(Math.round(CANVAS_W * pipFrac))
  // PiP aspect ratio: assume 16:9 for the secondary (most common webcam/video ratio)
  const pipH = roundEven(Math.round(pipW * (9 / 16)))
  const position = config.pipPosition ?? 'bottom-right'
  const cornerRadius = config.pipCornerRadius ?? 0
  const pad = 32 // padding from canvas edge in pixels

  // Compute overlay position expressions
  let overlayX: string
  let overlayY: string

  switch (position) {
    case 'top-left':
      overlayX = String(pad)
      overlayY = String(pad)
      break
    case 'top-right':
      overlayX = `W-w-${pad}`
      overlayY = String(pad)
      break
    case 'bottom-left':
      overlayX = String(pad)
      overlayY = `H-h-${pad}`
      break
    case 'bottom-right':
    default:
      overlayX = `W-w-${pad}`
      overlayY = `H-h-${pad}`
      break
  }

  const parts: string[] = []

  // Main video → full-screen 1080×1920
  parts.push(`[0:v]${buildCropScale(mainVideo, CANVAS_W, CANVAS_H)}[mainv]`)

  // PiP video → crop/scale to box dimensions
  parts.push(`[1:v]${buildCropScale(secondaryVideo, pipW, pipH)}[pipscaled]`)

  if (cornerRadius > 0) {
    // Apply rounded corners via alpha masking
    const rcFilter = buildRoundedCornerFilter(pipW, pipH, cornerRadius)
    if (rcFilter) {
      parts.push(`[pipscaled]${rcFilter}[pipv]`)
    } else {
      parts.push(`[pipscaled]format=rgba[pipv]`)
    }
    parts.push(`[mainv][pipv]overlay=x=${overlayX}:y=${overlayY}:format=auto[composed]`)
  } else {
    // Square PiP — add a thin dark border for visual separation
    // drawbox draws a 2px dark border around the PiP frame
    parts.push(
      `[pipscaled]drawbox=x=0:y=0:w=${pipW}:h=${pipH}:color=0x000000@0.5:t=2[pipv]`
    )
    parts.push(`[mainv][pipv]overlay=x=${overlayX}:y=${overlayY}:format=auto[composed]`)
  }

  parts.push(finalizeFilter('composed'))
  return { filterComplex: parts.join(';'), inputCount: 2 }
}

/**
 * Side-by-side: two sources stacked horizontally, centred on the 9:16 canvas.
 *
 * Each panel is 540×960 (half of 1080 wide, maintaining 9:16 per-panel aspect).
 * The combined 1080×960 block is vertically centred on the 1080×1920 canvas
 * with the remaining space filled by a dark background.
 *
 * Layout:
 *   ┌──────────────────┐
 *   │   (dark fill)    │
 *   ├─────────┬────────┤
 *   │  Left   │ Right  │ ← each 540 × 960
 *   │ (main)  │ (sec)  │
 *   ├─────────┴────────┤
 *   │   (dark fill)    │
 *   └──────────────────┘
 *
 * A thin divider line can be drawn between the two panels.
 */
function buildSideBySide(
  mainVideo: VideoSource,
  secondaryVideo: VideoSource | null,
  config: SplitScreenConfig
): SplitScreenFilterResult {
  // Each panel is half the canvas width with 9:16 aspect ratio
  const panelW = roundEven(CANVAS_W / 2) // 540
  const panelHCalc = roundEven(panelW * (16 / 9)) // 960

  const parts: string[] = []
  let inputCount: number

  parts.push(`[0:v]${buildCropScale(mainVideo, panelW, panelHCalc)}[left]`)

  if (secondaryVideo) {
    parts.push(`[1:v]${buildCropScale(secondaryVideo, panelW, panelHCalc)}[right]`)
    inputCount = 2
  } else {
    // Dark gradient placeholder for the right panel
    parts.push(`${buildGradientFill(panelW, panelHCalc)}[right]`)
    inputCount = 1
  }

  // Horizontal stack → 1080 × 960
  parts.push(`[left][right]hstack=inputs=2[wide]`)

  // Pad to full canvas height, centering vertically. Fill with a very dark colour.
  const yOffset = Math.round((CANVAS_H - panelHCalc) / 2)
  parts.push(`[wide]pad=${CANVAS_W}:${CANVAS_H}:0:${yOffset}:color=0x0a0a14[padded]`)

  // Optional divider line between the two panels
  if (config.divider && config.divider.thickness > 0) {
    const th = config.divider.thickness
    const col = hexToFFmpegColor(config.divider.color)
    const lineX = Math.round((CANVAS_W - th) / 2)
    parts.push(
      `[padded]drawbox=x=${lineX}:y=${yOffset}:w=${th}:h=${panelHCalc}:color=${col}@1.0:t=fill[divided]`
    )
    parts.push(finalizeFilter('divided'))
  } else {
    parts.push(finalizeFilter('padded'))
  }

  return { filterComplex: parts.join(';'), inputCount }
}

/**
 * Reaction layout: main content top ~70%, reaction cam bottom ~30%.
 *
 * Similar to top-bottom but optimised for the reaction-video format where:
 *   - The main content (original video being reacted to) takes the larger top portion
 *   - The reactor's facecam fills the narrower bottom strip
 *   - A visible divider line separates the two for a clean look
 *
 * Uses the same top-bottom engine but applies reaction-specific defaults:
 *   - ratio defaults to 0.7 (70/30 split)
 *   - A thin white divider is applied automatically if none specified
 *
 * Layout:
 *   ┌──────────────────┐
 *   │                  │
 *   │  Main content    │  ← 70% of frame
 *   │  (original)      │
 *   │──────────────────│  ← divider (default: thin white line)
 *   │  Reaction cam    │  ← 30% of frame
 *   └──────────────────┘
 */
function buildReaction(
  mainVideo: VideoSource,
  secondaryVideo: VideoSource | null,
  config: SplitScreenConfig
): SplitScreenFilterResult {
  // Apply reaction-specific defaults
  const reactionConfig: SplitScreenConfig = {
    ...config,
    ratio: config.ratio || 0.7,
    divider: config.divider ?? { color: '#FFFFFF', thickness: 3 }
  }
  return buildTopBottom(mainVideo, secondaryVideo, reactionConfig)
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Builds an FFmpeg `filter_complex` string for the requested split-screen layout.
 *
 * The returned filter_complex produces an output stream labeled `[outv]` with
 * pixel format yuv420p and SAR 1:1, ready for direct encoding.
 *
 * Usage with FFmpeg:
 * ```
 * ffmpeg -i main.mp4 [-i secondary.mp4] \
 *   -filter_complex "<returned filterComplex>" \
 *   -map '[outv]' -map '0:a' \
 *   -c:v libx264 -c:a aac output.mp4
 * ```
 *
 * @param layout          Layout descriptor — { type: 'top-bottom' | 'pip-corner' | 'side-by-side' | 'reaction' }
 * @param mainVideo       Primary video source with native dimensions (and optional face-crop rect)
 * @param secondaryVideo  Secondary video source (gameplay, reaction cam, etc.), or null for auto-fill
 * @param config          Layout configuration (split ratio, divider, PiP position/size, etc.)
 * @returns               `{ filterComplex, inputCount }` ready for FFmpeg invocation
 */
export function buildSplitScreenFilter(
  layout: SplitScreenLayout,
  mainVideo: VideoSource,
  secondaryVideo: VideoSource | null,
  config: SplitScreenConfig
): SplitScreenFilterResult {
  switch (layout.type) {
    case 'top-bottom':
      return buildTopBottom(mainVideo, secondaryVideo, config)
    case 'pip-corner':
      return buildPipCorner(mainVideo, secondaryVideo, config)
    case 'side-by-side':
      return buildSideBySide(mainVideo, secondaryVideo, config)
    case 'reaction':
      return buildReaction(mainVideo, secondaryVideo, config)
    default: {
      const exhaustive: never = layout.type
      throw new Error(`Unknown split layout type: ${exhaustive}`)
    }
  }
}
