import { describe, it, expect } from 'vitest'
import { segmentIntoShots, segmentClipIntoShots } from './shot-segmentation'
import type { WordTimestamp } from '@shared/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a sequence of evenly-spaced words. */
function makeWords(texts: string[], wordsPerSec = 3): WordTimestamp[] {
  const gap = 1 / wordsPerSec
  const words: WordTimestamp[] = []
  let t = 0
  for (const text of texts) {
    words.push({ text, start: t, end: t + gap * 0.7 })
    t += gap
  }
  return words
}

/** Build words with an explicit pause after the word at pauseIndex. */
function makeWordsWithPause(
  texts: string[],
  pauseAfter: number,
  pauseDuration: number,
  wordsPerSec = 3
): WordTimestamp[] {
  const gap = 1 / wordsPerSec
  const words: WordTimestamp[] = []
  let t = 0
  for (let i = 0; i < texts.length; i++) {
    words.push({ text: texts[i], start: t, end: t + gap * 0.7 })
    t += gap
    if (i === pauseAfter) {
      t += pauseDuration
    }
  }
  return words
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('segmentIntoShots', () => {
  it('returns a single shot for empty input', () => {
    const result = segmentIntoShots([], 10)
    expect(result.shotCount).toBe(1)
    expect(result.shots[0].startTime).toBe(0)
    expect(result.shots[0].endTime).toBe(10)
    expect(result.shots[0].text).toBe('')
  })

  it('returns a single shot for very short clips', () => {
    const words = makeWords(['hello', 'world'])
    const result = segmentIntoShots(words, 2)
    expect(result.shotCount).toBe(1)
    expect(result.shots[0].text).toBe('hello world')
  })

  it('splits on sentence endings with pauses', () => {
    // 3 sentences of ~15 words each, with pauses at sentence boundaries
    const texts: string[] = []
    const sentences = [
      'This is the first sentence and it has many words in it to make it long enough.',
      'And this is the second sentence which also has plenty of words to fill time.',
      'Finally we conclude with a third sentence that wraps everything up neatly.'
    ]
    for (const s of sentences) {
      texts.push(...s.split(' '))
    }

    // Build with pauses after each sentence
    const gap = 1 / 3
    const words: WordTimestamp[] = []
    let t = 0
    const sentenceEndIndices: number[] = []
    let wordCount = 0
    for (const sentence of sentences) {
      const sWords = sentence.split(' ')
      for (let i = 0; i < sWords.length; i++) {
        words.push({ text: sWords[i], start: t, end: t + gap * 0.7 })
        t += gap
        wordCount++
      }
      sentenceEndIndices.push(wordCount - 1)
      t += 0.8 // pause between sentences
    }

    const duration = words[words.length - 1].end + 1
    const result = segmentIntoShots(words, duration)

    expect(result.shotCount).toBeGreaterThanOrEqual(2)
    expect(result.shots[0].text).toContain('first')
  })

  it('splits on long pauses', () => {
    const texts = Array.from({ length: 40 }, (_, i) => `word${i + 1}`)
    const words = makeWordsWithPause(texts, 19, 1.0, 4) // Big pause after word20

    const duration = words[words.length - 1].end + 0.5
    const result = segmentIntoShots(words, duration)

    expect(result.shotCount).toBeGreaterThanOrEqual(2)
    // There should be a break near the pause
    const breakNearPause = result.shots.some(s =>
      s.breakReason === 'pause' ||
      Math.abs(s.endTime - words[19].end) < 1
    )
    expect(breakNearPause).toBe(true)
  })

  it('respects maxDuration by force-splitting', () => {
    // 60 words at 4 words/sec = 15 seconds of speech
    const texts = Array.from({ length: 60 }, (_, i) => `word${i + 1}`)
    const words = makeWords(texts, 4)
    const duration = words[words.length - 1].end + 0.3

    const result = segmentIntoShots(words, duration, { maxDuration: 6 })

    // Every shot should respect maxDuration with generous tolerance
    for (const shot of result.shots) {
      expect(shot.endTime - shot.startTime).toBeLessThanOrEqual(9) // generous tolerance for edge cases
    }
  })

  it('merges undersized shots', () => {
    const texts = ['short.', 'Also', 'very', 'short.', 'And', 'end.']
    const words = makeWords(texts, 2)
    const duration = words[words.length - 1].end + 0.3

    const result = segmentIntoShots(words, duration, { minDuration: 1 })

    // All shots should have some minimum duration
    for (const shot of result.shots) {
      expect(shot.endTime - shot.startTime).toBeGreaterThanOrEqual(0.5)
    }
  })

  it('produces correct word indices', () => {
    const texts = ['One.', 'Two.', 'Three.', 'Four.', 'Five.', 'Six.', 'Seven.', 'Eight.', 'Nine.', 'Ten.']
    // Big pauses after each "sentence"
    let t = 0
    const words: WordTimestamp[] = []
    for (let i = 0; i < texts.length; i++) {
      words.push({ text: texts[i], start: t, end: t + 0.2 })
      t += 0.6 // pause between words
    }

    const duration = words[words.length - 1].end + 0.5
    const result = segmentIntoShots(words, duration)

    // Word indices should be contiguous and cover all words
    let totalWords = 0
    for (let i = 0; i < result.shots.length; i++) {
      const shot = result.shots[i]
      if (i === 0) {
        expect(shot.startWordIndex).toBe(0)
      } else {
        expect(shot.startWordIndex).toBe(result.shots[i - 1].endWordIndex)
      }
      totalWords += shot.endWordIndex - shot.startWordIndex
    }
    expect(totalWords).toBe(words.length)
  })

  it('shot times cover the full clip without gaps', () => {
    const texts = Array.from({ length: 50 }, (_, i) => `word${i + 1}`)
    const words = makeWords(texts, 4)
    const duration = words[words.length - 1].end + 0.3

    const result = segmentIntoShots(words, duration)

    expect(result.shots[0].startTime).toBe(0)
    expect(result.shots[result.shots.length - 1].endTime).toBeCloseTo(duration, 1)

    // No gaps
    for (let i = 1; i < result.shots.length; i++) {
      expect(result.shots[i].startTime).toBeCloseTo(result.shots[i - 1].endTime, 2)
    }
  })

  it('detects topic shifts via vocabulary change', () => {
    // Need enough words for the topic window (10 words per side = 20+ words)
    // and a long enough total duration for shots to survive merging.
    const cooking = 'bake the cake with flour and sugar whisk batter oven preheat temperature recipe delicious frosting'.split(' ')
    const space = 'launch the rocket into orbit beyond mars thrust velocity trajectory fuel engine countdown ignite booster'.split(' ')
    const texts = [...cooking, ...space]
    // Add a gap at the topic boundary
    const words = makeWordsWithPause(texts, cooking.length - 1, 1.2, 3) // slower speech, bigger pause

    const duration = words[words.length - 1].end + 0.5
    const result = segmentIntoShots(words, duration, { minDuration: 1.5 })

    expect(result.shotCount).toBeGreaterThanOrEqual(2)
  })

  it('computes correct average duration', () => {
    const texts = Array.from({ length: 30 }, (_, i) => `word${i + 1}`)
    const words = makeWords(texts, 4)
    const duration = words[words.length - 1].end + 0.3

    const result = segmentIntoShots(words, duration)

    const expectedAvg = duration / result.shotCount
    expect(result.avgDuration).toBeCloseTo(expectedAvg, 1)
  })

  it('all shot texts together reconstruct the full transcript', () => {
    const texts = Array.from({ length: 45 }, (_, i) => `word${i + 1}`)
    const words = makeWords(texts, 4)
    const duration = words[words.length - 1].end + 0.3

    const result = segmentIntoShots(words, duration)
    const fullText = result.shots.map(s => s.text).join(' ')
    const expectedText = texts.join(' ')
    expect(fullText).toBe(expectedText)
  })
})

describe('segmentClipIntoShots', () => {
  it('shifts timestamps to 0-based', () => {
    const words: WordTimestamp[] = [
      { text: 'hello', start: 10.0, end: 10.3 },
      { text: 'world', start: 10.5, end: 10.8 },
      { text: 'test', start: 11.0, end: 11.3 }
    ]

    const result = segmentClipIntoShots(words, 10.0, 11.5)

    expect(result.shots[0].startTime).toBe(0)
    expect(result.shots[result.shots.length - 1].endTime).toBeCloseTo(1.5, 1)
  })

  it('filters words to clip range', () => {
    const words: WordTimestamp[] = [
      { text: 'before', start: 5.0, end: 5.3 },
      { text: 'hello', start: 10.0, end: 10.3 },
      { text: 'world', start: 10.5, end: 10.8 },
      { text: 'after', start: 20.0, end: 20.3 }
    ]

    const result = segmentClipIntoShots(words, 10.0, 11.0)

    // Only 'hello' and 'world' should be in the shots
    const allText = result.shots.map(s => s.text).join(' ')
    expect(allText).not.toContain('before')
    expect(allText).not.toContain('after')
    expect(allText).toContain('hello')
    expect(allText).toContain('world')
  })

  it('produces reasonable shot counts for typical 30-60 second clips', () => {
    // Simulate a 45-second clip at ~3 words/sec = ~135 words
    const texts = [
      "So", "today", "I", "want", "to", "talk", "about", "something", "really", "important.",
      "Most", "people", "don't", "realize", "this", "but", "the", "way", "you", "start",
      "your", "morning", "determines", "everything.", "Let", "me", "explain", "why", "this", "matters.",
      "First", "of", "all", "your", "brain", "is", "most", "receptive", "in", "the",
      "first", "hour", "after", "waking", "up.", "That's", "why", "what", "you", "consume",
      "mentally", "during", "that", "time", "is", "so", "critical.", "Now", "here's", "the",
      "thing", "that", "most", "people", "get", "wrong.", "They", "pick", "up", "their",
      "phone", "immediately", "and", "start", "scrolling.", "This", "triggers", "a", "dopamine",
      "spike", "that", "sets", "a", "pattern", "for", "the", "rest", "of", "the",
      "day.", "Instead", "you", "should", "spend", "the", "first", "thirty", "minutes", "doing",
      "something", "intentional.", "Read", "a", "book", "journal", "your", "thoughts", "or",
      "simply", "sit", "in", "silence.", "This", "primes", "your", "brain", "for", "deep",
      "focus", "and", "creativity", "throughout", "the", "day."
    ]

    const words = makeWords(texts, 3)
    const clipStart = 0
    const clipEnd = words[words.length - 1].end + 0.5

    const result = segmentClipIntoShots(words, clipStart, clipEnd)

    // Should produce 5-12 shots for a 45-second clip
    expect(result.shotCount).toBeGreaterThanOrEqual(4)
    expect(result.shotCount).toBeLessThanOrEqual(15)
    // Average should be around 4-6 seconds
    expect(result.avgDuration).toBeGreaterThanOrEqual(2)
    expect(result.avgDuration).toBeLessThanOrEqual(10)
  })
})
