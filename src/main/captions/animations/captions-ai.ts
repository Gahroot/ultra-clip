import type { CaptionStyleInput, WordGroup } from '../types'
import { hexToASS, formatASSTime } from '../ass-format'
import { buildEmphasisTags, resolveEmphasisScale, resolveSupersizeScale } from '../emphasis'

export function buildCaptionsAILines(
  group: WordGroup,
  style: CaptionStyleInput,
  baseFontSize: number
): string[] {
  const primaryASS = hexToASS(style.primaryColor)
  const emphasisASS = hexToASS(style.emphasisColor ?? style.highlightColor)
  const supersizeASS = hexToASS(style.supersizeColor ?? '#FFD700')

  const start = formatASSTime(group.start)
  const end = formatASSTime(group.end)

  const parts = group.words.map((w, idx) => {
    const wordStartCs = Math.round((w.start - group.start) * 100)
    const wordDurCs = Math.round((w.end - w.start) * 100)
    const isLast = idx === group.words.length - 1
    const suffix = isLast ? '' : ' '
    const level = w.emphasis ?? 'normal'

    if (level === 'supersize') {
      const supScale = resolveSupersizeScale(style)
      const bigSize = Math.round(baseFontSize * Math.max(supScale, 1.6))
      const snapScale = 220
      const holdScale = 200
      const snapDur = Math.min(6, wordDurCs)
      const settleDur = Math.min(10, wordDurCs)
      const supWeight = style.supersizeFontWeight ?? 800
      const supBold = supWeight > 400 ? '\\b1' : ''

      return (
        `{\\fs${bigSize}${supBold}\\1c${supersizeASS}\\bord${Math.round(style.outline * 1.5)}` +
        `\\alpha&HFF&\\fscx${snapScale}\\fscy${snapScale}` +
        `\\t(${wordStartCs},${wordStartCs + snapDur},\\alpha&H00&)` +
        `\\t(${wordStartCs + snapDur},${wordStartCs + snapDur + settleDur},0.4,\\fscx${holdScale}\\fscy${holdScale})}` +
        `${w.text}{\\r}${suffix}`
      )
    }

    if (level === 'emphasis') {
      const empSize = Math.round(baseFontSize * resolveEmphasisScale(style))
      const popScale = 130
      const snapDur = Math.min(4, wordDurCs)
      const settleDur = Math.min(10, wordDurCs)
      const empBold = style.emphasisFontWeight && style.emphasisFontWeight > 400 ? '\\b1' : '\\b1'

      return (
        `{\\fs${empSize}\\1c${emphasisASS}${empBold}` +
        `\\alpha&HFF&\\fscx${popScale}\\fscy${popScale}` +
        `\\t(${wordStartCs},${wordStartCs + snapDur},\\alpha&H00&)` +
        `\\t(${wordStartCs + snapDur},${wordStartCs + snapDur + Math.round(settleDur * 0.6)},\\fscx95\\fscy95)` +
        `\\t(${wordStartCs + snapDur + Math.round(settleDur * 0.6)},${wordStartCs + snapDur + settleDur},\\fscx100\\fscy100)}` +
        `${w.text}{\\r}${suffix}`
      )
    }

    if (level === 'box') {
      const emp = buildEmphasisTags(w, style, baseFontSize)
      const snapDur = Math.min(4, wordDurCs)
      const settleDur = Math.min(10, wordDurCs)
      const popScale = 115

      return (
        `{${emp.prefix}` +
        `\\alpha&HFF&\\fscx${popScale}\\fscy${popScale}` +
        `\\t(${wordStartCs},${wordStartCs + snapDur},\\alpha&H00&)` +
        `\\t(${wordStartCs + snapDur},${wordStartCs + snapDur + settleDur},\\fscx100\\fscy100)}` +
        `${w.text}{${emp.suffix}}${suffix}`
      )
    }

    const fadeDur = Math.min(15, wordDurCs)

    return (
      `{\\1c${primaryASS}\\alpha&HFF&` +
      `\\t(${wordStartCs},${wordStartCs + fadeDur},\\alpha&H00&)}` +
      `${w.text}${suffix}`
    )
  })

  return [`Dialogue: 0,${start},${end},Default,,0,0,0,,${parts.join('')}`]
}
