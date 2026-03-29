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
      backgroundMusicTrack: 'impact-hype',
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
      backgroundMusicTrack: 'clarity-focus',
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
      backgroundMusicTrack: 'high-energy-beats',
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
      backgroundMusicTrack: 'corporate-upbeat',
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
        sound: { sfxStyle: 'minimal', musicVolume: 0.08, backgroundMusicTrack: 'clarity-focus' },
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
      backgroundMusicTrack: 'volt-electric',
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
      backgroundMusicTrack: 'cinematic-ambient',
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
        sound: { backgroundMusicTrack: 'cinematic-golden' },
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
      backgroundMusicTrack: 'ember-warm',
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
      backgroundMusicTrack: 'gritty-lofi',
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
        sound: { backgroundMusicTrack: 'gritty-dark', musicVolume: 0.1 },
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
      backgroundMusicTrack: 'synthwave-neon',
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
        sound: { backgroundMusicTrack: 'synthwave-vapor' },
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
      backgroundMusicTrack: 'corporate-upbeat',
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
        sound: { enabled: true, backgroundMusicTrack: 'ember-warm', musicVolume: 0.06 },
        overlays: { progressBar: { color: '#F59E0B' } },
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // BATCH 2 — BOLD / LOUD / HIGH-ENERGY
  // All-caps, thick outlines, heavy fonts, punchy pop/bounce animations.
  // Star & constellation names.
  // ═══════════════════════════════════════════════════════════════════════════

  // ─────────────────────────────────────────────────────────────────────────
  // 11. ORION — All-caps thick outline with snap/pop animation
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'orion',
    name: 'Orion',
    description: 'Thick black outlines and single-word snap pops — each word hits like a punch.',
    thumbnail: '⭐',
    category: 'viral',
    tags: ['bold', 'loud', 'thick-outline', 'snap', 'uppercase', 'anton', 'all-caps'],
    builtIn: true,

    captions: {
      enabled: true,
      style: {
        id: 'orion-caption',
        label: 'Orion',
        fontName: 'Anton',
        fontFile: 'Anton-Regular.ttf',
        fontSize: 0.085,
        primaryColor: '#FFFFFF',
        highlightColor: '#FF2D2D',
        outlineColor: '#000000',
        backColor: '#00000000',
        outline: 7,
        shadow: 0,
        borderStyle: 1,
        wordsPerLine: 1,
        animation: 'word-pop',
        emphasisColor: '#FF2D2D',
        supersizeColor: '#FFD700',
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
      backgroundMusicTrack: 'impact-hype',
      sfxVolume: 0.85,
      musicVolume: 0.1,
      musicDucking: true,
      musicDuckLevel: 0.1,
    },

    overlays: {
      hookTitle: {
        enabled: true,
        style: 'centered-bold',
        displayDuration: 2.0,
        fontSize: 88,
        textColor: '#FFFFFF',
        outlineColor: '#000000',
        outlineWidth: 6,
      },
      rehook: {
        enabled: true,
        style: 'slide-up',
        displayDuration: 1.2,
      },
      progressBar: {
        enabled: true,
        style: 'solid',
        position: 'top',
        height: 6,
        color: '#FF2D2D',
        opacity: 1.0,
      },
    },

    variants: [
      {
        id: 'orion-classic',
        name: 'Classic',
        description: 'White text, red highlight, thick black outline — the original Orion snap.',
        thumbnail: '⭐',
      },
      {
        id: 'orion-blaze',
        name: 'Blaze',
        description: 'Orange-yellow fire highlight — Orion at maximum heat.',
        thumbnail: '🔥',
        captions: { style: { highlightColor: '#FF6B35', emphasisColor: '#FF6B35', supersizeColor: '#FFFFFF' } },
        overlays: { progressBar: { color: '#FF6B35' }, hookTitle: { textColor: '#FF6B35' } },
      },
      {
        id: 'orion-frost',
        name: 'Frost',
        description: 'Ice-blue snap on deep black — cold, sharp, clinical.',
        thumbnail: '🧊',
        captions: { style: { highlightColor: '#00BFFF', emphasisColor: '#00BFFF', supersizeColor: '#E0F2FE' } },
        overlays: { progressBar: { color: '#00BFFF' }, hookTitle: { textColor: '#00BFFF' } },
      },
      {
        id: 'orion-gold',
        name: 'Gold',
        description: 'Gold highlight with heavyweight presence — championship energy.',
        thumbnail: '🏆',
        captions: { style: { highlightColor: '#FFD700', emphasisColor: '#FFD700', supersizeColor: '#FFFFFF' } },
        overlays: { progressBar: { color: '#FFD700' }, hookTitle: { textColor: '#FFD700' } },
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 12. SIRIUS — All-caps colored text with thick black outline
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'sirius',
    name: 'Sirius',
    description: 'Colored text with thick black outlines — bright, bold, and impossible to ignore.',
    thumbnail: '💛',
    category: 'viral',
    tags: ['bold', 'loud', 'colored-text', 'all-caps', 'bangers', 'punchy'],
    builtIn: true,

    captions: {
      enabled: true,
      style: {
        id: 'sirius-caption',
        label: 'Sirius',
        fontName: 'Bangers',
        fontFile: 'Bangers-Regular.ttf',
        fontSize: 0.08,
        primaryColor: '#FFE600',
        highlightColor: '#00FFFF',
        outlineColor: '#000000',
        backColor: '#00000000',
        outline: 6,
        shadow: 2,
        borderStyle: 1,
        wordsPerLine: 2,
        animation: 'captions-ai',
        emphasisColor: '#00FFFF',
        supersizeColor: '#FF6B35',
      },
    },

    zoom: {
      enabled: true,
      mode: 'reactive',
      intensity: 'dynamic',
      intervalSeconds: 2.5,
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
      backgroundMusicTrack: 'high-energy-beats',
      sfxVolume: 0.75,
      musicVolume: 0.11,
      musicDucking: true,
      musicDuckLevel: 0.12,
    },

    overlays: {
      hookTitle: {
        enabled: true,
        style: 'centered-bold',
        displayDuration: 2.5,
        fontSize: 80,
        textColor: '#FFE600',
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
        id: 'sirius-classic',
        name: 'Classic',
        description: 'Yellow text, cyan emphasis, orange supersize — the original Sirius.',
        thumbnail: '💛',
      },
      {
        id: 'sirius-electric',
        name: 'Electric',
        description: 'Hot pink primary with green pops — maximum color energy.',
        thumbnail: '⚡',
        captions: { style: { primaryColor: '#FF00FF', highlightColor: '#00FF66', emphasisColor: '#00FF66', supersizeColor: '#FFFFFF' } },
        overlays: { progressBar: { color: '#FF00FF' }, hookTitle: { textColor: '#FF00FF' } },
      },
      {
        id: 'sirius-arctic',
        name: 'Arctic',
        description: 'Bright cyan text with white pops — ice-cold color blast.',
        thumbnail: '❄️',
        captions: { style: { primaryColor: '#00FFFF', highlightColor: '#FFFFFF', emphasisColor: '#FFFFFF', supersizeColor: '#FFE600' } },
        overlays: { progressBar: { color: '#00FFFF' }, hookTitle: { textColor: '#00FFFF' } },
      },
      {
        id: 'sirius-lava',
        name: 'Lava',
        description: 'Orange text with red emphasis — molten energy on dark.',
        thumbnail: '🌋',
        captions: { style: { primaryColor: '#FF6B35', highlightColor: '#FF2D2D', emphasisColor: '#FF2D2D', supersizeColor: '#FFD700' } },
        overlays: { progressBar: { color: '#FF6B35' }, hookTitle: { textColor: '#FF6B35' } },
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 13. VEGA — Bold display font (Bebas Neue) with slide-up cascade
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'vega',
    name: 'Vega',
    description: 'Tall condensed display type that rises into frame — theatrical, commanding, unmissable.',
    thumbnail: '🌟',
    category: 'viral',
    tags: ['bold', 'loud', 'display', 'bebas-neue', 'slide-up', 'condensed', 'tall'],
    builtIn: true,

    captions: {
      enabled: true,
      style: {
        id: 'vega-caption',
        label: 'Vega',
        fontName: 'Bebas Neue',
        fontFile: 'BebasNeue-Regular.ttf',
        fontSize: 0.09,
        primaryColor: '#FFFFFF',
        highlightColor: '#FF00FF',
        outlineColor: '#000000',
        backColor: '#00000000',
        outline: 5,
        shadow: 0,
        borderStyle: 1,
        wordsPerLine: 2,
        animation: 'cascade',
        emphasisColor: '#FF00FF',
        supersizeColor: '#00FFFF',
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
      transition: 'swipe-up',
      pipSize: 0.25,
      pipPosition: 'bottom-right',
      intervalSeconds: 5,
      clipDuration: 3,
    },

    sound: {
      enabled: true,
      sfxStyle: 'energetic',
      backgroundMusicTrack: 'impact-hype',
      sfxVolume: 0.7,
      musicVolume: 0.1,
      musicDucking: true,
      musicDuckLevel: 0.12,
    },

    overlays: {
      hookTitle: {
        enabled: true,
        style: 'centered-bold',
        displayDuration: 2.5,
        fontSize: 84,
        textColor: '#FFFFFF',
        outlineColor: '#000000',
        outlineWidth: 5,
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
        color: '#FF00FF',
        opacity: 0.95,
      },
    },

    variants: [
      {
        id: 'vega-classic',
        name: 'Classic',
        description: 'White text with magenta cascade rise — the original Vega.',
        thumbnail: '🌟',
      },
      {
        id: 'vega-sunrise',
        name: 'Sunrise',
        description: 'Warm amber highlights rising into frame — dawn energy.',
        thumbnail: '🌅',
        captions: { style: { highlightColor: '#FF9B21', emphasisColor: '#FF9B21', supersizeColor: '#FFD700' } },
        overlays: { progressBar: { color: '#FF9B21' }, hookTitle: { textColor: '#FF9B21' } },
      },
      {
        id: 'vega-ultraviolet',
        name: 'Ultraviolet',
        description: 'Purple-violet cascade — deep, electric, hypnotic.',
        thumbnail: '🔮',
        captions: { style: { highlightColor: '#A855F7', emphasisColor: '#A855F7', supersizeColor: '#E879F9', outlineColor: '#1A0033' } },
        overlays: { progressBar: { color: '#A855F7' }, hookTitle: { textColor: '#A855F7' } },
      },
      {
        id: 'vega-whiteout',
        name: 'Whiteout',
        description: 'Pure white, zero color, maximum contrast — text as architecture.',
        thumbnail: '⬜',
        captions: { style: { highlightColor: '#FFFFFF', emphasisColor: '#FFFFFF', supersizeColor: '#FFFFFF', outline: 6 } },
        overlays: { progressBar: { color: '#FFFFFF' }, hookTitle: { textColor: '#FFFFFF' } },
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 14. RIGEL — Impact-style stacked text with hard drop shadow
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'rigel',
    name: 'Rigel',
    description: 'Massive stacked key-word with heavy drop shadow — words that slam into the screen.',
    thumbnail: '💀',
    category: 'viral',
    tags: ['bold', 'loud', 'impact', 'drop-shadow', 'stacked', 'anton', 'heavy'],
    builtIn: true,

    captions: {
      enabled: true,
      style: {
        id: 'rigel-caption',
        label: 'Rigel',
        fontName: 'Anton',
        fontFile: 'Anton-Regular.ttf',
        fontSize: 0.075,
        primaryColor: '#FFFFFF',
        highlightColor: '#C8FF00',
        outlineColor: '#000000',
        backColor: '#00000000',
        outline: 5,
        shadow: 5,
        borderStyle: 1,
        wordsPerLine: 3,
        animation: 'impact-two',
        emphasisColor: '#C8FF00',
        supersizeColor: '#FF2D2D',
      },
    },

    zoom: {
      enabled: true,
      mode: 'jump-cut',
      intensity: 'dynamic',
      intervalSeconds: 1.5,
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
      backgroundMusicTrack: 'volt-electric',
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
        fontSize: 80,
        textColor: '#C8FF00',
        outlineColor: '#000000',
        outlineWidth: 6,
      },
      rehook: {
        enabled: true,
        style: 'slide-up',
        displayDuration: 1.0,
      },
      progressBar: {
        enabled: false,
        style: 'solid',
        position: 'top',
        height: 6,
        color: '#C8FF00',
        opacity: 1.0,
      },
    },

    variants: [
      {
        id: 'rigel-classic',
        name: 'Classic',
        description: 'Lime-green highlight with heavy shadow — the original Rigel slam.',
        thumbnail: '💀',
      },
      {
        id: 'rigel-bloodmoon',
        name: 'Blood Moon',
        description: 'Deep red highlight with crushing shadow — maximum menace.',
        thumbnail: '🔴',
        captions: { style: { highlightColor: '#FF2D2D', emphasisColor: '#FF2D2D', supersizeColor: '#FFE600' } },
        overlays: { hookTitle: { textColor: '#FF2D2D' } },
      },
      {
        id: 'rigel-supernova',
        name: 'Supernova',
        description: 'White-hot highlight with gold supersize — blinding impact.',
        thumbnail: '💫',
        captions: { style: { highlightColor: '#FFFFFF', emphasisColor: '#FFFFFF', supersizeColor: '#FFD700', shadow: 6 } },
        overlays: { hookTitle: { textColor: '#FFFFFF' } },
      },
      {
        id: 'rigel-toxic',
        name: 'Toxic',
        description: 'Acid green with purple supersize — hazardous energy.',
        thumbnail: '☢️',
        captions: { style: { highlightColor: '#84CC16', emphasisColor: '#84CC16', supersizeColor: '#A855F7' } },
        overlays: { hookTitle: { textColor: '#84CC16' } },
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 15. POLARIS — Heavy weight with colored background boxes
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'polaris',
    name: 'Polaris',
    description: 'Bold condensed text in chunky colored boxes — impossible to miss, easy to read.',
    thumbnail: '📦',
    category: 'viral',
    tags: ['bold', 'loud', 'boxes', 'background', 'oswald', 'chunky', 'all-caps'],
    builtIn: true,

    captions: {
      enabled: true,
      style: {
        id: 'polaris-caption',
        label: 'Polaris',
        fontName: 'Oswald',
        fontFile: 'Oswald.ttf',
        fontSize: 0.075,
        primaryColor: '#FFFFFF',
        highlightColor: '#FF2D2D',
        outlineColor: '#FF2D2D',
        backColor: '#FF2D2D',
        outline: 0,
        shadow: 0,
        borderStyle: 3,
        wordsPerLine: 2,
        animation: 'word-box',
        emphasisColor: '#FFE600',
        supersizeColor: '#00FFFF',
      },
    },

    zoom: {
      enabled: true,
      mode: 'reactive',
      intensity: 'dynamic',
      intervalSeconds: 2.5,
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
      backgroundMusicTrack: 'impact-hype',
      sfxVolume: 0.8,
      musicVolume: 0.1,
      musicDucking: true,
      musicDuckLevel: 0.12,
    },

    overlays: {
      hookTitle: {
        enabled: true,
        style: 'centered-bold',
        displayDuration: 2.5,
        fontSize: 76,
        textColor: '#FFFFFF',
        outlineColor: '#FF2D2D',
        outlineWidth: 0,
      },
      rehook: {
        enabled: true,
        style: 'bar',
        displayDuration: 1.5,
      },
      progressBar: {
        enabled: true,
        style: 'solid',
        position: 'bottom',
        height: 6,
        color: '#FF2D2D',
        opacity: 1.0,
      },
    },

    variants: [
      {
        id: 'polaris-classic',
        name: 'Classic',
        description: 'Red boxes, white text, yellow emphasis — the original Polaris.',
        thumbnail: '📦',
      },
      {
        id: 'polaris-midnight',
        name: 'Midnight',
        description: 'Deep navy boxes with electric blue emphasis — dark authority.',
        thumbnail: '🌃',
        captions: { style: { outlineColor: '#1E293B', backColor: '#1E293B', highlightColor: '#3B82F6', emphasisColor: '#3B82F6', supersizeColor: '#60A5FA' } },
        overlays: { progressBar: { color: '#1E293B' } },
      },
      {
        id: 'polaris-solar',
        name: 'Solar',
        description: 'Bright yellow boxes with dark text — maximum visibility.',
        thumbnail: '☀️',
        captions: { style: { primaryColor: '#1A1A1A', outlineColor: '#FFE600', backColor: '#FFE600', highlightColor: '#FF2D2D', emphasisColor: '#FF2D2D', supersizeColor: '#FF6B35' } },
        overlays: { progressBar: { color: '#FFE600' }, hookTitle: { textColor: '#1A1A1A', outlineColor: '#FFE600' } },
      },
      {
        id: 'polaris-emerald',
        name: 'Emerald',
        description: 'Green boxes with white text — bold, fresh, unmistakable.',
        thumbnail: '💚',
        captions: { style: { outlineColor: '#16A34A', backColor: '#16A34A', highlightColor: '#FFE600', emphasisColor: '#FFE600', supersizeColor: '#FFFFFF' } },
        overlays: { progressBar: { color: '#16A34A' } },
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 16. ALTAIR — All-caps with double stroke (outline on outline)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'altair',
    name: 'Altair',
    description: 'Ultra-thick double-stroke outlines with elastic bounce — text that owns the frame.',
    thumbnail: '🔷',
    category: 'viral',
    tags: ['bold', 'loud', 'double-stroke', 'thick', 'bounce', 'montserrat', 'all-caps'],
    builtIn: true,

    captions: {
      enabled: true,
      style: {
        id: 'altair-caption',
        label: 'Altair',
        fontName: 'Montserrat',
        fontFile: 'Montserrat-Bold.ttf',
        fontSize: 0.08,
        primaryColor: '#FFFFFF',
        highlightColor: '#FF00FF',
        outlineColor: '#000000',
        backColor: '#00000000',
        outline: 8,
        shadow: 4,
        borderStyle: 1,
        wordsPerLine: 1,
        animation: 'elastic-bounce',
        emphasisColor: '#FF00FF',
        supersizeColor: '#00FFFF',
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
      backgroundMusicTrack: 'volt-electric',
      sfxVolume: 0.85,
      musicVolume: 0.09,
      musicDucking: true,
      musicDuckLevel: 0.1,
    },

    overlays: {
      hookTitle: {
        enabled: true,
        style: 'centered-bold',
        displayDuration: 2.0,
        fontSize: 84,
        textColor: '#FFFFFF',
        outlineColor: '#000000',
        outlineWidth: 7,
      },
      rehook: {
        enabled: true,
        style: 'slide-up',
        displayDuration: 1.2,
      },
      progressBar: {
        enabled: true,
        style: 'glow',
        position: 'bottom',
        height: 6,
        color: '#FF00FF',
        opacity: 1.0,
      },
    },

    variants: [
      {
        id: 'altair-classic',
        name: 'Classic',
        description: 'Hot pink highlight, ultra-thick outlines, elastic bounce — the original Altair.',
        thumbnail: '🔷',
      },
      {
        id: 'altair-plasma',
        name: 'Plasma',
        description: 'Electric cyan on purple stroke — plasma arc energy.',
        thumbnail: '🟣',
        captions: { style: { highlightColor: '#00FFFF', emphasisColor: '#00FFFF', supersizeColor: '#FF00FF', outlineColor: '#2D004D' } },
        overlays: { progressBar: { color: '#00FFFF' }, hookTitle: { textColor: '#00FFFF', outlineColor: '#2D004D' } },
      },
      {
        id: 'altair-fire',
        name: 'Fire',
        description: 'Red-orange highlight with maximum outline mass — heavyweight.',
        thumbnail: '🔥',
        captions: { style: { highlightColor: '#FF6B35', emphasisColor: '#FF6B35', supersizeColor: '#FFD700', outline: 9 } },
        overlays: { progressBar: { color: '#FF6B35' }, hookTitle: { textColor: '#FF6B35' } },
      },
      {
        id: 'altair-monochrome',
        name: 'Monochrome',
        description: 'White double-stroke, zero color — pure typographic force.',
        thumbnail: '⬛',
        captions: { style: { highlightColor: '#FFFFFF', emphasisColor: '#FFFFFF', supersizeColor: '#FFFFFF', outline: 9, shadow: 5 } },
        overlays: { progressBar: { color: '#FFFFFF' }, hookTitle: { textColor: '#FFFFFF' } },
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 17. DENEB — Bold with neon glow shadow
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'deneb',
    name: 'Deneb',
    description: 'Neon glow pulsing around every word — bold text that radiates light.',
    thumbnail: '💜',
    category: 'viral',
    tags: ['bold', 'loud', 'neon', 'glow', 'purple', 'poppins', 'radiant'],
    builtIn: true,

    captions: {
      enabled: true,
      style: {
        id: 'deneb-caption',
        label: 'Deneb',
        fontName: 'Poppins',
        fontFile: 'Poppins-Bold.ttf',
        fontSize: 0.075,
        primaryColor: '#FFFFFF',
        highlightColor: '#BF5AF2',
        outlineColor: '#7B2FBE',
        backColor: '#00000000',
        outline: 4,
        shadow: 0,
        borderStyle: 1,
        wordsPerLine: 2,
        animation: 'glow',
        emphasisColor: '#BF5AF2',
        supersizeColor: '#FF2D78',
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
      pipSize: 0.28,
      pipPosition: 'bottom-right',
      intervalSeconds: 5,
      clipDuration: 3,
    },

    sound: {
      enabled: true,
      sfxStyle: 'energetic',
      backgroundMusicTrack: 'synthwave-neon',
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
        fontSize: 76,
        textColor: '#BF5AF2',
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
        color: '#BF5AF2',
        opacity: 0.95,
      },
    },

    variants: [
      {
        id: 'deneb-classic',
        name: 'Classic',
        description: 'Purple neon glow with pink supersize — the original Deneb.',
        thumbnail: '💜',
      },
      {
        id: 'deneb-bubblegum',
        name: 'Bubblegum',
        description: 'Hot pink glow with cyan bursts — candy-colored neon.',
        thumbnail: '🩷',
        captions: { style: { highlightColor: '#FF2D78', emphasisColor: '#FF2D78', supersizeColor: '#00FFFF', outlineColor: '#8B0040' } },
        overlays: { progressBar: { color: '#FF2D78' }, hookTitle: { textColor: '#FF2D78' } },
      },
      {
        id: 'deneb-lazuli',
        name: 'Lazuli',
        description: 'Deep blue neon with white flare — cool, commanding glow.',
        thumbnail: '💙',
        captions: { style: { highlightColor: '#4F8AFF', emphasisColor: '#4F8AFF', supersizeColor: '#FFFFFF', outlineColor: '#1E3A5F' } },
        overlays: { progressBar: { color: '#4F8AFF' }, hookTitle: { textColor: '#4F8AFF' } },
      },
      {
        id: 'deneb-solar',
        name: 'Solar',
        description: 'Gold neon glow with warm amber edges — premium radiance.',
        thumbnail: '🌟',
        captions: { style: { highlightColor: '#FFD700', emphasisColor: '#FFD700', supersizeColor: '#FFFFFF', outlineColor: '#5C4100' } },
        overlays: { progressBar: { color: '#FFD700' }, hookTitle: { textColor: '#FFD700' } },
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 18. CASTOR — Chunky hand-drawn with bounce-in and emphasis scale
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'castor',
    name: 'Castor',
    description: 'Chunky hand-drawn marker text that bounces in with spring overshoot — raw, expressive, loud.',
    thumbnail: '🎪',
    category: 'viral',
    tags: ['bold', 'loud', 'chunky', 'bounce', 'marker', 'permanent-marker', 'hand-drawn'],
    builtIn: true,

    captions: {
      enabled: true,
      style: {
        id: 'castor-caption',
        label: 'Castor',
        fontName: 'Permanent Marker',
        fontFile: 'PermanentMarker-Regular.ttf',
        fontSize: 0.078,
        primaryColor: '#FFFFFF',
        highlightColor: '#FF6B35',
        outlineColor: '#000000',
        backColor: '#00000000',
        outline: 5,
        shadow: 3,
        borderStyle: 1,
        wordsPerLine: 2,
        animation: 'elastic-bounce',
        emphasisColor: '#FF6B35',
        supersizeColor: '#FFE600',
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
      displayMode: 'fullscreen',
      transition: 'swipe-up',
      pipSize: 0.25,
      pipPosition: 'bottom-right',
      intervalSeconds: 5,
      clipDuration: 3,
    },

    sound: {
      enabled: true,
      sfxStyle: 'energetic',
      backgroundMusicTrack: 'gritty-lofi',
      sfxVolume: 0.8,
      musicVolume: 0.09,
      musicDucking: true,
      musicDuckLevel: 0.12,
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
        style: 'slide-up',
        displayDuration: 1.2,
      },
      progressBar: {
        enabled: true,
        style: 'solid',
        position: 'bottom',
        height: 5,
        color: '#FF6B35',
        opacity: 1.0,
      },
    },

    variants: [
      {
        id: 'castor-classic',
        name: 'Classic',
        description: 'Orange bounce with yellow supersize — the original Castor.',
        thumbnail: '🎪',
      },
      {
        id: 'castor-rage',
        name: 'Rage',
        description: 'Blood-red marker bounce — raw, unfiltered aggression.',
        thumbnail: '🤬',
        captions: { style: { highlightColor: '#FF2D2D', emphasisColor: '#FF2D2D', supersizeColor: '#FFFFFF' } },
        sound: { sfxVolume: 0.95 },
        overlays: { progressBar: { color: '#FF2D2D' } },
      },
      {
        id: 'castor-jungle',
        name: 'Jungle',
        description: 'Lime-green marker on dark — wild, untamed bounce energy.',
        thumbnail: '🌴',
        captions: { style: { highlightColor: '#84CC16', emphasisColor: '#84CC16', supersizeColor: '#FACC15' } },
        overlays: { progressBar: { color: '#84CC16' } },
      },
      {
        id: 'castor-graffiti',
        name: 'Graffiti',
        description: 'Purple marker with cyan pops — street art bounce.',
        thumbnail: '🎨',
        captions: { style: { highlightColor: '#A855F7', emphasisColor: '#A855F7', supersizeColor: '#00FFFF' } },
        overlays: { progressBar: { color: '#A855F7' } },
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 19. PERSEUS — Uppercase monospace with green highlight (hacker vibe)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'perseus',
    name: 'Perseus',
    description: 'Terminal monospace with green-on-dark typewriter reveal — hacker energy, one character at a time.',
    thumbnail: '🖥️',
    category: 'viral',
    tags: ['bold', 'loud', 'hacker', 'monospace', 'green', 'terminal', 'jetbrains-mono', 'matrix'],
    builtIn: true,

    captions: {
      enabled: true,
      style: {
        id: 'perseus-caption',
        label: 'Perseus',
        fontName: 'JetBrains Mono',
        fontFile: 'JetBrainsMono.ttf',
        fontSize: 0.065,
        primaryColor: '#00FF66',
        highlightColor: '#FFFFFF',
        outlineColor: '#001A00',
        backColor: '#CC001A00',
        outline: 2,
        shadow: 0,
        borderStyle: 1,
        wordsPerLine: 2,
        animation: 'typewriter',
        emphasisColor: '#FFFFFF',
        supersizeColor: '#00FFFF',
      },
    },

    zoom: {
      enabled: true,
      mode: 'jump-cut',
      intensity: 'medium',
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
      sfxStyle: 'standard',
      backgroundMusicTrack: 'synthwave-neon',
      sfxVolume: 0.55,
      musicVolume: 0.1,
      musicDucking: true,
      musicDuckLevel: 0.15,
    },

    overlays: {
      hookTitle: {
        enabled: true,
        style: 'top-bar',
        displayDuration: 2.5,
        fontSize: 64,
        textColor: '#00FF66',
        outlineColor: '#001A00',
        outlineWidth: 3,
      },
      rehook: {
        enabled: true,
        style: 'text-only',
        displayDuration: 1.5,
      },
      progressBar: {
        enabled: true,
        style: 'glow',
        position: 'top',
        height: 4,
        color: '#00FF66',
        opacity: 0.9,
      },
    },

    variants: [
      {
        id: 'perseus-classic',
        name: 'Classic',
        description: 'Green terminal text, white emphasis — the original Perseus hacker look.',
        thumbnail: '🖥️',
      },
      {
        id: 'perseus-amber',
        name: 'Amber',
        description: 'Retro amber terminal — old-school CRT monitor vibes.',
        thumbnail: '🟠',
        captions: { style: { primaryColor: '#FFB000', highlightColor: '#FFFFFF', emphasisColor: '#FFFFFF', supersizeColor: '#FFE600', outlineColor: '#1A0E00', backColor: '#CC1A0E00' } },
        overlays: { progressBar: { color: '#FFB000' }, hookTitle: { textColor: '#FFB000', outlineColor: '#1A0E00' } },
      },
      {
        id: 'perseus-cypher',
        name: 'Cypher',
        description: 'Cyan text on deep blue — encrypted transmission aesthetic.',
        thumbnail: '🔐',
        captions: { style: { primaryColor: '#00FFFF', highlightColor: '#FFFFFF', emphasisColor: '#FFFFFF', supersizeColor: '#FF00FF', outlineColor: '#001A33', backColor: '#CC001A33' } },
        overlays: { progressBar: { color: '#00FFFF' }, hookTitle: { textColor: '#00FFFF', outlineColor: '#001A33' } },
      },
      {
        id: 'perseus-redpill',
        name: 'Red Pill',
        description: 'Red terminal with green bursts — choose your reality.',
        thumbnail: '💊',
        captions: { style: { primaryColor: '#FF2D2D', highlightColor: '#00FF66', emphasisColor: '#00FF66', supersizeColor: '#FFFFFF', outlineColor: '#1A0000', backColor: '#CC1A0000' } },
        overlays: { progressBar: { color: '#FF2D2D' }, hookTitle: { textColor: '#FF2D2D', outlineColor: '#1A0000' } },
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 20. LYRA — Bold condensed with swipe/cascade reveal
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'lyra',
    name: 'Lyra',
    description: 'Bold condensed type sweeping in word by word — fast, tight, relentless forward motion.',
    thumbnail: '🎵',
    category: 'viral',
    tags: ['bold', 'loud', 'condensed', 'swipe', 'oswald', 'reveal', 'fast'],
    builtIn: true,

    captions: {
      enabled: true,
      style: {
        id: 'lyra-caption',
        label: 'Lyra',
        fontName: 'Oswald',
        fontFile: 'Oswald.ttf',
        fontSize: 0.08,
        primaryColor: '#FFFFFF',
        highlightColor: '#FF4D6A',
        outlineColor: '#000000',
        backColor: '#00000000',
        outline: 5,
        shadow: 2,
        borderStyle: 1,
        wordsPerLine: 2,
        animation: 'cascade',
        emphasisColor: '#FF4D6A',
        supersizeColor: '#FFD700',
      },
    },

    zoom: {
      enabled: true,
      mode: 'reactive',
      intensity: 'dynamic',
      intervalSeconds: 2.5,
    },

    broll: {
      enabled: false,
      displayMode: 'fullscreen',
      transition: 'swipe-up',
      pipSize: 0.25,
      pipPosition: 'bottom-right',
      intervalSeconds: 5,
      clipDuration: 3,
    },

    sound: {
      enabled: true,
      sfxStyle: 'energetic',
      backgroundMusicTrack: 'high-energy-beats',
      sfxVolume: 0.75,
      musicVolume: 0.11,
      musicDucking: true,
      musicDuckLevel: 0.12,
    },

    overlays: {
      hookTitle: {
        enabled: true,
        style: 'centered-bold',
        displayDuration: 2.0,
        fontSize: 80,
        textColor: '#FFFFFF',
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
        position: 'bottom',
        height: 5,
        color: '#FF4D6A',
        opacity: 1.0,
      },
    },

    variants: [
      {
        id: 'lyra-classic',
        name: 'Classic',
        description: 'Coral-pink cascade on condensed type — the original Lyra sweep.',
        thumbnail: '🎵',
      },
      {
        id: 'lyra-voltage',
        name: 'Voltage',
        description: 'Electric yellow sweep with cyan supersize — high-voltage condensed.',
        thumbnail: '⚡',
        captions: { style: { highlightColor: '#FFE600', emphasisColor: '#FFE600', supersizeColor: '#00FFFF' } },
        overlays: { progressBar: { color: '#FFE600' }, hookTitle: { textColor: '#FFE600' } },
      },
      {
        id: 'lyra-phantom',
        name: 'Phantom',
        description: 'Grey text with white emphasis — stealth cascade, understated power.',
        thumbnail: '👻',
        captions: { style: { primaryColor: '#94A3B8', highlightColor: '#FFFFFF', emphasisColor: '#FFFFFF', supersizeColor: '#FFFFFF', outline: 4 } },
        overlays: { progressBar: { color: '#94A3B8', opacity: 0.7 }, hookTitle: { textColor: '#94A3B8' } },
      },
      {
        id: 'lyra-inferno',
        name: 'Inferno',
        description: 'Red-orange sweep with maximum zoom aggression — full-throttle Lyra.',
        thumbnail: '🔥',
        captions: { style: { highlightColor: '#FF2D2D', emphasisColor: '#FF2D2D', supersizeColor: '#FF6B35' } },
        zoom: { mode: 'jump-cut', intervalSeconds: 1.5 },
        sound: { sfxVolume: 0.9 },
        overlays: { progressBar: { color: '#FF2D2D' } },
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 21. CORVUS — Warm serif typewriter, cream tones, classic film feel
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'corvus',
    name: 'Corvus',
    description: 'Warm cream serif with typewriter reveal — like captions pulled from a vintage film print.',
    thumbnail: '🪶',
    category: 'cinematic',
    tags: ['serif', 'typewriter', 'warm', 'cream', 'cinematic', 'lora', 'retro', 'film'],
    builtIn: true,

    captions: {
      enabled: true,
      style: {
        id: 'corvus-caption',
        label: 'Corvus',
        fontName: 'Lora',
        fontFile: 'Lora.ttf',
        fontSize: 0.058,
        primaryColor: '#FDF6E3',
        highlightColor: '#E8D5A3',
        outlineColor: '#1A1409',
        backColor: '#00000000',
        outline: 2,
        shadow: 1,
        borderStyle: 1,
        wordsPerLine: 4,
        animation: 'typewriter',
        emphasisColor: '#F5C542',
        supersizeColor: '#FFFFFF',
      },
    },

    zoom: {
      enabled: true,
      mode: 'ken-burns',
      intensity: 'subtle',
      intervalSeconds: 8,
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
      backgroundMusicTrack: 'cinematic-ambient',
      sfxVolume: 0.2,
      musicVolume: 0.1,
      musicDucking: true,
      musicDuckLevel: 0.2,
    },

    overlays: {
      hookTitle: {
        enabled: true,
        style: 'slide-in',
        displayDuration: 3.0,
        fontSize: 64,
        textColor: '#FDF6E3',
        outlineColor: '#1A1409',
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
        height: 2,
        color: '#E8D5A3',
        opacity: 0.5,
      },
    },

    variants: [
      {
        id: 'corvus-classic',
        name: 'Classic',
        description: 'Warm cream typewriter on dark serif — the original Corvus look.',
        thumbnail: '🪶',
      },
      {
        id: 'corvus-parchment',
        name: 'Parchment',
        description: 'Deeper amber highlights on aged-paper cream — old manuscript warmth.',
        thumbnail: '📜',
        captions: { style: { primaryColor: '#F5E6C8', highlightColor: '#D4A056', emphasisColor: '#D4A056' } },
        overlays: { hookTitle: { textColor: '#F5E6C8' } },
      },
      {
        id: 'corvus-moonlit',
        name: 'Moonlit',
        description: 'Cool silver-white on deep blue-black — typewriter under moonlight.',
        thumbnail: '🌙',
        captions: { style: { primaryColor: '#E8EDF2', highlightColor: '#A8C4E0', emphasisColor: '#A8C4E0', outlineColor: '#0A0F1A' } },
        overlays: { hookTitle: { textColor: '#E8EDF2', outlineColor: '#0A0F1A' } },
      },
      {
        id: 'corvus-sepia',
        name: 'Sepia',
        description: 'Full sepia treatment — brown-toned text like faded cinema subtitles.',
        thumbnail: '🟤',
        captions: { style: { primaryColor: '#D4C5A9', highlightColor: '#8B7355', emphasisColor: '#8B7355', outlineColor: '#2C2016' } },
        overlays: { hookTitle: { textColor: '#D4C5A9', outlineColor: '#2C2016' } },
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 22. DRACO — Thin-outlined serif with elegant fade animation
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'draco',
    name: 'Draco',
    description: 'Thin-outlined serif with slow fade reveal — delicate, airy, effortlessly refined.',
    thumbnail: '🐉',
    category: 'cinematic',
    tags: ['serif', 'thin', 'outline', 'fade', 'elegant', 'playfair', 'refined', 'subtle'],
    builtIn: true,

    captions: {
      enabled: true,
      style: {
        id: 'draco-caption',
        label: 'Draco',
        fontName: 'Playfair Display',
        fontFile: 'PlayfairDisplay.ttf',
        fontSize: 0.06,
        primaryColor: '#FFFFFF',
        highlightColor: '#D4C5A9',
        outlineColor: '#3D3529',
        backColor: '#00000000',
        outline: 1,
        shadow: 0,
        borderStyle: 1,
        wordsPerLine: 3,
        animation: 'fade-in',
        emphasisColor: '#E8D5A3',
        supersizeColor: '#FFFFFF',
      },
    },

    zoom: {
      enabled: true,
      mode: 'ken-burns',
      intensity: 'subtle',
      intervalSeconds: 9,
    },

    broll: {
      enabled: false,
      displayMode: 'fullscreen',
      transition: 'crossfade',
      pipSize: 0.25,
      pipPosition: 'bottom-right',
      intervalSeconds: 9,
      clipDuration: 5,
    },

    sound: {
      enabled: true,
      sfxStyle: 'minimal',
      backgroundMusicTrack: 'cinematic-ambient',
      sfxVolume: 0.15,
      musicVolume: 0.1,
      musicDucking: true,
      musicDuckLevel: 0.25,
    },

    overlays: {
      hookTitle: {
        enabled: true,
        style: 'slide-in',
        displayDuration: 3.5,
        fontSize: 62,
        textColor: '#FFFFFF',
        outlineColor: '#3D3529',
        outlineWidth: 2,
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
        height: 2,
        color: '#D4C5A9',
        opacity: 0.4,
      },
    },

    variants: [
      {
        id: 'draco-classic',
        name: 'Classic',
        description: 'White Playfair with thin warm outline and fade — the original Draco.',
        thumbnail: '🐉',
      },
      {
        id: 'draco-mist',
        name: 'Mist',
        description: 'Soft lavender-grey text with whisper-thin outline — barely there, fully elegant.',
        thumbnail: '🌫️',
        captions: { style: { primaryColor: '#D6D0E8', highlightColor: '#B8A9D4', emphasisColor: '#B8A9D4', outlineColor: '#2A2535' } },
        overlays: { hookTitle: { textColor: '#D6D0E8', outlineColor: '#2A2535' } },
      },
      {
        id: 'draco-rose',
        name: 'Rosé',
        description: 'Blush pink serif with warm rose highlights — soft, luxurious, editorial.',
        thumbnail: '🌸',
        captions: { style: { primaryColor: '#F5E1E0', highlightColor: '#D4878F', emphasisColor: '#D4878F', outlineColor: '#3D2529' } },
        overlays: { hookTitle: { textColor: '#F5E1E0', outlineColor: '#3D2529' } },
      },
      {
        id: 'draco-ivory',
        name: 'Ivory',
        description: 'Warm ivory with no outline at all — pure minimalist serif floating on screen.',
        thumbnail: '🤍',
        captions: { style: { primaryColor: '#FFFFF0', highlightColor: '#D4AF37', emphasisColor: '#D4AF37', outline: 0, shadow: 1, outlineColor: '#000000' } },
        overlays: { hookTitle: { textColor: '#FFFFF0', outlineWidth: 0 } },
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 23. CARINA — Serif italic with elegant emphasis scaling
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'carina',
    name: 'Carina',
    description: 'Elegant italic serif with emphasis that scales gracefully — words that breathe and bloom.',
    thumbnail: '✨',
    category: 'cinematic',
    tags: ['serif', 'italic', 'elegant', 'scaling', 'playfair', 'refined', 'emphasis', 'bloom'],
    builtIn: true,

    captions: {
      enabled: true,
      style: {
        id: 'carina-caption',
        label: 'Carina',
        fontName: 'Playfair Display',
        fontFile: 'PlayfairDisplay.ttf',
        fontSize: 0.062,
        primaryColor: '#F1EDE4',
        highlightColor: '#D4AF37',
        outlineColor: '#1A1610',
        backColor: '#00000000',
        outline: 2,
        shadow: 1,
        borderStyle: 1,
        wordsPerLine: 3,
        animation: 'elastic-bounce',
        emphasisColor: '#D4AF37',
        supersizeColor: '#F5E6C8',
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
      backgroundMusicTrack: 'cinematic-ambient',
      sfxVolume: 0.2,
      musicVolume: 0.12,
      musicDucking: true,
      musicDuckLevel: 0.22,
    },

    overlays: {
      hookTitle: {
        enabled: true,
        style: 'slide-in',
        displayDuration: 3.0,
        fontSize: 66,
        textColor: '#F1EDE4',
        outlineColor: '#1A1610',
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
        height: 2,
        color: '#D4AF37',
        opacity: 0.5,
      },
    },

    variants: [
      {
        id: 'carina-classic',
        name: 'Classic',
        description: 'Gold-accented italic Playfair with bloom emphasis — the original Carina.',
        thumbnail: '✨',
      },
      {
        id: 'carina-champagne',
        name: 'Champagne',
        description: 'Pale gold on warm cream — champagne-toast elegance.',
        thumbnail: '🥂',
        captions: { style: { primaryColor: '#FAF0DC', highlightColor: '#C9A959', emphasisColor: '#C9A959', supersizeColor: '#FFFFFF' } },
        overlays: { hookTitle: { textColor: '#FAF0DC' } },
      },
      {
        id: 'carina-pearl',
        name: 'Pearl',
        description: 'White with pearlescent rose-gold emphasis — soft luxury.',
        thumbnail: '🦪',
        captions: { style: { primaryColor: '#FFFFFF', highlightColor: '#C9A4A0', emphasisColor: '#C9A4A0', outlineColor: '#1A1215' } },
        overlays: { hookTitle: { textColor: '#FFFFFF', outlineColor: '#1A1215' } },
      },
      {
        id: 'carina-obsidian',
        name: 'Obsidian',
        description: 'Crisp white with bold gold supersize on jet-black — high-contrast elegance.',
        thumbnail: '🖤',
        captions: { style: { primaryColor: '#FFFFFF', highlightColor: '#FFD700', emphasisColor: '#FFD700', supersizeColor: '#FFD700', outlineColor: '#000000', outline: 3 } },
        overlays: { hookTitle: { textColor: '#FFD700', outlineColor: '#000000' } },
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 24. FORNAX — Retro serif with hard offset shadow (letterpress)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'fornax',
    name: 'Fornax',
    description: 'Heavy drop-shadow serif like ink stamped on paper — bold retro letterpress energy.',
    thumbnail: '🖨️',
    category: 'cinematic',
    tags: ['retro', 'serif', 'shadow', 'letterpress', 'lora', 'bold', 'vintage', 'stamped'],
    builtIn: true,

    captions: {
      enabled: true,
      style: {
        id: 'fornax-caption',
        label: 'Fornax',
        fontName: 'Lora',
        fontFile: 'Lora.ttf',
        fontSize: 0.07,
        primaryColor: '#FDF6E3',
        highlightColor: '#E07A3A',
        outlineColor: '#1A1409',
        backColor: '#00000000',
        outline: 3,
        shadow: 5,
        borderStyle: 1,
        wordsPerLine: 2,
        animation: 'word-pop',
        emphasisColor: '#E07A3A',
        supersizeColor: '#FFD166',
      },
    },

    zoom: {
      enabled: true,
      mode: 'reactive',
      intensity: 'moderate',
      intervalSeconds: 5,
    },

    broll: {
      enabled: false,
      displayMode: 'fullscreen',
      transition: 'hard-cut',
      pipSize: 0.25,
      pipPosition: 'bottom-right',
      intervalSeconds: 6,
      clipDuration: 4,
    },

    sound: {
      enabled: true,
      sfxStyle: 'balanced',
      backgroundMusicTrack: 'cinematic-ambient',
      sfxVolume: 0.4,
      musicVolume: 0.1,
      musicDucking: true,
      musicDuckLevel: 0.18,
    },

    overlays: {
      hookTitle: {
        enabled: true,
        style: 'centered-bold',
        displayDuration: 2.5,
        fontSize: 72,
        textColor: '#FDF6E3',
        outlineColor: '#1A1409',
        outlineWidth: 4,
      },
      rehook: {
        enabled: false,
        style: 'text-only',
        displayDuration: 1.5,
      },
      progressBar: {
        enabled: true,
        style: 'solid',
        position: 'bottom',
        height: 4,
        color: '#E07A3A',
        opacity: 0.8,
      },
    },

    variants: [
      {
        id: 'fornax-classic',
        name: 'Classic',
        description: 'Cream serif with heavy shadow and burnt-orange highlight — the original Fornax.',
        thumbnail: '🖨️',
      },
      {
        id: 'fornax-rust',
        name: 'Rust',
        description: 'Deep rust-red highlights on aged cream — industrial letterpress warmth.',
        thumbnail: '🧱',
        captions: { style: { primaryColor: '#F0E6D2', highlightColor: '#A0522D', emphasisColor: '#A0522D', supersizeColor: '#E07A3A' } },
        overlays: { progressBar: { color: '#A0522D' }, hookTitle: { textColor: '#F0E6D2' } },
      },
      {
        id: 'fornax-ink',
        name: 'Ink',
        description: 'Blue-black ink on off-white — old broadsheet printing press feel.',
        thumbnail: '🖋️',
        captions: { style: { primaryColor: '#F5F0E8', highlightColor: '#2C3E6B', emphasisColor: '#2C3E6B', outlineColor: '#0A0A14', supersizeColor: '#4A6FA5' } },
        overlays: { progressBar: { color: '#2C3E6B' }, hookTitle: { textColor: '#F5F0E8', outlineColor: '#0A0A14' } },
      },
      {
        id: 'fornax-copper',
        name: 'Copper',
        description: 'Warm copper-gold accents with extra-heavy shadow — premium stamped feel.',
        thumbnail: '🪙',
        captions: { style: { highlightColor: '#B87333', emphasisColor: '#B87333', supersizeColor: '#D4AF37', shadow: 6 } },
        overlays: { progressBar: { color: '#B87333' }, hookTitle: { textColor: '#FDF6E3' } },
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 25. HYDRA — Editorial mixed-case with subtle emphasis color shift
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'hydra',
    name: 'Hydra',
    description: 'Editorial serif with understated emphasis color shifts — the quiet confidence of a magazine spread.',
    thumbnail: '📰',
    category: 'minimal',
    tags: ['editorial', 'serif', 'mixed-case', 'subtle', 'playfair', 'magazine', 'refined', 'shift'],
    builtIn: true,

    captions: {
      enabled: true,
      style: {
        id: 'hydra-caption',
        label: 'Hydra',
        fontName: 'Playfair Display',
        fontFile: 'PlayfairDisplay.ttf',
        fontSize: 0.055,
        primaryColor: '#E8E2D8',
        highlightColor: '#C4A97D',
        outlineColor: '#1A1814',
        backColor: '#00000000',
        outline: 2,
        shadow: 1,
        borderStyle: 1,
        wordsPerLine: 4,
        animation: 'fade-in',
        emphasisColor: '#B89B6A',
        supersizeColor: '#E8D5A3',
      },
    },

    zoom: {
      enabled: true,
      mode: 'ken-burns',
      intensity: 'subtle',
      intervalSeconds: 10,
    },

    broll: {
      enabled: false,
      displayMode: 'fullscreen',
      transition: 'crossfade',
      pipSize: 0.25,
      pipPosition: 'bottom-right',
      intervalSeconds: 10,
      clipDuration: 5,
    },

    sound: {
      enabled: true,
      sfxStyle: 'minimal',
      backgroundMusicTrack: 'cinematic-ambient',
      sfxVolume: 0.15,
      musicVolume: 0.08,
      musicDucking: true,
      musicDuckLevel: 0.2,
    },

    overlays: {
      hookTitle: {
        enabled: true,
        style: 'slide-in',
        displayDuration: 3.5,
        fontSize: 60,
        textColor: '#E8E2D8',
        outlineColor: '#1A1814',
        outlineWidth: 2,
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
        height: 2,
        color: '#C4A97D',
        opacity: 0.35,
      },
    },

    variants: [
      {
        id: 'hydra-classic',
        name: 'Classic',
        description: 'Warm linen with tonal gold shift emphasis — the original editorial Hydra.',
        thumbnail: '📰',
      },
      {
        id: 'hydra-slate',
        name: 'Slate',
        description: 'Cool grey text with steel-blue emphasis shift — modern editorial restraint.',
        thumbnail: '📋',
        captions: { style: { primaryColor: '#D0CCC5', highlightColor: '#7A8EA0', emphasisColor: '#7A8EA0', supersizeColor: '#B0C4DE', outlineColor: '#14181A' } },
        overlays: { hookTitle: { textColor: '#D0CCC5', outlineColor: '#14181A' } },
      },
      {
        id: 'hydra-burgundy',
        name: 'Burgundy',
        description: 'Deep wine-red emphasis on warm cream — editorial luxury.',
        thumbnail: '🍷',
        captions: { style: { primaryColor: '#F0E8DC', highlightColor: '#8B2252', emphasisColor: '#8B2252', supersizeColor: '#C4556A' } },
        overlays: { hookTitle: { textColor: '#F0E8DC' } },
      },
      {
        id: 'hydra-forest',
        name: 'Forest',
        description: 'Sage-green emphasis on natural cream — editorial earth tones.',
        thumbnail: '🌿',
        captions: { style: { primaryColor: '#F0EDE4', highlightColor: '#5B7A5E', emphasisColor: '#5B7A5E', supersizeColor: '#8FB390' } },
        overlays: { hookTitle: { textColor: '#F0EDE4' } },
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 26. AQUILA — Cinematic wide-spaced with slow fade
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'aquila',
    name: 'Aquila',
    description: 'Wide-tracked serif with glacial fade — spacious, cinematic, every letter deliberate.',
    thumbnail: '🦅',
    category: 'cinematic',
    tags: ['cinematic', 'wide', 'spaced', 'fade', 'slow', 'playfair', 'tracked', 'deliberate'],
    builtIn: true,

    captions: {
      enabled: true,
      style: {
        id: 'aquila-caption',
        label: 'Aquila',
        fontName: 'Playfair Display',
        fontFile: 'PlayfairDisplay.ttf',
        fontSize: 0.052,
        primaryColor: '#F1F4F9',
        highlightColor: '#A8B8CC',
        outlineColor: '#0F1115',
        backColor: '#00000000',
        outline: 1,
        shadow: 1,
        borderStyle: 1,
        wordsPerLine: 3,
        animation: 'fade-in',
        emphasisColor: '#C8D4E4',
        supersizeColor: '#FFFFFF',
      },
    },

    zoom: {
      enabled: true,
      mode: 'ken-burns',
      intensity: 'subtle',
      intervalSeconds: 10,
    },

    broll: {
      enabled: false,
      displayMode: 'fullscreen',
      transition: 'crossfade',
      pipSize: 0.25,
      pipPosition: 'bottom-right',
      intervalSeconds: 10,
      clipDuration: 6,
    },

    sound: {
      enabled: true,
      sfxStyle: 'minimal',
      backgroundMusicTrack: 'cinematic-ambient',
      sfxVolume: 0.1,
      musicVolume: 0.1,
      musicDucking: true,
      musicDuckLevel: 0.25,
    },

    overlays: {
      hookTitle: {
        enabled: true,
        style: 'slide-in',
        displayDuration: 4.0,
        fontSize: 58,
        textColor: '#F1F4F9',
        outlineColor: '#0F1115',
        outlineWidth: 2,
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
        height: 2,
        color: '#A8B8CC',
        opacity: 0.3,
      },
    },

    variants: [
      {
        id: 'aquila-classic',
        name: 'Classic',
        description: 'Cool off-white with steel-blue emphasis — the original wide-tracked Aquila.',
        thumbnail: '🦅',
      },
      {
        id: 'aquila-golden',
        name: 'Golden',
        description: 'Warm gold emphasis on cream — wide-spaced prestige.',
        thumbnail: '🌟',
        captions: { style: { primaryColor: '#FDF6E3', highlightColor: '#C9A959', emphasisColor: '#C9A959', outlineColor: '#1A1409' } },
        overlays: { hookTitle: { textColor: '#FDF6E3', outlineColor: '#1A1409' } },
      },
      {
        id: 'aquila-midnight',
        name: 'Midnight',
        description: 'Pure white on deep blue-black — cold cinema wide-tracking.',
        thumbnail: '🌌',
        captions: { style: { primaryColor: '#FFFFFF', highlightColor: '#6B7FA0', emphasisColor: '#6B7FA0', outlineColor: '#060810' } },
        overlays: { hookTitle: { textColor: '#FFFFFF', outlineColor: '#060810' } },
      },
      {
        id: 'aquila-ember',
        name: 'Ember',
        description: 'Warm amber on dark — slow-burning wide-spaced warmth.',
        thumbnail: '🔥',
        captions: { style: { primaryColor: '#F5E6C8', highlightColor: '#D4763A', emphasisColor: '#D4763A', outlineColor: '#140A04' } },
        overlays: { hookTitle: { textColor: '#F5E6C8', outlineColor: '#140A04' } },
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 27. TUCANA — Vintage serif with sepia-toned color palette
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'tucana',
    name: 'Tucana',
    description: 'Full sepia serif — aged film tones, warm browns, and vintage warmth in every word.',
    thumbnail: '📽️',
    category: 'cinematic',
    tags: ['vintage', 'sepia', 'serif', 'warm', 'brown', 'lora', 'aged', 'nostalgic'],
    builtIn: true,

    captions: {
      enabled: true,
      style: {
        id: 'tucana-caption',
        label: 'Tucana',
        fontName: 'Lora',
        fontFile: 'Lora.ttf',
        fontSize: 0.06,
        primaryColor: '#D4C5A9',
        highlightColor: '#8B6F47',
        outlineColor: '#2C2016',
        backColor: '#00000000',
        outline: 2,
        shadow: 2,
        borderStyle: 1,
        wordsPerLine: 3,
        animation: 'captions-ai',
        emphasisColor: '#A67C52',
        supersizeColor: '#F5E6C8',
      },
    },

    zoom: {
      enabled: true,
      mode: 'ken-burns',
      intensity: 'subtle',
      intervalSeconds: 8,
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
      backgroundMusicTrack: 'cinematic-ambient',
      sfxVolume: 0.2,
      musicVolume: 0.1,
      musicDucking: true,
      musicDuckLevel: 0.2,
    },

    overlays: {
      hookTitle: {
        enabled: true,
        style: 'slide-in',
        displayDuration: 3.0,
        fontSize: 64,
        textColor: '#D4C5A9',
        outlineColor: '#2C2016',
        outlineWidth: 3,
      },
      rehook: {
        enabled: false,
        style: 'text-only',
        displayDuration: 2.0,
      },
      progressBar: {
        enabled: true,
        style: 'solid',
        position: 'bottom',
        height: 3,
        color: '#8B6F47',
        opacity: 0.6,
      },
    },

    variants: [
      {
        id: 'tucana-classic',
        name: 'Classic',
        description: 'Full sepia palette — warm browns on aged parchment cream.',
        thumbnail: '📽️',
      },
      {
        id: 'tucana-daguerreotype',
        name: 'Daguerreotype',
        description: 'Cool silver-brown tones — early photography desaturation.',
        thumbnail: '🪞',
        captions: { style: { primaryColor: '#C4BEB4', highlightColor: '#7A7265', emphasisColor: '#7A7265', supersizeColor: '#D4CCC0', outlineColor: '#1A1818' } },
        overlays: { hookTitle: { textColor: '#C4BEB4', outlineColor: '#1A1818' }, progressBar: { color: '#7A7265' } },
      },
      {
        id: 'tucana-amber',
        name: 'Amber',
        description: 'Deeper amber-orange sepia — like looking through aged glass.',
        thumbnail: '🟠',
        captions: { style: { primaryColor: '#E0C896', highlightColor: '#B8741A', emphasisColor: '#B8741A', supersizeColor: '#FFD166' } },
        overlays: { hookTitle: { textColor: '#E0C896' }, progressBar: { color: '#B8741A' } },
      },
      {
        id: 'tucana-faded',
        name: 'Faded',
        description: 'Ultra-washed-out sepia — maximum aged-film effect.',
        thumbnail: '🌅',
        captions: { style: { primaryColor: '#B8AFA0', highlightColor: '#8B8070', emphasisColor: '#8B8070', supersizeColor: '#C4B8A4', outline: 1, shadow: 1 } },
        overlays: { hookTitle: { textColor: '#B8AFA0' }, progressBar: { color: '#8B8070', opacity: 0.4 } },
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 28. COLUMBA — Old-school serif with box backgrounds
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'columba',
    name: 'Columba',
    description: 'Serif captions on solid box backgrounds — classic broadcast subtitle style, warm and readable.',
    thumbnail: '🕊️',
    category: 'cinematic',
    tags: ['box', 'background', 'serif', 'broadcast', 'lora', 'classic', 'readable', 'solid'],
    builtIn: true,

    captions: {
      enabled: true,
      style: {
        id: 'columba-caption',
        label: 'Columba',
        fontName: 'Lora',
        fontFile: 'Lora.ttf',
        fontSize: 0.055,
        primaryColor: '#FDF6E3',
        highlightColor: '#E8D5A3',
        outlineColor: '#F5E6C8',
        backColor: '#CC1A1409',
        outline: 0,
        shadow: 0,
        borderStyle: 3,
        wordsPerLine: 4,
        animation: 'word-box',
        emphasisColor: '#F5C542',
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
      backgroundMusicTrack: 'cinematic-ambient',
      sfxVolume: 0.2,
      musicVolume: 0.1,
      musicDucking: true,
      musicDuckLevel: 0.2,
    },

    overlays: {
      hookTitle: {
        enabled: true,
        style: 'slide-in',
        displayDuration: 3.0,
        fontSize: 64,
        textColor: '#FDF6E3',
        outlineColor: '#1A1409',
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
        color: '#E8D5A3',
        opacity: 0.5,
      },
    },

    variants: [
      {
        id: 'columba-classic',
        name: 'Classic',
        description: 'Cream serif on warm dark box — the original broadcast Columba.',
        thumbnail: '🕊️',
      },
      {
        id: 'columba-noir',
        name: 'Noir',
        description: 'White text on pure black box — stark classic subtitle look.',
        thumbnail: '⬛',
        captions: { style: { primaryColor: '#FFFFFF', highlightColor: '#FFFFFF', emphasisColor: '#FFD700', backColor: '#E6000000', outlineColor: '#000000' } },
        overlays: { hookTitle: { textColor: '#FFFFFF', outlineColor: '#000000' } },
      },
      {
        id: 'columba-navy',
        name: 'Navy',
        description: 'Cream text on deep navy box — upscale broadcast feel.',
        thumbnail: '🔵',
        captions: { style: { primaryColor: '#F5F0E8', highlightColor: '#C8D4E4', emphasisColor: '#C8D4E4', backColor: '#CC0A1628', outlineColor: '#0A1628' } },
        overlays: { hookTitle: { textColor: '#F5F0E8', outlineColor: '#0A1628' } },
      },
      {
        id: 'columba-burgundy',
        name: 'Burgundy',
        description: 'Cream text on deep wine-red box — rich vintage broadcast.',
        thumbnail: '🍷',
        captions: { style: { primaryColor: '#FDF6E3', highlightColor: '#F5C542', emphasisColor: '#F5C542', backColor: '#CC3D1520', outlineColor: '#3D1520' } },
        overlays: { hookTitle: { textColor: '#FDF6E3', outlineColor: '#3D1520' } },
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 29. GEMINI — Classic serif with bold emphasis and thin normal weight
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'gemini',
    name: 'Gemini',
    description: 'Thin serif that snaps to bold on emphasis — a dual-weight system for smart visual hierarchy.',
    thumbnail: '♊',
    category: 'minimal',
    tags: ['serif', 'dual-weight', 'thin', 'bold', 'emphasis', 'lora', 'hierarchy', 'smart'],
    builtIn: true,

    captions: {
      enabled: true,
      style: {
        id: 'gemini-caption',
        label: 'Gemini',
        fontName: 'Lora',
        fontFile: 'Lora.ttf',
        fontSize: 0.06,
        primaryColor: '#D8D4CC',
        highlightColor: '#FFFFFF',
        outlineColor: '#14120E',
        backColor: '#00000000',
        outline: 2,
        shadow: 1,
        borderStyle: 1,
        wordsPerLine: 3,
        animation: 'captions-ai',
        emphasisColor: '#FFFFFF',
        supersizeColor: '#FFD700',
      },
    },

    zoom: {
      enabled: true,
      mode: 'ken-burns',
      intensity: 'subtle',
      intervalSeconds: 8,
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
      backgroundMusicTrack: 'cinematic-ambient',
      sfxVolume: 0.2,
      musicVolume: 0.1,
      musicDucking: true,
      musicDuckLevel: 0.22,
    },

    overlays: {
      hookTitle: {
        enabled: true,
        style: 'slide-in',
        displayDuration: 3.0,
        fontSize: 66,
        textColor: '#FFFFFF',
        outlineColor: '#14120E',
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
        height: 2,
        color: '#D8D4CC',
        opacity: 0.4,
      },
    },

    variants: [
      {
        id: 'gemini-classic',
        name: 'Classic',
        description: 'Muted grey to bright white emphasis — the original dual-weight Gemini.',
        thumbnail: '♊',
      },
      {
        id: 'gemini-gold',
        name: 'Gold',
        description: 'Warm grey with gold emphasis — editorial luxury hierarchy.',
        thumbnail: '🏆',
        captions: { style: { primaryColor: '#C4BEB4', highlightColor: '#D4AF37', emphasisColor: '#D4AF37', supersizeColor: '#FFD700' } },
        overlays: { hookTitle: { textColor: '#D4AF37' } },
      },
      {
        id: 'gemini-ice',
        name: 'Ice',
        description: 'Cool blue-grey to pure white — icy serif precision.',
        thumbnail: '🧊',
        captions: { style: { primaryColor: '#B0BCC8', highlightColor: '#FFFFFF', emphasisColor: '#FFFFFF', outlineColor: '#0A1018' } },
        overlays: { hookTitle: { textColor: '#FFFFFF', outlineColor: '#0A1018' } },
      },
      {
        id: 'gemini-copper',
        name: 'Copper',
        description: 'Muted taupe with warm copper emphasis — understated metallic warmth.',
        thumbnail: '🪙',
        captions: { style: { primaryColor: '#C0B8A8', highlightColor: '#B87333', emphasisColor: '#B87333', supersizeColor: '#D4A056' } },
        overlays: { hookTitle: { textColor: '#B87333' } },
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 30. ERIDANUS — Art-deco inspired with geometric gold tones
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'eridanus',
    name: 'Eridanus',
    description: 'Art-deco serif with gold on black — geometric precision, Gatsby-era glamour, bold cascade.',
    thumbnail: '🏛️',
    category: 'cinematic',
    tags: ['art-deco', 'gold', 'geometric', 'glamour', 'playfair', 'gatsby', 'bold', 'cascade'],
    builtIn: true,

    captions: {
      enabled: true,
      style: {
        id: 'eridanus-caption',
        label: 'Eridanus',
        fontName: 'Playfair Display',
        fontFile: 'PlayfairDisplay.ttf',
        fontSize: 0.065,
        primaryColor: '#D4AF37',
        highlightColor: '#F4E4BC',
        outlineColor: '#1A1A1A',
        backColor: '#00000000',
        outline: 3,
        shadow: 2,
        borderStyle: 1,
        wordsPerLine: 2,
        animation: 'cascade',
        emphasisColor: '#FFD700',
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
      intervalSeconds: 7,
      clipDuration: 5,
    },

    sound: {
      enabled: true,
      sfxStyle: 'balanced',
      backgroundMusicTrack: 'cinematic-ambient',
      sfxVolume: 0.3,
      musicVolume: 0.12,
      musicDucking: true,
      musicDuckLevel: 0.2,
    },

    overlays: {
      hookTitle: {
        enabled: true,
        style: 'centered-bold',
        displayDuration: 3.0,
        fontSize: 70,
        textColor: '#D4AF37',
        outlineColor: '#1A1A1A',
        outlineWidth: 4,
      },
      rehook: {
        enabled: false,
        style: 'text-only',
        displayDuration: 2.0,
      },
      progressBar: {
        enabled: true,
        style: 'glow',
        position: 'bottom',
        height: 3,
        color: '#D4AF37',
        opacity: 0.8,
      },
    },

    variants: [
      {
        id: 'eridanus-classic',
        name: 'Classic',
        description: 'Gold on black with geometric cascade — the original art-deco Eridanus.',
        thumbnail: '🏛️',
      },
      {
        id: 'eridanus-platinum',
        name: 'Platinum',
        description: 'Silver-white on charcoal — cool deco platinum elegance.',
        thumbnail: '🪙',
        captions: { style: { primaryColor: '#C0C0C0', highlightColor: '#E8E8E8', emphasisColor: '#FFFFFF', supersizeColor: '#FFFFFF', outlineColor: '#1A1A1A' } },
        overlays: { progressBar: { color: '#C0C0C0' }, hookTitle: { textColor: '#C0C0C0' } },
      },
      {
        id: 'eridanus-emerald',
        name: 'Emerald',
        description: 'Rich emerald green on black — jewel-toned art-deco opulence.',
        thumbnail: '💚',
        captions: { style: { primaryColor: '#50C878', highlightColor: '#A8E6C0', emphasisColor: '#98FB98', supersizeColor: '#FFFFFF', outlineColor: '#0A1A10' } },
        overlays: { progressBar: { color: '#50C878' }, hookTitle: { textColor: '#50C878', outlineColor: '#0A1A10' } },
      },
      {
        id: 'eridanus-rose-gold',
        name: 'Rose Gold',
        description: 'Rose-gold tones on deep plum — warm deco luxury.',
        thumbnail: '🌹',
        captions: { style: { primaryColor: '#C9A4A0', highlightColor: '#F0D0CC', emphasisColor: '#F5E1E0', supersizeColor: '#FFFFFF', outlineColor: '#1A1018' } },
        overlays: { progressBar: { color: '#C9A4A0' }, hookTitle: { textColor: '#C9A4A0', outlineColor: '#1A1018' } },
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


