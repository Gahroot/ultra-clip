import { BrowserWindow, ipcMain } from 'electron'
import { Ch } from '@shared/ipc-channels'
import { wrapHandler } from '../ipc-error-handler'
import { startBatchRender, cancelRender, type RenderBatchOptions } from '../render-pipeline'
import { generateSoundPlacements, type EditEvent } from '../sound-design'
import { analyzeEmphasisHeuristic } from '../word-emphasis'
import { buildBlurBackgroundFilter, type BlurBackgroundConfig } from '../layouts/blur-background'
import { buildSplitScreenFilter } from '../layouts/split-screen'
import type { SplitScreenLayout, VideoSource, SplitScreenConfig } from '../layouts/split-screen'
import { extractBRollKeywords } from '../broll-keywords'
import type { WordTimestamp as BRollWordTimestamp } from '../broll-keywords'
import { fetchBRollClips, type BRollVideoResult } from '../broll-pexels'
import { buildBRollPlacements } from '../broll-placement'
import { generateBRollImage } from '../broll-image-gen'
import { imageToVideoClip } from '../broll-image-overlay'
import type { BRollSettings as BRollSettingsConfig } from '../broll-placement'
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
import { resolveShotStyles, buildPresetLookup, type StylePresetForResolution } from '../render/shot-style-resolver'

