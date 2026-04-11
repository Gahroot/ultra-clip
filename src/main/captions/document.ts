import type {
  CaptionAnimation,
  CaptionStyleInput,
  ShotCaptionOverride,
  WordGroup,
  WordInput
} from './types'
import { DEFAULT_FRAME_HEIGHT, DEFAULT_FRAME_WIDTH } from './types'
import { hexToASS, groupWords } from './ass-format'
import {
  buildKaraokeLine,
  buildWordPopLines,
  buildFadeInLines,
  buildGlowLines,
  buildWordBoxLines,
  buildElasticBounceLines,
  buildTypewriterLines,
  buildImpactTwoLines,
  buildCascadeLines,
  buildCaptionsAILines
} from './animations'

export function buildASSDocument(
  words: WordInput[],
  style: CaptionStyleInput,
  frameWidth: number = DEFAULT_FRAME_WIDTH,
  frameHeight: number = DEFAULT_FRAME_HEIGHT,
  marginVOverride?: number,
  shotOverrides?: ShotCaptionOverride[]
): string {
  const fontSize = Math.round(style.fontSize * frameHeight)
  const primaryASS = hexToASS(style.primaryColor)
  const outlineASS = hexToASS(style.outlineColor)
  const backASS = hexToASS(style.backColor)

  const marginV = marginVOverride ?? Math.round(frameHeight * 0.12)

  const animationsInUse = new Set<CaptionAnimation>()
  animationsInUse.add(style.animation)
  const wordBoxNeeded = style.animation === 'word-box'

  if (shotOverrides && shotOverrides.length > 0) {
    for (const ov of shotOverrides) {
      animationsInUse.add(ov.style.animation)
    }
  }

  const extraStyleLines: string[] = []
  const animationToStyleName = new Map<CaptionAnimation, string>()
  animationToStyleName.set(style.animation, 'Default')

  for (const anim of animationsInUse) {
    if (anim === style.animation) continue

    const matchingOverride = shotOverrides!.find((ov) => ov.style.animation === anim)
    const ovStyle = matchingOverride?.style ?? style
    const ovFontSize = Math.round(ovStyle.fontSize * frameHeight)
    const ovPrimary = hexToASS(ovStyle.primaryColor)
    const ovOutline = hexToASS(ovStyle.outlineColor)
    const ovBack = hexToASS(ovStyle.backColor)
    const styleName = `Shot_${anim}`

    extraStyleLines.push(
      `Style: ${styleName},${ovStyle.fontName},${ovFontSize},${ovPrimary},${ovPrimary},${ovOutline},${ovBack},-1,0,0,0,100,100,0,0,${ovStyle.borderStyle},${ovStyle.outline},${ovStyle.shadow},2,40,40,${marginV},1`
    )
    animationToStyleName.set(anim, styleName)

    if (anim === 'word-box') {
      extraStyleLines.push(
        `Style: WordBox_${anim},${ovStyle.fontName},${ovFontSize},${ovPrimary},${ovPrimary},${ovOutline},&H00000000,-1,0,0,0,100,100,0,0,3,${Math.max(8, Math.round(ovFontSize * 0.18))},0,5,0,0,0,1`
      )
    }
  }

  const header = [
    '[Script Info]',
    'ScriptType: v4.00+',
    `PlayResX: ${frameWidth}`,
    `PlayResY: ${frameHeight}`,
    'WrapStyle: 0',
    'ScaledBorderAndShadow: yes',
    '',
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    `Style: Default,${style.fontName},${fontSize},${primaryASS},${primaryASS},${outlineASS},${backASS},-1,0,0,0,100,100,0,0,${style.borderStyle},${style.outline},${style.shadow},2,40,40,${marginV},1`,
    ...(wordBoxNeeded
      ? [
          `Style: WordBox,${style.fontName},${fontSize},${primaryASS},${primaryASS},${outlineASS},&H00000000,-1,0,0,0,100,100,0,0,3,${Math.max(8, Math.round(fontSize * 0.18))},0,5,0,0,0,1`
        ]
      : []),
    ...extraStyleLines,
    '',
    '[Events]',
    'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text'
  ]

  const groups = groupWords(words, style.wordsPerLine)
  const dialogueLines: string[] = []

  for (const group of groups) {
    if (group.words.length === 0) continue

    let effectiveStyle = style
    let effectiveFontSize = fontSize
    let effectiveStyleName: string | undefined

    if (shotOverrides && shotOverrides.length > 0) {
      const groupMid = (group.start + group.end) / 2
      const matchingOverride = shotOverrides.find(
        (ov) => groupMid >= ov.startTime && groupMid <= ov.endTime
      )
      if (matchingOverride) {
        effectiveStyle = matchingOverride.style
        effectiveFontSize = Math.round(matchingOverride.style.fontSize * frameHeight)
        effectiveStyleName = animationToStyleName.get(matchingOverride.style.animation)
      }
    }

    const lines = buildDialogueLinesForGroup(
      group,
      effectiveStyle,
      effectiveFontSize,
      frameWidth,
      frameHeight,
      marginV,
      effectiveStyleName
    )
    dialogueLines.push(...lines)
  }

  return [...header, ...dialogueLines, ''].join('\n')
}

