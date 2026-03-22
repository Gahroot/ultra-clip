# 🎬 Ultra Clip

> **Turn any long-form video into viral short-form clips — automatically.**

Ultra Clip is a desktop app that takes your podcasts, interviews, YouTube videos, or any footage and uses AI to find the most shareable moments, cut them into perfect 9:16 verticals, burn in word-level captions, and export them ready for TikTok, Instagram Reels, and YouTube Shorts. Everything runs locally on your machine — no cloud uploads, no subscription, no limits.

---

## ✨ What It Does

Drop in a video (or paste a YouTube URL). Walk away. Come back to a folder of scroll-stopping clips, ready to post.

Here's the full picture of what's happening under the hood while you're getting coffee:

### 🧠 AI That Actually Understands Content

Ultra Clip doesn't just blindly cut at random intervals. It reads your video.

- **Viral scoring** — Google Gemini reads your full transcript and scores every segment by its potential to hook viewers, rank in feeds, and drive replays. You see a ranked list of the best moments, not a random dump.
- **Curiosity gap detection** — The AI identifies moments where a question is asked, a story begins, or a bold claim is made, then finds where it resolves. Clips are trimmed to *open* on the hook and *land* on the payoff — the exact structure that keeps people watching.
- **Story arc detection** — Got a series worth making? The AI groups related clips into narrative arcs and generates part numbers, series titles, and end-card overlays so your content feels intentional, not cobbled together.
- **Hook text generation** — Each clip gets a punchy, platform-optimised opening title pulled from the most compelling line in that segment.
- **Re-hook overlays** — Mid-clip pattern interrupts to re-engage viewers who might swipe away at the 3–5 second mark.

### ✂️ Smart Editing

- **Face-aware cropping** — MediaPipe face detection finds where people are in the frame before cropping to 9:16. Faces stay centred. Nobody gets decapitated.
- **Filler word removal** — Detects and surgically cuts "um", "uh", long silences, and repeated phrases. Your clips come out tighter without you touching a timeline.
- **Auto-zoom / Ken Burns** — Subtle zoompan movements add professional energy to static talking-head shots.
- **A/B/C clip variants** — Generate three packaging variations of the same moment — different hook, different trim, different vibe — so you can test what lands with your audience without extra work.
- **Loop optimiser** — Finds natural loop points in the transcript and applies seamless audio crossfades. Great for content that rewards replays.

### 📝 Captions That Look Good

Word-level timestamps from the ASR model feed directly into an ASS subtitle renderer. Captions animate word-by-word, stay inside platform safe zones, and match your chosen style. No manual sync required.

### 🎨 Brand Kit

Drop in your logo, an intro bumper, and an outro bumper once. Every clip you export gets them baked in automatically.

### 🎵 Sound Design

Attach background music or sound effects to your clips. Ultra Clip handles the mixing — ducking, timing, and levels — so your audio doesn't sound like an afterthought.

### 📐 Platform-Aware Layout

Ultra Clip knows where TikTok puts its UI, where Instagram Reels clips the bottom, and where YouTube Shorts adds the channel name. Text, logos, and captions are all placed inside the safe zone for each platform so nothing important ever gets covered.

Additional layout options include:
- **Blur-fill background** — for source footage that isn't natively 9:16, fills the bars with a blurred version of the frame instead of black bars
- **Split-screen** — four different split-screen compositions for reaction content, side-by-side clips, or multi-angle cuts

### 🌐 B-Roll Integration

Ultra Clip can pull relevant B-roll from Pexels automatically, matched to the keywords in each clip's transcript, and cut it in at the right moment.

### 📊 Export Manifest

