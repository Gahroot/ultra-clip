import type { CaptionStyleInput, WordInput, WordGroup } from '../types'
import { hexToASS, formatASSTime } from '../ass-format'
import { resolveEmphasisScale, resolveSupersizeScale } from '../emphasis'

export function buildCascadeLines(
  group: WordGroup,
  style: CaptionStyleInput,
  baseFontSize: number,
  frameWidth: number,
  frameHeight: number,
  marginV: number
): string[] {
  const lines: string[] = []
  const primaryASS = hexToASS(style.primaryColor)
  const emphasisASS = hexToASS(style.emphasisColor ?? style.highlightColor)
  const supersizeASS = hexToASS(style.supersizeColor ?? '#FFD700')

  const start = formatASSTime(group.start)
  const end = formatASSTime(group.end)

  const AVG_CHAR_WIDTH_RATIO = 0.58
  const wordGap = Math.round(baseFontSize * 0.22)

  interface CascadeMetric {
    word: WordInput
    level: 'normal' | 'emphasis' | 'supersize' | 'box'
    effectiveSize: number
    textWidth: number
  }

  const empScale = resolveEmphasisScale(style)
  const supScale = resolveSupersizeScale(style)

  const metrics: CascadeMetric[] = group.words.map((w) => {
    const level = w.emphasis ?? 'normal'
    const scale =
      level === 'supersize'
        ? supScale
        : level === 'emphasis' || level === 'box'
          ? empScale
          : 1
    const effectiveSize = Math.round(baseFontSize * scale)
    const charWidth = effectiveSize * AVG_CHAR_WIDTH_RATIO
    const textWidth = w.text.length * charWidth
    return { word: w, level, effectiveSize, textWidth }
  })

  const totalRowWidth =
    metrics.reduce((sum, m) => sum + m.textWidth, 0) +
    Math.max(0, metrics.length - 1) * wordGap
  let curX = (frameWidth - totalRowWidth) / 2

  const finalY = frameHeight - marginV

  const staggerDelayCs = 6
  const riseDistNormal = Math.round(baseFontSize * 0.35)
  const riseDistEmphasis = Math.round(baseFontSize * 0.50)
  const riseDistSupersize = Math.round(baseFontSize * 0.65)
  const fadeDurNormal = 18
  const fadeDurEmphasis = 15
  const fadeDurSupersize = 12

  for (let i = 0; i < metrics.length; i++) {
    const m = metrics[i]
    const w = m.word
    const centerX = Math.round(curX + m.textWidth / 2)

    const cascadeOffsetCs = i * staggerDelayCs

    const riseDist =
      m.level === 'supersize'
        ? riseDistSupersize
        : (m.level === 'emphasis' || m.level === 'box')
          ? riseDistEmphasis
          : riseDistNormal
    const fadeDur =
      m.level === 'supersize'
        ? fadeDurSupersize
        : (m.level === 'emphasis' || m.level === 'box')
          ? fadeDurEmphasis
          : fadeDurNormal

    const startY = finalY + riseDist

    const moveStartMs = cascadeOffsetCs * 10
    const moveEndMs = moveStartMs + fadeDur * 10

    const overrides: string[] = [
      `\\an5`,
      `\\move(${centerX},${startY},${centerX},${finalY},${moveStartMs},${moveEndMs})`
    ]

    if (m.level === 'supersize') {
      const supWeight = style.supersizeFontWeight ?? 800
      overrides.push(
        `\\fs${m.effectiveSize}`,
        `\\1c${supersizeASS}`,
        `\\bord${Math.round(style.outline * 1.5)}`
      )
      if (supWeight > 400) overrides.push(`\\b1`)
    } else if (m.level === 'box') {
      const boxColorASS = hexToASS(style.boxColor ?? style.highlightColor)
      const textColorASS = hexToASS(style.boxTextColor ?? style.primaryColor)
      const padding = style.boxPadding ?? 10
      overrides.push(
        `\\fs${m.effectiveSize}`,
        `\\1c${textColorASS}`,
        `\\3c${boxColorASS}`,
        `\\bord${padding}`,
        `\\xbord${padding + 4}`,
        `\\ybord${padding}`,
        `\\shad0`
      )
      if (style.boxFontWeight && style.boxFontWeight > 400) overrides.push(`\\b1`)
    } else if (m.level === 'emphasis') {
      overrides.push(
        `\\fs${m.effectiveSize}`,
        `\\1c${emphasisASS}`
      )
      if (style.emphasisFontWeight && style.emphasisFontWeight > 400) overrides.push(`\\b1`)
    } else {
      overrides.push(`\\1c${primaryASS}`)
    }

    overrides.push(
      `\\alpha&HFF&`,
      `\\t(${cascadeOffsetCs},${cascadeOffsetCs + fadeDur},\\alpha&H00&)`
    )

    if (m.level === 'supersize') {
      overrides.push(
        `\\fscx108\\fscy108`,
        `\\t(${cascadeOffsetCs + fadeDur},${cascadeOffsetCs + fadeDur + 8},0.4,\\fscx100\\fscy100)`
      )
    }

    lines.push(
      `Dialogue: 0,${start},${end},Default,,0,0,0,,{${overrides.join('')}}${w.text}`
    )

    curX += m.textWidth + wordGap
  }

  return lines
}
