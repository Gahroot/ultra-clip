/**
 * Built-in curated EditStylePresets — each one is a complete creative identity
 * covering captions, zoom, B-Roll layout, sound energy, and overlay treatments.
 *
 * Every preset was designed as a coherent package: the typography, motion,
 * music energy, and visual treatments all reinforce the same aesthetic mood.
 * Users can apply any preset with one click and get a consistent look across
 * all rendered clips.
 */

import type { EditStylePreset, EditStyleVariant } from './types'

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

    variants: [
      {
        id: 'impact-classic',
        name: 'Classic',
        description: 'The original Impact look — bold pops with yellow highlight.',
        thumbnail: '💥',
      },
      {
        id: 'impact-whiteout',
        name: 'Whiteout',
        description: 'Clean white-on-black, no color highlights — all contrast, zero distraction.',
        thumbnail: '⚪',
        captions: { style: { highlightColor: '#FFFFFF', emphasisColor: '#FFFFFF', supersizeColor: '#FFFFFF', outline: 6 } },
        overlays: { progressBar: { color: '#FFFFFF' }, hookTitle: { textColor: '#FFFFFF' } },
      },
      {
        id: 'impact-fire',
        name: 'Fire',
        description: 'Red-orange heat — aggressive SFX density and jump-cut zoom.',
        thumbnail: '🔥',
        captions: { style: { highlightColor: '#FF3B30', emphasisColor: '#FF6B35', animation: 'impact-two' } },
        zoom: { mode: 'jump-cut', intervalSeconds: 2 },
        sound: { sfxVolume: 0.85 },
        overlays: { progressBar: { color: '#FF3B30' }, hookTitle: { textColor: '#FF3B30' } },
      },
      {
        id: 'impact-neon',
        name: 'Neon',
        description: 'Electric cyan pop on dark — Impact energy with a neon club feel.',
        thumbnail: '💎',
        captions: { style: { highlightColor: '#00FFFF', emphasisColor: '#00FFFF', supersizeColor: '#FF00FF', outlineColor: '#1A0033', animation: 'elastic-bounce' } },
        overlays: { progressBar: { color: '#00FFFF', style: 'glow' }, hookTitle: { textColor: '#00FFFF' } },
      },
    ],
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

    variants: [
      {
        id: 'clarity-classic',
        name: 'Classic',
        description: 'Original sticky-note word boxes with yellow background.',
        thumbnail: '📌',
      },
      {
        id: 'clarity-mint',
        name: 'Mint',
        description: 'Cool mint-green boxes — fresh and easy on the eyes.',
        thumbnail: '🌿',
        captions: { style: { outlineColor: '#A7F3D0', backColor: '#A7F3D0', highlightColor: '#059669' } },
        overlays: { progressBar: { color: '#059669' } },
      },
      {
        id: 'clarity-slate',
        name: 'Slate',
        description: 'Dark rounded boxes on light text — modern editor aesthetic.',
        thumbnail: '🖤',
        captions: { style: { primaryColor: '#F1F5F9', outlineColor: '#1E293B', backColor: '#E61E293B', highlightColor: '#60A5FA' } },
        overlays: { progressBar: { color: '#60A5FA' }, hookTitle: { textColor: '#F1F5F9', outlineColor: '#1E293B' } },
      },
      {
        id: 'clarity-coral',
        name: 'Coral',
        description: 'Warm coral boxes with a friendly, approachable teaching vibe.',
        thumbnail: '🪸',
        captions: { style: { outlineColor: '#FED7AA', backColor: '#FED7AA', highlightColor: '#EA580C' } },
        overlays: { progressBar: { color: '#EA580C' } },
      },
    ],
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

    variants: [
      {
        id: 'velocity-classic',
        name: 'Classic',
        description: 'Cyan bounce with magenta outlines — the original Velocity.',
        thumbnail: '⚡',
      },
      {
        id: 'velocity-bold',
        name: 'Bold',
        description: 'Larger font, thicker outlines, maximum pop energy.',
        thumbnail: '💪',
        captions: { style: { fontSize: 0.08, outline: 5, wordsPerLine: 1 } },
        zoom: { intensity: 'dynamic', intervalSeconds: 1.5 },
        sound: { sfxVolume: 0.8 },
      },
      {
        id: 'velocity-clean',
        name: 'Clean',
        description: 'Subtle bounce, thinner outlines — fast energy, polished finish.',
        thumbnail: '✨',
        captions: { style: { outline: 1, fontSize: 0.065, wordsPerLine: 3, animation: 'fade-in' } },
        zoom: { intensity: 'medium', intervalSeconds: 3 },
        sound: { sfxStyle: 'standard', sfxVolume: 0.4 },
      },
      {
        id: 'velocity-neon',
        name: 'Neon',
        description: 'Green glow with purple undertones — nightclub Velocity.',
        thumbnail: '💡',
        captions: { style: { highlightColor: '#00FF99', outlineColor: '#9900FF', animation: 'glow' } },
        overlays: { progressBar: { color: '#00FF99' }, hookTitle: { textColor: '#00FF99' } },
      },
      {
        id: 'velocity-sunset',
        name: 'Sunset',
        description: 'Warm orange-pink bounce — Velocity with golden-hour warmth.',
        thumbnail: '🌅',
        captions: { style: { highlightColor: '#FF6B35', outlineColor: '#D946EF', emphasisColor: '#FF6B35', supersizeColor: '#FFD700' } },
        overlays: { progressBar: { color: '#FF6B35' }, hookTitle: { textColor: '#FF6B35' } },
      },
    ],
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

    variants: [
      {
        id: 'growth-classic',
        name: 'Classic',
        description: 'Warm amber highlight with motivational music — the original Growth.',
        thumbnail: '🌱',
      },
      {
        id: 'growth-golden',
        name: 'Golden',
        description: 'Richer gold palette — premium motivational energy.',
        thumbnail: '🏆',
        captions: { style: { highlightColor: '#FFD700', emphasisColor: '#FFD700', supersizeColor: '#FFFFFF' } },
        overlays: { progressBar: { color: '#FFD700' }, hookTitle: { textColor: '#FFD700' } },
      },
      {
        id: 'growth-sage',
        name: 'Sage',
        description: 'Earthy green tones — calm growth, mindful energy.',
        thumbnail: '🍃',
        captions: { style: { highlightColor: '#4ADE80', emphasisColor: '#4ADE80' } },
        sound: { sfxStyle: 'minimal', musicVolume: 0.08, backgroundMusicTrack: 'ambient-chill' },
        overlays: { progressBar: { color: '#4ADE80' } },
      },
      {
        id: 'growth-bold',
        name: 'Bold',
        description: 'Bigger font, more SFX — Growth with more punch for shorter clips.',
        thumbnail: '💪',
        captions: { style: { fontSize: 0.078, animation: 'word-pop', wordsPerLine: 1 } },
        zoom: { mode: 'reactive', intensity: 'dynamic' },
        sound: { sfxStyle: 'energetic', sfxVolume: 0.6 },
      },
    ],
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

    variants: [
      {
        id: 'volt-classic',
        name: 'Classic',
        description: 'Lime-green stacked impact with jump-cut aggression.',
        thumbnail: '🔋',
      },
      {
        id: 'volt-red',
        name: 'Red Alert',
        description: 'Blood-red highlights with maximum contrast — pure adrenaline.',
        thumbnail: '🚨',
        captions: { style: { highlightColor: '#FF2D2D', emphasisColor: '#FF2D2D', supersizeColor: '#FFE600' } },
        overlays: { progressBar: { color: '#FF2D2D' }, hookTitle: { textColor: '#FF2D2D' } },
      },
      {
        id: 'volt-electric',
        name: 'Electric',
        description: 'Cyan-blue voltage — Volt with a cooler, more digital edge.',
        thumbnail: '⚡',
        captions: { style: { highlightColor: '#00BFFF', emphasisColor: '#00BFFF', animation: 'elastic-bounce' } },
        zoom: { mode: 'reactive', intervalSeconds: 2 },
        overlays: { progressBar: { color: '#00BFFF' }, hookTitle: { textColor: '#00BFFF' } },
      },
      {
        id: 'volt-stealth',
        name: 'Stealth',
        description: 'Muted grey-green palette — aggressive pacing with understated color.',
        thumbnail: '🥷',
        captions: { style: { highlightColor: '#A3E635', outline: 3, fontSize: 0.06, wordsPerLine: 2 } },
        sound: { sfxStyle: 'standard', sfxVolume: 0.5 },
        overlays: { progressBar: { color: '#A3E635', opacity: 0.7 } },
      },
    ],
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

    variants: [
      {
        id: 'film-classic',
        name: 'Classic',
        description: 'Warm sepia typewriter — the original cinematic Film look.',
        thumbnail: '🎬',
      },
      {
        id: 'film-noir',
        name: 'Noir',
        description: 'Pure white text on deep black — stark, dramatic, timeless.',
        thumbnail: '🖤',
        captions: { style: { primaryColor: '#FFFFFF', highlightColor: '#FFFFFF', outlineColor: '#000000', backColor: '#CC000000', emphasisColor: '#FFFFFF' } },
        overlays: { hookTitle: { textColor: '#FFFFFF', outlineColor: '#000000' } },
      },
      {
        id: 'film-golden',
        name: 'Golden Hour',
        description: 'Rich amber warmth — shot-on-film nostalgia.',
        thumbnail: '🌅',
        captions: { style: { primaryColor: '#FFF7ED', highlightColor: '#F59E0B', emphasisColor: '#F59E0B' } },
        sound: { backgroundMusicTrack: 'ambient-motivational' },
        overlays: { hookTitle: { textColor: '#F59E0B' } },
      },
      {
        id: 'film-teal',
        name: 'Teal & Orange',
        description: 'Hollywood color grading — cool teal captions with warm accents.',
        thumbnail: '🎞️',
        captions: { style: { primaryColor: '#E0F2FE', highlightColor: '#FF8C42', emphasisColor: '#FF8C42', outlineColor: '#0C4A6E' } },
        overlays: { hookTitle: { textColor: '#E0F2FE', outlineColor: '#0C4A6E' } },
      },
    ],
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

    variants: [
      {
        id: 'ember-classic',
        name: 'Classic',
        description: 'Fire-orange cascade on warm tones — the original Ember.',
        thumbnail: '🔥',
      },
      {
        id: 'ember-rose',
        name: 'Rosé',
        description: 'Pink-rose warmth — softer, more intimate cascade energy.',
        thumbnail: '🌹',
        captions: { style: { highlightColor: '#F472B6', emphasisColor: '#F472B6', supersizeColor: '#FBBF24' } },
        overlays: { progressBar: { color: '#F472B6' }, hookTitle: { textColor: '#F472B6' } },
      },
      {
        id: 'ember-inferno',
        name: 'Inferno',
        description: 'Deep red fire — Ember at maximum heat with faster motion.',
        thumbnail: '🌋',
        captions: { style: { highlightColor: '#DC2626', emphasisColor: '#DC2626', animation: 'word-pop' } },
        zoom: { mode: 'reactive', intensity: 'dynamic', intervalSeconds: 3 },
        sound: { sfxStyle: 'energetic', sfxVolume: 0.7 },
        overlays: { progressBar: { color: '#DC2626' } },
      },
      {
        id: 'ember-honey',
        name: 'Honey',
        description: 'Golden-amber glow — warm and inviting, relaxed cascade.',
        thumbnail: '🍯',
        captions: { style: { highlightColor: '#F59E0B', emphasisColor: '#F59E0B', fontSize: 0.065 } },
        zoom: { intensity: 'subtle', intervalSeconds: 5 },
        sound: { sfxStyle: 'minimal', sfxVolume: 0.3 },
      },
    ],
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

    variants: [
      {
        id: 'rebel-classic',
        name: 'Classic',
        description: 'Blood-red graffiti pop — the original Rebel.',
        thumbnail: '🤘',
      },
      {
        id: 'rebel-blackout',
        name: 'Blackout',
        description: 'White on pure black, zero color — raw and stripped back.',
        thumbnail: '🏴',
        captions: { style: { highlightColor: '#FFFFFF', emphasisColor: '#FFFFFF', supersizeColor: '#FFFFFF' } },
        overlays: { hookTitle: { textColor: '#FFFFFF' } },
      },
      {
        id: 'rebel-toxic',
        name: 'Toxic',
        description: 'Acid green highlights with maximum aggression — radioactive rebel.',
        thumbnail: '☢️',
        captions: { style: { highlightColor: '#84CC16', emphasisColor: '#84CC16', supersizeColor: '#FACC15' } },
        sound: { sfxVolume: 1.0 },
        overlays: { hookTitle: { textColor: '#84CC16' } },
      },
      {
        id: 'rebel-bruise',
        name: 'Bruise',
        description: 'Deep purple highlights — dark, moody Rebel with heavy bass energy.',
        thumbnail: '👾',
        captions: { style: { highlightColor: '#A855F7', emphasisColor: '#A855F7', supersizeColor: '#E879F9' } },
        sound: { backgroundMusicTrack: 'ambient-tech', musicVolume: 0.1 },
        overlays: { hookTitle: { textColor: '#A855F7' } },
      },
    ],
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

    variants: [
      {
        id: 'neon-classic',
        name: 'Classic',
        description: 'Green glow on purple — the original Neon.',
        thumbnail: '💡',
      },
      {
        id: 'neon-pink',
        name: 'Hot Pink',
        description: 'Magenta-pink neon — vibrant club glow.',
        thumbnail: '💖',
        captions: { style: { highlightColor: '#FF00FF', emphasisColor: '#FF00FF', supersizeColor: '#00FFFF', outlineColor: '#4A0066' } },
        overlays: { progressBar: { color: '#FF00FF' }, hookTitle: { textColor: '#FF00FF' } },
      },
      {
        id: 'neon-ice',
        name: 'Ice',
        description: 'Cool blue neon glow — frozen, crystalline energy.',
        thumbnail: '🧊',
        captions: { style: { highlightColor: '#60A5FA', emphasisColor: '#60A5FA', supersizeColor: '#C4B5FD', outlineColor: '#1E3A5F' } },
        overlays: { progressBar: { color: '#60A5FA' }, hookTitle: { textColor: '#60A5FA' } },
      },
      {
        id: 'neon-gold',
        name: 'Gold',
        description: 'Warm gold neon glow — premium nightlife aesthetic.',
        thumbnail: '✨',
        captions: { style: { highlightColor: '#FFD700', emphasisColor: '#FFD700', supersizeColor: '#FFFFFF', outlineColor: '#3D2800' } },
        sound: { backgroundMusicTrack: 'ambient-motivational' },
        overlays: { progressBar: { color: '#FFD700' }, hookTitle: { textColor: '#FFD700' } },
      },
      {
        id: 'neon-matrix',
        name: 'Matrix',
        description: 'Green-on-black terminal glow — digital, hacker aesthetic.',
        thumbnail: '🟢',
        captions: { style: { highlightColor: '#22C55E', emphasisColor: '#22C55E', supersizeColor: '#4ADE80', outlineColor: '#052E16' } },
        zoom: { mode: 'jump-cut', intervalSeconds: 2 },
        overlays: { progressBar: { color: '#22C55E' }, hookTitle: { textColor: '#22C55E' } },
      },
    ],
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

    variants: [
      {
        id: 'prime-classic',
        name: 'Classic',
        description: 'Corporate blue boxes with fade-in — the original Prime.',
        thumbnail: '💼',
      },
      {
        id: 'prime-dark',
        name: 'Dark Mode',
        description: 'Near-black boxes with cool blue text — executive dark theme.',
        thumbnail: '🌑',
        captions: { style: { primaryColor: '#E2E8F0', outlineColor: '#0F172A', backColor: '#E60F172A', highlightColor: '#3B82F6' } },
        overlays: { hookTitle: { textColor: '#E2E8F0', outlineColor: '#0F172A' } },
      },
      {
        id: 'prime-emerald',
        name: 'Emerald',
        description: 'Green corporate palette — fresh, modern startup energy.',
        thumbnail: '💚',
        captions: { style: { highlightColor: '#10B981', emphasisColor: '#10B981', supersizeColor: '#34D399' } },
        overlays: { progressBar: { color: '#10B981' } },
      },
      {
        id: 'prime-warm',
        name: 'Warm',
        description: 'Amber corporate accent — professional with a human touch.',
        thumbnail: '🧡',
        captions: { style: { highlightColor: '#F59E0B', emphasisColor: '#F59E0B', supersizeColor: '#FBBF24' } },
        sound: { enabled: true, backgroundMusicTrack: 'ambient-motivational', musicVolume: 0.06 },
        overlays: { progressBar: { color: '#F59E0B' } },
      },
    ],
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
