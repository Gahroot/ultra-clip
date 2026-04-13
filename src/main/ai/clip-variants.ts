/**
 * Clip Variant Generator
 *
 * For each clip, automatically generates 2–3 packaging variations with
 * different hooks, start points, caption styles, and overlay combinations.
 * Top creators post the same content with different packaging to A/B test
 * what resonates — this module automates that workflow.
 *
 * Three variants are produced:
 *   A — "Hook-first":   starts 2-3 s early, bold hook title, animated captions
 *   B — "Cold open":    jumps to the most dramatic moment, no hook overlay, minimal captions
 *   C — "Curiosity":    opens with an AI-generated provocative question overlay, builds suspense
 */

import { callGeminiWithRetry, type GeminiCall } from './gemini-client'
import { GoogleGenAI } from '@google/genai'
import type { TranscriptionResult } from '../transcription'
import type { ClipCandidate } from './curiosity-gap'

// ---------------------------------------------------------------------------
// Public interfaces
// ---------------------------------------------------------------------------

/** Which overlay modules are available for variant construction. */
export interface OverlayCapabilities {
  hookTitle: boolean
  rehook: boolean
  progressBar: boolean
}

/** The type of a single overlay element applied to a variant. */
export type OverlayType = 'hook-title' | 'rehook' | 'progress-bar'

/** Configuration for a single overlay element in a variant. */
export interface OverlayConfig {
  type: OverlayType
  /** Visual style matching the underlying overlay module's style union. */
  style?: string
  /** Text content (hook / rehook phrases). */
  text?: string
  /** Color override in CSS hex format. */
  color?: string
}

/** Short-hand caption style preset for a variant. */
export type CaptionStylePreset = 'bold' | 'minimal' | 'none' | 'default'

/** Layout to apply for the variant. */
export type VariantLayout = 'standard' | 'blur-background'

/**
 * A single packaging variant for a clip.
 * Contains adjusted timing, overlay configuration, caption preset, and
 * layout choice. Intended to be batch-rendered as a separate output file.
 */
export interface ClipVariant {
  /** Stable identifier: 'variant-a' | 'variant-b' | 'variant-c' */
  id: string
  /** Short human-readable label shown in the UI. */
  label: string
  /** Adjusted clip start time in seconds (may be earlier than the base clip). */
  startTime: number
  /** Adjusted clip end time in seconds. */
  endTime: number
  /** Overlays to apply to this variant, in render order. */
  overlays: OverlayConfig[]
  /** Caption style preset. */
  captionStyle: CaptionStylePreset
  /** Layout type for this variant. */
  layout: VariantLayout
  /** AI-generated hook title text (if hook-title overlay is present). */
  hookText?: string
  /** One-sentence description of the variant strategy. */
  description: string
}

/**
 * Concrete render configuration derived from a ClipVariant.
 * Maps directly to fields consumed by the render pipeline.
 */
export interface RenderConfig {
  /** Stable clip identifier (baseClip.clipId + variant suffix). */
  clipId: string
  /** Output filename without extension — rendered file will be `<outputFileName>.mp4`. */
  outputFileName: string
  /** Clip start time in source video seconds. */
  startTime: number
  /** Clip end time in source video seconds. */
  endTime: number
  /** Which hook title text to burn in (if enabled). */
  hookTitleText?: string
  /** Hook title overlay style to use. */
  hookTitleStyle?: 'centered-bold' | 'top-bar' | 'slide-in'
  /** Rehook overlay text (if enabled). */
  rehookText?: string
  /** Rehook overlay style to use. */
  rehookStyle?: 'bar' | 'text-only' | 'slide-up'
  /** Whether to burn the progress bar overlay. */
  progressBar: boolean
  /** Caption style preset for the variant. */
  captionStyle: CaptionStylePreset
  /** Layout to apply during render. */
  layout: VariantLayout
  /** Full ordered overlay list for reference / UI display. */
  overlays: OverlayConfig[]
}

