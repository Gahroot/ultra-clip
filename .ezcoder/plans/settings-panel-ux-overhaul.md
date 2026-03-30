# Settings Panel UX Overhaul

## Problem Summary
The settings panel is crammed into a `max-w-md` (448px) dialog at 80vh height. Everything is crunched together — the style presets, profile selector, 7 tab navigation, and dense form fields all compete for space. Preset thumbnails can't be seen properly. Emojis are used where Lucide icons would be more consistent. The user wants something closer to Captions.ai's clean approach: pick a style, edit what you need, done.

## Current Issues (Audit)

### 1. **Dialog is way too small** (`max-w-md` = 448px, `h-[80vh]`)
   - File: `src/renderer/src/App.tsx` line 405
   - All content is squeezed into this tiny modal — presets, profiles, tabs, forms
   - Caption preset grid (3 cols of 200px thumbnails) needs 600px+ but only gets ~400px
   - Style preset horizontal scroll strip is barely usable

### 2. **Too much crammed above the tabs**
   - StylePresetPicker (collapsible, but still takes ~200px when open)
   - Profile selector row
   - Settings changed warning banner
   - Tab navigation (7 tabs wrapping onto 2 lines)
   - By the time you reach actual settings content, 40-50% of viewport is gone

### 3. **Emojis instead of Lucide icons**
   - `🎨` for Style Presets header (line 692)
   - `▾` for collapse chevron (line 699)  
   - `✎` for Custom preset option (line 518)
   - `✓` text for "API key saved" (line 1500)
   - `⚠` for safe zone warning (line 1789) and parallel renders warning (line 1850)
   - `📹 Stock`, `🖼️ AI Images`, `✨ Auto` in B-Roll source buttons (lines 2528-2530)
   - `↖ ↗ ↙ ↘` for logo positions (lines 2842-2845)
   - `↓ ↑` for progress bar positions (lines 3278-3279)
   - Style preset thumbnails all use emojis: `💥`, `📌`, `⚡`, `🌱`, etc.
   - Variant thumbnails also use emojis

### 4. **Spacing/padding issues**
   - `p-4 space-y-6` on tab content is OK but sections within use inconsistent spacing
   - `SectionHeader` has `mb-3` but some sections add their own `mb-3` (double margin)
   - Color pickers are `grid grid-cols-2 gap-3` — tight on 448px
   - Caption preset grid `grid-cols-3 gap-2` with 200px thumbnails — doesn't fit
   - Separator components add visual noise between every section

### 5. **Tab overload — 7 tabs is too many**
   - General, Captions, Overlays, Audio, Effects, Brand, Advanced
   - Users don't know where things are
   - Tab strip wraps to 2 lines at current width

### 6. **No clear visual hierarchy**
   - All sections look the same — tiny uppercase headers with reset buttons
   - No grouping or visual separation between major vs. minor settings
   - Phone preview components are buried mid-scroll

---

## Proposed Solution: Sidebar-style Settings with Simplified Layout

