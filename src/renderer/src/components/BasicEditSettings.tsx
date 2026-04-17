/**
 * Basic edit mode settings panel — shown in the ClipGrid sidebar when editMode === 'basic'.
 *
 * Placeholder: basic mode uses the default render settings (caption style, overlays)
 * configured in SettingsPanel. No additional per-mode controls are needed yet.
 */

export function BasicEditSettings() {
  return (
    <div className="p-4 text-sm text-muted-foreground">
      <p>Using standard render settings.</p>
    </div>
  )
}
