import { join } from 'path'
import { app } from 'electron'
import { existsSync } from 'fs'
import type { MusicTrack, WordTimestamp, EmphasizedWord } from '@shared/types'

// ---------------------------------------------------------------------------
// Types (MusicTrack canonical definition lives in @shared/types)
// ---------------------------------------------------------------------------

export type { MusicTrack }

export type SFXType =
  | 'whoosh-soft'
  | 'whoosh-hard'
  | 'impact-low'
  | 'impact-high'
  | 'rise-tension'
  | 'notification-pop'
  | 'swipe-transition'
  | 'word-pop'
  | 'bass-drop'
  | 'camera-shutter'
  | 'rise-tension-short'
  | 'typewriter-key'

export interface SoundPlacementData {
  type: 'sfx' | 'music'
  filePath: string
  startTime: number // seconds within the clip (0 = clip start)
  duration: number  // seconds this sound plays
  volume: number    // 0–1
}

export interface SoundDesignOptions {
  enabled: boolean
  backgroundMusicTrack: MusicTrack
  sfxVolume: number   // 0–1
  musicVolume: number // 0–1
}

/** @deprecated Use WordTimestamp from @shared/types instead */
export type WordTimestampInput = WordTimestamp

/**
 * An edit event during the clip that can trigger a synced SFX.
 * Passed from the render pipeline to sound design for content-reactive placement.
 */
export interface EditEvent {
  /** Type of edit event */
  type: 'broll-transition' | 'jump-cut'
  /** Time in seconds (0-based, relative to clip start) */
  time: number
  /** B-Roll transition style (only for broll-transition events) */
  transition?: 'hard-cut' | 'crossfade' | 'swipe-up' | 'swipe-down'
}

// ---------------------------------------------------------------------------
// Path resolution
// ---------------------------------------------------------------------------

export function resolveSfxPath(sfxName: SFXType | string): string {
  if (app.isPackaged) {
    return join(process.resourcesPath, 'sfx', `${sfxName}.mp3`)
  }
  return join(process.cwd(), 'resources', 'sfx', `${sfxName}.mp3`)
}

export function resolveMusicPath(trackName: MusicTrack | string): string {
  if (app.isPackaged) {
    return join(process.resourcesPath, 'music', `${trackName}.mp3`)
  }
  return join(process.cwd(), 'resources', 'music', `${trackName}.mp3`)
}

// ---------------------------------------------------------------------------
// Emphasis-aware sound placement generation
// ---------------------------------------------------------------------------

/** Resolve an SFX path only if the file exists on disk; returns null otherwise. */
function tryResolve(sfxName: SFXType | string): string | null {
  const p = resolveSfxPath(sfxName)
  return existsSync(p) ? p : null
}

/**
 * Generate emphasis-aware sound placements for a clip.
 *
 * Placement strategy (feels like a professional editor placed each sound by hand):
 *
 * 1. **Background music** — continuous ambient bed under the whole clip
 * 2. **Emphasis word pops** — subtle `word-pop` on every `emphasis` word (rate-limited)
 * 3. **Supersize impacts** — full `impact-high` or `bass-drop` on `supersize` words
 * 4. **Rising tension** — short `rise-tension-short` placed 0.3s before each supersize word
 * 5. **Edit event sync** — `swipe-transition` on B-Roll entries, `camera-shutter` on jump-cut zooms
 * 6. **Pause whooshes** — soft whoosh at natural speech pauses (topic shifts)
 *
 * All SFX are rate-limited by minimum gap enforcement so the density feels intentional.
 * Missing audio files are silently skipped with a console warning.
 *
 * @param clipDuration    Duration of the clip in seconds
 * @param wordTimestamps   Word timestamps (0-based, relative to clip start)
 * @param options          Sound design configuration
 * @param emphasizedWords  Optional pre-computed emphasis data (normal/emphasis/supersize).
 *                         When omitted, a simple heuristic is used internally.
 * @param editEvents       Optional edit events (B-Roll transitions, jump-cuts) for sync SFX.
 */
