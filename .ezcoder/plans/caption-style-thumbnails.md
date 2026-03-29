# Caption Style Visual Thumbnails

## Summary
Replace the boring dropdown preset selector with a visual thumbnail grid where each caption style renders a mini preview showing sample words in normal, emphasis, and supersize states against a dark background. ~200×350 portrait format. Uses runtime HTML/CSS rendering (React components) — no build-time generation needed since `CaptionPhonePreview` already does this inline and fonts are loaded via `useFontLoader`.

## Why Runtime Canvas/CSS over Build-time

1. `CaptionPhonePreview` already renders a pixel-perfect CSS preview in 200×356 at runtime — the code exists
2. All fonts are loaded via `useFontLoader` at app startup — rendering is instant
3. There are 40+ basic styles and 50+ premium preset styles with variants — generating PNGs at build time would require a headless browser, adding CI complexity
4. CSS rendering is instantaneous once fonts are loaded — no spinners needed
5. The thumbnail grid is a scrollable list, React will virtualize/render all items at once

## Architecture

The current preset selector is a `<Select>` dropdown at `SettingsPanel.tsx:1844`. Replace it with a scrollable grid of `CaptionStyleThumbnail` components — each one is a miniaturized version of `CaptionPhonePreview` optimized for grid display.

```
┌──────────────────────────────────────────────────────────┐
│ Caption Style                                            │
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ │
│ │ dark bg│ │ dark bg│ │ dark bg│ │ dark bg│ │ dark bg│ │
│ │  THIS  │ │  THIS  │ │  THIS  │ │  THIS  │ │  THIS  │ │
│ │  is    │ │  is    │ │  is    │ │  is    │ │  is    │ │
│ │  WHAT  │ │  WHAT  │ │  WHAT  │ │  WHAT  │ │  WHAT  │ │
│ │ ────── │ │ ────── │ │ ────── │ │ ────── │ │ ────── │ │
│ │Capt.AI │ │Hormozi │ │TikTok  │ │Reels   │ │Clarity │ │
│ └────────┘ └────────┘ └────────┘ └────────┘ └────────┘ │
│ ┌────────┐ ┌────────┐ ┌────────┐ ...                    │
│ │        │ │        │ │        │                         │
│ └────────┘ └────────┘ └────────┘                         │
└──────────────────────────────────────────────────────────┘
```

## Files to Modify

### 1. `src/renderer/src/components/SettingsPanel.tsx`

**Add**: `CaptionStyleThumbnail` component — a 120×160 mini preview card:
- Dark gradient background (same as `CaptionPhonePreview`)
- Renders 3 sample words: one normal, one emphasis, one supersize
- Shows style label at bottom
- Selected state: ring/border highlight
- Click to select preset

**Replace**: The `<Select>` dropdown for preset selection (lines ~1843-1857) with a scrollable grid of `CaptionStyleThumbnail` components.

The grid should:
- Use `flex flex-wrap` or `grid grid-cols-4` layout
- Be contained in a scrollable div with `max-h-[400px] overflow-y-auto`
- Show the style label truncated below each thumbnail
- Highlight the currently selected style with a colored ring
- Include "Custom" as the last option (just a generic icon/placeholder)

**CaptionStyleThumbnail implementation** (extracted from existing `CaptionPhonePreview` logic):

```tsx
function CaptionStyleThumbnail({ 
  style, 
  isSelected, 
  onClick 
}: { 
  style: CaptionStyle
  isSelected: boolean
  onClick: () => void 
}) {
  // ~120×160 portrait card
  const THUMB_W = 120
  const THUMB_H = 160
  const scale = THUMB_W / 1080
  const fontSize = Math.max(6, Math.round(style.fontSize * 1920 * scale))
  const isWordBox = style.animation === 'word-box'
  const hasBox = style.borderStyle === 3 && !isWordBox
  const outlineWidth = Math.max(1, Math.round(style.outline * scale))
  
  // Three sample words showing all three states
  const words = [
    { text: 'This', state: 'normal' },
    { text: 'IS', state: 'emphasis' },
    { text: 'EPIC', state: 'supersize' },
  ]
  
  return (
    <button onClick={onClick} className={...}>
      <div style={{ width: THUMB_W, height: THUMB_H - 24, background gradient, overflow hidden }}>
        {/* Render 3 words vertically centered showing normal/emphasis/supersize */}
      </div>
      <div className="text-[9px] truncate">{style.label}</div>
    </button>
  )
}
```

### No other files need changes

This is purely a UI component change in SettingsPanel.tsx. The data (`CAPTION_PRESETS`, `CaptionStyle` type) already exists and doesn't need modification.

## Implementation Steps

1. Read `SettingsPanel.tsx` fully to understand the existing preset selector location
2. Create `CaptionStyleThumbnail` component inside SettingsPanel.tsx (co-located like the existing `CaptionPhonePreview`)
3. Replace the `<Select>` preset dropdown with a scrollable thumbnail grid
4. Keep the existing `CaptionPhonePreview` as the "live preview" — it shows the full-size preview of the *currently selected* style
5. Build and verify: `npx electron-vite build`

## Key Decisions

1. **Runtime CSS rendering** — no build-time PNG generation. Fonts are already loaded, CSS text rendering with outlines/shadows is fast and pixel-perfect
2. **Co-located component** — `CaptionStyleThumbnail` lives in SettingsPanel.tsx alongside `CaptionPhonePreview`, same pattern
3. **120×160px thumbnails** — slightly smaller than the 200×356 live preview, optimized for grid browsing. Shows 4-5 per row
4. **Three sample words** — "This", "IS", "EPIC" showing normal → emphasis → supersize states clearly
5. **No virtualization needed** — ~40 thumbnails is fine for React to render all at once, especially since they're just styled divs (no canvas, no images)
