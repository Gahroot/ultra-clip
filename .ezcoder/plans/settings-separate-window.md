# Settings as Separate Resizable/Movable Electron Window

## Overview
Replace the Sheet sidebar with a separate `BrowserWindow` for settings. The settings window loads the same renderer bundle with a `#settings` hash route. State syncs via `BroadcastChannel` API (available in Chromium). The window is resizable, movable, and remembers its position/size.

## Architecture

```
Main Window (BrowserWindow)
  └── Renderer: App.tsx (detects no #settings → renders normal app)
  └── Zustand store → localStorage

Settings Window (BrowserWindow, child of main)
  └── Renderer: same index.html#settings
  └── App.tsx detects #settings → renders SettingsPanel full-screen
  └── Zustand store → localStorage (same origin, shared storage)

Sync: BroadcastChannel('batchcontent-settings-sync')
  - Settings window posts 'settings-changed' on every store mutation
  - Main window listens and reloads settings from localStorage into Zustand
  - Main window posts 'settings-changed' if settings change from main (e.g. profiles)
```

## Key Design Decisions

1. **Same bundle, hash routing** — No separate entry point. The existing `index.html` loads with `#settings` appended. `main.tsx` checks `window.location.hash` and renders either `<App />` or `<SettingsWindow />`.

2. **BroadcastChannel for sync** — Both windows share the same origin (`file://` or `http://localhost`). `BroadcastChannel` is the cleanest cross-window messaging API. When settings change in the settings window, a message is broadcast. The main window's store subscribes and reloads from localStorage.

3. **Window management via IPC** — The main process owns the settings `BrowserWindow`. The renderer sends `settings-window:open` / `settings-window:close` via IPC. The main process creates/focuses/closes the window.

4. **Position/size persistence** — The settings window's bounds are saved to localStorage on close and restored on next open.

5. **Child window** — Created with `parent: mainWindow` so it stays associated but NOT `modal: true` (user can interact with both).

---

## Step-by-Step Implementation

### Step 1: Add IPC channels for settings window management

**File: `src/shared/ipc-channels.ts`**

Add new invoke channels:
```typescript
// Inside Ch.Invoke enum (or object):
SETTINGS_WINDOW_OPEN = 'settings-window:open',
SETTINGS_WINDOW_CLOSE = 'settings-window:close',
SETTINGS_WINDOW_IS_OPEN = 'settings-window:is-open',
```

**grep MCP reference**: Search for `settings-window:open` or `new BrowserWindow({ parent` in TypeScript repos to see how other Electron apps manage child windows.

### Step 2: Create settings window manager in main process

**New file: `src/main/settings-window.ts`**

This module manages the settings BrowserWindow lifecycle:

```typescript
import { BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

let settingsWindow: BrowserWindow | null = null

export function registerSettingsWindowHandlers(mainWindow: BrowserWindow): void {
  ipcMain.handle('settings-window:open', () => {
    if (settingsWindow && !settingsWindow.isDestroyed()) {
      settingsWindow.focus()
      return
    }

    // Restore saved bounds or use defaults
    // Default: 540×700, positioned to the right of main window
    const mainBounds = mainWindow.getBounds()
    const defaultX = mainBounds.x + mainBounds.width + 10
    const defaultY = mainBounds.y

    settingsWindow = new BrowserWindow({
      width: 540,
      height: 700,
      minWidth: 420,
      minHeight: 500,
      x: defaultX,
      y: defaultY,
      parent: mainWindow,       // Associated with main, not modal
      modal: false,
      show: false,
      autoHideMenuBar: true,
      title: 'Settings — BatchContent',
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false
      }
    })

    settingsWindow.on('ready-to-show', () => {
      settingsWindow?.show()
    })

    settingsWindow.on('closed', () => {
      settingsWindow = null
      // Notify main window that settings window closed
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send('settings-window:closed')
      }
    })

    // Load same renderer bundle with #settings hash
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      settingsWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#settings`)
    } else {
      settingsWindow.loadFile(join(__dirname, '../renderer/index.html'), {
        hash: 'settings'
      })
    }
  })

  ipcMain.handle('settings-window:close', () => {
    if (settingsWindow && !settingsWindow.isDestroyed()) {
      settingsWindow.close()
    }
  })

  ipcMain.handle('settings-window:is-open', () => {
    return settingsWindow !== null && !settingsWindow.isDestroyed()
  })
}

