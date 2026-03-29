// ---------------------------------------------------------------------------
// Stitched clip render — extracted from render-pipeline.ts
// ---------------------------------------------------------------------------
//
// Renders multiple segments from a source video into a single stitched output
// with per-segment crop/scale and optional text overlays, captions, hook title,
// rehook, and a post-concat progress bar pass.
// ---------------------------------------------------------------------------

import { join } from 'path'
import { unlinkSync, writeFileSync, renameSync } from 'fs'
import { tmpdir } from 'os'
import { ffmpeg, getEncoder, getSoftwareEncoder, isGpuSessionError, getVideoMetadata } from '../ffmpeg'
import type { RenderStitchedClipJob } from './types'
import type { HookTitleConfig } from '../hook-title'
import type { RehookConfig, OverlayVisualSettings } from '../overlays/rehook'
import { toFFmpegPath, formatASSTimestamp, cssHexToASS, buildASSFilter } from './helpers'
import { generateCaptions } from '../captions'
import { resolveFontsDir } from '../font-registry'
import { buildProgressBarFilter } from '../overlays/progress-bar'
import { applyFilterComplexPass } from './overlay-runner'

// ---------------------------------------------------------------------------
// Default overlay visuals (fallback when hook title config not available)
// ---------------------------------------------------------------------------

const DEFAULT_OVERLAY_VISUALS: OverlayVisualSettings = {
  fontSize: 72,
  textColor: '#FFFFFF',
  outlineColor: '#000000',
  outlineWidth: 4
}

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
// Hook title ASS generation for stitched clips
// ---------------------------------------------------------------------------

/**
 * Generate an ASS subtitle file for the hook title overlay on stitched clips.
 * Mirrors the logic from hook-title.feature.ts generateHookTitleASSFile().
 */
function generateHookTitleASSForStitched(
  text: string,
  config: HookTitleConfig,
  templateLayout?: { titleText: { x: number; y: number } },
  frameWidth = 1080,
  frameHeight = 1920
): string {
  const { displayDuration, fadeIn, fadeOut, fontSize, textColor, outlineColor } = config
  const fadeInMs = Math.round(fadeIn * 1000)
  const fadeOutMs = Math.round(fadeOut * 1000)
  const primaryASS = cssHexToASS(textColor)
  const outlineASS = cssHexToASS(outlineColor)

  // Y position from top: use template layout or fall back to 220px
  const marginV = templateLayout?.titleText
    ? Math.round((templateLayout.titleText.y / 100) * frameHeight)
    : 220

  // Filled rounded-rect look: BorderStyle 3 = opaque box behind text
  const boxBackColor = cssHexToASS(outlineColor === '#000000' ? '#FFFFFF' : outlineColor)
  const boxPadding = Math.round(fontSize * 0.22)
  const boxShadow = Math.round(fontSize * 0.08)
  const styleLine = `Style: HookTitle,Arial,${fontSize},${primaryASS},${primaryASS},${outlineASS},${boxBackColor},-1,0,0,0,100,100,0,0,3,${boxPadding},${boxShadow},8,40,40,${marginV},1`
  const dialogueText = `{\\fad(${fadeInMs},${fadeOutMs})}${text}`

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
    `Dialogue: 0,${startTime},${endTime},HookTitle,,0,0,0,,${dialogueText}`,
    ''
  ].join('\n')

  const assPath = join(tmpdir(), `batchcontent-stitch-hook-${Date.now()}.ass`)
  writeFileSync(assPath, ass, 'utf-8')
  console.log(`[StitchedRender] Generated hook title ASS: ${assPath}`)
  return assPath
}

// ---------------------------------------------------------------------------
// Rehook ASS generation for stitched clips
// ---------------------------------------------------------------------------

/**
 * Generate an ASS subtitle file for the rehook overlay on stitched clips.
 * Mirrors the logic from rehook.feature.ts generateRehookASSFile().
 *
 * @param localAppearTime  Appear time in seconds relative to the segment start (0-based).
 */
