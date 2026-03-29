import { writeFile, readFile, unlink } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { runPythonScript } from './python'
import type { OutputAspectRatio } from './aspect-ratios'
import { computeCenterCropForRatio } from './aspect-ratios'

// ---------------------------------------------------------------------------
// Types (canonical definitions live in @shared/types)
// ---------------------------------------------------------------------------

import type { CropRegion, FaceDetectionProgress } from '@shared/types'
export type { CropRegion, FaceDetectionProgress }

interface Segment {
  start: number
  end: number
}

// Python script output types
interface PythonProgressLine {
  type: 'progress'
  segment: number
  total: number
}

interface PythonDoneLine {
  type: 'done'
  crops: Array<{
    x: number
    y: number
    width: number
    height: number
    face_detected: boolean
  }>
}

interface PythonErrorLine {
  type: 'error'
  message: string
}

type PythonOutputLine = PythonProgressLine | PythonDoneLine | PythonErrorLine

// ---------------------------------------------------------------------------
// detectFaceCrops
// ---------------------------------------------------------------------------

/**
 * Run MediaPipe face detection on a video for the given segments and return
 * one 9:16 CropRegion per segment. Falls back to centre crop when no face is
 * found or the Python environment is unavailable.
 */
export async function detectFaceCrops(
  videoPath: string,
  segments: Segment[],
  onProgress: (p: FaceDetectionProgress) => void
): Promise<CropRegion[]> {
  const stamp = Date.now()
  const segmentsJson = join(tmpdir(), `batchcontent-segments-${stamp}.json`)
  const outputJson = join(tmpdir(), `batchcontent-crops-${stamp}.json`)

  // Write segments to temp file
  await writeFile(segmentsJson, JSON.stringify(segments), 'utf-8')

  let doneCrops: CropRegion[] | null = null

  try {
    await runPythonScript(
      'face_detect.py',
      ['--input', videoPath, '--segments', segmentsJson, '--output', outputJson],
      {
        timeoutMs: FACE_DETECTION_TIMEOUT_MS,
        onStdout: (line: string) => {
          try {
            const parsed = JSON.parse(line) as PythonOutputLine
            if (parsed.type === 'progress') {
              onProgress({ segment: parsed.segment, total: parsed.total })
            } else if (parsed.type === 'done') {
              doneCrops = parsed.crops.map((c) => ({
                x: c.x,
                y: c.y,
                width: c.width,
                height: c.height,
                faceDetected: c.face_detected
              }))
            } else if (parsed.type === 'error') {
              console.error('[FaceDetection] Python error:', parsed.message)
            }
          } catch {
            // Non-JSON stdout line — ignore
          }
        }
      }
    )

    // If we didn't receive a "done" line on stdout, try reading the output file
    if (doneCrops === null) {
      try {
        const raw = await readFile(outputJson, 'utf-8')
        const parsed = JSON.parse(raw) as PythonDoneLine
        if (parsed.type === 'done' && Array.isArray(parsed.crops)) {
          doneCrops = parsed.crops.map((c) => ({
            x: c.x,
            y: c.y,
            width: c.width,
            height: c.height,
            faceDetected: c.face_detected
          }))
        }
      } catch {
        // Output file not readable — will fall back below
      }
    }
  } finally {
    // Clean up temp files (best effort)
    for (const p of [segmentsJson, outputJson]) {
      unlink(p).catch(() => undefined)
    }
  }

  if (doneCrops !== null) {
    return doneCrops
  }

  // Fallback: we need video dimensions for a proper centre crop, but we don't
  // have them here. Return an empty array so the caller can handle it.
  console.warn('[FaceDetection] No crops returned by Python script — returning empty array')
  return []
}

// ---------------------------------------------------------------------------
// calculateCenterCrop
// ---------------------------------------------------------------------------

/**
 * Compute a centre crop from known video dimensions for the target aspect ratio.
 * Defaults to 9:16 when no ratio is specified for backwards compatibility.
 * Rounds to even numbers for H.264 compatibility.
 */
export function calculateCenterCrop(
  videoWidth: number,
  videoHeight: number,
  targetRatio: OutputAspectRatio = '9:16'
): CropRegion {
  const { x, y, width, height } = computeCenterCropForRatio(videoWidth, videoHeight, targetRatio)
  return { x, y, width, height, faceDetected: false }
}
