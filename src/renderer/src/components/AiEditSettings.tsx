/**
 * AI Edit mode settings panel — shown in the ClipGrid sidebar when editMode === 'ai-edit'.
 *
 * Exposes style preset selection and accent color for the AI edit pipeline.
 */

import { useStore } from '../store'

export function AiEditSettings() {
  const selectedEditStyleId = useStore((s) => s.selectedEditStyleId)
  const setSelectedEditStyleId = useStore((s) => s.setSelectedEditStyleId)
  const aiEditAccentColor = useStore((s) => s.aiEditAccentColor)
  const setAiEditAccentColor = useStore((s) => s.setAiEditAccentColor)

  return (
    <div className="flex flex-col gap-3 p-4">
      <label className="text-sm font-medium">Edit Style</label>
      <input
        type="text"
        className="rounded border bg-background px-2 py-1 text-sm"
        value={selectedEditStyleId ?? ''}
        onChange={(e) => setSelectedEditStyleId(e.target.value || null)}
        placeholder="Style preset ID"
      />

      <label className="text-sm font-medium">Accent Color</label>
      <input
        type="color"
        className="h-8 w-full cursor-pointer rounded border"
        value={aiEditAccentColor}
        onChange={(e) => setAiEditAccentColor(e.target.value)}
      />
    </div>
  )
}
