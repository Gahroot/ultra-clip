import type { CaptionStyleInput, WordGroup } from '../types'
import { hexToASS, formatASSTime } from '../ass-format'
import { buildEmphasisTags } from '../emphasis'

export function buildKaraokeLine(
  group: WordGroup,
  style: CaptionStyleInput,
  baseFontSize: number
): string {
  const start = formatASSTime(group.start)
  const end = formatASSTime(group.end)

  const highlightASS = hexToASS(style.highlightColor)

  const parts = group.words.map((w) => {
    const dur = Math.round((w.end - w.start) * 100)
    const emp = buildEmphasisTags(w, style, baseFontSize)
    return `{\\kf${dur}${emp.prefix}}${w.text}${emp.suffix ? `{${emp.suffix}}` : ''}`
  })

  return `Dialogue: 0,${start},${end},Default,,0,0,0,,{\\1c${highlightASS}}${parts.join(' ')}`
}
