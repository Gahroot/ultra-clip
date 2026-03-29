import type { ClipCandidate } from '../../store'
import type { PipelineContext } from './types'

/** Send completion notifications + trigger auto-mode if enabled. */
export function notificationStage(
  ctx: PipelineContext,
  clips: ClipCandidate[],
  autoModeRanRef: React.MutableRefObject<Set<string>>
): void {
  const { source, setPipeline, getState } = ctx

  setPipeline({ stage: 'ready', message: `Found ${clips.length} clip candidates`, percent: 100 })

  // Intentionally reading latest state at execution time — notification
  // preferences and auto-mode config should reflect the current settings.
  const state = getState()
  if (state.settings.enableNotifications && !document.hasFocus()) {
    const maxScore = clips.length > 0 ? Math.max(...clips.map((c) => c.score)) : 0
    window.api.sendNotification({
      title: 'Processing Complete',
      body: `Found ${clips.length} clips with scores up to ${maxScore}`
    })
  }

  // Auto Mode
  if (state.autoMode.enabled && !autoModeRanRef.current.has(source.id)) {
    autoModeRanRef.current.add(source.id)
    const { approved, rejected } = state.approveClipsAboveScore(source.id, state.autoMode.approveThreshold)
    console.log(
      `[Auto-mode] Approved ${approved} clip${approved !== 1 ? 's' : ''}, ` +
      `rejected ${rejected} — score threshold ≥ ${state.autoMode.approveThreshold}` +
      (state.autoMode.autoRender && approved > 0 ? ', starting render…' : '')
    )
    state.setAutoModeResult({
      sourceId: source.id,
      approved,
      threshold: state.autoMode.approveThreshold,
      didRender: state.autoMode.autoRender && approved > 0
    })
  }
}