### Option A: **Full-width Sidebar Panel** (Recommended)
Replace the tiny dialog with a slide-out right sidebar panel (like Captions.ai's Style/Captions panel).

**Changes:**
- `src/renderer/src/App.tsx`: Replace `<Dialog>` with a slide-out `<Sheet>` or a conditional right sidebar (`w-[520px]`)
- Width: `520px` (gives breathing room for all content)
- Full height of the app (not 80vh modal)
- Dismissible with Escape or clicking outside / clicking gear icon again
- Overlay the main content area rather than blocking it

### Option B: **Wider Dialog** (Simpler change)
Keep the dialog but make it much wider and reorganize content.

**Changes:**
- `max-w-md` → `max-w-2xl` (672px) or `max-w-3xl` (768px)
- `h-[80vh]` → `h-[85vh]`
- Two-column layout inside: left nav + right content (like macOS System Preferences)

### Option C: **Dedicated Settings Page** (Most work)
Full-page settings view replacing the main content area when opened.

---

## Recommended Implementation Plan (Option A + UX fixes)

### Step 1: Replace Dialog with Sheet/Sidebar
**File: `src/renderer/src/App.tsx`**
- Add ShadCN Sheet component (`npx shadcn@latest add sheet`) or build a custom slide-out panel
- Replace the Dialog wrapping SettingsPanel with a Sheet that slides from the right
- Width: `w-[540px]` — enough for 3-column preset grids and form fields
- Keep the gear icon as trigger

### Step 2: Consolidate tabs from 7 → 4
**File: `src/renderer/src/components/SettingsPanel.tsx`**

Current 7 tabs → proposed 4:
| New Tab | Contains |
|---------|----------|
| **Style** | Style Presets + Caption Presets + Caption settings (font, animation, colors) |
| **Effects** | Auto-Zoom + B-Roll + Filler Removal + Sound Design |  
| **Overlays** | Hook Title + Re-hook + Progress Bar + Brand Kit |
| **Settings** | AI keys + Output dir + Render quality + Notifications + Dev mode + Storage + Debug log |

This reduces cognitive load and groups related features together.

### Step 3: Replace all emojis with Lucide icons
**File: `src/renderer/src/components/SettingsPanel.tsx`**

| Current | Replacement |
|---------|-------------|
| `🎨` Style Presets | `<Palette>` from lucide-react |
| `▾` collapse | `<ChevronDown>` from lucide-react |
| `✎` Custom preset | `<Pencil>` (already imported) |
| `✓ API key saved` | `<CheckCircle2>` (already imported) |
| `⚠ Safe zone warning` | `<AlertTriangle>` (already imported) |
| `📹 Stock` | `<Video>` from lucide-react |
| `🖼️ AI Images` | `<ImagePlus>` from lucide-react |
| `✨ Auto` | `<Sparkles>` from lucide-react |
| `↖ ↗ ↙ ↘` positions | `<ArrowUpLeft>`, `<ArrowUpRight>`, `<ArrowDownLeft>`, `<ArrowDownRight>` |
| `↓ ↑` bar positions | `<ArrowDown>`, `<ArrowUp>` |

For style preset thumbnails (💥, 📌, ⚡, 🌱, etc.), these are stored in `src/renderer/src/store/edit-style-presets.ts`. Options:
- Replace with Lucide icons mapped by preset ID
- Or keep emojis in preset cards since they serve as recognizable visual identifiers (acceptable in icon cards)

### Step 4: Improve spacing and visual hierarchy
**File: `src/renderer/src/components/SettingsPanel.tsx`**

- Increase tab content padding from `p-4` → `p-5` or `p-6`
- Increase `space-y-6` → `space-y-8` between sections
- Replace `<Separator />` between sections with actual section cards:
  ```tsx
  <div className="rounded-lg border border-border bg-card/50 p-5 space-y-4">
    <SectionHeader>...</SectionHeader>
    {/* content */}
  </div>
  ```
- Make `SectionHeader` larger: `text-sm font-semibold` instead of `text-xs`
- Add consistent icon + heading pairs for every section

### Step 5: Move Profile selector into the settings tab (not top-level)
- Profiles are a power-user feature — they shouldn't eat prime real estate above all tabs
- Move to the bottom of the "Settings" tab or into a collapsible section

### Step 6: Improve caption preset visibility
- With wider panel (540px), the 3-column thumbnail grid will actually work
- Consider 2-column grid with larger thumbnails for better visibility
- Keep the phone preview but make it more prominent (center it, add a subtle card background)

### Step 7: Style Preset picker improvements
- Use Lucide icons in gradient cards instead of emojis (or keep emojis — they work as quick identifiers in small cards)
- Add a "currently active" indicator that's more visible (checkmark badge on the card)
- Consider moving variant selection into a sub-row below the main strip rather than a separate panel

---

## File Change Summary

| File | Change |
|------|--------|
| `src/renderer/src/App.tsx` | Replace Dialog → Sheet/sidebar for settings |
| `src/renderer/src/components/SettingsPanel.tsx` | Major restructure: consolidate tabs, replace emojis, improve spacing, move profiles |
| `src/renderer/src/store/edit-style-presets.ts` | Optionally replace emoji thumbnails with icon identifiers |
| `src/renderer/src/components/ui/sheet.tsx` | May need to add ShadCN Sheet component |

## Risks
- Large file (3813 lines) — incremental edits needed, not a full rewrite
- Store types/actions untouched — only the rendering layer changes
- Need to verify Sheet component works with the existing layout (header + sidebar + main area)
- Caption preset thumbnail cache system should still work unchanged

## Verification
- `npx electron-vite build` must pass
- All tabs render correctly at 540px width
- Caption preset thumbnails are visible and selectable
- Style presets can be applied with one click
- All Lucide icons render (no missing imports)
- Settings panel opens/closes smoothly
- Mobile-like phone preview is visible without excessive scrolling
