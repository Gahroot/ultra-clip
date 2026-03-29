import type { ClipCandidate } from '../../store'
import type { PipelineContext } from './types'
import { THUMB_CONCURRENCY } from '@shared/constants'

/** Generate thumbnails for clips in batches of 3. */
export async function thumbnailStage(
  ctx: PipelineContext,
  sourcePath: string,
  clips: ClipCandidate[]
): Promise<void> {
  const { source, store } = ctx

  for (let i = 0; i < clips.length; i += THUMB_CONCURRENCY) {
    const batch = clips.slice(i, i + THUMB_CONCURRENCY)
    const results = await Promise.allSettled(
      batch.map((clip) => window.api.getThumbnail(sourcePath, clip.startTime + 1))
    )
    for (let j = 0; j < batch.length; j++) {
      const result = results[j]
      if (result.status === 'fulfilled' && result.value) {
        store.updateClipThumbnail(source.id, batch[j].id, result.value)
      }
    }
  }
}
