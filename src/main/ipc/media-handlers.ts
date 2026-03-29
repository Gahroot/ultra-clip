import { ipcMain } from 'electron'
import { tmpdir } from 'os'
import { join } from 'path'
import { Ch } from '@shared/ipc-channels'
import { wrapHandler } from '../ipc-error-handler'
import { downloadYouTube } from '../youtube'
import { transcribeVideo, formatTranscriptForAI } from '../transcription'
import { detectFaceCrops } from '../face-detection'
import { generateCaptions, type WordInput, type CaptionStyleInput } from '../captions'
import { selectAndCopyLogo, selectAndCopyBumper, copyLogoFromPath, copyBumperFromPath } from '../brand-kit'
import {
  getElementPlacement,
  getSafeZone,
  getDeadZones,
  clampToSafeZone,
  isInsideSafeZone,
  rectToAssMargins,
  PLATFORM_SAFE_ZONES,
  type Platform,
  type ElementType,
  type SafeZoneRect
} from '../safe-zones'
import { extractBRollKeywords } from '../broll-keywords'
import type { WordTimestamp as BRollWordTimestamp } from '../broll-keywords'
import { fetchBRollClips } from '../broll-pexels'
import { buildBRollPlacements } from '../broll-placement'
import type { BRollSettings as BRollSettingsConfig, BRollDisplayMode, BRollTransition } from '../broll-placement'
import { checkPythonSetup, runFullSetup } from '../python-setup'
import { detectFillers } from '../filler-detection'