export function registerRenderHandlers(): void {
  // Render — start a batch render of approved clips
  ipcMain.handle(Ch.Invoke.RENDER_START_BATCH, wrapHandler(Ch.Invoke.RENDER_START_BATCH, async (event, options: RenderBatchOptions) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) throw new Error('No BrowserWindow found for render request')

    // ── Phase 1: B-Roll placement generation ────────────────────────────────
    // When B-Roll is enabled, generate placements for each clip. This runs
    // BEFORE sound design so that B-Roll transition edit events are available
    // for the sound design placement engine to consume.
    if (options.broll?.enabled && (options.broll.pexelsApiKey || options.broll.sourceMode === 'ai-generated')) {
      for (const job of options.jobs) {
        // Skip clips that already have pre-computed placements
        if (job.brollPlacements && job.brollPlacements.length > 0) continue

        win.webContents.send(Ch.Send.RENDER_CLIP_PREPARE, {
          clipId: job.clipId,
          message: 'Generating B-Roll placements…',
          percent: 5
        })

        const clipDuration = job.endTime - job.startTime
        const clipWords = (job.wordTimestamps ?? []).filter(
          (w) => w.start >= job.startTime && w.end <= job.endTime
        )

        try {
          // Use AI edit plan B-Roll suggestions as keyword source when available,
          // otherwise extract keywords from the transcript using Gemini.
          const sourceMode = options.broll.sourceMode ?? 'auto'
          const geminiApiKey = options.geminiApiKey ?? ''
          const styleCategory = options.styleCategory ?? 'custom'

          let keywords: Array<{ keyword: string; timestamp: number; suggestedSource?: 'stock' | 'ai-generated' }>

          if (job.brollSuggestions && job.brollSuggestions.length > 0) {
            // Convert AI edit plan B-Roll suggestions to keyword format
            keywords = job.brollSuggestions.map((s) => ({
              keyword: s.keyword,
              timestamp: s.timestamp,
              suggestedSource: s.suggestedSource
            }))
            console.log(
              `[B-Roll] Clip ${job.clipId}: using ${keywords.length} AI edit plan keywords`
            )
          } else {
            // Extract keywords via Gemini (requires transcript text)
            win.webContents.send(Ch.Send.RENDER_CLIP_PREPARE, {
              clipId: job.clipId,
              message: 'Extracting B-Roll keywords…',
              percent: 10
            })
            const localWords = clipWords.map((w) => ({
              text: w.text,
              start: w.start - job.startTime,
              end: w.end - job.startTime
            }))
            const transcriptText = clipWords.map((w) => w.text).join(' ')
            keywords = await extractBRollKeywords(
              transcriptText,
              localWords,
              0,
              clipDuration,
              options.broll.pexelsApiKey || geminiApiKey
            )
          }

          if (keywords.length === 0) {
            console.log(`[B-Roll] Clip ${job.clipId}: no keywords — skipping`)
            continue
          }

          // ── Route each keyword to stock (Pexels) or AI-generated image ──────
          const uniqueKeywords = [...new Set(keywords.map((k) => k.keyword))]
          const downloadedClips = new Map<string, BRollVideoResult>()

          // Build per-keyword source lookup from suggestions
          const keywordSourceMap = new Map<string, 'stock' | 'ai-generated' | undefined>()
          for (const kw of keywords) {
            if (kw.suggestedSource && !keywordSourceMap.has(kw.keyword)) {
              keywordSourceMap.set(kw.keyword, kw.suggestedSource)
            }
          }

          // Partition keywords into stock vs AI-generated
          const stockKeywords: string[] = []
          const aiKeywords: string[] = []

          for (const kw of uniqueKeywords) {
            if (sourceMode === 'stock') {
              stockKeywords.push(kw)
            } else if (sourceMode === 'ai-generated') {
              aiKeywords.push(kw)
            } else {
              // auto — check per-keyword suggestedSource, default to stock
              const suggested = keywordSourceMap.get(kw)
              if (suggested === 'ai-generated') {
                aiKeywords.push(kw)
              } else {
                stockKeywords.push(kw)
              }
            }
          }

          // Fetch Pexels stock footage for stock keywords
          if (stockKeywords.length > 0 && options.broll.pexelsApiKey) {
            win.webContents.send(Ch.Send.RENDER_CLIP_PREPARE, {
              clipId: job.clipId,
              message: `Downloading stock footage for ${stockKeywords.length} keyword(s)…`,
              percent: 20
            })
            const pexelsClips = await fetchBRollClips(
              stockKeywords,
              options.broll.pexelsApiKey,
              options.broll.clipDuration
            )
            for (const [kw, clip] of pexelsClips) {
              downloadedClips.set(kw, clip)
            }
          }

          // Generate AI images for ai-generated keywords, convert to video clips
          if (aiKeywords.length > 0 && geminiApiKey) {
            const transcriptText = clipWords.map((w) => w.text).join(' ')

            win.webContents.send(Ch.Send.RENDER_CLIP_PREPARE, {
              clipId: job.clipId,
              message: `Generating ${aiKeywords.length} AI image(s)…`,
              percent: 30
            })

            for (let ki = 0; ki < aiKeywords.length; ki++) {
              const kw = aiKeywords[ki]
              try {
                // Get a few words of transcript context around the keyword's timestamp
                const kwEntry = keywords.find((k) => k.keyword === kw)
                const contextWords = transcriptText
                  .split(/\s+/)
                  .slice(
                    Math.max(0, Math.floor((kwEntry?.timestamp ?? 0) * 3) - 10),
                    Math.floor((kwEntry?.timestamp ?? 0) * 3) + 20
                  )
                  .join(' ')

                const imageResult = await generateBRollImage(
                  kw,
                  contextWords,
                  styleCategory,
                  geminiApiKey
                )
                if (imageResult) {
                  const videoPath = await imageToVideoClip(imageResult.filePath, options.broll.clipDuration)
                  downloadedClips.set(kw, {
                    filePath: videoPath,
                    duration: options.broll.clipDuration,
                    keyword: kw,
                    pexelsId: 0 // Not from Pexels — AI-generated
                  })
                  console.log(`[B-Roll] AI image generated for "${kw}"`)
                  win.webContents.send(Ch.Send.RENDER_CLIP_PREPARE, {
                    clipId: job.clipId,
                    message: `Generated B-Roll image: "${kw}"`,
                    percent: 30 + Math.round(((ki + 1) / aiKeywords.length) * 20)
                  })
                }
              } catch (aiErr) {
                const aiMsg = aiErr instanceof Error ? aiErr.message : String(aiErr)
                console.warn(`[B-Roll] AI generation failed for "${kw}": ${aiMsg}`)
              }
            }
          }

          if (downloadedClips.size === 0) {
            console.log(`[B-Roll] Clip ${job.clipId}: no clips downloaded — skipping`)
            continue
          }

          // Build placements from keywords + downloaded footage
          win.webContents.send(Ch.Send.RENDER_CLIP_PREPARE, {
            clipId: job.clipId,
            message: 'Building B-Roll placements…',
            percent: 80
          })

          const brollSettings: BRollSettingsConfig = {
            enabled: true,
            pexelsApiKey: options.broll.pexelsApiKey,
            intervalSeconds: options.broll.intervalSeconds,
            clipDuration: options.broll.clipDuration,
            displayMode: options.broll.displayMode,
            transition: options.broll.transition,
            pipSize: options.broll.pipSize,
            pipPosition: options.broll.pipPosition
          }

          job.brollPlacements = buildBRollPlacements(
            clipDuration,
            keywords,
            downloadedClips,
            brollSettings
          )

          // When AI edit plan provided B-Roll suggestions, override the display
          // mode and transition for each placement to match the AI's recommendation
          if (job.brollSuggestions && job.brollSuggestions.length > 0) {
            for (const placement of job.brollPlacements) {
              const suggestion = job.brollSuggestions.find(
                (s) => s.keyword === placement.keyword &&
                  Math.abs(s.timestamp - placement.startTime) < placement.duration
              )
              if (suggestion) {
                placement.displayMode = suggestion.displayMode
                placement.transition = suggestion.transition
              }
            }
          }

          console.log(
            `[B-Roll] Clip ${job.clipId}: generated ${job.brollPlacements.length} placement(s)`
          )

          win.webContents.send(Ch.Send.RENDER_CLIP_PREPARE, {
            clipId: job.clipId,
            message: `B-Roll ready (${job.brollPlacements.length} placement${job.brollPlacements.length !== 1 ? 's' : ''})`,
            percent: 90
          })
        } catch (brollErr) {
          const msg = brollErr instanceof Error ? brollErr.message : String(brollErr)
          console.warn(`[B-Roll] Clip ${job.clipId}: placement generation failed — ${msg}`)
          // Don't abort the whole batch — just skip B-Roll for this clip
        }
      }
    }

    // ── Phase 1.5: Resolve per-shot style assignments ───────────────────────
    // When clips have shotStyles (preset IDs) and shots (time ranges), resolve
    // them into concrete ShotStyleConfig objects that the render features consume.
    if (options.stylePresets && options.stylePresets.length > 0) {
      const presetLookup = buildPresetLookup(options.stylePresets as StylePresetForResolution[])

      for (const job of options.jobs) {
        if (!job.shotStyles || job.shotStyles.length === 0 || !job.shots || job.shots.length === 0) {
          continue
        }

        try {
          win.webContents.send(Ch.Send.RENDER_CLIP_PREPARE, {
            clipId: job.clipId,
            message: 'Resolving shot styles…',
            percent: 91
          })

          job.shotStyleConfigs = resolveShotStyles(
            job.shotStyles,
            job.shots as import('@shared/types').ShotSegment[],
            presetLookup
          )

          if (job.shotStyleConfigs.length > 0) {
            console.log(
              `[ShotStyles] Clip ${job.clipId}: resolved ${job.shotStyleConfigs.length} per-shot style config(s)`
            )
          }
        } catch (err) {
          console.warn(`[ShotStyles] Clip ${job.clipId}: resolution failed —`, err)
        }
      }
    }

    // ── Phase 2: Sound design placement generation ──────────────────────────
    // When sound design is enabled, compute emphasis-aware placements for each
    // clip. Uses B-Roll placements (from Phase 1) to derive transition edit
    // events, and AI edit plan SFX suggestions for additional sound cues.
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

        // ── Derive edit events from all sources ───────────────────────────
        const editEvents: EditEvent[] = []

        // Pre-computed edit events from the renderer (e.g. AI edit plan SFX sync)
        if (job.editEvents && job.editEvents.length > 0) {
          editEvents.push(...job.editEvents)
        }

        // AI edit plan SFX suggestions → edit events for sound design sync
        if (job.aiSfxSuggestions && job.aiSfxSuggestions.length > 0) {
          for (const sfx of job.aiSfxSuggestions) {
            // Map AI SFX suggestion types to sound design edit event types.
            // The sound design engine picks the right SFX file based on the type.
            editEvents.push({
              type: 'broll-transition', // reuse broll-transition for synced SFX
              time: sfx.timestamp
            })
          }
        }

        // B-Roll transition events (from Phase 1 placement generation)
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
          editEvents.length > 0 ? editEvents : undefined,
          job.shotStyleConfigs
        )

        win.webContents.send(Ch.Send.RENDER_CLIP_PREPARE, {
          clipId: job.clipId,
          message: `Sound design ready (${job.soundPlacements.length} placement${job.soundPlacements.length !== 1 ? 's' : ''})`,
          percent: 95
        })

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
