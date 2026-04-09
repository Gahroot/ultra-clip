import { useRef, useCallback } from 'react'
import { useStore } from '../store'
import type { SourceVideo, PipelineStage } from '../store'
import type { PipelineContext } from './pipeline-stages/types'
import {
  downloadStage,
  transcriptionStage,
  clipMappingStage,
  thumbnailStage,
  loopOptimizationStage,
  variantGenerationStage,
  stitchGenerationStage,
  faceDetectionStage,
  storyArcStage,
  aiEditStage,
  segmentSplittingStage,
  notificationStage
} from './pipeline-stages'

/** Ordered list of pipeline stages used to determine skip logic. */
const PIPELINE_STAGE_ORDER: PipelineStage[] = [
  'downloading',
  'transcribing',
  'scoring',
  'optimizing-loops',
  'generating-variants',
  'stitching',
  'detecting-faces',
  'detecting-arcs',
  'ai-editing',
  'segmenting'
]

export function usePipeline() {
  const setPipeline = useStore((s) => s.setPipeline)
  const setTranscription = useStore((s) => s.setTranscription)
  const setClips = useStore((s) => s.setClips)
  const updateClipCrop = useStore((s) => s.updateClipCrop)
  const updateClipLoop = useStore((s) => s.updateClipLoop)
  const updateClipTrim = useStore((s) => s.updateClipTrim)
  const updateClipThumbnail = useStore((s) => s.updateClipThumbnail)
  const addError = useStore((s) => s.addError)
  const setClipVariants = useStore((s) => s.setClipVariants)
  const setStitchedClips = useStore((s) => s.setStitchedClips)
  const setStoryArcs = useStore((s) => s.setStoryArcs)
  const setClipPartInfo = useStore((s) => s.setClipPartInfo)
  const setClipAIEditPlan = useStore((s) => s.setClipAIEditPlan)
  const setStitchedClipAIEditPlan = useStore((s) => s.setStitchedClipAIEditPlan)
  const setClipFillers = useStore((s) => s.setClipFillers)
  const setSegments = useStore((s) => s.setSegments)
  const updateSegment = useStore((s) => s.updateSegment)
  const markStageCompleted = useStore((s) => s.markStageCompleted)
  const setFailedPipelineStage = useStore((s) => s.setFailedPipelineStage)
  const setCachedSourcePath = useStore((s) => s.setCachedSourcePath)
  const clearPipelineCache = useStore((s) => s.clearPipelineCache)
  const snapshotSettings = useStore((s) => s.snapshotSettings)

  const cancelledRef = useRef(false)
  // Track which source IDs auto-mode has already run on (tied to component lifecycle)
  const autoModeRanRef = useRef(new Set<string>())

  const cancelProcessing = useCallback(() => {
    cancelledRef.current = true
    setPipeline({ stage: 'idle', message: '', percent: 0 })
  }, [setPipeline])

  const processVideo = useCallback(
    async (source: SourceVideo, resumeFrom?: PipelineStage) => {
      cancelledRef.current = false

      // Track the last active stage so we know which stage failed
      let currentStage: PipelineStage = 'idle'

      try {
      console.log('[usePipeline] processVideo START', { sourceId: source.id, resumeFrom })
      if (!resumeFrom) {
        clearPipelineCache()
      }

      snapshotSettings()
      console.log('[usePipeline] settings snapshot OK')

      const shouldSkip = (stage: PipelineStage): boolean => {
        if (!resumeFrom) return false
        const resumeIdx = PIPELINE_STAGE_ORDER.indexOf(resumeFrom)
        const stageIdx = PIPELINE_STAGE_ORDER.indexOf(stage)
        return stageIdx < resumeIdx
      }

      const check = () => {
        if (cancelledRef.current) throw new Error('Processing cancelled')
      }

      // Guard: check connectivity before starting any network-dependent work
      if (!navigator.onLine) {
        const msg = 'No internet connection. AI scoring requires an internet connection.'
        setPipeline({ stage: 'error', message: msg, percent: 0 })
        addError({ source: 'pipeline', message: msg })
        return
      }

      // Intentionally reading latest state at execution time — settings and
      // processingConfig are read imperatively via getState() so the callback
      // doesn't need them in its dependency array.  This avoids unnecessary
      // re-creation of processVideo on every settings keystroke while ensuring
      // we always use the values that were current when the user clicked "Run".
      const currentState = useStore.getState()

      const ctx: PipelineContext = {
        source,
        check,
        setPipeline,
        addError,
        markStageCompleted,
        shouldSkip,
        getState: () => useStore.getState(),
        store: {
          setTranscription,
          setClips,
          updateClipCrop,
          updateClipLoop,
          updateClipTrim,
          updateClipThumbnail,
          setClipVariants,
          setStitchedClips,
          setStoryArcs,
          setClipPartInfo,
          setCachedSourcePath,
          setClipAIEditPlan,
          setStitchedClipAIEditPlan,
          setClipFillers,
          setSegments,
          updateSegment
        },
        geminiApiKey: currentState.settings.geminiApiKey,
        falApiKey: currentState.settings.falApiKey,
        processingConfig: {
          targetDuration: currentState.processingConfig.targetDuration,
          enablePerfectLoop: currentState.processingConfig.enablePerfectLoop,
          clipEndMode: currentState.processingConfig.clipEndMode,
          enableVariants: currentState.processingConfig.enableVariants,
          enableClipStitching: currentState.processingConfig.enableClipStitching,
          enableMultiPart: currentState.processingConfig.enableMultiPart,
          enableAiEdit: currentState.processingConfig.enableAiEdit
        }
      }
        // ── Step 1: Download (YouTube only) ──────────────────────────
        currentStage = 'downloading'
        const { sourcePath } = await downloadStage(ctx)

        // ── Step 2: Transcribe ───────────────────────────────────────
        currentStage = 'transcribing'
        const transcription = await transcriptionStage(ctx, sourcePath)

        // ── Step 3: Score + map to clips ─────────────────────────────
        currentStage = 'scoring'
        let clips = await clipMappingStage(ctx, transcription)

        // ── Step 3.1: Generate thumbnails ────────────────────────────
        await thumbnailStage(ctx, sourcePath, clips)

        // ── Step 3.2: Filler detection ────────────────────────────────
        if (currentState.settings.fillerRemoval.enabled) {
          const fr = currentState.settings.fillerRemoval
          const fillerClipList = clips.filter(c => (c.wordTimestamps ?? []).length > 0)
          let totalFillersFound = 0
          let totalSilencesFound = 0
          let totalRepeatsFound = 0
          for (let fi = 0; fi < fillerClipList.length; fi++) {
            const clip = fillerClipList[fi]
            check()
            const clipWords = (clip.wordTimestamps ?? []).filter(
              (w) => w.start >= clip.startTime && w.end <= clip.endTime
            )
            if (clipWords.length === 0) continue
            setPipeline({
              stage: 'scoring',
              message: `Detecting fillers (${fi + 1}/${fillerClipList.length})…`,
              percent: Math.round(((fi + 1) / fillerClipList.length) * 100)
            })
            try {
              const result = await window.api.detectFillers(clipWords, {
                removeFillerWords: fr.removeFillerWords,
                trimSilences: fr.trimSilences,
                removeRepeats: fr.removeRepeats,
                silenceThreshold: fr.silenceThreshold,
                silenceTargetGap: 0.15,
                fillerWords: fr.fillerWords
              })
              totalFillersFound += result.counts?.filler ?? 0
              totalSilencesFound += result.counts?.silence ?? 0
              totalRepeatsFound += result.counts?.repeat ?? 0
              if (result.segments.length > 0) {
                setClipFillers(source.id, clip.id, result.segments, result.timeSaved)
              }
            } catch {
              // Non-critical — skip filler detection for this clip
            }
          }
          // Summary feedback
          const parts: string[] = []
          if (totalFillersFound > 0) parts.push(`${totalFillersFound} filler words`)
          if (totalSilencesFound > 0) parts.push(`${totalSilencesFound} silences`)
          if (totalRepeatsFound > 0) parts.push(`${totalRepeatsFound} repeats`)
          if (parts.length > 0) {
            setPipeline({
              stage: 'scoring',
              message: `Fillers detected: ${parts.join(', ')}`,
              percent: 100
            })
          }
        }

        // ── Step 3.5: Clip boundary optimization ─────────────────────
        currentStage = 'optimizing-loops'
        clips = await loopOptimizationStage(ctx, transcription, clips)

        // ── Step 3.6: Variant generation ─────────────────────────────
        currentStage = 'generating-variants'
        await variantGenerationStage(ctx, transcription, clips)

        // ── Step 3.7: Clip stitching ─────────────────────────────────
        currentStage = 'stitching'
        await stitchGenerationStage(ctx, transcription)

        // ── Step 4: Face detection ───────────────────────────────────
        currentStage = 'detecting-faces'
        await faceDetectionStage(ctx, sourcePath, clips)

        // ── Step 5: Story arc detection ──────────────────────────────
        currentStage = 'detecting-arcs'
        await storyArcStage(ctx, transcription, clips)

        // ── Step 6: AI edit orchestration (optional) ─────────────────
        currentStage = 'ai-editing'
        await aiEditStage(ctx, clips)

        // ── Step 7: Segment splitting (optional) ────────────────────
        currentStage = 'segmenting'
        await segmentSplittingStage(ctx, clips)

        // ── Done ─────────────────────────────────────────────────────
        notificationStage(ctx, clips, autoModeRanRef)

        // Pipeline succeeded — clear the failed stage
        clearPipelineCache()
      } catch (err) {
        if (cancelledRef.current) return
        const message = err instanceof Error ? err.message : String(err)
        if (currentStage !== 'idle') {
          setFailedPipelineStage(currentStage)
        }
        setPipeline({ stage: 'error', message, percent: 0 })
        addError({ source: 'pipeline', message })
      }
    },
    // Only stable Zustand action references are listed here.  Reactive values
    // like settings and processingConfig are intentionally omitted — they are
    // read imperatively via useStore.getState() at the start of each run so the
    // callback always sees the latest values without re-creating on every edit.
    [
      setPipeline, setTranscription, setClips, updateClipCrop, updateClipLoop,
      updateClipTrim, updateClipThumbnail, addError, setClipVariants,
      setStitchedClips, setStoryArcs, setClipPartInfo, markStageCompleted,
      setFailedPipelineStage, setCachedSourcePath, clearPipelineCache,
      snapshotSettings, setClipAIEditPlan, setStitchedClipAIEditPlan, setClipFillers, setSegments, updateSegment
    ]
  )

  const isProcessing = useCallback(() => {
    const stage = useStore.getState().pipeline.stage
    return (
      stage === 'downloading' ||
      stage === 'transcribing' ||
      stage === 'scoring' ||
      stage === 'optimizing-loops' ||
      stage === 'generating-variants' ||
      stage === 'stitching' ||
      stage === 'detecting-faces' ||
      stage === 'detecting-arcs' ||
      stage === 'ai-editing' ||
      stage === 'segmenting'
    )
  }, [])

  return { processVideo, cancelProcessing, isProcessing }
}
