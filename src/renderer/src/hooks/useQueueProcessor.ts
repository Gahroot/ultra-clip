import { useEffect, useRef } from 'react'
import { useStore } from '../store'
import { usePipeline } from './usePipeline'

/**
 * useQueueProcessor
 *
 * Watches queue state and drives sequential processing:
 * - When queueMode is active, not paused, and the pipeline is idle (or just finished),
 *   it dequeues the next source and kicks off processVideo.
 * - On error: marks the item as errored, logs it, then skips to next source.
 * - On done: marks the item as done with clip count, then advances to next.
 * - Respects queuePaused — will not advance while paused.
 */
export function useQueueProcessor() {
  const queueMode = useStore((s) => s.queueMode)
  const queuePaused = useStore((s) => s.queuePaused)
  const processingQueue = useStore((s) => s.processingQueue)
  const pipeline = useStore((s) => s.pipeline)
  const sources = useStore((s) => s.sources)
  const clips = useStore((s) => s.clips)
  const activeSourceId = useStore((s) => s.activeSourceId)

  const dequeueNext = useStore((s) => s.dequeueNext)
  const setActiveSource = useStore((s) => s.setActiveSource)
  const setPipeline = useStore((s) => s.setPipeline)
  const markQueueItemProcessing = useStore((s) => s.markQueueItemProcessing)
  const markQueueItemDone = useStore((s) => s.markQueueItemDone)
  const markQueueItemError = useStore((s) => s.markQueueItemError)
  const clearQueue = useStore((s) => s.clearQueue)
  const addError = useStore((s) => s.addError)

  const { processVideo, cancelProcessing } = usePipeline()

  // Track whether we triggered the current processing run (to avoid reacting to
  // manual single-source processing when queue mode is off)
  const activeQueueSourceRef = useRef<string | null>(null)
  const processingRef = useRef(false)

  // When queue mode activates (or resumes), kick off the next item if idle
  useEffect(() => {
    if (!queueMode || queuePaused) return
    if (processingRef.current) return
    if (pipeline.stage !== 'idle') return
    if (processingQueue.length === 0) {
      // Queue exhausted
      clearQueue()
      return
    }

    const nextId = dequeueNext()
    if (!nextId) return

    const source = sources.find((s) => s.id === nextId)
    if (!source) {
      // Source was removed — skip
      markQueueItemError(nextId, 'Source not found')
      return
    }

    processingRef.current = true
    activeQueueSourceRef.current = nextId

    setActiveSource(nextId)
    markQueueItemProcessing(nextId)

    processVideo(source).then(() => {
      // processVideo resolves after the pipeline finishes (ready or error)
      // The pipeline stage update is handled below via the stage-watching effect
    })
  }, [queueMode, queuePaused, pipeline.stage, processingQueue.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // Watch for pipeline completion to advance the queue
  useEffect(() => {
    if (!queueMode) return
    if (!activeQueueSourceRef.current) return
    const currentSourceId = activeQueueSourceRef.current

    if (pipeline.stage === 'ready') {
      processingRef.current = false
      const clipCount = clips[currentSourceId]?.length ?? 0
      markQueueItemDone(currentSourceId, clipCount)
      activeQueueSourceRef.current = null

      // Reset pipeline to idle so the next iteration triggers
      setPipeline({ stage: 'idle', message: '', percent: 0 })
    } else if (pipeline.stage === 'error') {
      processingRef.current = false
      const errMsg = pipeline.message || 'Processing failed'
      markQueueItemError(currentSourceId, errMsg)
      addError({ source: 'pipeline', message: `Queue: ${sources.find(s => s.id === currentSourceId)?.name ?? currentSourceId} — ${errMsg}` })
      activeQueueSourceRef.current = null

      // Reset pipeline to idle so queue can advance
      setPipeline({ stage: 'idle', message: '', percent: 0 })
    }
  }, [pipeline.stage]) // eslint-disable-line react-hooks/exhaustive-deps

  // When queue becomes empty after processing all items, mark queue done
  useEffect(() => {
    if (!queueMode) return
    if (processingQueue.length === 0 && !processingRef.current && pipeline.stage === 'idle') {
      // Only clear if we actually processed something (activeSourceId was set by queue)
      if (activeQueueSourceRef.current === null) {
        // Small delay to let last done marker settle before clearing
        const t = setTimeout(() => {
          clearQueue()
        }, 1500)
        return () => clearTimeout(t)
      }
    }
  }, [queueMode, processingQueue.length, pipeline.stage]) // eslint-disable-line react-hooks/exhaustive-deps

  // Expose a cancel-all function
  const cancelQueue = () => {
    cancelProcessing()
    processingRef.current = false
    activeQueueSourceRef.current = null
    clearQueue()
  }

  return { cancelQueue, activeQueueSourceId: activeQueueSourceRef.current }
}
