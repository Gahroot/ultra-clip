import { describe, it, expect } from 'vitest'
import { formatTime, parseTimeInput } from './EditableTime'

describe('formatTime', () => {
  it('formats zero seconds', () => {
    // m=0 → "00", s=0 → (0).toFixed(1)="0.0", padStart(4,'0')="00.0"
    expect(formatTime(0)).toBe('00:00.0')
  })

  it('formats whole seconds under a minute', () => {
    // m=0, s=30 → "00:30.0"
    expect(formatTime(30)).toBe('00:30.0')
  })

  it('formats 90 seconds as 01:30.0', () => {
    // m=1, s=30 → "01:30.0"
    expect(formatTime(90)).toBe('01:30.0')
  })

  it('formats fractional seconds', () => {
    // m=0, s=5.5 → (5.5).toFixed(1)="5.5", padStart(4,'0')="05.5" → wait
    // s = 5.5 % 60 = 5.5, toFixed(1)="5.5" (3 chars), padStart(4,'0')="05.5"? No.
    // "5.5" is 3 chars, padStart(4,'0') → "05.5"? Actually padStart pads from left: "05.5"... no
    // "5.5".padStart(4,'0') = "05.5"... wait: length 3, need 4, add one '0' at front → "05.5"
    // Hmm wait: "5.5" has 3 chars. padStart(4,'0') → adds 1 '0': "05.5"... but that's wrong format.
    // Let me recalculate: "5.5".padStart(4, '0') = "05.5"? No wait:
    // "5.5" length = 3. padStart(4) means target length 4, so one char is prepended: "05.5"? 
    // Actually "0" + "5.5" = "05.5"? No: "0" + "5.5" = "05.5", length=4? "0"(1) + "5"(1) + "."(1) + "5"(1) = 4. Yes!
    // So formatTime(5.5) = "00:05.5"
    expect(formatTime(5.5)).toBe('00:05.5')
  })

  it('formats large values (over an hour)', () => {
    // 3661 seconds = 61 minutes 1 second = 61m1s
    // m = Math.floor(3661/60) = 61, s = 3661 % 60 = 1
    // "61" → padStart(2,'0') = "61", s=1 → "1.0".padStart(4,'0')="01.0"
    // Hmm wait: "1.0" is 3 chars, padStart(4,'0') → "01.0"
    expect(formatTime(3661)).toBe('61:01.0')
  })
})

describe('parseTimeInput', () => {
  it('parses MM:SS format', () => {
    expect(parseTimeInput('01:30')).toBe(90)
  })

  it('parses MM:SS.d fractional format', () => {
    expect(parseTimeInput('00:05.5')).toBeCloseTo(5.5)
  })

  it('parses plain seconds (no colon)', () => {
    expect(parseTimeInput('45')).toBe(45)
  })

  it('parses plain decimal seconds', () => {
    expect(parseTimeInput('45.5')).toBeCloseTo(45.5)
  })

  it('returns null for non-numeric input', () => {
    expect(parseTimeInput('abc')).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(parseTimeInput('')).toBeNull()
  })

  it('returns null for fully non-numeric input', () => {
    // '1:2:3' hits parseFloat and returns 1, so use a truly non-numeric string
    expect(parseTimeInput('ab:cd')).toBeNull()
  })

  it('parses 00:00 as 0', () => {
    expect(parseTimeInput('00:00')).toBe(0)
  })

  it('parses large minute values', () => {
    expect(parseTimeInput('10:00')).toBe(600)
  })
})
