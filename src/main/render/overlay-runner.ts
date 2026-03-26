// ---------------------------------------------------------------------------
// Overlay runner — generic multi-pass FFmpeg filter executor
// ---------------------------------------------------------------------------
//
// Each overlay (captions, hook title, progress bar, etc.) is applied as a
// separate FFmpeg re-encode pass. This avoids Windows failures with massive
// combined filter strings and keeps each pass independently debuggable.
// ---------------------------------------------------------------------------

import { join } from 'path'
import { tmpdir } from 'os'
import { unlinkSync, renameSync } from 'fs'
import type { FfmpegCommand } from 'fluent-ffmpeg'
import { ffmpeg, getSoftwareEncoder, isGpuSessionError } from '../ffmpeg'
import { toFFmpegPath } from './helpers'
import type { OverlayPassResult } from './features/feature'

// ---------------------------------------------------------------------------
// Active command tracking (for cancellation)
// ---------------------------------------------------------------------------

/**
 * Set of all currently running FFmpeg commands across the render pipeline.
 * Used by cancelRender() to kill active processes.
 */
export const activeCommands = new Set<FfmpegCommand>()

// ---------------------------------------------------------------------------
// Single filter pass
// ---------------------------------------------------------------------------

/**
 * Run a single FFmpeg filter pass: read inputPath, apply videoFilter, write
 * to outputPath.
 *
 * Uses software encoding with high-quality settings (CRF 15, ultrafast) to
 * minimise generation loss across multiple re-encode passes. Audio is
 * stream-copied (no re-encode).
 */
export function applyFilterPass(
  inputPath: string,
  outputPath: string,
  videoFilter: string
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const { encoder, presetFlag } = getSoftwareEncoder({ crf: 15, preset: 'ultrafast' })

    function runPass(enc: string, flags: string[]): void {
      const cmd = ffmpeg(toFFmpegPath(inputPath))
        .videoFilters(videoFilter)
        .outputOptions([
          '-c:v',
          enc,
          ...flags,
          '-c:a',
          'copy',
          '-movflags',
          '+faststart',
          '-y'
        ])
        .on('start', (cmdLine: string) => {
          console.log(`[Overlay] FFmpeg command: ${cmdLine}`)
        })
        .on('end', () => resolve())
        .on('error', (err: Error) => {
          if (isGpuSessionError(err.message)) {
            const sw = getSoftwareEncoder({ crf: 15, preset: 'ultrafast' })
            runPass(sw.encoder, sw.presetFlag)
          } else {
            reject(err)
          }
        })
        .save(toFFmpegPath(outputPath))

      activeCommands.add(cmd)
      cmd.on('end', () => activeCommands.delete(cmd))
      cmd.on('error', () => activeCommands.delete(cmd))
    }

    runPass(encoder, presetFlag)
  })
}

// ---------------------------------------------------------------------------
// Multi-pass overlay runner
// ---------------------------------------------------------------------------

export interface OverlayRunnerOptions {
  /** Called after each pass with cumulative progress (0–100 scale of the overlay phase) */
  onProgress?: (percent: number) => void
  /** Return true to abort between passes */
  cancelCheck?: () => boolean
}

/**
 * Apply a sequence of overlay filter passes to a rendered clip.
 *
 * Each step is executed as a separate FFmpeg invocation via `applyFilterPass`.
 * Intermediate temp files are created for each pass and cleaned up afterwards.
 *
 * @param inputPath   Path to the base-rendered clip
 * @param steps       Array of { name, filter } overlay passes to apply in order
 * @param finalPath   The desired final output path (the last pass writes here)
 * @param options     Progress callback and cancellation check
 * @returns           Path to the final rendered file (always finalPath on success)
 */
export async function runOverlayPasses(
  inputPath: string,
  steps: OverlayPassResult[],
  finalPath: string,
  options: OverlayRunnerOptions = {}
): Promise<string> {
  const { onProgress, cancelCheck } = options

  if (steps.length === 0) {
    return inputPath
  }

  let currentPath = inputPath
  const tempsToClean: string[] = []

  try {
    for (let s = 0; s < steps.length; s++) {
      if (cancelCheck?.()) return currentPath

      const step = steps[s]
      const tempOut = join(tmpdir(), `batchcontent-${step.name}-${Date.now()}.mp4`)
      console.log(`[Overlay] Applying ${step.name} pass`)

      await applyFilterPass(currentPath, tempOut, step.filter)

      // Queue previous intermediate for cleanup (but not the original input)
      if (currentPath !== inputPath) {
        tempsToClean.push(currentPath)
      }
      currentPath = tempOut

      if (onProgress) {
        onProgress(Math.round(((s + 1) / steps.length) * 100))
      }
    }

    // Move the final result to the desired output path
    if (currentPath !== finalPath) {
      // If finalPath === inputPath, remove it first so rename succeeds
      if (finalPath === inputPath) {
        try {
          unlinkSync(finalPath)
        } catch {
          /* ignore */
        }
      }
      renameSync(currentPath, finalPath)
    }

    return finalPath
  } finally {
    // Clean up intermediate temp files
    for (const tmp of tempsToClean) {
      try {
        unlinkSync(tmp)
      } catch {
        /* ignore cleanup errors */
      }
    }
  }
}