/** Short label + badge info for a variant — used to render variant chips in the UI. */
export interface VariantLabel {
  /** Matches ClipVariant.id */
  id: string
  /** Short display label, e.g. "Hook-first edit" */
  label: string
  /** Single-sentence description of the variant strategy. */
  description: string
  /** Single uppercase letter badge: 'A' | 'B' | 'C' */
  badge: string
}

// ---------------------------------------------------------------------------
// Internal AI response shape
// ---------------------------------------------------------------------------

interface VariantAIOutput {
  hook_first_text: string
  cold_open_start: number
  curiosity_question: string
}


// ---------------------------------------------------------------------------
// AI prompt
// ---------------------------------------------------------------------------

const VARIANT_SYSTEM_PROMPT = `You are an expert short-form content strategist helping a creator generate A/B test packaging variants for a video clip.

Given a clip transcript and its timing, produce THREE distinct packaging angles:

1. hook_first_text: Write 2–6 words of on-screen hook text for the FIRST 2 seconds. Should stop the scroll with curiosity, shock, or bold claim. This will appear as large bold text over the opening frame.

2. cold_open_start: Identify the SINGLE most dramatically engaging moment in the transcript — the line that would make a viewer stop mid-scroll. Return the timestamp in seconds (as a number) where this line begins. This becomes an alternative clip start point that jumps straight into the action.

3. curiosity_question: Write a 6–12 word question that will appear as an overlay in the first 3 seconds. It must tease the content without giving away the answer. Frame it from the VIEWER's perspective — something they would ask themselves. Examples: "Why did nobody warn me about this?", "Is this really what they're hiding from us?"

RULES:
- hook_first_text: max 6 words, no hashtags, no emojis, provocative but authentic
- cold_open_start: must be a number (seconds), must be within the clip window, pick the most dramatic line
- curiosity_question: ends with a question mark, under 12 words, specific to the content
- Avoid generic filler ("Check this out", "Must see", "Amazing")

Return valid JSON with EXACTLY this structure:
{
  "hook_first_text": "They never teach you this",
  "cold_open_start": 47.5,
  "curiosity_question": "Why does no one talk about this secret?"
}`

// ---------------------------------------------------------------------------
// Core helpers
// ---------------------------------------------------------------------------

/**
 * Extract the text spoken within a given time window from the transcript.
 */
function extractClipText(
  transcript: TranscriptionResult,
  startTime: number,
  endTime: number
): string {
  const words = transcript.words
    .filter((w) => w.start >= startTime && w.end <= endTime)
    .map((w) => w.text)
  return words.join(' ').trim()
}

/**
 * Find the closest word-boundary timestamp at or after `targetTime`.
 * Falls back to `defaultTime` if no word is found within 3 seconds.
 */
