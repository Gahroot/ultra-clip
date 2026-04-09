import ffmpeg from 'fluent-ffmpeg'
import { app } from 'electron'
import { join } from 'path'
import { existsSync, readFileSync } from 'fs'
import { execSync, spawnSync } from 'child_process'
import { tmpdir } from 'os'

function findOnSystemPath(name: string): string | null {
  try {
    const cmd = process.platform === 'win32' ? `where ${name}` : `which ${name}`
    const result = execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim()
    const first = result.split('\n')[0].trim()
    if (first && existsSync(first)) return first
  } catch {
    // not on PATH
  }
  return null
}

function resolveBinaryPath(name: string): string | null {
  const ext = process.platform === 'win32' ? '.exe' : ''
  const binary = `${name}${ext}`
  const searchedPaths: string[] = []

  // Production: check extraResources/bin
  if (app.isPackaged) {
    const resourceBin = join(process.resourcesPath, 'bin', binary)
    searchedPaths.push(`resources/bin: ${resourceBin} (exists: ${existsSync(resourceBin)})`)
    if (existsSync(resourceBin)) {
      console.log(`[FFmpeg] Found ${name} at: ${resourceBin}`)
      return resourceBin
    }

    // Also check asar-unpacked node_modules (legacy)
    const unpackedPath = join(
      process.resourcesPath,
      'app.asar.unpacked',
      'node_modules',
      name === 'ffmpeg' ? 'ffmpeg-static' : '@ffprobe-installer',
      binary
    )
    searchedPaths.push(`unpacked: ${unpackedPath} (exists: ${existsSync(unpackedPath)})`)
    if (existsSync(unpackedPath)) {
      console.log(`[FFmpeg] Found ${name} at: ${unpackedPath}`)
      return unpackedPath
    }
  }

  // Dev: use npm packages
  try {
    if (name === 'ffmpeg') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const p = require('ffmpeg-static') as string | null
      searchedPaths.push(`npm ffmpeg-static: ${p} (exists: ${p ? existsSync(p) : false})`)
      if (p && existsSync(p)) {
        console.log(`[FFmpeg] Found ${name} via npm at: ${p}`)
        return p
      }
    } else {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { path: p } = require('@ffprobe-installer/ffprobe') as { path: string }
      searchedPaths.push(`npm @ffprobe-installer: ${p} (exists: ${existsSync(p)})`)
      if (p && existsSync(p)) {
        console.log(`[FFmpeg] Found ${name} via npm at: ${p}`)
        return p
      }
    }
  } catch (err) {
    console.log(`[FFmpeg] npm require failed for ${name}:`, err instanceof Error ? err.message : String(err))
  }

  // Last resort: system PATH (e.g. /usr/bin/ffmpeg, /usr/bin/ffprobe)
  const systemPath = findOnSystemPath(name)
  searchedPaths.push(`system PATH: ${systemPath ?? 'not found'}`)
  if (systemPath) {
    console.log(`[FFmpeg] Found ${name} on system PATH: ${systemPath}`)
    return systemPath
  }

  console.warn(`[FFmpeg] Could not find ${name}. Searched paths:`)
  for (const p of searchedPaths) {
    console.warn(`  - ${p}`)
  }
  return null
}

let ffmpegReady = false
let resolvedFfmpegPath: string | null = null

export function setupFFmpeg(): void {
  const ffmpegBin = resolveBinaryPath('ffmpeg')
  const ffprobeBin = resolveBinaryPath('ffprobe')

  if (ffmpegBin) {
    ffmpeg.setFfmpegPath(ffmpegBin)
    resolvedFfmpegPath = ffmpegBin
  }
  if (ffprobeBin) {
    ffmpeg.setFfprobePath(ffprobeBin)
  }

  ffmpegReady = !!(ffmpegBin && ffprobeBin)

  // Probe available hardware encoders at startup
  detectHardwareEncoder()

  // Probe CUDA filter availability
  hasScaleCuda()

  console.log(`[FFmpeg] Ready: ${ffmpegReady}, ffmpeg: ${ffmpegBin}, ffprobe: ${ffprobeBin}`)
}

