/**
 * Built-in curated EditStylePresets — each one is a complete creative identity
 * covering captions, zoom, B-Roll layout, sound energy, and overlay treatments.
 *
 * Every preset was designed as a coherent package: the typography, motion,
 * music energy, and visual treatments all reinforce the same aesthetic mood.
 * Users can apply any preset with one click and get a consistent look across
 * all rendered clips.
 */

import type { EditStylePreset } from './types'

export const EDIT_STYLE_PRESETS: EditStylePreset[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // 1. IMPACT — Bold, punchy, relentlessly energetic
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'impact',
    name: 'Impact',
    description: 'Bold, punchy, and relentlessly high-energy — built to stop the scroll instantly.',
    thumbnail: '💥',
    category: 'viral',
    tags: ['bold', 'energetic', 'punchy', 'viral', 'montserrat'],
    builtIn: true,

    captions: {
      enabled: true,
      style: {
        id: 'impact-caption',
        label: 'Impact',
        fontName: 'Montserrat',
        fontFile: 'Montserrat-Bold.ttf',
        fontSize: 0.075,
        primaryColor: '#FFFFFF',
        highlightColor: '#FFE600',
        outlineColor: '#000000',
        backColor: '#00000000',
        outline: 5,
        shadow: 3,
        borderStyle: 1,
        wordsPerLine: 2,
        animation: 'word-pop',
        emphasisColor: '#FFE600',
        supersizeColor: '#FF3B30',
      },
    },

    zoom: {
      enabled: true,
      mode: 'reactive',
      intensity: 'dynamic',
      intervalSeconds: 3,
    },

    broll: {
      enabled: false,
      displayMode: 'fullscreen',
      transition: 'hard-cut',
      pipSize: 0.25,
      pipPosition: 'bottom-right',
      intervalSeconds: 5,
      clipDuration: 3,
    },

    sound: {
      enabled: true,
      sfxStyle: 'energetic',
      backgroundMusicTrack: 'ambient-tech',
      sfxVolume: 0.7,
      musicVolume: 0.12,
      musicDucking: true,
      musicDuckLevel: 0.15,
    },

    overlays: {
      hookTitle: {
        enabled: true,
        style: 'centered-bold',
        displayDuration: 2.5,
        fontSize: 80,
        textColor: '#FFFFFF',
        outlineColor: '#000000',
        outlineWidth: 5,
      },
      rehook: {
        enabled: true,
        style: 'bar',
        displayDuration: 1.5,
      },
      progressBar: {
        enabled: true,
        style: 'glow',
        position: 'bottom',
        height: 5,
        color: '#FFE600',
        opacity: 1.0,
      },
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 2. CLARITY — Clean sticky-note captions, ideas that speak for themselves
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'clarity',
    name: 'Clarity',
    description: 'Sticky-note word boxes and minimal sound — designed for ideas that speak for themselves.',
    thumbnail: '📌',
    category: 'educational',
    tags: ['clean', 'minimal', 'educational', 'readable', 'sticky-note', 'inter'],
    builtIn: true,

    captions: {
      enabled: true,
      style: {
        id: 'clarity-caption',
        label: 'Clarity',
        fontName: 'Inter',
        fontFile: 'Inter-Bold.ttf',
        fontSize: 0.065,
        primaryColor: '#1A1A1A',
        highlightColor: '#2563EB',
        outlineColor: '#FFE066',
        backColor: '#FFE066',
        outline: 0,
        shadow: 0,
        borderStyle: 3,
        wordsPerLine: 3,
        animation: 'word-box',
        emphasisColor: '#2563EB',
        supersizeColor: '#DC2626',
      },
    },

    zoom: {
      enabled: true,
      mode: 'ken-burns',
      intensity: 'subtle',
      intervalSeconds: 6,
    },

    broll: {
      enabled: false,
      displayMode: 'split-top',
      transition: 'crossfade',
      pipSize: 0.25,
      pipPosition: 'bottom-right',
      intervalSeconds: 6,
      clipDuration: 4,
    },

    sound: {
      enabled: false,
      sfxStyle: 'minimal',
      backgroundMusicTrack: 'ambient-chill',
      sfxVolume: 0.3,
      musicVolume: 0.07,
      musicDucking: true,
      musicDuckLevel: 0.3,
    },

    overlays: {
      hookTitle: {
        enabled: true,
        style: 'slide-in',
        displayDuration: 2.5,
        fontSize: 68,
        textColor: '#1A1A1A',
        outlineColor: '#FFE066',
        outlineWidth: 3,
      },
      rehook: {
        enabled: false,
        style: 'text-only',
        displayDuration: 1.5,
      },
      progressBar: {
        enabled: true,
        style: 'gradient',
        position: 'top',
        height: 4,
        color: '#2563EB',
        opacity: 0.85,
      },
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 3. VELOCITY — Neon bounce, reactive zoom, the internet at full speed
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'velocity',
    name: 'Velocity',
    description: 'Neon bounce, reactive zoom, electric energy — the internet moves at your speed.',
    thumbnail: '⚡',
    category: 'viral',
    tags: ['neon', 'bouncy', 'reactive', 'electric', 'cyan', 'poppins'],
    builtIn: true,

    captions: {
      enabled: true,
      style: {
        id: 'velocity-caption',
        label: 'Velocity',
        fontName: 'Poppins',
        fontFile: 'Poppins-Bold.ttf',
        fontSize: 0.07,
        primaryColor: '#FFFFFF',
        highlightColor: '#00FFFF',
        outlineColor: '#FF00FF',
        backColor: '#00000000',
        outline: 3,
        shadow: 0,
        borderStyle: 1,
        wordsPerLine: 2,
        animation: 'elastic-bounce',
        emphasisColor: '#00FFFF',
        supersizeColor: '#FF6B35',
      },
    },

    zoom: {
      enabled: true,
      mode: 'reactive',
      intensity: 'dynamic',
      intervalSeconds: 2,
    },

    broll: {
      enabled: false,
      displayMode: 'pip',
      transition: 'swipe-up',
      pipSize: 0.28,
      pipPosition: 'bottom-right',
      intervalSeconds: 4,
      clipDuration: 3,
    },

    sound: {
      enabled: true,
      sfxStyle: 'energetic',
      backgroundMusicTrack: 'ambient-tech',
      sfxVolume: 0.65,
      musicVolume: 0.12,
      musicDucking: true,
      musicDuckLevel: 0.15,
    },

    overlays: {
      hookTitle: {
        enabled: true,
        style: 'top-bar',
        displayDuration: 2.5,
        fontSize: 72,
        textColor: '#00FFFF',
        outlineColor: '#000000',
        outlineWidth: 4,
      },
      rehook: {
        enabled: true,
        style: 'slide-up',
        displayDuration: 1.5,
      },
      progressBar: {
        enabled: true,
        style: 'glow',
        position: 'bottom',
        height: 5,
        color: '#00FFFF',
        opacity: 1.0,
      },
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 4. GROWTH — Warm, motivational, human
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'growth',
    name: 'Growth',
    description: 'Warm, motivational, and human — for stories that build belief and inspire action.',
    thumbnail: '🌱',
    category: 'branded',
    tags: ['warm', 'motivational', 'human', 'inspiring', 'amber', 'montserrat'],
    builtIn: true,

    captions: {
      enabled: true,
      style: {
        id: 'growth-caption',
        label: 'Growth',
        fontName: 'Montserrat',
        fontFile: 'Montserrat-Bold.ttf',
        fontSize: 0.07,
        primaryColor: '#FFFFFF',
        highlightColor: '#FF9B21',
        outlineColor: '#000000',
        backColor: '#00000000',
        outline: 4,
        shadow: 2,
        borderStyle: 1,
        wordsPerLine: 2,
        animation: 'captions-ai',
        emphasisColor: '#FF9B21',
        supersizeColor: '#FFD700',
      },
    },

    zoom: {
      enabled: true,
      mode: 'ken-burns',
      intensity: 'medium',
      intervalSeconds: 5,
    },

    broll: {
      enabled: false,
      displayMode: 'split-top',
      transition: 'crossfade',
      pipSize: 0.25,
      pipPosition: 'bottom-right',
      intervalSeconds: 6,
      clipDuration: 4,
    },

    sound: {
      enabled: true,
      sfxStyle: 'standard',
      backgroundMusicTrack: 'ambient-motivational',
      sfxVolume: 0.45,
      musicVolume: 0.1,
      musicDucking: true,
      musicDuckLevel: 0.2,
    },

    overlays: {
      hookTitle: {
        enabled: true,
        style: 'centered-bold',
        displayDuration: 3.0,
        fontSize: 72,
        textColor: '#FFFFFF',
        outlineColor: '#000000',
        outlineWidth: 4,
      },
      rehook: {
        enabled: true,
        style: 'bar',
        displayDuration: 1.5,
      },
      progressBar: {
        enabled: true,
        style: 'gradient',
        position: 'bottom',
        height: 4,
        color: '#FF9B21',
        opacity: 0.9,
      },
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 5. VOLT — High contrast, stacked impact, jump-cut aggression
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'volt',
    name: 'Volt',
    description: 'High contrast, stacked impact font, jump-cut edits — every second demands attention.',
    thumbnail: '🔋',
    category: 'viral',
    tags: ['high-contrast', 'stacked', 'jump-cut', 'lime', 'aggressive', 'montserrat'],
    builtIn: true,

    captions: {
      enabled: true,
      style: {
        id: 'volt-caption',
        label: 'Volt',
        fontName: 'Montserrat',
        fontFile: 'Montserrat-Bold.ttf',
        fontSize: 0.068,
        primaryColor: '#FFFFFF',
        highlightColor: '#C8FF00',
        outlineColor: '#000000',
        backColor: '#00000000',
        outline: 5,
        shadow: 0,
        borderStyle: 1,
        wordsPerLine: 3,
        animation: 'impact-two',
        emphasisColor: '#C8FF00',
        supersizeColor: '#FFFFFF',
      },
    },

    zoom: {
      enabled: true,
      mode: 'jump-cut',
      intensity: 'dynamic',
      intervalSeconds: 2,
    },

    broll: {
      enabled: false,
      displayMode: 'fullscreen',
      transition: 'hard-cut',
      pipSize: 0.25,
      pipPosition: 'bottom-right',
      intervalSeconds: 4,
      clipDuration: 2,
    },

    sound: {
      enabled: true,
      sfxStyle: 'energetic',
      backgroundMusicTrack: 'ambient-tech',
      sfxVolume: 0.8,
      musicVolume: 0.1,
      musicDucking: true,
      musicDuckLevel: 0.1,
    },

    overlays: {
      hookTitle: {
        enabled: true,
        style: 'top-bar',
        displayDuration: 2.0,
        fontSize: 76,
        textColor: '#C8FF00',
        outlineColor: '#000000',
        outlineWidth: 5,
      },
      rehook: {
        enabled: true,
        style: 'slide-up',
        displayDuration: 1.2,
      },
      progressBar: {
        enabled: true,
        style: 'glow',
        position: 'top',
        height: 6,
        color: '#C8FF00',
        opacity: 1.0,
      },
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 6. FILM — Cinematic pacing, typewriter reveals, short-film feel
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'film',
    name: 'Film',
    description: 'Cinematic pacing, typewriter reveals, and restrained overlays — for content that feels like a short film.',
    thumbnail: '🎬',
    category: 'cinematic',
    tags: ['cinematic', 'typewriter', 'film', 'atmospheric', 'poppins', 'slow'],
    builtIn: true,

    captions: {
      enabled: true,
      style: {
        id: 'film-caption',
        label: 'Film',
        fontName: 'Poppins',
        fontFile: 'Poppins-Bold.ttf',
        fontSize: 0.055,
        primaryColor: '#F5F0E8',
        highlightColor: '#E8D5A3',
        outlineColor: '#000000',
        backColor: '#B3000000',
        outline: 2,
        shadow: 1,
        borderStyle: 1,
        wordsPerLine: 4,
        animation: 'typewriter',
        emphasisColor: '#E8D5A3',
        supersizeColor: '#FFFFFF',
      },
    },

    zoom: {
      enabled: true,
      mode: 'ken-burns',
      intensity: 'subtle',
      intervalSeconds: 7,
    },

    broll: {
      enabled: false,
      displayMode: 'fullscreen',
      transition: 'crossfade',
      pipSize: 0.25,
      pipPosition: 'bottom-right',
      intervalSeconds: 8,
      clipDuration: 5,
    },

    sound: {
      enabled: true,
      sfxStyle: 'minimal',
      backgroundMusicTrack: 'ambient-chill',
      sfxVolume: 0.25,
      musicVolume: 0.12,
      musicDucking: true,
      musicDuckLevel: 0.25,
    },

    overlays: {
      hookTitle: {
        enabled: true,
        style: 'slide-in',
        displayDuration: 3.0,
        fontSize: 68,
        textColor: '#F5F0E8',
        outlineColor: '#000000',
        outlineWidth: 3,
      },
      rehook: {
        enabled: false,
        style: 'text-only',
        displayDuration: 2.0,
      },
      progressBar: {
        enabled: false,
        style: 'solid',
        position: 'bottom',
        height: 3,
        color: '#F5F0E8',
        opacity: 0.6,
      },
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 7. EMBER — Warm palette, cascading text, fire-orange energy
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'ember',
    name: 'Ember',
    description: 'Warm palette, cascading text, fire-orange energy — intimate and conversational.',
    thumbnail: '🔥',
    category: 'branded',
    tags: ['warm', 'orange', 'cascade', 'intimate', 'ember', 'montserrat'],
    builtIn: true,

    captions: {
      enabled: true,
      style: {
        id: 'ember-caption',
        label: 'Ember',
        fontName: 'Montserrat',
        fontFile: 'Montserrat-Bold.ttf',
        fontSize: 0.07,
        primaryColor: '#FFFFFF',
        highlightColor: '#FF6B35',
        outlineColor: '#1A0A00',
        backColor: '#00000000',
        outline: 4,
        shadow: 3,
        borderStyle: 1,
        wordsPerLine: 2,
        animation: 'cascade',
        emphasisColor: '#FF6B35',
        supersizeColor: '#FFD700',
      },
    },

    zoom: {
      enabled: true,
      mode: 'ken-burns',
      intensity: 'medium',
      intervalSeconds: 4,
    },

    broll: {
      enabled: false,
      displayMode: 'split-bottom',
      transition: 'swipe-down',
      pipSize: 0.25,
      pipPosition: 'bottom-right',
      intervalSeconds: 6,
      clipDuration: 4,
    },

    sound: {
      enabled: true,
      sfxStyle: 'standard',
      backgroundMusicTrack: 'ambient-motivational',
      sfxVolume: 0.5,
      musicVolume: 0.11,
      musicDucking: true,
      musicDuckLevel: 0.2,
    },

    overlays: {
      hookTitle: {
        enabled: true,
        style: 'centered-bold',
        displayDuration: 2.5,
        fontSize: 72,
        textColor: '#FFFFFF',
        outlineColor: '#1A0A00',
        outlineWidth: 4,
      },
      rehook: {
        enabled: true,
        style: 'bar',
        displayDuration: 1.5,
      },
      progressBar: {
        enabled: true,
        style: 'gradient',
        position: 'bottom',
        height: 5,
        color: '#FF6B35',
        opacity: 0.9,
      },
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 8. REBEL — Graffiti energy, maximum aggression, zero chill
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'rebel',
    name: 'Rebel',
    description: 'Maximum aggression — graffiti-sized words, blood-red highlights, one word at a time.',
    thumbnail: '🤘',
    category: 'viral',
    tags: ['aggressive', 'graffiti', 'red', 'raw', 'loud', 'montserrat', 'jump-cut'],
    builtIn: true,

    captions: {
      enabled: true,
      style: {
        id: 'rebel-caption',
        label: 'Rebel',
        fontName: 'Montserrat',
        fontFile: 'Montserrat-Bold.ttf',
        fontSize: 0.08,
        primaryColor: '#FFFFFF',
        highlightColor: '#FF2D2D',
        outlineColor: '#000000',
        backColor: '#00000000',
        outline: 6,
        shadow: 0,
        borderStyle: 1,
        wordsPerLine: 1,
        animation: 'word-pop',
        emphasisColor: '#FF2D2D',
        supersizeColor: '#FFE600',
      },
    },

    zoom: {
      enabled: true,
      mode: 'jump-cut',
      intensity: 'dynamic',
      intervalSeconds: 2,
    },

    broll: {
      enabled: false,
      displayMode: 'fullscreen',
      transition: 'swipe-up',
      pipSize: 0.25,
      pipPosition: 'bottom-right',
      intervalSeconds: 4,
      clipDuration: 2,
    },

    sound: {
      enabled: true,
      sfxStyle: 'energetic',
      backgroundMusicTrack: 'ambient-tech',
      sfxVolume: 0.9,
      musicVolume: 0.08,
      musicDucking: true,
      musicDuckLevel: 0.1,
    },

    overlays: {
      hookTitle: {
        enabled: true,
        style: 'top-bar',
        displayDuration: 2.0,
        fontSize: 84,
        textColor: '#FF2D2D',
        outlineColor: '#000000',
        outlineWidth: 6,
      },
      rehook: {
        enabled: true,
        style: 'slide-up',
        displayDuration: 1.2,
      },
      progressBar: {
        enabled: false,
        style: 'solid',
        position: 'top',
        height: 6,
        color: '#FF2D2D',
        opacity: 1.0,
      },
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 9. NEON — Glowing, electric, night-time aesthetic
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'neon',
    name: 'Neon',
    description: 'Electric glow, pulsing colors — the night-time aesthetic that pops on every screen.',
    thumbnail: '💡',
    category: 'viral',
    tags: ['neon', 'glow', 'electric', 'dark', 'pulse', 'poppins', 'green', 'magenta'],
    builtIn: true,

    captions: {
      enabled: true,
      style: {
        id: 'neon-caption',
        label: 'Neon',
        fontName: 'Poppins',
        fontFile: 'Poppins-Bold.ttf',
        fontSize: 0.065,
        primaryColor: '#FFFFFF',
        highlightColor: '#00FF99',
        outlineColor: '#9900FF',
        backColor: '#00000000',
        outline: 2,
        shadow: 0,
        borderStyle: 1,
        wordsPerLine: 3,
        animation: 'glow',
        emphasisColor: '#00FF99',
        supersizeColor: '#FF00FF',
      },
    },

    zoom: {
      enabled: true,
      mode: 'reactive',
      intensity: 'medium',
      intervalSeconds: 3,
    },

    broll: {
      enabled: false,
      displayMode: 'pip',
      transition: 'crossfade',
      pipSize: 0.3,
      pipPosition: 'bottom-right',
      intervalSeconds: 5,
      clipDuration: 4,
    },

    sound: {
      enabled: true,
      sfxStyle: 'energetic',
      backgroundMusicTrack: 'ambient-tech',
      sfxVolume: 0.6,
      musicVolume: 0.12,
      musicDucking: true,
      musicDuckLevel: 0.15,
    },

    overlays: {
      hookTitle: {
        enabled: true,
        style: 'top-bar',
        displayDuration: 2.5,
        fontSize: 72,
        textColor: '#00FF99',
        outlineColor: '#000000',
        outlineWidth: 3,
      },
      rehook: {
        enabled: true,
        style: 'slide-up',
        displayDuration: 1.5,
      },
      progressBar: {
        enabled: true,
        style: 'glow',
        position: 'bottom',
        height: 4,
        color: '#00FF99',
        opacity: 0.95,
      },
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 10. PRIME — Corporate clean, professional polish
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'prime',
    name: 'Prime',
    description: 'Corporate-clean, professional polish — every frame looks like it cost a budget.',
    thumbnail: '💼',
    category: 'educational',
    tags: ['professional', 'corporate', 'clean', 'polished', 'blue', 'inter'],
    builtIn: true,

    captions: {
      enabled: true,
      style: {
        id: 'prime-caption',
        label: 'Prime',
        fontName: 'Inter',
        fontFile: 'Inter-Bold.ttf',
        fontSize: 0.06,
        primaryColor: '#FFFFFF',
        highlightColor: '#2563EB',
        outlineColor: '#1E293B',
        backColor: '#CC1E293B',
        outline: 0,
        shadow: 0,
        borderStyle: 3,
        wordsPerLine: 3,
        animation: 'fade-in',
        emphasisColor: '#2563EB',
        supersizeColor: '#60A5FA',
      },
    },

    zoom: {
      enabled: true,
      mode: 'ken-burns',
      intensity: 'subtle',
      intervalSeconds: 6,
    },

    broll: {
      enabled: false,
      displayMode: 'split-top',
      transition: 'crossfade',
      pipSize: 0.25,
      pipPosition: 'bottom-right',
      intervalSeconds: 7,
      clipDuration: 4,
    },

    sound: {
      enabled: false,
      sfxStyle: 'minimal',
      backgroundMusicTrack: 'ambient-chill',
      sfxVolume: 0.3,
      musicVolume: 0.08,
      musicDucking: true,
      musicDuckLevel: 0.3,
    },

    overlays: {
      hookTitle: {
        enabled: true,
        style: 'slide-in',
        displayDuration: 2.5,
        fontSize: 68,
        textColor: '#FFFFFF',
        outlineColor: '#1E293B',
        outlineWidth: 3,
      },
      rehook: {
        enabled: false,
        style: 'bar',
        displayDuration: 1.5,
      },
      progressBar: {
        enabled: true,
        style: 'gradient',
        position: 'top',
        height: 4,
        color: '#2563EB',
        opacity: 0.9,
      },
    },
  },
]

/** IDs of all built-in edit style presets, in display order. */
export const BUILT_IN_EDIT_STYLE_PRESET_IDS = EDIT_STYLE_PRESETS.filter(p => p.builtIn).map(p => p.id)

/**
 * Look up a built-in preset by its slug ID.
 * Returns undefined if no match is found.
 */
export function getEditStylePreset(id: string): EditStylePreset | undefined {
  return EDIT_STYLE_PRESETS.find(p => p.id === id)
}