export function registerMediaHandlers(): void {
  // YouTube download
  ipcMain.handle(Ch.Invoke.YOUTUBE_DOWNLOAD, wrapHandler(Ch.Invoke.YOUTUBE_DOWNLOAD, async (event, url: string) => {
    const outputDir = join(tmpdir(), 'batchcontent-yt')
    return downloadYouTube(url, outputDir, (percent) => {
      event.sender.send(Ch.Send.YOUTUBE_PROGRESS, { percent })
    })
  }))

  // Transcribe video
  ipcMain.handle(Ch.Invoke.TRANSCRIBE_VIDEO, wrapHandler(Ch.Invoke.TRANSCRIBE_VIDEO, async (event, videoPath: string) => {
    return transcribeVideo(videoPath, (progress) => {
      event.sender.send(Ch.Send.TRANSCRIBE_PROGRESS, progress)
    })
  }))

  // Format transcript for AI scoring
  ipcMain.handle(Ch.Invoke.TRANSCRIBE_FORMAT_FOR_AI, wrapHandler(Ch.Invoke.TRANSCRIBE_FORMAT_FOR_AI, (_event, result: Parameters<typeof formatTranscriptForAI>[0]) => {
    return formatTranscriptForAI(result)
  }))

  // Face detection — smart 9:16 crop regions
  ipcMain.handle(
    Ch.Invoke.FACE_DETECT_CROPS,
    wrapHandler(Ch.Invoke.FACE_DETECT_CROPS, async (event, videoPath: string, segments: { start: number; end: number }[]) => {
      return detectFaceCrops(videoPath, segments, (progress) => {
        event.sender.send(Ch.Send.FACE_PROGRESS, progress)
      })
    })
  )

  // Captions — generate .ass subtitle file
  ipcMain.handle(
    Ch.Invoke.CAPTIONS_GENERATE,
    wrapHandler(Ch.Invoke.CAPTIONS_GENERATE, async (
      _event,
      words: WordInput[],
      style: CaptionStyleInput,
      outputPath?: string
    ) => {
      return generateCaptions(words, style, outputPath)
    })
  )

  // Brand Kit — select and copy logo
  ipcMain.handle(Ch.Invoke.BRANDKIT_SELECT_LOGO, wrapHandler(Ch.Invoke.BRANDKIT_SELECT_LOGO, () => selectAndCopyLogo()))

  // Brand Kit — select and copy intro bumper
  ipcMain.handle(Ch.Invoke.BRANDKIT_SELECT_INTRO_BUMPER, wrapHandler(Ch.Invoke.BRANDKIT_SELECT_INTRO_BUMPER, () => selectAndCopyBumper('intro')))

  // Brand Kit — select and copy outro bumper
  ipcMain.handle(Ch.Invoke.BRANDKIT_SELECT_OUTRO_BUMPER, wrapHandler(Ch.Invoke.BRANDKIT_SELECT_OUTRO_BUMPER, () => selectAndCopyBumper('outro')))

  // Brand Kit — copy logo from path (drag-and-drop)
  ipcMain.handle(Ch.Invoke.BRANDKIT_COPY_LOGO, wrapHandler(Ch.Invoke.BRANDKIT_COPY_LOGO, (_event, filePath: string) => copyLogoFromPath(filePath)))

  // Brand Kit — copy bumper from path (drag-and-drop)
  ipcMain.handle(Ch.Invoke.BRANDKIT_COPY_BUMPER, wrapHandler(Ch.Invoke.BRANDKIT_COPY_BUMPER, (_event, filePath: string) => copyBumperFromPath(filePath)))

  // Safe Zones — get element placement rect
  ipcMain.handle(
    Ch.Invoke.SAFEZONES_GET_PLACEMENT,
    (_event, platform: Platform, element: ElementType): SafeZoneRect => {
      return getElementPlacement(platform, element)
    }
  )

  // Safe Zones — get the full safe zone rect
  ipcMain.handle(
    Ch.Invoke.SAFEZONES_GET_SAFE_ZONE,
    (_event, platform: Platform): SafeZoneRect => {
      return getSafeZone(platform)
    }
  )

  // Safe Zones — get dead zone measurements
  ipcMain.handle(
    Ch.Invoke.SAFEZONES_GET_DEAD_ZONES,
    (_event, platform: Platform) => {
      return getDeadZones(platform)
    }
  )

  // Safe Zones — clamp a rect to the safe zone
  ipcMain.handle(
    Ch.Invoke.SAFEZONES_CLAMP,
    (_event, rect: SafeZoneRect, platform: Platform): SafeZoneRect => {
      return clampToSafeZone(rect, platform)
    }
  )

  // Safe Zones — check if a rect is inside the safe zone
  ipcMain.handle(
    Ch.Invoke.SAFEZONES_IS_INSIDE,
    (_event, rect: SafeZoneRect, platform: Platform): boolean => {
      return isInsideSafeZone(rect, platform)
    }
  )

  // Safe Zones — convert placement rect to ASS subtitle margins
  ipcMain.handle(
    Ch.Invoke.SAFEZONES_TO_ASS_MARGINS,
    (_event, rect: SafeZoneRect) => {
      return rectToAssMargins(rect)
    }
  )

  // Safe Zones — return all platform safe zone definitions
  ipcMain.handle(Ch.Invoke.SAFEZONES_GET_ALL_PLATFORMS, () => {
    return PLATFORM_SAFE_ZONES
  })

  // B-Roll — extract keywords + fetch Pexels clips + compute placement schedule
  ipcMain.handle(
    Ch.Invoke.BROLL_GENERATE_PLACEMENTS,
    wrapHandler(Ch.Invoke.BROLL_GENERATE_PLACEMENTS, async (
      _event,
      geminiApiKey: string,
      pexelsApiKey: string,
      transcriptText: string,
      wordTimestamps: BRollWordTimestamp[],
      clipStart: number,
      clipEnd: number,
      settings: {
        intervalSeconds: number
        clipDuration: number
        displayMode: BRollDisplayMode
        transition: BRollTransition
        pipSize: number
        pipPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
      }
    ) => {
      const brollSettings: BRollSettingsConfig = {
        enabled: true,
        pexelsApiKey,
        intervalSeconds: settings.intervalSeconds,
        clipDuration: settings.clipDuration,
        displayMode: settings.displayMode,
        transition: settings.transition,
        pipSize: settings.pipSize,
        pipPosition: settings.pipPosition
      }

      const clipDuration = clipEnd - clipStart

      const keywords = await extractBRollKeywords(
        transcriptText,
        wordTimestamps,
        clipStart,
        clipEnd,
        geminiApiKey
      )

      if (keywords.length === 0) {
        console.log('[B-Roll] No keywords extracted — skipping B-Roll generation')
        return []
      }

      const uniqueKeywords = [...new Set(keywords.map((k) => k.keyword))]
      const downloadedClips = await fetchBRollClips(
        uniqueKeywords,
        pexelsApiKey,
        settings.clipDuration
      )

      if (downloadedClips.size === 0) {
        console.log('[B-Roll] No clips downloaded — skipping B-Roll generation')
        return []
      }

      const placements = buildBRollPlacements(
        clipDuration,
        keywords,
        downloadedClips,
        brollSettings
      )

      console.log(`[B-Roll] Generated ${placements.length} placement(s) for clip at ${clipStart}–${clipEnd}s`)
      return placements
    })
  )

  // Python setup — check status
  ipcMain.handle(Ch.Invoke.PYTHON_GET_STATUS, () => checkPythonSetup())

  // Python setup — start installation
  ipcMain.handle(Ch.Invoke.PYTHON_START_SETUP, async (event) => {
    runFullSetup(event.sender).catch((err) => {
      event.sender.send(Ch.Send.PYTHON_SETUP_DONE, { success: false, error: err.message })
    })
    return { started: true }
  })

  // Filler detection — detect filler words, silences, and repeats in word timestamps
  ipcMain.handle(
    Ch.Invoke.FILLER_DETECT,
    wrapHandler(Ch.Invoke.FILLER_DETECT, (_event, words: Array<{ text: string; start: number; end: number; confidence?: number }>, settings: Parameters<typeof detectFillers>[1]) => {
      return detectFillers(words, settings)
    })
  )
}
