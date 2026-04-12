/**
 * Velocity overlay filter — stub
 *
 * High-energy social-media style filter chain. Not yet implemented.
 * The IPC handler catches errors gracefully.
 */

export interface VelocityOptions {
  enabled: boolean
  intensity?: number
  style?: string
}

export function buildVelocityFilterComplex(
  _options: VelocityOptions,
  _width: number,
  _height: number,
  _durationSeconds: number,
  _segmentStart: number
): string {
  throw new Error('Velocity overlay filter is not yet implemented')
}
