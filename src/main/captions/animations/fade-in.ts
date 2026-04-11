import type { CaptionStyleInput, WordGroup } from '../types'
import { formatASSTime } from '../ass-format'
import { buildEmphasisTags } from '../emphasis'

export function buildFadeInLines(
  group: WordGroup,
  style: CaptionStyleInput,
  baseFontSize: number
): string[] {
  const start = formatASSTime(group.start)
  const end = formatASSTime(group.end)

  const parts = group.words.map((w, idx) => {
    const wordStart = Math.round((w.start - group.start) * 100)
    const fadeDur = Math.min(15, Math.round((w.end - w.start) * 100))
    const isLast = idx === group.words.length - 1
    const suffix = isLast ? '' : ' '

    const emp = buildEmphasisTags(w, style, baseFontSize)

    return (
      `{${emp.prefix}\\alpha&HFF&\\t(${wordStart},${wordStart + fadeDur},\\alpha&H00&)}` +
      `${w.text}${emp.suffix ? `{${emp.suffix}}` : ''}${suffix}`
    )
  })

  return [`Dialogue: 0,${start},${end},Default,,0,0,0,,${parts.join('')}`]
}
