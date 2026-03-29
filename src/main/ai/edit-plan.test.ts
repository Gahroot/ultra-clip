// ---------------------------------------------------------------------------
// Tests for AI Edit Plan — prompt building, transcript formatting, and
// response parsing / validation
// ---------------------------------------------------------------------------

import { describe, it, expect } from 'vitest'
import { formatWordsForPrompt, parseEditPlanResponse, buildEditPlanPrompt } from './edit-plan'
import type { WordTimestamp } from '@shared/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a word array with auto-generated timestamps starting at `offset`. */
function makeWords(texts: string[], offset = 0, spacing = 0.5): WordTimestamp[] {
  return texts.map((text, i) => ({
    text,
    start: offset + i * spacing,
    end: offset + i * spacing + (spacing - 0.1)
  }))
}

/** Build a minimal clippedWords array for parseEditPlanResponse. */
function makeClippedWords(texts: string[], spacing = 0.5) {
  return texts.map((text, i) => ({
    text,
    clipRelStart: i * spacing,
    clipRelEnd: i * spacing + (spacing - 0.1)
  }))
}

// ---------------------------------------------------------------------------
// formatWordsForPrompt
// ---------------------------------------------------------------------------

describe('formatWordsForPrompt', () => {
  it('formats words within clip range with correct indices', () => {
    const words = makeWords(['hello', 'world', 'foo', 'bar'], 10)
    const { formatted, clippedWords } = formatWordsForPrompt(words, 10, 12)

    expect(clippedWords).toHaveLength(4)
    expect(clippedWords[0].clipRelStart).toBeCloseTo(0.0)
    expect(clippedWords[1].clipRelStart).toBeCloseTo(0.5)

    const lines = formatted.split('\n')
    expect(lines).toHaveLength(4)
    expect(lines[0]).toMatch(/^\[0\|0\.00\|0\.40\|hello\]$/)
    expect(lines[1]).toMatch(/^\[1\|0\.50\|0\.90\|world\]$/)
  })

  it('filters out words outside clip range', () => {
    const words = makeWords(['before', 'inside', 'after'], 0, 5)
    // words at 0-4.9, 5-9.9, 10-14.9 — clip is 5-10
    const { clippedWords } = formatWordsForPrompt(words, 5, 10)
    expect(clippedWords).toHaveLength(1)
    expect(clippedWords[0].text).toBe('inside')
  })

  it('returns empty for no words in range', () => {
    const words = makeWords(['far', 'away'], 100)
    const { formatted, clippedWords } = formatWordsForPrompt(words, 0, 5)
    expect(clippedWords).toHaveLength(0)
    expect(formatted).toBe('')
  })

  it('clamps clip-relative times to zero minimum', () => {
    // Word starts slightly before clip start (within tolerance)
    const words: WordTimestamp[] = [{ text: 'edge', start: 9.95, end: 10.3 }]
    const { clippedWords } = formatWordsForPrompt(words, 10, 15)
    expect(clippedWords).toHaveLength(1)
    expect(clippedWords[0].clipRelStart).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// parseEditPlanResponse — word emphasis
// ---------------------------------------------------------------------------

describe('parseEditPlanResponse — word emphasis', () => {
  const clipped = makeClippedWords(['the', 'secret', 'to', 'making', 'money'])
  const clipDuration = 2.5

  it('parses valid word emphasis entries', () => {
    const json = JSON.stringify({
      word_emphasis: [
        { word_index: 1, text: 'secret', start: 0.5, end: 0.9, level: 'emphasis' },
        { word_index: 4, text: 'money', start: 2.0, end: 2.4, level: 'supersize' }
      ],
      broll_suggestions: [],
      sfx_suggestions: [],
      reasoning: 'Test reasoning.'
    })

    const result = parseEditPlanResponse(json, clipped, clipDuration)
    expect(result.wordEmphasis).toHaveLength(2)
    expect(result.wordEmphasis[0]).toEqual({
      wordIndex: 1, text: 'secret', start: 0.5, end: 0.9, level: 'emphasis'
    })
    expect(result.wordEmphasis[1]).toEqual({
      wordIndex: 4, text: 'money', start: 2.0, end: 2.4, level: 'supersize'
    })
  })

  it('rejects invalid word indices', () => {
    const json = JSON.stringify({
      word_emphasis: [
        { word_index: -1, text: 'bad', start: 0, end: 0.4, level: 'emphasis' },
        { word_index: 99, text: 'bad', start: 0, end: 0.4, level: 'emphasis' },
        { word_index: 'abc', text: 'bad', start: 0, end: 0.4, level: 'emphasis' }
      ],
      broll_suggestions: [],
      sfx_suggestions: [],
      reasoning: ''
    })

    const result = parseEditPlanResponse(json, clipped, clipDuration)
    expect(result.wordEmphasis).toHaveLength(0)
  })

  it('rejects invalid emphasis levels', () => {
    const json = JSON.stringify({
      word_emphasis: [
        { word_index: 1, text: 'secret', start: 0.5, end: 0.9, level: 'mega' },
        { word_index: 2, text: 'to', start: 1.0, end: 1.4, level: 'normal' }
      ],
      broll_suggestions: [],
      sfx_suggestions: [],
      reasoning: ''
    })

    const result = parseEditPlanResponse(json, clipped, clipDuration)
    expect(result.wordEmphasis).toHaveLength(0)
  })

  it('falls back to word timing when start/end missing', () => {
    const json = JSON.stringify({
      word_emphasis: [
        { word_index: 1, text: 'secret', level: 'emphasis' }
      ],
      broll_suggestions: [],
      sfx_suggestions: [],
      reasoning: ''
    })

    const result = parseEditPlanResponse(json, clipped, clipDuration)
    expect(result.wordEmphasis).toHaveLength(1)
    expect(result.wordEmphasis[0].start).toBeCloseTo(0.5)
    expect(result.wordEmphasis[0].end).toBeCloseTo(0.9)
  })
})

// ---------------------------------------------------------------------------
// parseEditPlanResponse — B-Roll suggestions
// ---------------------------------------------------------------------------

describe('parseEditPlanResponse — B-Roll suggestions', () => {
  const clipped = makeClippedWords(['a', 'b', 'c'], 3)
  const clipDuration = 30

  it('parses valid B-Roll suggestions', () => {
    const json = JSON.stringify({
      word_emphasis: [],
      broll_suggestions: [
        {
          timestamp: 5.0, duration: 3, keyword: 'coding laptop',
          display_mode: 'fullscreen', transition: 'crossfade',
          reason: 'Shows the coding context'
        }
      ],
      sfx_suggestions: [],
      reasoning: ''
    })

    const result = parseEditPlanResponse(json, clipped, clipDuration)
    expect(result.brollSuggestions).toHaveLength(1)
    expect(result.brollSuggestions[0]).toEqual({
      timestamp: 5.0,
      duration: 3,
      keyword: 'coding laptop',
      displayMode: 'fullscreen',
      transition: 'crossfade',
      reason: 'Shows the coding context'
    })
  })

  it('rejects B-Roll with invalid display_mode', () => {
    const json = JSON.stringify({
      word_emphasis: [],
      broll_suggestions: [
        { timestamp: 5.0, duration: 3, keyword: 'test', display_mode: 'widescreen', transition: 'crossfade', reason: '' }
      ],
      sfx_suggestions: [],
      reasoning: ''
    })

    const result = parseEditPlanResponse(json, clipped, clipDuration)
    expect(result.brollSuggestions).toHaveLength(0)
  })

  it('rejects B-Roll with invalid transition', () => {
    const json = JSON.stringify({
      word_emphasis: [],
      broll_suggestions: [
        { timestamp: 5.0, duration: 3, keyword: 'test', display_mode: 'pip', transition: 'dissolve', reason: '' }
      ],
      sfx_suggestions: [],
      reasoning: ''
    })

    const result = parseEditPlanResponse(json, clipped, clipDuration)
    expect(result.brollSuggestions).toHaveLength(0)
  })

  it('rejects B-Roll with timestamp outside clip', () => {
    const json = JSON.stringify({
      word_emphasis: [],
      broll_suggestions: [
        { timestamp: 35.0, duration: 3, keyword: 'test', display_mode: 'pip', transition: 'crossfade', reason: '' },
        { timestamp: -1.0, duration: 3, keyword: 'test', display_mode: 'pip', transition: 'crossfade', reason: '' }
      ],
      sfx_suggestions: [],
      reasoning: ''
    })

    const result = parseEditPlanResponse(json, clipped, clipDuration)
    expect(result.brollSuggestions).toHaveLength(0)
  })

  it('rejects B-Roll with duration outside 1-8s range', () => {
    const json = JSON.stringify({
      word_emphasis: [],
      broll_suggestions: [
        { timestamp: 5.0, duration: 0.5, keyword: 'test', display_mode: 'pip', transition: 'crossfade', reason: '' },
        { timestamp: 5.0, duration: 10, keyword: 'test', display_mode: 'pip', transition: 'crossfade', reason: '' }
      ],
      sfx_suggestions: [],
      reasoning: ''
    })

    const result = parseEditPlanResponse(json, clipped, clipDuration)
    // duration < 1 rejected, duration > 8 rejected
    expect(result.brollSuggestions).toHaveLength(0)
  })

  it('clamps B-Roll duration to not exceed clip end', () => {
    const json = JSON.stringify({
      word_emphasis: [],
      broll_suggestions: [
        { timestamp: 28.0, duration: 5, keyword: 'test', display_mode: 'fullscreen', transition: 'hard-cut', reason: '' }
      ],
      sfx_suggestions: [],
      reasoning: ''
    })

    const result = parseEditPlanResponse(json, clipped, clipDuration)
    expect(result.brollSuggestions).toHaveLength(1)
    expect(result.brollSuggestions[0].duration).toBe(2) // 30 - 28 = 2
  })

  it('rejects B-Roll with empty keyword', () => {
    const json = JSON.stringify({
      word_emphasis: [],
      broll_suggestions: [
        { timestamp: 5.0, duration: 3, keyword: '', display_mode: 'pip', transition: 'crossfade', reason: '' },
        { timestamp: 5.0, duration: 3, keyword: '  ', display_mode: 'pip', transition: 'crossfade', reason: '' }
      ],
      sfx_suggestions: [],
      reasoning: ''
    })

    const result = parseEditPlanResponse(json, clipped, clipDuration)
    expect(result.brollSuggestions).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// parseEditPlanResponse — SFX suggestions
// ---------------------------------------------------------------------------

describe('parseEditPlanResponse — SFX suggestions', () => {
  const clipped = makeClippedWords(['a', 'b'], 2)
  const clipDuration = 15

  it('parses valid SFX suggestions', () => {
    const json = JSON.stringify({
      word_emphasis: [],
      broll_suggestions: [],
      sfx_suggestions: [
        { timestamp: 0.0, type: 'whoosh-soft', reason: 'Opening energy' },
        { timestamp: 5.5, type: 'impact-high', reason: 'Punchline hit' },
        { timestamp: 12.0, type: 'bass-drop', reason: 'Closing emphasis' }
      ],
      reasoning: ''
    })

    const result = parseEditPlanResponse(json, clipped, clipDuration)
    expect(result.sfxSuggestions).toHaveLength(3)
    expect(result.sfxSuggestions[0].type).toBe('whoosh-soft')
    expect(result.sfxSuggestions[1].type).toBe('impact-high')
    expect(result.sfxSuggestions[2].type).toBe('bass-drop')
  })

  it('rejects SFX with invalid type', () => {
    const json = JSON.stringify({
      word_emphasis: [],
      broll_suggestions: [],
      sfx_suggestions: [
        { timestamp: 0.0, type: 'explosion', reason: '' },
        { timestamp: 0.0, type: 'clap', reason: '' }
      ],
      reasoning: ''
    })

    const result = parseEditPlanResponse(json, clipped, clipDuration)
    expect(result.sfxSuggestions).toHaveLength(0)
  })

  it('rejects SFX with timestamp outside clip', () => {
    const json = JSON.stringify({
      word_emphasis: [],
      broll_suggestions: [],
      sfx_suggestions: [
        { timestamp: -0.5, type: 'whoosh-soft', reason: '' },
        { timestamp: 20.0, type: 'whoosh-soft', reason: '' }
      ],
      reasoning: ''
    })

    const result = parseEditPlanResponse(json, clipped, clipDuration)
    expect(result.sfxSuggestions).toHaveLength(0)
  })

  it('accepts all valid SFX types', () => {
    const validTypes = [
      'whoosh-soft', 'whoosh-hard', 'impact-low', 'impact-high',
      'rise-tension', 'notification-pop', 'word-pop', 'bass-drop', 'rise-tension-short'
    ]
    const json = JSON.stringify({
      word_emphasis: [],
      broll_suggestions: [],
      sfx_suggestions: validTypes.map((type, i) => ({
        timestamp: i * 1.0, type, reason: `Test ${type}`
      })),
      reasoning: ''
    })

    const result = parseEditPlanResponse(json, clipped, clipDuration)
    expect(result.sfxSuggestions).toHaveLength(validTypes.length)
  })

  it('truncates reason to 200 chars', () => {
    const longReason = 'A'.repeat(300)
    const json = JSON.stringify({
      word_emphasis: [],
      broll_suggestions: [],
      sfx_suggestions: [
        { timestamp: 0, type: 'whoosh-soft', reason: longReason }
      ],
      reasoning: ''
    })

    const result = parseEditPlanResponse(json, clipped, clipDuration)
    expect(result.sfxSuggestions[0].reason).toHaveLength(200)
  })
})

// ---------------------------------------------------------------------------
// parseEditPlanResponse — reasoning & edge cases
// ---------------------------------------------------------------------------

describe('parseEditPlanResponse — reasoning & edge cases', () => {
  const clipped = makeClippedWords(['a'], 1)
  const clipDuration = 5

  it('truncates reasoning to 600 chars', () => {
    const json = JSON.stringify({
      word_emphasis: [],
      broll_suggestions: [],
      sfx_suggestions: [],
      reasoning: 'R'.repeat(800)
    })

    const result = parseEditPlanResponse(json, clipped, clipDuration)
    expect(result.reasoning).toHaveLength(600)
  })

  it('handles missing reasoning field', () => {
    const json = JSON.stringify({
      word_emphasis: [],
      broll_suggestions: [],
      sfx_suggestions: []
    })

    const result = parseEditPlanResponse(json, clipped, clipDuration)
    expect(result.reasoning).toBe('')
  })

  it('handles missing arrays gracefully', () => {
    const json = JSON.stringify({ reasoning: 'Only reasoning here.' })

    const result = parseEditPlanResponse(json, clipped, clipDuration)
    expect(result.wordEmphasis).toHaveLength(0)
    expect(result.brollSuggestions).toHaveLength(0)
    expect(result.sfxSuggestions).toHaveLength(0)
    expect(result.reasoning).toBe('Only reasoning here.')
  })

  it('extracts JSON from markdown fences', () => {
    const rawResponse = '```json\n{"word_emphasis": [], "broll_suggestions": [], "sfx_suggestions": [], "reasoning": "Clean."}\n```'

    const result = parseEditPlanResponse(rawResponse, clipped, clipDuration)
    expect(result.reasoning).toBe('Clean.')
  })

  it('throws on completely non-JSON response', () => {
    expect(() =>
      parseEditPlanResponse('This is just text with no JSON.', clipped, clipDuration)
    ).toThrow('No JSON object found')
  })

  it('throws on malformed JSON', () => {
    expect(() =>
      parseEditPlanResponse('{ invalid json here }', clipped, clipDuration)
    ).toThrow('Failed to parse')
  })

  it('skips null and non-object items in arrays', () => {
    const json = JSON.stringify({
      word_emphasis: [null, 'string', 42, { word_index: 0, text: 'a', start: 0, end: 0.4, level: 'emphasis' }],
      broll_suggestions: [null, 'string'],
      sfx_suggestions: [null, 42],
      reasoning: ''
    })

    const result = parseEditPlanResponse(json, clipped, clipDuration)
    expect(result.wordEmphasis).toHaveLength(1)
    expect(result.brollSuggestions).toHaveLength(0)
    expect(result.sfxSuggestions).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// buildEditPlanPrompt
// ---------------------------------------------------------------------------

describe('buildEditPlanPrompt', () => {
  it('includes style preset name in prompt', () => {
    const prompt = buildEditPlanPrompt('[0|0.00|0.50|hello]', 30, 'Velocity', 'viral', 10)
    expect(prompt).toContain('"Velocity" style preset')
  })

  it('includes category-specific guidance', () => {
    const viral = buildEditPlanPrompt('[0|0.00|0.50|hello]', 30, 'Velocity', 'viral', 10)
    expect(viral).toContain('HIGH-ENERGY viral style')

    const cinematic = buildEditPlanPrompt('[0|0.00|0.50|hello]', 30, 'Film', 'cinematic', 10)
    expect(cinematic).toContain('CINEMATIC PREMIUM style')

    const minimal = buildEditPlanPrompt('[0|0.00|0.50|hello]', 30, 'Clean', 'minimal', 10)
    expect(minimal).toContain('MINIMAL CLEAN style')
  })

  it('falls back to custom guidance for unknown categories', () => {
    const prompt = buildEditPlanPrompt('[0|0.00|0.50|hello]', 30, 'Test', 'nonexistent', 10)
    expect(prompt).toContain('CUSTOM style')
  })

  it('calculates max emphasis limits from word count', () => {
    const prompt = buildEditPlanPrompt('[0|0.00|0.50|hello]', 30, 'Test', 'viral', 100)
    // 25% of 100 = 25 emphasis, 10% of 100 = 10 supersize
    expect(prompt).toContain('max 25 emphasis entries')
    expect(prompt).toContain('max 10 can be "supersize"')
  })

  it('includes the formatted transcript', () => {
    const transcript = '[0|0.00|0.50|hello]\n[1|0.50|1.00|world]'
    const prompt = buildEditPlanPrompt(transcript, 30, 'Test', 'viral', 2)
    expect(prompt).toContain('[0|0.00|0.50|hello]')
    expect(prompt).toContain('[1|0.50|1.00|world]')
  })

  it('includes all allowed SFX types', () => {
    const prompt = buildEditPlanPrompt('', 30, 'Test', 'viral', 1)
    expect(prompt).toContain('whoosh-soft')
    expect(prompt).toContain('impact-high')
    expect(prompt).toContain('bass-drop')
    expect(prompt).toContain('rise-tension-short')
  })

  it('includes all allowed display modes', () => {
    const prompt = buildEditPlanPrompt('', 30, 'Test', 'viral', 1)
    expect(prompt).toContain('fullscreen')
    expect(prompt).toContain('split-top')
    expect(prompt).toContain('split-bottom')
    expect(prompt).toContain('pip')
  })

  it('rounds clip duration in prompt text', () => {
    const prompt = buildEditPlanPrompt('', 27.834, 'Test', 'viral', 1)
    expect(prompt).toContain('28-second clip')
  })
})
