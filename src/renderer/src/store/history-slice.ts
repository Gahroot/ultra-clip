import type { StateCreator } from 'zustand'
import type {
  AppState,
  ClipCandidate,
  StitchedClipCandidate,
} from './types'
import { MAX_UNDO } from '@shared/constants'

// ---------------------------------------------------------------------------
// Undo / Redo infrastructure
// ---------------------------------------------------------------------------

/** Subset of state tracked by undo/redo. */
export interface UndoableSnapshot {
  clips: Record<string, ClipCandidate[]>
  stitchedClips: Record<string, StitchedClipCandidate[]>
  minScore: number
}

export { MAX_UNDO }

export function _captureSnapshot(state: {
  clips: Record<string, ClipCandidate[]>
  stitchedClips: Record<string, StitchedClipCandidate[]>
  settings: { minScore: number }
}): UndoableSnapshot {
  return {
    clips: structuredClone(state.clips),
    stitchedClips: structuredClone(state.stitchedClips),
    minScore: state.settings.minScore
  }
}

// ---------------------------------------------------------------------------
// History Slice
// ---------------------------------------------------------------------------

export interface HistorySlice {
  _undoStack: UndoableSnapshot[]
  _redoStack: UndoableSnapshot[]
  canUndo: boolean
  canRedo: boolean
  undo: () => void
  redo: () => void
}

export const createHistorySlice: StateCreator<
  AppState,
  [['zustand/immer', never]],
  [],
  HistorySlice
> = (set, get) => ({
  _undoStack: [],
  _redoStack: [],
  canUndo: false,
  canRedo: false,

  undo: () => {
    const state = get()
    const stack = [...state._undoStack]
    const snapshot = stack.pop()
    if (!snapshot) return
    const redoStack = [...state._redoStack, _captureSnapshot(state)]
    set({
      _undoStack: stack,
      _redoStack: redoStack,
      clips: snapshot.clips,
      stitchedClips: snapshot.stitchedClips,
      settings: { ...state.settings, minScore: snapshot.minScore },
      canUndo: stack.length > 0,
      canRedo: true
    })
  },

  redo: () => {
    const state = get()
    const stack = [...state._redoStack]
    const snapshot = stack.pop()
    if (!snapshot) return
    const undoStack = [...state._undoStack, _captureSnapshot(state)]
    set({
      _undoStack: undoStack,
      _redoStack: stack,
      clips: snapshot.clips,
      stitchedClips: snapshot.stitchedClips,
      settings: { ...state.settings, minScore: snapshot.minScore },
      canUndo: true,
      canRedo: stack.length > 0
    })
  },
})

// ---------------------------------------------------------------------------
// Helper used by other slices to push undo state.
// Requires the zustand `set` function as the second argument so the stacks
// stay inside the store.
// ---------------------------------------------------------------------------

type SetFn = (partial: Partial<AppState> | ((state: AppState) => Partial<AppState>)) => void

export function _pushUndo(
  state: AppState,
  set: SetFn
): void {
  const snapshot = _captureSnapshot(state)
  const undoStack = [...state._undoStack, snapshot]
  if (undoStack.length > MAX_UNDO) undoStack.shift()
  set({
    _undoStack: undoStack,
    _redoStack: [],
    canUndo: true,
    canRedo: false,
  })
}
