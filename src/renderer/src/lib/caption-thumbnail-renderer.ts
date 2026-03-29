/**
 * Canvas-based caption style thumbnail renderer.
 *
 * Renders a 200×350 portrait thumbnail showing 2–3 sample words in normal,
 * emphasis, and supersize states against a dark background, mimicking the
 * visual output of the ASS caption pipeline.
 */

import type { CaptionStyle } from '@/store/types'

// ---------------------------------------------------------------------------
// Dimensions — 200×350 portrait card
// ---------------------------------------------------------------------------

export const THUMB_W = 200
export const THUMB_H = 350
const THUMB_SCALE = THUMB_W / 1080

// Dark gradient matching the CSS thumbnail background
const BG_TOP = '#1a1a2e'
const BG_MID = '#16213e'
const BG_BOT = '#0f3460'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse a hex color string (#RGB, #RRGGBB, or #AARRGGBB) to an rgba CSS string.
 * ASS files use #AARRGGBB order; the web uses #RRGGBBAA.
 */
function hexToRgba(hex: string, alphaOverride?: number): string {
  let h = hex.replace('#', '')
  // Handle #AARRGGBB (ASS-style alpha-first)
  if (h.length === 8) {
    const a = parseInt(h.substring(0, 2), 16) / 255
    const r = parseInt(h.substring(2, 4), 16)
    const g = parseInt(h.substring(4, 6), 16)
    const b = parseInt(h.substring(6, 8), 16)
    const aFinal = alphaOverride !== undefined ? alphaOverride : a
    return `rgba(${r},${g},${b},${aFinal.toFixed(3)})`
  }
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  const a = alphaOverride !== undefined ? alphaOverride : 1
  return `rgba(${r},${g},${b},${a.toFixed(3)})`
}

/** Draw a rounded rectangle path (compatibility fallback). */
function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath()
  if (ctx.roundRect) {
    ctx.roundRect(x, y, w, h, r)
  } else {
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.arcTo(x + w, y, x + w, y + r, r)
    ctx.lineTo(x + w, y + h - r)
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
    ctx.lineTo(x + r, y + h)
    ctx.arcTo(x, y + h, x, y + h - r, r)
    ctx.lineTo(x, y + r)
    ctx.arcTo(x, y, x + r, y, r)
  }
  ctx.closePath()
}

// ---------------------------------------------------------------------------
// Word layout type
// ---------------------------------------------------------------------------

interface WordLayout {
  text: string
  type: 'normal' | 'emphasis' | 'supersize'
  fontSize: number
  fontWeight: string
  color: string
  fontStr: string
  width: number
  height: number
}

// ---------------------------------------------------------------------------
// Main render function
// ---------------------------------------------------------------------------

/**
 * Render a caption style thumbnail to a canvas and return it as a PNG data URL.
 *
 * @param style - The caption style definition
 * @returns PNG data URL string
 */