function snapToWordBoundary(
  transcript: TranscriptionResult,
  targetTime: number,
  defaultTime: number
): number {
  const WINDOW = 3 // seconds
  const candidate = transcript.words.find(
    (w) => w.start >= targetTime && w.start <= targetTime + WINDOW
  )
  return candidate ? candidate.start : defaultTime
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate 2–3 meaningfully different packaging variants for a clip using AI.
 *
 * Each variant differs in:
 *  - Adjusted start/end times
 *  - Which overlays are applied (hook title, rehook, progress bar)
 *  - Caption style preset (bold / minimal / none)
 *  - Layout type (standard / blur-background)
 *
 * @param apiKey        Gemini API key (from user settings)
 * @param clip          The base clip candidate to vary
 * @param transcript    Full source video transcription (for moment-finding)
 * @param capabilities  Which overlay modules are available in the current session
 */
export async function generateVariants(
  apiKey: string,
  clip: ClipCandidate,
  transcript: TranscriptionResult,
  capabilities: OverlayCapabilities
): Promise<ClipVariant[]> {
  const ai = new GoogleGenAI({ apiKey })
  const call: GeminiCall = {
    model: 'gemini-2.5-flash-lite',
    config: { responseMimeType: 'application/json' }
  }

  const clipText = extractClipText(transcript, clip.startTime, clip.endTime)

  const prompt = `${VARIANT_SYSTEM_PROMPT}

Clip window: ${clip.startTime.toFixed(1)}s – ${clip.endTime.toFixed(1)}s
Clip transcript: "${clipText}"
Existing hook text (if any): "${clip.hookText ?? ''}"
Virality score: ${clip.score}`

  let aiOutput: VariantAIOutput
  try {
    const text = await callGeminiWithRetry(ai, call, prompt, 'variants')
    const raw = JSON.parse(text) as Partial<VariantAIOutput>

    // Validate + fallback each field
    const hookFirstText =
      typeof raw.hook_first_text === 'string' && raw.hook_first_text.trim()
        ? raw.hook_first_text.trim()
        : (clip.hookText ?? 'You need to see this')

    const coldOpenStart = (() => {
      const raw_start = Number(raw.cold_open_start)
      if (!isNaN(raw_start) && raw_start >= clip.startTime && raw_start < clip.endTime) {
        return snapToWordBoundary(transcript, raw_start, clip.startTime)
      }
      // Fallback: jump to 20% into the clip (skip any intro)
      return clip.startTime + (clip.endTime - clip.startTime) * 0.2
    })()

    const curiosityQuestion =
      typeof raw.curiosity_question === 'string' && raw.curiosity_question.trim()
        ? raw.curiosity_question.trim()
        : 'What happens next will surprise you?'

    aiOutput = { hook_first_text: hookFirstText, cold_open_start: coldOpenStart, curiosity_question: curiosityQuestion }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new Error(`Clip variant generation failed: ${msg}`)
  }

  const clipDuration = clip.endTime - clip.startTime

  // ── Variant A: Hook-first ─────────────────────────────────────────────────
  // Starts 2–3 seconds earlier (clamped to 0). Bold hook title + rehook + progress bar.
  const hookEarlyOffset = Math.min(2.5, clip.startTime)
  const variantAStart = Math.max(0, clip.startTime - hookEarlyOffset)

  const variantAOverlays: OverlayConfig[] = []
  if (capabilities.hookTitle) {
    variantAOverlays.push({
      type: 'hook-title',
      style: 'centered-bold',
      text: aiOutput.hook_first_text,
      color: '#FFFFFF'
    })
  }
  if (capabilities.rehook && clipDuration >= 20) {
    variantAOverlays.push({
      type: 'rehook',
      style: 'bar',
      color: '#FFFF00'
    })
  }
  if (capabilities.progressBar) {
    variantAOverlays.push({
      type: 'progress-bar',
      style: 'glow',
      color: '#FFFFFF'
    })
  }

  const variantA: ClipVariant = {
    id: 'variant-a',
    label: 'Hook-first edit',
    startTime: variantAStart,
    endTime: clip.endTime,
    overlays: variantAOverlays,
    captionStyle: 'bold',
    layout: 'standard',
    hookText: aiOutput.hook_first_text,
    description:
      'Starts slightly earlier with a bold on-screen hook in the first 2 seconds to stop the scroll. Best for cold audiences.'
  }

  // ── Variant B: Cold open ──────────────────────────────────────────────────
  // Jumps to the most dramatic moment, no hook overlay, minimal captions.
  const variantBOverlays: OverlayConfig[] = []
  if (capabilities.progressBar) {
    variantBOverlays.push({
      type: 'progress-bar',
      style: 'solid',
      color: '#FFFFFF'
    })
  }

  const variantB: ClipVariant = {
    id: 'variant-b',
    label: 'Cold open',
    startTime: aiOutput.cold_open_start,
    endTime: clip.endTime,
    overlays: variantBOverlays,
    captionStyle: 'minimal',
    layout: 'blur-background',
    description:
      'Jumps straight into the most dramatic line — no intro, no hook text. Relies on the raw content to hold attention. Best for warm audiences who already follow the creator.'
  }

  // ── Variant C: Curiosity builder ──────────────────────────────────────────
  // Starts at the original point, opens with a provocative question overlay.
  // Builds suspense with a delayed rehook.
  const variantCOverlays: OverlayConfig[] = []
  if (capabilities.hookTitle) {
    variantCOverlays.push({
      type: 'hook-title',
      style: 'slide-in',
      text: aiOutput.curiosity_question,
      color: '#FFFFFF'
    })
  }
  if (capabilities.rehook && clipDuration >= 15) {
    variantCOverlays.push({
      type: 'rehook',
      style: 'slide-up',
      color: '#FFFFFF'
    })
  }
  if (capabilities.progressBar) {
    variantCOverlays.push({
      type: 'progress-bar',
      style: 'gradient',
      color: '#FFFFFF'
    })
  }

  const variantC: ClipVariant = {
    id: 'variant-c',
    label: 'Curiosity builder',
    startTime: clip.startTime,
    endTime: clip.endTime,
    overlays: variantCOverlays,
    captionStyle: 'default',
    layout: 'standard',
    hookText: aiOutput.curiosity_question,
    description:
      'Opens with a provocative question overlay to create a curiosity loop before the viewer even hears the speaker. Best for topics with a surprising twist or revelation.'
  }

  return [variantA, variantB, variantC]
}

// ---------------------------------------------------------------------------
// buildVariantRenderConfigs
// ---------------------------------------------------------------------------

/**
 * Convert a list of ClipVariants into concrete RenderConfig objects
 * that can be passed directly into the batch render pipeline.
 *
 * Output filenames follow the pattern: `<baseName>_variant-<a|b|c>`
 * so renders land as `myclip_variant-a.mp4`, `myclip_variant-b.mp4`, etc.
 *
 * @param variants   Array returned by generateVariants
 * @param baseClip   The original clip the variants were generated from
 * @param baseName   Base filename stem (without extension), e.g. "myclip_clip1"
 */
export function buildVariantRenderConfigs(
  variants: ClipVariant[],
  baseClip: ClipCandidate,
  baseName: string
): RenderConfig[] {
  return variants.map((variant) => {
    const hookOverlay = variant.overlays.find((o) => o.type === 'hook-title')
    const rehookOverlay = variant.overlays.find((o) => o.type === 'rehook')
    const progressOverlay = variant.overlays.find((o) => o.type === 'progress-bar')

    // Derive the clipId from the baseClip id (fallback to baseName) + variant suffix
    const baseId =
      (baseClip as ClipCandidate & { clipId?: string }).clipId ?? baseName
    const clipId = `${baseId}_${variant.id}`

    const config: RenderConfig = {
      clipId,
      outputFileName: `${baseName}_${variant.id}`,
      startTime: variant.startTime,
      endTime: variant.endTime,
      captionStyle: variant.captionStyle,
      layout: variant.layout,
      overlays: variant.overlays,
      progressBar: !!progressOverlay
    }

    if (hookOverlay) {
      config.hookTitleText = hookOverlay.text ?? variant.hookText
      config.hookTitleStyle = (hookOverlay.style as RenderConfig['hookTitleStyle']) ?? 'centered-bold'
    }

    if (rehookOverlay) {
      config.rehookStyle = (rehookOverlay.style as RenderConfig['rehookStyle']) ?? 'bar'
    }

    return config
  })
}

// ---------------------------------------------------------------------------
// generateVariantLabels
// ---------------------------------------------------------------------------

/**
 * Generate short descriptive labels for each variant — used to render
 * variant chips / badges in the UI.
 *
 * @param variants  Array returned by generateVariants
 */
export function generateVariantLabels(variants: ClipVariant[]): VariantLabel[] {
  const BADGES = ['A', 'B', 'C', 'D', 'E']

  return variants.map((variant, index) => ({
    id: variant.id,
    label: variant.label,
    description: variant.description,
    badge: BADGES[index] ?? String(index + 1)
  }))
}
