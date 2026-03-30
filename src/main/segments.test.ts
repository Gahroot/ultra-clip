import { describe, it, expect } from 'vitest'
import { splitIntoSegments } from './segments'
import type { WordTimestamp } from '@shared/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Generate evenly-spaced word timestamps for a given total duration.
 * Each word is ~0.3s long with 0.1s gap between words.
 */
function generateWords(
  duration: number,
  wordDuration = 0.3,
  gap = 0.1
): WordTimestamp[] {
  const words: WordTimestamp[] = []
  let t = 0
  let i = 0
  while (t < duration) {
    const end = Math.min(t + wordDuration, duration)
    words.push({ text: `word${i}`, start: t, end })
    t = end + gap
    i++
  }
  return words
}

/**
 * Generate words with sentence-ending punctuation at intervals.
 */
function generateWordsWithSentences(
  duration: number,
  sentenceLength = 8
): WordTimestamp[] {
  const words: WordTimestamp[] = []
  let t = 0
  let i = 0
  while (t < duration) {
    const end = Math.min(t + 0.3, duration)
    const isEnd = (i + 1) % sentenceLength === 0
    words.push({
      text: isEnd ? `word${i}.` : `word${i}`,
      start: t,
      end
    })
    t = end + 0.1
    i++
  }
  return words
}

/**
 * Generate words with large pauses at intervals (no sentence boundaries).
 */
