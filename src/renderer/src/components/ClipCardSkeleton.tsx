import { motion } from 'framer-motion'
import { Skeleton } from '@/components/ui/skeleton'

interface ClipCardSkeletonProps {
  /** 0-based index used to stagger the pulse animation */
  index?: number
}

export function ClipCardSkeleton({ index = 0 }: ClipCardSkeletonProps) {
  // Stagger each card by 80 ms so they don't all pulse in lock-step
  const delay = index * 0.08

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2, delay }}
      className="relative flex flex-col rounded-lg border border-border bg-card overflow-hidden"
      style={{ animationDelay: `${delay}s` }}
    >
      {/* Score badge placeholder — top-left circle */}
      <div className="absolute top-2 left-2 z-10">
        <Skeleton className="w-10 h-10 rounded-full" />
      </div>

      {/* Thumbnail placeholder — aspect-video */}
      <Skeleton className="w-full aspect-video rounded-none" />

      {/* Inline trim row */}
      <div className="flex items-center justify-between px-3 pt-2 pb-0">
        <Skeleton className="h-4 w-14" />
        <div className="flex-1 mx-2 h-px bg-border/50" />
        <Skeleton className="h-4 w-14" />
      </div>

      {/* Content area */}
      <div className="flex flex-col flex-1 p-3 gap-3">
        {/* Hook text line + duration badge */}
        <div className="flex items-start gap-2">
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-4/5" />
            <Skeleton className="h-3.5 w-3/5" />
          </div>
          <Skeleton className="h-5 w-14 rounded-full shrink-0" />
        </div>

        {/* Transcript lines */}
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/5" />
        </div>
      </div>

      {/* Actions row */}
      <div className="flex gap-2 px-3 pb-3 pt-1 border-t border-border/50">
        <Skeleton className="h-7 flex-1" />
        <Skeleton className="h-7 flex-1" />
        <Skeleton className="h-7 w-7 rounded-md" />
      </div>
    </motion.div>
  )
}