export function buildDialogueLinesForGroup(
  group: WordGroup,
  effectiveStyle: CaptionStyleInput,
  effectiveFontSize: number,
  frameWidth: number,
  frameHeight: number,
  marginV: number,
  styleName?: string
): string[] {
  const rawLines: string[] = []

  switch (effectiveStyle.animation) {
    case 'captions-ai':
      rawLines.push(...buildCaptionsAILines(group, effectiveStyle, effectiveFontSize))
      break
    case 'karaoke-fill':
      rawLines.push(buildKaraokeLine(group, effectiveStyle, effectiveFontSize))
      break
    case 'word-pop':
      rawLines.push(...buildWordPopLines(group, effectiveStyle, effectiveFontSize))
      break
    case 'fade-in':
      rawLines.push(...buildFadeInLines(group, effectiveStyle, effectiveFontSize))
      break
    case 'glow':
      rawLines.push(...buildGlowLines(group, effectiveStyle, effectiveFontSize))
      break
    case 'word-box':
      rawLines.push(
        ...buildWordBoxLines(group, effectiveStyle, effectiveFontSize, frameWidth, frameHeight, marginV)
      )
      break
    case 'elastic-bounce':
      rawLines.push(...buildElasticBounceLines(group, effectiveStyle, effectiveFontSize))
      break
    case 'typewriter':
      rawLines.push(...buildTypewriterLines(group, effectiveStyle, effectiveFontSize))
      break
    case 'impact-two':
      rawLines.push(...buildImpactTwoLines(group, effectiveStyle, effectiveFontSize))
      break
    case 'cascade':
      rawLines.push(
        ...buildCascadeLines(group, effectiveStyle, effectiveFontSize, frameWidth, frameHeight, marginV)
      )
      break
  }

  if (styleName && styleName !== 'Default') {
    return rawLines.map((line) => {
      let commaCount = 0
      for (let i = 0; i < line.length; i++) {
        if (line[i] === ',') {
          commaCount++
          if (commaCount === 3) {
            const styleStart = i + 1
            const styleEnd = line.indexOf(',', styleStart)
            if (styleEnd !== -1) {
              const originalStyle = line.substring(styleStart, styleEnd)
              if (originalStyle === 'Default') {
                return line.substring(0, styleStart) + styleName + line.substring(styleEnd)
              }
              if (originalStyle === 'WordBox') {
                return line.substring(0, styleStart) + `WordBox_${effectiveStyle.animation}` + line.substring(styleEnd)
              }
            }
            break
          }
        }
      }
      return line
    })
  }

  return rawLines
}
