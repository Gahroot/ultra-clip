import { describe, it, expect, vi } from 'vitest'

// Mock modules that have native/electron dependencies
vi.mock('./ffmpeg', () => ({
  extractAudio: vi.fn()
}))
vi.mock('./python', () => ({
  runPythonScript: vi.fn()
}))

import { formatTranscriptForAI } from './transcription'
import type { TranscriptionResult } from './transcription'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeResult(words: { text: string; start: number; end: number }[]): TranscriptionResult {
  return {
    text: words.map((w) => w.text).join(' '),
    words,
    segments: []
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('formatTranscriptForAI', () => {
  it('returns empty string for result with no words and no text', () => {
    const result = formatTranscriptForAI({ text: '', words: [], segments: [] })
    expect(result).toBe('')
  })

  it('returns result.text when words array is empty', () => {
    const result = formatTranscriptForAI({ text: 'fallback text', words: [], segments: [] })
    expect(result).toBe('fallback text')
  })

  it('formats words into timestamped segments', () => {
    const words = [
      { text: 'Hello', start: 0, end: 0.5 },
      { text: 'world', start: 0.5, end: 1.0 },
      { text: 'how', start: 1.0, end: 1.3 },
      { text: 'are', start: 1.3, end: 1.6 },
      { text: 'you', start: 1.6, end: 2.0 },
      { text: 'today', start: 2.0, end: 2.5 },
      { text: 'friend', start: 2.5, end: 3.0 },
      { text: 'really', start: 3.0, end: 3.5 }
    ]
    const result = formatTranscriptForAI(makeResult(words))
    const lines = result.split('\n')
    // 8 words → exactly one group of 8 (MAX_WORDS_PER_SEGMENT)
    expect(lines).toHaveLength(1)
    expect(lines[0]).toMatch(/^\[00:00 - 00:04\]/)
    expect(lines[0]).toContain('Hello world how are you today friend really')
  })

  it('breaks at MAX_WORDS_PER_SEGMENT (8 words)', () => {
    const words = Array.from({ length: 9 }, (_, i) => ({
      text: `word${i + 1}`,
      start: i,
      end: i + 1
    }))
    const result = formatTranscriptForAI(makeResult(words))
    const lines = result.split('\n')
    expect(lines).toHaveLength(2)
    expect(lines[0]).toContain('word1 word2 word3 word4 word5 word6 word7 word8')
    expect(lines[1]).toContain('word9')
  })

  it('breaks on sentence-ending punctuation (period)', () => {
    const words = [
      { text: 'First.', start: 0, end: 1 },
      { text: 'Second', start: 1, end: 2 },
      { text: 'word', start: 2, end: 3 }
    ]
    const result = formatTranscriptForAI(makeResult(words))
    const lines = result.split('\n')
    expect(lines).toHaveLength(2)
    expect(lines[0]).toContain('First.')
    expect(lines[1]).toContain('Second word')
  })

  it('breaks on sentence-ending punctuation (exclamation)', () => {
    const words = [
      { text: 'Wow!', start: 0, end: 1 },
      { text: 'Next', start: 1, end: 2 }
    ]
    const result = formatTranscriptForAI(makeResult(words))
    const lines = result.split('\n')
    expect(lines).toHaveLength(2)
    expect(lines[0]).toContain('Wow!')
    expect(lines[1]).toContain('Next')
  })

  it('breaks on sentence-ending punctuation (question mark)', () => {
    const words = [
      { text: 'Really?', start: 0, end: 1 },
      { text: 'Yes', start: 1, end: 2 }
    ]
    const result = formatTranscriptForAI(makeResult(words))
    const lines = result.split('\n')
    expect(lines).toHaveLength(2)
    expect(lines[0]).toContain('Really?')
  })

  it('flushes remaining words that do not fill a full segment', () => {
    const words = [
      { text: 'Just', start: 5, end: 5.5 },
      { text: 'three', start: 5.5, end: 6.0 },
      { text: 'words', start: 6.0, end: 6.5 }
    ]
    const result = formatTranscriptForAI(makeResult(words))
    expect(result).toContain('Just three words')
    expect(result).toMatch(/\[00:05 - 00:07\]/)
  })

  it('formats timestamps in MM:SS format', () => {
    const words = [
      { text: 'Start', start: 65, end: 66 },
      { text: 'here', start: 66, end: 67 }
    ]
    const result = formatTranscriptForAI(makeResult(words))
    // 65s → 01:05, 67s → 01:07
    expect(result).toMatch(/\[01:05 - 01:07\]/)
  })

  it('handles a single word', () => {
    const words = [{ text: 'Solo', start: 10, end: 11 }]
    const result = formatTranscriptForAI(makeResult(words))
    expect(result).toContain('Solo')
    expect(result).toMatch(/\[00:10 - 00:11\]/)
  })
})
