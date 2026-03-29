import { describe, it, expect } from 'vitest'
import { buildColorGradeFilter, buildPiecewiseColorGradeFilter } from './color-grade'
import type { ColorGradeConfig, ShotStyleConfig } from '@shared/types'

describe('buildColorGradeFilter', () => {
  it('returns empty string for "none" preset', () => {
    const config: ColorGradeConfig = { preset: 'none' }
    expect(buildColorGradeFilter(config, 0, 5)).toBe('')
  })

  it('builds eq filter for "warm" preset with enable expression', () => {
    const config: ColorGradeConfig = { preset: 'warm' }
    const result = buildColorGradeFilter(config, 0, 5)
    expect(result).toContain('eq=')
    expect(result).toContain('brightness=0.040')
    expect(result).toContain('saturation=1.300')
    expect(result).toContain('gamma_r=1.100')
    expect(result).toContain('gamma_b=0.900')
    expect(result).toContain("enable='between(t\\,0.000\\,5.000)'")
  })

  it('builds hue filter for "bw" preset', () => {
    const config: ColorGradeConfig = { preset: 'bw' }
    const result = buildColorGradeFilter(config, 2, 8)
    expect(result).toContain('hue=s=0')
    expect(result).toContain("enable='between(t\\,2.000\\,8.000)'")
  })

  it('applies user brightness override additively', () => {
    const config: ColorGradeConfig = { preset: 'warm', brightness: 0.1 }
    const result = buildColorGradeFilter(config, 0, 10)
    // warm base brightness=0.04, + 0.1 = 0.14
    expect(result).toContain('brightness=0.140')
  })

  it('applies user contrast override multiplicatively', () => {
    const config: ColorGradeConfig = { preset: 'cinematic', contrast: 1.5 }
    const result = buildColorGradeFilter(config, 0, 10)
    // cinematic base contrast=1.2, * 1.5 = 1.8
    expect(result).toContain('contrast=1.800')
  })

  it('applies user saturation override multiplicatively', () => {
    const config: ColorGradeConfig = { preset: 'cool', saturation: 0.5 }
    const result = buildColorGradeFilter(config, 0, 10)
    // cool base saturation=1.1, * 0.5 = 0.55
    expect(result).toContain('saturation=0.550')
  })

  it('builds correct filter for all non-none presets', () => {
    const presets: ColorGradeConfig['preset'][] = ['warm', 'cool', 'cinematic', 'vintage', 'high-contrast', 'bw', 'film']
    for (const preset of presets) {
      const result = buildColorGradeFilter({ preset }, 0, 10)
      expect(result.length).toBeGreaterThan(0)
      expect(result).toContain('enable=')
    }
  })
})

describe('buildPiecewiseColorGradeFilter', () => {
  it('returns empty string when no shots have color grades', () => {
    const shots: ShotStyleConfig[] = [
      { shotIndex: 0, startTime: 0, endTime: 5 },
      { shotIndex: 1, startTime: 5, endTime: 10 },
    ]
    expect(buildPiecewiseColorGradeFilter(shots)).toBe('')
  })

  it('builds chained filters for multiple shots with different grades', () => {
    const shots: ShotStyleConfig[] = [
      { shotIndex: 0, startTime: 0, endTime: 5, colorGrade: { preset: 'warm' } },
      { shotIndex: 1, startTime: 5, endTime: 10, colorGrade: { preset: 'bw' } },
    ]
    const result = buildPiecewiseColorGradeFilter(shots)
    expect(result).toContain('eq=')
    expect(result).toContain('hue=')
    expect(result).toContain('0.000\\,5.000')
    expect(result).toContain('5.000\\,10.000')
  })

  it('uses global grade as fallback for shots without colorGrade', () => {
    const shots: ShotStyleConfig[] = [
      { shotIndex: 0, startTime: 0, endTime: 5, colorGrade: { preset: 'warm' } },
      { shotIndex: 1, startTime: 5, endTime: 10 }, // no colorGrade
    ]
    const result = buildPiecewiseColorGradeFilter(shots, { preset: 'cool' })
    // Both time ranges should be present (shot 1 uses global fallback)
    expect(result).toContain('0.000\\,5.000')
    expect(result).toContain('5.000\\,10.000')
  })

  it('skips shots with colorGrade explicitly set to null', () => {
    const shots: ShotStyleConfig[] = [
      { shotIndex: 0, startTime: 0, endTime: 5, colorGrade: null },
      { shotIndex: 1, startTime: 5, endTime: 10, colorGrade: { preset: 'warm' } },
    ]
    const result = buildPiecewiseColorGradeFilter(shots)
    expect(result).not.toContain('0.000\\,5.000')
    expect(result).toContain('5.000\\,10.000')
  })
})
