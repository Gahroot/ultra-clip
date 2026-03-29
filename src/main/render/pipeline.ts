// ---------------------------------------------------------------------------
// Pipeline orchestrator — composable feature-based batch render
// ---------------------------------------------------------------------------
//
// Replaces the monolithic startBatchRender() in render-pipeline.ts with a
// modular feature pipeline. Each feature hooks into prepare → videoFilter →
// overlayPass → postProcess lifecycle phases.
// ---------------------------------------------------------------------------

import { BrowserWindow } from 'electron'
import { Ch } from '@shared/ipc-channels'
import { basename, dirname, extname } from 'path'
import { existsSync, mkdirSync, unlinkSync } from 'fs'
import type { FfmpegCommand } from 'fluent-ffmpeg'
import { getEncoder, getVideoMetadata } from '../ffmpeg'
import { ASPECT_RATIO_CONFIGS } from '../aspect-ratios'
import type { OutputAspectRatio } from '../aspect-ratios'
import { writeDescriptionFile } from '../ai/description-generator'
import {
  generateRenderManifest,
  writeManifestFiles,
  type ManifestJobMeta
} from '../export-manifest'

import type { RenderClipJob, RenderBatchOptions, RenderStitchedClipJob } from './types'
import type { RenderFeature, FilterContext, OverlayContext, PostProcessContext, OverlayPassResult } from './features/feature'
import { buildVideoFilter, renderClip, activeCommands } from './base-render'
import { renderStitchedClip } from './stitched-render'
import { resolveQualityParams, parseResolution } from './quality'
import { buildOutputPath } from './filename'

// Feature imports
import { createFillerRemovalFeature } from './features/filler-removal.feature'
import { createCaptionsFeature } from './features/captions.feature'
import { createHookTitleFeature } from './features/hook-title.feature'
import { createRehookFeature } from './features/rehook.feature'
import { progressBarFeature } from './features/progress-bar.feature'
import { autoZoomFeature } from './features/auto-zoom.feature'
import { brandKitFeature } from './features/brand-kit.feature'
import { soundDesignFeature } from './features/sound-design.feature'
import { wordEmphasisFeature } from './features/word-emphasis.feature'
import { brollFeature } from './features/broll.feature'
import { colorGradeFeature } from './features/color-grade.feature'
import { shotTransitionFeature } from './features/shot-transition.feature'
import { accentColorFeature, restoreBatchOptions } from './features/accent-color.feature'

// ---------------------------------------------------------------------------
// Cancellation state
// ---------------------------------------------------------------------------

let cancelRequested = false

/**
 * Cancel the active render batch. Kills all running FFmpeg processes.
 */
export function cancelRender(): void {
  cancelRequested = true
  for (const cmd of activeCommands) {
    try { (cmd as FfmpegCommand).kill('SIGTERM') } catch { /* ignore */ }
  }
  activeCommands.clear()
}

// ---------------------------------------------------------------------------
// Main orchestrator
// ---------------------------------------------------------------------------

/**
 * Start a batch render of approved clips using the composable feature pipeline.
 *
 * Flow per clip:
 *   1. feature.prepare()     — pre-render setup (generate ASS, detect fillers, etc.)
 *   2. buildVideoFilter()    — base crop + scale
 *   3. feature.videoFilter() — append feature-specific filters (auto-zoom)
 *   4. renderClip()          — base FFmpeg encode (+ logo, sound design, bumpers)
 *   5. feature.overlayPass() — collect overlay passes (captions, hook, rehook, bar)
 *   6. feature.postProcess() — post-processing (B-Roll)
 */
