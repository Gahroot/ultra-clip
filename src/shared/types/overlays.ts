/** Zoom motion intensity for Ken Burns effect. */
export type ZoomIntensity = 'subtle' | 'medium' | 'dynamic'

/**
 * Zoom animation mode.
 * - ken-burns:  smooth sinusoidal breathing zoom (default)
 * - reactive:   zoom responds to word emphasis moments (keyframe-driven)
 * - jump-cut:   instant zoom level changes that simulate multi-camera editing
 */
export type ZoomMode = 'ken-burns' | 'reactive' | 'jump-cut'

/** Visual style for the hook title overlay. */
export type HookTitleStyle = 'centered-bold' | 'top-bar' | 'slide-in'

/** Visual style for the mid-clip re-hook / pattern interrupt overlay. */
export type RehookStyle = 'bar' | 'text-only' | 'slide-up'

/** Visual rendering style for the progress bar. */
export type ProgressBarStyle = 'solid' | 'gradient' | 'glow'

/** Which edge of the frame the progress bar is anchored to. */
export type ProgressBarPosition = 'top' | 'bottom'

/** Position of the brand logo watermark on the frame. */
export type LogoPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
