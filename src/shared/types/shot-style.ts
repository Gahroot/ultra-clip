import type { CaptionAnimation } from './captions'
import type { ZoomIntensity, ZoomMode } from './overlays'
import type { ColorGradeConfig } from './color-grade'
import type { ShotTransitionConfig } from './shot-transitions'
import type { MusicTrack } from './sound-design'

/**
 * Assignment of a style preset to a single shot segment within a clip.
 *
 * The `shotIndex` corresponds to the index in the `ClipCandidate.shots` array.
 * When present on a `RenderClipJob`, the render pipeline resolves the preset
 * by ID and applies its settings only during that shot's time range.
 *
 * Shot indices not present in the array fall back to the global batch style.
 */
export interface ShotStyleAssignment {
  /** 0-based index into the clip's `shots` array. */
  shotIndex: number
  /**
   * ID of the EditStylePreset to apply during this shot's time range.
   * Must match a preset in the store's `editStylePresets` array.
   * When empty or undefined, the global batch style is used for this shot.
   */
  presetId: string
}

/**
 * Resolved style configuration for a single shot — the concrete rendering
 * parameters extracted from a style preset, ready for the render engine.
 *
 * Built by `resolveShotStyles()` at IPC time from `ShotStyleAssignment[]`
 * + the preset definitions. Carried on `RenderClipJob.shotStyleConfigs`.
 */
export interface ShotStyleConfig {
  /** 0-based shot index (matches ShotSegment position in clip.shots). */
  shotIndex: number
  /** Clip-relative start time in seconds. */
  startTime: number
  /** Clip-relative end time in seconds. */
  endTime: number
  /** Caption style override for this shot. `null` = use global. */
  captionStyle?: {
    animation: CaptionAnimation
    primaryColor: string
    highlightColor: string
    outlineColor: string
    emphasisColor?: string
    supersizeColor?: string
    fontSize: number
    outline: number
    shadow: number
    borderStyle: number
    wordsPerLine: number
    fontName: string
    backColor: string
  } | null
  /** Zoom settings override for this shot. `null` = use global. */
  zoom?: {
    mode: ZoomMode
    intensity: ZoomIntensity
    intervalSeconds: number
  } | null
  /** Color treatment for this shot. `null` = use global. */
  colorGrade?: ColorGradeConfig | null
  /** Transition INTO this shot (from previous shot). `null` = hard cut. */
  transitionIn?: ShotTransitionConfig | null
  /** Transition OUT of this shot (to next shot). `null` = hard cut. */
  transitionOut?: ShotTransitionConfig | null
  /** B-Roll display mode override for this shot. `null` = use global. */
  brollMode?: 'fullscreen' | 'split-top' | 'split-bottom' | 'pip' | null
  /** Background music track for this shot. `null` = use global. */
  musicTrack?: MusicTrack | null
}
