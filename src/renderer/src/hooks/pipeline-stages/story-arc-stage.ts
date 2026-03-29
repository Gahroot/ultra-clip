import type { ClipCandidate } from '../../store'
import type { PipelineContext } from './types'
import { handleStageError } from './types'
import type { TranscriptionStageResult } from './transcription-stage'

/** Story arc detection — multi-clip narrative arc analysis via AI. */
export async function storyArcStage(
  ctx: PipelineContext,
  transcription: TranscriptionStageResult,
  clips: ClipCandidate[]
): Promise<void> {
  const { source, check, setPipeline, addError, store, geminiApiKey, processingConfig } = ctx

  if (!processingConfig.enableMultiPart) return

  setPipeline({ stage: 'detecting-arcs', message: 'Analyzing narrative structure…', percent: 0 })
  check()

  try {
    const clipData = clips.map((c) => ({
      startTime: c.startTime,
      endTime: c.endTime,
      score: c.score,
      text: c.text,
      hookText: c.hookText,
      reasoning: c.reasoning
    }))

    const arcs = await window.api.detectStoryArcs(
      geminiApiKey,
      transcription.transcriptionResult,
      clipData
    )
    check()

    if (arcs.length > 0) {
      const storyArcData = arcs.map((arc, arcIndex) => {
        setPipeline({
          stage: 'detecting-arcs',
          message: `Processing arc ${arcIndex + 1}/${arcs.length}: ${arc.title}`,
          percent: Math.round(((arcIndex + 1) / arcs.length) * 100)
        })

        const arcClipIds: string[] = []
        for (const arcClip of arc.clips) {
          const match = clips.find(
            (c) =>
              Math.abs(c.startTime - arcClip.startTime) < 1 &&
              Math.abs(c.endTime - arcClip.endTime) < 1
          )
          if (match) arcClipIds.push(match.id)
        }

        return {
          id: arc.id,
          title: arc.title,
          clipIds: arcClipIds,
          narrativeDescription: arc.narrativeDescription
        }
      })

      store.setStoryArcs(source.id, storyArcData)

      // Generate series metadata and assign part info per arc
      for (const arcData of storyArcData) {
        if (arcData.clipIds.length < 2) continue

        try {
          const originalArc = arcs.find((a) => a.id === arcData.id)
          if (!originalArc) continue

          const metadata = await window.api.generateSeriesMetadata(originalArc)

          arcData.clipIds.forEach((clipId, partIndex) => {
            if (partIndex < metadata.parts.length) {
              const part = metadata.parts[partIndex]
              store.setClipPartInfo(source.id, clipId, {
                arcId: arcData.id,
                partNumber: part.partNumber,
                totalParts: part.totalParts,
                partTitle: part.title,
                endCardText: part.endCardText
              })
            }
          })
        } catch (metaErr) {
          handleStageError(metaErr, `Series metadata failed for "${arcData.title}"`, addError)
        }
      }
    }

    setPipeline({
      stage: 'detecting-arcs',
      message: `Found ${arcs.length} story arc${arcs.length !== 1 ? 's' : ''}`,
      percent: 100
    })
  } catch (arcErr) {
    handleStageError(arcErr, 'Story arc detection failed', addError)
  }
}
