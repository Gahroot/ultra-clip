// ---------------------------------------------------------------------------
// Segment-based render pipeline — renders each segment independently then
// concatenates with configurable transitions.
// ---------------------------------------------------------------------------
//
// Sits alongside the existing render pipeline. Invoked when a RenderClipJob
// contains a `segmentedSegments` array. Each segment gets its own layout,
// zoom, and caption treatment. Segments are concatenated via FFmpeg concat
// demuxer (hard cuts) or xfade (crossfade/flash/color-wash transitions).
// ---------------------------------------------------------------------------

import { join } from 'path'
import { unlinkSync, writeFileSync, renameSync, existsSync } from 'fs'
import { tmpdir } from 'os'
import { ffmpeg, getEncoder, getSoftwareEncoder, isGpuSessionError, getVideoMetadata } from '../ffmpeg'
import type { BrandKitRenderOptions } from './types'
import type { CaptionStyleInput } from '../captions'
import type { EmphasizedWord } from '@shared/types'
import type { ProgressBarConfig } from '../overlays/progress-bar'
import { toFFmpegPath, buildASSFilter, formatASSTimestamp } from './helpers'
import { generateCaptions } from '../captions'
import { analyzeEmphasisHeuristic } from '../word-emphasis'
import { resolveFontsDir } from '../font-registry'
import { buildCaptionBackground, buildLetterboxBars } from '../overlays/caption-background'
import { buildProgressBarFilter } from '../overlays/progress-bar'
import { applyFilterComplexPass } from './overlay-runner'
import { buildLogoOnlyFilterComplex } from './features/brand-kit.feature'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ResolvedSegment {
  /** Segment time range in source video (absolute seconds) */
  startTime: number
  endTime: number
  /** Segment style variant resolved from segment-styles.ts */
  styleVariant: SegmentStyleVariant
  /** Zoom parameters resolved from style + edit style */
  zoom: {
    style: 'none' | 'drift' | 'snap' | 'word-pulse' | 'zoom-out'
    intensity: number
  }
  /** Transition IN to this segment (hard-cut on first segment is ignored) */
  transitionIn: TransitionType
  /** Overlay text for text-based layouts */
  overlayText?: string
  /** Accent color for this segment */
  accentColor?: string
  /** Caption bg opacity for this segment */
  captionBgOpacity?: number
  /** Contextual image path (for image-based layouts) */
  imagePath?: string
  /** Per-segment face crop override */
  cropRect?: { x: number; y: number; width: number; height: number }
}

