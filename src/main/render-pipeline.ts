import { BrowserWindow } from 'electron'
import { join, basename, dirname, extname } from 'path'
import { existsSync, mkdirSync, unlinkSync, copyFileSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import type { FfmpegCommand } from 'fluent-ffmpeg'
import { ffmpeg, getEncoder, getSoftwareEncoder, isGpuSessionError, getVideoMetadata, type QualityParams } from './ffmpeg'
import type { SoundPlacementData, SoundDesignOptions } from './sound-design'
import { generateZoomFilter } from './auto-zoom'
import type { ZoomSettings } from './auto-zoom'
import type { OutputAspectRatio } from './aspect-ratios'
import { ASPECT_RATIO_CONFIGS, computeCenterCropForRatio } from './aspect-ratios'
import { buildHookTitleFilter, resolveHookFont, escapeDrawtext, type HookTitleConfig } from './hook-title'
import {
  buildRehookFilter,
  identifyRehookPoint,
  getDefaultRehookPhrase,
  type RehookConfig
} from './overlays/rehook'
import { buildProgressBarFilter, type ProgressBarConfig } from './overlays/progress-bar'
import { writeDescriptionFile, type ClipDescription } from './ai/description-generator'
import {
  generateRenderManifest,
  writeManifestFiles,
  type ManifestJobMeta
} from './export-manifest'
import type { BRollPlacement } from './broll-placement'
import { detectFillers, type FillerDetectionSettings } from './filler-detection'
import { buildKeepSegments, buildSelectFilter, remapWordTimestamps } from './filler-cuts'
import { generateCaptions, type CaptionStyleInput } from './captions'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Convert Windows backslash paths to forward slash paths for FFmpeg compatibility.
 * FFmpeg on Windows requires forward slashes for paths passed as command-line arguments.
 */
function toFFmpegPath(path: string): string {
  if (process.platform === 'win32') {
    return path.replace(/\\/g, '/')
  }
  return path
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type { SoundPlacementData }

export interface BrandKitRenderOptions {
  /** Absolute path to the logo image (PNG/JPG/WEBP). */
  logoPath: string | null
  logoPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  /** Fraction of frame width (0.05–0.30). */
  logoScale: number
  /** Opacity 0–1. */
  logoOpacity: number
  /** Absolute path to intro bumper video (optional). */
  introBumperPath: string | null
  /** Absolute path to outro bumper video (optional). */
  outroBumperPath: string | null
}

export interface RenderClipJob {
  clipId: string
  sourceVideoPath: string
  startTime: number
  endTime: number
  cropRegion?: {
    x: number
    y: number
    width: number
    height: number
  }
  /** Path to a pre-generated .ass subtitle file to burn in */
  assFilePath?: string
  /** Optional override for the output filename (without extension) */
  outputFileName?: string
  /** Word timestamps for sound design (relative to source video, not clip) */
  wordTimestamps?: { text: string; start: number; end: number }[]
  /**
   * Pre-computed sound placements (computed by main IPC handler from
   * wordTimestamps + soundDesign settings). If omitted or empty, no sound
   * mixing is applied.
   */
  soundPlacements?: SoundPlacementData[]
  /**
   * Brand kit settings applied to this clip. Populated by the IPC handler
   * from global RenderBatchOptions.brandKit when brand kit is enabled.
   */
  brandKit?: BrandKitRenderOptions
  /**
   * Hook title text to overlay in the first few seconds. Populated by the IPC
   * handler from ClipCandidate.hookText when hook title overlay is enabled.
   */
  hookTitleText?: string
  /**
   * Hook title display config injected from global RenderBatchOptions.hookTitleOverlay.
   * Set by startBatchRender when hookTitleOverlay.enabled is true.
   */
  hookTitleConfig?: HookTitleConfig
  /**
   * Pre-generated re-hook / pattern interrupt text for the mid-clip overlay.
   * If omitted, startBatchRender picks a deterministic default phrase.
   */
  rehookText?: string
  /**
   * Re-hook overlay display config injected from global RenderBatchOptions.rehookOverlay.
   * Set by startBatchRender when rehookOverlay.enabled is true.
   */
  rehookConfig?: RehookConfig
  /**
   * Appear time for the re-hook overlay in seconds relative to clip start (0-based).
   * Computed by startBatchRender via identifyRehookPoint.
   */
  rehookAppearTime?: number
  /**
   * Progress bar overlay config injected from global RenderBatchOptions.progressBarOverlay.
   * Set by startBatchRender when progressBarOverlay.enabled is true.
   */
  progressBarConfig?: ProgressBarConfig
  /**
   * Pre-generated description for this clip. When set, a .txt file is written
   * alongside the rendered .mp4 with platform-ready descriptions and hashtags.
   */
  description?: ClipDescription
  /**
   * B-Roll placement data for inserting stock footage overlays.
   * Pre-computed by the IPC handler using broll-placement.ts.
   * Applied as a post-processing pass after the main clip is rendered.
   */
  brollPlacements?: BRollPlacement[]
  /**
   * Loop optimization strategy applied to this clip. When set to 'crossfade'
   * and crossfadeDuration is provided, the render pipeline applies an audio
   * crossfade at the loop boundary to create a seamless loop.
   */
  loopStrategy?: string
  /**
   * Duration of the audio crossfade in seconds for loop optimization.
   * Only used when loopStrategy === 'crossfade'.
   */
  crossfadeDuration?: number
  /**
   * Per-clip overrides for global render settings. Each key controls whether
   * a specific global feature is enabled or disabled for this clip only.
   * If a key is absent, the global setting applies.
   *
   * `layout` controls whether to apply blur-background treatment instead of
   * the standard face-centred crop. When 'blur-background', the standard
   * cropRegion is ignored and the clip is rendered as a letterboxed 9:16 with
   * a blurred copy of the source filling the background.
   */
  clipOverrides?: {
    enableCaptions?: boolean
    enableHookTitle?: boolean
    enableProgressBar?: boolean
    enableAutoZoom?: boolean
    enableSoundDesign?: boolean
    enableBrandKit?: boolean
    layout?: 'default' | 'blur-background'
  }
  /**
   * Metadata used when generating the export manifest (manifest.json / manifest.csv).
   * Populated by the IPC handler from ClipCandidate data before calling startBatchRender.
   */
  manifestMeta?: {
    score: number
    reasoning: string
    transcriptText: string
    loopScore?: number
  }
}

export interface RenderStitchedClipSegment {
  startTime: number
  endTime: number
  overlayText?: string
  role?: import('./ai/clip-stitcher').SegmentRole
}

export interface RenderStitchedClipJob {
  clipId: string
  sourceVideoPath: string
  segments: RenderStitchedClipSegment[]
  cropRegion?: { x: number; y: number; width: number; height: number }
  outputFileName?: string
  hookTitleText?: string
}

export type { HookTitleConfig, RehookConfig, ProgressBarConfig }

export interface RenderBatchOptions {
  jobs: RenderClipJob[]
  outputDirectory: string
  /** Global sound design settings — used by IPC handler to compute placements */
  soundDesign?: SoundDesignOptions
  /** Ken Burns auto-zoom settings applied to every rendered clip */
  autoZoom?: ZoomSettings
  /** Brand kit (logo watermark + bumpers) applied to every rendered clip */
  brandKit?: {
    enabled: boolean
    logoPath: string | null
    logoPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
    logoScale: number
    logoOpacity: number
    introBumperPath: string | null
    outroBumperPath: string | null
  }
  /** Hook title overlay settings — draws AI-generated hook text in first few seconds */
  hookTitleOverlay?: HookTitleConfig
  /** Re-hook / pattern interrupt overlay — draws mid-clip attention-reset text */
  rehookOverlay?: RehookConfig
  /** Progress bar overlay — animated bar that fills left→right over the clip duration */
  progressBarOverlay?: ProgressBarConfig
  /** Filler & silence removal settings — detects and removes fillers/silences/repeats */
  fillerRemoval?: FillerDetectionSettings & { enabled: boolean }
  /** Caption style for re-generating captions after filler removal */
  captionStyle?: CaptionStyleInput
  /** Whether captions are enabled (needed to know whether to re-sync captions) */
  captionsEnabled?: boolean
  /**
   * Source video metadata for the export manifest. When provided, the render
   * pipeline writes manifest.json + manifest.csv to the output directory at
   * the end of each completed batch.
   */
  sourceMeta?: {
    name: string
    path: string
    duration: number
  }
  /**
   * When true, every FFmpeg command string is captured and sent back in
   * render:clipError events (always) and also logged to the error log via
   * the renderer (developer mode). Defaults to false.
   */
  developerMode?: boolean
  /**
   * Number of clips to render concurrently (1–4). For GPU encoders (NVENC/QSV)
   * the pipeline enforces a cap of 2 to avoid exhausting hardware session limits.
   * For software encoding (libx264) up to 4 concurrent renders are allowed, with
   * per-process thread count reduced proportionally to avoid CPU oversubscription.
   * Defaults to 1 (sequential).
   */
  renderConcurrency?: number
  /**
   * Render quality and output format settings. When omitted, defaults to
   * normal quality (CRF 23, 1080×1920, veryfast preset, MP4).
   */
  renderQuality?: {
    preset: 'draft' | 'normal' | 'high' | 'custom'
    customCrf: number
    outputResolution: '1080x1920' | '720x1280' | '540x960'
    outputFormat: 'mp4' | 'webm'
    encodingPreset: 'ultrafast' | 'veryfast' | 'medium' | 'slow'
  }
  /**
   * Output aspect ratio for rendered clips. Controls the canvas dimensions and
   * the fallback center-crop region. When provided, overrides the default 9:16
   * (1080×1920) canvas. Face-detected crop regions are still used when available.
   * Defaults to '9:16' when omitted.
   */
  outputAspectRatio?: OutputAspectRatio
  /**
   * Filename template for rendered clips. Supports these variables:
   *   {source}   — source video name without extension
   *   {index}    — clip number, zero-padded (01, 02, …)
   *   {score}    — AI viral score (0–100)
   *   {hook}     — hook text slugified (lowercase, spaces→hyphens, max 30 chars)
   *   {duration} — clip duration in seconds (rounded)
   *   {start}    — clip start time as MM-SS
   *   {end}      — clip end time as MM-SS
   *   {date}     — render date as YYYY-MM-DD
   *   {quality}  — render quality preset name (draft / normal / high / custom)
   *
   * Default (when omitted): '{source}_clip{index}_{score}'
   */
  filenameTemplate?: string
}

export type { ZoomSettings }

// ---------------------------------------------------------------------------
// Cancellation token
// ---------------------------------------------------------------------------

let cancelRequested = false
// Track all active FFmpeg commands across concurrent slots for cancellation
const activeCommands = new Set<FfmpegCommand>()

/** @deprecated use activeCommands — kept for internal compat in renderClip */
let activeCommand: FfmpegCommand | null = null

export function cancelRender(): void {
  cancelRequested = true
  for (const cmd of activeCommands) {
    try { cmd.kill('SIGTERM') } catch { /* ignore */ }
  }
  activeCommands.clear()
  if (activeCommand) {
    try { activeCommand.kill('SIGTERM') } catch { /* ignore */ }
    activeCommand = null
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sanitizeFilename(name: string): string {
  // Strip characters that are illegal in filenames on Windows/Linux/Mac
  return name.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').trim()
}

/**
 * Slugify a string for use inside a filename:
 * lowercase, spaces → hyphens, strip non-alphanumeric (except hyphens), collapse hyphens.
 */
function slugify(text: string, maxLen = 30): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLen)
}

/** Format seconds as MM-SS (e.g. 125 → '02-05'). */
function formatMMSS(seconds: number): string {
  const s = Math.round(seconds)
  const mm = String(Math.floor(s / 60)).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  return `${mm}-${ss}`
}

/** Zero-pad a number to at least 2 digits. */
function zeroPad(n: number): string {
  return String(n).padStart(2, '0')
}

/**
 * Resolve a filename template string with per-clip variables.
 *
 * Available variables:
 *   {source}   — source video name without extension
 *   {index}    — 1-based clip index, zero-padded (01, 02, …)
 *   {score}    — AI viral score (0–100)
 *   {hook}     — hook text slugified (lowercase, spaces→hyphens, max 30 chars)
 *   {duration} — clip duration in seconds (rounded)
 *   {start}    — clip start time as MM-SS
 *   {end}      — clip end time as MM-SS
 *   {date}     — render date as YYYY-MM-DD
 *   {quality}  — quality preset name (draft / normal / high / custom)
 *
 * Output is sanitized and truncated to 200 chars.
 */
export function resolveFilenameTemplate(
  template: string,
  variables: {
    source: string
    index: number
    score: number
    hook: string
    duration: number
    startTime: number
    endTime: number
    quality: string
  }
): string {
  const today = new Date()
  const dateStr = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0')
  ].join('-')

  const resolved = template
    .replace(/\{source\}/g, sanitizeFilename(variables.source))
    .replace(/\{index\}/g, zeroPad(variables.index))
    .replace(/\{score\}/g, String(Math.round(variables.score)))
    .replace(/\{hook\}/g, slugify(variables.hook))
    .replace(/\{duration\}/g, String(Math.round(variables.duration)))
    .replace(/\{start\}/g, formatMMSS(variables.startTime))
    .replace(/\{end\}/g, formatMMSS(variables.endTime))
    .replace(/\{date\}/g, dateStr)
    .replace(/\{quality\}/g, variables.quality)

  // Strip illegal chars, collapse whitespace, limit length
  return sanitizeFilename(resolved).replace(/\s+/g, '_').slice(0, 200) || 'clip'
}

/**
 * Resolve the effective CRF and preset from a renderQuality block.
 * Named presets override the custom fields; 'custom' uses them directly.
 */
function resolveQualityParams(rq?: RenderBatchOptions['renderQuality']): QualityParams {
  if (!rq) return { crf: 23, preset: 'veryfast' }
  switch (rq.preset) {
    case 'draft':  return { crf: 30, preset: 'ultrafast' }
    case 'high':   return { crf: 18, preset: 'medium' }
    case 'custom': return { crf: rq.customCrf, preset: rq.encodingPreset }
    case 'normal':
    default:       return { crf: 23, preset: 'veryfast' }
  }
}

/** Parse '1080x1920' → { width: 1080, height: 1920 } */
function parseResolution(res: string): { width: number; height: number } {
  const [w, h] = res.split('x').map(Number)
  return { width: w || 1080, height: h || 1920 }
}

function buildOutputPath(
  outputDirectory: string,
  job: RenderClipJob,
  index: number,
  outputFormat: 'mp4' | 'webm' = 'mp4',
  filenameTemplate?: string,
  extraVars?: { score?: number; quality?: string }
): string {
  const ext = `.${outputFormat}`
  if (job.outputFileName) {
    const name = sanitizeFilename(job.outputFileName)
    // Strip any existing extension then add the correct one
    const base = name.replace(/\.(mp4|webm)$/i, '')
    return join(outputDirectory, `${base}${ext}`)
  }
  const srcBase = basename(job.sourceVideoPath, extname(job.sourceVideoPath))
  const template = filenameTemplate ?? '{source}_clip{index}_{score}'
  const name = resolveFilenameTemplate(template, {
    source: srcBase,
    index: index + 1,
    score: extraVars?.score ?? job.manifestMeta?.score ?? 0,
    hook: job.hookTitleText ?? '',
    duration: job.endTime - job.startTime,
    startTime: job.startTime,
    endTime: job.endTime,
    quality: extraVars?.quality ?? 'normal'
  })
  return join(outputDirectory, `${name}${ext}`)
}

/**
 * Build the -vf filter string for a clip:
 *  1. crop to face-centered region (or center crop) for the target aspect ratio
 *  2. scale to output dimensions
 *  3. optionally apply Ken Burns zoom/pan (zoompan filter)
 *  4. optionally burn ASS subtitles
 *
 * The zoom filter is inserted after scale so expressions operate on the
 * final output canvas, not the raw source dimensions.
 *
 * Note: this returns only the base video filter chain. Logo overlay is handled
 * separately via filter_complex (since it requires a second input stream).
 */
function buildVideoFilter(
  job: RenderClipJob,
  sourceWidth: number,
  sourceHeight: number,
  autoZoom?: ZoomSettings,
  hookFontPath?: string | null,
  targetResolution?: { width: number; height: number },
  outputAspectRatio?: OutputAspectRatio
): string {
  const outW = targetResolution?.width ?? 1080
  const outH = targetResolution?.height ?? 1920

  // Determine the target aspect ratio for center-crop fallback.
  // When an explicit aspect ratio is given, use it; otherwise derive from outW/outH.
  const aspectRatioForCrop: OutputAspectRatio = outputAspectRatio ?? '9:16'

  let cropFilter: string

  if (job.cropRegion) {
    const { x, y, width, height } = job.cropRegion
    // Clamp values so the crop stays within the source frame
    const cw = Math.min(width, sourceWidth)
    const ch = Math.min(height, sourceHeight)
    const cx = Math.max(0, Math.min(x, sourceWidth - cw))
    const cy = Math.max(0, Math.min(y, sourceHeight - ch))
    cropFilter = `crop=${cw}:${ch}:${cx}:${cy}`
  } else {
    // Center crop to the target aspect ratio
    const { x, y, width, height } = computeCenterCropForRatio(sourceWidth, sourceHeight, aspectRatioForCrop)
    cropFilter = `crop=${width}:${height}:${x}:${y}`
  }

  const scaleFilter = `scale=${outW}:${outH}`

  // Build optional Ken Burns zoom filter (applied after scale, before subtitles)
  const clipDuration = job.endTime - job.startTime
  const zoomFilter = autoZoom ? generateZoomFilter(clipDuration, autoZoom, 0.38, outW, outH) : ''

  // Build the filter chain: crop → scale [→ zoompan] [→ ass]
  const chain: string[] = [cropFilter, scaleFilter]
  if (zoomFilter) chain.push(zoomFilter)

  if (job.assFilePath) {
    // Escape backslashes and colons for FFmpeg's filter option parser
    const escaped = job.assFilePath
      .replace(/\\/g, '\\\\')
      .replace(/:/g, '\\:')
      .replace(/'/g, "\\'")
    chain.push(`ass='${escaped}'`)
  }

  // Hook title overlay: drawtext filter(s) appended after captions so the
  // hook text appears on top of everything else in the filter chain.
  // buildHookTitleFilter returns a SEMICOLON-separated list of filter nodes
  // for multi-filter styles (top-bar = drawbox + drawtext). We join those
  // into the comma chain as individual elements.
  // DEBUG: temporarily skip drawtext to isolate "Error opening output file" root cause
  const SKIP_DRAWTEXT_DEBUG = true
  if (!SKIP_DRAWTEXT_DEBUG && job.hookTitleConfig?.enabled && job.hookTitleText) {
    const hookFilter = buildHookTitleFilter(
      job.hookTitleText,
      job.hookTitleConfig,
      hookFontPath ?? null
    )
    // Each element of hookFilter is a complete filter node (no splitting needed)
    chain.push(hookFilter)
  }

  // Re-hook overlay: drawtext (and optional drawbox) injected after hook title,
  // appearing at `rehookAppearTime` seconds into the clip to reset viewer attention.
  if (!SKIP_DRAWTEXT_DEBUG && job.rehookConfig?.enabled && job.rehookText && job.rehookAppearTime != null) {
    const rehookFilter = buildRehookFilter(
      job.rehookText,
      job.rehookConfig,
      job.rehookAppearTime,
      hookFontPath ?? null
    )
    chain.push(rehookFilter)
  }

  // Progress bar overlay: animated bar that fills left→right over the clip duration,
  // anchored to the top or bottom of the frame. Appended last so it renders on top of
  // all other overlays (captions, hook title, re-hook).
  if (job.progressBarConfig?.enabled) {
    const barFilter = buildProgressBarFilter(clipDuration, job.progressBarConfig)
    if (barFilter) chain.push(barFilter)
  }

  return chain.join(',')
}

// ---------------------------------------------------------------------------
// Logo overlay helpers
// ---------------------------------------------------------------------------

/**
 * Returns the FFmpeg overlay position expression for the given corner.
 * W/H = main video dimensions (1080×1920), w/h = overlay dimensions.
 */
function buildLogoPositionExpr(position: BrandKitRenderOptions['logoPosition']): string {
  const pad = 40
  switch (position) {
    case 'top-left':     return `x=${pad}:y=${pad}`
    case 'top-right':    return `x=W-w-${pad}:y=${pad}`
    case 'bottom-left':  return `x=${pad}:y=H-h-${pad}`
    case 'bottom-right':
    default:             return `x=W-w-${pad}:y=H-h-${pad}`
  }
}

/**
 * Build a filter_complex string that overlays a logo onto the processed video
 * (no sound design). Inputs: [0] = source video, [1] = logo image.
 */
function buildLogoOnlyFilterComplex(
  videoFilter: string,
  bk: BrandKitRenderOptions
): string {
  const logoW = Math.round(bk.logoScale * 1080)
  const opacity = bk.logoOpacity.toFixed(3)
  const posExpr = buildLogoPositionExpr(bk.logoPosition)

  return [
    `[0:v]${videoFilter}[mainv]`,
    // loop=-1:size=1 makes the single-frame image last for the full video duration
    `[1:v]loop=loop=-1:size=1:start=0,scale=${logoW}:-2,format=rgba,colorchannelmixer=aa=${opacity}[logo]`,
    `[mainv][logo]overlay=${posExpr}:format=auto[outv]`
  ].join(';')
}

// ---------------------------------------------------------------------------
// Audio filter-complex builder
// ---------------------------------------------------------------------------

/**
 * Build a filter_complex string that:
 *  - Processes the video stream (crop → scale → optional ASS subtitles → optional logo) → [outv]
 *  - Mixes original audio with optional music and SFX layers → [outa]
 *
 * Sound input indices start at 1 (input 0 is the source video).
 * Logo input index (if present) = placements.length + 1.
 */
function buildSoundFilterComplex(
  videoFilter: string,
  placements: SoundPlacementData[],
  clipDuration: number,
  logoOverlay?: { bk: BrandKitRenderOptions; inputIndex: number }
): string {
  const segments: string[] = []

  // ── Video node ─────────────────────────────────────────────────────────────
  if (logoOverlay) {
    const { bk, inputIndex } = logoOverlay
    const logoW = Math.round(bk.logoScale * 1080)
    const opacity = bk.logoOpacity.toFixed(3)
    const posExpr = buildLogoPositionExpr(bk.logoPosition)

    segments.push(`[0:v]${videoFilter}[mainv]`)
    segments.push(
      `[${inputIndex}:v]loop=loop=-1:size=1:start=0,scale=${logoW}:-2,` +
      `format=rgba,colorchannelmixer=aa=${opacity}[logo]`
    )
    segments.push(`[mainv][logo]overlay=${posExpr}:format=auto[outv]`)
  } else {
    segments.push(`[0:v]${videoFilter}[outv]`)
  }

  // ── Audio nodes ───────────────────────────────────────────────────────────
  // [0:a] = original speaker audio; additional inputs start at index 1
  const mixInputs: string[] = ['[0:a]']

  placements.forEach((p, i) => {
    const inputIdx = i + 1
    const label = `[snd${i}]`
    const vol = p.volume.toFixed(3)

    if (p.type === 'music') {
      // Loop the entire music file (size=0), trim to clip duration, apply volume
      segments.push(
        `[${inputIdx}:a]aloop=loop=1000:size=0,` +
          `atrim=0:${clipDuration.toFixed(3)},` +
          `volume=${vol}${label}`
      )
    } else {
      // SFX: delay to target timestamp, apply volume.
      // `adelay=delays=MS:all=1` applies the same delay to all channels
      const delayMs = Math.round(p.startTime * 1000)
      segments.push(
        `[${inputIdx}:a]adelay=delays=${delayMs}:all=1,volume=${vol}${label}`
      )
    }

    mixInputs.push(label)
  })

  // ── Mix node ───────────────────────────────────────────────────────────────
  if (mixInputs.length > 1) {
    // duration=first: use the original audio stream (0:a) as length reference
    // normalize=0: don't reduce volume by 1/N — preserve levels
    segments.push(
      `${mixInputs.join('')}amix=inputs=${mixInputs.length}:duration=first:normalize=0[outa]`
    )
  }

  return segments.join(';')
}

// ---------------------------------------------------------------------------
// Bumper concat
// ---------------------------------------------------------------------------

/**
 * Check if all segments have matching stream parameters (codec, resolution, fps)
 * so the concat demuxer can be used with stream copy (zero re-encoding).
 */
async function canUseConcatDemuxer(
  segmentPaths: string[]
): Promise<boolean> {
  try {
    const metadatas = await Promise.all(segmentPaths.map((p) => getVideoMetadata(p)))
    const ref = metadatas[0]
    return metadatas.every(
      (m) =>
        m.codec === ref.codec &&
        m.width === ref.width &&
        m.height === ref.height &&
        Math.round(m.fps) === Math.round(ref.fps) &&
        m.audioCodec !== 'unknown'
    )
  } catch {
    return false
  }
}

/**
 * Concatenate segments using the concat demuxer (stream copy, no re-encoding).
 * All segments must have identical codec, resolution, fps, and audio.
 */
function concatDemuxerCopy(
  segmentPaths: string[],
  finalOutputPath: string
): Promise<void> {
  const listFile = join(tmpdir(), `batchcontent-concat-${Date.now()}.txt`)
  const listContent = segmentPaths.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join('\n')
  writeFileSync(listFile, listContent, 'utf-8')

  return new Promise<void>((resolve, reject) => {
    ffmpeg()
      .input(listFile)
      .inputOptions(['-f', 'concat', '-safe', '0'])
      .outputOptions(['-c', 'copy', '-movflags', '+faststart', '-y'])
      .on('end', () => {
        try { unlinkSync(listFile) } catch { /* ignore */ }
        resolve()
      })
      .on('error', (err: Error) => {
        try { unlinkSync(listFile) } catch { /* ignore */ }
        reject(err)
      })
      .save(toFFmpegPath(finalOutputPath))
  })
}

/**
 * Concatenate optional intro/outro bumpers around the main clip.
 *
 * Fast path: if all segments have identical codec/resolution/fps/audio, uses
 * the concat demuxer with stream copy (zero re-encoding).
 *
 * Slow path: scales all segments to 1080×1920 with black letterboxing and
 * re-encodes as h264/aac to ensure codec compatibility.
 * Segments without an audio stream get a generated silence track.
 */
async function concatWithBumpers(
  mainVideoPath: string,
  finalOutputPath: string,
  introBumperPath: string | null,
  outroBumperPath: string | null
): Promise<void> {
  // Collect segments in order
  type Segment = { path: string; hasAudio: boolean }
  const segments: Segment[] = []

  if (introBumperPath && existsSync(introBumperPath)) {
    const meta = await getVideoMetadata(introBumperPath).catch(() => null)
    segments.push({ path: introBumperPath, hasAudio: !!meta && meta.audioCodec !== 'unknown' })
  }

  // Main clip is always h264/aac — it always has audio
  segments.push({ path: mainVideoPath, hasAudio: true })

  if (outroBumperPath && existsSync(outroBumperPath)) {
    const meta = await getVideoMetadata(outroBumperPath).catch(() => null)
    segments.push({ path: outroBumperPath, hasAudio: !!meta && meta.audioCodec !== 'unknown' })
  }

  if (segments.length === 1) {
    // No valid bumpers found; just move the main file to the final path
    copyFileSync(mainVideoPath, finalOutputPath)
    return
  }

  // Fast path: concat demuxer with stream copy when all segments match
  const allPaths = segments.map((s) => s.path)
  if (segments.every((s) => s.hasAudio) && await canUseConcatDemuxer(allPaths)) {
    console.log('[Bumpers] All segments match — using concat demuxer (stream copy)')
    await concatDemuxerCopy(allPaths, finalOutputPath)
    return
  }

  // Slow path: filter_complex re-encode
  console.log('[Bumpers] Segments differ — using filter_complex re-encode')
  const filterParts: string[] = []

  for (let i = 0; i < segments.length; i++) {
    // Scale to 1080×1920 with black padding to preserve aspect ratio
    filterParts.push(
      `[${i}:v]scale=1080:1920:force_original_aspect_ratio=decrease,` +
      `pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,fps=30[sv${i}]`
    )
    if (segments[i].hasAudio) {
      filterParts.push(
        `[${i}:a]aresample=48000,` +
        `aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo[sa${i}]`
      )
    } else {
      // Generate silence — concat will trim it to the video segment's duration
      filterParts.push(
        `aevalsrc=0:channel_layout=stereo:sample_rate=48000[sa${i}]`
      )
    }
  }

  const concatInputs = segments.map((_, i) => `[sv${i}][sa${i}]`).join('')
  filterParts.push(`${concatInputs}concat=n=${segments.length}:v=1:a=1[outv][outa]`)

  const filterComplex = filterParts.join(';')

  return new Promise<void>((resolve, reject) => {
    function runConcatWithEncoder(enc: string, flags: string[]): void {
      const cmd = ffmpeg()

      for (const seg of segments) {
        cmd.input(toFFmpegPath(seg.path))
      }

      cmd
        .outputOptions([
          '-filter_complex', filterComplex,
          '-filter_threads', '0',
          '-filter_complex_threads', '0',
          '-map', '[outv]',
          '-map', '[outa]',
          '-c:v', enc,
          ...flags,
          '-c:a', 'aac',
          '-b:a', '192k',
          '-movflags', '+faststart',
          '-y'
        ])
        .on('end', () => resolve())
        .on('error', (err: Error) => {
          if (isGpuSessionError(err.message)) {
            const sw = getSoftwareEncoder()
            runConcatWithEncoder(sw.encoder, sw.presetFlag)
          } else {
            reject(err)
          }
        })
        .save(toFFmpegPath(finalOutputPath))
    }

    const { encoder, presetFlag } = getEncoder()
    runConcatWithEncoder(encoder, presetFlag)
  })
}

// ---------------------------------------------------------------------------
// B-Roll overlay pass
// ---------------------------------------------------------------------------

/**
 * Composite B-Roll clips onto an already-rendered 1080×1920 video.
 * Run as a post-processing pass after the main clip render.
 *
 * Each B-Roll clip:
 *   - Is scaled/cropped to fill the 1080×1920 frame
 *   - Has 0.3s fade-in and fade-out (alpha channel)
 *   - Is enabled only during its [startTime, startTime+duration] window
 *
 * Input 0 = rendered main clip; inputs 1..N = B-Roll video files.
 * Audio is stream-copied from the main clip (B-Roll has no audio).
 */
function applyBRollOverlay(
  inputPath: string,
  placements: BRollPlacement[],
  outputPath: string
): Promise<void> {
  if (placements.length === 0) {
    copyFileSync(inputPath, outputPath)
    return Promise.resolve()
  }

  const FADE_DUR = 0.3

  const filterParts: string[] = []
  let prevLabel = '0:v'

  placements.forEach((p, i) => {
    const inputIdx = i + 1
    const brollLabel = `br${i}`
    const outLabel = i === placements.length - 1 ? 'outv' : `v${i}`

    const start = p.startTime
    const end = start + p.duration
    const fadeDur = Math.min(FADE_DUR, p.duration / 4)
    const fadeOutSt = start + p.duration - fadeDur

    // Trim to needed length, shift PTS to match the output timeline window [start, end],
    // scale/crop to 1080×1920, normalize fps, add alpha channel, apply fade in/out.
    filterParts.push(
      `[${inputIdx}:v]` +
      `trim=0:${p.duration.toFixed(3)},` +
      `setpts=PTS-STARTPTS+${start.toFixed(3)}/TB,` +
      `scale=1080:1920:force_original_aspect_ratio=increase,` +
      `crop=1080:1920,` +
      `fps=30,` +
      `format=rgba,` +
      `fade=t=in:st=${start.toFixed(3)}:d=${fadeDur.toFixed(3)}:alpha=1,` +
      `fade=t=out:st=${fadeOutSt.toFixed(3)}:d=${fadeDur.toFixed(3)}:alpha=1` +
      `[${brollLabel}]`
    )

    // Overlay the B-Roll onto the main video, enabled only in the time window.
    // eof_action=pass ensures the main video shows when B-Roll frames run out.
    filterParts.push(
      `[${prevLabel}][${brollLabel}]` +
      `overlay=0:0:eof_action=pass:format=auto:` +
      `enable='(t>=${start.toFixed(3)})*(t<=${end.toFixed(3)})'` +
      `[${outLabel}]`
    )

    prevLabel = outLabel
  })

  const filterComplex = filterParts.join(';')

  return new Promise<void>((resolve, reject) => {
    const { encoder, presetFlag } = getSoftwareEncoder() // software encoder for overlay reliability

    const cmd = ffmpeg(toFFmpegPath(inputPath))

    for (const p of placements) {
      cmd.input(toFFmpegPath(p.videoPath))
    }

    cmd
      .outputOptions([
        '-filter_complex', filterComplex,
        '-filter_threads', '0',
        '-filter_complex_threads', '0',
        '-map', '[outv]',
        '-map', '0:a',
        '-c:v', encoder,
        ...presetFlag,
        '-c:a', 'copy',
        '-movflags', '+faststart',
        '-y'
      ])
      .on('end', () => resolve())
      .on('error', reject)
      .save(toFFmpegPath(outputPath))
  })
}

// ---------------------------------------------------------------------------
// Single-clip render
// ---------------------------------------------------------------------------

function renderClip(
  job: RenderClipJob,
  outputPath: string,
  videoFilter: string,
  onProgress: (percent: number) => void,
  onCommand?: (command: string) => void,
  qualityParams?: QualityParams,
  outputFormat?: 'mp4' | 'webm'
): Promise<string> {
  console.log(`[Render] clipId=${job.clipId}`)
  console.log(`[Render] outputPath=${outputPath}`)
  console.log(`[Render] sourceVideoPath=${job.sourceVideoPath}`)
  console.log(`[Render] toFFmpegPath(outputPath)=${toFFmpegPath(outputPath)}`)

  const bk = job.brandKit
  const hasLogo = !!(bk?.logoPath && existsSync(bk.logoPath))
  const hasSoundDesign =
    Array.isArray(job.soundPlacements) && job.soundPlacements.length > 0
  const hasBumpers = !!(
    (bk?.introBumperPath && existsSync(bk.introBumperPath)) ||
    (bk?.outroBumperPath && existsSync(bk.outroBumperPath))
  )
  const useWebm = outputFormat === 'webm'

  // If bumpers are needed, render main content to a temp file first, then concat
  const mainOutputPath = hasBumpers
    ? join(tmpdir(), `batchcontent-main-${Date.now()}.mp4`)
    : outputPath

  // For WebM, use libvpx-vp9 with matching CRF (vp9 uses -crf + -b:v 0 for constrained quality)
  // GPU encoders don't support WebM; always use software for WebM
  function getVideoCodecFlags(): { encoder: string; flags: string[] } {
    if (useWebm) {
      const crf = qualityParams?.crf ?? 23
      return {
        encoder: 'libvpx-vp9',
        flags: ['-crf', String(crf), '-b:v', '0', '-cpu-used', '4']
      }
    }
    const { encoder, presetFlag } = getEncoder(qualityParams)
    return { encoder, flags: presetFlag }
  }

  function getSoftwareCodecFlags(): { encoder: string; flags: string[] } {
    if (useWebm) {
      const crf = qualityParams?.crf ?? 23
      return {
        encoder: 'libvpx-vp9',
        flags: ['-crf', String(crf), '-b:v', '0', '-cpu-used', '4']
      }
    }
    const sw = getSoftwareEncoder(qualityParams)
    return { encoder: sw.encoder, flags: sw.presetFlag }
  }

  const audioOptions = useWebm ? ['-c:a', 'libopus', '-b:a', '128k'] : ['-c:a', 'aac', '-b:a', '192k']
  const containerFlags = useWebm ? ['-y'] : ['-y', '-movflags', '+faststart']

  const renderMain = (): Promise<string> => {
    return new Promise<string>((resolve, reject) => {
      const { encoder, flags: presetFlag } = getVideoCodecFlags()

      if (hasSoundDesign) {
        // ── Sound-design path ────────────────────────────────────────────────
        const clipDuration = job.endTime - job.startTime
        const placements = job.soundPlacements!

        const logoOverlay: { bk: BrandKitRenderOptions; inputIndex: number } | undefined =
          hasLogo ? { bk: bk!, inputIndex: placements.length + 1 } : undefined

        function runWithSoundEncoder(enc: string, flags: string[]): FfmpegCommand {
          const cmd = ffmpeg(toFFmpegPath(job.sourceVideoPath))

          // Enable hardware-accelerated decoding when using NVENC
          if (enc === 'h264_nvenc') {
            cmd.inputOptions(['-hwaccel', 'auto'])
          }

          cmd
            .seekInput(job.startTime)
            .duration(clipDuration)

          // Sound placement inputs (indices 1..N)
          for (const p of placements) {
            cmd.input(toFFmpegPath(p.filePath))
          }

          // Logo input (index N+1), looped to cover full clip duration
          if (hasLogo) {
            cmd.input(toFFmpegPath(bk!.logoPath!)).inputOptions(['-loop', '1'])
          }

          const filterComplex = buildSoundFilterComplex(
            videoFilter,
            placements,
            clipDuration,
            logoOverlay
          )

          // When sound design has no logo, [outa] is in the filter graph.
          // When sound design IS present, [outa] is always produced by amix.
          // When there's only 1 audio input (no placements), we still map 0:a.
          const audioMap = hasSoundDesign ? '[outa]' : '0:a'

          cmd
            .outputOptions([
              '-filter_complex', filterComplex,
              '-filter_threads', '0',
              '-filter_complex_threads', '0',
              '-map', '[outv]',
              '-map', audioMap,
              '-c:v', enc,
              ...flags,
              ...audioOptions,
              ...containerFlags
            ])
            .on('start', (cmdLine: string) => { onCommand?.(cmdLine) })
            .on('progress', (progress) => {
              onProgress(Math.min(hasBumpers ? 85 : 99, progress.percent ?? 0))
            })
            .on('end', () => {
              onProgress(hasBumpers ? 85 : 100)
              activeCommand = null
              resolve(mainOutputPath)
            })
            .on('error', (err: Error) => {
              activeCommand = null
              if (isGpuSessionError(err.message)) {
                const { encoder: swEnc, flags: swFlags } = getSoftwareCodecFlags()
                const swCmd = runWithSoundEncoder(swEnc, swFlags)
                activeCommand = swCmd
              } else {
                reject(err)
              }
            })
            .save(toFFmpegPath(mainOutputPath))

          return cmd
        }

        const cmd = runWithSoundEncoder(encoder, presetFlag)
        activeCommand = cmd

      } else if (hasLogo) {
        // ── Logo-only path (no sound design) ────────────────────────────────
        const filterComplex = buildLogoOnlyFilterComplex(videoFilter, bk!)

        function runWithLogoEncoder(enc: string, flags: string[]): FfmpegCommand {
          const cmd = ffmpeg(toFFmpegPath(job.sourceVideoPath))

          // Enable hardware-accelerated decoding when using NVENC
          if (enc === 'h264_nvenc') {
            cmd.inputOptions(['-hwaccel', 'auto'])
          }

          cmd
            .seekInput(job.startTime)
            .duration(job.endTime - job.startTime)
            // Logo image input — loop it for the clip duration
            .input(toFFmpegPath(bk!.logoPath!))
            .inputOptions(['-loop', '1'])

          cmd
            .outputOptions([
              '-filter_complex', filterComplex,
              '-filter_threads', '0',
              '-filter_complex_threads', '0',
              '-map', '[outv]',
              '-map', '0:a',
              '-c:v', enc,
              ...flags,
              ...audioOptions,
              ...containerFlags
            ])
            .on('start', (cmdLine: string) => { onCommand?.(cmdLine) })
            .on('progress', (progress) => {
              onProgress(Math.min(hasBumpers ? 85 : 99, progress.percent ?? 0))
            })
            .on('end', () => {
              onProgress(hasBumpers ? 85 : 100)
              activeCommand = null
              resolve(mainOutputPath)
            })
            .on('error', (err: Error) => {
              activeCommand = null
              if (isGpuSessionError(err.message)) {
                const { encoder: swEnc, flags: swFlags } = getSoftwareCodecFlags()
                const swCmd = runWithLogoEncoder(swEnc, swFlags)
                activeCommand = swCmd
              } else {
                reject(err)
              }
            })
            .save(toFFmpegPath(mainOutputPath))

          return cmd
        }

        const cmd = runWithLogoEncoder(encoder, presetFlag)
        activeCommand = cmd

      } else {
        // ── Simple path: no sound mixing, no logo (existing behavior) ────────
        function runWithEncoder(enc: string, flags: string[]): FfmpegCommand {
          const cmd = ffmpeg(toFFmpegPath(job.sourceVideoPath))

          // Enable hardware-accelerated decoding when using NVENC
          if (enc === 'h264_nvenc') {
            cmd.inputOptions(['-hwaccel', 'auto'])
          }

          cmd
            .seekInput(job.startTime)
            .duration(job.endTime - job.startTime)
            .videoFilters(videoFilter)
            .outputOptions([
              '-c:v', enc,
              ...flags,
              ...audioOptions,
              ...containerFlags
            ])
            .on('start', (cmdLine: string) => { onCommand?.(cmdLine) })
            .on('progress', (progress) => {
              onProgress(Math.min(hasBumpers ? 85 : 99, progress.percent ?? 0))
            })
            .on('end', () => {
              onProgress(hasBumpers ? 85 : 100)
              activeCommand = null
              resolve(mainOutputPath)
            })
            .on('error', (err: Error) => {
              activeCommand = null
              if (isGpuSessionError(err.message)) {
                const { encoder: swEnc, flags: swFlags } = getSoftwareCodecFlags()
                const swCmd = runWithEncoder(swEnc, swFlags)
                activeCommand = swCmd
              } else {
                reject(err)
              }
            })
            .save(toFFmpegPath(mainOutputPath))

          return cmd
        }

        const cmd = runWithEncoder(encoder, presetFlag)
        activeCommand = cmd
      }
    })
  }

  if (hasBumpers) {
    return renderMain().then(async (mainPath) => {
      try {
        onProgress(88)
        await concatWithBumpers(
          mainPath,
          outputPath,
          bk?.introBumperPath ?? null,
          bk?.outroBumperPath ?? null
        )
        onProgress(100)
        return outputPath
      } finally {
        try { unlinkSync(mainPath) } catch { /* ignore cleanup errors */ }
      }
    })
  }

  return renderMain()
}

// ---------------------------------------------------------------------------
// Stitched (multi-segment) clip render
// ---------------------------------------------------------------------------

/**
 * Build a drawtext filter for per-segment overlay text (hook or rehook text).
 * Displays the text for the first 2 seconds of the segment with fade in/out.
 * Uses centered-bold style for 'hook' segments and slide-up style for 'rehook' segments.
 *
 * @param text         Overlay text to display
 * @param role         Segment role ('hook', 'rehook', or other)
 * @param fontFilePath Absolute path to a TTF/OTF font file, or null for fontconfig
 * @returns FFmpeg drawtext filter string
 */
function buildSegmentOverlayFilter(
  text: string,
  role: string | undefined,
  fontFilePath: string | null
): string {
  const safeText = escapeDrawtext(text)
  const displayDuration = 2.0
  const fadeIn = 0.3
  const fadeOut = 0.4
  const fadeOutStart = displayDuration - fadeOut

  // Alpha expression: fade in → hold → fade out
  // Uses infix operators to avoid commas — escaped commas (\,) break some Windows FFmpeg builds.
  const sFI  = fadeIn.toFixed(3)
  const sFOS = fadeOutStart.toFixed(3)
  const sDUR = displayDuration.toFixed(3)
  const sFO  = fadeOut.toFixed(3)
  const alphaExpr =
    `(t<${sFI})*t/${sFI}` +
    `+(t>=${sFI})*(t<=${sFOS})*1` +
    `+(t>${sFOS})*(${sDUR}-t)/${sFO}`

  const enableExpr = `enable=(t<${sDUR})`

  const fontRef = fontFilePath
    ? `fontfile='${fontFilePath.replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, "\\'")}'`
    : `font='Sans Bold'`

  if (role === 'hook') {
    // Centered-bold style (large, centered, white with black outline)
    return (
      `drawtext=${fontRef}:` +
      `text='${safeText}':` +
      `fontsize=72:fontcolor=white@${alphaExpr}:` +
      `borderw=4:bordercolor=black@${alphaExpr}:` +
      `x=(w-tw)/2:y=(h-th)/2:` +
      `${enableExpr}`
    )
  }

  // Rehook / default style: smaller, positioned at lower-third
  const yPos = Math.round(1920 * 0.45)
  return (
    `drawtext=${fontRef}:` +
    `text='${safeText}':` +
    `fontsize=56:fontcolor=yellow@${alphaExpr}:` +
    `borderw=3:bordercolor=black@${alphaExpr}:` +
    `x=(w-tw)/2:y=${yPos}:` +
    `${enableExpr}`
  )
}

/**
 * Render a stitched (multi-segment) clip by:
 * 1. Extracting each segment into a temp file (cropped + scaled to 1080×1920)
 *    — optionally with per-segment overlay text burned in
 * 2. Concatenating all segments using the concat demuxer (stream copy)
 * 3. Cleaning up temp files
 */
export async function renderStitchedClip(
  job: RenderStitchedClipJob,
  outputPath: string,
  onProgress: (percent: number) => void
): Promise<string> {
  const tempDir = tmpdir()
  const tempFiles: string[] = []
  const { encoder, presetFlag } = getEncoder()

  // Get source video metadata for crop/scale
  const meta = await getVideoMetadata(job.sourceVideoPath)

  // Resolve font once for overlay text (if any segment has overlayText)
  const hasOverlays = job.segments.some((s) => s.overlayText)
  let overlayFontPath: string | null = null
  if (hasOverlays) {
    overlayFontPath = await resolveHookFont()
  }

  try {
    // ── Step 1: Extract each segment as a temp file ───────────────────────
    for (let i = 0; i < job.segments.length; i++) {
      const seg = job.segments[i]
      const tempPath = join(tempDir, `batchcontent-stitch-${Date.now()}-${i}.mp4`)
      tempFiles.push(tempPath)

      const segProgress = (percent: number): void => {
        const segWeight = 85 / job.segments.length
        const base = segWeight * i
        onProgress(Math.round(base + (percent * segWeight / 100)))
      }

      // Build crop + scale filter for this segment
      let cropFilter: string
      if (job.cropRegion) {
        const { x, y, width, height } = job.cropRegion
        const cw = Math.min(width, meta.width)
        const ch = Math.min(height, meta.height)
        const cx = Math.max(0, Math.min(x, meta.width - cw))
        const cy = Math.max(0, Math.min(y, meta.height - ch))
        cropFilter = `crop=${cw}:${ch}:${cx}:${cy}`
      } else {
        const targetAspect = 9 / 16
        const sourceAspect = meta.width / meta.height
        if (sourceAspect > targetAspect) {
          const cropWidth = Math.round(meta.height * targetAspect)
          const cropX = Math.round((meta.width - cropWidth) / 2)
          cropFilter = `crop=${cropWidth}:${meta.height}:${cropX}:0`
        } else {
          const cropHeight = Math.round(meta.width / targetAspect)
          const cropY = Math.round((meta.height - cropHeight) / 2)
          cropFilter = `crop=${meta.width}:${cropHeight}:0:${cropY}`
        }
      }

      // Build video filter chain: crop → scale [→ overlay text]
      const filterChain: string[] = [cropFilter, 'scale=1080:1920']

      // Add per-segment overlay text if present
      if (seg.overlayText) {
        const overlayFilter = buildSegmentOverlayFilter(
          seg.overlayText,
          seg.role,
          overlayFontPath
        )
        filterChain.push(overlayFilter)
      }

      const videoFilter = filterChain.join(',')
      const segDuration = seg.endTime - seg.startTime

      await new Promise<void>((resolve, reject) => {
        function runSegmentEncode(enc: string, flags: string[]): void {
          const cmd = ffmpeg(toFFmpegPath(job.sourceVideoPath))

          if (enc === 'h264_nvenc') {
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
              segProgress(Math.min(99, progress.percent ?? 0))
            })
            .on('end', () => {
              segProgress(100)
              resolve()
            })
            .on('error', (err: Error) => {
              if (isGpuSessionError(err.message)) {
                const sw = getSoftwareEncoder()
                runSegmentEncode(sw.encoder, sw.presetFlag)
              } else {
                reject(err)
              }
            })
            .save(toFFmpegPath(tempPath))
        }

        runSegmentEncode(encoder, presetFlag)
      })
    }

    onProgress(85)

    // ── Step 2: Concatenate using concat demuxer ──────────────────────────
    const listFile = join(tempDir, `batchcontent-stitch-list-${Date.now()}.txt`)
    const listContent = tempFiles.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join('\n')
    writeFileSync(listFile, listContent, 'utf-8')

    await new Promise<void>((resolve, reject) => {
      ffmpeg()
        .input(listFile)
        .inputOptions(['-f', 'concat', '-safe', '0'])
        .outputOptions(['-c', 'copy', '-movflags', '+faststart', '-y'])
        .on('progress', () => onProgress(92))
        .on('end', () => {
          try { unlinkSync(listFile) } catch { /* ignore */ }
          onProgress(100)
          resolve()
        })
        .on('error', (err: Error) => {
          try { unlinkSync(listFile) } catch { /* ignore */ }
          reject(err)
        })
        .save(toFFmpegPath(outputPath))
    })

    return outputPath
  } finally {
    // ── Step 3: Cleanup temp files ────────────────────────────────────────
    for (const tf of tempFiles) {
      try { unlinkSync(tf) } catch { /* ignore */ }
    }
  }
}

// ---------------------------------------------------------------------------
// Batch render
// ---------------------------------------------------------------------------

export async function startBatchRender(
  options: RenderBatchOptions,
  window: BrowserWindow
): Promise<void> {
  cancelRequested = false
  activeCommand = null

  const { jobs, outputDirectory } = options
  const total = jobs.length

  // Ensure output directory exists
  if (!existsSync(outputDirectory)) {
    mkdirSync(outputDirectory, { recursive: true })
  }

  // Inject brand kit into each job when brand kit is enabled globally.
  // Per-clip override `enableBrandKit: false` suppresses brand kit for that clip.
  if (options.brandKit?.enabled) {
    const bk = options.brandKit
    for (const job of jobs) {
      const override = job.clipOverrides?.enableBrandKit
      const brandKitEnabled = override === undefined ? true : override
      if (brandKitEnabled) {
        job.brandKit = {
          logoPath: bk.logoPath,
          logoPosition: bk.logoPosition,
          logoScale: bk.logoScale,
          logoOpacity: bk.logoOpacity,
          introBumperPath: bk.introBumperPath,
          outroBumperPath: bk.outroBumperPath
        }
      }
    }
  }
  // Per-clip override `enableBrandKit: true` enables brand kit for a clip even when global is off
  if (!options.brandKit?.enabled && options.brandKit) {
    const bk = options.brandKit
    for (const job of jobs) {
      if (job.clipOverrides?.enableBrandKit === true) {
        job.brandKit = {
          logoPath: bk.logoPath,
          logoPosition: bk.logoPosition,
          logoScale: bk.logoScale,
          logoOpacity: bk.logoOpacity,
          introBumperPath: bk.introBumperPath,
          outroBumperPath: bk.outroBumperPath
        }
      }
    }
  }

  // Resolve font once for the entire batch (shared by hook title and re-hook)
  let hookFontPath: string | null = null
  const anyHookTitle = jobs.some((j) => {
    const ov = j.clipOverrides?.enableHookTitle
    return ov === undefined ? options.hookTitleOverlay?.enabled : ov
  })
  const anyRehook = jobs.some((j) => {
    const ov = j.clipOverrides?.enableHookTitle
    return ov === undefined ? options.rehookOverlay?.enabled : ov
  })
  if (anyHookTitle || anyRehook) {
    hookFontPath = await resolveHookFont()
    console.log(`[Overlays] Font resolved: ${hookFontPath ?? 'system default (fontconfig)'}`)
  }

  // Inject hook title config into each job when hook title overlay is enabled globally.
  // Per-clip override `enableHookTitle` controls whether the overlay appears on that clip.
  for (const job of jobs) {
    const ov = job.clipOverrides?.enableHookTitle
    const hookEnabled = ov === undefined ? (options.hookTitleOverlay?.enabled ?? false) : ov
    if (hookEnabled && options.hookTitleOverlay) {
      job.hookTitleConfig = options.hookTitleOverlay
      if (!job.hookTitleText) {
        console.warn(`[HookTitle] Clip ${job.clipId} has no hookTitleText — hook overlay will be skipped`)
      }
    }
  }

  // Inject re-hook config and compute appear times when re-hook overlay is enabled globally.
  // Per-clip override `enableHookTitle` (reused for rehook feature toggle) also controls this.
  if (options.rehookOverlay?.enabled) {
    for (const job of jobs) {
      const ov = job.clipOverrides?.enableHookTitle
      const hookEnabled = ov === undefined ? true : ov
      if (!hookEnabled) continue

      job.rehookConfig = options.rehookOverlay

      // Identify optimal appear time using word timestamps if available
      const clipWords = (job.wordTimestamps ?? []).filter(
        (w) => w.start >= job.startTime && w.end <= job.endTime
      )
      const absoluteRehookPoint = identifyRehookPoint(
        clipWords,
        job.startTime,
        job.endTime,
        options.rehookOverlay.positionFraction
      )
      // Convert absolute source timestamp → clip-relative (0-based) time
      job.rehookAppearTime = absoluteRehookPoint - job.startTime

      // Use pre-set text if provided (e.g. AI-generated ahead of render);
      // otherwise pick a deterministic default phrase from the curated list.
      if (!job.rehookText) {
        job.rehookText = getDefaultRehookPhrase(job.clipId)
      }

      console.log(
        `[Rehook] Clip ${job.clipId}: appear at ${job.rehookAppearTime.toFixed(2)}s — "${job.rehookText}"`
      )
    }
  }

  // Inject progress bar config into each job when progress bar overlay is enabled globally.
  // Per-clip override `enableProgressBar` controls whether the bar appears on that clip.
  for (const job of jobs) {
    const ov = job.clipOverrides?.enableProgressBar
    const barEnabled = ov === undefined ? (options.progressBarOverlay?.enabled ?? false) : ov
    if (barEnabled && options.progressBarOverlay) {
      job.progressBarConfig = options.progressBarOverlay
    }
  }
  if (options.progressBarOverlay?.enabled) {
    console.log(
      `[ProgressBar] Overlay enabled — position: ${options.progressBarOverlay.position}, ` +
      `height: ${options.progressBarOverlay.height}px, style: ${options.progressBarOverlay.style}`
    )
  }

  // ── Filler removal pre-processing ──────────────────────────────────────────
  // When filler removal is enabled and word timestamps are available, detect
  // filler segments and re-generate captions with adjusted timestamps BEFORE
  // the main render loop. This ensures captions stay in sync with the edited
  // audio. The select/aselect filter is NOT used here — instead, the filler
  // segments are encoded into the concat demuxer approach: each keep-segment
  // is rendered individually, then concatenated. However, for simplicity and
  // reliability, we use FFmpeg's trim+concat filter approach in a pre-pass
  // that creates a "clean" intermediate file, then the normal render pipeline
  // operates on the intermediate file instead of the original source.
  //
  // For the initial implementation, we take a simpler approach: we re-write
  // the ASS captions with remapped timestamps, and pass the filler-aware
  // select/aselect filters as part of the video filter chain. This avoids
  // needing to create intermediate files.
  if (options.fillerRemoval?.enabled) {
    const fr = options.fillerRemoval
    const detectionSettings = {
      removeFillerWords: fr.removeFillerWords,
      trimSilences: fr.trimSilences,
      removeRepeats: fr.removeRepeats,
      silenceThreshold: fr.silenceThreshold,
      silenceTargetGap: 0.15,
      fillerWords: fr.fillerWords
    }

    for (const job of jobs) {
      const words = job.wordTimestamps ?? []
      if (words.length === 0) {
        console.log(`[FillerRemoval] Clip ${job.clipId}: no word timestamps — skipping`)
        continue
      }

      // Detect fillers within this clip's word range
      const clipWords = words.filter(
        (w) => w.start >= job.startTime && w.end <= job.endTime
      )
      if (clipWords.length === 0) continue

      const detection = detectFillers(clipWords, detectionSettings)
      if (detection.segments.length === 0) {
        console.log(`[FillerRemoval] Clip ${job.clipId}: no fillers detected`)
        continue
      }

      console.log(
        `[FillerRemoval] Clip ${job.clipId}: found ${detection.segments.length} segments ` +
        `(${detection.counts.filler} fillers, ${detection.counts.silence} silences, ` +
        `${detection.counts.repeat} repeats) — saving ${detection.timeSaved.toFixed(1)}s`
      )

      // Re-generate captions with remapped timestamps if captions are enabled
      if (options.captionsEnabled && options.captionStyle && job.assFilePath) {
        try {
          const remapped = remapWordTimestamps(
            clipWords,
            job.startTime,
            job.endTime,
            detection.segments
          )
          if (remapped.length > 0) {
            // Pass canvas dimensions matching the output aspect ratio
            const arCfg = ASPECT_RATIO_CONFIGS[options.outputAspectRatio ?? '9:16']
            const newAssPath = await generateCaptions(remapped, options.captionStyle, undefined, arCfg.width, arCfg.height)
            console.log(`[FillerRemoval] Clip ${job.clipId}: captions re-synced → ${newAssPath}`)
            job.assFilePath = newAssPath
          }
        } catch (captionErr) {
          console.warn(`[FillerRemoval] Clip ${job.clipId}: caption re-sync failed:`, captionErr)
        }
      }

      // Build keep segments and store select filter info on the job for later use
      const keepSegs = buildKeepSegments(job.startTime, job.endTime, detection.segments)
      const selectFilter = buildSelectFilter(keepSegs)
      if (selectFilter) {
        // Store the select filter expressions on the job so buildVideoFilter
        // can incorporate them. We use a convention: attach to the job object.
        ;(job as RenderClipJob & { _fillerSelectVideo?: string; _fillerSelectAudio?: string })._fillerSelectVideo = selectFilter.videoSelect
        ;(job as RenderClipJob & { _fillerSelectVideo?: string; _fillerSelectAudio?: string })._fillerSelectAudio = selectFilter.audioSelect
      }
    }
  }

  // ── Quality settings resolved once for the entire batch ──────────────────
  const qualityParams = resolveQualityParams(options.renderQuality)
  const outputFormat = options.renderQuality?.outputFormat ?? 'mp4'

  // Determine output canvas dimensions:
  // Priority: explicit outputResolution (from renderQuality) > outputAspectRatio > default 9:16
  const effectiveAspectRatio: OutputAspectRatio = options.outputAspectRatio ?? '9:16'
  const aspectRatioDimensions = ASPECT_RATIO_CONFIGS[effectiveAspectRatio]

  const targetResolution: { width: number; height: number } = options.renderQuality?.outputResolution
    ? parseResolution(options.renderQuality.outputResolution)
    : { width: aspectRatioDimensions.width, height: aspectRatioDimensions.height }

  // For 'draft' quality preset, scale the resolution down to match the 540p equivalent
  // but preserve the aspect ratio instead of hardcoding 540x960
  const effectiveResolution: { width: number; height: number } = (() => {
    if (options.renderQuality?.preset === 'draft' && !options.renderQuality?.outputResolution) {
      // Scale to ~50% of the target for draft (e.g. 9:16 → 540×960, 16:9 → 960×540)
      return {
        width: Math.round(targetResolution.width * 0.5),
        height: Math.round(targetResolution.height * 0.5)
      }
    }
    return targetResolution
  })()

  // ── Determine effective concurrency ────────────────────────────────────────
  // GPU encoders (NVENC/QSV) are capped at 2 concurrent sessions to avoid
  // exhausting the driver's hardware session limit. Software encoding allows
  // up to the user-requested concurrency (max 4).
  const currentEncoder = getEncoder(qualityParams)
  const encoderIsHardware = currentEncoder.encoder === 'h264_nvenc' || currentEncoder.encoder === 'h264_qsv'
  const requestedConcurrency = Math.max(1, Math.min(4, options.renderConcurrency ?? 1))
  const effectiveConcurrency = encoderIsHardware ? Math.min(2, requestedConcurrency) : requestedConcurrency

  console.log(
    `[Quality] preset=${options.renderQuality?.preset ?? 'normal'}, ` +
    `crf=${qualityParams.crf}, preset=${qualityParams.preset}, ` +
    `format=${outputFormat}, resolution=${effectiveResolution.width}x${effectiveResolution.height}, ` +
    `aspectRatio=${effectiveAspectRatio}`
  )
  console.log(
    `[Concurrency] requested=${requestedConcurrency}, effective=${effectiveConcurrency}, ` +
    `encoder=${currentEncoder.encoder}`
  )

  let completed = 0
  let failed = 0

  // Manifest tracking — collect per-clip results and timing
  const manifestResults = new Map<string, string | null>() // clipId → outputPath | null (failed)
  const manifestRenderTimes = new Map<string, number>()    // clipId → ms
  const batchStartTime = Date.now()

  // Cache video metadata per source file to avoid redundant ffprobe calls
  const metadataCache = new Map<string, { width: number; height: number; codec: string; fps: number; audioCodec: string; duration: number }>()

  /**
   * Render a single clip job (all phases: render → b-roll → description → manifest).
   * Emits IPC events and updates shared counters. Safe to call concurrently.
   */
  const processJob = async (job: RenderClipJob, i: number): Promise<void> => {
    if (cancelRequested) return

    const outputPath = buildOutputPath(
      outputDirectory,
      job,
      i,
      outputFormat,
      options.filenameTemplate,
      { score: job.manifestMeta?.score ?? 0, quality: options.renderQuality?.preset ?? 'normal' }
    )

    // Safety: ensure output directory exists right before rendering
    const clipOutputDir = dirname(outputPath)
    if (!existsSync(clipOutputDir)) {
      mkdirSync(clipOutputDir, { recursive: true })
    }

    window.webContents.send('render:clipStart', {
      clipId: job.clipId,
      index: i,
      total,
      encoder: currentEncoder.encoder,
      encoderIsHardware
    })

    const clipStartTime = Date.now()
    let capturedCommand: string | undefined

    try {
      // Get source dimensions to compute the crop filter (cached per source file)
      let meta: { width: number; height: number; codec: string; fps: number; audioCodec: string; duration: number }
      const cached = metadataCache.get(job.sourceVideoPath)
      if (cached) {
        meta = cached
      } else {
        try {
          meta = await getVideoMetadata(job.sourceVideoPath)
          metadataCache.set(job.sourceVideoPath, meta)
        } catch (metaErr) {
          const msg = metaErr instanceof Error ? metaErr.message : String(metaErr)
          throw new Error(`Failed to read source video metadata for clip ${job.clipId}: ${msg}`)
        }
      }

      // Respect per-clip autoZoom override: if override is false, pass undefined (no zoom)
      const autoZoomOv = job.clipOverrides?.enableAutoZoom
      const effectiveAutoZoom =
        autoZoomOv === undefined
          ? options.autoZoom
          : autoZoomOv
            ? options.autoZoom
            : undefined
      let videoFilter = buildVideoFilter(job, meta.width, meta.height, effectiveAutoZoom, hookFontPath, effectiveResolution, effectiveAspectRatio)

      // Prepend filler removal select filter if present
      const fillerJob = job as RenderClipJob & { _fillerSelectVideo?: string; _fillerSelectAudio?: string }
      if (fillerJob._fillerSelectVideo) {
        videoFilter = fillerJob._fillerSelectVideo + ',' + videoFilter
      }

      await renderClip(job, outputPath, videoFilter, (percent) => {
        if (!cancelRequested) {
          window.webContents.send('render:clipProgress', { clipId: job.clipId, percent })
        }
      }, (cmd) => {
        capturedCommand = cmd
        if (options.developerMode) {
          console.log(`[DevMode] Clip ${job.clipId} FFmpeg:`, cmd)
          window.webContents.send('render:clipError', {
            clipId: `${job.clipId}__devmode`,
            error: `[DevMode] FFmpeg command for clip ${job.clipId}`,
            ffmpegCommand: cmd
          })
        }
      }, qualityParams, outputFormat)

      if (cancelRequested) return

      // B-Roll post-processing
      if (Array.isArray(job.brollPlacements) && job.brollPlacements.length > 0) {
        const brollBasePath = join(tmpdir(), `batchcontent-broll-base-${Date.now()}.mp4`)
        try {
          copyFileSync(outputPath, brollBasePath)
          unlinkSync(outputPath)
          await applyBRollOverlay(brollBasePath, job.brollPlacements, outputPath)
          console.log(`[B-Roll] Applied ${job.brollPlacements.length} overlay(s) to clip ${job.clipId}`)
        } catch (brollErr) {
          console.warn(`[B-Roll] Overlay failed for clip ${job.clipId}, keeping original:`, brollErr)
          if (existsSync(brollBasePath) && !existsSync(outputPath)) {
            copyFileSync(brollBasePath, outputPath)
          }
        } finally {
          try { unlinkSync(brollBasePath) } catch { /* ignore */ }
        }
      }

      // Write description .txt file alongside the rendered clip when available
      if (job.description) {
        try {
          const clipFilename = basename(outputPath)
          writeDescriptionFile(outputDirectory, clipFilename, job.description)
          console.log(`[Description] Written: ${basename(clipFilename, extname(clipFilename))}.txt`)
        } catch (descErr) {
          console.warn(`[Description] Failed to write .txt for clip ${job.clipId}:`, descErr)
        }
      }

      manifestResults.set(job.clipId, outputPath)
      manifestRenderTimes.set(job.clipId, Date.now() - clipStartTime)
      completed++
      window.webContents.send('render:clipDone', { clipId: job.clipId, outputPath })
    } catch (err) {
      // Clean up partial output file on failure
      try {
        if (existsSync(outputPath)) unlinkSync(outputPath)
      } catch {
        // Ignore cleanup errors
      }

      if (cancelRequested) return

      manifestResults.set(job.clipId, null)
      manifestRenderTimes.set(job.clipId, Date.now() - clipStartTime)
      failed++
      const message = err instanceof Error ? err.message : String(err)
      window.webContents.send('render:clipError', {
        clipId: job.clipId,
        error: message,
        ffmpegCommand: capturedCommand
      })
    }
  }

  // ── Concurrent render pool ──────────────────────────────────────────────────
  // Process jobs in parallel up to effectiveConcurrency slots using a simple
  // queue-draining pattern: start N workers that each pull from the queue.
  if (effectiveConcurrency <= 1) {
    // Sequential path (no overhead)
    for (let i = 0; i < jobs.length; i++) {
      if (cancelRequested) {
        window.webContents.send('render:cancelled', { completed, failed, total })
        return
      }
      await processJob(jobs[i], i)
    }
  } else {
    // Parallel path — shared queue index advanced atomically (single-threaded JS)
    let nextJobIndex = 0

    const worker = async (): Promise<void> => {
      while (true) {
        if (cancelRequested) return
        const i = nextJobIndex++
        if (i >= jobs.length) return
        await processJob(jobs[i], i)
      }
    }

    // Launch effectiveConcurrency workers and wait for all to drain the queue
    await Promise.all(Array.from({ length: effectiveConcurrency }, worker))

    if (cancelRequested) {
      window.webContents.send('render:cancelled', { completed, failed, total })
      return
    }
  }

  // ── Generate export manifest ──────────────────────────────────────────────
  // Write manifest.json + manifest.csv to the output directory when sourceMeta
  // is provided. Errors are caught silently so they don't interrupt the batch done event.
  if (options.sourceMeta) {
    try {
      const clipMeta: ManifestJobMeta[] = jobs.map((job) => ({
        clipId: job.clipId,
        score: job.manifestMeta?.score ?? 0,
        hookText: job.hookTitleText ?? '',
        reasoning: job.manifestMeta?.reasoning ?? '',
        transcriptText: job.manifestMeta?.transcriptText ?? '',
        loopScore: job.manifestMeta?.loopScore,
        description: job.description
      }))

      const manifest = generateRenderManifest({
        jobs,
        options,
        clipMeta,
        clipResults: manifestResults,
        clipRenderTimes: manifestRenderTimes,
        totalRenderTimeMs: Date.now() - batchStartTime,
        encoder: getEncoder().encoder,
        sourceName: options.sourceMeta.name,
        sourcePath: options.sourceMeta.path,
        sourceDuration: options.sourceMeta.duration
      })

      const { jsonPath, csvPath } = writeManifestFiles(manifest, outputDirectory)
      console.log(`[Manifest] Written: ${jsonPath}, ${csvPath}`)
    } catch (manifestErr) {
      console.warn('[Manifest] Failed to write manifest files:', manifestErr)
    }
  }

  window.webContents.send('render:batchDone', { completed, failed, total })
}
