/**
 * Headline ASS subtitle generator for segment overlays
 *
 * Generates an ASS subtitle string for headline text (hook on segment 0,
 * rehook on later segments). Similar to hook-title.feature.ts but returns
 * the ASS content as a string rather than writing to disk.
 */

export interface HeadlineStyle {
  fontName?: string
  fontSize?: number
  textColor?: string
  outlineColor?: string
  bgColor?: string
  fadeInMs?: number
  fadeOutMs?: number
  alignment?: number
  marginV?: number
  bold?: boolean
}

function cssHexToASS(hex: string): string {
  const h = hex.replace('#', '')
  const r = h.substring(0, 2)
  const g = h.substring(2, 4)
  const b = h.substring(4, 6)
  return `&H00${b}${g}${r}&`
}

function formatASSTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const sInt = Math.floor(s)
  const cs = Math.round((s - sInt) * 100)
  return `${h}:${String(m).padStart(2, '0')}:${String(sInt).padStart(2, '0')}.${String(cs).padStart(2, '0')}`
}

/**
 * Generate an ASS subtitle string for a headline overlay.
 *
 * @param text - The headline text to display
 * @param style - Visual style configuration
 * @param durationSeconds - How long the subtitle should display
 * @param frameWidth - Video frame width
 * @param frameHeight - Video frame height
 * @returns Complete ASS subtitle file content as a string
 */
export function generateHeadlineASS(
  text: string,
  style: HeadlineStyle,
  durationSeconds: number,
  frameWidth: number,
  frameHeight: number
): string {
  const fontName = style.fontName ?? 'Arial'
  const fontSize = style.fontSize ?? 48
  const textColor = cssHexToASS(style.textColor ?? '#FFFFFF')
  const outlineColor = cssHexToASS(style.outlineColor ?? '#000000')
  const bgColor = cssHexToASS(style.bgColor ?? '#000000')
  const fadeIn = style.fadeInMs ?? 200
  const fadeOut = style.fadeOutMs ?? 200
  const alignment = style.alignment ?? 8 // top-center
  const marginV = style.marginV ?? 180
  const bold = style.bold ? -1 : 0
  const outlineSize = Math.round(fontSize * 0.06)
  const shadow = Math.round(fontSize * 0.03)

  const styleLine = `Style: Headline,${fontName},${fontSize},${textColor},${textColor},${outlineColor},${bgColor},${bold},0,0,0,100,100,0,0,1,${outlineSize},${shadow},${alignment},40,40,${marginV},1`

  const dialogueText = `{\\fad(${fadeIn},${fadeOut})}${text}`
  const startTime = formatASSTimestamp(0)
  const endTime = formatASSTimestamp(durationSeconds)

  return [
    '[Script Info]',
    'ScriptType: v4.00+',
    `PlayResX: ${frameWidth}`,
    `PlayResY: ${frameHeight}`,
    'WrapStyle: 0',
    'ScaledBorderAndShadow: yes',
    '',
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    styleLine,
    '',
    '[Events]',
    'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
    `Dialogue: 0,${startTime},${endTime},Headline,,0,0,0,,${dialogueText}`,
    ''
  ].join('\n')
}