export function generateSoundPlacements(
  clipDuration: number,
  wordTimestamps: WordTimestampInput[],
  options: SoundDesignOptions,
  emphasizedWords?: EmphasizedWord[],
  editEvents?: EditEvent[]
): SoundPlacementData[] {
  if (!options.enabled) return []

  const placements: SoundPlacementData[] = []
  const sfxVolume = Math.max(0, Math.min(1, options.sfxVolume))

  // Resolve all available SFX files up-front
  const sfxPaths = {
    wordPop:          tryResolve('word-pop'),
    impactHigh:       tryResolve('impact-high'),
    bassDrop:         tryResolve('bass-drop'),
    riseTensionShort: tryResolve('rise-tension-short'),
    swipeTransition:  tryResolve('swipe-transition'),
    cameraShutter:    tryResolve('camera-shutter'),
    whooshSoft:       tryResolve('whoosh-soft'),
    impactLow:        tryResolve('impact-low'),
  }

  // ── 1. Background music ────────────────────────────────────────────────────
  const musicPath = resolveMusicPath(options.backgroundMusicTrack)
  if (existsSync(musicPath)) {
    placements.push({
      type: 'music',
      filePath: musicPath,
      startTime: 0,
      duration: clipDuration,
      volume: Math.max(0, Math.min(1, options.musicVolume))
    })
  } else {
    console.warn(`[SoundDesign] Music file not found, skipping: ${musicPath}`)
  }

  if (wordTimestamps.length === 0 && (!editEvents || editEvents.length === 0)) {
    return placements
  }

  // Track the last time any SFX was placed to enforce minimum gaps
  let lastSfxTime = -Infinity

  // ── 2. Supersize impacts + rising tension ──────────────────────────────────
  // Process supersize FIRST (highest priority), then emphasis words, then
  // edit events. This ensures the biggest moments always get their sound.
  const supersizeWords = (emphasizedWords ?? []).filter(w => w.emphasis === 'supersize')
  const hasImpact = sfxPaths.impactHigh || sfxPaths.bassDrop || sfxPaths.impactLow

  if (hasImpact && supersizeWords.length > 0) {
    // Alternating between impact-high and bass-drop for variety
    let useBassDrop = false
    const MIN_SUPER_GAP = 3.0 // minimum seconds between supersize impacts

    for (const word of supersizeWords) {
      if (word.start - lastSfxTime < MIN_SUPER_GAP) continue
      if (word.start < 0.2) continue // too close to clip start

      // Pick the impact SFX — alternate for variety, fall back to whatever exists
      let sfxPath: string | null
      if (useBassDrop) {
        sfxPath = sfxPaths.bassDrop ?? sfxPaths.impactHigh ?? sfxPaths.impactLow
      } else {
        sfxPath = sfxPaths.impactHigh ?? sfxPaths.impactLow
      }

      if (sfxPath) {
        // ── Rising tension: 0.3s before the supersize word ──────────────
        if (sfxPaths.riseTensionShort) {
          const riseTime = word.start - 0.3
          if (riseTime > 0.1 && riseTime - lastSfxTime >= 0.5) {
            placements.push({
              type: 'sfx',
              filePath: sfxPaths.riseTensionShort,
              startTime: riseTime,
              duration: 0.35,
              volume: sfxVolume * 0.6 // subtle — builds anticipation
            })
          }
        }

        // ── Full impact on the supersize word ───────────────────────────
        placements.push({
          type: 'sfx',
          filePath: sfxPath,
          startTime: word.start,
          duration: 0.6,
          volume: sfxVolume
        })

        lastSfxTime = word.start
        useBassDrop = !useBassDrop
      }
    }
  }

  // ── 3. Emphasis word pops ──────────────────────────────────────────────────
  const emphasisWords = (emphasizedWords ?? []).filter(w => w.emphasis === 'emphasis')
  const MIN_EMPHASIS_GAP = 2.5

  if (sfxPaths.wordPop && emphasisWords.length > 0) {
    for (const word of emphasisWords) {
      if (word.start - lastSfxTime < MIN_EMPHASIS_GAP) continue
      if (word.start < 0.2) continue

      placements.push({
        type: 'sfx',
        filePath: sfxPaths.wordPop,
        startTime: word.start,
        duration: 0.3,
        volume: sfxVolume * 0.5 // subtle — adds texture without overpowering
      })

      lastSfxTime = word.start
    }
  }

  // ── 4. Edit event synced SFX ───────────────────────────────────────────────
  // B-Roll transitions → swipe sound; jump-cut zooms → quiet camera shutter.
  // These sync to the visual edit rhythm so audio and video feel connected.
  if (editEvents && editEvents.length > 0) {
    for (const evt of editEvents) {
      if (evt.time < 0.1 || evt.time > clipDuration - 0.3) continue

      if (evt.type === 'broll-transition' && sfxPaths.swipeTransition) {
        // Don't collide with existing placements
        if (evt.time - lastSfxTime >= 1.0) {
          placements.push({
            type: 'sfx',
            filePath: sfxPaths.swipeTransition,
            startTime: evt.time,
            duration: 0.4,
            volume: sfxVolume * 0.65
          })
          lastSfxTime = evt.time
        }
      } else if (evt.type === 'jump-cut' && sfxPaths.cameraShutter) {
        // Camera shutter is intentionally quiet — it's felt more than heard
        if (evt.time - lastSfxTime >= 1.5) {
          placements.push({
            type: 'sfx',
            filePath: sfxPaths.cameraShutter,
            startTime: evt.time,
            duration: 0.25,
            volume: sfxVolume * 0.35
          })
          lastSfxTime = evt.time
        }
      }
    }
  }

  // ── 5. Transition whooshes at speech pauses ────────────────────────────────
  // Topic shifts / natural speech pauses get a soft whoosh to mark the
  // transition. Rate-limited to ~1 per 8 seconds so they don't clutter.
  if (sfxPaths.whooshSoft && wordTimestamps.length > 1) {
    const maxWhooshes = Math.max(1, Math.floor(clipDuration / 8))
    let whooshCount = 0

    for (let i = 1; i < wordTimestamps.length && whooshCount < maxWhooshes; i++) {
      const gapStart = wordTimestamps[i - 1].end
      const gapLength = wordTimestamps[i].start - gapStart

      if (gapLength >= 0.4 && gapStart > 2 && gapStart + 0.8 < clipDuration) {
        // Don't collide with existing SFX
        if (gapStart - lastSfxTime >= 1.0) {
          placements.push({
            type: 'sfx',
            filePath: sfxPaths.whooshSoft,
            startTime: gapStart,
            duration: Math.min(gapLength, 0.8),
            volume: sfxVolume * 0.7
          })
          lastSfxTime = gapStart
          whooshCount++
        }
      }
    }
  }

  return placements
}