// --- Hardware encoder detection ---

export interface EncoderConfig {
  encoder: string
  presetFlag: string[]
}

// h264_vaapi excluded: requires -vaapi_device and hwupload filter chain changes
// that are not currently implemented. VAAPI detection would report success but
// encoding would fail at runtime.
const hwEncoderPriority = ['h264_nvenc', 'h264_qsv'] as const
type HwEncoder = (typeof hwEncoderPriority)[number] | 'libx264'

let cachedEncoder: HwEncoder | null = null

function detectHardwareEncoder(): HwEncoder {
  if (cachedEncoder !== null) return cachedEncoder

  const bin = resolvedFfmpegPath ?? 'ffmpeg'
  try {
    const output = execSync(`"${bin}" -encoders -hide_banner`, {
      encoding: 'utf-8',
      timeout: 10_000,
      stdio: ['pipe', 'pipe', 'pipe']
    })
    for (const enc of hwEncoderPriority) {
      if (output.includes(enc)) {
        cachedEncoder = enc
        console.log(`[FFmpeg] Hardware encoder detected: ${enc}`)
        return enc
      }
    }
  } catch {
    // If detection fails, fall back to software
  }

  cachedEncoder = 'libx264'
  console.log('[FFmpeg] No hardware encoder found, using libx264')
  return cachedEncoder
}

// --- CUDA scale filter detection ---

let cachedHasScaleCuda: boolean | null = null

/**
 * Detect if FFmpeg supports the scale_cuda filter.
 * This requires an NVIDIA GPU with CUDA support and an FFmpeg build
 * that includes the CUDA filters.
 */
export function hasScaleCuda(): boolean {
  if (cachedHasScaleCuda !== null) return cachedHasScaleCuda

  const bin = resolvedFfmpegPath ?? 'ffmpeg'
  try {
    const output = execSync(`"${bin}" -filters -hide_banner`, {
      encoding: 'utf-8',
      timeout: 10_000,
      stdio: ['pipe', 'pipe', 'pipe']
    })
    cachedHasScaleCuda = output.includes('scale_cuda')
    console.log(`[FFmpeg] scale_cuda available: ${cachedHasScaleCuda}`)
  } catch {
    cachedHasScaleCuda = false
  }
  return cachedHasScaleCuda
}

export interface QualityParams {
  /** CRF value (15–35). Lower = better quality. Default: 23. */
  crf?: number
  /** x264 encoding speed preset. Default: 'veryfast'. */
  preset?: 'ultrafast' | 'veryfast' | 'medium' | 'slow'
}

export function getEncoder(quality?: QualityParams): EncoderConfig {
  const encoder = cachedEncoder ?? detectHardwareEncoder()
  const crf = quality?.crf ?? 23
  const preset = quality?.preset ?? 'veryfast'

  switch (encoder) {
    case 'h264_nvenc':
      // Map x264 preset to nvenc preset (p1=fastest, p7=slowest)
      // ultrafast→p1, veryfast→p2, medium→p4, slow→p6
      // CRF maps to cq for NVENC
      return {
        encoder,
        presetFlag: ['-preset', nvencPreset(preset), '-rc', 'vbr', '-cq', String(crf)]
      }
    case 'h264_qsv':
      // QSV quality: global_quality ~ CRF (higher = worse, so scale proportionally)
      return { encoder, presetFlag: ['-preset', 'fast', '-global_quality', String(crf)] }
    default:
      return { encoder: 'libx264', presetFlag: ['-preset', preset, '-crf', String(crf), '-threads', '0'] }
  }
}

function nvencPreset(x264Preset: 'ultrafast' | 'veryfast' | 'medium' | 'slow'): string {
  switch (x264Preset) {
    case 'ultrafast': return 'p1'
    case 'veryfast':  return 'p2'
    case 'medium':    return 'p4'
    case 'slow':      return 'p6'
  }
}

