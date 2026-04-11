import type { CaptionStyleInput, WordInput, WordGroup } from '../types'
import { hexToASS, formatASSTime } from '../ass-format'
import { resolveEmphasisScale, resolveSupersizeScale } from '../emphasis'

export function buildWordBoxLines(
  group: WordGroup,
  style: CaptionStyleInput,
  baseFontSize: number,
  frameWidth: number,
  frameHeight: number,
  marginV: number
): string[] {
  const lines: string[] = []
  const primaryASS = hexToASS(style.primaryColor)

  const normalBoxASS = hexToASS(style.outlineColor)
  const emphasisBoxASS = hexToASS(style.emphasisColor ?? style.highlightColor)
  const supersizeBoxASS = hexToASS(style.supersizeColor ?? '#FFD700')
  const boxEmphasisBoxASS = hexToASS(style.boxColor ?? style.highlightColor)

  const start = formatASSTime(group.start)
  const end = formatASSTime(group.end)

  const AVG_CHAR_WIDTH_RATIO = 0.58
  const boxPadding = Math.max(8, Math.round(baseFontSize * 0.18))
  const wordGap = Math.round(baseFontSize * 0.18)

  interface WordMetric {
    word: WordInput
    level: 'normal' | 'emphasis' | 'supersize' | 'box'
    effectiveSize: number
    textWidth: number
    boxWidth: number
  }

  const empScale = resolveEmphasisScale(style)
  const supScale = resolveSupersizeScale(style)

  const metrics: WordMetric[] = group.words.map((w) => {
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
    const boxWidth = textWidth + boxPadding * 2
    return { word: w, level, effectiveSize, textWidth, boxWidth }
  })

  const totalRowWidth =
    metrics.reduce((sum, m) => sum + m.boxWidth, 0) +
    Math.max(0, metrics.length - 1) * wordGap

  let curX = (frameWidth - totalRowWidth) / 2
  const yPos = frameHeight - marginV

  for (let i = 0; i < metrics.length; i++) {
    const m = metrics[i]
    const w = m.word
    const centerX = Math.round(curX + m.boxWidth / 2)

    const boxColor =
      m.level === 'supersize'
        ? supersizeBoxASS
        : m.level === 'box'
          ? boxEmphasisBoxASS
          : m.level === 'emphasis'
            ? emphasisBoxASS
            : normalBoxASS

    const wordStartCs = Math.round((w.start - group.start) * 100)
    const wordDurCs = Math.round((w.end - w.start) * 100)
    const popDur = Math.min(8, wordDurCs)

    const overrides: string[] = [
      `\\an5`,
      `\\pos(${centerX},${yPos})`,
      `\\1c${primaryASS}`,
      `\\3c${boxColor}`,
      `\\4c&H00000000`,
      `\\bord${boxPadding}`,
      `\\shad0`
    ]

    if (m.level === 'emphasis') {
      overrides.push(`\\fs${m.effectiveSize}`)
      if (style.emphasisFontWeight && style.emphasisFontWeight > 400) overrides.push(`\\b1`)
    } else if (m.level === 'supersize') {
      const supWeight = style.supersizeFontWeight ?? 800
      overrides.push(`\\fs${m.effectiveSize}`)
      if (supWeight > 400) overrides.push(`\\b1`)
    } else if (m.level === 'box') {
      overrides.push(`\\fs${m.effectiveSize}`)
      if (style.boxFontWeight && style.boxFontWeight > 400) overrides.push(`\\b1`)
      if (style.boxTextColor) overrides.push(`\\1c${hexToASS(style.boxTextColor)}`)
    }

    overrides.push(
      `\\alpha&HFF&`,
      `\\t(${wordStartCs},${wordStartCs + popDur},\\alpha&H00&\\fscx108\\fscy108)`,
      `\\t(${wordStartCs + popDur},${wordStartCs + popDur + 5},\\fscx100\\fscy100)`
    )

    lines.push(
      `Dialogue: 0,${start},${end},WordBox,,0,0,0,,{${overrides.join('')}}${w.text}`
    )

    curX += m.boxWidth + wordGap
  }

  return lines
}
