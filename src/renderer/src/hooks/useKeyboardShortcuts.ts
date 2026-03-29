import { useEffect } from 'react'
import { useStore } from '../store'

/**
 * Returns true if the active element is a text input, textarea, or contenteditable.
 * Keyboard shortcuts should not fire when the user is typing.
 */
function isTyping(): boolean {
  const el = document.activeElement
  if (!el) return false
  const tag = el.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA') return true
  if ((el as HTMLElement).isContentEditable) return true
  return false
}

/**
 * Returns true if a modal dialog is currently open (editor, settings, etc.).
 * Global shortcuts should defer to the dialog's own shortcut handler.
 */
function isDialogOpen(): boolean {
  return document.querySelectorAll('[role="dialog"][data-state="open"]').length > 0
}

export interface KeyboardShortcutCallbacks {
  onOpenSettings: () => void
  onSave: () => void
  onLoad: () => void
  onOpenPreview: (clipIndex: number) => void
  onShowHelp: () => void
}

export function useKeyboardShortcuts(callbacks: KeyboardShortcutCallbacks) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey

      // --- Modifier shortcuts (work even when typing) ---

      // Ctrl/Cmd+S: save project
      if (mod && e.key === 's' && !e.shiftKey) {
        e.preventDefault()
        callbacks.onSave()
        return
      }

      // Ctrl/Cmd+O: load project
      if (mod && e.key === 'o') {
        e.preventDefault()
        callbacks.onLoad()
        return
      }

      // Ctrl/Cmd+,: open settings
      if (mod && e.key === ',') {
        e.preventDefault()
        callbacks.onOpenSettings()
        return
      }

      // Ctrl/Cmd+Enter: start processing or render
      if (mod && e.key === 'Enter') {
        e.preventDefault()
        // Handled externally — just dispatch a custom event for the pipeline/render
        window.dispatchEvent(new CustomEvent('shortcut:start'))
        return
      }

      // --- Non-modifier shortcuts: skip if user is typing or dialog is open ---
      if (isTyping()) return
      if (isDialogOpen()) return

      const state = useStore.getState()
      const { activeSourceId, clips, selectedClipIndex } = state
      if (!activeSourceId) return

      const activeClips = clips[activeSourceId] ?? []
      const sortedClips = [...activeClips].sort((a, b) => b.score - a.score)
      const clipCount = sortedClips.length
      if (clipCount === 0 && e.key !== '?') return

      const selectedClip = sortedClips[selectedClipIndex]

      switch (e.key) {
        // Navigation
        case 'ArrowLeft':
        case 'ArrowUp': {
          e.preventDefault()
          const next = Math.max(0, selectedClipIndex - 1)
          state.setSelectedClipIndex(next)
          scrollToClip(next)
          break
        }
        case 'ArrowRight':
        case 'ArrowDown': {
          e.preventDefault()
          const next = Math.min(clipCount - 1, selectedClipIndex + 1)
          state.setSelectedClipIndex(next)
          scrollToClip(next)
          break
        }

        // Approve
        case 'a': {
          if (!selectedClip) break
          state.updateClipStatus(
            activeSourceId,
            selectedClip.id,
            selectedClip.status === 'approved' ? 'pending' : 'approved'
          )
          break
        }

        // Reject
        case 'r': {
          if (!selectedClip) break
          state.updateClipStatus(
            activeSourceId,
            selectedClip.id,
            selectedClip.status === 'rejected' ? 'pending' : 'rejected'
          )
          break
        }

        // Toggle pending
        case 'p': {
          if (!selectedClip) break
          state.updateClipStatus(activeSourceId, selectedClip.id, 'pending')
          break
        }

        // Edit / preview
        case 'e':
        case 'Enter': {
          if (!selectedClip) break
          e.preventDefault()
          callbacks.onOpenPreview(selectedClipIndex)
          break
        }

        // Delete / Backspace → reject
        case 'Delete':
        case 'Backspace': {
          if (!selectedClip) break
          e.preventDefault()
          state.updateClipStatus(activeSourceId, selectedClip.id, 'rejected')
          break
        }

        // Help dialog
        case '?': {
          e.preventDefault()
          callbacks.onShowHelp()
          break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [callbacks])
}

function scrollToClip(index: number) {
  // Find the clip card DOM element by data attribute and scroll into view
  const el = document.querySelector(`[data-clip-index="${index}"]`)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }
}
