# Sidebar-Driven Clip Navigation

## Overview
Replace the current grid-based clip review with a **left sidebar** for clip browsing + a **main content area** for per-clip editing. The sidebar shows all scored clips from one source video as a scrollable list. Clicking a clip loads it into the main editor (which embeds the existing ClipPreview component inline, not as a dialog).

## Current Architecture
- `App.tsx` (line 429): renders `<ClipGrid />` when `showGrid` is true
- `ClipGrid.tsx` (2679 lines): massive component with header bar, filter/sort controls, render progress, batch actions, DnD grid of `ClipCard` components, stitched clips section, and all render logic
- `ClipCard.tsx` (1043 lines): individual card with thumbnail, score, hook text, transcript, approve/reject buttons, context menu, variants, AI edit plan
- `ClipPreview.tsx`: modal dialog with video player, trim sliders, waveform, override toggles, re-score, hook text editing — this IS the per-clip editor
- Store state: `clips[sourceId]` = array of `ClipCandidate`, `selectedClipIndex`, `clipViewMode`

## Design

### New Layout Structure (replaces `<ClipGrid />` in App.tsx)
```
┌─────────────────────────────────────────────────────┐
│ Header bar (approve all, reject all, render, etc.)  │
├──────────────┬──────────────────────────────────────┤
│  Clip        │                                      │
│  Sidebar     │   Main Editor Area                   │
│  (260px)     │   (ClipPreview content, inline)      │
│              │                                      │
│  [thumb] ──► │   Video player + trim                │
│  [thumb]     │   Hook text editing                  │
│  [thumb]     │   Overrides / settings               │
│  ...         │   Approve / Reject                   │
│              │                                      │
│  ── filter ──│                                      │
│  ── sort ────│                                      │
└──────────────┴──────────────────────────────────────┘
```

### New Components

#### 1. `ClipSidebar.tsx` — The clip browser sidebar
A scrollable list of clip entries. Each entry shows:
- Thumbnail (small, ~48×27 aspect-video)
- Hook text as title (1-2 lines, truncated)
- Duration badge + Score badge (color-coded)
- Status indicators:
  - Green left border = approved
  - Red left border = rejected
  - No special border = pending (untouched)
  - Small "styled" badge if clip has overrides or aiEditPlan
  - Style preset name badge if `shotStyles` or `aiEditPlan?.stylePresetId` is set
- Active clip highlighted with `bg-accent` ring
- Click handler sets `selectedClipIndex` in store

**Sidebar header**: compact filter tabs (All/Approved/Rejected/Pending) + sort select + search input
**Sidebar footer**: summary counts (X approved, Y pending, Z total) + render button

#### 2. `ClipEditor.tsx` — The main content area  
Extracts the editor content from `ClipPreview.tsx` but renders **inline** (not in a Dialog). Shows:
- Video player with source/output view toggle
- Dual-slider trim control with waveform
- Hook text (editable inline)
- Score display + re-score button
- Per-clip override toggles (Captions/Styles section)
- Approve/Reject buttons
- AI Edit Plan section
- Keyboard navigation: ← → to go prev/next clip

#### 3. Modifications to `ClipGrid.tsx`
The existing ClipGrid becomes a **layout shell** that:
- Keeps all its render logic (handleStartRender, handleRetryFailed, etc.)
- Keeps the header bar with approve all / reject all / render buttons
- Keeps render progress banner
- Keeps batch result banner
- Replaces the grid/timeline body with `<ClipSidebar />` + `<ClipEditor />`

### Store Changes
In `clips-slice.ts`:
- `selectedClipIndex` already exists — we'll use it to track which clip is active in the sidebar
- Add `activeClipId: string | null` — derived from selectedClipIndex + displayed clips (or we just compute it in the component)

No new store fields needed — `selectedClipIndex` + the existing filter/sort state is sufficient.

## Implementation Steps

### Step 1: Create `ClipSidebar.tsx`
**File**: `src/renderer/src/components/ClipSidebar.tsx`

New component that receives:
```ts
interface ClipSidebarProps {
  clips: ClipCandidate[]
  activeClipId: string | null
  onSelectClip: (clipId: string, index: number) => void
  sourceId: string
  sourcePath: string
  filter: FilterTab
  onFilterChange: (filter: FilterTab) => void
  sortMode: SortMode
  onSortChange: (mode: SortMode) => void
  searchQuery: string
  onSearchChange: (query: string) => void
}
```

Each sidebar entry:
```tsx
<button onClick={() => onSelectClip(clip.id, i)} className={cn(
  'flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-left transition-all',
  'hover:bg-accent/50',
  isActive && 'bg-accent ring-1 ring-primary/50',
  clip.status === 'approved' && 'border-l-2 border-l-green-500',
  clip.status === 'rejected' && 'border-l-2 border-l-red-500 opacity-50',
)}>
  {/* Tiny thumbnail */}
  <div className="w-12 h-8 rounded overflow-hidden bg-black/40 shrink-0">
    {clip.thumbnail && <img src={clip.thumbnail} className="w-full h-full object-cover" />}
  </div>
  {/* Text content */}
  <div className="flex-1 min-w-0">
    <p className="text-xs font-medium leading-snug truncate">{clip.hookText || '—'}</p>
    <div className="flex items-center gap-1.5 mt-0.5">
      <span className="text-[10px] text-muted-foreground tabular-nums">{formatDuration(clip.duration)}</span>
      <span className={cn('text-[10px] font-bold tabular-nums', scoreBadgeClass(clip.score))}>{clip.score}</span>
      {/* Style badge */}
      {(clip.overrides || clip.aiEditPlan) && (
        <span className="text-[9px] bg-violet-500/20 text-violet-400 rounded px-1">styled</span>
      )}
    </div>
  </div>
  {/* Status icon */}
  {clip.status === 'approved' && <Check className="w-3.5 h-3.5 text-green-500 shrink-0" />}
</button>
```

