// ---------------------------------------------------------------------------
// Color utilities shared across render features.
// ---------------------------------------------------------------------------

/**
 * Derive a lighter tint from a 6-digit hex color by blending it toward white.
 * `amount` is in [0, 1]; 0 returns the input color, 1 returns white.
 */
export function lightenColor(hex: string, amount = 0.4): string {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.substring(0, 2), 16)
  const g = parseInt(clean.substring(2, 4), 16)
  const b = parseInt(clean.substring(4, 6), 16)
  const lr = Math.round(r + (255 - r) * amount)
  const lg = Math.round(g + (255 - g) * amount)
  const lb = Math.round(b + (255 - b) * amount)
  return `#${lr.toString(16).padStart(2, '0')}${lg.toString(16).padStart(2, '0')}${lb.toString(16).padStart(2, '0')}`
}
