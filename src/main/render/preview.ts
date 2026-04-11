// ---------------------------------------------------------------------------
// Preview render — fast low-quality render at 540×960 with all overlays applied
// ---------------------------------------------------------------------------
//
// Designed for the ClipPreview dialog's "Preview with Overlays" button.
// Renders in ~3–5 seconds instead of 20–30 seconds by using:
//   - Half resolution (540×960 instead of 1080×1920)
//   - Software encoder (libx264) with ultrafast preset and CRF 35
//   - All overlays applied (captions, hook title, progress bar, brand logo, auto-zoom)
//   - Bumpers, sound design, B-roll, and filler removal are skipped
// ---------------------------------------------------------------------------

import { join } from 'path'
import { tmpdir } from 'os'
import { unlinkSync } from 'fs'
import { getVideoMetadata } from '../ffmpeg'
import { generateZoomFilter } from '../auto-zoom'
import { buildVideoFilter, renderClip } from './base-render'
import { createCaptionsFeature } from './features/captions.feature'
import { createHookTitleFeature } from './features/hook-title.feature'
import { progressBarFeature } from './features/progress-bar.feature'
import type { RenderFeature, FilterContext, OverlayContext, OverlayPassResult } from './features/feature'
import type { RenderClipJob, RenderBatchOptions, CaptionStyleInput, HookTitleConfig, ProgressBarConfig, ZoomSettings } from './types'
import { lightenColor } from './color-utils'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Preview output resolution (half of 1080×1920) */
const PREVIEW_WIDTH = 540
const PREVIEW_HEIGHT = 960

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface PreviewRenderConfig {
  sourceVideoPath: string
  startTime: number
  endTime: number
  cropRegion?: { x: number; y: number; width: number; height: number }
  wordTimestamps?: { text: string; start: number; end: number }[]
  hookTitleText?: string
  /** Whether to burn in captions (requires wordTimestamps + captionStyle) */
  captionsEnabled?: boolean
  captionStyle?: CaptionStyleInput
  /** Hook title overlay config — applied when enabled=true AND hookTitleText is set */
  hookTitleOverlay?: HookTitleConfig
  /** Progress bar overlay config — applied when enabled=true */
  progressBarOverlay?: ProgressBarConfig
  /** Auto-zoom (Ken Burns) — applied when enabled=true */
  autoZoom?: ZoomSettings
  /**
   * Per-clip accent color (CSS hex, e.g. '#FF6B35').
   * When set, overrides highlight/emphasis/supersize colors in captions,
   * hook title text color, rehook text color, and progress bar color.
   */
  accentColor?: string
  /**
   * Brand kit logo only (no bumpers for preview).
   * Set logoPath=null to skip logo even if brandKit object is present.
   */
  brandKit?: {
    logoPath: string | null
    logoPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
    logoScale: number
    logoOpacity: number
  }
}

// ---------------------------------------------------------------------------
// Preview render function
// ---------------------------------------------------------------------------

/**
 * Render a single clip at 540×960 with ultrafast/CRF-35 encoding.
 * Applies captions, hook title, progress bar, brand logo, and auto-zoom.
 * Skips bumpers, sound design, B-roll, and filler removal.
 *
 * @returns Absolute path to the rendered temp file (caller must delete it).
 */
