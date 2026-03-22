import { describe, it, expect } from 'vitest'
import { cn } from './utils'

describe('cn', () => {
  it('merges two class strings', () => {
    expect(cn('a', 'b')).toBe('a b')
  })

  it('ignores falsy values', () => {
    expect(cn('a', undefined, null, false, 'b')).toBe('a b')
  })

  it('deduplicates tailwind utility classes', () => {
    // twMerge deduplicates conflicting Tailwind utilities; last wins
    const result = cn('px-2', 'px-4')
    expect(result).toBe('px-4')
    expect(result).not.toContain('px-2')
  })

  it('resolves tailwind conflicts (last one wins)', () => {
    // twMerge should pick the last conflicting class
    const result = cn('p-2', 'p-4')
    expect(result).toBe('p-4')
    expect(result).not.toContain('p-2')
  })

  it('resolves tailwind text color conflicts', () => {
    const result = cn('text-red-500', 'text-blue-500')
    expect(result).toBe('text-blue-500')
    expect(result).not.toContain('text-red-500')
  })

  it('preserves non-conflicting tailwind classes', () => {
    const result = cn('p-4', 'text-center', 'font-bold')
    expect(result).toContain('p-4')
    expect(result).toContain('text-center')
    expect(result).toContain('font-bold')
  })

  it('handles an empty call', () => {
    expect(cn()).toBe('')
  })

  it('handles conditional objects', () => {
    expect(cn({ active: true, hidden: false })).toBe('active')
  })

  it('handles arrays of classes', () => {
    expect(cn(['a', 'b'], 'c')).toBe('a b c')
  })
})