export interface SegmentRenderConfig {
  /** Source video path */
  sourceVideoPath: string
  /** Per-segment render instructions */
  segments: ResolvedSegment[]
  /** Edit style providing defaults for zoom/transition/caption bg */
  editStyle: EditStyle
  /** Target output dimensions */
  width: number
  height: number
  /** Video FPS */
  fps: number
  /** Source video metadata */
  sourceWidth: number
  sourceHeight: number
  /** Face detection crop rect (fallback when segment has none) */
  defaultCropRect?: { x: number; y: number; width: number; height: number }
  /** Word timestamps (absolute, for caption generation) */
  wordTimestamps?: { text: string; start: number; end: number }[]
  /** Word emphasis data */
  wordEmphasis?: EmphasizedWord[]
  /** Caption style */
  captionStyle?: CaptionStyleInput
  /** Whether captions are enabled */
  captionsEnabled?: boolean
  /** Brand kit settings */
  brandKit?: BrandKitRenderOptions
  /** Progress bar config */
  progressBarConfig?: ProgressBarConfig
  /** Template layout positions */
  templateLayout?: { titleText: { x: number; y: number }; subtitles: { x: number; y: number }; rehookText: { x: number; y: number } }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a crop+scale filter for a segment based on its crop rect (or default).
 */
function buildCropScaleFilter(
  seg: ResolvedSegment,
  defaultCropRect: { x: number; y: number; width: number; height: number } | undefined,
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number
): string {
  const cropRect = seg.cropRect ?? defaultCropRect

  if (cropRect) {
    const cw = Math.min(cropRect.width, sourceWidth)
    const ch = Math.min(cropRect.height, sourceHeight)
    const cx = Math.max(0, Math.min(cropRect.x, sourceWidth - cw))
    const cy = Math.max(0, Math.min(cropRect.y, sourceHeight - ch))
    return `crop=${cw}:${ch}:${cx}:${cy},scale=${targetWidth}:${targetHeight}`
  }

  // Fallback: center-crop to target aspect ratio
  const targetAspect = targetWidth / targetHeight
  const sourceAspect = sourceWidth / sourceHeight
  if (sourceAspect > targetAspect) {
    const cropWidth = Math.round(sourceHeight * targetAspect)
    const cropX = Math.round((sourceWidth - cropWidth) / 2)
    return `crop=${cropWidth}:${sourceHeight}:${cropX}:0,scale=${targetWidth}:${targetHeight}`
  } else {
    const cropHeight = Math.round(sourceWidth / targetAspect)
    const cropY = Math.round((sourceHeight - cropHeight) / 2)
    return `crop=${sourceWidth}:${cropHeight}:0:${cropY},scale=${targetWidth}:${targetHeight}`
  }
}

/**
 * Build a zoom filter for a segment based on its zoom style.
 * Returns an FFmpeg filter string or empty string for 'none'.
 */
function buildSegmentZoomFilter(
  seg: ResolvedSegment,
  segDuration: number,
  targetWidth: number,
  targetHeight: number
): string {
  const { style, intensity } = seg.zoom
  if (style === 'none' || intensity <= 1.001) return ''

  switch (style) {
    case 'snap': {
      // Instant snap-zoom: apply a constant zoom crop then scale back
      const invScale = 1 / intensity
      const newW = Math.round(targetWidth * invScale)
      const newH = Math.round(targetHeight * invScale)
      const ox = Math.round((targetWidth - newW) / 2)
      const oy = Math.round((targetHeight - newH) / 2)
      return `crop=${newW}:${newH}:${ox}:${oy},scale=${targetWidth}:${targetHeight}`
    }
    case 'drift': {
      // Gentle Ken Burns drift: slow zoom-in over the segment duration
      // nanSafe guard: at filter init t=NAN, return full frame (no zoom)
      const PI_VAL = '3.141592653589793'
      const amp = ((intensity - 1) * 0.5).toFixed(4)
      const T = Math.max(2, segDuration * 2).toFixed(2)
      const zExpr = `1+${amp}*(0.5+0.5*cos(2*${PI_VAL}*t/${T}))`
      const ns = (expr: string, fb: string): string => `if(isnan(t),${fb},${expr})`
      return [
        `crop=w='${ns(`iw/(${zExpr})`, 'iw')}':h='${ns(`ih/(${zExpr})`, 'ih')}':x='${ns(`iw/2-iw/(2*(${zExpr}))`, '0')}':y='${ns(`ih/2-ih/(2*(${zExpr}))`, '0')}'`,
        `scale=${targetWidth}:${targetHeight}`
      ].join(',')
    }
    case 'zoom-out': {
      // Start zoomed in, slowly zoom out
      const PI_VAL = '3.141592653589793'
      const amp = ((intensity - 1) * 0.5).toFixed(4)
      const T = Math.max(2, segDuration * 2).toFixed(2)
      const zExpr = `1+${amp}*(0.5-0.5*cos(2*${PI_VAL}*t/${T}))`
      const ns = (expr: string, fb: string): string => `if(isnan(t),${fb},${expr})`
      return [
        `crop=w='${ns(`iw/(${zExpr})`, 'iw')}':h='${ns(`ih/(${zExpr})`, 'ih')}':x='${ns(`iw/2-iw/(2*(${zExpr}))`, '0')}':y='${ns(`ih/2-ih/(2*(${zExpr}))`, '0')}'`,
        `scale=${targetWidth}:${targetHeight}`
      ].join(',')
    }
    case 'word-pulse': {
      // Zoom pulses tied to word emphasis — simplified as gentle breathing
      const PI_VAL = '3.141592653589793'
      const amp = ((intensity - 1) * 0.3).toFixed(4)
      const T = Math.max(1, segDuration).toFixed(2)
      const zExpr = `1+${amp}*(0.5+0.5*cos(2*${PI_VAL}*t/${T}))`
      const ns = (expr: string, fb: string): string => `if(isnan(t),${fb},${expr})`
      return [
        `crop=w='${ns(`iw/(${zExpr})`, 'iw')}':h='${ns(`ih/(${zExpr})`, 'ih')}':x='${ns(`iw/2-iw/(2*(${zExpr}))`, '0')}':y='${ns(`ih/2-ih/(2*(${zExpr}))`, '0')}'`,
        `scale=${targetWidth}:${targetHeight}`
      ].join(',')
    }
    default:
      return ''
  }
}

/**
 * Generate per-segment captions as an ASS file path.
 * Returns null if captions are disabled or no words fall in the segment range.
 */
async function generateSegmentCaptions(
  seg: ResolvedSegment,
  segStartTime: number,
  segEndTime: number,
  wordTimestamps: { text: string; start: number; end: number }[] | undefined,
  wordEmphasis: EmphasizedWord[] | undefined,
  captionStyle: CaptionStyleInput | undefined,
  captionsEnabled: boolean | undefined,
  targetWidth: number,
  targetHeight: number,
  templateLayout?: { subtitles: { x: number; y: number } }
): Promise<string | null> {
  if (!captionsEnabled || !captionStyle || !wordTimestamps) return null

  // Filter words that fall within this segment's absolute time range
  const segWords = wordTimestamps.filter(
    (w) => w.start >= segStartTime && w.end <= segEndTime
  )
  if (segWords.length === 0) return null

  // Convert to segment-local time (0-based)
  const localWordsBase = segWords.map((w) => ({
    text: w.text,
    start: w.start - segStartTime,
    end: w.end - segStartTime
  }))

  // Resolve emphasis: prefer pre-computed > heuristic
  let emphasisLevels: string[]
  if (wordEmphasis && wordEmphasis.length > 0) {
    emphasisLevels = localWordsBase.map((w) => {
      const match = wordEmphasis!.find(
        (ov) => Math.abs(ov.start - (w.start + segStartTime)) < 0.05
            || Math.abs(ov.start - w.start) < 0.05
      )
      return match?.emphasis ?? 'normal'
    })
  } else {
    const heuristic = analyzeEmphasisHeuristic(localWordsBase)
    emphasisLevels = heuristic.map((h) => h.emphasis)
  }

  const localWords = localWordsBase.map((w, idx) => ({
    ...w,
    emphasis: emphasisLevels[idx] as 'normal' | 'emphasis' | 'supersize' | 'box'
  }))

  try {
    const marginVOverride = templateLayout?.subtitles
      ? Math.round((1 - templateLayout.subtitles.y / 100) * targetHeight)
      : undefined
    return await generateCaptions(localWords, captionStyle, undefined, targetWidth, targetHeight, marginVOverride)
  } catch (err) {
    console.warn(`[SegmentRender] Failed to generate captions for segment:`, err)
    return null
  }
}

/**
 * Build overlay text ASS for a segment.
 */
function generateSegmentOverlayASS(
  text: string,
  frameWidth: number,
  frameHeight: number
): string {
  const displayDuration = 2.0
  const fadeInMs = 300
  const fadeOutMs = 400
  const yPos = Math.round(frameHeight * 0.45)

  const styleLine = `Style: SegOverlay,Arial,56,&H0000FFFF,&H0000FFFF,&H00000000,&H4D000000,-1,0,0,0,100,100,0,0,1,3,3,5,40,40,${yPos},1`
  const dialogueText = `{\\fad(${fadeInMs},${fadeOutMs})}${text}`

  const startTime = formatASSTimestamp(0)
  const endTime = formatASSTimestamp(displayDuration)

  return [
    '[Script Info]',
    'ScriptType: v4.00+',
    `PlayResX: ${frameWidth}`,
    `PlayResY: ${frameHeight}`,
    'WrapStyle: 0',
    'ScaledBorderAndShadow: yes',
    '',
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    styleLine,
    '',
    '[Events]',
    'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
    `Dialogue: 0,${startTime},${endTime},SegOverlay,,0,0,0,,${dialogueText}`,
    ''
  ].join('\n')
}

/**
 * Encode a single segment as a temp MP4 file.
 * Returns an array of temp file paths created during encoding (for cleanup).
 */
async function encodeSegment(
  config: SegmentRenderConfig,
  seg: ResolvedSegment,
  segIndex: number,
  segDuration: number,
  tempPath: string,
  onProgress: (percent: number) => void
): Promise<string[]> {
  const segmentTempFiles: string[] = []
  const fontsDir = resolveFontsDir()
  const { encoder, presetFlag } = getEncoder()
  const { width: tw, height: th, sourceWidth, sourceHeight } = config

  // Build filter chain: crop/scale → zoom → caption bg → letterbox → ASS
  const filterChain: string[] = []

  // 1. Crop + scale
  filterChain.push(buildCropScaleFilter(seg, config.defaultCropRect, sourceWidth, sourceHeight, tw, th))

  // 2. Zoom
  const zoomFilter = buildSegmentZoomFilter(seg, segDuration, tw, th)
  if (zoomFilter) filterChain.push(zoomFilter)

  // 3. Caption background
  const bgOpacity = seg.captionBgOpacity ?? config.editStyle.captionBgOpacity ?? 0
  if (bgOpacity > 0.01) {
    const bgFilter = buildCaptionBackground({ width: tw, height: th, opacity: bgOpacity })
    if (bgFilter) filterChain.push(bgFilter)
  }

  // 4. Letterbox bars
  if (config.editStyle.letterbox && config.editStyle.letterbox !== 'none') {
    const lbFilter = buildLetterboxBars({ width: tw, height: th, mode: config.editStyle.letterbox })
    if (lbFilter) filterChain.push(lbFilter)
  }

  // 5. Per-segment captions
  const captionAssPath = await generateSegmentCaptions(
    seg,
    seg.startTime,
    seg.endTime,
    config.wordTimestamps,
    config.wordEmphasis,
    config.captionStyle,
    config.captionsEnabled,
    tw,
    th,
    config.templateLayout
  )
  if (captionAssPath) {
    segmentTempFiles.push(captionAssPath)
    filterChain.push(buildASSFilter(captionAssPath, fontsDir))
  }

  // 6. Overlay text for text-based layouts
  if (seg.overlayText) {
    const overlayAss = generateSegmentOverlayASS(seg.overlayText, tw, th)
    const overlayAssPath = join(tmpdir(), `batchcontent-seg-overlay-${Date.now()}-${segIndex}.ass`)
    writeFileSync(overlayAssPath, overlayAss, 'utf-8')
    segmentTempFiles.push(overlayAssPath)
    filterChain.push(buildASSFilter(overlayAssPath, fontsDir))
  }

  const videoFilter = filterChain.join(',')

  await new Promise<void>((resolve, reject) => {
    let fallbackAttempted = false
    function runEncode(enc: string, flags: string[], useHwAccel = true): void {
      const cmd = ffmpeg(toFFmpegPath(config.sourceVideoPath))

      if (useHwAccel) {
        cmd.inputOptions(['-hwaccel', 'auto'])
      }

      cmd
        .seekInput(seg.startTime)
        .duration(segDuration)
        .videoFilters(videoFilter)
        .outputOptions([
          '-y',
          '-c:v', enc,
          ...flags,
          '-c:a', 'aac',
          '-b:a', '192k',
          '-movflags', '+faststart'
        ])
        .on('progress', (progress) => {
          onProgress(Math.min(99, progress.percent ?? 0))
        })
        .on('end', () => {
          onProgress(100)
          resolve()
        })
        .on('error', (err: Error) => {
          if (!fallbackAttempted && isGpuSessionError(err.message)) {
            fallbackAttempted = true
            const sw = getSoftwareEncoder()
            runEncode(sw.encoder, sw.presetFlag, false)
          } else {
            reject(err)
          }
        })
        .save(toFFmpegPath(tempPath))
    }

    runEncode(encoder, presetFlag)
  })

  return segmentTempFiles
}

// ---------------------------------------------------------------------------
// Concatenation
// ---------------------------------------------------------------------------

/**
 * Concatenate segment files using FFmpeg concat demuxer (stream copy, fast).
 * Used when all transitions are hard-cut (or none).
 */
async function concatWithDemuxer(
  segmentFiles: string[],
  outputPath: string,
  onProgress: (percent: number) => void
): Promise<void> {
  const listFile = join(tmpdir(), `batchcontent-seg-list-${Date.now()}.txt`)
  const listContent = segmentFiles
    .map((p) => `file '${p.replace(/'/g, "'\\''")}'`)
    .join('\n')
  writeFileSync(listFile, listContent, 'utf-8')

  try {
    await new Promise<void>((resolve, reject) => {
      ffmpeg()
        .input(listFile)
        .inputOptions(['-f', 'concat', '-safe', '0'])
        .outputOptions(['-c', 'copy', '-movflags', '+faststart', '-y'])
        .on('progress', () => onProgress(95))
        .on('end', () => {
          try { unlinkSync(listFile) } catch { /* ignore */ }
          resolve()
        })
        .on('error', (err: Error) => {
          try { unlinkSync(listFile) } catch { /* ignore */ }
          reject(err)
        })
        .save(toFFmpegPath(outputPath))
    })
  } catch {
    try { unlinkSync(listFile) } catch { /* ignore */ }
    throw new Error('Concat demuxer failed for segmented clip')
  }
}

/**
 * Get the xfade transition name for a TransitionType.
 * Returns null for hard-cut (use concat demuxer instead).
 */
function getXfadeType(transition: TransitionType): string | null {
  switch (transition) {
    case 'crossfade':
      return 'fade'
    case 'flash-cut':
      return 'fadeblack'
    case 'color-wash':
      return 'fadecolor'
    case 'hard-cut':
    case 'none':
    default:
      return null
  }
}

/**
 * Concatenate segment files using xfade filter_complex for non-hard transitions.
 * Chains segments pairwise with transition filters.
 */
async function concatWithXfade(
  segmentFiles: string[],
  transitions: TransitionType[],
  outputPath: string,
  onProgress: (percent: number) => void
): Promise<void> {
  if (segmentFiles.length === 0) throw new Error('No segments to concatenate')
  if (segmentFiles.length === 1) {
    // Single segment — just copy/rename
    const { copyFileSync } = await import('fs')
    copyFileSync(segmentFiles[0], outputPath)
    return
  }

  // Get durations of each segment file
  const durations: number[] = []
  for (const f of segmentFiles) {
    const meta = await getVideoMetadata(f)
    durations.push(meta.duration)
  }

  // Build xfade filter chain
  // xfade chains: [0][1] → [v0], then [v0][2] → [v1], etc.
  const filterParts: string[] = []
  const xfadeDuration = 0.3 // seconds for each transition

  let inputLabel = '0:v'
  let outputLabel = 'v0'
  let accumulatedDuration = durations[0]

  for (let i = 1; i < segmentFiles.length; i++) {
    const transition = transitions[i] ?? 'hard-cut'
    const xfadeType = getXfadeType(transition)

    if (xfadeType === null) {
      // Hard cut — still need to concatenate via xfade with a minimal duration
      // Use fade with 0.01s duration (essentially a hard cut in xfade chain)
      const offset = Math.max(0, accumulatedDuration - 0.01)
      filterParts.push(
        `[${inputLabel}][${i}:v]xfade=transition=fade:duration=0.01:offset=${offset.toFixed(3)}[${outputLabel}]`
      )
      accumulatedDuration += durations[i] - 0.01
    } else {
      const offset = Math.max(0, accumulatedDuration - xfadeDuration)
      let filterStr = `[${inputLabel}][${i}:v]xfade=transition=${xfadeType}:duration=${xfadeDuration.toFixed(3)}:offset=${offset.toFixed(3)}`

      if (transition === 'color-wash') {
        // color-wash: use fadecolor with custom color (currently just black)
        filterStr += ':color=black'
      }

      filterStr += `[${outputLabel}]`
      filterParts.push(filterStr)
      accumulatedDuration += durations[i] - xfadeDuration
    }

    inputLabel = outputLabel
    outputLabel = `v${i}`
  }

  // The last output label becomes [outv]
  const lastFilter = filterParts[filterParts.length - 1]
  filterParts[filterParts.length - 1] = lastFilter.replace(
    new RegExp(`\\[${outputLabel}\\]$`),
    '[outv]'
  )

  const filterComplex = filterParts.join(';')

  // Build ffmpeg command with all segment inputs
  await new Promise<void>((resolve, reject) => {
    const { encoder, presetFlag } = getEncoder()
    let fallbackAttempted = false
    let stderrOutput = ''

    function runXfade(enc: string, flags: string[], useHwAccel = true): void {
      const cmd = ffmpeg()

      if (useHwAccel) {
        cmd.inputOptions(['-hwaccel', 'auto'])
      }

      // Add each segment file as an input
      for (const f of segmentFiles) {
        cmd.input(toFFmpegPath(f))
      }

      cmd
        .outputOptions([
          '-filter_complex', filterComplex,
          '-map', '[outv]',
          '-map', '0:a',
          '-c:v', enc,
          ...flags,
          '-c:a', 'copy',
          '-movflags', '+faststart',
          '-y'
        ])
        .on('start', (cmdLine: string) => {
          console.log(`[SegmentRender] xfade command: ${cmdLine}`)
        })
        .on('stderr', (line: string) => { stderrOutput += line + '\n' })
        .on('progress', (progress) => {
          onProgress(Math.min(95, progress.percent ?? 0))
        })
        .on('end', () => resolve())
        .on('error', (err: Error) => {
          console.error(`[SegmentRender] xfade stderr:\n${stderrOutput}`)
          if (!fallbackAttempted && isGpuSessionError(err.message + '\n' + stderrOutput)) {
            fallbackAttempted = true
            const sw = getSoftwareEncoder()
            runXfade(sw.encoder, sw.presetFlag, false)
          } else {
            const stderrTail = stderrOutput.split('\n').slice(-10).join('\n')
            reject(new Error(`xfade concat failed: ${err.message}\n[stderr tail] ${stderrTail}`))
          }
        })
        .save(toFFmpegPath(outputPath))
    }

    runXfade(encoder, presetFlag)
  })
}

// ---------------------------------------------------------------------------
// Logo overlay helper
// ---------------------------------------------------------------------------

/**
 * Run a logo overlay as a separate FFmpeg pass with two inputs:
 * [0] = rendered video, [1] = logo image (looped).
 */
function runLogoOverlay(
  inputPath: string,
  logoPath: string,
  outputPath: string,
  bk: BrandKitRenderOptions,
  targetWidth: number
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const { encoder, presetFlag } = getEncoder()
    let fallbackAttempted = false
    let stderrOutput = ''

    const filterComplex = buildLogoOnlyFilterComplex('null', bk, targetWidth)

    function run(enc: string, flags: string[], useHwAccel = true): void {
      const cmd = ffmpeg(toFFmpegPath(inputPath))

      if (useHwAccel) {
        cmd.inputOptions(['-hwaccel', 'auto'])
      }

      // Add logo as second input (looped for full video duration)
      cmd.input(toFFmpegPath(logoPath)).inputOptions(['-loop', '1'])

      cmd
        .outputOptions([
          '-filter_complex', filterComplex,
          '-map', '[outv]',
          '-map', '0:a',
          '-c:v', enc,
          ...flags,
          '-c:a', 'copy',
          '-movflags', '+faststart',
          '-y'
        ])
        .on('start', (cmdLine: string) => {
          console.log(`[SegmentRender] Logo overlay command: ${cmdLine}`)
        })
        .on('stderr', (line: string) => { stderrOutput += line + '\n' })
        .on('end', () => resolve())
        .on('error', (err: Error) => {
          console.error(`[SegmentRender] Logo overlay stderr:\n${stderrOutput}`)
          if (!fallbackAttempted && isGpuSessionError(err.message + '\n' + stderrOutput)) {
            fallbackAttempted = true
            const sw = getSoftwareEncoder()
            run(sw.encoder, sw.presetFlag, false)
          } else {
            reject(err)
          }
        })
        .save(toFFmpegPath(outputPath))
    }

    run(encoder, presetFlag)
  })
}

