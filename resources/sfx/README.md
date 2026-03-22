# Sound Effects Library

This directory contains royalty-free sound effect files used by the BatchContent Sound Design system.
Place the actual `.mp3` files here. The system gracefully skips any missing files.

## Required Files

| Filename               | Description                                      | Recommended Duration | Usage                              |
|------------------------|--------------------------------------------------|----------------------|------------------------------------|
| `whoosh-soft.mp3`      | Gentle air whoosh / swoosh                       | 0.5 – 1.0 s         | Speech pauses, subtle transitions  |
| `whoosh-hard.mp3`      | Fast, punchy air whoosh                          | 0.3 – 0.7 s         | Hard cuts, dramatic transitions    |
| `impact-low.mp3`       | Deep bass hit / thud                             | 0.4 – 0.8 s         | Emphasis on key power words        |
| `impact-high.mp3`      | Bright stab / high hit                           | 0.3 – 0.6 s         | Lighter emphasis, alternating hits |
| `rise-tension.mp3`     | Short rising tone / build-up                     | 1.0 – 2.0 s         | Building anticipation moments      |
| `notification-pop.mp3` | Clean UI pop / notification                      | 0.2 – 0.4 s         | Caption pop-in, text appear        |

## Licensing Requirements

All audio files must be:
- **Royalty-free** with no attribution required, OR
- Licensed under Creative Commons CC0 (public domain), OR
- Purchased with a commercial license that permits use in video content

### Recommended Free Sources

- [Freesound.org](https://freesound.org) — search for CC0 licensed SFX
- [Mixkit](https://mixkit.co/free-sound-effects/) — free sound effects
- [Pixabay Sound Effects](https://pixabay.com/sound-effects/) — royalty-free
- [ZapSplat](https://www.zapsplat.com) — free with attribution or paid license

## Format Requirements

- **Format**: MP3 (preferred) or WAV
- **Sample rate**: 44100 Hz or 48000 Hz
- **Channels**: Stereo preferred, mono acceptable
- **Bit rate**: 128 kbps minimum (192 kbps recommended for MP3)

## Notes

- Files are cached in the packaged app via `extraResources` in `package.json`
- The sound design engine detects missing files at runtime and silently skips them
- Clip volume levels are controlled via the Settings panel (SFX Volume slider)
