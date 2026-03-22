# Gameplay Clips for Split-Screen Layouts

Place your own gameplay video clips in this directory. They will be used as the
secondary (bottom) video in the **top-bottom** split-screen layout — the
"Subway Surfers / Minecraft parkour" style that's proven to increase watch time.

## Requirements

- **Format:** MP4 (H.264) or MOV preferred
- **Resolution:** 1080p or higher recommended (will be auto-cropped/scaled)
- **Duration:** At least 60 seconds (longer is better — clips will be trimmed to match)
- **Content:** Gameplay that's visually engaging but not distracting:
  - Subway Surfers, Temple Run, or similar endless runners
  - Minecraft parkour or building timelapses
  - Satisfying slicing/cutting games (Fruit Ninja, etc.)
  - Simple driving or racing games
  - Any loopable, visually interesting footage

## How It Works

When you select the **top-bottom** layout in BatchContent and don't provide a
secondary video, the app uses an animated gradient placeholder. To get the full
"dual-stimulus" effect, select one of your gameplay clips as the secondary source.

The video will be automatically:
1. Cropped to fill the bottom panel (no black bars)
2. Scaled to match the panel dimensions
3. Trimmed to the clip duration

## Tips

- **No audio needed** — the gameplay audio is muted; only the main video's audio plays
- **Loopable content works best** — the clip loops visually if shorter than the main content
- **Higher quality = better result** — low-bitrate gameplay looks blurry after re-encoding
- **Keep files under 500 MB** — very large files slow down the render pipeline
