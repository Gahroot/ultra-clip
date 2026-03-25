import { Sparkles } from 'lucide-react'
import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'

// ---------------------------------------------------------------------------
// Changelog data — update this constant on every release
// ---------------------------------------------------------------------------

export const APP_VERSION = '0.2.0'

interface ChangelogItem {
  text: string
}

type ChangelogCategory = 'new' | 'improvement' | 'fix'

interface ChangelogSection {
  category: ChangelogCategory
  title: string
  emoji: string
  items: ChangelogItem[]
}

interface ChangelogRelease {
  version: string
  date: string
  sections: ChangelogSection[]
}

export const CHANGELOG: ChangelogRelease[] = [
  {
    version: '0.2.0',
    date: '2026-03-22',
    sections: [
      {
        category: 'new',
        title: 'New Features',
        emoji: '✨',
        items: [
          { text: "What's New changelog dialog — auto-shows on first launch after each update" },
          { text: 'Recent projects list on the empty-state home screen' },
          { text: 'AI token usage indicator in the header' },
          { text: 'Offline banner warns when network connection is lost' },
          { text: 'Onboarding wizard walks new users through the full pipeline' },
          { text: 'Keyboard shortcuts dialog (press ? to open)' },
          { text: 'Setup wizard guides Python / ASR environment installation' },
          { text: 'Theme toggle — Light, Dark, and System modes' },
          { text: 'Script Cue Splitter for manual segment editing' }
        ]
      },
      {
        category: 'improvement',
        title: 'Improvements',
        emoji: '⚡',
        items: [
          { text: 'Undo / Redo support for clip edits (Ctrl+Z / Ctrl+Shift+Z)' },
          { text: 'Auto Mode — hands-free approve + render above a score threshold' },
          { text: 'Batch multi-select with bulk approve / reject / trim actions' },
          { text: 'Drag-to-reorder clips in the grid' },
          { text: 'Per-clip render setting overrides (captions, hook title, layout, etc.)' },
          { text: 'B-Roll insertion powered by Pexels stock footage' },
          { text: 'Filler word & silence removal in transcripts' },
          { text: 'Render concurrency setting (1–4 parallel clips)' },
          { text: 'Custom filename templates with token substitution' },
          { text: 'Clip comparison side-by-side view' }
        ]
      },
      {
        category: 'fix',
        title: 'Bug Fixes',
        emoji: '🐛',
        items: [
          { text: 'Various stability improvements and error handling across the pipeline' }
        ]
      }
    ]
  },
  {
    version: '0.1.0',
    date: 'Initial Release',
    sections: [
      {
        category: 'new',
        title: 'New Features',
        emoji: '✨',
        items: [
          { text: 'AI-powered clip scoring with Google Gemini' },
          { text: 'YouTube download support via yt-dlp' },
          { text: 'Parakeet TDT v3 ASR transcription with word-level timestamps' },
          { text: 'Face-centered 9:16 cropping via MediaPipe' },
          { text: 'Customizable captions (Hormozi Bold, TikTok Glow, Reels Clean, Classic Karaoke)' },
          { text: 'Hook title, re-hook, and progress bar overlays' },
          { text: 'Auto-zoom (Ken Burns) effect' },
          { text: 'Brand Kit — logo, intro / outro bumpers' },
          { text: 'Sound design — background music and SFX' },
          { text: 'Batch render pipeline with GPU acceleration (NVENC / QSV → libx264 fallback)' },
          { text: 'Project save / load (.batchcontent files)' },
          { text: 'Story arc detection for multi-clip series' },
          { text: 'Clip variant generator (A / B / C packaging)' },
          { text: 'Loop optimizer for seamless social loops' },
          { text: 'Split-screen and blur-background layout modes' }
        ]
      }
    ]
  }
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const CATEGORY_COLORS: Record<ChangelogCategory, string> = {
  new: 'text-emerald-500 dark:text-emerald-400',
  improvement: 'text-amber-500 dark:text-amber-400',
  fix: 'text-red-500 dark:text-red-400'
}

interface WhatsNewProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function WhatsNew({ open, onOpenChange }: WhatsNewProps) {
  const latestRelease = CHANGELOG[0]
  const [showAll, setShowAll] = useState(false)

  const releases = showAll ? CHANGELOG : [latestRelease]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md flex flex-col gap-0 p-0 overflow-hidden">
        {/* Animated header background */}
        <motion.div
          className="relative overflow-hidden"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          {/* Gradient accent */}
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-transparent to-transparent pointer-events-none" />
          <DialogHeader className="px-6 pt-6 pb-4 relative">
            <DialogTitle className="flex items-center gap-2.5 text-base">
              <motion.span
                initial={{ rotate: -20, scale: 0.7 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ duration: 0.4, ease: 'backOut', delay: 0.1 }}
                className="inline-flex"
              >
                <Sparkles className="w-5 h-5 text-violet-500" />
              </motion.span>
              What&apos;s New in v{latestRelease.version}
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">{latestRelease.date}</p>
          </DialogHeader>
        </motion.div>

        {/* Changelog body */}
        <ScrollArea className="flex-1 max-h-[60vh]">
          <div className="px-6 pb-4 space-y-5">
            {releases.map((release, releaseIndex) => (
              <motion.div
                key={release.version}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: releaseIndex * 0.05 }}
              >
                {releaseIndex > 0 && (
                  <div className="mb-4 pt-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      v{release.version} — {release.date}
                    </p>
                    <div className="mt-1 h-px bg-border" />
                  </div>
                )}
                {release.sections.map((section) => (
                  <div key={section.category} className="space-y-1.5 mb-4">
                    <p className={`text-xs font-semibold uppercase tracking-wider ${CATEGORY_COLORS[section.category]}`}>
                      {section.emoji} {section.title}
                    </p>
                    <ul className="space-y-1">
                      {section.items.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                          <span className="mt-1.5 w-1 h-1 rounded-full bg-muted-foreground/50 shrink-0" />
                          {item.text}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </motion.div>
            ))}

            {!showAll && CHANGELOG.length > 1 && (
              <button
                onClick={() => setShowAll(true)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Show full history ({CHANGELOG.length - 1} earlier {CHANGELOG.length === 2 ? 'release' : 'releases'}) →
              </button>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
          <Button
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-8 px-4 text-xs"
          >
            Got it
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
