import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ---------------------------------------------------------------------------
// Score description utility
// ---------------------------------------------------------------------------

export interface ScoreDescription {
  label: string
  description: string
  color: string
}

/**
 * Returns a human-readable label, description, and color category for a 0–100
 * viral potential score produced by the Gemini AI scoring pipeline.
 */
export function getScoreDescription(score: number): ScoreDescription {
  if (score >= 90) {
    return {
      label: 'Viral',
      description: 'Guaranteed viral potential — exceptional hook, content, and shareability',
      color: 'green'
    }
  }
  if (score >= 80) {
    return {
      label: 'Very Strong',
      description: 'High engagement potential — strong hook and valuable content',
      color: 'blue'
    }
  }
  if (score >= 70) {
    return {
      label: 'Strong',
      description: 'Good clip — solid hook or interesting content segment',
      color: 'yellow'
    }
  }
  if (score >= 60) {
    return {
      label: 'Moderate',
      description: 'Decent clip — may need hook text or overlay optimization',
      color: 'orange'
    }
  }
  return {
    label: 'Weak',
    description: 'Low engagement potential — consider skipping',
    color: 'red'
  }
}

// ---------------------------------------------------------------------------
// File size estimation for rendered clips
// ---------------------------------------------------------------------------

/**
 * Estimate the output file size for a rendered 1080×1920 H.264 CRF 23 clip.
 *
 * Based on typical bitrates:
 * - Video: ~1.5 Mbps (187.5 KB/s) for 1080×1920 CRF 23 veryfast
 * - Audio: AAC 192kbps = 24 KB/s
 *
 * Returns estimated size in bytes.
 */
export function estimateClipSize(
  durationSeconds: number,
  options?: {
    hasBumpers?: boolean
    introDuration?: number
    outroDuration?: number
  }
): number {
  const VIDEO_KBPS = 187.5 // ~1.5 Mbps video
  const AUDIO_KBPS = 24    // 192 kbps audio
  const RATE = (VIDEO_KBPS + AUDIO_KBPS) * 1024 // bytes per second

  let totalDuration = durationSeconds
  if (options?.hasBumpers) {
    totalDuration += (options.introDuration ?? 0) + (options.outroDuration ?? 0)
  }

  return Math.round(totalDuration * RATE)
}

// ---------------------------------------------------------------------------
// AI Edit mode detection
// ---------------------------------------------------------------------------

/**
 * Returns true if a clip is operating in "AI Edit" mode rather than basic
 * clip mode. A clip is in AI Edit mode when it has an aiEditPlan OR when
 * segments have been created for it in the segment editor.
 */
export function isAIEditClip(
  clip: { aiEditPlan?: unknown },
  segments?: unknown[]
): boolean {
  return !!clip.aiEditPlan || (Array.isArray(segments) && segments.length > 0)
}

/** Format bytes as a human-readable file size: "8.2 MB", "1.1 GB", etc. */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}
