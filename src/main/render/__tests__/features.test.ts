import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks — must be defined before imports that reference them
// ---------------------------------------------------------------------------

vi.mock('fs', () => ({
  existsSync: vi.fn(() => true),
  writeFileSync: vi.fn()
}))

vi.mock('fs/promises', () => ({
  writeFile: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined)
}))

vi.mock('electron', () => ({
  app: { isPackaged: false, getPath: vi.fn(() => '/tmp') }
}))

vi.mock('../../captions', () => ({
  generateCaptions: vi.fn().mockResolvedValue('/tmp/batchcontent-captions-1234.ass')
}))

vi.mock('../../word-emphasis', () => ({
  analyzeEmphasisHeuristic: vi.fn((words: Array<{ text: string; start: number; end: number }>) =>
    words.map((w) => ({ ...w, emphasis: 'normal' }))
  )
}))

vi.mock('../../auto-zoom', () => ({
  generateZoomFilter: vi.fn(() => 'crop=trunc(iw*1.1):trunc(ih*1.1):0:0,scale=1080:1920')
}))

vi.mock('../../overlays/progress-bar', () => ({
  buildProgressBarFilter: vi.fn(
    () => "color=c=0xffffff@0.90:s=1080x6:d=30.000:r=30[_pbs0];[_pbs0]crop=w='(1+iw*(t/30.000+1-abs(t/30.000-1))/2+abs(1-iw*(t/30.000+1-abs(t/30.000-1))/2))/2':h=ih:x=0:y=0[_pbc0];[0:v][_pbc0]overlay=x=0:y=1914:shortest=1[outv]"
  )
}))

vi.mock('../../overlays/rehook', () => ({
  getDefaultRehookPhrase: vi.fn(() => 'Wait for it...')
}))

vi.mock('../../filler-detection', () => ({
  detectFillers: vi.fn(() => ({
    segments: [],
    counts: { filler: 0, silence: 0, repeat: 0 },
    timeSaved: 0
  }))
}))

vi.mock('../../filler-cuts', () => ({
  buildKeepSegments: vi.fn(() => []),
  remapWordTimestamps: vi.fn(() => [])
}))

vi.mock('../../ffmpeg', () => ({
  ffmpeg: vi.fn(),
  getEncoder: vi.fn(() => ({ encoder: 'libx264', presetFlag: ['-preset', 'veryfast'] })),
  getSoftwareEncoder: vi.fn(() => ({ encoder: 'libx264', presetFlag: ['-preset', 'veryfast'] })),
  isGpuSessionError: vi.fn(() => false)
}))

vi.mock('../../aspect-ratios', () => ({
  ASPECT_RATIO_CONFIGS: {
    '9:16': { width: 1080, height: 1920 },
    '16:9': { width: 1920, height: 1080 },
    '1:1': { width: 1080, height: 1080 },
    '4:5': { width: 1080, height: 1350 }
  }
}))

// ---------------------------------------------------------------------------
// Imports — after mocks
// ---------------------------------------------------------------------------

import { createCaptionsFeature } from '../features/captions.feature'
import { createHookTitleFeature } from '../features/hook-title.feature'
import { createRehookFeature } from '../features/rehook.feature'
import { progressBarFeature } from '../features/progress-bar.feature'
import { autoZoomFeature } from '../features/auto-zoom.feature'
import { createFillerRemovalFeature } from '../features/filler-removal.feature'
import { brandKitFeature } from '../features/brand-kit.feature'
import { soundDesignFeature } from '../features/sound-design.feature'
import { wordEmphasisFeature } from '../features/word-emphasis.feature'
import { brollFeature } from '../features/broll.feature'
import type { RenderClipJob, RenderBatchOptions } from '../types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeJob(overrides: Partial<RenderClipJob> = {}): RenderClipJob {
  return {
    clipId: 'test-clip-1',
    sourceVideoPath: '/videos/source.mp4',
    startTime: 10,
    endTime: 40,
    wordTimestamps: [
      { text: 'Hello', start: 10, end: 10.5 },
      { text: 'world', start: 10.5, end: 11 },
      { text: 'this', start: 11, end: 11.3 },
      { text: 'is', start: 11.3, end: 11.5 },
      { text: 'a', start: 11.5, end: 11.6 },
      { text: 'test', start: 11.6, end: 12 }
    ],
    ...overrides
  }
}

