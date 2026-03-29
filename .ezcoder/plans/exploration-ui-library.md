# UI Component Library Exploration

## shadcn/ui Components (19 total)

**Path:** `src/renderer/src/components/ui/`

| File | Size | Radix Primitive |
|------|------|-----------------|
| `alert-dialog.tsx` | 4.6K | `@radix-ui/react-alert-dialog` |
| `badge.tsx` | 1.1K | — (CVA only) |
| `button.tsx` | 1.9K | `@radix-ui/react-slot` |
| `card.tsx` | 1.8K | — (div wrappers) |
| `checkbox.tsx` | 1.0K | `@radix-ui/react-checkbox` |
| `context-menu.tsx` | 7.3K | `@radix-ui/react-context-menu` |
| `dialog.tsx` | 3.7K | `@radix-ui/react-dialog` |
| `dropdown-menu.tsx` | 7.4K | `@radix-ui/react-dropdown-menu` |
| `input.tsx` | 791B | — (native input) |
| `label.tsx` | 710B | `@radix-ui/react-label` |
| `progress.tsx` | 777B | `@radix-ui/react-progress` |
| `scroll-area.tsx` | 1.6K | `@radix-ui/react-scroll-area` |
| `select.tsx` | 5.6K | `@radix-ui/react-select` |
| `separator.tsx` | 756B | `@radix-ui/react-separator` |
| `skeleton.tsx` | 231B | — (div + className) |
| `slider.tsx` | 1.1K | `@radix-ui/react-slider` |
| `switch.tsx` | 1.1K | `@radix-ui/react-switch` |
| `tabs.tsx` | 1.9K | `@radix-ui/react-tabs` |
| `tooltip.tsx` | 1.2K | `@radix-ui/react-tooltip` |

## shadcn Configuration

**File:** `components.json`
- **Style:** `default`
- **RSC:** `false` (Electron app, no React Server Components)
- **TSX:** `true`
- **Base color:** `zinc`
- **CSS variables:** `true`
- **Alias:** `@/components` → components, `@/lib/utils` → utils

## Theme / CSS Variables

**File:** `src/renderer/src/assets/index.css`

### Light mode (`:root`)
| Variable | HSL Value | Role |
|----------|-----------|------|
| `--background` | `0 0% 100%` | White |
| `--foreground` | `0 0% 3.9%` | Near-black |
| `--primary` | `0 0% 9%` | Near-black |
| `--secondary` | `0 0% 96.1%` | Light gray |
| `--muted` | `0 0% 96.1%` | Light gray |
| `--accent` | `0 0% 96.1%` | Light gray |
| `--destructive` | `0 84.2% 60.2%` | Red |
| `--border` | `0 0% 89.8%` | Border gray |
| `--ring` | `0 0% 3.9%` | Focus ring black |
| `--radius` | `0.5rem` | Border radius base |

### Dark mode (`.dark`)
| Variable | HSL Value | Role |
|----------|-----------|------|
| `--background` | `240 10% 3.9%` | Near-black (slight blue) |
| `--foreground` | `0 0% 98%` | Near-white |
| `--primary` | `0 0% 98%` | Near-white |
| `--secondary` | `240 3.7% 15.9%` | Dark gray |
| `--muted` | `240 3.7% 15.9%` | Dark gray |
| `--accent` | `240 3.7% 15.9%` | Dark gray |
| `--destructive` | `0 62.8% 30.6%` | Dark red |
| `--border` | `240 3.7% 15.9%` | Dark border |
| `--ring` | `240 4.9% 83.9%` | Light focus ring |

**Note:** Zinc-based neutral palette. Dark mode uses slight blue tint (`240°` hue). Both modes supported via `darkMode: 'class'` in Tailwind config.

### Custom Scrollbar
Custom WebKit scrollbar: 6px wide, muted-foreground at 30%/50% opacity.

## Tailwind Config

**File:** `tailwind.config.js`
- **Dark mode:** `class`
- **Content:** `src/renderer/index.html`, `src/renderer/src/**/*.{ts,tsx}`
- **Container:** centered, `2rem` padding, max `1400px`
- **Colors:** All mapped from CSS variables via `hsl(var(--xxx))` pattern
- **Border radius:** `lg` / `md` / `sm` derived from `--radius`
- **Keyframes:** `accordion-down` / `accordion-up` (Radix accordion height transitions)
- **Plugin:** `tailwindcss-animate`