/** Software-only fallback encoder (always libx264, never GPU) */
export function getSoftwareEncoder(quality?: QualityParams): EncoderConfig {
  const crf = quality?.crf ?? 23
  const preset = quality?.preset ?? 'veryfast'
  return { encoder: 'libx264', presetFlag: ['-preset', preset, '-crf', String(crf), '-threads', '0'] }
}

/** Check if an FFmpeg error is a GPU/NVENC/CUDA failure that should trigger software fallback */
export function isGpuSessionError(errorMessage: string): boolean {
  const msg = errorMessage.toLowerCase()
  return (
    errorMessage.includes('OpenEncodeSessionEx failed') ||
    errorMessage.includes('No capable devices found') ||
    errorMessage.includes('Cannot load nvcuda.dll') ||
    errorMessage.includes('out of memory') ||
    errorMessage.includes('hwupload_cuda failed') ||
    errorMessage.includes('CUDA') ||
    // Windows ACCESS_VIOLATION (0xC0000005 = 3221225477) — NVENC driver crash
    errorMessage.includes('3221225477') ||
    msg.includes('cuda') ||
    msg.includes('nvenc') ||
    msg.includes('h264_nvenc') ||
    msg.includes('h264_qsv') ||
    msg.includes('hwupload') ||
    msg.includes('hwdownload') ||
    msg.includes('scale_cuda')
  )
}

/**
 * Whether the GPU encoder has been disabled for this session due to a crash.
 * Once set, all subsequent encodes use software fallback without even trying GPU.
 */
let gpuEncoderDisabledForSession = false

/** Mark GPU encoder as broken for the rest of this app session. */
export function disableGpuEncoderForSession(): void {
  if (!gpuEncoderDisabledForSession) {
    gpuEncoderDisabledForSession = true
    console.warn('[FFmpeg] GPU encoder disabled for this session due to crash — all subsequent encodes will use software fallback')
  }
}

/** Check if GPU encoder was disabled by a prior crash this session. */
export function isGpuEncoderDisabled(): boolean {
  return gpuEncoderDisabledForSession
}

/**
 * Replace CUDA scale filters with CPU equivalents in a video filter string.
 * Transforms `hwupload_cuda,scale_cuda=W:H:interp_algo=lanczos,hwdownload,format=nv12`
 * into `scale=W:H` so the filter works without GPU.
 */
export function stripCudaScaleFilter(videoFilter: string): string {
  // Match the full CUDA scale pipeline and extract the dimensions
  return videoFilter.replace(
    /hwupload_cuda,scale_cuda=(\d+):(\d+)(?::interp_algo=\w+)?,hwdownload,format=nv12/g,
    'scale=$1:$2'
  )
}

export function isFFmpegAvailable(): boolean {
  return ffmpegReady
}

export function getVideoMetadata(
  filePath: string
): Promise<{ duration: number; width: number; height: number; codec: string; fps: number; audioCodec: string }> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err)
      const video = metadata.streams.find((s) => s.codec_type === 'video')
      if (!video) return reject(new Error('No video stream found'))
      const audio = metadata.streams.find((s) => s.codec_type === 'audio')
      // Parse r_frame_rate (e.g. "30/1", "30000/1001")
      let fps = 0
      const rateStr = (video as any).r_frame_rate || (video as any).avg_frame_rate || ''
      if (rateStr) {
        const parts = rateStr.split('/')
        if (parts.length === 2) {
          const num = parseFloat(parts[0])
          const den = parseFloat(parts[1])
          if (den > 0) fps = num / den
        } else {
          fps = parseFloat(rateStr) || 0
        }
      }
      resolve({
        duration: metadata.format.duration || 0,
        width: video.width || 0,
        height: video.height || 0,
        codec: video.codec_name || 'unknown',
        fps,
        audioCodec: audio?.codec_name || 'unknown'
      })
    })
  })
}

export function extractAudio(videoPath: string, outputPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .noVideo()
      .audioFrequency(16000)
      .audioChannels(1)
      .format('wav')
      .on('end', () => resolve(outputPath))
      .on('error', reject)
      .save(outputPath)
  })
}

