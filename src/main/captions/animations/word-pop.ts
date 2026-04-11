import type { CaptionStyleInput, WordGroup } from '../types'
import { hexToASS, formatASSTime } from '../ass-format'
import { buildEmphasisTags } from '../emphasis'

export function buildWordPopLines(
  group: WordGroup,
  style: CaptionStyleInput,
  baseFontSize: number
): string[] {
  const lines: string[] = []
  const highlightASS = hexToASS(style.highlightColor)
  const primaryASS = hexToASS(style.primaryColor)

  const start = formatASSTime(group.start)
  const end = formatASSTime(group.end)

  const parts = group.words.map((w, idx) => {
    const wordStart = Math.round((w.start - group.start) * 100)
    const wordDur = Math.round((w.end - w.start) * 100)
    const isLast = idx === group.words.length - 1

    const emp = buildEmphasisTags(w, style, baseFontSize)
    const level = w.emphasis ?? 'normal'

    const popScaleX = level === 'supersize' ? 130 : (level === 'emphasis' || level === 'box') ? 120 : 110
    const popScaleY = popScaleX
    const activeColor = level !== 'normal' ? '' : `\\t(${wordStart},${wordStart + wordDur},\\1c${highlightASS})`
    const resetColor = level !== 'normal' ? '' : `\\t(${wordStart + wordDur},${wordStart + wordDur},\\1c${primaryASS})`

    const popDuration = Math.min(8, wordDur)
    const suffix = isLast ? '' : ' '

    return (
      `{${emp.prefix}\\alpha&HFF&\\t(${wordStart},${wordStart + popDuration},\\alpha&H00&\\fscx${popScaleX}\\fscy${popScaleY})` +
      `\\t(${wordStart + popDuration},${wordStart + popDuration + 5},\\fscx100\\fscy100)` +
      `${activeColor}` +
      `${resetColor}}` +
      `${w.text}${emp.suffix ? `{${emp.suffix}}` : ''}${suffix}`
    )
  })

  lines.push(`Dialogue: 0,${start},${end},Default,,0,0,0,,${parts.join('')}`)
  return lines
}