// ---------------------------------------------------------------------------
// Main render function
// ---------------------------------------------------------------------------

/**
 * Render a segmented clip: encode each segment independently, then concatenate
 * with configurable transitions, and apply post-concat overlays.
 *
 * @param config   Per-segment render configuration.
 * @param outputPath  Destination path for the final clip.
 * @param onProgress  Progress callback (0–100).
 * @returns           Path to the rendered file (always outputPath on success).
 */
export async function renderSegmentedClip(
  config: SegmentRenderConfig,
  outputPath: string,
  onProgress: (percent: number) => void
): Promise<string> {
  const tempDir = tmpdir()
  const tempFiles: string[] = []
  const { width: tw, height: th, editStyle } = config

  // Progress allocation: 80% segments, 5% concat, 15% post-concat
  const hasPostConcat = !!(config.progressBarConfig?.enabled || config.brandKit?.logoPath)
  const segmentWeight = hasPostConcat ? 75 : 85
  const concatBase = segmentWeight
  const postConcatBase = concatBase + 5

  // Track segment output files
  const segmentOutputFiles: string[] = []
  // Track transitions (indexed by segment, transitions[0] is for first segment = ignored)
  const transitions: TransitionType[] = config.segments.map((s) => s.transitionIn)

  // Check if we need xfade (any non-hard-cut transition after first segment)
  const needsXfade = transitions.slice(1).some((t) => t !== 'hard-cut' && t !== 'none')

  try {
    // ── Phase 1: Encode each segment ──────────────────────────────────────────
    for (let i = 0; i < config.segments.length; i++) {
      const seg = config.segments[i]
      const segDuration = seg.endTime - seg.startTime
      const tempPath = join(tempDir, `batchcontent-seg-${Date.now()}-${i}.mp4`)
      tempFiles.push(tempPath)
      segmentOutputFiles.push(tempPath)

      const segProgress = (percent: number): void => {
        const weight = segmentWeight / config.segments.length
        const base = weight * i
        onProgress(Math.round(base + (percent * weight / 100)))
      }

      const segTempFiles = await encodeSegment(config, seg, i, segDuration, tempPath, segProgress)
      tempFiles.push(...segTempFiles)
    }

    onProgress(concatBase)

    // ── Phase 2: Concatenate ──────────────────────────────────────────────────
    let concatOutputPath: string
    if (hasPostConcat) {
      concatOutputPath = join(tempDir, `batchcontent-seg-concat-${Date.now()}.mp4`)
      tempFiles.push(concatOutputPath)
    } else {
      concatOutputPath = outputPath
    }

    if (needsXfade) {
      console.log(`[SegmentRender] Using xfade concat for ${config.segments.length} segments`)
      await concatWithXfade(
        segmentOutputFiles,
        transitions,
        concatOutputPath,
        (percent) => onProgress(concatBase + (percent - concatBase) * 0.05)
      )
    } else {
      console.log(`[SegmentRender] Using concat demuxer for ${config.segments.length} segments`)
      await concatWithDemuxer(
        segmentOutputFiles,
        concatOutputPath,
        (percent) => onProgress(concatBase + 3)
      )
    }

    onProgress(postConcatBase)

    // ── Phase 3: Post-concat overlays ─────────────────────────────────────────

    let currentPath = concatOutputPath

    // Progress bar overlay
    if (config.progressBarConfig?.enabled) {
      const totalDuration = config.segments.reduce((sum, s) => sum + (s.endTime - s.startTime), 0)
      const barFilter = buildProgressBarFilter(totalDuration, config.progressBarConfig, tw, th)
      if (barFilter) {
        console.log(`[SegmentRender] Applying progress bar post-concat pass`)
        const barTempPath = join(tempDir, `batchcontent-seg-bar-${Date.now()}.mp4`)
        if (currentPath !== concatOutputPath) tempFiles.push(currentPath)
        tempFiles.push(barTempPath)
        await applyFilterComplexPass(currentPath, barTempPath, barFilter)
        currentPath = barTempPath
        onProgress(92)
      }
    }

    // Brand logo overlay
    if (config.brandKit?.logoPath && existsSync(config.brandKit.logoPath)) {
      console.log(`[SegmentRender] Applying brand logo post-concat pass`)
      const logoTempPath = join(tempDir, `batchcontent-seg-logo-${Date.now()}.mp4`)
      if (currentPath !== concatOutputPath) tempFiles.push(currentPath)
      tempFiles.push(logoTempPath)

      await runLogoOverlay(currentPath, config.brandKit.logoPath, logoTempPath, config.brandKit, tw)
      currentPath = logoTempPath
      onProgress(95)
    }

    // Move final result to output path
    if (currentPath !== outputPath) {
      if (existsSync(outputPath)) {
        try { unlinkSync(outputPath) } catch { /* ignore */ }
      }
      renameSync(currentPath, outputPath)
    }

    onProgress(100)
    return outputPath
  } finally {
    // ── Cleanup all temp files ──────────────────────────────────────────────
    for (const tf of tempFiles) {
      try { unlinkSync(tf) } catch { /* ignore */ }
    }
  }
}
