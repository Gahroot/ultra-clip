import { Keyboard } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'

interface ShortcutEntry {
  keys: string[]
  description: string
}

const SHORTCUT_SECTIONS: { title: string; shortcuts: ShortcutEntry[] }[] = [
  {
    title: 'Clip Actions',
    shortcuts: [
      { keys: ['A'], description: 'Approve / un-approve selected clip' },
      { keys: ['R'], description: 'Reject / un-reject selected clip' },
      { keys: ['P'], description: 'Set selected clip to pending' },
      { keys: ['Delete'], description: 'Reject selected clip' },
      { keys: ['E', 'Enter'], description: 'Open edit/preview dialog' }
    ]
  },
  {
    title: 'Navigation',
    shortcuts: [
      { keys: ['\u2190', '\u2191'], description: 'Select previous clip' },
      { keys: ['\u2192', '\u2193'], description: 'Select next clip' }
    ]
  },
  {
    title: 'Per-Clip Editor',
    shortcuts: [
      { keys: ['Space'], description: 'Play / pause preview' },
      { keys: ['\u2190', '\u2192'], description: 'Seek backward / forward 1s' },
      { keys: ['1\u20139'], description: 'Apply style preset 1\u20139' },
      { keys: ['C'], description: 'Switch to Captions tab' },
      { keys: ['S'], description: 'Switch to Styles tab' },
      { keys: ['R'], description: 'Mark clip ready for render' },
      { keys: ['N'], description: 'Next clip (apply & open)' },
      { keys: ['P'], description: 'Previous clip (apply & open)' },
      { keys: ['Del'], description: 'Reset style to default' }
    ]
  },
  {
    title: 'Project',
    shortcuts: [
      { keys: ['Ctrl+S'], description: 'Save project' },
      { keys: ['Ctrl+O'], description: 'Open project' },
      { keys: ['Ctrl+,'], description: 'Open settings' },
      { keys: ['Ctrl+Enter'], description: 'Start processing / render' },
      { keys: ['Ctrl+Z'], description: 'Undo' },
      { keys: ['Ctrl+Shift+Z'], description: 'Redo' }
    ]
  },
  {
    title: 'General',
    shortcuts: [
      { keys: ['?'], description: 'Show this help dialog' },
      { keys: ['Escape'], description: 'Close any open dialog' }
    ]
  }
]

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded border border-border bg-muted text-[11px] font-mono font-medium text-muted-foreground shadow-sm">
      {children}
    </kbd>
  )
}

interface KeyboardShortcutsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function KeyboardShortcutsDialog({ open, onOpenChange }: KeyboardShortcutsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="w-5 h-5" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {SHORTCUT_SECTIONS.map((section) => (
            <div key={section.title}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                {section.title}
              </h3>
              <div className="space-y-1.5">
                {section.shortcuts.map((shortcut) => (
                  <div
                    key={shortcut.description}
                    className="flex items-center justify-between py-1"
                  >
                    <span className="text-sm text-foreground">{shortcut.description}</span>
                    <div className="flex items-center gap-1 shrink-0 ml-4">
                      {shortcut.keys.map((key, i) => (
                        <span key={key} className="flex items-center gap-1">
                          {i > 0 && <span className="text-[10px] text-muted-foreground/50">/</span>}
                          <Kbd>{key}</Kbd>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="text-[10px] text-muted-foreground/50 text-center pt-2 border-t border-border">
          Shortcuts are disabled when typing in text fields
        </p>
      </DialogContent>
    </Dialog>
  )
}
