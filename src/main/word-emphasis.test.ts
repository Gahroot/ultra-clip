import { describe, it, expect } from 'vitest'
import { analyzeEmphasisHeuristic, type EmphasizedWord } from './word-emphasis'
import type { WordTimestamp } from '@shared/types'

/** Helper to build a word array from text with auto-generated timestamps. */
function makeWords(texts: string[]): WordTimestamp[] {
  return texts.map((text, i) => ({
    text,
    start: i * 0.5,
    end: i * 0.5 + 0.4
  }))
}

function countByLevel(words: EmphasizedWord[], level: 'normal' | 'emphasis' | 'supersize'): number {
  return words.filter((w) => w.emphasis === level).length
}

describe('analyzeEmphasisHeuristic', () => {
  it('returns empty for empty input', () => {
    expect(analyzeEmphasisHeuristic([])).toEqual([])
  })

  it('returns emphasis for single word', () => {
    const result = analyzeEmphasisHeuristic(makeWords(['hello']))
    expect(result).toHaveLength(1)
    expect(result[0].emphasis).toBe('emphasis')
  })

  it('marks power words as emphasis', () => {
    const words = makeWords(['the', 'secret', 'to', 'making', 'money'])
    const result = analyzeEmphasisHeuristic(words)
    const secret = result.find((w) => w.text === 'secret')
    const money = result.find((w) => w.text === 'money')
    expect(secret?.emphasis).not.toBe('normal')
    expect(money?.emphasis).not.toBe('normal')
  })

  it('does not mark stop words as emphasis', () => {
    const words = makeWords(['the', 'cat', 'is', 'on', 'the', 'mat.'])
    const result = analyzeEmphasisHeuristic(words)
    const stopWords = result.filter((w) => ['the', 'is', 'on'].includes(w.text))
    for (const sw of stopWords) {
      expect(sw.emphasis).toBe('normal')
    }
  })

  it('marks ALL-CAPS words as emphasis', () => {
    const words = makeWords(['this', 'is', 'HUGE', 'news.'])
    const result = analyzeEmphasisHeuristic(words)
    const huge = result.find((w) => w.text === 'HUGE')
    expect(huge?.emphasis).not.toBe('normal')
  })

  it('marks numeric words as emphasis or supersize', () => {
    const words = makeWords(['they', 'made', '$50', 'million', 'dollars.'])
    const result = analyzeEmphasisHeuristic(words)
    const fifty = result.find((w) => w.text === '$50')
    expect(fifty?.emphasis).not.toBe('normal')
  })

  it('picks supersize candidates per sentence', () => {
    // Two sentences — should have at most 2 supersize words
    const words = makeWords([
      'the', 'first', 'secret', 'is', 'revealed.', // sentence 1
      'nobody', 'can', 'stop', 'this.', // sentence 2
    ])
    const result = analyzeEmphasisHeuristic(words)
    const supersized = result.filter((w) => w.emphasis === 'supersize')
    expect(supersized.length).toBeGreaterThanOrEqual(1)
    expect(supersized.length).toBeLessThanOrEqual(2)
  })

  it('keeps supersize rate between 0-8%', () => {
    // Generate many sentences to test rate limiting
    const texts: string[] = []
    for (let i = 0; i < 100; i++) {
      texts.push('this', 'is', 'amazing', 'content', 'for', 'testing.') // 6 words per sentence
    }
    const words = makeWords(texts)
    const result = analyzeEmphasisHeuristic(words)
    const supersizeCount = countByLevel(result, 'supersize')
    const pct = (supersizeCount / result.length) * 100
    expect(pct).toBeLessThanOrEqual(8.5) // small rounding tolerance
  })

  it('keeps emphasis rate at or below 25%', () => {
    // Lots of power words to stress-test rate limiting
    const powerWords = ['secret', 'amazing', 'incredible', 'shocking', 'money', 'viral', 'insane', 'massive']
    const texts: string[] = []
    for (let i = 0; i < 50; i++) {
      texts.push(powerWords[i % powerWords.length])
    }
    const words = makeWords(texts)
    const result = analyzeEmphasisHeuristic(words)
    const emphasisCount = countByLevel(result, 'emphasis')
    const pct = (emphasisCount / result.length) * 100
    expect(pct).toBeLessThanOrEqual(26) // small rounding tolerance
  })

  it('supersize does not overlap with emphasis', () => {
    const words = makeWords(['the', 'biggest', 'secret', 'ever', 'revealed.', 'this', 'is', 'impossible.'])
    const result = analyzeEmphasisHeuristic(words)
    for (const w of result) {
      if (w.emphasis === 'supersize') {
        // This word should not also be counted as emphasis
        const emphasisOnly = result.filter((r) => r.text === w.text && r.emphasis === 'emphasis')
        expect(emphasisOnly).toHaveLength(0)
      }
    }
  })

  it('detects sentence boundaries from time gaps', () => {
    const words: WordTimestamp[] = [
      { text: 'hello', start: 0, end: 0.3 },
      { text: 'world', start: 0.4, end: 0.7 },
      // Big gap here (> 0.7s) — new sentence
      { text: 'amazing', start: 2.0, end: 2.3 },
      { text: 'stuff', start: 2.4, end: 2.7 },
    ]
    const result = analyzeEmphasisHeuristic(words)
    // 'amazing' is a power word — should be emphasis or supersize
    const amazing = result.find((w) => w.text === 'amazing')
    expect(amazing?.emphasis).not.toBe('normal')
  })

  it('preserves word text, start, and end times', () => {
    const words: WordTimestamp[] = [
      { text: 'test', start: 1.5, end: 2.0 },
      { text: 'word', start: 2.1, end: 2.5 }
    ]
    const result = analyzeEmphasisHeuristic(words)
    expect(result[0].text).toBe('test')
    expect(result[0].start).toBe(1.5)
    expect(result[0].end).toBe(2.0)
    expect(result[1].text).toBe('word')
    expect(result[1].start).toBe(2.1)
    expect(result[1].end).toBe(2.5)
  })
})