## PostCSS Config

**File:** `postcss.config.js`
- `tailwindcss` + `autoprefixer` (standard setup)

## Utility Function

**File:** `src/renderer/src/lib/utils.ts`
- `cn(...inputs)` — standard `clsx` + `tailwind-merge` class merging utility
- Also contains domain helpers: `getScoreDescription()`, `estimateClipSize()`, `formatFileSize()`

## UI-Related Dependencies

### Runtime (`dependencies`)
| Package | Version | Usage |
|---------|---------|-------|
| `framer-motion` | `^12.0.0` | Animation (13 component files) |
| `lucide-react` | `^0.475.0` | Icons (used extensively) |
| `@radix-ui/react-*` | various | Primitives for 13 shadcn components |
| `@dnd-kit/core` | `^6.3.1` | Drag-and-drop (ClipGrid, TemplateEditor) |
| `@dnd-kit/sortable` | `^10.0.0` | Sortable lists |
| `@dnd-kit/modifiers` | `^9.0.0` | Drag constraints |
| `@dnd-kit/utilities` | `^3.2.2` | CSS transform helpers |
| `zustand` | `^5.0.0` | State management |
| `immer` | `^11.1.4` | Immutable state updates |

### Dev (`devDependencies`)
| Package | Version | Usage |
|---------|---------|-------|
| `class-variance-authority` | `^0.7.1` | Component variant API (cva) |
| `clsx` | `^2.1.1` | Conditional classnames |
| `tailwind-merge` | `^3.0.0` | Tailwind class dedup |
| `tailwindcss-animate` | `^1.0.7` | Animation utilities |
| `tailwindcss` | `^3.4.0` | CSS framework |

### Radix Overrides
```json
"overrides": {
  "@radix-ui/react-presence": "npm:@radix-ui/react-presence@1.1.5-rc.1761760880074"
}
```
Pinned to a release candidate — likely fixing an animation/presence bug.

## framer-motion Usage (13 files)
- `App.tsx` — `motion`, `AnimatePresence`
- `ClipCard.tsx` — `motion`
- `ClipCardSkeleton.tsx` — `motion`
- `ClipGrid.tsx` — `motion`, `AnimatePresence`
- `ClipStats.tsx` — `motion`, `AnimatePresence`
- `OfflineBanner.tsx` — `motion`, `AnimatePresence`
- `OnboardingWizard.tsx` — `motion`, `AnimatePresence`
- `ProcessingPanel.tsx` — `motion`, `AnimatePresence`
- `ScriptCueSplitter.tsx` — `motion`, `AnimatePresence`
- `SetupWizard.tsx` — `motion`, `AnimatePresence`
- `SourceInput.tsx` — `motion`, `AnimatePresence`
- `StitchedClipCard.tsx` — `motion`
- `WhatsNew.tsx` — `motion`

## @dnd-kit Usage (2 files)
- `ClipGrid.tsx` — full sortable grid with DndContext, SortableContext, useSortable
- `TemplateEditor.tsx` — draggable elements with restrictToParentElement

## Notable Absent shadcn Components
Not installed (may be needed for new features):
`accordion`, `avatar`, `breadcrumb`, `calendar`, `carousel`, `collapsible`,
`command`, `date-picker`, `form`, `hover-card`, `menubar`, `navigation-menu`,
`pagination`, `popover`, `radio-group`, `resizable`, `sheet`, `sidebar`,
`sonner/toast`, `table`, `textarea`, `toggle`, `toggle-group`

## Key Takeaways
1. **Standard shadcn/ui + Tailwind v3 setup** — zinc palette, CSS variables, class-based dark mode
2. **Animation-heavy** — framer-motion used in 13/~20 component files, core to the UX
3. **Drag-and-drop** — @dnd-kit powers clip reordering and template element positioning
4. **19 shadcn primitives available** — covers dialogs, menus, forms, feedback; no toast/sonner yet
5. **CVA + cn() pattern** — all components use class-variance-authority for variants + cn() for merging
