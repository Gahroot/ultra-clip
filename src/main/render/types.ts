// ---------------------------------------------------------------------------
// Shared render types — extracted from render-pipeline.ts
// ---------------------------------------------------------------------------

import type { SoundPlacementData, SoundDesignOptions, EditEvent } from '../sound-design'
import type { ZoomSettings, EmphasisKeyframe } from '../auto-zoom'
import type { OutputAspectRatio } from '../aspect-ratios'
import type { HookTitleConfig } from '../hook-title'
import type { RehookConfig, OverlayVisualSettings } from '../overlays/rehook'
import type { ProgressBarConfig } from '../overlays/progress-bar'
import type { ClipDescription } from '../ai/description-generator'
import type { BRollPlacement } from '../broll-placement'
import type { FillerDetectionSettings } from '../filler-detection'
import type { CaptionStyleInput } from '../captions'
import type { SegmentRole } from '../ai/clip-stitcher'
import type { EmphasizedWord } from '@shared/types'

// Re-export pass-through types so consumers can import from one place
export type {
  SoundPlacementData,
  SoundDesignOptions,
  EditEvent,
  ZoomSettings,
  EmphasisKeyframe,
  HookTitleConfig,
  RehookConfig,
  OverlayVisualSettings,
  ProgressBarConfig,
  ClipDescription,
  BRollPlacement,
  FillerDetectionSettings,
  CaptionStyleInput,
  OutputAspectRatio,
  EmphasizedWord
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
   * Emphasis keyframes computed during the captions prepare phase (or by the
   * auto-zoom feature as a fallback when captions are disabled). Times are
   * clip-relative (0-based, in seconds). Consumed by reactive zoom mode to
   * drive the keyframe-driven push-in zoom filter.
   */
  emphasisKeyframes?: EmphasisKeyframe[]
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
  /**
   * When present, this job represents a stitched (multi-segment) clip.
   * The render pipeline routes these to renderStitchedClip() instead of
   * the normal single-segment render path. startTime/endTime are still
   * set (to the first segment) for compatibility but are ignored.
   */
  stitchedSegments?: RenderStitchedClipSegment[]
  /**
   * AI Edit Plan word emphasis override.
   * When present, the captions feature uses this instead of running
   * the heuristic emphasis analysis, providing AI-quality word tagging.
   * Times are clip-relative (0-based, in seconds).
   */
  wordEmphasisOverride?: EmphasizedWord[]
  /**
   * AI Edit Plan SFX suggestions.
   * When present and sound design is enabled, these are injected as
   * additional edit events into the sound design placement engine.
   * Times are clip-relative (0-based, in seconds).
   */
  aiSfxSuggestions?: Array<{ timestamp: number; type: string }>
  /**
   * Pre-computed emphasis data for this clip.
   *
   * When present, the captions feature uses this as the canonical word
   * emphasis source instead of running the heuristic analysis or matching
   * wordEmphasisOverride by timestamp. This carries the full emphasis
   * resolution (normal/emphasis/supersize for every word) and is used by
   * captions, reactive zoom, and sound design features.
   *
   * If absent, emphasis is derived from wordEmphasisOverride (AI edit plan)
   * or the heuristic fallback — no behavioural change for existing clips.
   */
  wordEmphasis?: EmphasizedWord[]
  /**
   * Pre-computed emphasis keyframes for reactive zoom.
   *
   * Normally computed at render time by the captions feature (or by the
   * auto-zoom feature as a fallback). When provided on the job, the
   * auto-zoom feature skips its own computation and uses these directly.
   *
   * Times are clip-relative (0-based, in seconds).
   * If absent, auto-zoom computes keyframes normally — no behavioural change.
   */
  emphasisKeyframesInput?: EmphasisKeyframe[]
  /**
   * Pre-computed edit events for sound design synchronisation.
   *
   * When present and sound design is enabled, the IPC handler merges these
   * with its own derived edit events (from B-Roll placements and jump-cut
   * points). This allows external callers to inject content-aware edit
   * events that trigger synchronised SFX placement.
   *
   * Times should be clip-relative (0-based, in seconds).
   * If absent, sound design uses only its internally derived edit events.
   */
  editEvents?: EditEvent[]
  /**
   * ID of the active edit style preset when the job was created.
   *
   * Used by the AI edit plan system to tag generated plans and by the
   * render manifest to record which creative style was applied. Not
   * consumed directly by any render feature — purely informational.
   *
   * If absent, no style preset was active (user used manual settings).
   */
  stylePresetId?: string
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
  /** Hook title overlay config from batch options. */
  hookTitleConfig?: HookTitleConfig
  /** Re-hook overlay config from batch options. */
  rehookConfig?: RehookConfig
  /** Re-hook text content (AI-generated or default phrase). */
  rehookText?: string
  /** Appear time for the re-hook overlay in seconds (absolute, relative to stitched clip start). */
  rehookAppearTime?: number
  /** Progress bar overlay config from batch options. */
  progressBarConfig?: ProgressBarConfig
  /** Brand kit settings. */
  brandKit?: BrandKitRenderOptions
  /** Caption style for generating per-segment captions. */
  captionStyle?: CaptionStyleInput
  /** Whether captions are enabled. */
  captionsEnabled?: boolean
  /** Word timestamps from the source video transcription (absolute times). */
  wordTimestamps?: { text: string; start: number; end: number }[]
  /** Template layout positions for on-screen text elements (percentage-based). */
  templateLayout?: { titleText: { x: number; y: number }; subtitles: { x: number; y: number }; rehookText: { x: number; y: number } }
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
