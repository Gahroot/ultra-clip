import { BrowserWindow, ipcMain } from 'electron'
import { Ch } from '@shared/ipc-channels'
import { wrapHandler } from '../ipc-error-handler'
import { startBatchRender, cancelRender, type RenderBatchOptions } from '../render-pipeline'
import { generateSoundPlacements, type EditEvent } from '../sound-design'
import { analyzeEmphasisHeuristic } from '../word-emphasis'
import { buildBlurBackgroundFilter, type BlurBackgroundConfig } from '../layouts/blur-background'
import { buildSplitScreenFilter } from '../layouts/split-screen'
import type { SplitScreenLayout, VideoSource, SplitScreenConfig } from '../layouts/split-screen'
import {
  analyzeLoopPotential,
  optimizeForLoop,
  buildLoopCrossfadeFilter,
  scoreLoopQuality
} from '../ai/loop-optimizer'
import type { LoopAnalysis, LoopOptimizedClip } from '../ai/loop-optimizer'
import {
  generateVariants,
  buildVariantRenderConfigs,
  generateVariantLabels
} from '../ai/clip-variants'
import type { OverlayCapabilities, ClipVariant } from '../ai/clip-variants'
import type { ClipCandidate } from '../ai/curiosity-gap'
import {
  detectStoryArcs,
  generateSeriesMetadata,
  buildPartNumberFilter,
  buildEndCardFilter
} from '../ai/story-arc'
import type { StoryArc, PartNumberConfig, EndCardConfig } from '../ai/story-arc'
import type { PreviewRenderConfig } from '../render/preview'
import { resolveHookFont } from '../hook-title'
import { generateStitchedClips } from '../ai/clip-stitcher'
import type { StitchingProgress } from '../ai/clip-stitcher'
import {
  generateRenderManifest,
  writeManifestFiles,
  type ManifestJobMeta
} from '../export-manifest'
import type { RenderClipJob } from '../render-pipeline'
import { getEncoder } from '../ffmpeg'

