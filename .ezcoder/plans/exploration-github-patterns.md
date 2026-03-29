# GitHub Patterns: React Video Editor Mode-Switching Interfaces

## Summary

Searched GitHub for real-world implementations of video editors with mode-switching interfaces,
focusing on caption/style editing, timeline segments, and tabbed editor panels. The most
relevant project is **CapSoftware/Cap** (desktop screen recorder with a full video editor).
Other notable projects: **ncounterspecialist/twick** (React video editor library),
**onlook-dev/onlook**, **mattpocock/course-video-manager**, **trykimu/videoeditor**.

---

## 1. CapSoftware/Cap — Desktop Video Editor (SolidJS, most feature-complete)

**Repo:** https://github.com/CapSoftware/Cap  
**Stack:** SolidJS (not React, but identical component patterns), Tauri, TypeScript

### File Structure (editor module)
```
apps/desktop/src/routes/editor/
├── Editor.tsx              — Top-level editor shell
├── Player.tsx              — Video preview with caption overlay
├── ConfigSidebar.tsx       — Tabbed sidebar (Captions, Background, Cursor, etc.)
├── CaptionsTab.tsx         — Caption editing panel
├── KeyboardTab.tsx         — Keyboard shortcut config panel
├── Header.tsx              — Top toolbar with mode buttons
├── AspectRatioSelect.tsx   — Aspect ratio selector
├── GradientEditor.tsx      — Background gradient editor
├── captions.ts             — Caption business logic
├── context.tsx             — Editor context/state (CornerRoundingType, FPS, etc.)
├── color-utils.ts          — Color utilities
├── masks.ts                — Mask segment types
├── text.ts                 — Text segment types
├── timelineTracks.ts       — Track row utilities
├── utils.ts                — formatTime etc.
├── Timeline/
│   ├── index.tsx           — Timeline shell with segment initialization
│   ├── CaptionsTrack.tsx   — Caption segments on timeline
│   ├── ClipTrack.tsx       — Video clip segments on timeline
│   ├── Track.tsx           — Shared SegmentRoot, SegmentHandle, SegmentContent
│   ├── context.tsx         — Timeline-specific context (secsPerPixel, etc.)
│   └── sectionMarker.ts   — Section marker helpers
└── screenshot-editor/      — Separate screenshot editor variant
    └── context.tsx         — ScreenshotProject type (captions: null, etc.)
```

### Mode-Switching Pattern (Tabbed Sidebar)
The `ConfigSidebar.tsx` uses **Kobalte Tabs** (`KTabs` from `@kobalte/core/tabs`) with a
tab-per-feature approach. Tabs are defined as an array of `{ id, icon }` objects and rendered
via `<For>` + `<KTabs.Trigger>`:

```tsx
// ConfigSidebar.tsx (conceptual)
const SIDEBAR_TABS = {
  transcript: "transcript",
  audio: "audio",
  cursor: "cursor",
  keyboard: "keyboard",
  hotkeys: "hotkeys",
  captions: "captions",
} as const;

// Rendered inside <KTabs.Root>
<For each={[
  { id: "background", icon: IconCapBackground },
  { id: "camera", icon: IconCapCamera },
  { id: "transcript", icon: IconCapTranscript },
  { id: "audio", icon: IconCapAudio },
  { id: "cursor", icon: IconCapCursor },
  { id: "captions", icon: IconCapCaptions },
]}>
  {(item) => (
    <KTabs.Trigger value={item.id} class="...">
      <Dynamic component={item.icon} />
    </KTabs.Trigger>
  )}
</For>
```

Each tab renders a different `<KTabs.Content>` panel: `<CaptionsTab />`, camera settings,
background gradient editor, etc.

### Caption/Timeline Segment Model
```typescript
// From tauri bindings — used throughout the editor
type TimelineSegment = { start: number; end: number; timescale: number; };
// Caption-specific:
project.timeline?.captionSegments  // Array of caption segments
project.timeline?.segments         // Video clip segments
project.timeline?.zoomSegments     // Zoom keyframes
project.timeline?.sceneSegments    // Scene switching
project.timeline?.maskSegments     // Mask overlays
project.timeline?.textSegments     // Text overlays
project.timeline?.keyboardSegments // Keyboard overlay segments
```

