import type { CaptionStyleInput, WordInput } from './types'
import { hexToASS } from './ass-format'

export const DEFAULT_EMPHASIS_SCALE = 1.25
export const DEFAULT_SUPERSIZE_SCALE = 1.6

export function resolveEmphasisScale(style: CaptionStyleInput): number {
  return style.emphasisScale ?? DEFAULT_EMPHASIS_SCALE
}

export function resolveSupersizeScale(style: CaptionStyleInput): number {
  return style.supersizeScale ?? DEFAULT_SUPERSIZE_SCALE
}

export function buildEmphasisTags(
  word: WordInput,
  style: CaptionStyleInput,
  baseFontSize: number
): { prefix: string; suffix: string } {
  const level = word.emphasis ?? 'normal'
  if (level === 'normal') return { prefix: '', suffix: '' }

  if (level === 'supersize') {
    const scale = resolveSupersizeScale(style)
    const size = Math.round(baseFontSize * scale)
    const color = hexToASS(style.supersizeColor ?? '#FFD700')
    const weight = style.supersizeFontWeight ?? 800
    const boldTag = weight > 400 ? '\\b1' : ''
    return {
      prefix: `\\fs${size}\\1c${color}${boldTag}`,
      suffix: `\\r`
    }
  }

  if (level === 'box') {
    const boxColor = hexToASS(style.boxColor ?? style.highlightColor)
    const textColor = hexToASS(style.boxTextColor ?? style.primaryColor)
    const padding = style.boxPadding ?? 10
    const opacity = style.boxOpacity ?? 0.85
    const alpha = Math.round((1 - opacity) * 255)
    const alphaPad = alpha.toString(16).toUpperCase().padStart(2, '0')
    const boldTag = style.boxFontWeight && style.boxFontWeight > 400 ? '\\b1' : ''
    return {
      prefix: `\\3c${boxColor}\\3a&H${alphaPad}&\\bord${padding}\\xbord${padding + 4}\\ybord${padding}\\shad0\\4a&HFF&\\1c${textColor}${boldTag}`,
      suffix: `\\r`
    }
  }

  const scale = resolveEmphasisScale(style)
  const size = Math.round(baseFontSize * scale)
  const color = hexToASS(style.emphasisColor ?? style.highlightColor)
  const weight = style.emphasisFontWeight ?? 700
  const boldTag = weight > 400 ? '\\b1' : ''
  return {
    prefix: `\\fs${size}\\1c${color}${boldTag}`,
    suffix: `\\r`
  }
}
