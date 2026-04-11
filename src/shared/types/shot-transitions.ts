/** Visual transition type between shots within a clip. */
export type ShotTransitionType =
  | 'none'         // Hard cut (no transition effect)
  | 'crossfade'    // Alpha dissolve between shots
  | 'dip-black'    // Fade to black then fade up
  | 'swipe-left'   // Horizontal wipe left
  | 'swipe-up'     // Vertical wipe up
  | 'swipe-down'   // Vertical wipe down
  | 'zoom-in'      // Gentle zoom push into next shot
  | 'zoom-punch'   // Aggressive snap-zoom at boundary (punchy, energetic)
  | 'glitch'       // Brief digital glitch distortion (RGB shift + noise burst)

/** Transition configuration for a shot boundary. */
export interface ShotTransitionConfig {
  type: ShotTransitionType
  /** Transition duration in seconds (0.15–1.0). Default: 0.3 */
  duration?: number
}

/**
 * Maps each shot transition type to its signature SFX name.
 * The sound design system uses this to automatically place the right
 * audio hit at each transition boundary — making transitions feel intentional.
 * `null` means no SFX (hard cut is silent by design).
 */
export const SHOT_TRANSITION_SFX: Record<ShotTransitionType, string | null> = {
  'none':        null,                // Hard cut — silence IS the sound
  'crossfade':   'whoosh-soft',       // Gentle breath to match the dissolve
  'dip-black':   'whoosh-soft',       // Soft whoosh into darkness
  'swipe-left':  'swipe-transition',  // Directional swipe swoosh
  'swipe-up':    'swipe-transition',  // Directional swipe swoosh
  'swipe-down':  'swipe-transition',  // Directional swipe swoosh
  'zoom-in':     'impact-low',        // Subtle punch on the zoom push
  'zoom-punch':  'impact-high',       // Hard slam — the signature Velocity hit
  'glitch':      'glitch-hit',        // Digital crunch/static burst
}