### CaptionsTab.tsx — Caption Editor Panel
- Uses `selectedCaptionIndex()` from `editorState.timeline.selection.indices`
- Updates via SolidJS `produce()` (immer-like):
  ```tsx
  const updateSelectedCaption = (update) => {
    setProject(produce((currentProject) => {
      const timelineSegment = currentProject.timeline?.captionSegments?.[index];
      update(timelineSegment);
      // Sync back to captions store
      const captionSegment = currentProject.captions?.segments?.[index];
      captionSegment.start = timelineSegment.start;
      captionSegment.end = timelineSegment.end;
      captionSegment.text = timelineSegment.text;
    }));
  };
  ```

### Key Takeaways
- **Tab-based mode switching** via component library tabs (Kobalte)
- **Shared timeline segment model** — all segment types share `{ start, end }` base
- **Separate tab components** for each editing concern (CaptionsTab, KeyboardTab, etc.)
- **Context-driven state** — `useEditorContext()` provides project, editorState, actions
- **Timeline selection drives sidebar** — selecting a caption segment in timeline shows caption editor

---

## 2. ncounterspecialist/twick — React Video Editor Library

**Repo:** https://github.com/ncounterspecialist/twick  
**Stack:** React, TypeScript, monorepo with packages

### File Structure
```
packages/
├── video-editor/src/components/
│   └── video-editor.tsx       — Main VideoEditor component
├── studio/src/
│   ├── components/
│   │   ├── twick-studio.tsx   — TwickStudio wrapper (tools + editor + timeline)
│   │   ├── toolbar.tsx        — Left sidebar tool selector
│   │   ├── props-toolbar.tsx  — Right sidebar property editor
│   │   └── container/
│   │       └── element-panel-container.tsx — Tool→panel mapping
│   ├── hooks/
│   │   ├── use-studio-manager.tsx — Central state hook
│   │   └── use-studio-operation.tsx
│   └── types.ts
├── live-player/               — Video playback engine
├── timeline/                  — Timeline component
└── examples/                  — Demo app
```

### Mode-Switching Pattern (Tool Selection)
Uses a `selectedTool` string state with a vertical toolbar:

```tsx
// use-studio-manager.tsx
const { selectedTool, setSelectedTool, selectedElement, addElement, updateElement } = useStudioManager();

// toolbar.tsx — Tool categories
const defaultToolCategories: ToolCategory[] = [
  { id: 'video', name: 'Video', icon: 'Video', description: 'Add a video element' },
  { id: 'image', name: 'Image', icon: 'Image', description: 'Add an image element' },
  { id: 'audio', name: 'Audio', icon: 'Audio', description: 'Add an audio element' },
  // text, shapes, effects, etc.
];

// Toolbar renders these and calls setSelectedTool(toolId)
```

### Layout
```tsx
// twick-studio.tsx
<TwickStudio>
  <MenuBar />
  <div className="studio-content">
    <Toolbar selectedTool={selectedTool} setSelectedTool={setSelectedTool} />
    <ElementPanelContainer selectedTool={selectedTool} ... />
    <div className="studio-canvas">
      <VideoEditor editorConfig={...} />
    </div>
    <PropsToolbar selectedElement={selectedElement} ... />
  </div>
  <Timeline />
</TwickStudio>
```

### Key Takeaways
- **String-based tool selection** — simple `selectedTool` state drives which panel shows
- **Three-column layout**: Toolbar | Canvas | Properties sidebar
- **Element-centric** — each tool maps to an element type (video, image, text, audio)
- **Separation of concerns**: `use-studio-manager` for state, toolbar for input, panel for content

---

## 3. onlook-dev/onlook — Visual Web Editor

**Repo:** https://github.com/onlook-dev/onlook  
**Stack:** React, TypeScript