export function renderCaptionThumbnail(style: CaptionStyle): string {
  const canvas = document.createElement('canvas')
  canvas.width = THUMB_W
  canvas.height = THUMB_H
  const ctx = canvas.getContext('2d')!
  if (!ctx) return ''

  const scaledFontSize = Math.max(8, style.fontSize * 1920 * THUMB_SCALE)
  const outlineWidth = Math.max(0, style.outline * THUMB_SCALE)
  const isWordBox = style.animation === 'word-box'
  const hasBox = style.borderStyle === 3 && !isWordBox
  const isCaptionsAI = style.animation === 'captions-ai'
  const isGlow = style.animation === 'glow'

  // ---- Background gradient ----
  const grad = ctx.createLinearGradient(0, 0, 0, THUMB_H)
  grad.addColorStop(0, BG_TOP)
  grad.addColorStop(0.5, BG_MID)
  grad.addColorStop(1, BG_BOT)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, THUMB_W, THUMB_H)

  // ---- Silhouette decoration ----
  ctx.save()
  ctx.globalAlpha = 0.06
  ctx.fillStyle = '#FFFFFF'
  // Head
  ctx.beginPath()
  ctx.arc(THUMB_W / 2, THUMB_H * 0.30, 22, 0, Math.PI * 2)
  ctx.fill()
  // Shoulders/torso
  ctx.beginPath()
  ctx.ellipse(THUMB_W / 2, THUMB_H * 0.48, 42, 32, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  // ---- Sample words ----
  const words: Array<{ text: string; type: 'normal' | 'emphasis' | 'supersize' }> = [
    { text: 'This', type: 'normal' },
    { text: 'IS', type: 'emphasis' },
    { text: 'EPIC', type: 'supersize' },
  ]

  // Compute per-word layout metrics
  const wordMetrics: WordLayout[] = words.map(w => {
    let fontSize = scaledFontSize
    let fontWeight = '700'
    let color = style.primaryColor

    if (isWordBox) {
      const scale = w.type === 'supersize' ? 1.2 : w.type === 'emphasis' ? 1.1 : 1
      fontSize = scaledFontSize * scale
      fontWeight = w.type === 'supersize' ? '900' : '700'
      color = style.primaryColor
    } else if (isCaptionsAI && w.type === 'supersize') {
      fontSize = scaledFontSize * 2.0
      fontWeight = '900'
      color = style.supersizeColor ?? '#FFD700'
    } else if (isCaptionsAI && w.type === 'emphasis') {
      fontSize = scaledFontSize * 1.25
      fontWeight = '800'
      color = style.emphasisColor ?? style.highlightColor
    } else if (isGlow && w.type === 'supersize') {
      fontSize = scaledFontSize * 1.3
      fontWeight = '800'
      color = style.supersizeColor ?? style.highlightColor
    } else if (isGlow && w.type === 'emphasis') {
      color = style.emphasisColor ?? style.highlightColor
      fontWeight = '700'
    } else if (w.type === 'emphasis') {
      color = style.highlightColor
    } else if (w.type === 'supersize') {
      color = style.supersizeColor ?? style.highlightColor
      fontSize = scaledFontSize * 1.3
      fontWeight = '800'
    }

    const fontStr = `${fontWeight} ${Math.round(fontSize)}px "${style.fontName}", sans-serif`
    ctx.font = fontStr
    const m = ctx.measureText(w.text)
    return {
      text: w.text,
      type: w.type,
      fontSize,
      fontWeight,
      color,
      fontStr,
      width: m.width,
      height: fontSize * 1.3,
    }
  })

  // Center the word block vertically in the lower portion
  const totalHeight = wordMetrics.reduce((sum, m) => sum + m.height, 0)
  let y = THUMB_H * 0.78 - totalHeight / 2

  for (const wm of wordMetrics) {
    ctx.font = wm.fontStr
    const x = THUMB_W / 2 - wm.width / 2

    if (isWordBox) {
      // ---- Per-word colored box ----
      const boxColor =
        wm.type === 'supersize'
          ? (style.supersizeColor ?? '#DC2626')
          : wm.type === 'emphasis'
            ? (style.emphasisColor ?? style.highlightColor)
            : style.outlineColor
      const pad = 5
      const boxX = x - pad
      const boxY = y - wm.fontSize * 0.85
      const boxW = wm.width + pad * 2
      const boxH = wm.height + 2

      ctx.fillStyle = hexToRgba(boxColor, 0.9)
      drawRoundRect(ctx, boxX, boxY, boxW, boxH, 4)
      ctx.fill()

      ctx.fillStyle = wm.color
      ctx.fillText(wm.text, x, y)
    } else if (hasBox) {
      // ---- Opaque box behind text ----
      const pad = 8
      const boxX = x - pad
      const boxY = y - wm.fontSize * 0.85
      const boxW = wm.width + pad * 2
      const boxH = wm.height + 2

      ctx.fillStyle = hexToRgba(style.backColor)
      drawRoundRect(ctx, boxX, boxY, boxW, boxH, 4)
      ctx.fill()

      ctx.fillStyle = wm.color
      ctx.fillText(wm.text, x, y)
    } else {
      // ---- Outline + shadow + fill ----
      // Apply shadow to the stroke pass
      if (style.shadow > 0) {
        ctx.shadowColor = hexToRgba(style.outlineColor)
        ctx.shadowBlur = style.shadow * THUMB_SCALE * 4
        ctx.shadowOffsetX = Math.max(1, style.shadow * THUMB_SCALE * 1.5)
        ctx.shadowOffsetY = Math.max(1, style.shadow * THUMB_SCALE * 1.5)
      }

      if (outlineWidth > 0) {
        ctx.strokeStyle = style.outlineColor
        ctx.lineWidth = outlineWidth * 2
        ctx.lineJoin = 'round'
        ctx.strokeText(wm.text, x, y)
      }

      // Reset shadow for the fill pass
      ctx.shadowColor = 'transparent'
      ctx.shadowBlur = 0
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 0

      ctx.fillStyle = wm.color
      ctx.fillText(wm.text, x, y)
    }

    y += wm.height
  }

  return canvas.toDataURL('image/png')
}
