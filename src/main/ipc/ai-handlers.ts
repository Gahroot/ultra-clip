import { ipcMain } from 'electron'
import { Ch } from '@shared/ipc-channels'
import { wrapHandler } from '../ipc-error-handler'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { scoreTranscript, generateHookText, rescoreSingleClip } from '../ai-scoring'
import type { TargetDuration } from '../ai-scoring'
import { generateRehookText } from '../overlays/rehook'
import {
  generateFakeComment,
  buildFakeCommentFilter,
  type FakeCommentData,
  type FakeCommentConfig
} from '../overlays/fake-comment'
import {
  identifyEmojiMoments,
  buildEmojiBurstFilters,
  resolveEmojiFont,
  type EmojiMoment,
  type EmojiBurstConfig
} from '../overlays/emoji-burst'
import type { TranscriptionResult } from '../transcription'
import {
  detectCuriosityGaps,
  optimizeClipBoundaries,
  optimizeClipEndpoints,
  rankClipsByCuriosity
} from '../ai/curiosity-gap'
import type { CuriosityGap, ClipCandidate, ClipEndMode } from '../ai/curiosity-gap'
import {
  generateClipDescription,
  generateBatchDescriptions
} from '../ai/description-generator'
import type { DescriptionClipInput } from '../ai/description-generator'
import { resolveHookFont } from '../hook-title'
import { analyzeWordEmphasis } from '../word-emphasis'
import { generateEditPlan } from '../ai/edit-plan'
import type { WordTimestamp } from '@shared/types'

const AI_VALIDATION_MODEL = 'gemini-2.5-flash-lite'