export async function startBatchRender(
  options: RenderBatchOptions,
  window: BrowserWindow
): Promise<void> {
  cancelRequested = false

  const { jobs, outputDirectory } = options
  const total = jobs.length

  // Ensure output directory exists
  if (!existsSync(outputDirectory)) {
    mkdirSync(outputDirectory, { recursive: true })
  }

  // ── Create feature instances ──────────────────────────────────────────────
  // Registration order determines prepare() execution order.
  // Data flows via job mutation — earlier features write, later ones read.
  //
  //  1. filler-removal    — mutates job.sourceVideoPath, startTime, endTime, wordTimestamps
  //  2. brand-kit         — writes job.brandKit (consumed by base-render)
  //  3. accent-color      — reads clipOverrides.accentColor, overrides highlight/emphasis
  //                         colors in captionStyle, hookTitleOverlay, progressBarOverlay,
  //                         and per-shot captionStyle — must run before any visual feature
  //  4. word-emphasis     — writes job.wordEmphasis + job.emphasisKeyframes
  //  5. captions          — reads job.wordEmphasis, generates ASS, fallback emphasisKeyframes
  //  6. hook-title        — generates ASS overlay file
  //  7. rehook            — reads hookTitleOverlay.displayDuration + textColor for appear time
  //  8. progress-bar      — injects job.progressBarConfig
  //  9. auto-zoom         — reads job.emphasisKeyframes for reactive zoom (prepare stores settings)
  // 10. broll             — reads job.brollPlacements + shotStyleConfigs.brollMode,
  //                         emits 'broll-transition' editEvents
  // 11. color-grade       — reads shotStyleConfigs, validates + logs color grade configs;
  //                         videoFilter applies per-shot eq/hue — must run BEFORE transitions
  //                         so crossfades blend between properly color-graded shots
  // 12. shot-transition   — reads shotStyleConfigs, emits 'shot-transition' editEvents;
  //                         videoFilter applies crossfade/swipe — runs AFTER color-grade
  //                         so transitions blend between styled shots
  // 13. sound-design      — reads ALL editEvents (broll + shot-transition + jump-cut),
  //                         validates job.soundPlacements
  //
  // Cross-feature data flow:
  //   filler-removal ──wordTimestamps──▸ word-emphasis (remapped timestamps)
  //   accent-color ──captionStyle colors──▸ captions, hook-title (+rehook), progress-bar
  //   word-emphasis ──wordEmphasis──▸ captions (emphasis tags for ASS styling)
  //   word-emphasis ──emphasisKeyframes──▸ auto-zoom (reactive zoom keyframes)
  //   captions ──emphasisKeyframes (fallback)──▸ auto-zoom (if word-emphasis didn't produce them)
  //   IPC handler ──shotStyleConfigs──▸ captions, auto-zoom, broll, color-grade, shot-transition
  //   IPC handler ──brollPlacements──▸ broll (postProcess + edit event emission)
  //   broll ──editEvents['broll-transition']──▸ sound-design (B-Roll transition SFX sync)
  //   shot-transition ──editEvents['shot-transition']──▸ sound-design (shot boundary SFX sync)
  //   IPC handler ──soundPlacements──▸ sound-design (base render filter_complex)
  const features: RenderFeature[] = [
    createFillerRemovalFeature(),
    brandKitFeature,
    accentColorFeature,
    wordEmphasisFeature,
    createCaptionsFeature(),
    createHookTitleFeature(),
    createRehookFeature(),
    progressBarFeature,
    autoZoomFeature,
    brollFeature,
    colorGradeFeature,
    shotTransitionFeature,
    soundDesignFeature
  ]

  // ── Resolve batch-level config ────────────────────────────────────────────
  const qualityParams = resolveQualityParams(options.renderQuality)
  const outputFormat = options.renderQuality?.outputFormat ?? 'mp4'

  const effectiveAspectRatio: OutputAspectRatio = options.outputAspectRatio ?? '9:16'
  const aspectRatioDimensions = ASPECT_RATIO_CONFIGS[effectiveAspectRatio]

  const targetResolution: { width: number; height: number } = options.renderQuality?.outputResolution
    ? parseResolution(options.renderQuality.outputResolution)
    : { width: aspectRatioDimensions.width, height: aspectRatioDimensions.height }

  // For 'draft' quality preset, scale the resolution down to ~50%
  const effectiveResolution: { width: number; height: number } = (() => {
    if (options.renderQuality?.preset === 'draft' && !options.renderQuality?.outputResolution) {
      return {
        width: Math.round(targetResolution.width * 0.5),
        height: Math.round(targetResolution.height * 0.5)
      }
    }
    return targetResolution
  })()

  // ── Determine effective concurrency ───────────────────────────────────────
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

  // Manifest tracking
  const manifestResults = new Map<string, string | null>()
  const manifestRenderTimes = new Map<string, number>()
  const batchStartTime = Date.now()

  // Cache video metadata per source file to avoid redundant ffprobe calls
  const metadataCache = new Map<string, { width: number; height: number; codec: string; fps: number; audioCodec: string; duration: number }>()

  // ── Per-clip job processor ────────────────────────────────────────────────

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

    window.webContents.send(Ch.Send.RENDER_CLIP_START, {
      clipId: job.clipId,
      index: i,
      total,
      encoder: currentEncoder.encoder,
      encoderIsHardware
    })

    // Initial prepare-phase progress
    window.webContents.send(Ch.Send.RENDER_CLIP_PREPARE, {
      clipId: job.clipId,
      message: 'Preparing clip…',
      percent: 0
    })

    const clipStartTime = Date.now()
    let capturedCommand: string | undefined
    const allTempFiles: string[] = []

    try {
      // ── Stitched clip shortcut ──────────────────────────────────────────
      // When stitchedSegments are present, delegate to the dedicated stitched
      // render path which encodes each segment individually then concatenates.
      // Pass through all batch overlay options so stitched clips get captions,
      // hook title, rehook, and progress bar overlays.
      if (job.stitchedSegments && job.stitchedSegments.length > 0) {
        const stitchedJob: RenderStitchedClipJob = {
          clipId: job.clipId,
          sourceVideoPath: job.sourceVideoPath,
          segments: job.stitchedSegments,
          cropRegion: job.cropRegion,
          outputFileName: job.outputFileName,
          hookTitleText: job.hookTitleText,
          hookTitleConfig: options.hookTitleOverlay,
          rehookConfig: options.rehookOverlay,
          rehookText: job.rehookText,
          progressBarConfig: options.progressBarOverlay,
          captionsEnabled: options.captionsEnabled,
          captionStyle: options.captionStyle,
          wordTimestamps: job.wordTimestamps,
          wordEmphasis: job.wordEmphasis,
          wordEmphasisOverride: job.wordEmphasisOverride,
          templateLayout: options.templateLayout,
          brandKit: options.brandKit?.enabled ? {
            logoPath: options.brandKit.logoPath,
            logoPosition: options.brandKit.logoPosition,
            logoScale: options.brandKit.logoScale,
            logoOpacity: options.brandKit.logoOpacity,
            introBumperPath: options.brandKit.introBumperPath,
            outroBumperPath: options.brandKit.outroBumperPath
          } : undefined
        }

        // Compute rehook text and appear time
        if (stitchedJob.rehookConfig?.enabled) {
          if (!stitchedJob.rehookText) {
            const { getDefaultRehookPhrase } = await import('../overlays/rehook')
            stitchedJob.rehookText = getDefaultRehookPhrase(job.clipId)
          }
          stitchedJob.rehookAppearTime = options.hookTitleOverlay?.displayDuration ?? 2.5
        }

        await renderStitchedClip(stitchedJob, outputPath, (percent) => {
          if (!cancelRequested) {
            window.webContents.send(Ch.Send.RENDER_CLIP_PROGRESS, { clipId: job.clipId, percent })
          }
        })

        manifestResults.set(job.clipId, outputPath)
        manifestRenderTimes.set(job.clipId, Date.now() - clipStartTime)
        completed++
        window.webContents.send(Ch.Send.RENDER_CLIP_DONE, { clipId: job.clipId, outputPath })
        return
      }

      // ── Phase 0: Get source metadata ────────────────────────────────────
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

      // ── Phase 1: Prepare — call feature.prepare() ──────────────────────
      // Each feature is isolated: a failure in one feature does NOT prevent
      // the remaining features from preparing. The clip still renders, just
      // without that one feature's contribution.
      const featureCount = features.length
      for (let fi = 0; fi < featureCount; fi++) {
        const feature = features[fi]
        if (cancelRequested) return
        if (feature.prepare) {
          window.webContents.send(Ch.Send.RENDER_CLIP_PREPARE, {
            clipId: job.clipId,
            message: `Preparing ${feature.name}…`,
            percent: Math.round(((fi + 1) / featureCount) * 50)
          })
          try {
            const result = await feature.prepare(job, options, (message, percent) => {
              window.webContents.send(Ch.Send.RENDER_CLIP_PREPARE, {
                clipId: job.clipId,
                message,
                percent
              })
            })
            if (result.tempFiles.length > 0) {
              allTempFiles.push(...result.tempFiles)
            }
            if (result.modified) {
              console.log(`[Pipeline] ${feature.name}: prepared clip ${job.clipId}`)
            }
          } catch (featureErr) {
            const msg = featureErr instanceof Error ? featureErr.message : String(featureErr)
            console.error(
              `[Pipeline] ${feature.name} prepare() failed for clip ${job.clipId}, skipping: ${msg}`
            )
            window.webContents.send(Ch.Send.RENDER_CLIP_ERROR, {
              clipId: job.clipId,
              error: `[${feature.name}] prepare failed (clip will render without this feature): ${msg}`,
              ffmpegCommand: null
            })
          }
        }
      }

      if (cancelRequested) return

      // After filler removal, the job's sourceVideoPath may have changed.
      // Re-fetch metadata if the source path is no longer in the cache.
      if (!metadataCache.has(job.sourceVideoPath)) {
        try {
          meta = await getVideoMetadata(job.sourceVideoPath)
          metadataCache.set(job.sourceVideoPath, meta)
        } catch {
          // If intermediate file can't be probed, use original meta
        }
      } else {
        meta = metadataCache.get(job.sourceVideoPath)!
      }

      // ── Phase 2: Build video filter chain ──────────────────────────────
      // Base: crop + scale
      let videoFilter = buildVideoFilter(
        job,
        meta.width,
        meta.height,
        effectiveResolution,
        effectiveAspectRatio
      )

      // Append feature video filters (auto-zoom)
      const clipDuration = job.endTime - job.startTime
      const filterContext: FilterContext = {
        sourceWidth: meta.width,
        sourceHeight: meta.height,
        targetWidth: effectiveResolution.width,
        targetHeight: effectiveResolution.height,
        clipDuration,
        outputAspectRatio: effectiveAspectRatio
      }

      for (const feature of features) {
        if (feature.videoFilter) {
          try {
            const featureFilter = feature.videoFilter(job, filterContext)
            if (featureFilter) {
              videoFilter = videoFilter + ',' + featureFilter
            }
          } catch (featureErr) {
            const msg = featureErr instanceof Error ? featureErr.message : String(featureErr)
            console.error(
              `[Pipeline] ${feature.name} videoFilter() failed for clip ${job.clipId}, skipping: ${msg}`
            )
          }
        }
      }

      // ── Phase 3: Collect overlay passes ────────────────────────────────
      const overlayContext: OverlayContext = {
        clipDuration,
        targetWidth: effectiveResolution.width,
        targetHeight: effectiveResolution.height
      }

      const overlaySteps: OverlayPassResult[] = []
      for (const feature of features) {
        if (feature.overlayPass) {
          try {
            const step = feature.overlayPass(job, overlayContext)
            if (step) {
              overlaySteps.push(step)
            }
          } catch (featureErr) {
            const msg = featureErr instanceof Error ? featureErr.message : String(featureErr)
            console.error(
              `[Pipeline] ${feature.name} overlayPass() failed for clip ${job.clipId}, skipping: ${msg}`
            )
          }
        }
      }

      // ── Phase 4: Base render ───────────────────────────────────────────
      window.webContents.send(Ch.Send.RENDER_CLIP_PREPARE, {
        clipId: job.clipId,
        message: 'Encoding…',
        percent: 50
      })
      await renderClip(
        job,
        outputPath,
        videoFilter,
        (percent) => {
          if (!cancelRequested) {
            window.webContents.send(Ch.Send.RENDER_CLIP_PROGRESS, { clipId: job.clipId, percent })
          }
        },
        (cmd) => {
          capturedCommand = cmd
          if (options.developerMode) {
            console.log(`[DevMode] Clip ${job.clipId} FFmpeg:`, cmd)
            window.webContents.send(Ch.Send.RENDER_CLIP_ERROR, {
              clipId: `${job.clipId}__devmode`,
              error: `[DevMode] FFmpeg command for clip ${job.clipId}`,
              ffmpegCommand: cmd
            })
          }
        },
        qualityParams,
        outputFormat,
        null, // hookFontPath — no longer needed, features handle their own fonts
        null, // captionFontsDir — features handle their own font dirs
        overlaySteps
      )

      if (cancelRequested) return

      // ── Phase 5: Post-process — call feature.postProcess() ─────────────
      const postContext: PostProcessContext = {
        clipDuration,
        outputPath
      }

      for (const feature of features) {
        if (cancelRequested) return
        if (feature.postProcess) {
          try {
            await feature.postProcess(job, outputPath, postContext)
          } catch (featureErr) {
            const msg = featureErr instanceof Error ? featureErr.message : String(featureErr)
            console.error(
              `[Pipeline] ${feature.name} postProcess() failed for clip ${job.clipId}, skipping: ${msg}`
            )
            window.webContents.send(Ch.Send.RENDER_CLIP_ERROR, {
              clipId: job.clipId,
              error: `[${feature.name}] postProcess failed (clip may be incomplete): ${msg}`,
              ffmpegCommand: null
            })
          }
        }
      }

      // ── Restore batch options after this clip's overlays are done ──────
      // The accent-color feature mutates shared batchOptions during prepare().
      // Restore now so the next clip doesn't inherit this clip's accent color.
      restoreBatchOptions(job, options)

      // ── Write description file ─────────────────────────────────────────
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
      window.webContents.send(Ch.Send.RENDER_CLIP_DONE, { clipId: job.clipId, outputPath })
    } catch (err) {
      // Clean up partial output file on failure
      try {
        if (existsSync(outputPath)) unlinkSync(outputPath)
      } catch {
        // Ignore cleanup errors
      }

      if (cancelRequested) return

      // Restore batch options even on failure so the next clip isn't affected
      restoreBatchOptions(job, options)

      manifestResults.set(job.clipId, null)
      manifestRenderTimes.set(job.clipId, Date.now() - clipStartTime)
      failed++
      const message = err instanceof Error ? err.message : String(err)
      window.webContents.send(Ch.Send.RENDER_CLIP_ERROR, {
        clipId: job.clipId,
        error: message,
        ffmpegCommand: capturedCommand
      })
    } finally {
      // Clean up temp files from all features
      for (const tempFile of allTempFiles) {
        try { unlinkSync(tempFile) } catch { /* ignore */ }
      }
    }
  }

  // ── Concurrent render pool ──────────────────────────────────────────────
  if (effectiveConcurrency <= 1) {
    // Sequential path (no overhead)
    for (let i = 0; i < jobs.length; i++) {
      if (cancelRequested) {
        window.webContents.send(Ch.Send.RENDER_CANCELLED, { completed, failed, total })
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
      window.webContents.send(Ch.Send.RENDER_CANCELLED, { completed, failed, total })
      return
    }
  }

  // ── Generate export manifest ────────────────────────────────────────────
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

  window.webContents.send(Ch.Send.RENDER_BATCH_DONE, { completed, failed, total })
}
