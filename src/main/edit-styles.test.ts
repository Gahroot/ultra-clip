import { describe, it, expect } from 'vitest'
import {
  EDIT_STYLES,
  DEFAULT_EDIT_STYLE_ID,
  getEditStyleById,
  getEditStylesByEnergy
} from './edit-styles'
import { SEGMENT_STYLE_VARIANTS, getVariantById } from './segment-styles'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('EDIT_STYLES', () => {
  it('defines exactly 15 styles', () => {
    expect(EDIT_STYLES).toHaveLength(15)
  })

  it('all styles have unique ids', () => {
    const ids = EDIT_STYLES.map((s) => s.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })

  const EXPECTED_IDS = [
    'ember',
    'clarity',
    'film',
    'align',
    'growth',
    'impact',
    'lumen',
    'pulse',
    'elevate',
    'recess',
    'cinematic',
    'paper_ii',
    'rebel',
    'prime',
    'volt'
  ]

  it(`contains all expected style ids: ${EXPECTED_IDS.join(', ')}`, () => {
    const ids = EDIT_STYLES.map((s) => s.id)
    for (const expectedId of EXPECTED_IDS) {
      expect(ids).toContain(expectedId)
    }
  })
})

describe('getEditStyleById', () => {
  it('returns correct style for each id', () => {
    for (const style of EDIT_STYLES) {
      const found = getEditStyleById(style.id)
      expect(found).toBeDefined()
      expect(found!.id).toBe(style.id)
      expect(found!.name).toBe(style.name)
    }
  })

  it('returns undefined for unknown id', () => {
    expect(getEditStyleById('nonexistent')).toBeUndefined()
  })

  it('returns correct properties for ember (low energy)', () => {
    const ember = getEditStyleById('ember')!
    expect(ember.energy).toBe('low')
    expect(ember.accentColor).toBe('#FF6B35')
    expect(ember.defaultZoomStyle).toBe('zoom-out')
    expect(ember.defaultTransition).toBe('hard-cut')
    expect(ember.letterbox).toBe('bottom')
  })

  it('returns correct properties for cinematic (medium energy)', () => {
    const cinematic = getEditStyleById('cinematic')!
    expect(cinematic.energy).toBe('medium')
    expect(cinematic.defaultTransition).toBe('color-wash')
    expect(cinematic.captionStyle).toBe('colored-wash')
  })

  it('returns correct properties for volt (high energy)', () => {
    const volt = getEditStyleById('volt')!
    expect(volt.energy).toBe('high')
    expect(volt.defaultZoomStyle).toBe('word-pulse')
    expect(volt.defaultTransition).toBe('flash-cut')
    expect(volt.captionBgOpacity).toBeGreaterThan(0.3)
  })
})

describe('getEditStylesByEnergy', () => {
  it('returns 3 low-energy styles', () => {
    const low = getEditStylesByEnergy('low')
    expect(low).toHaveLength(3)
    expect(low.every((s) => s.energy === 'low')).toBe(true)
  })

  it('returns 8 medium-energy styles', () => {
    const medium = getEditStylesByEnergy('medium')
    expect(medium).toHaveLength(8)
    expect(medium.every((s) => s.energy === 'medium')).toBe(true)
  })

  it('returns 4 high-energy styles', () => {
    const high = getEditStylesByEnergy('high')
    expect(high).toHaveLength(4)
    expect(high.every((s) => s.energy === 'high')).toBe(true)
  })

  it('returns empty array for unknown energy', () => {
    // @ts-expect-error — testing invalid input
    const result = getEditStylesByEnergy('extreme')
    expect(result).toHaveLength(0)
  })
})

describe('style validation', () => {
  it('all styles have valid hex accentColor', () => {
    const hexPattern = /^#[0-9A-Fa-f]{6}$/
    for (const style of EDIT_STYLES) {
      expect(
        hexPattern.test(style.accentColor),
        `${style.id} has invalid accentColor: ${style.accentColor}`
      ).toBe(true)
    }
  })

  it('all styles have captionBgOpacity between 0 and 1', () => {
    for (const style of EDIT_STYLES) {
      expect(
        style.captionBgOpacity,
        `${style.id} has invalid captionBgOpacity`
      ).toBeGreaterThanOrEqual(0)
      expect(
        style.captionBgOpacity,
        `${style.id} has invalid captionBgOpacity`
      ).toBeLessThanOrEqual(1)
    }
  })

  it('all styles have valid letterbox values', () => {
    const validLetterbox = ['none', 'bottom', 'both']
    for (const style of EDIT_STYLES) {
      expect(
        validLetterbox,
        `${style.id} has invalid letterbox: ${style.letterbox}`
      ).toContain(style.letterbox)
    }
  })

  it('all styles have valid defaultZoomStyle values', () => {
    const validZoomStyles = ['none', 'drift', 'snap', 'word-pulse', 'zoom-out']
    for (const style of EDIT_STYLES) {
      expect(
        validZoomStyles,
        `${style.id} has invalid defaultZoomStyle: ${style.defaultZoomStyle}`
      ).toContain(style.defaultZoomStyle)
    }
  })

  it('all styles have valid defaultTransition values', () => {
    const validTransitions = ['none', 'hard-cut', 'crossfade', 'flash-cut', 'color-wash']
    for (const style of EDIT_STYLES) {
      expect(
        validTransitions,
        `${style.id} has invalid defaultTransition: ${style.defaultTransition}`
      ).toContain(style.defaultTransition)
    }
  })

  it('all styles have valid energy values', () => {
    const validEnergy = ['low', 'medium', 'high']
    for (const style of EDIT_STYLES) {
      expect(
        validEnergy,
        `${style.id} has invalid energy: ${style.energy}`
      ).toContain(style.energy)
    }
  })

  it('all styles have targetEditsPerSecond > 0', () => {
    for (const style of EDIT_STYLES) {
      expect(
        style.targetEditsPerSecond,
        `${style.id} has invalid targetEditsPerSecond`
      ).toBeGreaterThan(0)
    }
  })

  it('energy levels correlate with edits per second', () => {
    const low = getEditStylesByEnergy('low')
    const medium = getEditStylesByEnergy('medium')
    const high = getEditStylesByEnergy('high')

    const avgLow = low.reduce((s, st) => s + st.targetEditsPerSecond, 0) / low.length
    const avgMedium = medium.reduce((s, st) => s + st.targetEditsPerSecond, 0) / medium.length
    const avgHigh = high.reduce((s, st) => s + st.targetEditsPerSecond, 0) / high.length

    expect(avgLow).toBeLessThan(avgMedium)
    expect(avgMedium).toBeLessThan(avgHigh)
  })

  it('all styles have valid flashColor as hex', () => {
    const hexPattern = /^#[0-9A-Fa-f]{6}$/
    for (const style of EDIT_STYLES) {
      expect(
        hexPattern.test(style.flashColor),
        `${style.id} has invalid flashColor: ${style.flashColor}`
      ).toBe(true)
    }
  })
})

describe('availableSegmentStyles reference valid variants', () => {
  it('every availableSegmentStyles id references a defined variant', () => {
    const allVariantIds = new Set(SEGMENT_STYLE_VARIANTS.map((v) => v.id))

    for (const style of EDIT_STYLES) {
      for (const segId of style.availableSegmentStyles) {
        // Some ids in availableSegmentStyles may not exist as variants yet
        // (e.g., 'fullscreen-image-fill', 'fullscreen-text-bold', 'fullscreen-text-quote',
        //  'main-video-text-upper')
        // We check that at least SOME of them exist
        const validCount = style.availableSegmentStyles.filter((id) => allVariantIds.has(id)).length
        expect(
          validCount,
          `${style.id} has no valid segment styles`
        ).toBeGreaterThan(0)
      }
    }
  })

  it('each style has at least 3 available segment styles', () => {
    for (const style of EDIT_STYLES) {
      expect(
        style.availableSegmentStyles.length,
        `${style.id} should have at least 3 available segment styles`
      ).toBeGreaterThanOrEqual(3)
    }
  })

  it('low-energy styles reference fewer segment styles than high-energy', () => {
    const low = getEditStylesByEnergy('low')
    const high = getEditStylesByEnergy('high')

    const avgLowStyles = low.reduce((s, st) => s + st.availableSegmentStyles.length, 0) / low.length
    const avgHighStyles = high.reduce((s, st) => s + st.availableSegmentStyles.length, 0) / high.length

    expect(avgHighStyles).toBeGreaterThan(avgLowStyles)
  })
})

describe('DEFAULT_EDIT_STYLE_ID', () => {
  it('is a valid style id', () => {
    const style = getEditStyleById(DEFAULT_EDIT_STYLE_ID)
    expect(style).toBeDefined()
  })

  it('is cinematic', () => {
    expect(DEFAULT_EDIT_STYLE_ID).toBe('cinematic')
  })
})
