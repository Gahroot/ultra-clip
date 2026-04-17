import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Mock } from 'vitest'

// ---------------------------------------------------------------------------
// Mock @google/genai
// Vitest v4 requires `class` for constructor mocks (not arrow functions).
// vi.hoisted makes mockGenerateContent and constructorSpy available inside
// the vi.mock factory, which is also hoisted to the top of the file.
// ---------------------------------------------------------------------------

const { mockGenerateContent, constructorSpy } = vi.hoisted(() => {
  const mockGenerateContent = vi.fn()
  // Track constructor args via a mutable object (primitives can't be mutated)
  const constructorSpy = { lastApiKey: '' }
  return { mockGenerateContent, constructorSpy }
})

vi.mock('@google/genai', () => ({
  GoogleGenAI: class MockGoogleGenAI {
    models = { generateContent: mockGenerateContent }
    constructor(opts: { apiKey: string }) {
      constructorSpy.lastApiKey = opts.apiKey
    }
  }
}))

import { scoreTranscript, generateHookText } from './ai-scoring'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeResponse(segments: object[], summary = 'Test summary', key_topics: string[] = []) {
  const text = JSON.stringify({ segments, summary, key_topics })
  mockGenerateContent.mockResolvedValue({ text })
}

const noopProgress = vi.fn()

// ---------------------------------------------------------------------------
// scoreTranscript
// ---------------------------------------------------------------------------

describe('scoreTranscript', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    constructorSpy.lastApiKey = ''
    noopProgress.mockClear()
  })

  it('calls onProgress with sending, analyzing, validating stages', async () => {
    makeResponse([
      { start_time: '00:00', end_time: '00:30', text: 'A good segment with enough words here', score: 80, hook_text: 'Hook', reasoning: 'Reason' }
    ])
    await scoreTranscript('test-key', 'transcript', 3600, noopProgress)
    const stages = (noopProgress as Mock).mock.calls.map((c) => c[0].stage)
    expect(stages).toContain('sending')
    expect(stages).toContain('analyzing')
    expect(stages).toContain('validating')
  })

  it('returns scored segments from a valid response', async () => {
    makeResponse([
      { start_time: '00:10', end_time: '00:40', text: 'This is a really great hook segment.', score: 85, hook_text: 'Great hook', reasoning: 'Strong opener' }
    ])
    const result = await scoreTranscript('test-key', 'transcript', 3600, noopProgress)
    expect(result.segments).toHaveLength(1)
    expect(result.segments[0].startTime).toBe(10)
    expect(result.segments[0].endTime).toBe(40)
    expect(result.segments[0].score).toBe(85)
    expect(result.segments[0].hookText).toBe('Great hook')
    expect(result.summary).toBe('Test summary')
  })

  it('filters out segments with score < 69', async () => {
    makeResponse([
      { start_time: '00:00', end_time: '00:30', text: 'Low score segment that should be filtered out.', score: 68, hook_text: '', reasoning: '' },
      { start_time: '01:00', end_time: '01:30', text: 'Good score segment that should be kept here.', score: 75, hook_text: 'Keep', reasoning: 'Good' }
    ])
    const result = await scoreTranscript('test-key', 'transcript', 3600, noopProgress)
    expect(result.segments).toHaveLength(1)
    expect(result.segments[0].score).toBe(75)
  })

  it('throws when all segments score below 69', async () => {
    makeResponse([
      { start_time: '00:00', end_time: '00:30', text: 'Low score segment that fails the threshold.', score: 50, hook_text: '', reasoning: '' }
    ])
    await expect(scoreTranscript('test-key', 'transcript', 3600, noopProgress)).rejects.toThrow('no segments scoring')
  })

  it('filters segments with invalid timestamps', async () => {
    makeResponse([
      { start_time: 'bad', end_time: '00:30', text: 'This has an invalid start time.', score: 80, hook_text: '', reasoning: '' },
      { start_time: '00:00', end_time: 'bad', text: 'This has an invalid end time.', score: 80, hook_text: '', reasoning: '' },
      { start_time: '00:30', end_time: '01:00', text: 'This one is perfectly fine segment.', score: 80, hook_text: 'OK', reasoning: 'Good' }
    ])
    const result = await scoreTranscript('test-key', 'transcript', 3600, noopProgress)
    expect(result.segments).toHaveLength(1)
    expect(result.segments[0].startTime).toBe(30)
  })

  it('filters segments where startTime >= endTime', async () => {
    makeResponse([
      { start_time: '00:30', end_time: '00:30', text: 'Same start and end is invalid segment.', score: 80, hook_text: '', reasoning: '' },
      { start_time: '00:40', end_time: '00:30', text: 'Start after end is also bad here.', score: 80, hook_text: '', reasoning: '' },
      { start_time: '00:00', end_time: '00:30', text: 'This valid segment should survive filtering.', score: 80, hook_text: 'OK', reasoning: 'OK' }
    ])
    const result = await scoreTranscript('test-key', 'transcript', 3600, noopProgress)
    expect(result.segments).toHaveLength(1)
  })

  it('resolves overlapping segments by keeping the higher-scored one', async () => {
    makeResponse([
      { start_time: '00:00', end_time: '00:40', text: 'High score overlapping segment wins here.', score: 90, hook_text: 'High', reasoning: '' },
      { start_time: '00:20', end_time: '01:00', text: 'Low score overlapping segment loses here.', score: 75, hook_text: 'Low', reasoning: '' }
    ])
    const result = await scoreTranscript('test-key', 'transcript', 3600, noopProgress)
    expect(result.segments).toHaveLength(1)
    expect(result.segments[0].score).toBe(90)
    expect(result.segments[0].hookText).toBe('High')
  })

  it('clamps segment endTime to videoDuration', async () => {
    makeResponse([
      { start_time: '00:10', end_time: '01:00', text: 'Segment extends beyond the video duration.', score: 80, hook_text: 'OK', reasoning: '' }
    ])
    // videoDuration = 45s, so endTime should be clamped from 60 to 45
    const result = await scoreTranscript('test-key', 'transcript', 45, noopProgress)
    expect(result.segments[0].endTime).toBe(45)
  })

  it('passes the apiKey to GoogleGenAI constructor', async () => {
    makeResponse([
      { start_time: '00:00', end_time: '00:30', text: 'Segment for testing API key passing.', score: 80, hook_text: '', reasoning: '' }
    ])
    await scoreTranscript('my-secret-key', 'transcript', 3600, noopProgress)
    expect(constructorSpy.lastApiKey).toBe('my-secret-key')
  })
})

// ---------------------------------------------------------------------------
// generateHookText
// ---------------------------------------------------------------------------

describe('generateHookText', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    constructorSpy.lastApiKey = ''
  })

  it('returns the hook text from the model', async () => {
    mockGenerateContent.mockResolvedValue({ text: 'Nobody expected this' })
    const result = await generateHookText('test-key', 'some transcript text')
    expect(result).toBe('Nobody expected this')
  })

  it('passes the apiKey to GoogleGenAI', async () => {
    mockGenerateContent.mockResolvedValue({ text: 'Hook' })
    await generateHookText('hook-api-key', 'transcript')
    expect(constructorSpy.lastApiKey).toBe('hook-api-key')
  })

  it('wraps errors with a descriptive message', async () => {
    mockGenerateContent.mockRejectedValue(new Error('network failure'))
    await expect(generateHookText('test-key', 'transcript')).rejects.toThrow('Failed to generate hook text')
  })
})
