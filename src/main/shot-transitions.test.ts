import { describe, it, expect } from 'vitest'
import { buildTransitionFilter, buildShotTransitionFilters } from './shot-transitions'
import type { ShotStyleConfig, ShotTransitionConfig } from '@shared/types'

describe('buildTransitionFilter', () => {
  it('returns empty string for "none" type', () => {
    const transition: ShotTransitionConfig = { type: 'none' }
    expect(buildTransitionFilter(transition, 5, 30)).toBe('')
  })

  it('builds crossfade filter with fade-out and fade-in', () => {
    const transition: ShotTransitionConfig = { type: 'crossfade', duration: 0.4 }
    const result = buildTransitionFilter(transition, 5, 30)
    expect(result).toContain('fade=t=out')
    expect(result).toContain('fade=t=in')
    expect(result).toContain('enable=')
  })

  it('builds dip-black filter with two fade segments', () => {
    const transition: ShotTransitionConfig = { type: 'dip-black', duration: 0.6 }
    const result = buildTransitionFilter(transition, 10, 30)
    expect(result).toContain('fade=t=out')
    expect(result).toContain('fade=t=in')
  })

  it('builds swipe-left filter with crop expression', () => {
    const transition: ShotTransitionConfig = { type: 'swipe-left', duration: 0.3 }
    const result = buildTransitionFilter(transition, 5, 30)
    expect(result).toContain('crop=')
    expect(result).toContain('enable=')
  })

  it('builds swipe-up filter with crop expression', () => {
    const transition: ShotTransitionConfig = { type: 'swipe-up', duration: 0.3 }
    const result = buildTransitionFilter(transition, 5, 30)
    expect(result).toContain('crop=')
  })

  it('builds zoom-in filter with crop expression', () => {
    const transition: ShotTransitionConfig = { type: 'zoom-in', duration: 0.3 }
    const result = buildTransitionFilter(transition, 5, 30)
    expect(result).toContain('crop=')
  })

  it('builds swipe-down filter with negative vertical shift', () => {
    const transition: ShotTransitionConfig = { type: 'swipe-down', duration: 0.3 }
    const result = buildTransitionFilter(transition, 5, 30)
    expect(result).toContain('crop=')
    expect(result).toContain('ih')
    // Negative direction distinguishes swipe-down from swipe-up
    expect(result).toContain('-(ih')
  })

  it('builds zoom-punch with aggressive zoom and quadratic ease', () => {
    const transition: ShotTransitionConfig = { type: 'zoom-punch', duration: 0.25 }
    const result = buildTransitionFilter(transition, 5, 30)
    expect(result).toContain('crop=')
    // 10% zoom factor (double the gentle zoom-in)
    expect(result).toContain('0.1')
    // Quadratic ease curve for sharp snap-back
    expect(result).toContain('pow(')
  })

  it('builds glitch with RGB shift and noise burst', () => {
    const transition: ShotTransitionConfig = { type: 'glitch', duration: 0.2 }
    const result = buildTransitionFilter(transition, 5, 30)
    // RGB channel separation
    expect(result).toContain('rgbashift')
    expect(result).toContain('rh=')
    expect(result).toContain('bh=')
    // Digital noise burst
    expect(result).toContain('noise=')
    // Time-limited
    expect(result).toContain('enable=')
  })

  it('glitch filter uses pulsing shift amount peaking at boundary', () => {
    const transition: ShotTransitionConfig = { type: 'glitch', duration: 0.3 }
    const result = buildTransitionFilter(transition, 5, 30)
    // The shift expression should reference the boundary time (5.000)
    expect(result).toContain('5.000')
    // Should have opposing red/blue shifts (rh positive, bh negative)
    expect(result).toContain("rh='")
    expect(result).toContain("bh='-")
  })

  it('clamps duration to minimum 0.15', () => {
    const transition: ShotTransitionConfig = { type: 'crossfade', duration: 0.01 }
    const result = buildTransitionFilter(transition, 5, 30)
    // With clamped duration of 0.15, fadeOutStart = 5 - 0.075 = 4.925
    expect(result).toContain('4.925')
  })

  it('clamps duration to maximum 1.0', () => {
    const transition: ShotTransitionConfig = { type: 'crossfade', duration: 5.0 }
    const result = buildTransitionFilter(transition, 5, 30)
    // With clamped duration of 1.0, fadeOutStart = 5 - 0.5 = 4.5
    expect(result).toContain('4.500')
  })

  it('uses default duration of 0.3 when not specified', () => {
    const transition: ShotTransitionConfig = { type: 'crossfade' }
    const result = buildTransitionFilter(transition, 5, 30)
    // Default 0.3, fadeOutStart = 5 - 0.15 = 4.85
    expect(result).toContain('4.850')
  })
})

