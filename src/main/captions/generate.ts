import { writeFile, mkdir } from 'fs/promises'
import { join, dirname } from 'path'
import { tmpdir } from 'os'

import type {
  CaptionStyleInput,
  ShotCaptionOverride,
  WordInput
} from './types'
import { DEFAULT_FRAME_HEIGHT, DEFAULT_FRAME_WIDTH } from './types'
import { buildASSDocument } from './document'

export async function generateCaptions(
  words: WordInput[],
  style: CaptionStyleInput,
  outputPath?: string,
  frameWidth: number = DEFAULT_FRAME_WIDTH,
  frameHeight: number = DEFAULT_FRAME_HEIGHT,
  marginVOverride?: number,
  shotOverrides?: ShotCaptionOverride[]
): Promise<string> {
  if (words.length === 0) {
    throw new Error('No words provided for caption generation')
  }

  const assContent = buildASSDocument(
    words,
    style,
    frameWidth,
    frameHeight,
    marginVOverride,
    shotOverrides
  )

  const filePath =
    outputPath ?? join(tmpdir(), `batchcontent-captions-${Date.now()}.ass`)

  await mkdir(dirname(filePath), { recursive: true })
  await writeFile(filePath, assContent, 'utf-8')

  return filePath
}
