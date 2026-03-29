/**
 * Caption style thumbnail cache.
 *
 * Loads bundled fonts via IPC, pre-generates PNG thumbnails for all caption
 * presets, and stores them as data URLs in an in-memory Map. Thumbnails are
 * available instantly — no spinners, no waiting.
 */

import type { CaptionStyle } from '@/store/types'
import { renderCaptionThumbnail } from './caption-thumbnail-renderer'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ThumbnailStatus = 'idle' | 'loading-fonts' | 'generating' | 'ready' | 'error'

type StatusListener = (status: ThumbnailStatus) => void

// ---------------------------------------------------------------------------
// Singleton state
// ---------------------------------------------------------------------------

const cache = new Map<string, string>()
let fontsLoaded = false
let status: ThumbnailStatus = 'idle'
const listeners = new Set<StatusListener>()

// ---------------------------------------------------------------------------
// Status tracking
// ---------------------------------------------------------------------------

function setStatus(s: ThumbnailStatus) {
  status = s
  for (const fn of listeners) fn(s)
}

export function getThumbnailStatus(): ThumbnailStatus {
  return status
}

export function onStatusChange(fn: StatusListener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

// ---------------------------------------------------------------------------
// Font loading
// ---------------------------------------------------------------------------

/**
 * Load all bundled fonts into the browser via the FontFace API so that
 * canvas text rendering uses the correct typeface.
 */
async function loadBundledFonts(): Promise<void> {
  try {
    const fonts = await window.api.getAvailableFonts()
    const bundled = fonts.filter(f => f.source === 'bundled')

    // Deduplicate by font name (avoid loading same family twice)
    const seen = new Set<string>()
    const toLoad = bundled.filter(f => {
      if (seen.has(f.name)) return false
      seen.add(f.name)
      return true
    })

    const loadPromises = toLoad.map(async (font) => {
      try {
        const base64 = await window.api.getFontData(font.path)
        if (!base64) return

        const fontFace = new FontFace(
          font.name,
          `url(data:font/ttf;base64,${base64})`,
          { weight: font.weight ?? 'normal' }
        )
        await fontFace.load()
        document.fonts.add(fontFace)
      } catch {
        // Individual font load failure shouldn't block others
      }
    })

    await Promise.all(loadPromises)
    fontsLoaded = true
  } catch {
    // Font loading failed — thumbnails will use fallback fonts
    fontsLoaded = true
  }
}

// ---------------------------------------------------------------------------
// Thumbnail generation
// ---------------------------------------------------------------------------

/**
 * Get a cached thumbnail data URL for a caption style.
 * Returns undefined if not yet generated.
 */
export function getThumbnail(styleId: string): string | undefined {
  return cache.get(styleId)
}

/**
 * Generate and cache a single thumbnail. Useful for custom styles
 * that aren't part of the standard presets.
 */
export function generateThumbnail(style: CaptionStyle): string {
  const dataUrl = renderCaptionThumbnail(style)
  cache.set(style.id, dataUrl)
  return dataUrl
}

/**
 * Pre-generate thumbnails for all provided caption styles.
 * Loads fonts first if not already done.
 *
 * @param styles - Array of caption styles to generate thumbnails for
 */
export async function pregenerateThumbnails(styles: CaptionStyle[]): Promise<void> {
  if (status === 'ready') return
  if (status === 'loading-fonts' || status === 'generating') return

  try {
    // Step 1: Load fonts
    if (!fontsLoaded) {
      setStatus('loading-fonts')
      await loadBundledFonts()
    }

    // Step 2: Generate all thumbnails
    setStatus('generating')
    for (const style of styles) {
      if (!cache.has(style.id)) {
        try {
          cache.set(style.id, renderCaptionThumbnail(style))
        } catch {
          // Individual thumbnail failure shouldn't block others
        }
      }
    }

    setStatus('ready')
  } catch {
    setStatus('error')
  }
}

/**
 * Clear the entire thumbnail cache (e.g., when fonts change).
 */
export function clearThumbnailCache(): void {
  cache.clear()
  fontsLoaded = false
  setStatus('idle')
}