export function trimVideo(
  inputPath: string,
  outputPath: string,
  startTime: number,
  endTime: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .setStartTime(startTime)
      .setDuration(endTime - startTime)
      .outputOptions(['-y', '-c', 'copy'])
      .on('end', () => resolve(outputPath))
      .on('error', () => {
        // Fallback: re-encode if stream copy fails
        const { encoder, presetFlag } = getEncoder()
        ffmpeg(inputPath)
          .inputOptions(['-hwaccel', 'auto'])
          .setStartTime(startTime)
          .setDuration(endTime - startTime)
          .outputOptions(['-y', '-c:v', encoder, ...presetFlag, '-c:a', 'aac'])
          .on('end', () => resolve(outputPath))
          .on('error', reject)
          .save(outputPath)
      })
      .save(outputPath)
  })
}

export function trimVideoReencode(
  inputPath: string,
  outputPath: string,
  startTime: number,
  endTime: number
): Promise<string> {
  const { encoder, presetFlag } = getEncoder()
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .inputOptions(['-hwaccel', 'auto'])
      .setStartTime(startTime)
      .setDuration(endTime - startTime)
      .outputOptions(['-y', '-c:v', encoder, ...presetFlag, '-c:a', 'aac'])
      .on('end', () => resolve(outputPath))
      .on('error', reject)
      .save(outputPath)
  })
}

