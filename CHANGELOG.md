# Changelog

## v0.2.0 — 2026-03-22
### ✨ New Features
- What's New changelog dialog — auto-shows on first launch after each update
- Recent projects list on the empty-state home screen
- AI token usage indicator in the header
- Offline banner warns when network connection is lost
- Onboarding wizard walks new users through the full pipeline
- Keyboard shortcuts dialog (press `?` to open)
- Setup wizard guides Python / ASR environment installation
- Theme toggle — Light, Dark, and System modes
- Script Cue Splitter for manual segment editing

### ⚡ Improvements
- Undo / Redo support for clip edits (Ctrl+Z / Ctrl+Shift+Z)
- Auto Mode — hands-free approve + render above a score threshold
- Batch multi-select with bulk approve / reject / trim actions
- Drag-to-reorder clips in the grid
- Per-clip render setting overrides (captions, hook title, layout, etc.)
- B-Roll insertion powered by Pexels stock footage
- Filler word & silence removal in transcripts
- Render concurrency setting (1–4 parallel clips)
- Custom filename templates with token substitution
- Clip comparison side-by-side view

### 🐛 Bug Fixes
- Various stability improvements and error handling across the pipeline

## v0.1.0 — Initial Release
### ✨ New Features
- AI-powered clip scoring with Google Gemini
- YouTube download support via yt-dlp
- Parakeet TDT v3 ASR transcription with word-level timestamps
- Face-centered 9:16 cropping via MediaPipe
- Customizable captions (Hormozi Bold, TikTok Glow, Reels Clean, Classic Karaoke)
- Hook title, re-hook, and progress bar overlays
- Auto-zoom (Ken Burns) effect
- Brand Kit — logo, intro / outro bumpers
- Sound design — background music and SFX
- Batch render pipeline with GPU acceleration (NVENC / QSV → libx264 fallback)
- Project save / load (.batchcontent files)
- Story arc detection for multi-clip series
- Clip variant generator (A / B / C packaging)
- Loop optimizer for seamless social loops
- Split-screen and blur-background layout modes
