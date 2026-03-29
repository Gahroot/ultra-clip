// ---------------------------------------------------------------------------
// Captions feature — ASS subtitle generation + burn-in overlay
// ---------------------------------------------------------------------------

import { existsSync } from 'fs'
import { join } from 'path'
import type { RenderFeature, PrepareResult, OverlayContext, OverlayPassResult } from './feature'
import type { RenderClipJob, RenderBatchOptions } from '../types'
import { buildASSFilter } from '../helpers'
import { generateCaptions } from '../../captions'
import { analyzeEmphasisHeuristic } from '../../word-emphasis'
import { ASPECT_RATIO_CONFIGS } from '../../aspect-ratios'

/**
 * Create a captions render feature.
 *
 * Uses a factory function (closure) so the resolved `fontsDir` can be cached
 * across all clips in a batch without requiring a class instance.
 */
export function createCaptionsFeature(): RenderFeature {
  let fontsDir: string | undefined

  /** Resolve the bundled fonts directory once and cache it. */
  async function resolveFontsDir(): Promise<string | undefined> {
    if (fontsDir !== undefined) return fontsDir

    try {
      const { app } = await import('electron')
      const fontsPath = app.isPackaged
        ? join(process.resourcesPath, 'fonts')
        : join(__dirname, '../../resources/fonts')
      if (existsSync(fontsPath)) {
        fontsDir = fontsPath
        console.log(`[Captions] Fonts directory: ${fontsDir}`)
        return fontsDir
      }
    } catch {
      const fontsPath = join(__dirname, '../../resources/fonts')
      if (existsSync(fontsPath)) {
        fontsDir = fontsPath
        return fontsDir
      }
    }

    fontsDir = undefined
    return undefined
  }

  return {
    name: 'captions',

    async prepare(job: RenderClipJob, batchOptions: RenderBatchOptions): Promise<PrepareResult> {
      // Check global captions toggle
      if (!batchOptions.captionsEnabled || !batchOptions.captionStyle) {
        return { tempFiles: [], modified: false }
      }

      // Check per-clip override
      const captionOv = job.clipOverrides?.enableCaptions
      const captionsEnabled = captionOv === undefined ? true : captionOv
      if (!captionsEnabled) {
        return { tempFiles: [], modified: false }
      }

      // Filter word timestamps to the clip's time range
      const words = (job.wordTimestamps ?? []).filter(
        (w) => w.start >= job.startTime && w.end <= job.endTime
      )
      if (words.length === 0) {
        return { tempFiles: [], modified: false }
      }

      // Shift to 0-based clip-relative timestamps
      const localWordsBase = words.map((w) => ({
        text: w.text,
        start: w.start - job.startTime,
        end: w.end - job.startTime
      }))

      // Run heuristic emphasis analysis to tag words as normal/emphasis/supersize
      const emphasized = analyzeEmphasisHeuristic(localWordsBase)
      const localWords = localWordsBase.map((w, i) => ({
        ...w,
        emphasis: emphasized[i]?.emphasis ?? ('normal' as const)
      }))

      // Store emphasis keyframes on the job so other features (e.g., reactive
      // zoom) can read them without re-running the analysis.
      job.emphasisKeyframes = localWords
        .filter((w) => w.emphasis === 'emphasis' || w.emphasis === 'supersize')
        .map((w) => ({ time: w.start, end: w.end, level: w.emphasis as 'emphasis' | 'supersize' }))

      // Resolve fonts dir (cached after first call)
      await resolveFontsDir()

      try {
        const arCfg = ASPECT_RATIO_CONFIGS[batchOptions.outputAspectRatio ?? '9:16']

        // Subtitles use bottom-center alignment (AN2); y% is from top,
        // so marginV (from bottom) = (1 - y/100) * height
        const marginVOverride = batchOptions.templateLayout?.subtitles
          ? Math.round((1 - batchOptions.templateLayout.subtitles.y / 100) * arCfg.height)
          : undefined

        job.assFilePath = await generateCaptions(
          localWords,
          batchOptions.captionStyle,
          undefined,
          arCfg.width,
          arCfg.height,
          marginVOverride
        )
        console.log(`[Captions] Clip ${job.clipId}: generated ${job.assFilePath}`)
        return { tempFiles: [job.assFilePath], modified: true }
      } catch (captionErr) {
        console.warn(`[Captions] Clip ${job.clipId}: generation failed:`, captionErr)
        return { tempFiles: [], modified: false }
      }
    },

    overlayPass(job: RenderClipJob, _context: OverlayContext): OverlayPassResult | null {
      if (!job.assFilePath) return null
      return {
        name: 'captions',
        filter: buildASSFilter(job.assFilePath, fontsDir)
      }
    }
  }
}