export interface CropRect {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Crop input video to the given rectangle and scale to target resolution (default 1080x1920).
 * Uses hardware encoder with software fallback.
 */
export function cropAndExport(
  inputPath: string,
  outputPath: string,
  crop: CropRect,
  resolution: { width: number; height: number } = { width: 1080, height: 1920 }
): Promise<string> {
  const cropFilter = `crop=${crop.width}:${crop.height}:${crop.x}:${crop.y}`
  const scaleFilter = `scale=${resolution.width}:${resolution.height}`
  const videoFilter = `${cropFilter},${scaleFilter}`

  const gpuOff = isGpuEncoderDisabled()
  const { encoder, presetFlag } = gpuOff ? getSoftwareEncoder() : getEncoder()

  return new Promise((resolve, reject) => {
    let stderrOutput = ''
    const cmd = ffmpeg(inputPath)
    if (!gpuOff) {
      cmd.inputOptions(['-hwaccel', 'auto'])
    }
    cmd
      .videoFilters(videoFilter)
      .outputOptions(['-y', '-c:v', encoder, ...presetFlag, '-c:a', 'aac'])
      .on('stderr', (line: string) => { stderrOutput += line + '\n' })
      .on('end', () => resolve(outputPath))
      .on('error', (err: Error) => {
        if (isGpuSessionError(err.message + '\n' + stderrOutput)) {
          // Retry with software encoder
          disableGpuEncoderForSession()
          const sw = getSoftwareEncoder()
          ffmpeg(inputPath)
            .videoFilters(videoFilter)
            .outputOptions(['-y', '-c:v', sw.encoder, ...sw.presetFlag, '-c:a', 'aac'])
            .on('end', () => resolve(outputPath))
            .on('error', reject)
            .save(outputPath)
        } else {
          reject(err)
        }
      })
      .save(outputPath)
  })
}

/**
 * Extract a single frame as a base64 PNG data URI.
 * @param videoPath  Path to the input video
 * @param timeSec    Seek position in seconds (defaults to 1s or duration/10)
 */
export function generateThumbnail(videoPath: string, timeSec?: number): Promise<string> {
  return new Promise((resolve, reject) => {
    // Determine seek time: use provided value or fall back to 1 second
    const seekSec = timeSec ?? 1

    const tmpFile = join(tmpdir(), `batchcontent-thumb-${Date.now()}.png`)

    ffmpeg(videoPath)
      .seekInput(seekSec)
      .frames(1)
      .outputOptions(['-vf', 'scale=320:-1'])
      .on('end', () => {
        try {
          const buffer = readFileSync(tmpFile)
          const base64 = buffer.toString('base64')
          resolve(`data:image/png;base64,${base64}`)
        } catch (readErr) {
          reject(readErr)
        }
      })
      .on('error', reject)
      .save(tmpFile)
  })
}

// ---------------------------------------------------------------------------
// Script cue segment splitting
// ---------------------------------------------------------------------------

export interface SplitSegment {
  label: string
  startTime: number
  endTime: number
}

export interface SplitResult {
  label: string
  outputPath: string
}

function sanitizeLabel(label: string): string {
  return label.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
}

export async function splitSegments(
  inputPath: string,
  segments: SplitSegment[],
  outputDir: string
): Promise<SplitResult[]> {
  const results: SplitResult[] = []
  for (const segment of segments) {
    const filename = `${sanitizeLabel(segment.label)}.mp4`
    const outputPath = join(outputDir, filename)
    await trimVideo(inputPath, outputPath, segment.startTime, segment.endTime)
    results.push({ label: segment.label, outputPath })
  }
  return results
}

/** Return the resolved ffmpeg binary path (or null if not yet resolved). */
export function getResolvedFfmpegPath(): string | null {
  return resolvedFfmpegPath
}

// ---------------------------------------------------------------------------
// Audio waveform peak extraction
// ---------------------------------------------------------------------------

/**
 * Extract audio amplitude peaks from a video segment.
 *
 * Uses FFmpeg to decode the audio track as raw 16-bit signed PCM (mono, 8 kHz),
 * then downsamples to `numPoints` amplitude peaks normalized to [0, 1].
 *
 * @param videoPath   Path to the source video file
 * @param startTime   Start of the range in seconds
 * @param endTime     End of the range in seconds
 * @param numPoints   Number of data points to return (default 500)
 * @returns           Array of peak amplitudes normalized to [0, 1]
 */
export function getWaveformPeaks(
  videoPath: string,
  startTime: number,
  endTime: number,
  numPoints = 500
): number[] {
  const bin = resolvedFfmpegPath ?? 'ffmpeg'
  const duration = endTime - startTime

  // Use a low sample rate to keep PCM buffer small (8 kHz mono = 8000 samples/s)
  const sampleRate = 8000

  const result = spawnSync(
    bin,
    [
      '-ss', String(startTime),
      '-t',  String(duration),
      '-i',  videoPath,
      '-vn',
      '-ac', '1',
      '-ar', String(sampleRate),
      '-f',  's16le',   // raw signed 16-bit little-endian PCM
      '-'               // pipe to stdout
    ],
    { maxBuffer: 20 * 1024 * 1024 } // 20 MB — ample for any clip
  )

  if (result.error || !result.stdout || result.stdout.length === 0) {
    // No audio stream or read failed — return flat line
    return new Array(numPoints).fill(0)
  }

  const pcm = result.stdout as Buffer
  const totalSamples = Math.floor(pcm.length / 2) // 2 bytes per int16 sample

  if (totalSamples === 0) {
    return new Array(numPoints).fill(0)
  }

  // Bucket samples into `numPoints` groups, take peak amplitude of each bucket
  const samplesPerBucket = Math.max(1, Math.floor(totalSamples / numPoints))
  const peaks: number[] = []

  for (let i = 0; i < numPoints; i++) {
    const bucketStart = i * samplesPerBucket
    const bucketEnd = Math.min(bucketStart + samplesPerBucket, totalSamples)
    let peak = 0
    for (let j = bucketStart; j < bucketEnd; j++) {
      const byteOffset = j * 2
      // Read as signed 16-bit little-endian
      const lo = pcm[byteOffset]
      const hi = pcm[byteOffset + 1]
      let sample = ((hi << 8) | lo)
      if (sample >= 0x8000) sample -= 0x10000  // sign-extend
      const abs = Math.abs(sample)
      if (abs > peak) peak = abs
    }
    // Normalize to [0, 1] (int16 max is 32767)
    peaks.push(peak / 32767)
  }

  return peaks
}

export { ffmpeg }
