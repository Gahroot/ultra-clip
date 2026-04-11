import type { CaptionAnimation } from '@shared/types'

export type { CaptionAnimation }

export interface CaptionStyleInput {
  fontName: string
  fontSize: number
  primaryColor: string
  highlightColor: string
  outlineColor: string
  backColor: string
  outline: number
  shadow: number
  borderStyle: number
  wordsPerLine: number
  animation: CaptionAnimation
  emphasisColor?: string
  supersizeColor?: string
  emphasisScale?: number
  emphasisFontWeight?: number
  supersizeScale?: number
  supersizeFontWeight?: number
  boxColor?: string
  boxOpacity?: number
  boxPadding?: number
  boxTextColor?: string
  boxFontWeight?: number
}

export interface WordInput {
  text: string
  start: number
  end: number
  emphasis?: 'normal' | 'emphasis' | 'supersize' | 'box'
}

export interface ShotCaptionOverride {
  startTime: number
  endTime: number
  style: CaptionStyleInput
}

export interface WordGroup {
  words: WordInput[]
  start: number
  end: number
  text: string
}

export const DEFAULT_FRAME_WIDTH = 1080
export const DEFAULT_FRAME_HEIGHT = 1920