function generateRehookASSForStitched(
  text: string,
  config: RehookConfig,
  localAppearTime: number,
  hookTitleConfig?: HookTitleConfig,
  templateLayout?: { rehookText: { x: number; y: number } },
  frameWidth = 1080,
  frameHeight = 1920
): string {
  const { displayDuration, fadeIn, fadeOut } = config

  // Inherit visual settings from hook title config, falling back to defaults
  const visuals: OverlayVisualSettings = hookTitleConfig
    ? {
        fontSize: hookTitleConfig.fontSize,
        textColor: hookTitleConfig.textColor,
        outlineColor: hookTitleConfig.outlineColor,
        outlineWidth: hookTitleConfig.outlineWidth
      }
    : DEFAULT_OVERLAY_VISUALS

  const { fontSize, textColor, outlineColor } = visuals

  const fadeInMs = Math.round(fadeIn * 1000)
  const fadeOutMs = Math.round(fadeOut * 1000)
  const primaryASS = cssHexToASS(textColor)
  const outlineASS = cssHexToASS(outlineColor)

  // Y position from top: use template layout or fall back to 220px
  const marginV = templateLayout?.rehookText
    ? Math.round((templateLayout.rehookText.y / 100) * frameHeight)
    : 220

  // Filled rounded-rect look: BorderStyle 3 = opaque box behind text
  const boxBackColor = cssHexToASS(outlineColor === '#000000' ? '#FFFFFF' : outlineColor)
  const boxPadding = Math.round(fontSize * 0.22)
  const boxShadow = Math.round(fontSize * 0.08)
  const styleLine = `Style: Rehook,Arial,${fontSize},${primaryASS},${primaryASS},${outlineASS},${boxBackColor},-1,0,0,0,100,100,0,0,3,${boxPadding},${boxShadow},8,40,40,${marginV},1`
  const dialogueText = `{\\fad(${fadeInMs},${fadeOutMs})}${text}`

  const startTime = formatASSTimestamp(localAppearTime)
  const endTime = formatASSTimestamp(localAppearTime + displayDuration)

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
    `Dialogue: 0,${startTime},${endTime},Rehook,,0,0,0,,${dialogueText}`,
    ''
  ].join('\n')

  const assPath = join(tmpdir(), `batchcontent-stitch-rehook-${Date.now()}.ass`)
  writeFileSync(assPath, ass, 'utf-8')
  console.log(`[StitchedRender] Generated rehook ASS: ${assPath}`)
  return assPath
}

// ---------------------------------------------------------------------------
// Stitched clip render
// ---------------------------------------------------------------------------

/**
 * Render a stitched clip by encoding each segment individually, then
 * concatenating them with the FFmpeg concat demuxer. When batch overlay
 * options are provided, burns in captions, hook title, rehook per-segment,
 * and applies a progress bar in a post-concat pass.
 */