export function registerRenderHandlers(): void {
  // Render — start a batch render of approved clips
  ipcMain.handle(Ch.Invoke.RENDER_START_BATCH, wrapHandler(Ch.Invoke.RENDER_START_BATCH, async (event, options: RenderBatchOptions) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) throw new Error('No BrowserWindow found for render request')

    // If sound design is enabled globally, compute emphasis-aware placements for each clip
    if (options.soundDesign?.enabled) {
      for (const job of options.jobs) {
        const soundDesignOv = job.clipOverrides?.enableSoundDesign
        const soundEnabled = soundDesignOv === undefined ? true : soundDesignOv
        if (!soundEnabled) {
          console.log(`[SoundDesign] Clip ${job.clipId}: disabled by per-clip override`)
          continue
        }
        const clipDuration = job.endTime - job.startTime
        const clipWords = (job.wordTimestamps ?? []).filter(
          (w) => w.start >= job.startTime && w.end <= job.endTime
        )
        const localWords = clipWords.map((w) => ({
          text: w.text,
          start: w.start - job.startTime,
          end: w.end - job.startTime
        }))

        // Use pre-computed emphasis from the job when available (e.g. AI edit plan),
        // otherwise run the heuristic to classify words as normal / emphasis / supersize
        const emphasized = job.wordEmphasis && job.wordEmphasis.length > 0
          ? job.wordEmphasis
          : analyzeEmphasisHeuristic(localWords)

        // Derive edit events from B-Roll placements and auto-zoom jump-cut mode
        const editEvents: EditEvent[] = []

        // Pre-computed edit events from the renderer (e.g. AI edit plan SFX sync)
        if (job.editEvents && job.editEvents.length > 0) {
          editEvents.push(...job.editEvents)
        }

        // B-Roll transition events
        if (job.brollPlacements && job.brollPlacements.length > 0) {
          for (const br of job.brollPlacements) {
            editEvents.push({
              type: 'broll-transition',
              time: br.startTime,
              transition: br.transition
            })
          }
        }

        // Jump-cut zoom events (only when auto-zoom is enabled in jump-cut mode)
        if (options.autoZoom?.enabled && options.autoZoom.mode === 'jump-cut') {
          // Derive cut points from word timestamps for jump-cut events
          const sentenceEnders = /[.!?…]+$/
          const cuts: number[] = []
          for (let i = 0; i < localWords.length - 1; i++) {
            const word = localWords[i]
            const next = localWords[i + 1]
            if (
              sentenceEnders.test(word.text.trim()) &&
              (next.start - word.end) >= 0.15 &&
              next.start >= 2.0 &&
              next.start < clipDuration - 0.5
            ) {
              const lastCut = cuts.length > 0 ? cuts[cuts.length - 1] : 0
              if (next.start - lastCut >= 2.0) {
                cuts.push(next.start)
              }
            }
          }
          for (const cutTime of cuts) {
            editEvents.push({
              type: 'jump-cut',
              time: cutTime
            })
          }
        }

        job.soundPlacements = generateSoundPlacements(
          clipDuration,
          localWords,
          options.soundDesign,
          emphasized,
          editEvents.length > 0 ? editEvents : undefined
        )

        const counts = {
          music: job.soundPlacements.filter(p => p.type === 'music').length,
          sfx: job.soundPlacements.filter(p => p.type === 'sfx').length,
          emphasis: emphasized.filter(w => w.emphasis === 'emphasis').length,
          supersize: emphasized.filter(w => w.emphasis === 'supersize').length,
          editEvents: editEvents.length,
        }
        console.log(
          `[SoundDesign] Clip ${job.clipId}: ${job.soundPlacements.length} placement(s) ` +
          `(${counts.music} music, ${counts.sfx} sfx) — ` +
          `${counts.emphasis} emphasis, ${counts.supersize} supersize, ${counts.editEvents} edit events`
        )
      }
    }

    startBatchRender(options, win).catch((err) => {
      console.error('[render-pipeline] Unhandled error:', err)
      event.sender.send(Ch.Send.RENDER_BATCH_DONE, { completed: 0, failed: options.jobs.length, total: options.jobs.length })
    })
    return { started: true }
  }))

  // Render — cancel the active batch
  ipcMain.handle(Ch.Invoke.RENDER_CANCEL, () => {
    cancelRender()
  })

  // Render — fast low-quality preview
  ipcMain.handle(Ch.Invoke.RENDER_PREVIEW, wrapHandler(Ch.Invoke.RENDER_PREVIEW, async (_event, config: PreviewRenderConfig) => {
    const { renderPreview } = await import('../render/preview')
    const previewPath = await renderPreview(config)
    return { previewPath }
  }))

  // Render — clean up a preview temp file
  ipcMain.handle(Ch.Invoke.RENDER_CLEANUP_PREVIEW, wrapHandler(Ch.Invoke.RENDER_CLEANUP_PREVIEW, async (_event, previewPath: string) => {
    const { cleanupPreviewFile } = await import('../render/preview')
    cleanupPreviewFile(previewPath)
  }))

  // Layout — blur-background fill
  ipcMain.handle(
    Ch.Invoke.LAYOUT_BUILD_BLUR_BACKGROUND,
    (
      _event,
      inputWidth: number,
      inputHeight: number,
      outputWidth: number,
      outputHeight: number,
      config: BlurBackgroundConfig
    ) => {
      return buildBlurBackgroundFilter(inputWidth, inputHeight, outputWidth, outputHeight, config)
    }
  )

  // Layout — split-screen
  ipcMain.handle(
    Ch.Invoke.LAYOUT_BUILD_SPLIT_SCREEN,
    (
      _event,
      layout: SplitScreenLayout,
      mainSource: VideoSource,
      secondarySource: VideoSource | null,
      config: SplitScreenConfig
    ) => {
      return buildSplitScreenFilter(layout, mainSource, secondarySource, config)
    }
  )

  // Loop Optimizer — analyze loop potential
  ipcMain.handle(
    Ch.Invoke.LOOP_ANALYZE_LOOP_POTENTIAL,
    wrapHandler(Ch.Invoke.LOOP_ANALYZE_LOOP_POTENTIAL, async (
      _event,
      apiKey: string,
      transcript: Parameters<typeof analyzeLoopPotential>[1],
      clipStart: number,
      clipEnd: number
    ) => {
      return analyzeLoopPotential(apiKey, transcript, clipStart, clipEnd)
    })
  )

  // Loop Optimizer — apply loop analysis
  ipcMain.handle(
    Ch.Invoke.LOOP_OPTIMIZE_FOR_LOOP,
    wrapHandler(Ch.Invoke.LOOP_OPTIMIZE_FOR_LOOP, (
      _event,
      clipStart: number,
      clipEnd: number,
      transcript: Parameters<typeof optimizeForLoop>[2],
      analysis: LoopAnalysis
    ): LoopOptimizedClip => {
      return optimizeForLoop(clipStart, clipEnd, transcript, analysis)
    })
  )

  // Loop Optimizer — build FFmpeg audio crossfade filter
  ipcMain.handle(
    Ch.Invoke.LOOP_BUILD_CROSSFADE_FILTER,
    wrapHandler(Ch.Invoke.LOOP_BUILD_CROSSFADE_FILTER, (_event, clipDuration: number, crossfadeDuration: number): string => {
      return buildLoopCrossfadeFilter(clipDuration, crossfadeDuration)
    })
  )

  // Loop Optimizer — composite loop quality score
  ipcMain.handle(
    Ch.Invoke.LOOP_SCORE_LOOP_QUALITY,
    wrapHandler(Ch.Invoke.LOOP_SCORE_LOOP_QUALITY, (_event, analysis: LoopAnalysis): number => {
      return scoreLoopQuality(analysis)
    })
  )

  // Clip Variants — generate A/B/C packaging variants
  ipcMain.handle(
    Ch.Invoke.VARIANTS_GENERATE,
    wrapHandler(Ch.Invoke.VARIANTS_GENERATE, async (
      _event,
      apiKey: string,
      clip: ClipCandidate,
      transcript: Parameters<typeof generateVariants>[2],
      capabilities: OverlayCapabilities
    ): Promise<ClipVariant[]> => {
      return generateVariants(apiKey, clip, transcript, capabilities)
    })
  )

  // Clip Variants — convert variants into render pipeline configs
  ipcMain.handle(
    Ch.Invoke.VARIANTS_BUILD_RENDER_CONFIGS,
    wrapHandler(Ch.Invoke.VARIANTS_BUILD_RENDER_CONFIGS, (
      _event,
      variants: ClipVariant[],
      baseClip: ClipCandidate,
      baseName: string
    ) => {
      return buildVariantRenderConfigs(variants, baseClip, baseName)
    })
  )

  // Clip Variants — generate UI labels
  ipcMain.handle(
    Ch.Invoke.VARIANTS_GENERATE_LABELS,
    wrapHandler(Ch.Invoke.VARIANTS_GENERATE_LABELS, (_event, variants: ClipVariant[]) => {
      return generateVariantLabels(variants)
    })
  )

  // Story Arc — detect multi-clip narrative arcs with AI
  ipcMain.handle(
    Ch.Invoke.STORYARC_DETECT,
    wrapHandler(Ch.Invoke.STORYARC_DETECT, async (
      _event,
      apiKey: string,
      transcript: Parameters<typeof detectStoryArcs>[1],
      clips: Parameters<typeof detectStoryArcs>[2]
    ) => {
      return detectStoryArcs(apiKey, transcript, clips)
    })
  )

  // Story Arc — derive series metadata
  ipcMain.handle(
    Ch.Invoke.STORYARC_GENERATE_SERIES_METADATA,
    wrapHandler(Ch.Invoke.STORYARC_GENERATE_SERIES_METADATA, (_event, arc: StoryArc) => {
      return generateSeriesMetadata(arc)
    })
  )

  // Story Arc — build "Part N/M" badge filter
  ipcMain.handle(
    Ch.Invoke.STORYARC_BUILD_PART_NUMBER_FILTER,
    wrapHandler(Ch.Invoke.STORYARC_BUILD_PART_NUMBER_FILTER, async (
      _event,
      partNumber: number,
      totalParts: number,
      seriesTitle: string,
      config: Partial<PartNumberConfig>
    ) => {
      const fontFilePath = await resolveHookFont()
      return buildPartNumberFilter(partNumber, totalParts, seriesTitle, {
        ...config,
        fontFilePath: config.fontFilePath ?? fontFilePath ?? undefined
      })
    })
  )

  // Story Arc — build end-card overlay filter
  ipcMain.handle(
    Ch.Invoke.STORYARC_BUILD_END_CARD_FILTER,
    wrapHandler(Ch.Invoke.STORYARC_BUILD_END_CARD_FILTER, async (
      _event,
      nextPartTeaser: string,
      clipDuration: number,
      config: Partial<EndCardConfig>
    ) => {
      const fontFilePath = await resolveHookFont()
      return buildEndCardFilter(nextPartTeaser, clipDuration, {
        ...config,
        fontFilePath: config.fontFilePath ?? fontFilePath ?? undefined
      })
    })
  )

  // Clip Stitcher — generate composite clips from non-contiguous segments
  ipcMain.handle(
    Ch.Invoke.STITCH_GENERATE_COMPOSITE_CLIPS,
    wrapHandler(Ch.Invoke.STITCH_GENERATE_COMPOSITE_CLIPS, async (
      event,
      apiKey: string,
      formattedTranscript: string,
      videoDuration: number,
      wordTimestamps: { text: string; start: number; end: number }[]
    ) => {
      return generateStitchedClips(apiKey, formattedTranscript, videoDuration, wordTimestamps, (p: StitchingProgress) => {
        event.sender.send(Ch.Send.STITCH_PROGRESS, p)
      })
    })
  )

  // Export Manifest — generate manifest.json + manifest.csv
  ipcMain.handle(
    Ch.Invoke.EXPORT_GENERATE_MANIFEST,
    wrapHandler(Ch.Invoke.EXPORT_GENERATE_MANIFEST, async (
      _event,
      outputDirectory: string,
      jobs: RenderClipJob[],
      clipMetaArray: ManifestJobMeta[],
      sourceMeta: { name: string; path: string; duration: number }
    ): Promise<{ jsonPath: string; csvPath: string }> => {
      const { encoder } = getEncoder()
      const options = { jobs, outputDirectory }
      const manifest = generateRenderManifest({
        jobs,
        options: options as Parameters<typeof generateRenderManifest>[0]['options'],
        clipMeta: clipMetaArray,
        clipResults: new Map(jobs.map((j) => [j.clipId, null])),
        clipRenderTimes: new Map(),
        totalRenderTimeMs: 0,
        encoder,
        sourceName: sourceMeta.name,
        sourcePath: sourceMeta.path,
        sourceDuration: sourceMeta.duration
      })
      return writeManifestFiles(manifest, outputDirectory)
    })
  )
}