### EditorMode Enum
```typescript
// packages/models/src/editor/index.ts
export enum EditorMode {
  DESIGN = 'design',
  CODE = 'code',
  PREVIEW = 'preview',
  PAN = 'pan',
}
```

### Mode Switching via Hotkeys + Direct Assignment
```tsx
// canvas/hotkeys/index.tsx
useHotkeys(Hotkey.SELECT.command, () => (editorEngine.state.editorMode = EditorMode.DESIGN));
useHotkeys(Hotkey.CODE.command, () => (editorEngine.state.editorMode = EditorMode.CODE));
useHotkeys(Hotkey.ESCAPE.command, () => {
  editorEngine.state.editorMode = EditorMode.DESIGN;
  if (!editorEngine.text.isEditing) editorEngine.clearUI();
});
useHotkeys(Hotkey.PAN.command, () => (editorEngine.state.editorMode = EditorMode.PAN));
useHotkeys(Hotkey.PREVIEW.command, () => (editorEngine.state.editorMode = EditorMode.PREVIEW));
```

### Key Takeaways
- **Enum-based mode** — clean TypeScript enum for all modes
- **MobX-style direct assignment** via editorEngine.state
- **Hotkey-driven mode switching** (V=design, C=code, Esc=reset, P=preview)
- **Mode affects entire canvas** behavior, not just sidebar panel

---

## 4. Grafana — Query Editor Mode Toggle (Builder/Code)

**Repo:** https://github.com/grafana/grafana  
**Stack:** React, TypeScript

### EditorMode Toggle Component
```tsx
// packages/grafana-prometheus/src/querybuilder/shared/QueryEditorModeToggle.tsx
interface Props {
  mode: QueryEditorMode;
  onChange: (mode: QueryEditorMode) => void;
}

export function QueryEditorModeToggle({ mode, onChange }: Props) {
  const editorModes = [
    { label: 'Builder', value: QueryEditorMode.Builder },
    { label: 'Code', value: QueryEditorMode.Code },
  ];
  return <RadioButtonGroup options={editorModes} value={mode} onChange={onChange} />;
}
```

### Pattern
- **RadioButtonGroup** for binary mode toggle
- **Mode stored in query object** — `query.editorMode`
- **Conditional rendering** based on mode:
  - Builder mode → visual query builder
  - Code mode → raw query editor

### Key Takeaways
- **RadioButtonGroup** is a clean pattern for 2-3 mode toggles
- **Mode as part of data model** (not just UI state) — persists with query

---

## 5. stan-smith/FossFLOW — Isometric Flow Editor

**Repo:** https://github.com/stan-smith/FossFLOW

### EditorMode as Tool Availability Map
```typescript
// types/common.ts
export const EditorModeEnum = {
  NON_INTERACTIVE: 'NON_INTERACTIVE',
  EXPLORABLE_READONLY: 'EXPLORABLE_READONLY',
  EDITABLE: 'EDITABLE'
} as const;

// UiOverlay.tsx
const EDITOR_MODE_MAPPING: EditorModeMapping = {
  [EditorModeEnum.EDITABLE]: ['TOOL_MENU', 'ITEM_CONTROLS', 'VIEW_TITLE'],
  [EditorModeEnum.EXPLORABLE_READONLY]: ['VIEW_TITLE'],
  [EditorModeEnum.NON_INTERACTIVE]: [],
};
```

### Key Takeaway
- **Mode controls which UI elements are visible** — a mapping from mode → visible tools
- Useful for permission-based mode switching (readonly vs editable)

---

## 6. mattpocock/course-video-manager

**Repo:** https://github.com/mattpocock/course-video-manager

### VideoEditor Context
```typescript
// video-editor-context.tsx
export type VideoEditorContextType = {
  runningState: "playing" | "paused";
  currentClipId: FrontendId | undefined;
  currentTimeInClip: number;
  selectedClipsSet: Set<FrontendId>;
  clipIdsPreloaded: Set<FrontendId>;
  playbackRate: number;
  dispatch: (action: videoStateReducer.Action) => void;
  clips: Clip[];
  currentClip: Clip | undefined;
  totalDuration: number;
};
```

