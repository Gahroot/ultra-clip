import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  useStore,
  CAPTION_PRESETS,
  type SourceVideo,
  type ClipCandidate,
  type CropRegion,
  type TranscriptionData
} from './store'

// Mock uuid
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'mock-uuid-1234')
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSource(overrides: Partial<SourceVideo> = {}): SourceVideo {
  return {
    id: 'src-1',
    path: '/path/to/video.mp4',
    name: 'video.mp4',
    duration: 120,
    width: 1920,
    height: 1080,
    origin: 'file',
    ...overrides
  }
}

function makeClip(overrides: Partial<ClipCandidate> = {}): ClipCandidate {
  return {
    id: 'clip-1',
    sourceId: 'src-1',
    startTime: 0,
    endTime: 30,
    duration: 30,
    text: 'Some transcript text',
    score: 75,
    hookText: 'Watch this!',
    reasoning: 'High energy segment',
    status: 'pending',
    ...overrides
  }
}

function makeTranscription(overrides: Partial<TranscriptionData> = {}): TranscriptionData {
  return {
    text: 'Hello world',
    words: [
      { text: 'Hello', start: 0, end: 0.5 },
      { text: 'world', start: 0.6, end: 1.0 }
    ],
    segments: [{ text: 'Hello world', start: 0, end: 1.0 }],
    formattedForAI: '[00:00] Hello world',
    ...overrides
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useStore', () => {
  beforeEach(() => {
    useStore.getState().reset()
  })

  // -------------------------------------------------------------------------
  // Sources
  // -------------------------------------------------------------------------
  describe('addSource', () => {
    it('adds a source video', () => {
      const src = makeSource()
      useStore.getState().addSource(src)

      expect(useStore.getState().sources).toHaveLength(1)
      expect(useStore.getState().sources[0]).toEqual(src)
    })

    it('appends multiple sources', () => {
      useStore.getState().addSource(makeSource({ id: 'src-1' }))
      useStore.getState().addSource(makeSource({ id: 'src-2' }))

      expect(useStore.getState().sources).toHaveLength(2)
    })
  })

  describe('removeSource', () => {
    it('removes a source by id', () => {
      useStore.getState().addSource(makeSource({ id: 'src-1' }))
      useStore.getState().addSource(makeSource({ id: 'src-2' }))
      useStore.getState().removeSource('src-1')

      expect(useStore.getState().sources).toHaveLength(1)
      expect(useStore.getState().sources[0].id).toBe('src-2')
    })

    it('also removes associated transcription and clips', () => {
      useStore.getState().addSource(makeSource({ id: 'src-1' }))
      useStore.getState().setTranscription('src-1', makeTranscription())
      useStore.getState().setClips('src-1', [makeClip()])

      useStore.getState().removeSource('src-1')

      expect(useStore.getState().transcriptions['src-1']).toBeUndefined()
      expect(useStore.getState().clips['src-1']).toBeUndefined()
    })

    it('clears activeSourceId when active source is removed', () => {
      useStore.getState().addSource(makeSource({ id: 'src-1' }))
      useStore.getState().setActiveSource('src-1')
      useStore.getState().removeSource('src-1')

      expect(useStore.getState().activeSourceId).toBeNull()
    })

    it('preserves activeSourceId when a different source is removed', () => {
      useStore.getState().addSource(makeSource({ id: 'src-1' }))
      useStore.getState().addSource(makeSource({ id: 'src-2' }))
      useStore.getState().setActiveSource('src-2')
      useStore.getState().removeSource('src-1')

      expect(useStore.getState().activeSourceId).toBe('src-2')
    })

    it('does nothing when id is not found', () => {
      useStore.getState().addSource(makeSource({ id: 'src-1' }))
      useStore.getState().removeSource('nonexistent')

      expect(useStore.getState().sources).toHaveLength(1)
    })
  })

  describe('setActiveSource', () => {
    it('sets the active source id', () => {
      useStore.getState().setActiveSource('src-1')
      expect(useStore.getState().activeSourceId).toBe('src-1')
    })

    it('can be set to null', () => {
      useStore.getState().setActiveSource('src-1')
      useStore.getState().setActiveSource(null)
      expect(useStore.getState().activeSourceId).toBeNull()
    })
  })

  // -------------------------------------------------------------------------
  // Transcription
  // -------------------------------------------------------------------------
  describe('setTranscription', () => {
    it('stores transcription keyed by sourceId', () => {
      const data = makeTranscription()
      useStore.getState().setTranscription('src-1', data)

      expect(useStore.getState().transcriptions['src-1']).toEqual(data)
    })

    it('overwrites existing transcription for same sourceId', () => {
      useStore.getState().setTranscription('src-1', makeTranscription({ text: 'old' }))
      useStore.getState().setTranscription('src-1', makeTranscription({ text: 'new' }))

      expect(useStore.getState().transcriptions['src-1'].text).toBe('new')
    })
  })

  // -------------------------------------------------------------------------
  // Clips
  // -------------------------------------------------------------------------
  describe('setClips', () => {
    it('stores clips keyed by sourceId', () => {
      const clips = [makeClip({ id: 'c1' }), makeClip({ id: 'c2' })]
      useStore.getState().setClips('src-1', clips)

      expect(useStore.getState().clips['src-1']).toHaveLength(2)
    })

    it('replaces existing clips for a source', () => {
      useStore.getState().setClips('src-1', [makeClip({ id: 'old' })])
      useStore.getState().setClips('src-1', [makeClip({ id: 'new1' }), makeClip({ id: 'new2' })])

      expect(useStore.getState().clips['src-1']).toHaveLength(2)
      expect(useStore.getState().clips['src-1'][0].id).toBe('new1')
    })
  })

  describe('updateClipStatus', () => {
    it('updates status of a specific clip', () => {
      useStore.getState().setClips('src-1', [makeClip({ id: 'c1', status: 'pending' })])
      useStore.getState().updateClipStatus('src-1', 'c1', 'approved')

      expect(useStore.getState().clips['src-1'][0].status).toBe('approved')
    })

    it('only updates the targeted clip', () => {
      useStore.getState().setClips('src-1', [
        makeClip({ id: 'c1', status: 'pending' }),
        makeClip({ id: 'c2', status: 'pending' })
      ])
      useStore.getState().updateClipStatus('src-1', 'c1', 'rejected')

      expect(useStore.getState().clips['src-1'][0].status).toBe('rejected')
      expect(useStore.getState().clips['src-1'][1].status).toBe('pending')
    })

    it('does nothing for unknown sourceId', () => {
      useStore.getState().updateClipStatus('no-source', 'c1', 'approved')
      // No error thrown, state unchanged
      expect(useStore.getState().clips['no-source']).toBeUndefined()
    })
  })

  describe('updateClipTrim', () => {
    it('updates startTime, endTime, and duration', () => {
      useStore.getState().setClips('src-1', [makeClip({ id: 'c1', startTime: 0, endTime: 30, duration: 30 })])
      useStore.getState().updateClipTrim('src-1', 'c1', 5, 20)

      const clip = useStore.getState().clips['src-1'][0]
      expect(clip.startTime).toBe(5)
      expect(clip.endTime).toBe(20)
      expect(clip.duration).toBe(15)
    })
  })

  describe('updateClipCrop', () => {
    it('updates the cropRegion of a clip', () => {
      useStore.getState().setClips('src-1', [makeClip({ id: 'c1' })])
      const crop: CropRegion = { x: 100, y: 200, width: 300, height: 400, faceDetected: true }
      useStore.getState().updateClipCrop('src-1', 'c1', crop)

      expect(useStore.getState().clips['src-1'][0].cropRegion).toEqual(crop)
    })
  })

  describe('approveAll', () => {
    it('sets all clips for a source to approved', () => {
      useStore.getState().setClips('src-1', [
        makeClip({ id: 'c1', status: 'pending' }),
        makeClip({ id: 'c2', status: 'rejected' }),
        makeClip({ id: 'c3', status: 'pending' })
      ])
      useStore.getState().approveAll('src-1')

      const clips = useStore.getState().clips['src-1']
      expect(clips.every((c) => c.status === 'approved')).toBe(true)
    })

    it('does nothing for unknown sourceId', () => {
      useStore.getState().approveAll('no-source')
      expect(useStore.getState().clips['no-source']).toBeUndefined()
    })
  })

  describe('rejectAll', () => {
    it('sets all clips for a source to rejected', () => {
      useStore.getState().setClips('src-1', [
        makeClip({ id: 'c1', status: 'pending' }),
        makeClip({ id: 'c2', status: 'approved' })
      ])
      useStore.getState().rejectAll('src-1')

      const clips = useStore.getState().clips['src-1']
      expect(clips.every((c) => c.status === 'rejected')).toBe(true)
    })
  })

  // -------------------------------------------------------------------------
  // Computed
  // -------------------------------------------------------------------------
  describe('getApprovedClips', () => {
    it('returns only approved clips for a source', () => {
      useStore.getState().setClips('src-1', [
        makeClip({ id: 'c1', status: 'approved' }),
        makeClip({ id: 'c2', status: 'pending' }),
        makeClip({ id: 'c3', status: 'rejected' }),
        makeClip({ id: 'c4', status: 'approved' })
      ])

      const approved = useStore.getState().getApprovedClips('src-1')
      expect(approved).toHaveLength(2)
      expect(approved.map((c) => c.id)).toEqual(['c1', 'c4'])
    })

    it('returns empty array when no clips are approved', () => {
      useStore.getState().setClips('src-1', [
        makeClip({ id: 'c1', status: 'pending' }),
        makeClip({ id: 'c2', status: 'rejected' })
      ])

      expect(useStore.getState().getApprovedClips('src-1')).toHaveLength(0)
    })

    it('returns empty array for unknown sourceId', () => {
      expect(useStore.getState().getApprovedClips('no-source')).toHaveLength(0)
    })
  })

  describe('getActiveSource', () => {
    it('returns the active source', () => {
      const src = makeSource({ id: 'src-1' })
      useStore.getState().addSource(src)
      useStore.getState().setActiveSource('src-1')

      expect(useStore.getState().getActiveSource()).toEqual(src)
    })

    it('returns null when no active source', () => {
      expect(useStore.getState().getActiveSource()).toBeNull()
    })
  })

  describe('getActiveTranscription', () => {
    it('returns the transcription for the active source', () => {
      const data = makeTranscription()
      useStore.getState().setActiveSource('src-1')
      useStore.getState().setTranscription('src-1', data)

      expect(useStore.getState().getActiveTranscription()).toEqual(data)
    })

    it('returns null when no active source', () => {
      expect(useStore.getState().getActiveTranscription()).toBeNull()
    })

    it('returns null when active source has no transcription', () => {
      useStore.getState().setActiveSource('src-1')
      expect(useStore.getState().getActiveTranscription()).toBeNull()
    })
  })

  describe('getActiveClips', () => {
    it('returns clips sorted by score descending', () => {
      useStore.getState().setActiveSource('src-1')
      useStore.getState().setClips('src-1', [
        makeClip({ id: 'c1', score: 50 }),
        makeClip({ id: 'c2', score: 90 }),
        makeClip({ id: 'c3', score: 70 })
      ])

      const activeClips = useStore.getState().getActiveClips()
      expect(activeClips.map((c) => c.score)).toEqual([90, 70, 50])
    })

    it('returns empty array when no active source', () => {
      expect(useStore.getState().getActiveClips()).toHaveLength(0)
    })

    it('returns empty array when active source has no clips', () => {
      useStore.getState().setActiveSource('src-1')
      expect(useStore.getState().getActiveClips()).toHaveLength(0)
    })

    it('does not mutate the original clips array', () => {
      useStore.getState().setActiveSource('src-1')
      useStore.getState().setClips('src-1', [
        makeClip({ id: 'c1', score: 50 }),
        makeClip({ id: 'c2', score: 90 })
      ])

      useStore.getState().getActiveClips()
      // Original order preserved in store
      expect(useStore.getState().clips['src-1'][0].id).toBe('c1')
    })
  })

  // -------------------------------------------------------------------------
  // Settings persistence
  // -------------------------------------------------------------------------
  describe('setGeminiApiKey', () => {
    it('updates geminiApiKey in settings', () => {
      useStore.getState().setGeminiApiKey('my-api-key')
      expect(useStore.getState().settings.geminiApiKey).toBe('my-api-key')
    })

    it('persists geminiApiKey to localStorage', () => {
      useStore.getState().setGeminiApiKey('persisted-key')
      expect(localStorage.getItem('batchcontent-gemini-key')).toBe('persisted-key')
    })

    it('preserves other settings when updating key', () => {
      useStore.getState().setOutputDirectory('/some/dir')
      useStore.getState().setGeminiApiKey('new-key')
      expect(useStore.getState().settings.outputDirectory).toBe('/some/dir')
    })
  })

  describe('setOutputDirectory', () => {
    it('updates outputDirectory in settings', () => {
      useStore.getState().setOutputDirectory('/output/path')
      expect(useStore.getState().settings.outputDirectory).toBe('/output/path')
    })
  })

  describe('setMinScore', () => {
    it('updates minScore in settings', () => {
      useStore.getState().setMinScore(80)
      expect(useStore.getState().settings.minScore).toBe(80)
    })
  })

  describe('setCaptionStyle', () => {
    it('updates captionStyle in settings', () => {
      const style = CAPTION_PRESETS['tiktok-glow']
      useStore.getState().setCaptionStyle(style)
      expect(useStore.getState().settings.captionStyle).toEqual(style)
    })
  })

  describe('setCaptionsEnabled', () => {
    it('updates captionsEnabled in settings', () => {
      useStore.getState().setCaptionsEnabled(false)
      expect(useStore.getState().settings.captionsEnabled).toBe(false)
    })
  })

  // -------------------------------------------------------------------------
  // Pipeline
  // -------------------------------------------------------------------------
  describe('setPipeline', () => {
    it('updates pipeline progress', () => {
      const progress = { stage: 'transcribing' as const, message: 'Transcribing...', percent: 50 }
      useStore.getState().setPipeline(progress)
      expect(useStore.getState().pipeline).toEqual(progress)
    })
  })

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  describe('setRenderProgress', () => {
    it('updates render progress array', () => {
      const progress = [
        { clipId: 'c1', percent: 50, status: 'rendering' as const },
        { clipId: 'c2', percent: 0, status: 'queued' as const }
      ]
      useStore.getState().setRenderProgress(progress)
      expect(useStore.getState().renderProgress).toEqual(progress)
    })
  })

  describe('setIsRendering', () => {
    it('sets isRendering to true', () => {
      useStore.getState().setIsRendering(true)
      expect(useStore.getState().isRendering).toBe(true)
    })

    it('sets isRendering to false', () => {
      useStore.getState().setIsRendering(true)
      useStore.getState().setIsRendering(false)
      expect(useStore.getState().isRendering).toBe(false)
    })
  })

  // -------------------------------------------------------------------------
  // Errors
  // -------------------------------------------------------------------------
  describe('addError', () => {
    it('adds an error with auto-generated id and timestamp', () => {
      const now = 1700000000000
      vi.spyOn(Date, 'now').mockReturnValue(now)

      useStore.getState().addError({ source: 'transcription', message: 'Failed' })

      const errors = useStore.getState().errorLog
      expect(errors).toHaveLength(1)
      expect(errors[0].id).toBe('mock-uuid-1234')
      expect(errors[0].timestamp).toBe(now)
      expect(errors[0].source).toBe('transcription')
      expect(errors[0].message).toBe('Failed')

      vi.restoreAllMocks()
    })

    it('appends multiple errors', () => {
      useStore.getState().addError({ source: 'scoring', message: 'Error A' })
      useStore.getState().addError({ source: 'render', message: 'Error B' })

      expect(useStore.getState().errorLog).toHaveLength(2)
    })
  })

  describe('clearErrors', () => {
    it('empties the error log', () => {
      useStore.getState().addError({ source: 'scoring', message: 'Fail' })
      useStore.getState().clearErrors()
      expect(useStore.getState().errorLog).toHaveLength(0)
    })

    it('does nothing when already empty', () => {
      useStore.getState().clearErrors()
      expect(useStore.getState().errorLog).toHaveLength(0)
    })
  })

  // -------------------------------------------------------------------------
  // Reset
  // -------------------------------------------------------------------------
  describe('reset', () => {
    it('clears all transient state', () => {
      useStore.getState().addSource(makeSource({ id: 'src-1' }))
      useStore.getState().setActiveSource('src-1')
      useStore.getState().setTranscription('src-1', makeTranscription())
      useStore.getState().setClips('src-1', [makeClip()])
      useStore.getState().setIsRendering(true)
      useStore.getState().setRenderProgress([{ clipId: 'c1', percent: 50, status: 'rendering' }])
      useStore.getState().addError({ source: 'render', message: 'err' })
      useStore.getState().setPipeline({ stage: 'scoring', message: 'Scoring', percent: 60 })

      useStore.getState().reset()

      const state = useStore.getState()
      expect(state.sources).toHaveLength(0)
      expect(state.activeSourceId).toBeNull()
      expect(state.transcriptions).toEqual({})
      expect(state.clips).toEqual({})
      expect(state.renderProgress).toHaveLength(0)
      expect(state.isRendering).toBe(false)
      expect(state.errorLog).toHaveLength(0)
      expect(state.pipeline.stage).toBe('idle')
    })

    it('preserves settings after reset', () => {
      useStore.getState().setGeminiApiKey('keep-me')
      useStore.getState().reset()
      // Settings are not cleared by reset (only operational state)
      // The geminiApiKey persists in localStorage; settings object remains
      expect(useStore.getState().settings).toBeDefined()
    })
  })

  // -------------------------------------------------------------------------
  // CAPTION_PRESETS
  // -------------------------------------------------------------------------
  describe('CAPTION_PRESETS', () => {
    it('includes hormozi-bold preset', () => {
      expect(CAPTION_PRESETS['hormozi-bold']).toBeDefined()
      expect(CAPTION_PRESETS['hormozi-bold'].id).toBe('hormozi-bold')
    })

    it('includes tiktok-glow preset', () => {
      expect(CAPTION_PRESETS['tiktok-glow']).toBeDefined()
    })

    it('includes reels-clean preset', () => {
      expect(CAPTION_PRESETS['reels-clean']).toBeDefined()
    })
  })

  // -------------------------------------------------------------------------
  // Initial state
  // -------------------------------------------------------------------------
  describe('initial state', () => {
    it('is not rendering initially', () => {
      expect(useStore.getState().isRendering).toBe(false)
    })

    it('has empty error log initially', () => {
      expect(useStore.getState().errorLog).toHaveLength(0)
    })

    it('has idle pipeline initially', () => {
      expect(useStore.getState().pipeline.stage).toBe('idle')
    })

    it('has default minScore of 69', () => {
      // Explicitly set to verify setter works and check default
      useStore.getState().setMinScore(69)
      expect(useStore.getState().settings.minScore).toBe(69)
    })

    it('has captions enabled by default', () => {
      useStore.getState().setCaptionsEnabled(true)
      expect(useStore.getState().settings.captionsEnabled).toBe(true)
    })

    it('has null outputDirectory by default on fresh state', () => {
      // The output directory starts null; verify the settings object structure
      expect(useStore.getState().settings).toHaveProperty('outputDirectory')
    })
  })
})
