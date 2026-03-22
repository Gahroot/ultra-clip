# Background Music Library

This directory contains royalty-free background music tracks used by the BatchContent Sound Design system.
Place the actual `.mp3` files here. The system gracefully skips any missing files.

## Required Files

| Filename                    | Description                                       | Recommended Duration | Style / BPM         |
|-----------------------------|---------------------------------------------------|----------------------|---------------------|
| `ambient-tech.mp3`          | Subtle techy / corporate background loop          | 30 – 120 s          | Electronic, 100 BPM |
| `ambient-motivational.mp3`  | Uplifting, inspiring background loop              | 30 – 120 s          | Upbeat, 120 BPM     |
| `ambient-chill.mp3`         | Relaxed, lo-fi style background loop              | 30 – 120 s          | Chill, 85 BPM       |

## Licensing Requirements

All music files must be:
- **Royalty-free** with no attribution required, OR
- Licensed under Creative Commons CC0 (public domain), OR
- Purchased with a license that permits use in short-form video content (TikTok, Reels, YouTube Shorts)

### Recommended Free Sources

- [Pixabay Music](https://pixabay.com/music/) — royalty-free, no attribution needed
- [Free Music Archive](https://freemusicarchive.org) — filter by CC0 license
- [Incompetech (Kevin MacLeod)](https://incompetech.com) — CC BY 3.0 (attribution required)
- [Bensound](https://www.bensound.com) — free tier with attribution
- [Mixkit](https://mixkit.co/free-stock-music/) — completely free

## Format Requirements

- **Format**: MP3 (preferred) or WAV
- **Sample rate**: 44100 Hz or 48000 Hz
- **Channels**: Stereo preferred
- **Bit rate**: 192 kbps minimum for MP3
- **Duration**: Minimum 30 seconds (tracks will loop if the clip is longer)

## Notes

- Tracks are looped automatically to match clip duration (up to 100 loops = several hours)
- Background music volume defaults to 10% to avoid competing with the speaker's voice
- Volume is adjustable via the Settings panel (Music Volume slider)
- The system applies no automatic ducking by default — music stays at a constant low volume
- Files are bundled with the packaged app via `extraResources` in `package.json`
