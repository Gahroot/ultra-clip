// ---------------------------------------------------------------------------
// Stitched clip render — extracted from render-pipeline.ts
// ---------------------------------------------------------------------------
//
// Renders multiple segments from a source video into a single stitched output
// with per-segment crop/scale and optional text overlays.
// ---------------------------------------------------------------------------

import { join } from 'path'
import { unlinkSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { ffmpeg, getEncoder, getSoftwareEncoder, isGpuSessionError, getVideoMetadata } from '../ffmpeg'
import type { RenderStitchedClipJob } from './types'
import { toFFmpegPath, formatASSTimestamp, buildASSFilter } from './helpers'

// ---------------------------------------------------------------------------
// Segment overlay ASS generation
// ---------------------------------------------------------------------------

/**
 * Generate an ASS subtitle file for stitched segment overlay text.
 * Displays the text for the first 2 seconds of the segment with fade in/out.
 *
 * @returns Path to the generated .ass file in the temp directory.
 */
function generateSegmentOverlayASSFile(
  text: string,
  role: string | undefined,
  frameWidth = 1080,
  frameHeight = 1920
): string {
  const displayDuration = 2.0
  const fadeInMs = 300
  const fadeOutMs = 400

  let styleLine: string
  let dialogueText: string

  if (role === 'hook') {
    // Centered-bold style at mid-frame
    styleLine = `Style: SegOverlay,Arial,72,&H00FFFFFF,&H00FFFFFF,&H00000000,&H4D000000,-1,0,0,0,100,100,0,0,1,4,3,5,40,40,0,1`
    dialogueText = `{\\fad(${fadeInMs},${fadeOutMs})}${text}`
  } else {
    // Rehook / default style: yellow, slightly smaller, at lower-third
    const yPos = Math.round(frameHeight * 0.45)
    styleLine = `Style: SegOverlay,Arial,56,&H0000FFFF,&H0000FFFF,&H00000000,&H4D000000,-1,0,0,0,100,100,0,0,1,3,3,5,40,40,${yPos},1`
    dialogueText = `{\\fad(${fadeInMs},${fadeOutMs})}${text}`
  }

  const startTime = formatASSTimestamp(0)
  const endTime = formatASSTimestamp(displayDuration)

  const ass = [
    '[Script Info]',
    'ScriptType: v4.00+',
    `PlayResX: ${frameWidth}`,
    `PlayResY: ${frameHeight}`,
    'WrapStyle: 0',
    'ScaledBorderAndShadow: yes',
    '',
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    styleLine,
    '',
    '[Events]',
    'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
    `Dialogue: 0,${startTime},${endTime},SegOverlay,,0,0,0,,${dialogueText}`,
    ''
  ].join('\n')

  const assPath = join(tmpdir(), `batchcontent-segovl-${Date.now()}.ass`)
  writeFileSync(assPath, ass, 'utf-8')
  return assPath
}

// ---------------------------------------------------------------------------
// Stitched clip render
// ---------------------------------------------------------------------------

/**
 * Render a stitched clip by encoding each segment individually, then
 * concatenating them with the FFmpeg concat demuxer.
 */
export async function renderStitchedClip(
  job: RenderStitchedClipJob,
  outputPath: string,
  onProgress: (percent: number) => void
): Promise<string> {
  const tempDir = tmpdir()
  const tempFiles: string[] = []
  const { encoder, presetFlag } = getEncoder()

  // Get source video metadata for crop/scale
  const meta = await getVideoMetadata(job.sourceVideoPath)

  try {
    // ── Step 1: Extract each segment as a temp file ───────────────────────
    for (let i = 0; i < job.segments.length; i++) {
      const seg = job.segments[i]
      const tempPath = join(tempDir, `batchcontent-stitch-${Date.now()}-${i}.mp4`)
      tempFiles.push(tempPath)

      const segProgress = (percent: number): void => {
        const segWeight = 85 / job.segments.length
        const base = segWeight * i
        onProgress(Math.round(base + (percent * segWeight / 100)))
      }

      // Build crop + scale filter for this segment
      let cropFilter: string
      if (job.cropRegion) {
        const { x, y, width, height } = job.cropRegion
        const cw = Math.min(width, meta.width)
        const ch = Math.min(height, meta.height)
        const cx = Math.max(0, Math.min(x, meta.width - cw))
        const cy = Math.max(0, Math.min(y, meta.height - ch))
        cropFilter = `crop=${cw}:${ch}:${cx}:${cy}`
      } else {
        const targetAspect = 9 / 16
        const sourceAspect = meta.width / meta.height
        if (sourceAspect > targetAspect) {
          const cropWidth = Math.round(meta.height * targetAspect)
          const cropX = Math.round((meta.width - cropWidth) / 2)
          cropFilter = `crop=${cropWidth}:${meta.height}:${cropX}:0`
        } else {
          const cropHeight = Math.round(meta.width / targetAspect)
          const cropY = Math.round((meta.height - cropHeight) / 2)
          cropFilter = `crop=${meta.width}:${cropHeight}:0:${cropY}`
        }
      }

      // Build video filter chain: crop → scale [→ overlay text]
      const filterChain: string[] = [cropFilter, 'scale=1080:1920']

      // Add per-segment overlay text as ASS subtitle (avoids drawtext on Windows)
      let segAssPath: string | null = null
      if (seg.overlayText) {
        segAssPath = generateSegmentOverlayASSFile(seg.overlayText, seg.role)
        tempFiles.push(segAssPath) // will be cleaned up in finally block
        filterChain.push(buildASSFilter(segAssPath))
      }

      const videoFilter = filterChain.join(',')
      const segDuration = seg.endTime - seg.startTime

      await new Promise<void>((resolve, reject) => {
        function runSegmentEncode(enc: string, flags: string[]): void {
          const cmd = ffmpeg(toFFmpegPath(job.sourceVideoPath))

          if (enc === 'h264_nvenc') {
            cmd.inputOptions(['-hwaccel', 'auto'])
          }

          cmd
            .seekInput(seg.startTime)
            .duration(segDuration)
            .videoFilters(videoFilter)
            .outputOptions([
              '-y',
              '-c:v', enc,
              ...flags,
              '-c:a', 'aac',
              '-b:a', '192k',
              '-movflags', '+faststart'
            ])
            .on('progress', (progress) => {
              segProgress(Math.min(99, progress.percent ?? 0))
            })
            .on('end', () => {
              segProgress(100)
              resolve()
            })
            .on('error', (err: Error) => {
              if (isGpuSessionError(err.message)) {
                const sw = getSoftwareEncoder()
                runSegmentEncode(sw.encoder, sw.presetFlag)
              } else {
                reject(err)
              }
            })
            .save(toFFmpegPath(tempPath))
        }

        runSegmentEncode(encoder, presetFlag)
      })
    }

    onProgress(85)

    // ── Step 2: Concatenate using concat demuxer ──────────────────────────
    const listFile = join(tempDir, `batchcontent-stitch-list-${Date.now()}.txt`)
    const listContent = tempFiles.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join('\n')
    writeFileSync(listFile, listContent, 'utf-8')

    await new Promise<void>((resolve, reject) => {
      ffmpeg()
        .input(listFile)
        .inputOptions(['-f', 'concat', '-safe', '0'])
        .outputOptions(['-c', 'copy', '-movflags', '+faststart', '-y'])
        .on('progress', () => onProgress(92))
        .on('end', () => {
          try { unlinkSync(listFile) } catch { /* ignore */ }
          onProgress(100)
          resolve()
        })
        .on('error', (err: Error) => {
          try { unlinkSync(listFile) } catch { /* ignore */ }
          reject(err)
        })
        .save(toFFmpegPath(outputPath))
    })

    return outputPath
  } finally {
    // ── Step 3: Cleanup temp files ────────────────────────────────────────
    for (const tf of tempFiles) {
      try { unlinkSync(tf) } catch { /* ignore */ }
    }
  }
}