export function closeSettingsWindow(): void {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.close()
  }
}
```

**grep MCP reference**: Search for `loadFile(join(__dirname` with `hash:` parameter to verify correct electron-vite file loading with hash routes.

### Step 3: Register settings window handlers in main index.ts

**File: `src/main/index.ts`**

- Import `registerSettingsWindowHandlers` and `closeSettingsWindow` from `./settings-window`
- Call `registerSettingsWindowHandlers(mainWindow)` inside `createWindow()` after the window is created (but the function needs the mainWindow reference, so restructure slightly)
- The current `createWindow()` doesn't return the window. Refactor to:

```typescript
function createWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({ ... })
  // ... existing setup ...
  registerSettingsWindowHandlers(mainWindow)
  return mainWindow
}
```

- In `app.on('before-quit')`, call `closeSettingsWindow()` to clean up

**Lines to modify:**
- Line 38: `function createWindow(): void` → `function createWindow(): BrowserWindow`
- After line 85 (loadFile): Add `registerSettingsWindowHandlers(mainWindow)`
- Add `return mainWindow` before closing brace
- Line 115: `createWindow()` → store return value if needed for cleanup

### Step 4: Add preload bridge methods

**File: `src/preload/index.ts`**

Add to the `api` object:
```typescript
openSettingsWindow: invoke('settings-window:open'),
closeSettingsWindow: invoke('settings-window:close'),
isSettingsWindowOpen: invoke<boolean>('settings-window:is-open'),
onSettingsWindowClosed: listen('settings-window:closed' as any),
```

Note: Need to add `'settings-window:closed'` to the `SendChannel` type in `ipc-channels.ts`.

**File: `src/preload/index.d.ts`**

Add to the `Api` interface:
```typescript
openSettingsWindow: () => Promise<void>
closeSettingsWindow: () => Promise<void>
isSettingsWindowOpen: () => Promise<boolean>
onSettingsWindowClosed: (callback: () => void) => () => void
```

### Step 5: Add BroadcastChannel sync to the Zustand store

**File: `src/renderer/src/store/settings-sync.ts`** (new file)

Create a module that:
1. Creates a `BroadcastChannel('batchcontent-settings-sync')`
2. Exports `broadcastSettingsChange()` — posts a message to the channel
3. Exports `onSettingsChange(callback)` — listens for messages and calls callback
4. The callback reloads settings from localStorage and updates the Zustand store

```typescript
const channel = new BroadcastChannel('batchcontent-settings-sync')

export function broadcastSettingsChange(): void {
  channel.postMessage({ type: 'settings-changed', timestamp: Date.now() })
}

export function listenForSettingsChanges(callback: () => void): () => void {
  const handler = (event: MessageEvent) => {
    if (event.data?.type === 'settings-changed') {
      callback()
    }
  }
  channel.addEventListener('message', handler)
  return () => channel.removeEventListener('message', handler)
}
```

**grep MCP reference**: Search for `BroadcastChannel('` in TypeScript/TSX to verify correct usage patterns for cross-window state sync.

### Step 6: Integrate BroadcastChannel into the store

**File: `src/renderer/src/store/settings-slice.ts`**

- Import `broadcastSettingsChange` from `./settings-sync`
- After every `persistSettings(get().settings)` call, also call `broadcastSettingsChange()`
- This ensures any settings mutation in either window notifies the other

**File: `src/renderer/src/store/index.ts`**

- Import `listenForSettingsChanges` from `./settings-sync`
- After creating the store, set up a listener:
```typescript
// Sync settings from other windows (e.g. settings window ↔ main window)
listenForSettingsChanges(() => {
  const freshSettings = loadPersistedSettings()
  const freshConfig = loadPersistedProcessingConfig()
  useStore.setState({ settings: freshSettings, processingConfig: freshConfig })
})
```

This is the core sync mechanism. When the settings window changes a value → persists to localStorage → broadcasts → main window reloads from localStorage → Zustand state updates → React re-renders.

### Step 7: Create the SettingsWindow wrapper component

**File: `src/renderer/src/SettingsWindow.tsx`** (new file)

A lightweight wrapper that renders SettingsPanel as a full-screen standalone window:

```tsx
import { SettingsPanel } from './components/SettingsPanel'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useTheme } from './hooks/useTheme'

export function SettingsWindow() {
  useTheme() // Apply dark/light theme

  return (
    <TooltipProvider>
      <div className="h-screen flex flex-col bg-background text-foreground">
        <header className="px-4 py-3 border-b border-border shrink-0 flex items-center drag-region">
          <h1 className="text-sm font-semibold">Settings</h1>
        </header>
        <div className="flex-1 overflow-hidden">
          <SettingsPanel />
        </div>
      </div>
    </TooltipProvider>
  )
}
```

### Step 8: Update main.tsx to route based on hash

**File: `src/renderer/src/main.tsx`**

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { SettingsWindow } from './SettingsWindow'
import './assets/index.css'

const isSettingsWindow = window.location.hash === '#settings'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isSettingsWindow ? <SettingsWindow /> : <App />}
  </React.StrictMode>
)
```

### Step 9: Replace Sheet with IPC open in App.tsx

**File: `src/renderer/src/App.tsx`**

Remove:
- `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle`, `SheetTrigger`, `SheetDescription` imports
- `SettingsPanel` import
- The `[settingsOpen, setSettingsOpen]` state
- The entire `<Sheet>` block (lines 400-415)

Replace the settings button with:
```tsx
<Button
  variant="ghost"
  size="icon"
  className="h-8 w-8"
  title="Settings (Ctrl+,)"
  onClick={() => window.api.openSettingsWindow()}
