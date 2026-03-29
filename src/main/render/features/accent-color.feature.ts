// ---------------------------------------------------------------------------
// Accent Color Feature — propagates a single per-clip accent color to all
// visual subsystems (captions, hook title, progress bar, rehook).
//
// Runs early in the prepare phase so downstream features see the overridden
// colors. When job.clipOverrides.accentColor is set, it replaces the
// highlight/emphasis colors in caption style, hook title text color, and
// progress bar color — painting the whole edit with one brush stroke.
// ---------------------------------------------------------------------------

import type { RenderFeature, PrepareResult } from './feature'
import type { RenderClipJob, RenderBatchOptions } from '../types'

/**
 * Derive a lighter tint from a hex color for the supersize word color.
 * Blends the input color 40% toward white.
 */
function lightenColor(hex: string, amount = 0.4): string {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.substring(0, 2), 16)
  const g = parseInt(clean.substring(2, 4), 16)
  const b = parseInt(clean.substring(4, 6), 16)
  const lr = Math.round(r + (255 - r) * amount)
  const lg = Math.round(g + (255 - g) * amount)
  const lb = Math.round(b + (255 - b) * amount)
  return `#${lr.toString(16).padStart(2, '0')}${lg.toString(16).padStart(2, '0')}${lb.toString(16).padStart(2, '0')}`
}

export const accentColorFeature: RenderFeature = {
  name: 'accent-color',

  async prepare(job: RenderClipJob, batchOptions: RenderBatchOptions): Promise<PrepareResult> {
    const accent = job.clipOverrides?.accentColor
    if (!accent) {
      return { tempFiles: [], modified: false }
    }

    const supersizeColor = lightenColor(accent, 0.4)

    // ── Caption style overrides ────────────────────────────────────────────
    if (batchOptions.captionStyle) {
      batchOptions.captionStyle = {
        ...batchOptions.captionStyle,
        highlightColor: accent,
        emphasisColor: accent,
        supersizeColor
      }
    }

    // ── Hook title overlay — accent becomes text color ─────────────────────
    if (batchOptions.hookTitleOverlay) {
      batchOptions.hookTitleOverlay = {
        ...batchOptions.hookTitleOverlay,
        textColor: accent
      }
    }

    // Note: rehook overlay inherits textColor from hookTitleOverlay (see
    // rehook.feature.ts:154), so no separate override is needed here.

    // ── Progress bar — accent becomes bar color ────────────────────────────
    if (batchOptions.progressBarOverlay) {
      batchOptions.progressBarOverlay = {
        ...batchOptions.progressBarOverlay,
        color: accent
      }
    }

    // ── Per-shot style configs — tint caption colors in each shot ──────────
    if (job.shotStyleConfigs && job.shotStyleConfigs.length > 0) {
      for (const shotConfig of job.shotStyleConfigs) {
        if (shotConfig.captionStyle) {
          shotConfig.captionStyle = {
            ...shotConfig.captionStyle,
            highlightColor: accent,
            emphasisColor: accent,
            supersizeColor
          }
        }
      }
    }

    console.log(
      `[AccentColor] Clip ${job.clipId}: applying accent ${accent} → ` +
      `captions, hook title (+rehook), progress bar, per-shot styles`
    )

    return { tempFiles: [], modified: true }
  }
}
