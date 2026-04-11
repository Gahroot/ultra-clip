import type { CaptionStyleInput, WordGroup } from '../types'
import { formatASSTime } from '../ass-format'
import { buildEmphasisTags } from '../emphasis'

export function buildTypewriterLines(
  group: WordGroup,
  style: CaptionStyleInput,
  baseFontSize: number
): string[] {
  const start = formatASSTime(group.start)
  const end = formatASSTime(group.end)

  const charBlocks: string[] = []

  for (let wIdx = 0; wIdx < group.words.length; wIdx++) {
    const w = group.words[wIdx]
    const emp = buildEmphasisTags(w, style, baseFontSize)

    const wordStartCs = Math.round((w.start - group.start) * 100)
    const wordDurCs = Math.round((w.end - w.start) * 100)

    const chars = [...w.text]
    const charCount = chars.length
    const csPerChar = charCount > 0 ? wordDurCs / charCount : wordDurCs

    for (let cIdx = 0; cIdx < charCount; cIdx++) {
      const revealCs = Math.round(wordStartCs + cIdx * csPerChar)
      const tags = `${emp.prefix}\\alpha&HFF&\\t(${revealCs},${revealCs},\\alpha&H00&)`
      charBlocks.push(`{${tags}}${chars[cIdx]}${emp.suffix ? `{${emp.suffix}}` : ''}`)
    }

    if (wIdx < group.words.length - 1) {
      const nextWord = group.words[wIdx + 1]
      const nextStartCs = Math.round((nextWord.start - group.start) * 100)
      charBlocks.push(`{\\alpha&HFF&\\t(${nextStartCs},${nextStartCs},\\alpha&H00&)} `)
    }
  }

  return [`Dialogue: 0,${start},${end},Default,,0,0,0,,${charBlocks.join('')}`]
}
