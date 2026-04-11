import type { CaptionStyleInput, WordGroup } from '../types'
import { hexToASS, formatASSTime } from '../ass-format'
import { buildEmphasisTags } from '../emphasis'

export function buildGlowLines(
  group: WordGroup,
  style: CaptionStyleInput,
  baseFontSize: number
): string[] {
  const start = formatASSTime(group.start)
  const end = formatASSTime(group.end)

  const highlightASS = hexToASS(style.highlightColor)
  const outlineASS = hexToASS(style.outlineColor)

  const parts = group.words.map((w, idx) => {
    const wordStart = Math.round((w.start - group.start) * 100)
    const wordEnd = Math.round((w.end - group.start) * 100)
    const isLast = idx === group.words.length - 1
    const suffix = isLast ? '' : ' '

    const emp = buildEmphasisTags(w, style, baseFontSize)
    const level = w.emphasis ?? 'normal'

    const glowBord = level === 'supersize'
      ? style.outline + 5
      : (level === 'emphasis' || level === 'box')
        ? style.outline + 3
        : style.outline + 2

    return (
      `{${emp.prefix}\\3c${outlineASS}` +
      `\\t(${wordStart},${wordStart},\\3c${highlightASS}\\bord${glowBord})` +
      `\\t(${wordEnd},${wordEnd},\\3c${outlineASS}\\bord${style.outline})}` +
      `${w.text}${emp.suffix ? `{${emp.suffix}}` : ''}${suffix}`
    )
  })

  return [`Dialogue: 0,${start},${end},Default,,0,0,0,,${parts.join('')}`]
}
