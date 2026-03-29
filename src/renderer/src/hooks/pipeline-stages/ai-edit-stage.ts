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
import { BUILT_IN_EDIT_STYLE_PRESETS } from '../../store/helpers'

/** Run AI edit plan generation for all scored clips. */
export async function aiEditStage(
  ctx: PipelineContext,
  clips: ClipCandidate[]
): Promise<void> {
  const { check, setPipeline, addError, store, source, geminiApiKey, processingConfig } = ctx

  if (!processingConfig.enableAiEdit) return
  if (clips.length === 0) return

  const reporter = createStageReporter(setPipeline, 'ai-editing')
  reporter.start('Preparing AI edit plans…')
  check()

  // Resolve style preset — fall back to 'viral' default when none is active
  const activeStylePresetId = ctx.getState().activeStylePresetId
  const preset = activeStylePresetId
    ? BUILT_IN_EDIT_STYLE_PRESETS.find((p) => p.id === activeStylePresetId)
    : undefined
  const stylePresetId = preset?.id ?? 'viral'
  const stylePresetName = preset?.name ?? 'Viral'
  const stylePresetCategory = preset?.category ?? 'viral'

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