export async function renderStitchedClip(
  job: RenderStitchedClipJob,
  outputPath: string,
  onProgress: (percent: number) => void
): Promise<string> {
  const tempDir = tmpdir()
  const tempFiles: string[] = []
  const { encoder, presetFlag } = getEncoder()
  const fontsDir = resolveFontsDir()

  // Get source video metadata for crop/scale
  const meta = await getVideoMetadata(job.sourceVideoPath)

  // Reserve progress: 80% for segments, 5% for concat, 15% for post-concat passes
  const hasPostConcat = job.progressBarConfig?.enabled
  const segmentProgressWeight = hasPostConcat ? 75 : 85
  const concatProgressBase = segmentProgressWeight
  const postConcatBase = concatProgressBase + 5

  // Track segment output files separately for concat list
  const segmentOutputFiles: string[] = []

  try {
    // ── Step 1: Extract each segment as a temp file ───────────────────────
    for (let i = 0; i < job.segments.length; i++) {
      const seg = job.segments[i]
      const tempPath = join(tempDir, `batchcontent-stitch-${Date.now()}-${i}.mp4`)
      tempFiles.push(tempPath)
      segmentOutputFiles.push(tempPath)

      const segProgress = (percent: number): void => {
        const segWeight = segmentProgressWeight / job.segments.length
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

      // Build video filter chain: crop → scale [→ overlays]
      const filterChain: string[] = [cropFilter, 'scale=1080:1920']
      const segDuration = seg.endTime - seg.startTime

      // Add per-segment overlay text as ASS subtitle (avoids drawtext on Windows).
      // Skip the old centered overlay when the new hook title feature handles it —
      // otherwise we'd get duplicate on-screen text (one centered, one at template pos).
      const hookTitleWillHandle = i === 0 && seg.role === 'hook' && job.hookTitleConfig?.enabled && job.hookTitleText
      if (seg.overlayText && !hookTitleWillHandle) {
        const segAssPath = generateSegmentOverlayASSFile(seg.overlayText, seg.role)
        tempFiles.push(segAssPath)
        filterChain.push(buildASSFilter(segAssPath, fontsDir))
      }

      // ── Per-segment captions ──────────────────────────────────────────
      if (job.captionsEnabled && job.captionStyle && job.wordTimestamps) {
        const segWords = job.wordTimestamps.filter(
          (w) => w.start >= seg.startTime && w.end <= seg.endTime
        )
        if (segWords.length > 0) {
          const localWords = segWords.map((w) => ({
            text: w.text,
            start: w.start - seg.startTime,
            end: w.end - seg.startTime
          }))
          try {
            const marginVOverride = job.templateLayout?.subtitles
              ? Math.round((1 - job.templateLayout.subtitles.y / 100) * 1920)
              : undefined
            const captionAssPath = await generateCaptions(localWords, job.captionStyle, undefined, 1080, 1920, marginVOverride)
            tempFiles.push(captionAssPath)
            filterChain.push(buildASSFilter(captionAssPath, fontsDir))
          } catch (err) {
            console.warn(`[StitchedRender] Failed to generate captions for segment ${i}:`, err)
          }
        }
      }

      // ── Hook title on first segment ───────────────────────────────────
      if (i === 0 && job.hookTitleConfig?.enabled && job.hookTitleText) {
        const hookAssPath = generateHookTitleASSForStitched(
          job.hookTitleText,
          job.hookTitleConfig,
          job.templateLayout
        )
        tempFiles.push(hookAssPath)
        filterChain.push(buildASSFilter(hookAssPath, fontsDir))
      }

      // ── Rehook on the appropriate segment ─────────────────────────────
      if (job.rehookConfig?.enabled && job.rehookText && job.rehookAppearTime !== undefined) {
        const cumulativeBefore = job.segments.slice(0, i).reduce((sum, s) => sum + (s.endTime - s.startTime), 0)
        const cumulativeAfter = cumulativeBefore + segDuration
        if (job.rehookAppearTime >= cumulativeBefore && job.rehookAppearTime < cumulativeAfter) {
          const localAppearTime = job.rehookAppearTime - cumulativeBefore
          const rehookAssPath = generateRehookASSForStitched(
            job.rehookText,
            job.rehookConfig,
            localAppearTime,
            job.hookTitleConfig,
            job.templateLayout
          )
          tempFiles.push(rehookAssPath)
          filterChain.push(buildASSFilter(rehookAssPath, fontsDir))
        }
      }

      const videoFilter = filterChain.join(',')

      await new Promise<void>((resolve, reject) => {
        function runSegmentEncode(enc: string, flags: string[]): void {
          const cmd = ffmpeg(toFFmpegPath(job.sourceVideoPath))

          // Enable hardware-accelerated decoding (NVDEC, DXVA2, VAAPI, etc.)
          cmd.inputOptions(['-hwaccel', 'auto'])

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

    onProgress(concatProgressBase)

    // ── Step 2: Concatenate using concat demuxer ──────────────────────────
    const concatOutputPath = hasPostConcat
      ? join(tempDir, `batchcontent-stitch-concat-${Date.now()}.mp4`)
      : outputPath

    if (hasPostConcat) {
      tempFiles.push(concatOutputPath)
    }

    const listFile = join(tempDir, `batchcontent-stitch-list-${Date.now()}.txt`)
    const listContent = segmentOutputFiles
      .map((p) => `file '${p.replace(/'/g, "'\\''")}'`)
      .join('\n')
    writeFileSync(listFile, listContent, 'utf-8')

    await new Promise<void>((resolve, reject) => {
      ffmpeg()
        .input(listFile)
        .inputOptions(['-f', 'concat', '-safe', '0'])
        .outputOptions(['-c', 'copy', '-movflags', '+faststart', '-y'])
        .on('progress', () => onProgress(concatProgressBase + 3))
        .on('end', () => {
          try { unlinkSync(listFile) } catch { /* ignore */ }
          onProgress(postConcatBase)
          resolve()
        })
        .on('error', (err: Error) => {
          try { unlinkSync(listFile) } catch { /* ignore */ }
          reject(err)
        })
        .save(toFFmpegPath(concatOutputPath))
    })

    // ── Step 3: Post-concat progress bar pass ─────────────────────────────
    if (job.progressBarConfig?.enabled) {
      const totalDuration = job.segments.reduce((sum, s) => sum + (s.endTime - s.startTime), 0)
      const barFilter = buildProgressBarFilter(
        totalDuration,
        job.progressBarConfig,
        1080,
        1920
      )
      if (barFilter) {
        console.log(`[StitchedRender] Applying progress bar post-concat pass`)
        await applyFilterComplexPass(concatOutputPath, outputPath, barFilter)
        onProgress(95)
      } else if (concatOutputPath !== outputPath) {
        // No filter needed — just rename
        renameSync(concatOutputPath, outputPath)
      }
    }

    onProgress(100)
    return outputPath
  } finally {
    // ── Step 4: Cleanup temp files ────────────────────────────────────────
    for (const tf of tempFiles) {
      try { unlinkSync(tf) } catch { /* ignore */ }
    }
  }
}
