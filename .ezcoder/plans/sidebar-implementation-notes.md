# Implementation Notes - Sidebar Navigation

## Critical File Details

### ClipGrid.tsx (2679 lines)
- Lines 1-99: imports
- Lines 100-201: SortableClipCard wrapper, helpers, types
- Lines 213-260: store hooks
- Lines 262-501: memoized data (allClips, approvedClips, displayedClips etc.)
- Lines 551-1093: handleStartRender, handleRetryFailed (KEEP ALL OF THIS)
- Lines 1097-1330: auto-render, cancel, export report, descriptions (KEEP)
- Lines 1332-1364: render progress helpers, ETA (KEEP)
- Lines 1366-1396: empty state return (modify for sidebar)
- Lines 1398-1897: HEADER BAR (simplify - move filter/sort/search to sidebar)
- Lines 1899-1955: ClipStats, compare banner, auto-mode banner
- Lines 1957-2141: batch action toolbar
- Lines 2143-2389: render progress banner + batch result banner (KEEP)
- Lines 2392-2593: GRID/TIMELINE BODY (REPLACE with sidebar+editor)
- Lines 2595-2679: confirmation dialogs (KEEP)

### ClipPreview.tsx
- Line 233: export function ClipPreview - receives clip, sourceId, sourcePath, sourceDuration, open, onClose
- Renders inside a `<Dialog>` wrapper
- Has video player, DualSlider trim, waveform, OverrideRow toggles
- Local state: localStart, localEnd, localHook, editingHook, isPlaying, currentTime, showReasoning, showOverrides, viewMode
- Imports: Dialog, Button, Badge, Switch, Label, Tooltip, Select, EditableTime, WaveformDisplay, useCopyToClipboard

### Store
- `selectedClipIndex: number` - clips-slice.ts line 24, init 0 line 90, setter line 251
- `clipViewMode: 'grid' | 'timeline'` - clips-slice.ts line 28
- `ClipCandidate` type: store/types.ts line 171 - has id, sourceId, startTime, endTime, duration, text, score, hookText, reasoning, status, cropRegion, thumbnail, customThumbnail, wordTimestamps, overrides, aiEditPlan, shots, shotStyles, variants, partInfo, loopScore

### Available UI Components
badge, button, card, checkbox, context-menu, dialog, dropdown-menu, input, label, progress, scroll-area, select, separator, skeleton, slider, switch, tabs, tooltip

### Key Imports Pattern
```ts
import { useStore } from '../store'
import type { ClipCandidate } from '../store'
import { cn } from '@/lib/utils'
```

### FilterTab and SortMode types (local to ClipGrid, need to export or duplicate)
```ts
type FilterTab = 'all' | 'approved' | 'rejected' | 'pending'
type SortMode = 'score' | 'time' | 'duration' | 'custom'
```

### Helper functions needed in sidebar
```ts
function formatDuration(seconds: number): string {
  const s = Math.round(seconds)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const rem = s % 60
  return rem === 0 ? `${m}m` : `${m}m ${rem}s`
}

function scoreBadgeClass(score: number): string {
  if (score >= 90) return 'bg-green-500/20 text-green-400 border-green-500/40'
  if (score >= 80) return 'bg-blue-500/20 text-blue-400 border-blue-500/40'
  if (score >= 70) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40'
  return 'bg-orange-500/20 text-orange-400 border-orange-500/40'
}
```

### Build Command
```bash
npx electron-vite build
```

### Task ID to mark done: b40e077b