### Key Takeaway
- **Reducer-based state** with `useEffectReducer` for side-effect handling
- **Clip-centric model** — clips as first-class entities with preloading

---

## 7. markuryy/caption-helper — Simple Caption Editor

**Repo:** https://github.com/markuryy/caption-helper

### CaptionEditor Component
```tsx
// components/CaptionEditor.tsx
interface CaptionEditorProps {
  caption: string;
  onChange: (caption: string) => void;
}

export default function CaptionEditor({ caption, onChange }: CaptionEditorProps) {
  return <Textarea label="Caption" rows={5} value={caption} onChange={...} />;
}

// Used in app/page.tsx alongside ImageViewer and Navigation:
<div className="w-full md:w-1/2">
  <CaptionEditor caption={images[selectedIndex].caption} onChange={handleCaptionChange} />
</div>
```

### Key Takeaway
- **Minimal caption editor**: just a textarea with controlled props
- **Side-by-side layout**: image viewer + caption editor

---

## Pattern Synthesis: Common Approaches to Mode Switching

### 1. Tab-Based Switching (Cap, Grafana)
```
┌─────────────────────────────────────┐
│  [Tab A] [Tab B] [Tab C] [Tab D]   │  ← Tab triggers
├─────────────────────────────────────┤
│                                     │
│  Panel content changes per tab      │  ← Tab content
│                                     │
└─────────────────────────────────────┘
```
- **Best for**: Sidebar panels with many editing concerns
- **Implementation**: UI library tabs (Kobalte, Radix, MUI)
- **State**: Tab value stored in local state or editor context

### 2. Toolbar Tool Selection (Twick)
```
┌──┬────────────────────┬──┐
│V │                    │P │
│I │     Canvas /       │r │
│d │     Preview        │o │
│e │                    │p │
│o │                    │s │
├──┼────────────────────┼──┤
│  │     Timeline       │  │
└──┴────────────────────┴──┘
```
- **Best for**: Tool-centric editors (each tool = different behavior)
- **Implementation**: `selectedTool` string state + icon toolbar
- **State**: Central hook (`useStudioManager`)

### 3. Enum Mode + Hotkeys (Onlook)
```typescript
enum EditorMode { DESIGN, CODE, PREVIEW, PAN }
// Direct assignment: editorEngine.state.editorMode = EditorMode.CODE
// Hotkey bindings for each mode
```
- **Best for**: Entire editor behavior changes (design vs code vs preview)
- **Implementation**: Enum + MobX observable or zustand store
- **State**: Global editor engine state

### 4. RadioButtonGroup Toggle (Grafana)
```
  ◉ Builder  ○ Code
```
- **Best for**: Binary/ternary mode switch
- **Implementation**: RadioButtonGroup or SegmentedControl
- **State**: Stored in data model (persisted with queries)

### 5. Conditional Panel Rendering (All)
Every project conditionally renders panel content based on mode:
```tsx
{mode === "captions" && <CaptionsTab />}
{mode === "styles" && <StylesPanel />}
// or
<KTabs.Content value="captions"><CaptionsTab /></KTabs.Content>
<KTabs.Content value="styles"><StylesPanel /></KTabs.Content>
```

---

## Recommended Patterns for a Video Caption/Style Editor

Based on the survey, the **Cap pattern** is most relevant for a video editor with
caption + style editing modes:

1. **Tab-based sidebar** with icons for each editing concern
2. **Shared timeline** with typed segment arrays (`captionSegments`, `styleSegments`)
3. **Selection-driven panels** — clicking a timeline segment opens the relevant editor
4. **Context provider** with project state + editor UI state separated
5. **Produce/immer updates** for nested project mutations
6. **Dedicated tab components** (`CaptionsTab.tsx`, `StylesTab.tsx`) keeping concerns isolated
