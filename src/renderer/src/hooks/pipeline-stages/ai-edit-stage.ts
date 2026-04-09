// ---------------------------------------------------------------------------
// AI Edit Stage — batch AI edit orchestration
//
// Optional pipeline stage (enabled via processingConfig.enableAiEdit) that
// runs after all other analysis steps.  Calls the AI edit orchestrator for
// every clip in one batch request, then stores the resulting edit plans on
// each ClipCandidate.  The plans are consumed at render time to drive word
// emphasis, B-Roll placement, and SFX selection.
// ---------------------------------------------------------------------------

import type { ClipCandidate, StitchedClipCandidate } from '../../store'
import { createStageReporter } from '../../lib/progress-reporter'
import type { PipelineContext } from './types'
import { handleStageError } from './types'
/** Run AI edit plan generation for all scored clips (regular + stitched). */
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

  // Map style IDs to AI guidance categories.
  // 'cinematic' guidance → restraint, slow crossfades, minimal SFX (used for premium/film styles)
  // 'viral'     guidance → high density, energetic SFX
  // 'educational' guidance → clarity-first, moderate density
  // 'minimal'   guidance → near-zero intervention
  const STYLE_CATEGORY_MAP: Record<string, string> = {
    // Low-energy cinematic / documentary
    ember: 'cinematic',
    elevate: 'cinematic',
    film: 'cinematic',
    // Clean minimal
    clarity: 'minimal',
    paper_ii: 'minimal',
    // High-energy viral
    volt: 'viral',
    growth: 'viral',
    lumen: 'viral',
    // Educational / informational
    align: 'educational',
    prime: 'educational'
  }
  const stylePresetCategory = STYLE_CATEGORY_MAP[stylePresetId] ?? 'custom'

  // Gather stitched clips from the store
  const stitchedClips: StitchedClipCandidate[] =
    Object.values(ctx.getState().stitchedClips).flat()

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

  // Add stitched clips — use earliest start / latest end as time range
  const stitchedInputs = stitchedClips
    .filter((sc) => sc.wordTimestamps && sc.wordTimestamps.length > 0)
    .map((sc) => ({
      clipId: sc.id,
      clipStart: Math.min(...sc.segments.map((s) => s.startTime)),
      clipEnd: Math.max(...sc.segments.map((s) => s.endTime)),
      words: sc.wordTimestamps ?? [],
      transcriptText: sc.segments.map((s) => s.text).join(' ')
    }))

  const stitchedClipIds = new Set(stitchedInputs.map((s) => s.clipId))
  const allInputs = [...clipInputs, ...stitchedInputs]

  if (allInputs.length === 0) {
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
      allInputs,
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

  // Apply each plan to its clip (regular or stitched)
  for (const plan of plans) {
    if (stitchedClipIds.has(plan.clipId)) {
      store.setStitchedClipAIEditPlan(source.id, plan.clipId, plan)
    } else {
      store.setClipAIEditPlan(source.id, plan.clipId, plan)
    }
  }

  reporter.done(`AI edit plans ready — ${plans.length}/${allInputs.length} clips`)
  ctx.markStageCompleted('ai-editing')
}
