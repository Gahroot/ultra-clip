// ---------------------------------------------------------------------------
// Shared render types — extracted from render-pipeline.ts
// ---------------------------------------------------------------------------

import type { SoundPlacementData, SoundDesignOptions } from '../sound-design'
import type { ZoomSettings } from '../auto-zoom'
import type { OutputAspectRatio } from '../aspect-ratios'
import type { HookTitleConfig } from '../hook-title'
import type { RehookConfig } from '../overlays/rehook'
import type { ProgressBarConfig } from '../overlays/progress-bar'
import type { ClipDescription } from '../ai/description-generator'
import type { BRollPlacement } from '../broll-placement'
import type { FillerDetectionSettings } from '../filler-detection'
import type { CaptionStyleInput } from '../captions'
import type { SegmentRole } from '../ai/clip-stitcher'

// Re-export pass-through types so consumers can import from one place
export type {
  SoundPlacementData,
  SoundDesignOptions,
  ZoomSettings,
  HookTitleConfig,
  RehookConfig,
  ProgressBarConfig,
  ClipDescription,
  BRollPlacement,
  FillerDetectionSettings,
  CaptionStyleInput,
  OutputAspectRatio
}

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
  role?: SegmentRole
}

export interface RenderStitchedClipJob {
  clipId: string
  sourceVideoPath: string
  segments: RenderStitchedClipSegment[]
  cropRegion?: { x: number; y: number; width: number; height: number }
  outputFileName?: string
  hookTitleText?: string
}

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
   * Template layout positions for on-screen text elements.
   * Controls where hook title, re-hook text, and subtitles are placed
   * on the canvas. Values are percentages (0–100) from the top-left corner.
   */
  templateLayout?: {
    titleText: { x: number; y: number }
    subtitles: { x: number; y: number }
    rehookText: { x: number; y: number }
  }
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
