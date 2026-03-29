import { createStageReporter } from '../../lib/progress-reporter'
import type { PipelineContext } from './types'
import { handleStageError } from './types'
import type { TranscriptionStageResult } from './transcription-stage'

/** Generate stitched (multi-segment) clips via AI. */
export async function stitchGenerationStage(
  ctx: PipelineContext,
  transcription: TranscriptionStageResult
): Promise<void> {
  const { source, check, setPipeline, addError, store, geminiApiKey, processingConfig } = ctx

  if (!processingConfig.enableClipStitching) return

  const reporter = createStageReporter(setPipeline, 'stitching')
  reporter.start('AI is composing stitched clips…')
  check()

  const unsubStitch = window.api.onStitchingProgress(({ stage, message }) => {
    const stagePercents: Record<string, number> = {
      analyzing: 20,
      composing: 60,
      validating: 90
    }
    reporter.update(message, stagePercents[stage] ?? 50)
  })

  try {
    const stitchResult = await window.api.generateStitchedClips(
      geminiApiKey,
      transcription.formattedForAI,
      source.duration,
      transcription.transcriptionResult.words
    )
    check()

    if (stitchResult.clips.length > 0) {
      const stitchedCandidates = stitchResult.clips.map((clip) => ({
        id: clip.id,
        sourceId: source.id,
        segments: clip.segments.map((s) => ({
          startTime: s.startTime,
          endTime: s.endTime,
          text: s.text,
          role: s.role as 'hook' | 'context' | 'payoff' | 'rehook' | 'bridge'
        })),
        totalDuration: clip.totalDuration,
        narrative: clip.narrative,
        hookText: clip.hookText,
        score: clip.score,
        reasoning: clip.reasoning,
        status: 'pending' as const
      }))
      store.setStitchedClips(source.id, stitchedCandidates)
    }

    setPipeline({ stage: 'stitching', message: `Found ${stitchResult.clips.length} stitched clips`, percent: 100 })
  } catch (stitchErr) {
    handleStageError(stitchErr, 'Clip stitching failed', addError)
  } finally {
    unsubStitch()
  }
}