>
  <Settings className="w-4 h-4" />
</Button>
```

Also add a listener for `settings-window:closed` if we need to update any UI state (probably not needed since BroadcastChannel handles data sync).

### Step 10: Persist and restore window bounds

**File: `src/main/settings-window.ts`**

Add bounds persistence:
- On `settingsWindow.on('close')`, save `settingsWindow.getBounds()` via `electron-store` or a simple JSON file in `app.getPath('userData')`
- On creation, read saved bounds and apply them
- Use `screen.getDisplayMatching(bounds)` to ensure the window isn't off-screen

```typescript
import { screen } from 'electron'
import { readFileSync, writeFileSync } from 'fs'

const BOUNDS_FILE = join(app.getPath('userData'), 'settings-window-bounds.json')

function loadBounds(): Electron.Rectangle | null {
  try {
    return JSON.parse(readFileSync(BOUNDS_FILE, 'utf-8'))
  } catch { return null }
}

function saveBounds(bounds: Electron.Rectangle): void {
  try { writeFileSync(BOUNDS_FILE, JSON.stringify(bounds)) } catch {}
}
```

### Step 11: Handle edge cases

**File: `src/main/settings-window.ts`**

1. **Main window closes** → settings window should close too. Add in `createWindow()`:
   ```typescript
   mainWindow.on('closed', () => closeSettingsWindow())
   ```

2. **Settings window already open** → just focus it (already handled in Step 2)

3. **DevTools** — Allow F12 in settings window too:
   ```typescript
   settingsWindow.webContents.on('before-input-event', (_event, input) => {
     if (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i')) {
       settingsWindow?.webContents.toggleDevTools()
     }
   })
   ```

4. **Keyboard shortcut Ctrl+,** — Currently just a title hint. If `useKeyboardShortcuts` handles it, update to call `window.api.openSettingsWindow()` instead of `setSettingsOpen(true)`.

### Step 12: Clean up unused Sheet component

**File: `src/renderer/src/App.tsx`**
- Remove Sheet-related imports

Check if Sheet is used elsewhere:
```bash
grep -r "sheet" src/renderer/src/components/ --include="*.tsx" --include="*.ts"
```

If not used anywhere else, optionally remove `src/renderer/src/components/ui/sheet.tsx` (or keep for future use).

---

## File Change Summary

| File | Action | Description |
|------|--------|-------------|
| `src/shared/ipc-channels.ts` | Edit | Add 3 invoke channels + 1 send channel |
| `src/main/settings-window.ts` | **New** | BrowserWindow lifecycle manager |
| `src/main/index.ts` | Edit | Import + register settings window handlers, return mainWindow |
| `src/preload/index.ts` | Edit | Add 4 API methods |
| `src/preload/index.d.ts` | Edit | Add 4 type declarations |
| `src/renderer/src/store/settings-sync.ts` | **New** | BroadcastChannel sync module |
| `src/renderer/src/store/settings-slice.ts` | Edit | Call `broadcastSettingsChange()` after persist |
| `src/renderer/src/store/index.ts` | Edit | Set up `listenForSettingsChanges` |
| `src/renderer/src/SettingsWindow.tsx` | **New** | Standalone settings window component |
| `src/renderer/src/main.tsx` | Edit | Hash-based routing |
| `src/renderer/src/App.tsx` | Edit | Replace Sheet with IPC button |

## grep MCP Searches to Run During Implementation

1. `BroadcastChannel('` in TypeScript — verify cross-window messaging pattern
2. `new BrowserWindow({ parent:` in TypeScript — verify child window creation
3. `loadFile(join(__dirname` with `hash` in TypeScript — verify electron hash loading
4. `(?s)ipcMain\.handle.*BrowserWindow` in TypeScript — see how apps manage windows via IPC
5. `window.location.hash.*settings` in TSX — see hash-based routing in Electron renderers
6. `settingsWindow\.on\('close` in TypeScript — verify bounds persistence patterns

## Risks

1. **BroadcastChannel availability** — Available in Chromium 54+, Electron uses much newer. No risk.
2. **localStorage race conditions** — Two windows writing simultaneously. Mitigation: settings window is the only writer for settings; main window only reads. Only conflict point is if main window also modifies settings (unlikely since we're moving all settings UI to the separate window).
3. **Window positioning** — Saved bounds may be off-screen if monitors change. Mitigation: validate against `screen.getDisplayMatching()`.
4. **Hot reload in dev** — When electron-vite HMR triggers, it reloads both windows. The hash should persist through reload.
5. **Theme sync** — Both windows read theme from localStorage. BroadcastChannel handles theme changes too since `useTheme` reads from the store.

## Verification

1. `npx electron-vite build` — must pass
2. `npm test` — must pass  
3. Manual testing:
   - Click settings gear → new window opens to the right
   - Resize and move settings window → close → reopen → same position/size
   - Change a setting in settings window → verify main window reflects change immediately
   - Close main window → settings window closes too
   - Open settings when already open → focuses existing window
