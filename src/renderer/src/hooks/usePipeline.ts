import { useRef, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { useStore } from '../store'
import type { SourceVideo, ClipCandidate } from '../store'

// Track the last source ID auto-mode ran on to prevent double-runs
const _autoModeRanForSource = new Set<string>()

export function usePipeline() {
  const setPipeline = useStore((s) => s.setPipeline)
  const setTranscription = useStore((s) => s.setTranscription)
  const setClips = useStore((s) => s.setClips)
  const updateClipCrop = useStore((s) => s.updateClipCrop)
  const updateClipLoop = useStore((s) => s.updateClipLoop)
  const updateClipTrim = useStore((s) => s.updateClipTrim)
  const addError = useStore((s) => s.addError)
  const setClipVariants = useStore((s) => s.setClipVariants)
  const setStitchedClips = useStore((s) => s.setStitchedClips)
  const setStoryArcs = useStore((s) => s.setStoryArcs)
  const setClipPartInfo = useStore((s) => s.setClipPartInfo)
  const settings = useStore((s) => s.settings)
  const processingConfig = useStore((s) => s.processingConfig)

  const cancelledRef = useRef(false)

  const cancelProcessing = useCallback(() => {
    cancelledRef.current = true
    setPipeline({ stage: 'idle', message: '', percent: 0 })
  }, [setPipeline])

  const processVideo = useCallback(
    async (source: SourceVideo) => {
      cancelledRef.current = false

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

      try {
        let sourcePath = source.path
        const isYouTube = source.origin === 'youtube'

        // ── Step 1: Download (YouTube only) ──────────────────────────────────
        if (isYouTube && source.youtubeUrl && !source.path) {
          setPipeline({ stage: 'downloading', message: 'Starting download…', percent: 0 })
          check()

          const unsubYT = window.api.onYouTubeProgress(({ percent }) => {
            setPipeline({
              stage: 'downloading',
              message: `Downloading… ${Math.round(percent)}%`,
              percent: Math.round(percent)
            })
          })

          try {
            const result = await window.api.downloadYouTube(source.youtubeUrl)
            sourcePath = result.path
          } finally {
            unsubYT()
          }
          check()
        } else if (isYouTube) {
          setPipeline({ stage: 'downloading', message: 'Video already downloaded', percent: 100 })
        }

        // ── Step 2: Transcribe ────────────────────────────────────────────────
        setPipeline({ stage: 'transcribing', message: 'Extracting audio…', percent: 0 })
        check()

        const stagePercents: Record<string, number> = {
          'extracting-audio': 10,
          'downloading-model': 20,
          'loading-model': 50,
          transcribing: 70
        }

        const unsubTranscribe = window.api.onTranscribeProgress(({ stage, message, percent }) => {
          let resolvedPercent = stagePercents[stage] ?? 50
          // For model download, blend base percent with actual download progress
          if (stage === 'downloading-model' && typeof percent === 'number') {
            // Download occupies the 20–50% band
            resolvedPercent = Math.round(20 + (percent / 100) * 30)
          }
          setPipeline({
            stage: 'transcribing',
            message,
            percent: resolvedPercent
          })
        })

        let transcriptionResult
        try {
          transcriptionResult = await window.api.transcribeVideo(sourcePath)
        } finally {
          unsubTranscribe()
        }
        check()

        const formattedForAI = await window.api.formatTranscriptForAI(transcriptionResult)
        check()

        const transcriptionData = {
          text: transcriptionResult.text,
          words: transcriptionResult.words,
          segments: transcriptionResult.segments,
          formattedForAI
        }
        setTranscription(source.id, transcriptionData)

        setPipeline({ stage: 'transcribing', message: 'Transcription complete', percent: 100 })

        // ── Step 3: Score ─────────────────────────────────────────────────────
        setPipeline({ stage: 'scoring', message: 'Sending to Gemini…', percent: 0 })
        check()

        const scoringStagePercents: Record<string, number> = {
          sending: 10,
          analyzing: 50,
          validating: 90
        }

        const unsubScoring = window.api.onScoringProgress(({ stage, message }) => {
          setPipeline({
            stage: 'scoring',
            message,
            percent: scoringStagePercents[stage] ?? 50
          })
        })

        let scoringResult
        try {
          scoringResult = await window.api.scoreTranscript(
            settings.geminiApiKey,
            formattedForAI,
            source.duration,
            processingConfig.targetDuration
          )
        } finally {
          unsubScoring()
        }
        check()

        const clips: ClipCandidate[] = scoringResult.segments.map((seg) => ({
          id: uuidv4(),
          sourceId: source.id,
          startTime: seg.startTime,
          endTime: seg.endTime,
          duration: seg.endTime - seg.startTime,
          text: seg.text,
          score: seg.score,
          hookText: seg.hookText,
          reasoning: seg.reasoning,
          status: 'pending' as const
        }))

        setClips(source.id, clips)
        setPipeline({ stage: 'scoring', message: 'Scoring complete', percent: 100 })

        // ── Step 3.5: Loop Optimization (conditional) ─────────────────────────
        if (processingConfig.enablePerfectLoop) {
          setPipeline({ stage: 'optimizing-loops', message: 'Analyzing loop potential…', percent: 0 })
          check()

          for (let i = 0; i < clips.length; i++) {
            const clip = clips[i]
            const percent = Math.round(((i + 1) / clips.length) * 100)
            setPipeline({
              stage: 'optimizing-loops',
              message: `Optimizing clip ${i + 1}/${clips.length}…`,
              percent
            })

            try {
              // Analyze loop potential via Gemini AI
              const analysis = await window.api.analyzeLoopPotential(
                settings.geminiApiKey,
                transcriptionResult,
                clip.startTime,
                clip.endTime
              )
              check()

              // Compute composite loop quality score
              const loopScore = await window.api.scoreLoopQuality(analysis)

              if (loopScore >= 50) {
                // Optimize boundaries for seamless looping
                const optimized = await window.api.optimizeForLoop(
                  clip.startTime,
                  clip.endTime,
                  transcriptionResult,
                  analysis
                )

                // Update clip boundaries if they changed
                if (optimized.start !== clip.startTime || optimized.end !== clip.endTime) {
                  updateClipTrim(source.id, clip.id, optimized.start, optimized.end)
                  // Also update local reference for face detection step
                  clips[i] = {
                    ...clip,
                    startTime: optimized.start,
                    endTime: optimized.end,
                    duration: optimized.end - optimized.start
                  }
                }

                updateClipLoop(source.id, clip.id, {
                  loopScore,
                  loopStrategy: optimized.strategy,
                  loopOptimized: optimized.start !== clip.startTime || optimized.end !== clip.endTime,
                  crossfadeDuration: optimized.crossfadeDuration
                })
              } else {
                // Score too low to optimize, but still store the score
                updateClipLoop(source.id, clip.id, {
                  loopScore,
                  loopStrategy: analysis.strategy,
                  loopOptimized: false
                })
              }
            } catch (loopErr) {
              // Non-fatal: log error but continue with original boundaries
              const msg = loopErr instanceof Error ? loopErr.message : String(loopErr)
              if (msg === 'Processing cancelled') throw loopErr
              addError({ source: 'pipeline', message: `Loop optimization failed for clip ${i + 1}: ${msg}` })
            }
          }

          setPipeline({ stage: 'optimizing-loops', message: 'Loop optimization complete', percent: 100 })
        }

        // ── Step 3.6: Variant Generation (conditional) ────────────────────────
        if (processingConfig.enableVariants) {
          setPipeline({ stage: 'generating-variants', message: 'Generating clip variants…', percent: 0 })
          check()

          for (let i = 0; i < clips.length; i++) {
            const clip = clips[i]
            const percent = Math.round(((i + 1) / clips.length) * 100)
            setPipeline({
              stage: 'generating-variants',
              message: `Generating variants… ${i + 1}/${clips.length}`,
              percent
            })

            try {
              const variants = await window.api.generateClipVariants(
                settings.geminiApiKey,
                { startTime: clip.startTime, endTime: clip.endTime, score: clip.score, text: clip.text, hookText: clip.hookText, reasoning: clip.reasoning },
                transcriptionResult,
                { hookTitle: settings.hookTitleOverlay.enabled, rehook: settings.rehookOverlay.enabled, progressBar: settings.progressBarOverlay.enabled }
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

              setClipVariants(source.id, clip.id, uiVariants)
            } catch (variantErr) {
              const msg = variantErr instanceof Error ? variantErr.message : String(variantErr)
              if (msg === 'Processing cancelled') throw variantErr
              addError({ source: 'pipeline', message: `Variant generation failed for clip ${i + 1}: ${msg}` })
            }
          }

          setPipeline({ stage: 'generating-variants', message: 'Variant generation complete', percent: 100 })
        }

        // ── Step 3.7: Clip Stitching (conditional) ────────────────────────────
        if (processingConfig.enableClipStitching) {
          setPipeline({ stage: 'stitching', message: 'AI is composing stitched clips…', percent: 0 })
          check()

          const unsubStitch = window.api.onStitchingProgress(({ stage, message }) => {
            const stagePercents: Record<string, number> = {
              analyzing: 20,
              composing: 60,
              validating: 90
            }
            setPipeline({
              stage: 'stitching',
              message,
              percent: stagePercents[stage] ?? 50
            })
          })

          try {
            const stitchResult = await window.api.generateStitchedClips(
              settings.geminiApiKey,
              formattedForAI,
              source.duration,
              transcriptionResult.words
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
              setStitchedClips(source.id, stitchedCandidates)
            }

            setPipeline({ stage: 'stitching', message: `Found ${stitchResult.clips.length} stitched clips`, percent: 100 })
          } catch (stitchErr) {
            const msg = stitchErr instanceof Error ? stitchErr.message : String(stitchErr)
            if (msg === 'Processing cancelled') throw stitchErr
            addError({ source: 'pipeline', message: `Clip stitching failed: ${msg}` })
          } finally {
            unsubStitch()
          }
        }

        // ── Step 4: Face detection ────────────────────────────────────────────
        setPipeline({ stage: 'detecting-faces', message: 'Starting face detection…', percent: 0 })
        check()

        const segments = clips.map((c) => ({ start: c.startTime, end: c.endTime }))

        const unsubFace = window.api.onFaceDetectionProgress(({ segment, total }) => {
          const percent = total > 0 ? Math.round((segment / total) * 100) : 0
          setPipeline({
            stage: 'detecting-faces',
            message: `Detecting faces… ${segment}/${total}`,
            percent
          })
        })

        let cropRegions
        try {
          cropRegions = await window.api.detectFaceCrops(sourcePath, segments)
        } finally {
          unsubFace()
        }
        check()

        // Apply crop regions to clips
        cropRegions.forEach((crop, index) => {
          if (index < clips.length) {
            updateClipCrop(source.id, clips[index].id, crop)
          }
        })

        // ── Step 5: Story Arc Detection (conditional) ─────────────────────────
        if (processingConfig.enableMultiPart) {
          setPipeline({ stage: 'detecting-arcs', message: 'Analyzing narrative structure…', percent: 0 })
          check()

          try {
            // Build clip data for the story arc detector
            const clipData = clips.map((c) => ({
              startTime: c.startTime,
              endTime: c.endTime,
              score: c.score,
              text: c.text,
              hookText: c.hookText,
              reasoning: c.reasoning
            }))

            const arcs = await window.api.detectStoryArcs(
              settings.geminiApiKey,
              transcriptionResult,
              clipData
            )
            check()

            if (arcs.length > 0) {
              // Map arcs to store format and assign part info to clips
              const storyArcData = arcs.map((arc, arcIndex) => {
                setPipeline({
                  stage: 'detecting-arcs',
                  message: `Processing arc ${arcIndex + 1}/${arcs.length}: ${arc.title}`,
                  percent: Math.round(((arcIndex + 1) / arcs.length) * 100)
                })

                // Generate series metadata (part numbers, titles, end-card text)
                // generateSeriesMetadata is a sync function on the main process
                // but exposed as async via IPC
                const arcClipIds: string[] = []

                // Match returned arc clips to our local clips by startTime
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

              setStoryArcs(source.id, storyArcData)

              // Now generate series metadata and assign part info per arc
              for (const arcData of storyArcData) {
                if (arcData.clipIds.length < 2) continue

                try {
                  // Find the original arc object to pass to generateSeriesMetadata
                  const originalArc = arcs.find((a) => a.id === arcData.id)
                  if (!originalArc) continue

                  const metadata = await window.api.generateSeriesMetadata(originalArc)

                  // Assign part info to each clip in the arc
                  arcData.clipIds.forEach((clipId, partIndex) => {
                    if (partIndex < metadata.parts.length) {
                      const part = metadata.parts[partIndex]
                      setClipPartInfo(source.id, clipId, {
                        arcId: arcData.id,
                        partNumber: part.partNumber,
                        totalParts: part.totalParts,
                        partTitle: part.title,
                        endCardText: part.endCardText
                      })
                    }
                  })
                } catch (metaErr) {
                  const msg = metaErr instanceof Error ? metaErr.message : String(metaErr)
                  if (msg === 'Processing cancelled') throw metaErr
                  addError({ source: 'pipeline', message: `Series metadata failed for "${arcData.title}": ${msg}` })
                }
              }
            }

            setPipeline({ stage: 'detecting-arcs', message: `Found ${arcs.length} story arc${arcs.length !== 1 ? 's' : ''}`, percent: 100 })
          } catch (arcErr) {
            const msg = arcErr instanceof Error ? arcErr.message : String(arcErr)
            if (msg === 'Processing cancelled') throw arcErr
            addError({ source: 'pipeline', message: `Story arc detection failed: ${msg}` })
          }
        }

        // ── Done ─────────────────────────────────────────────────────────────
        setPipeline({ stage: 'ready', message: `Found ${clips.length} clip candidates`, percent: 100 })

        // Send OS notification when pipeline finishes (only when window is not focused)
        if (useStore.getState().settings.enableNotifications && !document.hasFocus()) {
          const maxScore = clips.length > 0 ? Math.max(...clips.map((c) => c.score)) : 0
          window.api.sendNotification({
            title: 'Processing Complete',
            body: `Found ${clips.length} clips with scores up to ${maxScore}`
          })
        }

        // ── Auto Mode ────────────────────────────────────────────────────────
        const { autoMode, approveClipsAboveScore, setAutoModeResult } = useStore.getState()
        if (autoMode.enabled && !_autoModeRanForSource.has(source.id)) {
          _autoModeRanForSource.add(source.id)
          const { approved, rejected } = approveClipsAboveScore(source.id, autoMode.approveThreshold)
          console.log(
            `[Auto-mode] Approved ${approved} clip${approved !== 1 ? 's' : ''}, ` +
            `rejected ${rejected} — score threshold ≥ ${autoMode.approveThreshold}` +
            (autoMode.autoRender && approved > 0 ? ', starting render…' : '')
          )
          setAutoModeResult({
            sourceId: source.id,
            approved,
            threshold: autoMode.approveThreshold,
            didRender: autoMode.autoRender && approved > 0
          })
        }
      } catch (err) {
        if (cancelledRef.current) return
        const message = err instanceof Error ? err.message : String(err)
        setPipeline({ stage: 'error', message, percent: 0 })
        addError({ source: 'pipeline', message })
      }
    },
    [setPipeline, setTranscription, setClips, updateClipCrop, updateClipLoop, updateClipTrim, addError, setClipVariants, setStitchedClips, setStoryArcs, setClipPartInfo, settings.geminiApiKey, processingConfig.targetDuration, processingConfig.enablePerfectLoop, processingConfig.enableVariants, processingConfig.enableClipStitching, processingConfig.enableMultiPart]
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
      stage === 'detecting-arcs'
    )
  }, [])

  return { processVideo, cancelProcessing, isProcessing }
}
