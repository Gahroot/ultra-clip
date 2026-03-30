import { describe, it, expect } from 'vitest'
import {
  buildDriftZoom,
  buildSnapZoom,
  buildWordPulseZoom,
  buildZoomOutReveal,
  type ZoomFilterParams
} from './zoom-filters'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeParams(overrides: Partial<ZoomFilterParams> = {}): ZoomFilterParams {
  return {
    width: 1080,
    height: 1920,
    fps: 30,
    duration: 8,
    zoomIntensity: 1.1,
    startTime: 0,
    emphasisTimestamps: [],
    panDirection: 'center',
    faceYNorm: 0.38,
    ...overrides
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('buildDriftZoom', () => {
  it('returns a valid FFmpeg filter string', () => {
    const result = buildDriftZoom(makeParams())

    expect(result).toContain('crop=')
    expect(result).toContain('scale=1080:1920')
  })

  it('includes zoom expression in crop dimensions', () => {
    const result = buildDriftZoom(makeParams({ zoomIntensity: 1.15 }))

    // The zoom expression should be present in crop width/height
    expect(result).toContain('iw/')
    expect(result).toContain('ih/')
  })

  it('supports left-right pan direction', () => {
    const result = buildDriftZoom(makeParams({ panDirection: 'left-right' }))

    // Pan expression should add an offset
    expect(result).toContain('crop=')
    expect(result).toContain('scale=')
  })

  it('supports right-left pan direction', () => {
    const result = buildDriftZoom(makeParams({ panDirection: 'right-left' }))

    expect(result).toContain('crop=')
    expect(result).toContain('scale=')
  })

  it('returns empty string for zero duration', () => {
    const result = buildDriftZoom(makeParams({ duration: 0 }))
    expect(result).toBe('')
  })

  it('returns empty string for negative duration', () => {
    const result = buildDriftZoom(makeParams({ duration: -1 }))
    expect(result).toBe('')
  })

  it('handles intensity of 1.0 (no zoom)', () => {
    const result = buildDriftZoom(makeParams({ zoomIntensity: 1.0 }))
    // Still produces a filter, just no actual zoom (A = 0)
    expect(result).toContain('crop=')
  })

  it('uses startTime for the zoom progress calculation', () => {
    const result0 = buildDriftZoom(makeParams({ startTime: 0 }))
    const result10 = buildDriftZoom(makeParams({ startTime: 10 }))

    // Different start times produce different expressions
    expect(result0).not.toBe(result10)
    expect(result10).toContain('10.000')
  })
})

describe('buildSnapZoom', () => {
  it('returns empty string when no emphasis timestamps provided', () => {
    const result = buildSnapZoom(makeParams({ emphasisTimestamps: [] }))
    expect(result).toBe('')
  })

  it('returns valid filter with emphasis timestamps', () => {
    const result = buildSnapZoom(
      makeParams({
        emphasisTimestamps: [
          { time: 2.0, duration: 0.5 },
          { time: 5.0, duration: 0.3 }
        ]
      })
    )

    expect(result).toContain('crop=')
    expect(result).toContain('scale=1080:1920')
    // Should contain if(between(...)) for the piecewise zoom
    expect(result).toContain('if(between(')
  })

  it('generates frame-level expressions for snap zoom', () => {
    const result = buildSnapZoom(
      makeParams({
        zoomIntensity: 1.15,
        emphasisTimestamps: [{ time: 3.0, duration: 0.4 }]
      })
    )

    // Zoom intensity should appear in the expression
    expect(result).toContain('1.15')
    // Ramp-in and ramp-out expressions
    expect(result).toContain('if(between(')
  })

  it('returns empty string for zero duration', () => {
    const result = buildSnapZoom(
      makeParams({
        duration: 0,
        emphasisTimestamps: [{ time: 0, duration: 0.5 }]
      })
    )
    expect(result).toBe('')
  })

  it('handles single emphasis timestamp', () => {
    const result = buildSnapZoom(
      makeParams({
        emphasisTimestamps: [{ time: 4.0, duration: 0.6 }]
      })
    )

    expect(result).toContain('crop=')
  })
})

describe('buildWordPulseZoom', () => {
  it('returns empty string when no emphasis timestamps provided', () => {
    const result = buildWordPulseZoom(makeParams({ emphasisTimestamps: [] }))
    expect(result).toBe('')
  })

  it('generates zoom keyframes for each word', () => {
    const words = [
      { time: 0, duration: 0.5 },
      { time: 1, duration: 0.5 },
      { time: 2, duration: 0.5 },
      { time: 3, duration: 0.5 }
    ]
    const result = buildWordPulseZoom(
      makeParams({ emphasisTimestamps: words, zoomIntensity: 1.08 })
    )

    expect(result).toContain('crop=')
    expect(result).toContain('scale=')
    // Should have cosine-based ease-in-out
    expect(result).toContain('cos(')
  })

  it('returns empty string for zero duration', () => {
    const result = buildWordPulseZoom(
      makeParams({
        duration: 0,
        emphasisTimestamps: [{ time: 0, duration: 0.5 }]
      })
    )
    expect(result).toBe('')
  })

  it('handles intensity of 1.0 gracefully', () => {
    const result = buildWordPulseZoom(
      makeParams({
        zoomIntensity: 1.0,
        emphasisTimestamps: [{ time: 1, duration: 0.5 }]
      })
    )

    // A = 0, so zoom is always 1 (no pulse), but the filter is still produced
    expect(result).toContain('crop=')
  })

  it('uses startTime to compute absolute pulse positions', () => {
    const result = buildWordPulseZoom(
      makeParams({
        startTime: 5.0,
        emphasisTimestamps: [{ time: 2.0, duration: 0.5 }]
      })
    )

    // Absolute start = 5.0 + 2.0 = 7.0
    expect(result).toContain('7.000')
  })
})

describe('buildZoomOutReveal', () => {
  it('starts zoomed and ends at 1.0×', () => {
    const result = buildZoomOutReveal(makeParams({ zoomIntensity: 1.2 }))

    expect(result).toContain('crop=')
    expect(result).toContain('scale=1080:1920')
    // The expression should contain the zoom intensity
    expect(result).toContain('1.2')
  })

  it('returns valid filter string with correct structure', () => {
    const result = buildZoomOutReveal(makeParams())

    // Should have crop and scale components
    const parts = result.split(',scale=')
    expect(parts).toHaveLength(2)
    expect(parts[0]).toContain('crop=w=')
    expect(parts[1]).toBe('1080:1920')
  })

  it('returns empty string for zero duration', () => {
    const result = buildZoomOutReveal(makeParams({ duration: 0 }))
    expect(result).toBe('')
  })

  it('returns empty string for negative duration', () => {
    const result = buildZoomOutReveal(makeParams({ duration: -5 }))
    expect(result).toBe('')
  })

  it('handles intensity of 1.0 (no zoom out needed)', () => {
    const result = buildZoomOutReveal(makeParams({ zoomIntensity: 1.0 }))
    // Still produces a filter string; A = 0 so z = 1 always
    expect(result).toContain('crop=')
  })

  it('respects startTime in the progress calculation', () => {
    const result = buildZoomOutReveal(makeParams({ startTime: 3.0 }))

    expect(result).toContain('3.000')
  })
})

describe('edge cases across all builders', () => {
  it('all builders return empty string for zero duration', () => {
    const params = makeParams({ duration: 0 })
    expect(buildDriftZoom(params)).toBe('')
    expect(buildSnapZoom(params)).toBe('')
    expect(buildWordPulseZoom(params)).toBe('')
    expect(buildZoomOutReveal(params)).toBe('')
  })

  it('all builders produce scale matching output dimensions', () => {
    const params = makeParams({ width: 720, height: 1280, emphasisTimestamps: [{ time: 2, duration: 0.5 }] })
    expect(buildDriftZoom(params)).toContain('scale=720:1280')
    expect(buildSnapZoom(params)).toContain('scale=720:1280')
    expect(buildWordPulseZoom(params)).toContain('scale=720:1280')
    expect(buildZoomOutReveal(params)).toContain('scale=720:1280')
  })
})
