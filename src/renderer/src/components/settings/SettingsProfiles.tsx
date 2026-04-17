import { useState } from 'react'
import { BookmarkCheck, Save, Trash2, RotateCcw } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip'
import {
  useStore,
  extractProfileFromSettings,
} from '@/store'
import { SectionHeader } from './shared'

export function SettingsProfiles() {
  const {
    settings,
    resetSettings,
    settingsProfiles,
    activeProfileName,
    saveProfile,
    loadProfile,
    deleteProfile,
  } = useStore(
    useShallow((s) => ({
      settings: s.settings,
      resetSettings: s.resetSettings,
      settingsProfiles: s.settingsProfiles,
      activeProfileName: s.activeProfileName,
      saveProfile: s.saveProfile,
      loadProfile: s.loadProfile,
      deleteProfile: s.deleteProfile,
    }))
  )

  const [showResetAllDialog, setShowResetAllDialog] = useState(false)
  const [showSaveProfileDialog, setShowSaveProfileDialog] = useState(false)
  const [saveProfileName, setSaveProfileName] = useState('')
  const [showDeleteProfileDialog, setShowDeleteProfileDialog] = useState(false)

  const profileModified = (() => {
    if (!activeProfileName) return false
    const savedProfile = settingsProfiles[activeProfileName]
    if (!savedProfile) return false
    const current = extractProfileFromSettings(settings)
    return JSON.stringify(current) !== JSON.stringify(savedProfile)
  })()

  const profileNames = Object.keys(settingsProfiles)

  function handleResetAll() {
    resetSettings()
    setShowResetAllDialog(false)
  }

  return (
    <>
      <div className="rounded-lg border border-border bg-card/50 p-5 space-y-4">
        <SectionHeader>Settings Profiles</SectionHeader>
        <div className="flex items-center gap-2">
          <BookmarkCheck className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <Select
            value={activeProfileName ?? '__none__'}
            onValueChange={(v) => {
              if (v === '__none__') return
              loadProfile(v)
            }}
          >
            <SelectTrigger className="flex-1 h-8 text-xs">
              <SelectValue placeholder="No profile selected" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__" disabled>No profile</SelectItem>
              {profileNames.length > 0 && (
                <SelectGroup>
                  <SelectLabel>My Profiles</SelectLabel>
                  {profileNames.map((name) => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectGroup>
              )}
            </SelectContent>
          </Select>
          {profileModified && (
            <span className="text-[10px] text-amber-500 font-medium whitespace-nowrap">(modified)</span>
          )}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  title="Save current settings as profile"
                  onClick={() => {
                    setSaveProfileName(activeProfileName ?? '')
                    setShowSaveProfileDialog(true)
                  }}
                >
                  <Save className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom"><p>Save as Profile</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  title="Delete selected profile"
                  disabled={!activeProfileName}
                  onClick={() => setShowDeleteProfileDialog(true)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Delete Profile</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <div className="pb-2">
        <Button
          variant="ghost"
          className="w-full gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => setShowResetAllDialog(true)}
        >
          <RotateCcw className="w-4 h-4" />
          Reset All Settings to Defaults
        </Button>
      </div>

      <Dialog open={showResetAllDialog} onOpenChange={setShowResetAllDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Reset All Settings?</DialogTitle>
            <DialogDescription>
              This will reset all render settings to their factory defaults. Your API keys and
              output directory will not be affected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetAllDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleResetAll}>
              Reset to Defaults
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSaveProfileDialog} onOpenChange={setShowSaveProfileDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Save Settings Profile</DialogTitle>
            <DialogDescription>
              Save your current render settings as a reusable profile.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label htmlFor="profile-name" className="text-sm font-medium">Profile Name</Label>
            <Input
              id="profile-name"
              placeholder="e.g. My TikTok Style"
              value={saveProfileName}
              onChange={(e) => setSaveProfileName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && saveProfileName.trim()) {
                  saveProfile(saveProfileName.trim())
                  setShowSaveProfileDialog(false)
                }
              }}
              autoFocus
              className="mt-1.5"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveProfileDialog(false)}>
              Cancel
            </Button>
            <Button
              disabled={!saveProfileName.trim()}
              onClick={() => {
                saveProfile(saveProfileName.trim())
                setShowSaveProfileDialog(false)
              }}
            >
              Save Profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteProfileDialog} onOpenChange={setShowDeleteProfileDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Profile?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the profile &ldquo;{activeProfileName}&rdquo;?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteProfileDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (activeProfileName) {
                  deleteProfile(activeProfileName)
                }
                setShowDeleteProfileDialog(false)
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
