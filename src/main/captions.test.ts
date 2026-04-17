import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Mock } from 'vitest'

vi.mock('fs/promises', () => ({
  writeFile: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined)
}))

import { generateCaptions } from './captions'
import type { CaptionStyleInput, WordInput } from './captions'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeStyle(overrides: Partial<CaptionStyleInput> = {}): CaptionStyleInput {
  return {
    fontName: 'Arial',
    fontSize: 0.07,
    primaryColor: '#FFFFFF',
    highlightColor: '#00FF00',
    outlineColor: '#000000',
    backColor: '#80000000',
    outline: 2,
    shadow: 1,
    borderStyle: 1,
    wordsPerLine: 3,
    animation: 'karaoke-fill',
    ...overrides
  }
}

function makeWords(): WordInput[] {
  return [
    { text: 'Hello', start: 0.0, end: 0.5 },
    { text: 'world', start: 0.5, end: 1.0 },
    { text: 'this', start: 1.0, end: 1.3 },
    { text: 'is', start: 1.3, end: 1.5 },
    { text: 'a', start: 1.5, end: 1.6 },
    { text: 'test.', start: 1.6, end: 2.0 }
  ]
}

async function capturedContent(words: WordInput[], style: CaptionStyleInput): Promise<string> {
  const { writeFile } = await import('fs/promises')
  const mock = writeFile as Mock
  mock.mockClear()
  await generateCaptions(words, style)
  return mock.mock.calls[0][1] as string
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('generateCaptions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('throws when words array is empty', async () => {
    await expect(generateCaptions([], makeStyle())).rejects.toThrow('No words provided')
  })

  it('returns the output path after writing', async () => {
    const result = await generateCaptions(makeWords(), makeStyle(), '/tmp/test.ass')
    expect(result).toBe('/tmp/test.ass')
  })

  it('uses a temp path when outputPath is omitted', async () => {
    const result = await generateCaptions(makeWords(), makeStyle())
    expect(result).toMatch(/batchcontent-captions-\d+\.ass$/)
  })

  it('writes valid ASS header', async () => {
    const content = await capturedContent(makeWords(), makeStyle())
    expect(content).toContain('[Script Info]')
    expect(content).toContain('[V4+ Styles]')
    expect(content).toContain('[Events]')
    expect(content).toContain('PlayResX: 1080')
    expect(content).toContain('PlayResY: 1920')
  })

  describe('hex color conversion', () => {
    it('converts 6-char hex to ASS &HAABBGGRR format', async () => {
      // primaryColor '#FFFFFF' → &H00FFFFFF
      const content = await capturedContent(makeWords(), makeStyle({ primaryColor: '#FFFFFF' }))
      expect(content).toContain('&H00FFFFFF')
    })

    it('converts 6-char hex with channel swap (blue/red)', async () => {
      // '#FF0000' (red) → BGR: 00 00 00 FF → &H000000FF
      const content = await capturedContent(makeWords(), makeStyle({ primaryColor: '#FF0000' }))
      expect(content).toContain('&H000000FF')
    })

    it('converts 8-char hex with alpha', async () => {
      // '#80000000' → a=0x80, r=0, g=0, b=0 → &H80000000
      const content = await capturedContent(makeWords(), makeStyle({ backColor: '#80000000' }))
      expect(content).toContain('&H80000000')
    })
  })

  describe('ASS time formatting', () => {
    it('formats zero seconds correctly', async () => {
      const content = await capturedContent(makeWords(), makeStyle())
      // 0 seconds → 0:00:00.00
      expect(content).toContain('0:00:00.00')
    })

    it('formats sub-second timestamps', async () => {
      const words: WordInput[] = [
        { text: 'Hello', start: 65.5, end: 66.0 }
      ]
      const content = await capturedContent(words, makeStyle())
      // 65.5s → 0:01:05.50
      expect(content).toContain('0:01:05.50')
    })
  })

  describe('word grouping', () => {
    it('groups words by wordsPerLine', async () => {
      const words = makeWords() // 6 words, wordsPerLine=3 → 2 groups
      const content = await capturedContent(words, makeStyle({ wordsPerLine: 3 }))
      const dialogueLines = content.split('\n').filter((l) => l.startsWith('Dialogue:'))
      // karaoke-fill: one Dialogue per group
      expect(dialogueLines).toHaveLength(2)
    })

    it('handles wordsPerLine=1 (one word per group)', async () => {
      const words: WordInput[] = [
        { text: 'A', start: 0, end: 0.5 },
        { text: 'B', start: 0.5, end: 1.0 }
      ]
      const content = await capturedContent(words, makeStyle({ wordsPerLine: 1, animation: 'karaoke-fill' }))
      const dialogueLines = content.split('\n').filter((l) => l.startsWith('Dialogue:'))
      expect(dialogueLines).toHaveLength(2)
    })
  })

  describe('animation: karaoke-fill', () => {
    it('uses \\kf karaoke tags', async () => {
      const content = await capturedContent(makeWords(), makeStyle({ animation: 'karaoke-fill' }))
      expect(content).toContain('\\kf')
    })

    it('includes the highlight color override', async () => {
      // highlightColor '#00FF00' → &H0000FF00 (green in BGR: 00FF00 → &H0000FF00)
      const content = await capturedContent(makeWords(), makeStyle({
        animation: 'karaoke-fill',
        highlightColor: '#00FF00'
      }))
      expect(content).toContain('\\1c&H0000FF00')
    })
  })

  describe('animation: word-pop', () => {
    it('uses alpha transparency tags', async () => {
      const content = await capturedContent(makeWords(), makeStyle({ animation: 'word-pop' }))
      expect(content).toContain('\\alpha&HFF&')
      expect(content).toContain('\\alpha&H00&')
    })

    it('uses fscx/fscy scale animation', async () => {
      const content = await capturedContent(makeWords(), makeStyle({ animation: 'word-pop' }))
      expect(content).toContain('\\fscx110')
      expect(content).toContain('\\fscy110')
    })
  })

  describe('animation: fade-in', () => {
    it('uses alpha transparency with timed transition', async () => {
      const content = await capturedContent(makeWords(), makeStyle({ animation: 'fade-in' }))
      expect(content).toContain('\\alpha&HFF&')
      expect(content).toContain('\\t(')
    })

    it('does not use scale transforms', async () => {
      const content = await capturedContent(makeWords(), makeStyle({ animation: 'fade-in' }))
      expect(content).not.toContain('\\fscx')
    })
  })

  describe('animation: glow', () => {
    it('uses \\3c border color override', async () => {
      const content = await capturedContent(makeWords(), makeStyle({ animation: 'glow' }))
      expect(content).toContain('\\3c')
    })

    it('uses bord to increase outline size during active word', async () => {
      const content = await capturedContent(makeWords(), makeStyle({ animation: 'glow', outline: 2 }))
      // bord should be outline+2 = 4
      expect(content).toContain('\\bord4')
    })
  })

  describe('word emphasis styling', () => {
    function makeEmphasisWords(): WordInput[] {
      return [
        { text: 'This', start: 0.0, end: 0.3, emphasis: 'normal' },
        { text: 'is', start: 0.3, end: 0.5, emphasis: 'normal' },
        { text: 'INCREDIBLE', start: 0.5, end: 1.0, emphasis: 'emphasis' },
        { text: 'and', start: 1.0, end: 1.2, emphasis: 'normal' },
        { text: 'MILLIONS', start: 1.2, end: 1.8, emphasis: 'supersize' },
        { text: 'agree.', start: 1.8, end: 2.2, emphasis: 'normal' }
      ]
    }

    it('applies \\fs override to emphasis words (larger than base)', async () => {
      // base fontSize = 0.07 * 1920 = 134, emphasis ≈ 134 * 1.18 = 158
      const content = await capturedContent(
        makeEmphasisWords(),
        makeStyle({ animation: 'karaoke-fill', wordsPerLine: 6 })
      )
      expect(content).toContain('\\fs158')
    })

    it('applies \\fs override to supersize words (much larger than base)', async () => {
      // base fontSize = 0.07 * 1920 = 134, supersize ≈ 134 * 1.47 = 197
      const content = await capturedContent(
        makeEmphasisWords(),
        makeStyle({ animation: 'karaoke-fill', wordsPerLine: 6 })
      )
      expect(content).toContain('\\fs197')
    })

    it('applies emphasis color to emphasis words', async () => {
      const content = await capturedContent(
        makeEmphasisWords(),
        makeStyle({ animation: 'karaoke-fill', wordsPerLine: 6, emphasisColor: '#FF0000' })
      )
      // '#FF0000' → ASS &H000000FF (BGR swap)
      expect(content).toContain('\\1c&H000000FF')
    })

    it('applies supersize color to supersize words', async () => {
      const content = await capturedContent(
        makeEmphasisWords(),
        makeStyle({ animation: 'karaoke-fill', wordsPerLine: 6, supersizeColor: '#FFD700' })
      )
      // '#FFD700' → ASS &H0000D7FF (BGR: 00, D7, FF → blue=00, green=D7, red=FF)
      expect(content).toContain('\\1c&H0000D7FF')
    })

    it('applies \\b1 (bold) to supersize words', async () => {
      const content = await capturedContent(
        makeEmphasisWords(),
        makeStyle({ animation: 'karaoke-fill', wordsPerLine: 6 })
      )
      expect(content).toContain('\\b1')
    })

    it('applies \\r reset tags after emphasis words', async () => {
      const content = await capturedContent(
        makeEmphasisWords(),
        makeStyle({ animation: 'karaoke-fill', wordsPerLine: 6 })
      )
      expect(content).toContain('\\r')
    })

    it('does not apply overrides to normal words', async () => {
      const words: WordInput[] = [
        { text: 'Hello', start: 0.0, end: 0.5, emphasis: 'normal' },
        { text: 'world', start: 0.5, end: 1.0, emphasis: 'normal' }
      ]
      const content = await capturedContent(
        words,
        makeStyle({ animation: 'karaoke-fill', wordsPerLine: 2 })
      )
      // Normal words should not have \fs overrides or \r resets
      expect(content).not.toContain('\\fs')
      expect(content).not.toContain('\\r')
    })

    it('defaults to highlightColor when emphasisColor is not set', async () => {
      const words: WordInput[] = [
        { text: 'BIG', start: 0.0, end: 0.5, emphasis: 'emphasis' }
      ]
      const content = await capturedContent(
        words,
        makeStyle({ animation: 'karaoke-fill', highlightColor: '#00FF00' })
      )
      // highlightColor '#00FF00' → ASS &H0000FF00
      expect(content).toContain('\\1c&H0000FF00')
    })

    it('defaults to gold (#FFD700) when supersizeColor is not set', async () => {
      const words: WordInput[] = [
        { text: 'HUGE', start: 0.0, end: 0.5, emphasis: 'supersize' }
      ]
      const content = await capturedContent(
        words,
        makeStyle({ animation: 'fade-in' })
      )
      // '#FFD700' → ASS &H0000D7FF
      expect(content).toContain('\\1c&H0000D7FF')
    })

    it('works with word-pop animation — emphasis gets bigger pop scale', async () => {
      const words: WordInput[] = [
        { text: 'normal', start: 0.0, end: 0.5, emphasis: 'normal' },
        { text: 'EMPHASIS', start: 0.5, end: 1.0, emphasis: 'emphasis' },
        { text: 'SUPER', start: 1.0, end: 1.5, emphasis: 'supersize' }
      ]
      const content = await capturedContent(
        words,
        makeStyle({ animation: 'word-pop', wordsPerLine: 3 })
      )
      // Normal pops at 110, emphasis at 120, supersize at 130
      expect(content).toContain('\\fscx110')
      expect(content).toContain('\\fscx120')
      expect(content).toContain('\\fscx130')
    })

    it('works with glow animation — emphasis gets thicker glow', async () => {
      const words: WordInput[] = [
        { text: 'normal', start: 0.0, end: 0.5, emphasis: 'normal' },
        { text: 'EMPHASIS', start: 0.5, end: 1.0, emphasis: 'emphasis' },
        { text: 'SUPER', start: 1.0, end: 1.5, emphasis: 'supersize' }
      ]
      const content = await capturedContent(
        words,
        makeStyle({ animation: 'glow', outline: 2, wordsPerLine: 3 })
      )
      // normal: bord4 (2+2), emphasis: bord5 (2+3), supersize: bord7 (2+5)
      expect(content).toContain('\\bord4')
      expect(content).toContain('\\bord5')
      expect(content).toContain('\\bord7')
    })

    it('treats missing emphasis field as normal', async () => {
      const words: WordInput[] = [
        { text: 'Hello', start: 0.0, end: 0.5 } // no emphasis field
      ]
      const content = await capturedContent(
        words,
        makeStyle({ animation: 'fade-in' })
      )
      // Should not contain emphasis-related overrides
      expect(content).not.toContain('\\fs')
      expect(content).not.toContain('\\r')
    })
  })
})