export function registerAiHandlers(): void {
  // AI — score transcript segments for viral potential
  ipcMain.handle(
    Ch.Invoke.AI_SCORE_TRANSCRIPT,
    wrapHandler(Ch.Invoke.AI_SCORE_TRANSCRIPT, async (event, apiKey: string, formattedTranscript: string, videoDuration: number, targetDuration?: string) => {
      return scoreTranscript(apiKey, formattedTranscript, videoDuration, (progress) => {
        event.sender.send(Ch.Send.AI_SCORING_PROGRESS, progress)
      }, (targetDuration as TargetDuration) || 'auto')
    })
  )

  // AI — generate hook text for a clip
  ipcMain.handle(
    Ch.Invoke.AI_GENERATE_HOOK_TEXT,
    wrapHandler(Ch.Invoke.AI_GENERATE_HOOK_TEXT, async (_event, apiKey: string, transcript: string, videoSummary?: string, keyTopics?: string[]) => {
      return generateHookText(apiKey, transcript, videoSummary, keyTopics)
    })
  )

  // AI — generate re-hook / pattern interrupt text
  ipcMain.handle(
    Ch.Invoke.AI_GENERATE_REHOOK_TEXT,
    wrapHandler(Ch.Invoke.AI_GENERATE_REHOOK_TEXT, async (_event, apiKey: string, transcript: string, clipStart: number, clipEnd: number, videoSummary?: string, keyTopics?: string[]) => {
      return generateRehookText(apiKey, transcript, clipStart, clipEnd, videoSummary, keyTopics)
    })
  )

  // AI — re-score a single clip after user edits its boundaries
  ipcMain.handle(
    Ch.Invoke.AI_RESCORE_SINGLE_CLIP,
    wrapHandler(Ch.Invoke.AI_RESCORE_SINGLE_CLIP, async (_event, apiKey: string, clipText: string, clipDuration: number) => {
      return rescoreSingleClip(apiKey, clipText, clipDuration)
    })
  )

  // AI — validate a Gemini API key
  ipcMain.handle(
    Ch.Invoke.AI_VALIDATE_GEMINI_KEY,
    async (_event, apiKey: string): Promise<{ valid: boolean; error?: string }> => {
      if (!apiKey || !apiKey.trim()) {
        return { valid: false, error: 'API key is empty' }
      }
      try {
        const genAI = new GoogleGenerativeAI(apiKey.trim())
        const model = genAI.getGenerativeModel({ model: AI_VALIDATION_MODEL })
        await model.generateContent('Hi')
        return { valid: true }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        const status = (err as { status?: number })?.status
        if (status === 400 && /api.key|API_KEY/i.test(msg)) {
          return { valid: false, error: 'Invalid API key' }
        }
        if (status === 401 || status === 403 || /api.key|API_KEY/i.test(msg)) {
          return { valid: false, error: 'Invalid API key' }
        }
        if (status === 429 || /resource.exhausted|rate.limit|quota/i.test(msg)) {
          return { valid: true }
        }
        if (/ENOTFOUND|ECONNREFUSED|ETIMEDOUT|fetch failed/i.test(msg)) {
          return { valid: false, error: 'Network error — check your internet connection' }
        }
        return { valid: false, error: msg.slice(0, 120) }
      }
    }
  )

  // AI — validate a Pexels API key
  ipcMain.handle(
    Ch.Invoke.AI_VALIDATE_PEXELS_KEY,
    async (_event, apiKey: string): Promise<{ valid: boolean; error?: string }> => {
      if (!apiKey || !apiKey.trim()) {
        return { valid: false, error: 'API key is empty' }
      }
      try {
        const url = new URL('https://api.pexels.com/videos/search')
        url.searchParams.set('query', 'nature')
        url.searchParams.set('per_page', '1')
        const response = await fetch(url.toString(), {
          headers: { Authorization: apiKey.trim() }
        })
        if (response.ok) {
          return { valid: true }
        }
        if (response.status === 401 || response.status === 403) {
          return { valid: false, error: 'Invalid API key' }
        }
        return { valid: false, error: `API error: ${response.status} ${response.statusText}` }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        if (/ENOTFOUND|ECONNREFUSED|ETIMEDOUT|fetch failed/i.test(msg)) {
          return { valid: false, error: 'Network error — check your internet connection' }
        }
        return { valid: false, error: msg.slice(0, 120) }
      }
    }
  )

  // AI — detect curiosity gaps in a transcript
  ipcMain.handle(
    Ch.Invoke.AI_DETECT_CURIOSITY_GAPS,
    wrapHandler(Ch.Invoke.AI_DETECT_CURIOSITY_GAPS, async (
      _event,
      apiKey: string,
      transcript: Parameters<typeof detectCuriosityGaps>[1],
      formattedTranscript: string,
      videoDuration: number
    ) => {
      return detectCuriosityGaps(apiKey, transcript, formattedTranscript, videoDuration)
    })
  )

  // AI — optimize clip boundaries around a curiosity gap
  ipcMain.handle(
    Ch.Invoke.AI_OPTIMIZE_CLIP_BOUNDARIES,
    wrapHandler(Ch.Invoke.AI_OPTIMIZE_CLIP_BOUNDARIES, (
      _event,
      gap: CuriosityGap,
      originalStart: number,
      originalEnd: number,
      transcript: Parameters<typeof optimizeClipBoundaries>[3]
    ) => {
      return optimizeClipBoundaries(gap, originalStart, originalEnd, transcript)
    })
  )

  // AI — optimize clip start/end points using a specific mode strategy
  ipcMain.handle(
    Ch.Invoke.AI_OPTIMIZE_CLIP_ENDPOINTS,
    wrapHandler(Ch.Invoke.AI_OPTIMIZE_CLIP_ENDPOINTS, (_e, mode: ClipEndMode, clipStart: number, clipEnd: number, transcript: TranscriptionResult, gap?: CuriosityGap) =>
      optimizeClipEndpoints(mode, clipStart, clipEnd, transcript, gap)
    )
  )

  // AI — re-rank clip candidates by blending virality + curiosity gap scores
  ipcMain.handle(
    Ch.Invoke.AI_RANK_CLIPS_BY_CURIOSITY,
    wrapHandler(Ch.Invoke.AI_RANK_CLIPS_BY_CURIOSITY, (_event, clips: ClipCandidate[], gaps: CuriosityGap[]) => {
      return rankClipsByCuriosity(clips, gaps)
    })
  )

  // Description Generator — single clip
  ipcMain.handle(
    Ch.Invoke.AI_GENERATE_CLIP_DESCRIPTION,
    wrapHandler(Ch.Invoke.AI_GENERATE_CLIP_DESCRIPTION, async (
      _event,
      apiKey: string,
      transcript: string,
      clipContext?: string,
      hookTitle?: string
    ) => {
      return generateClipDescription(apiKey, transcript, clipContext, hookTitle)
    })
  )

  // Description Generator — batch
  ipcMain.handle(
    Ch.Invoke.AI_GENERATE_BATCH_DESCRIPTIONS,
    wrapHandler(Ch.Invoke.AI_GENERATE_BATCH_DESCRIPTIONS, async (_event, apiKey: string, clips: DescriptionClipInput[]) => {
      return generateBatchDescriptions(apiKey, clips)
    })
  )

  // Word Emphasis — analyze transcript words for emphasis/supersize styling
  ipcMain.handle(
    Ch.Invoke.AI_ANALYZE_WORD_EMPHASIS,
    wrapHandler(Ch.Invoke.AI_ANALYZE_WORD_EMPHASIS, async (_event, words: WordTimestamp[], apiKey?: string) => {
      return analyzeWordEmphasis(words, apiKey)
    })
  )

  // AI Edit Plan — single-shot complete edit plan (emphasis + B-Roll + SFX)
  ipcMain.handle(
    Ch.Invoke.AI_GENERATE_EDIT_PLAN,
    wrapHandler(Ch.Invoke.AI_GENERATE_EDIT_PLAN, async (
      _event,
      apiKey: string,
      clipId: string,
      clipStart: number,
      clipEnd: number,
      words: WordTimestamp[],
      transcriptText: string,
      stylePresetId: string,
      stylePresetName: string,
      stylePresetCategory: string
    ) => {
      return generateEditPlan({
        apiKey,
        clipId,
        clipStart,
        clipEnd,
        words,
        transcriptText,
        stylePresetId,
        stylePresetName,
        stylePresetCategory
      })
    })
  )

  // AI Edit Plan — batch mode: generate plans for all clips in one orchestrated call
  ipcMain.handle(
    Ch.Invoke.AI_GENERATE_BATCH_EDIT_PLANS,
    wrapHandler(Ch.Invoke.AI_GENERATE_BATCH_EDIT_PLANS, async (
      event,
      apiKey: string,
      clips: Array<{
        clipId: string
        clipStart: number
        clipEnd: number
        words: WordTimestamp[]
        transcriptText: string
      }>,
      stylePresetId: string,
      stylePresetName: string,
      stylePresetCategory: string
    ) => {
      const plans = []
      for (let i = 0; i < clips.length; i++) {
        const clip = clips[i]
        event.sender.send(Ch.Send.AI_EDIT_PROGRESS, {
          clipIndex: i,
          totalClips: clips.length,
          clipId: clip.clipId,
          stage: 'generating' as const,
          message: `Generating edit plan ${i + 1}/${clips.length}…`
        })
        try {
          const plan = await generateEditPlan({
            apiKey,
            clipId: clip.clipId,
            clipStart: clip.clipStart,
            clipEnd: clip.clipEnd,
            words: clip.words,
            transcriptText: clip.transcriptText,
            stylePresetId,
            stylePresetName,
            stylePresetCategory
          })
          plans.push(plan)
          event.sender.send(Ch.Send.AI_EDIT_PROGRESS, {
            clipIndex: i,
            totalClips: clips.length,
            clipId: clip.clipId,
            stage: 'done' as const,
            message: `Edit plan ready (${i + 1}/${clips.length})`
          })
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          event.sender.send(Ch.Send.AI_EDIT_PROGRESS, {
            clipIndex: i,
            totalClips: clips.length,
            clipId: clip.clipId,
            stage: 'error' as const,
            message: `Failed for clip ${i + 1}: ${msg.slice(0, 80)}`
          })
          // Continue with remaining clips — partial success is useful
        }
      }
      return plans
    })
  )

  // Emoji Burst — identify high-emotion moments via AI
  ipcMain.handle(
    Ch.Invoke.OVERLAY_IDENTIFY_EMOJI_MOMENTS,
    wrapHandler(Ch.Invoke.OVERLAY_IDENTIFY_EMOJI_MOMENTS, async (
      _event,
      apiKey: string,
      transcript: TranscriptionResult,
      clipStart: number,
      clipEnd: number,
      config: EmojiBurstConfig
    ) => {
      return identifyEmojiMoments(apiKey, transcript, clipStart, clipEnd, config)
    })
  )

  // Emoji Burst — build FFmpeg drawtext filter strings
  ipcMain.handle(
    Ch.Invoke.OVERLAY_BUILD_EMOJI_BURST_FILTERS,
    wrapHandler(Ch.Invoke.OVERLAY_BUILD_EMOJI_BURST_FILTERS, (_event, moments: EmojiMoment[], config: EmojiBurstConfig) => {
      const fontFilePath = resolveEmojiFont()
      return buildEmojiBurstFilters(moments, config, fontFilePath)
    })
  )

  // Fake Comment — generate a believable viewer comment with AI
  ipcMain.handle(
    Ch.Invoke.OVERLAY_GENERATE_FAKE_COMMENT,
    wrapHandler(Ch.Invoke.OVERLAY_GENERATE_FAKE_COMMENT, async (_event, apiKey: string, transcript: string, clipContext?: string) => {
      return generateFakeComment(apiKey, transcript, clipContext)
    })
  )

  // Fake Comment — build FFmpeg drawbox/drawtext filter chain
  ipcMain.handle(
    Ch.Invoke.OVERLAY_BUILD_FAKE_COMMENT_FILTER,
    wrapHandler(Ch.Invoke.OVERLAY_BUILD_FAKE_COMMENT_FILTER, async (_event, comment: FakeCommentData, config: FakeCommentConfig) => {
      const fontFilePath = await resolveHookFont()
      return buildFakeCommentFilter(comment, config, fontFilePath)
    })
  )
}
