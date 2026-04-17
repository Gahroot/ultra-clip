import type { ClipCandidate } from '../../store'
import { createStageReporter } from '../../lib/progress-reporter'
import type { PipelineContext } from './types'
import { handleStageError } from './types'
import type { TranscriptionStageResult } from './transcription-stage'

/** Generate A/B/C packaging variants for each clip. */
export async function variantGenerationStage(
  ctx: PipelineContext,
  transcription: TranscriptionStageResult,
  clips: ClipCandidate[]
): Promise<void> {
  const { check, setPipeline, addError, store, source, geminiApiKey, processingConfig } = ctx

  if (!processingConfig.enableVariants) return

  const reporter = createStageReporter(setPipeline, 'generating-variants')
  reporter.start('Generating clip variants…')
  check()

  // Intentionally reading latest state at execution time — overlay toggles
  // (hookTitle, rehook) should reflect whatever the user has enabled right
  // now, not what was captured at callback-creation time.
  const settings = ctx.getState().settings

  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i]
    const percent = Math.round(((i + 1) / clips.length) * 100)
    reporter.update(`Generating variants… ${i + 1}/${clips.length}`, percent)

    try {
      const variants = await window.api.generateClipVariants(
        geminiApiKey,
        {
          startTime: clip.startTime,
          endTime: clip.endTime,
          score: clip.score,
          text: clip.text,
          hookText: clip.hookText,
          reasoning: clip.reasoning
        },
        transcription.transcriptionResult,
        {
          hookTitle: settings.hookTitleOverlay.enabled,
          rehook: settings.rehookOverlay.enabled
        }
      )
      check()

      const shortLabels = ['A', 'B', 'C', 'D', 'E']
      const uiVariants = variants.map((v, idx) => ({
        id: v.id,
        label: v.label,
        shortLabel: shortLabels[idx] || String.fromCharCode(65 + idx),
        hookText: v.hookText || '',
        startTime: v.startTime,
        endTime: v.endTime,
        overlays: v.overlays.map((o) => o.type),
        captionStyle: v.captionStyle !== 'default' ? v.captionStyle : undefined,
        description: v.description,
        status: 'pending' as const
      }))

      store.setClipVariants(source.id, clip.id, uiVariants)
    } catch (variantErr) {
      handleStageError(variantErr, `Variant generation failed for clip ${i + 1}`, addError)
    }
  }

  reporter.done('Variant generation complete')
}