export async function renderPreview(config: PreviewRenderConfig): Promise<string> {
  const clipId = `preview-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const outputPath = join(tmpdir(), `batchcontent-preview-${Date.now()}.mp4`)

  // ── Build job ─────────────────────────────────────────────────────────────
  const job: RenderClipJob = {
    clipId,
    sourceVideoPath: config.sourceVideoPath,
    startTime: config.startTime,
    endTime: config.endTime,
    cropRegion: config.cropRegion,
    wordTimestamps: config.wordTimestamps,
    hookTitleText: config.hookTitleText,
    // Set brandKit directly on the job (without bumpers)
    brandKit: config.brandKit?.logoPath
      ? {
          logoPath: config.brandKit.logoPath,
          logoPosition: config.brandKit.logoPosition,
          logoScale: config.brandKit.logoScale,
          logoOpacity: config.brandKit.logoOpacity,
          introBumperPath: null,
          outroBumperPath: null
        }
      : undefined
  }

  // ── Build batch options (no sound design, no B-roll, no filler removal) ───
  const batchOptions: RenderBatchOptions = {
    jobs: [job],
    outputDirectory: tmpdir(),
    captionsEnabled: config.captionsEnabled,
    captionStyle: config.captionStyle,
    hookTitleOverlay: config.hookTitleOverlay,
    progressBarOverlay: config.progressBarOverlay,
    autoZoom: config.autoZoom
    // soundDesign, fillerRemoval, broll intentionally omitted
  }

  // ── Apply accent color to batch options (same logic as accent-color.feature) ──
  if (config.accentColor) {
    const accent = config.accentColor
    if (batchOptions.captionStyle) {
      batchOptions.captionStyle = {
        ...batchOptions.captionStyle,
        highlightColor: accent,
        emphasisColor: accent,
        // Lighten 40% toward white for supersize (same as accent-color.feature)
        supersizeColor: lightenColor(accent, 0.4)
      }
    }
    if (batchOptions.hookTitleOverlay) {
      batchOptions.hookTitleOverlay = {
        ...batchOptions.hookTitleOverlay,
        textColor: accent
      }
    }
    if (batchOptions.progressBarOverlay) {
      batchOptions.progressBarOverlay = {
        ...batchOptions.progressBarOverlay,
        color: accent
      }
    }
    console.log(`[Preview] Applying accent color: ${accent}`)
  }

  // ── Get source metadata ───────────────────────────────────────────────────
  const meta = await getVideoMetadata(config.sourceVideoPath)

  // ── Create fresh feature instances for this preview ───────────────────────
  // We create fresh instances of stateful features to avoid state pollution
  // between concurrent preview renders and batch renders.
  // Note: progressBarFeature is stateless (state lives on the job object)
  // so sharing the singleton is safe.
  const features: RenderFeature[] = [
    createCaptionsFeature(),
    createHookTitleFeature(),
    progressBarFeature
  ]

  // Auto-zoom filter (call generateZoomFilter directly — the autoZoomFeature
  // singleton stores per-clipId state which we avoid by calling the function
  // directly here with our unique preview clipId).
  const clipDuration = config.endTime - config.startTime
  let autoZoomFilter: string | null = null
  if (config.autoZoom?.enabled) {
    try {
      const filter = generateZoomFilter(clipDuration, config.autoZoom, 0.38, PREVIEW_WIDTH, PREVIEW_HEIGHT)
      autoZoomFilter = filter || null
    } catch (err) {
      console.warn('[Preview] Auto-zoom filter generation failed, skipping:', err)
    }
  }

  // ── Phase 1: Prepare all features ─────────────────────────────────────────
  const allTempFiles: string[] = []
  for (const feature of features) {
    if (feature.prepare) {
      const result = await feature.prepare(job, batchOptions)
      allTempFiles.push(...result.tempFiles)
    }
  }

  // ── Phase 2: Build video filter chain ─────────────────────────────────────
  const targetResolution = { width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT }
  let videoFilter = buildVideoFilter(job, meta.width, meta.height, targetResolution, '9:16')

  // Append auto-zoom if enabled
  if (autoZoomFilter) {
    videoFilter = videoFilter + ',' + autoZoomFilter
  }

  // Feature video filters (none of the current features use this for preview,
  // but we call it for completeness / future-proofing)
  const filterContext: FilterContext = {
    sourceWidth: meta.width,
    sourceHeight: meta.height,
    targetWidth: PREVIEW_WIDTH,
    targetHeight: PREVIEW_HEIGHT,
    clipDuration,
    outputAspectRatio: '9:16'
  }
  for (const feature of features) {
    if (feature.videoFilter) {
      const featureFilter = feature.videoFilter(job, filterContext)
      if (featureFilter) {
        videoFilter = videoFilter + ',' + featureFilter
      }
    }
  }

  // ── Phase 3: Collect overlay passes ───────────────────────────────────────
  const overlayContext: OverlayContext = {
    clipDuration,
    targetWidth: PREVIEW_WIDTH,
    targetHeight: PREVIEW_HEIGHT
  }
  const overlaySteps: OverlayPassResult[] = []
  for (const feature of features) {
    if (feature.overlayPass) {
      const step = feature.overlayPass(job, overlayContext)
      if (step) overlaySteps.push(step)
    }
  }

  // ── Phase 4: Render at preview quality ────────────────────────────────────
  // CRF 35 + ultrafast preset gives the fastest possible encode.
  // GPU (NVENC p1 / QSV fast) or software (libx264 ultrafast) — both work fine.
  const previewQuality = { crf: 35, preset: 'ultrafast' as const }

  try {
    await renderClip(
      job,
      outputPath,
      videoFilter,
      () => {}, // no progress tracking for preview
      undefined,
      previewQuality,
      'mp4',
      null,
      null,
      overlaySteps
    )
  } finally {
    // Clean up temp files from features (ASS files, etc.)
    for (const tmp of allTempFiles) {
      try { unlinkSync(tmp) } catch { /* ignore */ }
    }
  }

  return outputPath
}

// ---------------------------------------------------------------------------
// Cleanup helper
// ---------------------------------------------------------------------------

/**
 * Delete a preview temp file. Safe to call even if the file doesn't exist.
 */
export function cleanupPreviewFile(previewPath: string): void {
  try {
    unlinkSync(previewPath)
    console.log(`[Preview] Cleaned up temp file: ${previewPath}`)
  } catch {
    // Ignore — file may have already been deleted or never created
  }
}