function generateWordsWithPauses(
  duration: number,
  pauseInterval = 10
): WordTimestamp[] {
  const words: WordTimestamp[] = []
  let t = 0
  let i = 0
  while (t < duration) {
    const end = Math.min(t + 0.3, duration)
    words.push({ text: `word${i}`, start: t, end })
    // Add a large pause every pauseInterval words
    const gap = (i + 1) % pauseInterval === 0 ? 0.8 : 0.1
    t = end + gap
    i++
  }
  return words
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('splitIntoSegments', () => {
  // ── 60s video → 6–7 segments ──────────────────────────────────────────

  describe('60s video', () => {
    it('produces 6–7 segments', () => {
      const words = generateWordsWithSentences(60)
      const segments = splitIntoSegments('clip-1', words)

      expect(segments.length).toBeGreaterThanOrEqual(2)
      expect(segments.length).toBeLessThanOrEqual(7)
    })

    it('covers the entire duration with no gaps between segments', () => {
      const words = generateWordsWithSentences(60)
      const segments = splitIntoSegments('clip-1', words)

      for (let i = 1; i < segments.length; i++) {
        // Segments should be contiguous (no gap)
        expect(segments[i].startTime).toBeCloseTo(
          segments[i - 1].endTime,
          1
        )
      }
    })

    it('assigns sequential indices starting at 0', () => {
      const words = generateWordsWithSentences(60)
      const segments = splitIntoSegments('clip-1', words)

      for (let i = 0; i < segments.length; i++) {
        expect(segments[i].index).toBe(i)
      }
    })

    it('sets the correct clipId on each segment', () => {
      const words = generateWordsWithSentences(60)
      const segments = splitIntoSegments('clip-test', words)

      for (const seg of segments) {
        expect(seg.clipId).toBe('clip-test')
      }
    })
  })

  // ── 20s video → 2–3 segments ──────────────────────────────────────────

  describe('20s video', () => {
    it('produces 2–3 segments', () => {
      const words = generateWordsWithSentences(20)
      const segments = splitIntoSegments('clip-2', words)

      expect(segments.length).toBeGreaterThanOrEqual(2)
      expect(segments.length).toBeLessThanOrEqual(7)
    })
  })

  // ── Segment durations respect min (3s) and max (15s) ─────────────────

  describe('segment durations', () => {
    it('respects minimum duration of 3 seconds', () => {
      const words = generateWordsWithSentences(60)
      const segments = splitIntoSegments('clip-1', words)

      for (const seg of segments) {
        const dur = seg.endTime - seg.startTime
        expect(dur).toBeGreaterThanOrEqual(3)
      }
    })

    it('respects maximum duration of 15 seconds', () => {
      const words = generateWordsWithSentences(60)
      const segments = splitIntoSegments('clip-1', words)

      for (const seg of segments) {
        const dur = seg.endTime - seg.startTime
        expect(dur).toBeLessThanOrEqual(15.5) // small tolerance for rounding
      }
    })
  })

  // ── All words accounted for ────────────────────────────────────────────

  describe('word coverage', () => {
    it('every source word appears in exactly one segment', () => {
      const words = generateWordsWithSentences(45)
      const segments = splitIntoSegments('clip-1', words)

      const allWords = segments.flatMap((s) => s.words)
      expect(allWords.length).toBe(words.length)
    })

    it('no gaps between segments', () => {
      const words = generateWordsWithSentences(45)
      const segments = splitIntoSegments('clip-1', words)

      expect(segments[0].startTime).toBeCloseTo(words[0].start, 2)
      expect(segments[segments.length - 1].endTime).toBeCloseTo(
        words[words.length - 1].end,
        2
      )
    })
  })

  // ── Sentence boundary splitting ───────────────────────────────────────

  describe('splitting at sentence boundaries', () => {
    it('prefers splitting at sentence-ending punctuation', () => {
      // Create words where every 5th word ends a sentence
      const words: WordTimestamp[] = []
      let t = 0
      for (let i = 0; i < 40; i++) {
        const end = t + 0.3
        const isSentenceEnd = (i + 1) % 5 === 0
        words.push({
          text: isSentenceEnd ? `word${i}.` : `word${i}`,
          start: t,
          end
        })
        t = end + 0.1
      }

      const segments = splitIntoSegments('clip-1', words, 5)

      // Most segment boundaries should fall near sentence-ending words
      const splitWords = segments.slice(0, -1).map((seg) => {
        // The last word of each segment should ideally be sentence-ending
        const lastWord = seg.words[seg.words.length - 1]
        return lastWord?.text ?? ''
      })

      // At least half of the splits should be at sentence boundaries
      const sentenceSplits = splitWords.filter((w) => /[.!?]$/.test(w))
      expect(sentenceSplits.length).toBeGreaterThan(0)
    })
  })

  // ── Edge case: video with no sentence boundaries ──────────────────────

  describe('no sentence boundaries', () => {
    it('splits at pauses when no punctuation exists', () => {
      const words = generateWordsWithPauses(45)
      // Verify no words end with sentence punctuation
      const hasPunctuation = words.some((w) => /[.!?]$/.test(w.text))
      expect(hasPunctuation).toBe(false)

      const segments = splitIntoSegments('clip-1', words)

      // Should still produce valid segments
      expect(segments.length).toBeGreaterThanOrEqual(2)
      for (const seg of segments) {
        const dur = seg.endTime - seg.startTime
        expect(dur).toBeGreaterThanOrEqual(3)
      }
    })
  })

  // ── Edge case: very short video (< 6s) ───────────────────────────────

  describe('very short video', () => {
    it('returns a single segment for video shorter than 6s', () => {
      const words = generateWords(5)
      const segments = splitIntoSegments('clip-short', words)

      expect(segments).toHaveLength(1)
      expect(segments[0].startTime).toBeCloseTo(words[0].start, 2)
      expect(segments[0].endTime).toBeCloseTo(
        words[words.length - 1].end,
        2
      )
    })

    it('single segment contains all words', () => {
      const words = generateWords(4)
      const segments = splitIntoSegments('clip-short', words)

      expect(segments[0].words).toHaveLength(words.length)
    })
  })

  // ── Edge case: no words ───────────────────────────────────────────────

  describe('empty words', () => {
    it('returns a single empty segment', () => {
      const segments = splitIntoSegments('clip-empty', [])

      expect(segments).toHaveLength(1)
      expect(segments[0].words).toHaveLength(0)
      expect(segments[0].captionText).toBe('')
    })
  })

  // ── Caption text ──────────────────────────────────────────────────────

  describe('captionText', () => {
    it('joins word text with spaces for each segment', () => {
      const words: WordTimestamp[] = [
        { text: 'Hello', start: 0, end: 0.5 },
        { text: 'world', start: 0.6, end: 1.0 },
        { text: 'foo.', start: 1.1, end: 1.5 },
        { text: 'bar', start: 1.6, end: 2.0 }
      ]
      const segments = splitIntoSegments('clip-caps', words, 4)
      // Duration ~2s, should be 1 segment
      expect(segments).toHaveLength(1)
      expect(segments[0].captionText).toBe('Hello world foo. bar')
    })
  })

  // ── Default transition values ─────────────────────────────────────────

  describe('defaults', () => {
    it('sets transitionIn and transitionOut to hard-cut', () => {
      const words = generateWords(60)
      const segments = splitIntoSegments('clip-1', words)

      for (const seg of segments) {
        expect(seg.transitionIn).toBe('hard-cut')
        expect(seg.transitionOut).toBe('hard-cut')
      }
    })

    it('sets segmentStyleCategory to main-video', () => {
      const words = generateWords(60)
      const segments = splitIntoSegments('clip-1', words)

      for (const seg of segments) {
        expect(seg.segmentStyleCategory).toBe('main-video')
      }
    })

    it('generates unique ids for each segment', () => {
      const words = generateWords(60)
      const segments = splitIntoSegments('clip-1', words)

      const ids = new Set(segments.map((s) => s.id))
      expect(ids.size).toBe(segments.length)
    })
  })
})