Every batch export generates a JSON manifest alongside your clips listing viral score, timestamps, platform descriptions, hashtags, and file paths — so you can pipe it into any scheduling or analytics tool downstream.

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+
- An NVIDIA GPU is optional but speeds up transcription (CPU works fine, just slower)
- A free [Google Gemini API key](https://aistudio.google.com/app/apikey)

### Install

```bash
git clone https://github.com/Gahroot/ultra-clip.git
cd ultra-clip
npm install
```

### Set Up Python (for transcription & face detection)

```bash
npm run setup:python
```

This creates a Python virtual environment and installs the ASR model (`nvidia/parakeet-tdt-0.6b-v3`), MediaPipe, and yt-dlp. The first run will also download the ~1.2 GB Parakeet model from HuggingFace and cache it locally.

### Run

```bash
npm run dev
```

Add your Gemini API key in **Settings** on first launch and you're good to go.

---

## 🏗️ How It's Built

```
Electron (main process)
  ├── FFmpeg (fluent-ffmpeg)       — video cutting, cropping, captions, rendering
  ├── Python venv
  │     ├── Parakeet TDT v3        — NVIDIA's state-of-the-art ASR model (word timestamps)
  │     ├── MediaPipe              — face detection → smart 9:16 crop regions
  │     └── yt-dlp                 — YouTube / any-site video downloader
  └── Google Gemini                — transcript scoring, hook text, curiosity gaps, story arcs

Renderer (React 19 + Zustand + Tailwind)
  └── IPC bridge (contextBridge)   — all main ↔ renderer calls via window.api
```

Everything is local. Your videos never leave your machine. The only external call is the Gemini API for transcript analysis (text only — no video data is sent).

---

## 🖥️ Building for Production

```bash
# Windows
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux
```

> **Note:** Build the Python venv (`npm run setup:python`) before packaging so it gets bundled into the app.

---

## 🧪 Tests

```bash
npm test
```

---

## 📋 Full Feature List

| Feature | Description |
|---|---|
| YouTube download | Paste any URL and Ultra Clip downloads the source via yt-dlp |
| AI viral scoring | Gemini reads the full transcript and scores every segment |
| Curiosity gap detection | Finds hook-open / hook-resolve pairs for maximum retention |
| Clip boundary optimisation | Adjusts start/end times to nail the hook and payoff |
| Story arc detection | Groups clips into narrative series with part numbering |
| Hook title generation | Auto-writes the opening text overlay for each clip |
| Re-hook overlays | Mid-clip pattern interrupts at the 3–5s drop-off point |
| A/B/C variants | Three packaging variations per clip for audience testing |
| Word-level ASR | Parakeet TDT delivers precise word timestamps for captions |
| Filler word removal | Surgically cuts ums, uhs, silences, and repeated phrases |
| Face-aware 9:16 crop | MediaPipe keeps faces centred in every crop |
| Auto-zoom (Ken Burns) | Adds subtle zoompan motion to static shots |
| Loop optimiser | Finds loop points + applies seamless audio crossfades |
| ASS captions | Animated word-by-word subtitles with platform safe zones |
| Brand kit | Logo, intro bumper, and outro bumper baked into every export |
| Sound design | Background music and SFX mixing with auto-ducking |
| B-roll from Pexels | Auto-sourced and cut-in B-roll matched to transcript keywords |
| Blur-fill background | Fills non-9:16 bars with a blurred frame instead of black bars |
| Split-screen layouts | Four multi-clip composition types |
| Platform safe zones | TikTok, Instagram Reels, YouTube Shorts — overlays stay visible |
| Platform descriptions | AI-generated captions + hashtag sets per platform |
| Export manifest | JSON sidecar with scores, timestamps, descriptions, and paths |
| GPU-accelerated render | h264_nvenc → h264_qsv → libx264 software fallback chain |
| Project save / load | `.batchcontent` project files for resumable sessions |
| Batch rendering | All approved clips render in one go with per-clip error isolation |
| Offline support | Runs entirely on your machine — no cloud dependency |

---

## 🔑 Environment

Add your Gemini API key in the app's Settings panel. Optionally configure:
- Output directory for rendered clips
- Caption style (font, size, colour, position)
- Brand kit assets (logo, bumpers)
- Default platform (TikTok / Reels / Shorts)

---

## 📄 License

MIT — do whatever you want with it.

---

<div align="center">
  <strong>Built for creators who'd rather be creating.</strong>
  <br/>
  <sub>Stop manually scrubbing timelines. Let the AI find the gold.</sub>
</div>