function makeOptions(overrides: Partial<RenderBatchOptions> = {}): RenderBatchOptions {
  return {
    jobs: [],
    outputDirectory: '/output',
    ...overrides
  }
}

// ---------------------------------------------------------------------------
// CaptionsFeature
// ---------------------------------------------------------------------------

describe('CaptionsFeature', () => {
  beforeEach(() => vi.clearAllMocks())

  it('skips when captionsEnabled is false', async () => {
    const feature = createCaptionsFeature()
    const result = await feature.prepare!(makeJob(), makeOptions({ captionsEnabled: false }))
    expect(result.modified).toBe(false)
    expect(result.tempFiles).toHaveLength(0)
  })

  it('skips when captionStyle is not provided', async () => {
    const feature = createCaptionsFeature()
    const result = await feature.prepare!(makeJob(), makeOptions({ captionsEnabled: true }))
    expect(result.modified).toBe(false)
  })

  it('skips when per-clip override disables captions', async () => {
    const feature = createCaptionsFeature()
    const job = makeJob({ clipOverrides: { enableCaptions: false } })
    const result = await feature.prepare!(
      job,
      makeOptions({
        captionsEnabled: true,
        captionStyle: {
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
          animation: 'karaoke-fill'
        }
      })
    )
    expect(result.modified).toBe(false)
  })

  it('skips when no word timestamps in clip range', async () => {
    const feature = createCaptionsFeature()
    const job = makeJob({ wordTimestamps: [] })
    const result = await feature.prepare!(
      job,
      makeOptions({
        captionsEnabled: true,
        captionStyle: {
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
          animation: 'karaoke-fill'
        }
      })
    )
    expect(result.modified).toBe(false)
  })

  it('generates captions and sets assFilePath when enabled', async () => {
    const feature = createCaptionsFeature()
    const job = makeJob()
    const result = await feature.prepare!(
      job,
      makeOptions({
        captionsEnabled: true,
        captionStyle: {
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
          animation: 'karaoke-fill'
        }
      })
    )
    expect(result.modified).toBe(true)
    expect(result.tempFiles).toHaveLength(1)
    expect(job.assFilePath).toBeDefined()
  })

  it('overlayPass returns ass filter when assFilePath is set', () => {
    const feature = createCaptionsFeature()
    const job = makeJob({ assFilePath: '/tmp/test.ass' })
    const result = feature.overlayPass!(job, {
      clipDuration: 30,
      targetWidth: 1080,
      targetHeight: 1920
    })
    expect(result).not.toBeNull()
    expect(result!.name).toBe('captions')
    expect(result!.filter).toContain('ass=')
  })

  it('overlayPass returns null when no assFilePath', () => {
    const feature = createCaptionsFeature()
    const job = makeJob()
    const result = feature.overlayPass!(job, {
      clipDuration: 30,
      targetWidth: 1080,
      targetHeight: 1920
    })
    expect(result).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// HookTitleFeature
// ---------------------------------------------------------------------------

describe('HookTitleFeature', () => {
  beforeEach(() => vi.clearAllMocks())

  it('skips when hook title overlay is not enabled', async () => {
    const feature = createHookTitleFeature()
    const result = await feature.prepare!(makeJob(), makeOptions())
    expect(result.modified).toBe(false)
  })

  it('skips when hookTitleText is missing', async () => {
    const feature = createHookTitleFeature()
    const result = await feature.prepare!(
      makeJob(),
      makeOptions({
        hookTitleOverlay: {
          enabled: true,
          displayDuration: 3,
          fadeIn: 0.3,
          fadeOut: 0.3,
          fontSize: 48,
          textColor: '#FFFFFF',
          outlineColor: '#000000'
        }
      })
    )
    expect(result.modified).toBe(false)
  })

  it('generates ASS file when enabled with text', async () => {
    const feature = createHookTitleFeature()
    const job = makeJob({ hookTitleText: 'You won\'t believe this!' })
    const result = await feature.prepare!(
      job,
      makeOptions({
        hookTitleOverlay: {
          enabled: true,
          displayDuration: 3,
          fadeIn: 0.3,
          fadeOut: 0.3,
          fontSize: 48,
          textColor: '#FFFFFF',
          outlineColor: '#000000'
        }
      })
    )
    expect(result.modified).toBe(true)
    expect(result.tempFiles).toHaveLength(1)
  })

  it('overlayPass returns filter after prepare', async () => {
    const feature = createHookTitleFeature()
    const job = makeJob({ hookTitleText: 'Hook text here' })
    await feature.prepare!(
      job,
      makeOptions({
        hookTitleOverlay: {
          enabled: true,
          displayDuration: 3,
          fadeIn: 0.3,
          fadeOut: 0.3,
          fontSize: 48,
          textColor: '#FFFFFF',
          outlineColor: '#000000'
        }
      })
    )
    const result = feature.overlayPass!(job, {
      clipDuration: 30,
      targetWidth: 1080,
      targetHeight: 1920
    })
    expect(result).not.toBeNull()
    expect(result!.name).toBe('hook-title')
    expect(result!.filter).toContain('ass=')
  })

  it('overlayPass returns null without prepare', () => {
    const feature = createHookTitleFeature()
    const job = makeJob()
    const result = feature.overlayPass!(job, {
      clipDuration: 30,
      targetWidth: 1080,
      targetHeight: 1920
    })
    expect(result).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// RehookFeature
// ---------------------------------------------------------------------------

describe('RehookFeature', () => {
  beforeEach(() => vi.clearAllMocks())

  it('skips when rehook overlay is not enabled', async () => {
    const feature = createRehookFeature()
    const result = await feature.prepare!(makeJob(), makeOptions())
    expect(result.modified).toBe(false)
  })

  it('skips when per-clip override disables hook title', async () => {
    const feature = createRehookFeature()
    const job = makeJob({ clipOverrides: { enableHookTitle: false } })
    const result = await feature.prepare!(
      job,
      makeOptions({
        rehookOverlay: {
          enabled: true,
          displayDuration: 2,
          fadeIn: 0.2,
          fadeOut: 0.2,
          fontSize: 36,
          textColor: '#FFFFFF',
          outlineColor: '#000000'
        }
      })
    )
    expect(result.modified).toBe(false)
  })

  it('computes appear time from hook title duration', async () => {
    const feature = createRehookFeature()
    const job = makeJob()
    await feature.prepare!(
      job,
      makeOptions({
        hookTitleOverlay: {
          enabled: true,
          displayDuration: 4,
          fadeIn: 0.3,
          fadeOut: 0.3,
          fontSize: 48,
          textColor: '#FFFFFF',
          outlineColor: '#000000'
        },
        rehookOverlay: {
          enabled: true,
          displayDuration: 2,
          fadeIn: 0.2,
          fadeOut: 0.2,
          fontSize: 36,
          textColor: '#FFFFFF',
          outlineColor: '#000000'
        }
      })
    )
    // Hook title is 4s, so rehook should appear at 4s
    expect(job.rehookAppearTime).toBe(4)
  })

  it('uses default 2.5s appear time when no hook title config', async () => {
    const feature = createRehookFeature()
    const job = makeJob()
    await feature.prepare!(
      job,
      makeOptions({
        rehookOverlay: {
          enabled: true,
          displayDuration: 2,
          fadeIn: 0.2,
          fadeOut: 0.2,
          fontSize: 36,
          textColor: '#FFFFFF',
          outlineColor: '#000000'
        }
      })
    )
    // Default hookDuration is 2.5s
    expect(job.rehookAppearTime).toBe(2.5)
  })

  it('sets default rehook text when none provided', async () => {
    const feature = createRehookFeature()
    const job = makeJob()
    await feature.prepare!(
      job,
      makeOptions({
        rehookOverlay: {
          enabled: true,
          displayDuration: 2,
          fadeIn: 0.2,
          fadeOut: 0.2,
          fontSize: 36,
          textColor: '#FFFFFF',
          outlineColor: '#000000'
        }
      })
    )
    expect(job.rehookText).toBe('Wait for it...')
  })
})

// ---------------------------------------------------------------------------
// ProgressBarFeature
// ---------------------------------------------------------------------------

describe('ProgressBarFeature', () => {
  beforeEach(() => vi.clearAllMocks())

  it('skips when no progress bar config', async () => {
    const result = await progressBarFeature.prepare!(makeJob(), makeOptions())
    expect(result.modified).toBe(false)
  })

  it('skips when progress bar not enabled', async () => {
    const result = await progressBarFeature.prepare!(
      makeJob(),
      makeOptions({
        progressBarOverlay: {
          enabled: false,
          position: 'bottom',
          height: 6,
          color: '#FFFFFF',
          opacity: 0.8,
          style: 'solid'
        }
      })
    )
    expect(result.modified).toBe(false)
  })

  it('injects config when enabled', async () => {
    const job = makeJob()
    const result = await progressBarFeature.prepare!(
      job,
      makeOptions({
        progressBarOverlay: {
          enabled: true,
          position: 'bottom',
          height: 6,
          color: '#FFFFFF',
          opacity: 0.8,
          style: 'solid'
        }
      })
    )
    expect(result.modified).toBe(true)
    expect(job.progressBarConfig).toBeDefined()
  })

  it('skips when per-clip override disables', async () => {
    const job = makeJob({ clipOverrides: { enableProgressBar: false } })
    const result = await progressBarFeature.prepare!(
      job,
      makeOptions({
        progressBarOverlay: {
          enabled: true,
          position: 'bottom',
          height: 6,
          color: '#FFFFFF',
          opacity: 0.8,
          style: 'solid'
        }
      })
    )
    expect(result.modified).toBe(false)
  })

  it('overlayPass returns filter_complex with overlay when config set', () => {
    const job = makeJob()
    job.progressBarConfig = {
      enabled: true,
      position: 'bottom',
      height: 6,
      color: '#FFFFFF',
      opacity: 0.8,
      style: 'solid'
    }
    const result = progressBarFeature.overlayPass!(job, {
      clipDuration: 30,
      targetWidth: 1080,
      targetHeight: 1920
    })
    expect(result).not.toBeNull()
    expect(result!.name).toBe('progress-bar')
    expect(result!.filter).toContain('overlay')
    expect(result!.filterComplex).toBe(true)
  })

  it('overlayPass returns null when no config', () => {
    const result = progressBarFeature.overlayPass!(makeJob(), {
      clipDuration: 30,
      targetWidth: 1080,
      targetHeight: 1920
    })
    expect(result).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// AutoZoomFeature
// ---------------------------------------------------------------------------

describe('AutoZoomFeature', () => {
  beforeEach(() => vi.clearAllMocks())

  it('skips when auto-zoom not configured', async () => {
    const result = await autoZoomFeature.prepare!(makeJob(), makeOptions())
    expect(result.modified).toBe(false)
  })

  it('skips when auto-zoom disabled', async () => {
    const result = await autoZoomFeature.prepare!(
      makeJob(),
      makeOptions({
        autoZoom: { enabled: false, mode: 'ken-burns', intensity: 'medium', intervalSeconds: 3 }
      })
    )
    expect(result.modified).toBe(false)
  })

  it('stores settings when enabled', async () => {
    const result = await autoZoomFeature.prepare!(
      makeJob(),
      makeOptions({
        autoZoom: { enabled: true, mode: 'ken-burns', intensity: 'medium', intervalSeconds: 3 }
      })
    )
    expect(result.modified).toBe(true)
  })

  it('skips when per-clip override disables', async () => {
    const job = makeJob({ clipOverrides: { enableAutoZoom: false } })
    const result = await autoZoomFeature.prepare!(
      job,
      makeOptions({
        autoZoom: { enabled: true, mode: 'ken-burns', intensity: 'medium', intervalSeconds: 3 }
      })
    )
    expect(result.modified).toBe(false)
  })

  it('videoFilter returns zoom string when enabled', async () => {
    const job = makeJob()
    await autoZoomFeature.prepare!(
      job,
      makeOptions({
        autoZoom: { enabled: true, mode: 'ken-burns', intensity: 'medium', intervalSeconds: 3 }
      })
    )
    const filter = autoZoomFeature.videoFilter!(job, {
      sourceWidth: 1920,
      sourceHeight: 1080,
      targetWidth: 1080,
      targetHeight: 1920,
      clipDuration: 30,
      outputAspectRatio: '9:16'
    })
    expect(filter).toBeTruthy()
    expect(typeof filter).toBe('string')
  })

  it('videoFilter returns null when disabled', async () => {
    const job = makeJob()
    await autoZoomFeature.prepare!(job, makeOptions())
    const filter = autoZoomFeature.videoFilter!(job, {
      sourceWidth: 1920,
      sourceHeight: 1080,
      targetWidth: 1080,
      targetHeight: 1920,
      clipDuration: 30,
      outputAspectRatio: '9:16'
    })
    expect(filter).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// FillerRemovalFeature
// ---------------------------------------------------------------------------

describe('FillerRemovalFeature', () => {
  beforeEach(() => vi.clearAllMocks())

  it('skips when filler removal not enabled', async () => {
    const feature = createFillerRemovalFeature()
    const result = await feature.prepare!(makeJob(), makeOptions())
    expect(result.modified).toBe(false)
  })

  it('skips when no word timestamps', async () => {
    const feature = createFillerRemovalFeature()
    const job = makeJob({ wordTimestamps: [] })
    const result = await feature.prepare!(
      job,
      makeOptions({
        fillerRemoval: {
          enabled: true,
          removeFillerWords: true,
          trimSilences: false,
          removeRepeats: false,
          silenceThreshold: 0.5
        }
      })
    )
    expect(result.modified).toBe(false)
  })

  it('skips when no fillers detected', async () => {
    const feature = createFillerRemovalFeature()
    const result = await feature.prepare!(
      makeJob(),
      makeOptions({
        fillerRemoval: {
          enabled: true,
          removeFillerWords: true,
          trimSilences: false,
          removeRepeats: false,
          silenceThreshold: 0.5
        }
      })
    )
    // detectFillers mock returns empty segments
    expect(result.modified).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// BrandKitFeature
// ---------------------------------------------------------------------------

describe('BrandKitFeature', () => {
  beforeEach(() => vi.clearAllMocks())

  it('skips when no brand kit config', async () => {
    const result = await brandKitFeature.prepare!(makeJob(), makeOptions())
    expect(result.modified).toBe(false)
  })

  it('skips when brand kit globally disabled', async () => {
    const result = await brandKitFeature.prepare!(
      makeJob(),
      makeOptions({
        brandKit: {
          enabled: false,
          logoPath: '/logo.png',
          logoPosition: 'top-right',
          logoScale: 0.15,
          logoOpacity: 0.8,
          introBumperPath: null,
          outroBumperPath: null
        }
      })
    )
    expect(result.modified).toBe(false)
  })

  it('injects config when globally enabled', async () => {
    const job = makeJob()
    const result = await brandKitFeature.prepare!(
      job,
      makeOptions({
        brandKit: {
          enabled: true,
          logoPath: '/logo.png',
          logoPosition: 'top-right',
          logoScale: 0.15,
          logoOpacity: 0.8,
          introBumperPath: null,
          outroBumperPath: null
        }
      })
    )
    expect(result.modified).toBe(true)
    expect(job.brandKit).toBeDefined()
    expect(job.brandKit!.logoPath).toBe('/logo.png')
  })

  it('per-clip override true overrides global disabled', async () => {
    const job = makeJob({ clipOverrides: { enableBrandKit: true } })
    const result = await brandKitFeature.prepare!(
      job,
      makeOptions({
        brandKit: {
          enabled: false,
          logoPath: '/logo.png',
          logoPosition: 'top-right',
          logoScale: 0.15,
          logoOpacity: 0.8,
          introBumperPath: null,
          outroBumperPath: null
        }
      })
    )
    expect(result.modified).toBe(true)
  })

  it('per-clip override false overrides global enabled', async () => {
    const job = makeJob({ clipOverrides: { enableBrandKit: false } })
    const result = await brandKitFeature.prepare!(
      job,
      makeOptions({
        brandKit: {
          enabled: true,
          logoPath: '/logo.png',
          logoPosition: 'top-right',
          logoScale: 0.15,
          logoOpacity: 0.8,
          introBumperPath: null,
          outroBumperPath: null
        }
      })
    )
    expect(result.modified).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// SoundDesignFeature
// ---------------------------------------------------------------------------

describe('SoundDesignFeature', () => {
  beforeEach(() => vi.clearAllMocks())

  it('skips when no sound placements', async () => {
    const result = await soundDesignFeature.prepare!(makeJob(), makeOptions())
    expect(result.modified).toBe(false)
  })

  it('skips when per-clip override disables', async () => {
    const job = makeJob({
      clipOverrides: { enableSoundDesign: false },
      soundPlacements: [
        { type: 'music', audioPath: '/music.mp3', startTime: 0, volume: 0.3 }
      ]
    })
    const result = await soundDesignFeature.prepare!(job, makeOptions())
    expect(result.modified).toBe(false)
    expect(job.soundPlacements).toBeUndefined()
  })

  it('reports modified when placements exist', async () => {
    const job = makeJob({
      soundPlacements: [
        { type: 'music', audioPath: '/music.mp3', startTime: 0, volume: 0.3 }
      ]
    })
    const result = await soundDesignFeature.prepare!(job, makeOptions())
    expect(result.modified).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// WordEmphasisFeature
// ---------------------------------------------------------------------------

describe('WordEmphasisFeature', () => {
  beforeEach(() => vi.clearAllMocks())

  it('computes emphasis from word timestamps', async () => {
    const job = makeJob()
    const result = await wordEmphasisFeature.prepare!(job, makeOptions())
    expect(result).toBeDefined()
    expect(job.wordEmphasis).toBeDefined()
    expect(job.emphasisKeyframes).toBeDefined()
  })

  it('uses pre-computed wordEmphasis when available', async () => {
    const job = makeJob({
      wordEmphasis: [
        { text: 'Hello', start: 0, end: 0.5, emphasis: 'emphasis' },
        { text: 'world', start: 0.5, end: 1, emphasis: 'normal' }
      ]
    })
    await wordEmphasisFeature.prepare!(job, makeOptions())
    // Should keep the pre-computed emphasis data
    expect(job.wordEmphasis).toHaveLength(2)
    expect(job.emphasisKeyframes).toBeDefined()
    expect(job.emphasisKeyframes!.length).toBeGreaterThanOrEqual(1)
  })

  it('skips when no word timestamps', async () => {
    const job = makeJob({ wordTimestamps: [] })
    const result = await wordEmphasisFeature.prepare!(job, makeOptions())
    expect(result.modified).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// BRollFeature
// ---------------------------------------------------------------------------

describe('BRollFeature', () => {
  beforeEach(() => vi.clearAllMocks())

  it('emits edit events from broll placements', async () => {
    const job = makeJob({
      brollPlacements: [
        {
          startTime: 5,
          duration: 3,
          videoPath: '/broll.mp4',
          keyword: 'test',
          displayMode: 'fullscreen',
          transition: 'crossfade'
        }
      ]
    })
    const result = await brollFeature.prepare!(job, makeOptions())
    expect(result.modified).toBe(true)
    expect(job.editEvents).toHaveLength(1)
    expect(job.editEvents![0].type).toBe('broll-transition')
    expect(job.editEvents![0].time).toBe(5)
  })

  it('does not duplicate existing edit events', async () => {
    const job = makeJob({
      brollPlacements: [
        {
          startTime: 5,
          duration: 3,
          videoPath: '/broll.mp4',
          keyword: 'test',
          displayMode: 'fullscreen',
          transition: 'crossfade'
        }
      ],
      editEvents: [{ type: 'broll-transition', time: 5 }]
    })
    const result = await brollFeature.prepare!(job, makeOptions())
    expect(job.editEvents).toHaveLength(1) // not duplicated
  })

  it('skips when no broll placements', async () => {
    const job = makeJob()
    const result = await brollFeature.prepare!(job, makeOptions())
    expect(result.modified).toBe(false)
  })
})