### Step 2: Create `ClipEditor.tsx`
**File**: `src/renderer/src/components/ClipEditor.tsx`

Extract the **content** from `ClipPreview.tsx`'s `<DialogContent>` into an inline component. The existing ClipPreview renders inside a `<Dialog>` — the new ClipEditor renders the same content but without the Dialog wrapper.

Key differences from ClipPreview:
- No Dialog/DialogContent wrapper — renders directly in a div
- Adds prev/next navigation buttons at the top
- Adds approve/reject buttons prominently
- Adds keyboard shortcuts (arrow keys for nav, A for approve, R for reject)
- Shows the full transcript text

Props:
```ts
interface ClipEditorProps {
  clip: ClipCandidate
  sourceId: string
  sourcePath: string
  sourceDuration: number
  onPrev: () => void
  onNext: () => void
  hasPrev: boolean
  hasNext: boolean
  clipIndex: number
  totalClips: number
}
```

### Step 3: Modify `ClipGrid.tsx` layout
Replace the grid/timeline rendering section (lines ~2392-2593) with the new sidebar + editor layout:

```tsx
{/* Content: Sidebar + Editor */}
<div className="flex-1 flex overflow-hidden">
  {/* Clip Sidebar */}
  <ClipSidebar
    clips={displayedClips}
    activeClipId={activeClip?.id ?? null}
    onSelectClip={(_, index) => setSelectedClipIndex(index)}
    sourceId={activeSourceId ?? ''}
    sourcePath={sourcePath}
    filter={filter}
    onFilterChange={setFilter}
    sortMode={sortMode}
    onSortChange={setSortMode}
    searchQuery={localSearch}
    onSearchChange={handleSearchChange}
  />
  
  {/* Main Editor */}
  <div className="flex-1 overflow-y-auto">
    {activeClip ? (
      <ClipEditor
        clip={activeClip}
        sourceId={activeSourceId ?? ''}
        sourcePath={sourcePath}
        sourceDuration={sourceDuration}
        onPrev={() => setSelectedClipIndex(Math.max(0, selectedClipIndex - 1))}
        onNext={() => setSelectedClipIndex(Math.min(displayedClips.length - 1, selectedClipIndex + 1))}
        hasPrev={selectedClipIndex > 0}
        hasNext={selectedClipIndex < displayedClips.length - 1}
        clipIndex={selectedClipIndex}
        totalClips={displayedClips.length}
      />
    ) : (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Select a clip from the sidebar
      </div>
    )}
  </div>
</div>
```

### Step 4: Move filter/sort/search controls from ClipGrid header into ClipSidebar
The ClipGrid header bar becomes simpler — just the batch action buttons (approve all, reject all, render) + render progress. The filter tabs, sort dropdown, search box, and min-score slider move into the sidebar header.

### Step 5: Simplify ClipGrid header
Remove from the ClipGrid header:
- Filter tabs (moved to sidebar)
- Sort select (moved to sidebar)
- Search input (moved to sidebar)
- Min score slider (moved to sidebar)
- View mode toggle (grid/timeline — no longer needed)
- Compare mode (removed for now — can be re-added later)
- Undo/redo buttons (keep in header)

Keep in the ClipGrid header:
- Clip count badge + approval counts
- Approve All / Reject All buttons
- Render button
- Export dropdowns
- Undo/redo

### Step 6: Keyboard navigation
In ClipEditor, add:
- `ArrowLeft` / `ArrowUp` → previous clip
- `ArrowRight` / `ArrowDown` → next clip
- `A` → approve current clip
- `R` → reject current clip
- `E` → focus hook text for editing

### Step 7: Auto-scroll sidebar
When selectedClipIndex changes, scroll the sidebar item into view using `scrollIntoView({ block: 'nearest', behavior: 'smooth' })`.

## Files to Create
1. `src/renderer/src/components/ClipSidebar.tsx` — new
2. `src/renderer/src/components/ClipEditor.tsx` — new (extracts from ClipPreview)

## Files to Modify
1. `src/renderer/src/components/ClipGrid.tsx` — restructure body from grid → sidebar+editor layout, simplify header
2. `src/renderer/src/store/clips-slice.ts` — no changes needed (selectedClipIndex already exists)

## Files NOT Changed
- `ClipCard.tsx` — kept for potential future use, but no longer rendered in the main flow
- `ClipPreview.tsx` — kept as the dialog version, still used from ClipCard if needed
- `App.tsx` — no changes needed, still renders `<ClipGrid />`
- Store types — no changes needed

## Risks
- ClipGrid is 2679 lines — surgical editing is risky. I'll keep the render logic intact and only replace the view section.
- ClipPreview.tsx has complex video player + waveform logic — ClipEditor will reuse the same patterns but rendered inline.
- The selectedClipIndex might go out of bounds when filters change — need to clamp it.

## Verification
1. `npx electron-vite build` must pass with no errors
2. The sidebar must show all clips with thumbnails, scores, and status indicators
3. Clicking a sidebar item must load the clip editor
4. Arrow keys must navigate between clips
5. Approve/reject from the editor must update the sidebar indicator
6. Render workflow must still work (the render logic stays in ClipGrid)
