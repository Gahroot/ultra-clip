import type { ClipCandidate } from '../../store'
import { createStageReporter } from '../../lib/progress-reporter'
import type { PipelineContext } from './types'

/** MediaPipe face detection for 9:16 crop regions. */
export async function faceDetectionStage(
  ctx: PipelineContext,
  sourcePath: string,
  clips: ClipCandidate[]
): Promise<void> {
  const { source, check, setPipeline, store } = ctx
  const reporter = createStageReporter(setPipeline, 'detecting-faces')

  reporter.start('Starting face detection…')
  check()

  const segments = clips.map((c) => ({ start: c.startTime, end: c.endTime }))

  const unsubFace = window.api.onFaceDetectionProgress(({ segment, total }) => {
    const percent = total > 0 ? Math.round((segment / total) * 100) : 0
    reporter.update(`Detecting faces… ${segment}/${total}`, percent)
  })

  let cropRegions
  try {
    cropRegions = await window.api.detectFaceCrops(sourcePath, segments)
  } finally {
    unsubFace()
  }
  check()

  cropRegions.forEach((crop, index) => {
    if (index < clips.length) {
      store.updateClipCrop(source.id, clips[index].id, crop)
    }
  })
}
