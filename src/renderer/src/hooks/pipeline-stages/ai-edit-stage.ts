// ---------------------------------------------------------------------------
// AI Edit Stage — batch AI edit orchestration
//
// Optional pipeline stage (enabled via processingConfig.enableAiEdit) that
// runs after all other analysis steps.  Calls the AI edit orchestrator for
// every clip in one batch request, then stores the resulting edit plans on
// each ClipCandidate.  The plans are consumed at render time to drive word
// emphasis, B-Roll placement, and SFX selection.
// ---------------------------------------------------------------------------

import type { ClipCandidate } from '../../store'
import { createStageReporter } from '../../lib/progress-reporter'
import type { PipelineContext } from './types'
import { handleStageError } from './types'
/** Run AI edit plan generation for all scored clips. */
export async function aiEditStage(
  ctx: PipelineContext,
  clips: ClipCandidate[]
): Promise<void> {
  const { check, setPipeline, addError, store, source, geminiApiKey, processingConfig } = ctx

  if (!processingConfig.enableAiEdit) return
  if (clips.length === 0) return

  // Skip gracefully when no Gemini API key is configured
  if (!geminiApiKey) {
    console.log('[AI Edit] No Gemini API key — skipping AI edit orchestration')
    return
  }

  const reporter = createStageReporter(setPipeline, 'ai-editing')
  reporter.start('Preparing AI edit plans…')
  check()

  // Use the selected edit style ID (defaults to 'cinematic')
  const selectedEditStyleId = ctx.getState().selectedEditStyleId
  const stylePresetId = selectedEditStyleId ?? 'cinematic'
  const stylePresetName = stylePresetId
  const stylePresetCategory = 'custom'

  // Build clip input list — only clips that have word timestamps
  const clipInputs = clips
    .filter((c) => c.wordTimestamps && c.wordTimestamps.length > 0)
    .map((c) => ({
      clipId: c.id,
      clipStart: c.startTime,
      clipEnd: c.endTime,
      words: c.wordTimestamps ?? [],
      transcriptText: c.text
    }))

  if (clipInputs.length === 0) {
    reporter.done('No clips with transcript data — skipping')
    ctx.markStageCompleted('ai-editing')
    return
  }

  // Subscribe to per-clip progress events from the main process
  const unsubProgress = window.api.onAiEditProgress(({ clipIndex, totalClips, message }) => {
    const percent = Math.round(((clipIndex + 1) / totalClips) * 100)
    reporter.update(message, percent)
  })

  let plans: import('@shared/types').AIEditPlan[] = []
  try {
    plans = await window.api.generateBatchEditPlans(
      geminiApiKey,
      clipInputs,
      stylePresetId,
      stylePresetName,
      stylePresetCategory
    )
  } catch (err) {
    handleStageError(err, 'AI Edit orchestration failed', addError)
    return
  } finally {
    unsubProgress()
  }

  check()

  // Apply each plan to its clip
  for (const plan of plans) {
    store.setClipAIEditPlan(source.id, plan.clipId, plan)
  }

  reporter.done(`AI edit plans ready — ${plans.length}/${clipInputs.length} clips`)
  ctx.markStageCompleted('ai-editing')
}