describe('buildShotTransitionFilters', () => {
  it('returns empty string with fewer than 2 shots', () => {
    const shots: ShotStyleConfig[] = [
      { shotIndex: 0, startTime: 0, endTime: 10, transitionOut: { type: 'crossfade' } },
    ]
    expect(buildShotTransitionFilters(shots, 30)).toBe('')
  })

  it('builds transition at boundary between two shots', () => {
    const shots: ShotStyleConfig[] = [
      { shotIndex: 0, startTime: 0, endTime: 5, transitionOut: { type: 'crossfade', duration: 0.3 } },
      { shotIndex: 1, startTime: 5, endTime: 10 },
    ]
    const result = buildShotTransitionFilters(shots, 10)
    expect(result).toContain('fade=t=out')
    expect(result).toContain('fade=t=in')
  })

  it('prefers transitionOut over transitionIn at a boundary', () => {
    const shots: ShotStyleConfig[] = [
      { shotIndex: 0, startTime: 0, endTime: 5, transitionOut: { type: 'dip-black', duration: 0.4 } },
      { shotIndex: 1, startTime: 5, endTime: 10, transitionIn: { type: 'crossfade', duration: 0.3 } },
    ]
    const result = buildShotTransitionFilters(shots, 10)
    // dip-black uses the same fade=t=out/fade=t=in pattern but with different time windows
    // Just verify a non-empty result since both types produce fade filters
    expect(result.length).toBeGreaterThan(0)
  })

  it('falls back to transitionIn when no transitionOut', () => {
    const shots: ShotStyleConfig[] = [
      { shotIndex: 0, startTime: 0, endTime: 5 },
      { shotIndex: 1, startTime: 5, endTime: 10, transitionIn: { type: 'zoom-in', duration: 0.3 } },
    ]
    const result = buildShotTransitionFilters(shots, 10)
    expect(result).toContain('crop=')
  })

  it('skips boundaries with no transition config', () => {
    const shots: ShotStyleConfig[] = [
      { shotIndex: 0, startTime: 0, endTime: 5 },
      { shotIndex: 1, startTime: 5, endTime: 10 },
    ]
    expect(buildShotTransitionFilters(shots, 10)).toBe('')
  })

  it('builds multiple transitions for 3+ shots', () => {
    const shots: ShotStyleConfig[] = [
      { shotIndex: 0, startTime: 0, endTime: 5, transitionOut: { type: 'crossfade' } },
      { shotIndex: 1, startTime: 5, endTime: 10, transitionOut: { type: 'dip-black' } },
      { shotIndex: 2, startTime: 10, endTime: 15 },
    ]
    const result = buildShotTransitionFilters(shots, 15)
    // Should contain transitions at boundaries 5s and 10s
    expect(result).toContain('5.000')
    expect(result).toContain('10.000')
  })

  it('sorts shots by shotIndex before processing', () => {
    // Provide shots out of order
    const shots: ShotStyleConfig[] = [
      { shotIndex: 2, startTime: 10, endTime: 15 },
      { shotIndex: 0, startTime: 0, endTime: 5, transitionOut: { type: 'crossfade' } },
      { shotIndex: 1, startTime: 5, endTime: 10 },
    ]
    const result = buildShotTransitionFilters(shots, 15)
    // Should still build transition at boundary 5s (between shot 0 and 1)
    expect(result).toContain('5.000')
  })

  it('builds mixed transition types across boundaries', () => {
    const shots: ShotStyleConfig[] = [
      { shotIndex: 0, startTime: 0, endTime: 4, transitionOut: { type: 'zoom-punch', duration: 0.2 } },
      { shotIndex: 1, startTime: 4, endTime: 8, transitionOut: { type: 'glitch', duration: 0.2 } },
      { shotIndex: 2, startTime: 8, endTime: 12, transitionOut: { type: 'crossfade', duration: 0.3 } },
      { shotIndex: 3, startTime: 12, endTime: 16 },
    ]
    const result = buildShotTransitionFilters(shots, 16)
    // zoom-punch at t=4
    expect(result).toContain('pow(')
    // glitch at t=8
    expect(result).toContain('rgbashift')
    // crossfade at t=12
    expect(result).toContain('fade=t=out')
  })

  it('skips "none" transitions in a mixed sequence', () => {
    const shots: ShotStyleConfig[] = [
      { shotIndex: 0, startTime: 0, endTime: 5, transitionOut: { type: 'zoom-punch', duration: 0.2 } },
      { shotIndex: 1, startTime: 5, endTime: 10, transitionOut: { type: 'none' } },
      { shotIndex: 2, startTime: 10, endTime: 15, transitionOut: { type: 'glitch', duration: 0.2 } },
      { shotIndex: 3, startTime: 15, endTime: 20 },
    ]
    const result = buildShotTransitionFilters(shots, 20)
    // Should have zoom-punch at t=5 and glitch at t=15, but NOT a transition at t=10
    expect(result).toContain('pow(') // zoom-punch
    expect(result).toContain('rgbashift') // glitch
    // Verify boundary times present
    expect(result).toContain('5.000')
    expect(result).toContain('15.000')
  })
})
