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
import { ffmpeg, getEncoder, getSoftwareEncoder, isGpuSessionError, isGpuEncoderDisabled, disableGpuEncoderForSession } from '../ffmpeg'
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
    const gpuDisabled = isGpuEncoderDisabled()
    const { encoder, presetFlag } = gpuDisabled ? getSoftwareEncoder({ crf: 15, preset: 'ultrafast' }) : getEncoder({ crf: 15, preset: 'ultrafast' })
    let fallbackAttempted = false

    function runPass(enc: string, flags: string[], useHwAccel = true): void {
      const cmd = ffmpeg(toFFmpegPath(inputPath))
      let stderrOutput = ''

      // Enable hardware-accelerated decoding (NVDEC, DXVA2, VAAPI, etc.)
      // Skipped on software fallback — broken GPU drivers can cause -hwaccel auto to crash
      if (useHwAccel) {
        cmd.inputOptions(['-hwaccel', 'auto'])
      }

      cmd
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
        .on('stderr', (line: string) => { stderrOutput += line + '\n' })
        .on('end', () => resolve())
        .on('error', (err: Error) => {
          console.error(`[Overlay] FFmpeg stderr:\n${stderrOutput}`)
          if (!fallbackAttempted && isGpuSessionError(err.message + '\n' + stderrOutput)) {
            fallbackAttempted = true
            disableGpuEncoderForSession()
            const sw = getSoftwareEncoder({ crf: 15, preset: 'ultrafast' })
            runPass(sw.encoder, sw.presetFlag, false)
          } else {
            const stderrTail = stderrOutput.split('\n').slice(-10).join('\n')
            const enhanced = new Error(`${err.message}\n[stderr tail] ${stderrTail}`)
            reject(enhanced)
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

/**
 * Run a single FFmpeg filter_complex pass: read inputPath, apply a
 * filter_complex that maps [0:v] → [outv], write to outputPath.
 *
 * Used for overlays that need multiple filter inputs (e.g. animated
 * progress bar using color source + crop + overlay). Audio is
 * stream-copied from input 0.
 */
export function applyFilterComplexPass(
  inputPath: string,
  outputPath: string,
  filterComplex: string
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const gpuDisabled2 = isGpuEncoderDisabled()
    const { encoder, presetFlag } = gpuDisabled2 ? getSoftwareEncoder({ crf: 15, preset: 'ultrafast' }) : getEncoder({ crf: 15, preset: 'ultrafast' })
    let fallbackAttempted = false

    function runPass(enc: string, flags: string[], useHwAccel = true): void {
      const cmd = ffmpeg(toFFmpegPath(inputPath))
      let stderrOutput = ''

      // Enable hardware-accelerated decoding (NVDEC, DXVA2, VAAPI, etc.)
      // Skipped on software fallback — broken GPU drivers can cause -hwaccel auto to crash
      if (useHwAccel) {
        cmd.inputOptions(['-hwaccel', 'auto'])
      }

      cmd
        .outputOptions([
          '-filter_complex', filterComplex,
          '-map', '[outv]',
          '-map', '0:a',
          '-c:v', enc,
          ...flags,
          '-c:a', 'copy',
          '-movflags', '+faststart',
          '-y'
        ])
        .on('start', (cmdLine: string) => {
          console.log(`[Overlay] FFmpeg filter_complex command: ${cmdLine}`)
        })
        .on('stderr', (line: string) => { stderrOutput += line + '\n' })
        .on('end', () => resolve())
        .on('error', (err: Error) => {
          console.error(`[Overlay] FFmpeg filter_complex stderr:\n${stderrOutput}`)
          if (!fallbackAttempted && isGpuSessionError(err.message + '\n' + stderrOutput)) {
            fallbackAttempted = true
            disableGpuEncoderForSession()
            const sw = getSoftwareEncoder({ crf: 15, preset: 'ultrafast' })
            runPass(sw.encoder, sw.presetFlag, false)
          } else {
            const stderrTail = stderrOutput.split('\n').slice(-10).join('\n')
            const enhanced = new Error(`${err.message}\n[stderr tail] ${stderrTail}`)
            reject(enhanced)
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

      if (step.filterComplex) {
        await applyFilterComplexPass(currentPath, tempOut, step.filter)
      } else {
        await applyFilterPass(currentPath, tempOut, step.filter)
      }

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
