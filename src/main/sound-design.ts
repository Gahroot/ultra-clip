import { join } from 'path'
import { app } from 'electron'
import { existsSync } from 'fs'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SFXType =
  | 'whoosh-soft'
  | 'whoosh-hard'
  | 'impact-low'
  | 'impact-high'
  | 'rise-tension'
  | 'notification-pop'

export type MusicTrack = 'ambient-tech' | 'ambient-motivational' | 'ambient-chill'

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

export interface WordTimestampInput {
  text: string
  start: number
  end: number
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
// Power word detection
// ---------------------------------------------------------------------------

// Words that typically signal emphasis moments in viral short-form content
const POWER_WORDS = new Set([
  'never', 'always', 'every', 'secret', 'reveal', 'truth', 'fail', 'failed',
  'success', 'successful', 'million', 'billion', 'thousand', 'percent',
  'incredible', 'amazing', 'shocking', 'important', 'critical', 'wrong',
  'right', 'mistake', 'discover', 'change', 'biggest', 'best', 'worst',
  'first', 'last', 'only', 'real', 'free', 'money', 'rich', 'poor', 'life',
  'death', 'love', 'hate', 'fear', 'stop', 'start', 'massive', 'huge',
  'insane', 'crazy', 'literally', 'actually', 'guaranteed', 'proven',
  'instantly', 'immediately', 'skyrocket', 'explode', 'double', 'triple',
  'zero', 'nothing', 'everything', 'anyone', 'nobody', 'impossible',
  'unstoppable', 'legendary', 'viral', 'broke', 'destroyed', 'crushed'
])

// ---------------------------------------------------------------------------
// Sound placement generation
// ---------------------------------------------------------------------------

/**
 * Analyze a clip's transcript and generate sound effect / music placements.
 * Returns only placements for files that actually exist on disk.
 * Missing audio files are silently skipped with a console warning.
 */
export function generateSoundPlacements(
  clipDuration: number,
  wordTimestamps: WordTimestampInput[],
  options: SoundDesignOptions
): SoundPlacementData[] {
  if (!options.enabled) return []

  const placements: SoundPlacementData[] = []

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

  // ── 2. Emphasis SFX on power words ────────────────────────────────────────
  const impactLowPath = resolveSfxPath('impact-low')
  const impactHighPath = resolveSfxPath('impact-high')
  const hasImpactLow = existsSync(impactLowPath)
  const hasImpactHigh = existsSync(impactHighPath)
  const sfxVolume = Math.max(0, Math.min(1, options.sfxVolume))

  if ((hasImpactLow || hasImpactHigh) && wordTimestamps.length > 0) {
    let lastEmphasisTime = -4 // enforce minimum 4s gap between emphasis hits
    let useHigh = false       // alternate between low and high impact

    for (const word of wordTimestamps) {
      const wordText = word.text.toLowerCase().replace(/[^a-z]/g, '')
      if (POWER_WORDS.has(wordText) && word.start - lastEmphasisTime >= 4) {
        // Pick impact SFX, alternating between high and low
        let sfxPath: string | null = null
        if (useHigh && hasImpactHigh) sfxPath = impactHighPath
        else if (hasImpactLow) sfxPath = impactLowPath
        else if (hasImpactHigh) sfxPath = impactHighPath

        if (sfxPath) {
          placements.push({
            type: 'sfx',
            filePath: sfxPath,
            startTime: word.start,
            duration: 0.6,
            volume: sfxVolume
          })
          lastEmphasisTime = word.start
          useHigh = !useHigh
        }
      }
    }
  }

  // ── 3. Transition whooshes at speech pauses ────────────────────────────────
  const whooshPath = resolveSfxPath('whoosh-soft')
  if (existsSync(whooshPath) && wordTimestamps.length > 1) {
    // Allow roughly one whoosh every 8 seconds
    const maxWhooshes = Math.max(1, Math.floor(clipDuration / 8))
    let whooshCount = 0

    for (let i = 1; i < wordTimestamps.length && whooshCount < maxWhooshes; i++) {
      const gapStart = wordTimestamps[i - 1].end
      const gapLength = wordTimestamps[i].start - gapStart

      // Only place whoosh at genuine pauses (>0.4s) after the hook section (>2s)
      if (gapLength >= 0.4 && gapStart > 2 && gapStart + 0.8 < clipDuration) {
        placements.push({
          type: 'sfx',
          filePath: whooshPath,
          startTime: gapStart,
          duration: Math.min(gapLength, 0.8),
          volume: sfxVolume * 0.7 // slightly quieter than emphasis hits
        })
        whooshCount++
      }
    }
  }

  return placements
}
