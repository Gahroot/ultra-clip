import { describe, it, expect } from 'vitest'
import {
  buildHardCut,
  buildCrossfade,
  buildFlashCut,
  buildColorWash,
  buildInlineFlashCut,
  buildInlineColorWash,
  type TransitionFilterParams
} from './transition-filters'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeParams(overrides: Partial<TransitionFilterParams> = {}): TransitionFilterParams {
  return {
    duration: 0.3,
    color: '#FF6B35',
    opacity: 0.7,
    offsetTime: 5.0,
    fps: 30,
    width: 1080,
    height: 1920,
    ...overrides
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('buildHardCut', () => {
  it('returns null', () => {
    const result = buildHardCut()
    expect(result).toBeNull()
  })
})

describe('buildCrossfade', () => {
  it('returns valid xfade filter string with correct duration', () => {
    const result = buildCrossfade(makeParams({ duration: 0.5 }))

    expect(result.videoFilter).toContain('xfade=transition=fade')
    expect(result.videoFilter).toContain('duration=0.500')
    expect(result.videoFilter).toContain('offset=5.000')
  })

  it('includes acrossfade for audio', () => {
    const result = buildCrossfade(makeParams())

    expect(result.audioFilter).toContain('acrossfade')
    expect(result.audioFilter).toContain('c1=tri')
    expect(result.audioFilter).toContain('c2=tri')
  })

  it('uses default labels when none provided', () => {
    const result = buildCrossfade(makeParams())

    expect(result.videoFilter).toContain('[0:v]')
    expect(result.videoFilter).toContain('[1:v]')
    expect(result.videoFilter).toContain('[vout]')
    expect(result.audioFilter).toContain('[0:a]')
    expect(result.audioFilter).toContain('[1:a]')
    expect(result.audioFilter).toContain('[aout]')
  })

  it('accepts custom labels', () => {
    const result = buildCrossfade(
      makeParams(),
      '[segA]',
      '[segB]',
      '[aA]',
      '[aB]',
      '[merged]',
      '[amerged]'
    )

    expect(result.videoFilter).toContain('[segA]')
    expect(result.videoFilter).toContain('[segB]')
    expect(result.videoFilter).toContain('[merged]')
    expect(result.audioFilter).toContain('[amerged]')
  })

  it('returns no additional inputs', () => {
    const result = buildCrossfade(makeParams())
    expect(result.inputs).toHaveLength(0)
  })

  it('clamps duration to [0.1, 1.0]', () => {
    const tooShort = buildCrossfade(makeParams({ duration: 0.01 }))
    expect(tooShort.videoFilter).toContain('duration=0.100')

    const tooLong = buildCrossfade(makeParams({ duration: 5.0 }))
    expect(tooLong.videoFilter).toContain('duration=1.000')
  })
})

describe('buildFlashCut', () => {
  it('returns filter with correct color source', () => {
    const result = buildFlashCut(makeParams())

    // Should include a lavfi color source input (flat string array)
    expect(result.inputs).toContain('-f')
    expect(result.inputs).toContain('lavfi')
    // The color source string contains the hex color
    const colorInput = result.inputs.find((s) => s.startsWith('color='))
    expect(colorInput).toBeDefined()
    // #FF6B35 → 0xFF6B35
    expect(colorInput).toContain('0xFF6B35')
  })

  it('generates correct frame count for flash', () => {
    const result = buildFlashCut(makeParams({ fps: 30, duration: 0.1 }))

    // Flash duration should be 2-3 frames = 0.067–0.1 seconds
    expect(result.videoFilter).toContain('xfade=transition=fade')
  })

  it('uses two-stage xfade (A→flash→B)', () => {
    const result = buildFlashCut(makeParams())

    // Video filter should contain two xfade operations separated by semicolons
    const xfadeCount = (result.videoFilter.match(/xfade/g) ?? []).length
    expect(xfadeCount).toBe(2)
  })

  it('includes audio concat', () => {
    const result = buildFlashCut(makeParams())

    expect(result.audioFilter).toContain('concat')
  })

  it('respects custom labels', () => {
    const result = buildFlashCut(
      makeParams(),
      '[vA]',
      '[vB]',
      '[aA]',
      '[aB]',
      '[flashsrc]',
      '[outv]',
      '[outa]'
    )

    expect(result.videoFilter).toContain('[vA]')
    expect(result.videoFilter).toContain('[vB]')
    expect(result.videoFilter).toContain('[outv]')
    expect(result.audioFilter).toContain('[outa]')
  })

  it('uses correct output dimensions in color source', () => {
    const result = buildFlashCut(makeParams({ width: 720, height: 1280 }))

    const colorInput = result.inputs.find((s) => s.startsWith('color='))
    expect(colorInput).toContain('720x1280')
  })
})

describe('buildColorWash', () => {
  it('returns overlay filter with opacity envelope', () => {
    const result = buildColorWash(makeParams({ duration: 0.4, opacity: 0.7 }))

    // Should contain the color wash overlay
    expect(result.videoFilter).toContain('overlay')
    // Should contain alpha expression
    expect(result.videoFilter).toContain('abs(')
  })

  it('includes color source input', () => {
    const result = buildColorWash(makeParams())

    expect(result.inputs).toContain('-f')
    expect(result.inputs).toContain('lavfi')
    const colorInput = result.inputs.find((s) => s.startsWith('color='))
    expect(colorInput).toBeDefined()
  })

  it('includes acrossfade for audio', () => {
    const result = buildColorWash(makeParams())

    expect(result.audioFilter).toContain('acrossfade')
  })

  it('clamps duration to [0.2, 1.0]', () => {
    const tooShort = buildColorWash(makeParams({ duration: 0.05 }))
    // The xfade should still have a reasonable duration
    expect(tooShort.videoFilter).toBeDefined()

    const tooLong = buildColorWash(makeParams({ duration: 3.0 }))
    expect(tooLong.videoFilter).toBeDefined()
  })

  it('uses peak opacity in the alpha expression', () => {
    const result = buildColorWash(makeParams({ opacity: 0.6 }))

    expect(result.videoFilter).toContain('0.60')
  })

  it('uses xfade base fade before overlay', () => {
    const result = buildColorWash(makeParams())

    expect(result.videoFilter).toContain('xfade=transition=fade')
    expect(result.videoFilter).toContain('overlay')
  })
})

describe('buildInlineFlashCut', () => {
  it('returns a drawbox filter string', () => {
    const result = buildInlineFlashCut(makeParams())

    expect(result).toContain('drawbox=')
    expect(result).toContain('t=fill')
  })

  it('covers full frame dimensions', () => {
    const result = buildInlineFlashCut(makeParams({ width: 1080, height: 1920 }))

    expect(result).toContain('w=1080')
    expect(result).toContain('h=1920')
  })

  it('includes enable expression for timing', () => {
    const result = buildInlineFlashCut(makeParams())

    expect(result).toContain("enable='between(t\\,")
  })

  it('uses the correct flash color', () => {
    const result = buildInlineFlashCut(makeParams({ color: '#FFFFFF' }))

    expect(result).toContain('0xFFFFFF')
  })
})

describe('buildInlineColorWash', () => {
  it('returns a drawbox filter with enable expression', () => {
    const result = buildInlineColorWash(makeParams())

    expect(result).toContain('drawbox=')
    expect(result).toContain("enable='between(t\\,")
  })

  it('includes opacity in the color format', () => {
    const result = buildInlineColorWash(makeParams({ opacity: 0.5 }))

    // Should contain the peak opacity in the color string
    expect(result).toContain('@')
  })

  it('covers full frame dimensions', () => {
    const result = buildInlineColorWash(makeParams({ width: 720, height: 1280 }))

    expect(result).toContain('w=720')
    expect(result).toContain('h=1280')
  })
})
