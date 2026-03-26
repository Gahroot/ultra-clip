// ---------------------------------------------------------------------------
// B-Roll overlay feature — composites stock footage onto the rendered clip
// ---------------------------------------------------------------------------

import { copyFileSync, existsSync, unlinkSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import type { RenderFeature, PostProcessContext } from './feature'
import type { RenderClipJob } from '../types'
import type { BRollPlacement } from '../../broll-placement'
import { toFFmpegPath } from '../helpers'
import { ffmpeg as createFfmpeg, getSoftwareEncoder } from '../../ffmpeg'

// ---------------------------------------------------------------------------
// Feature export
// ---------------------------------------------------------------------------

export const brollFeature: RenderFeature = {
  name: 'broll',

  async postProcess(
    job: RenderClipJob,
    renderedPath: string,
    _context: PostProcessContext
  ): Promise<string> {
    if (!job.brollPlacements || job.brollPlacements.length === 0) {
      return renderedPath
    }

    const brollBasePath = join(tmpdir(), `batchcontent-broll-base-${Date.now()}.mp4`)
    try {
      copyFileSync(renderedPath, brollBasePath)
      unlinkSync(renderedPath)
      await applyBRollOverlay(brollBasePath, job.brollPlacements, renderedPath)
      console.log(
        `[B-Roll] Applied ${job.brollPlacements.length} overlay(s) to clip ${job.clipId}`
      )
    } catch (err) {
      console.warn(
        `[B-Roll] Overlay failed for clip ${job.clipId}, keeping original:`,
        err
      )
      if (existsSync(brollBasePath) && !existsSync(renderedPath)) {
        copyFileSync(brollBasePath, renderedPath)
      }
    } finally {
      try {
        unlinkSync(brollBasePath)
      } catch {
        /* ignore */
      }
    }

    return renderedPath
  }
}

// ---------------------------------------------------------------------------
// B-Roll overlay FFmpeg filter_complex builder
// ---------------------------------------------------------------------------

/** Fade duration for B-Roll overlay transitions (seconds) */
const FADE_DUR = 0.3

/**
 * Apply B-Roll overlays to a rendered clip using a single FFmpeg filter_complex.
 *
 * Each placement is:
 * 1. Trimmed to the needed duration
 * 2. Shifted to the correct PTS position on the timeline
 * 3. Scaled/cropped to 1080×1920
 * 4. Given alpha fade in/out
 * 5. Overlaid onto the main video during its time window only
 *
 * Uses the software encoder for reliability (hardware encoders can be flaky
 * with multi-input filter_complex). Audio is stream-copied from the main clip.
 */
function applyBRollOverlay(
  inputPath: string,
  placements: BRollPlacement[],
  outputPath: string
): Promise<void> {
  if (placements.length === 0) {
    copyFileSync(inputPath, outputPath)
    return Promise.resolve()
  }

  const filterParts: string[] = []
  let prevLabel = '0:v'

  placements.forEach((p, i) => {
    const inputIdx = i + 1
    const brollLabel = `br${i}`
    const outLabel = i === placements.length - 1 ? 'outv' : `v${i}`

    const start = p.startTime
    const end = start + p.duration
    const fadeDur = Math.min(FADE_DUR, p.duration / 4)
    const fadeOutSt = start + p.duration - fadeDur

    // Trim to needed length, shift PTS to match the output timeline window,
    // scale/crop to 1080×1920, normalize fps, add alpha channel, apply fade in/out.
    filterParts.push(
      `[${inputIdx}:v]` +
        `trim=0:${p.duration.toFixed(3)},` +
        `setpts=PTS-STARTPTS+${start.toFixed(3)}/TB,` +
        `scale=1080:1920:force_original_aspect_ratio=increase,` +
        `crop=1080:1920,` +
        `fps=30,` +
        `format=rgba,` +
        `fade=t=in:st=${start.toFixed(3)}:d=${fadeDur.toFixed(3)}:alpha=1,` +
        `fade=t=out:st=${fadeOutSt.toFixed(3)}:d=${fadeDur.toFixed(3)}:alpha=1` +
        `[${brollLabel}]`
    )

    // Overlay the B-Roll onto the main video, enabled only in the time window.
    // eof_action=pass ensures the main video shows when B-Roll frames run out.
    filterParts.push(
      `[${prevLabel}][${brollLabel}]` +
        `overlay=0:0:eof_action=pass:format=auto:` +
        `enable='(t>=${start.toFixed(3)})*(t<=${end.toFixed(3)})'` +
        `[${outLabel}]`
    )

    prevLabel = outLabel
  })

  const filterComplex = filterParts.join(';')

  return new Promise<void>((resolve, reject) => {
    const { encoder, presetFlag } = getSoftwareEncoder()

    const cmd = createFfmpeg(toFFmpegPath(inputPath))

    for (const p of placements) {
      cmd.input(toFFmpegPath(p.videoPath))
    }

    cmd
      .outputOptions([
        '-filter_complex',
        filterComplex,
        '-filter_threads',
        '0',
        '-filter_complex_threads',
        '0',
        '-map',
        '[outv]',
        '-map',
        '0:a',
        '-c:v',
        encoder,
        ...presetFlag,
        '-c:a',
        'copy',
        '-movflags',
        '+faststart',
        '-y'
      ])
      .on('end', () => resolve())
      .on('error', reject)
      .save(toFFmpegPath(outputPath))
  })
}
