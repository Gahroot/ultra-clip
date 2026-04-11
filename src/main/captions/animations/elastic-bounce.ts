import type { CaptionStyleInput, WordGroup } from '../types'
import { hexToASS, formatASSTime } from '../ass-format'
import { buildEmphasisTags } from '../emphasis'

export function buildElasticBounceLines(
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

    const params =
      level === 'supersize'
        ? { initial: 180, undershoot: 88, overshoot: 108, totalCs: 24 }
        : (level === 'emphasis' || level === 'box')
          ? { initial: 155, undershoot: 91, overshoot: 106, totalCs: 20 }
          : { initial: 135, undershoot: 93, overshoot: 104, totalCs: 16 }

    const total = Math.min(params.totalCs, wordDur)

    const t1 = Math.round(total * 0.40)
    const t2 = Math.round(total * 0.70)
    const t3 = total

    const activeColor = level !== 'normal' ? '' : `\\t(${wordStart},${wordStart + wordDur},\\1c${highlightASS})`
    const resetColor = level !== 'normal' ? '' : `\\t(${wordStart + wordDur},${wordStart + wordDur},\\1c${primaryASS})`

    const suffix = isLast ? '' : ' '

    return (
      `{${emp.prefix}` +
      `\\alpha&HFF&\\fscx${params.initial}\\fscy${params.initial}` +
      `\\t(${wordStart},${wordStart + t1},\\alpha&H00&\\fscx${params.undershoot}\\fscy${params.undershoot})` +
      `\\t(${wordStart + t1},${wordStart + t2},\\fscx${params.overshoot}\\fscy${params.overshoot})` +
      `\\t(${wordStart + t2},${wordStart + t3},\\fscx100\\fscy100)` +
      `${activeColor}` +
      `${resetColor}}` +
      `${w.text}${emp.suffix ? `{${emp.suffix}}` : ''}${suffix}`
    )
  })

  lines.push(`Dialogue: 0,${start},${end},Default,,0,0,0,,${parts.join('')}`)
  return lines
}
