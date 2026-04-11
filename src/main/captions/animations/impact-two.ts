import type { CaptionStyleInput, WordGroup } from '../types'
import { hexToASS, formatASSTime } from '../ass-format'

export function buildImpactTwoLines(
  group: WordGroup,
  style: CaptionStyleInput,
  baseFontSize: number
): string[] {
  const primaryASS = hexToASS(style.primaryColor)
  const supersizeASS = hexToASS(style.supersizeColor ?? '#FFD700')
  const emphasisASS = hexToASS(style.emphasisColor ?? style.highlightColor)
  const outlineASS = hexToASS(style.outlineColor)

  const start = formatASSTime(group.start)
  const end = formatASSTime(group.end)

  let keyIdx = -1
  for (let i = 0; i < group.words.length; i++) {
    if (group.words[i].emphasis === 'supersize') { keyIdx = i; break }
  }
  if (keyIdx === -1) {
    for (let i = 0; i < group.words.length; i++) {
      if (group.words[i].emphasis === 'box') { keyIdx = i; break }
    }
  }
  if (keyIdx === -1) {
    for (let i = 0; i < group.words.length; i++) {
      if (group.words[i].emphasis === 'emphasis') { keyIdx = i; break }
    }
  }
  if (keyIdx === -1) keyIdx = group.words.length - 1

  const keyWord = group.words[keyIdx]
  const contextWords = group.words.filter((_, i) => i !== keyIdx)

  const contextSize = Math.round(baseFontSize * 0.40)
  const keySize = Math.round(baseFontSize * 2.80)

  if (group.words.length === 1) {
    const w = group.words[0]
    const wordStartCs = Math.round((w.start - group.start) * 100)
    const wordDurCs = Math.round((w.end - w.start) * 100)
    const slamDur = Math.min(10, wordDurCs)
    const settleDur = Math.min(8, wordDurCs)

    const line =
      `Dialogue: 0,${start},${end},Default,,0,0,0,,` +
      `{\\fs${keySize}\\b1\\1c${supersizeASS}\\bord${Math.round(style.outline * 1.8)}` +
      `\\alpha&HFF&\\fscx140\\fscy140` +
      `\\t(${wordStartCs},${wordStartCs + slamDur},\\alpha&H00&)` +
      `\\t(${wordStartCs + slamDur},${wordStartCs + slamDur + settleDur},0.4,\\fscx100\\fscy100)}` +
      `${w.text.toUpperCase()}`

    return [line]
  }

  const contextParts = contextWords.map((w) => {
    const wordStartCs = Math.round((w.start - group.start) * 100)
    const fadeDur = Math.min(12, Math.round((w.end - w.start) * 100))
    const level = w.emphasis ?? 'normal'
    const colorTag = (level === 'emphasis' || level === 'box') ? `\\1c${emphasisASS}` : `\\1c${primaryASS}`

    return (
      `{\\fs${contextSize}${colorTag}\\bord${Math.max(1, Math.round(style.outline * 0.5))}` +
      `\\alpha&HFF&\\t(${wordStartCs},${wordStartCs + fadeDur},\\alpha&H00&)}` +
      `${w.text}`
    )
  })

  const keyStartCs = Math.round((keyWord.start - group.start) * 100)
  const keyDurCs = Math.round((keyWord.end - keyWord.start) * 100)
  const slamDur = Math.min(10, keyDurCs)
  const settleDur = Math.min(8, keyDurCs)

  const keyPart =
    `{\\fs${keySize}\\b1\\1c${supersizeASS}\\3c${outlineASS}` +
    `\\bord${Math.round(style.outline * 1.8)}` +
    `\\alpha&HFF&\\fscx140\\fscy140` +
    `\\t(${keyStartCs},${keyStartCs + slamDur},\\alpha&H00&)` +
    `\\t(${keyStartCs + slamDur},${keyStartCs + slamDur + settleDur},0.4,\\fscx100\\fscy100)}` +
    `${keyWord.text.toUpperCase()}`

  const line =
    `Dialogue: 0,${start},${end},Default,,0,0,0,,` +
    `${contextParts.join(' ')}\\N${keyPart}`

  return [line]
}
