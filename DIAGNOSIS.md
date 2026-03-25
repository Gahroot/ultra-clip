# Render Batch Failure Analysis
**Date:** 2026-03-24
**Log:** batchcontent-debug-2026-03-24_13-04-05.log

---

## Executive Summary

**All 16 clips failed identically** with exit code `4294967274` (unsigned representation of Windows error -22, `ERROR_INVALID_ARGUMENT`). The root cause is **unquoted output paths containing spaces** in the ffmpeg command line.

---

## Failure Pattern

| Metric | Value |
|--------|-------|
| Total clips rendered | 16 (11 individual + 5 stitched) |
| Total failures | 16 (100%) |
| Exit code | 4294967274 (Windows ERROR_INVALID_ARGUMENT) |
| Error message | "Error opening output file... Error opening output files: Invalid argument" |
| Time to first failure | ~97 seconds into session (13:03:57) |
| Batch duration | ~3 seconds (all clips attempted in rapid succession) |

---

## The Core Bug

**Output path construction is unquoted when passed to ffmpeg:**

### What the log shows (normalized output paths):
```
outputPath                 = C:\Users\Groot\Videos\Finished Videos\batch campaign 1\CLAUDE CODE SKILLS\CLAUDE_CODE_SKILLS_clip01_95.mp4
toFFmpegPath(outputPath)  = C:/Users/Groot/Videos/Finished Videos/batch campaign 1/CLAUDE CODE SKILLS/CLAUDE_CODE_SKILLS_clip01_95.mp4
```

### The problem:
The path contains **3 spaces**:
- `Finished Videos` (space)
- `batch campaign 1` (space)
- `CLAUDE CODE SKILLS` (space)

When this unquoted path is passed to ffmpeg as the output argument, the shell/CLI parser sees:
```
... C:/Users/Groot/Videos/Finished Videos/batch campaign 1/CLAUDE CODE SKILLS/CLAUDE_CODE_SKILLS_clip01_95.mp4
                           ↑              ↑                ↑
                    ffmpeg treats as 3 separate arguments
```

ffmpeg cannot parse `Videos` as an output file and rejects the command with `ERROR_INVALID_ARGUMENT`.

---

## FFmpeg Command Evidence

**Example from log (clip01):**
```
ffmpeg -hwaccel auto -ss 113 -i C:/Users/Groot/Videos/Finished Videos/batch campaign 1/CLAUDE CODE SKILLS/CLAUDE CODE SKILLS.mp4 -y -filter:v crop=606:1080:668:0,scale=1080:1920,drawtext=fontfile='C\\:/Windows/Fonts/arialbd.ttf':fontsize=72:text='13%% Chance of CRITICAL Flaw'... [truncated]
```

**Key observations:**
1. **Input path is ALSO unquoted** (`C:/Users/Groot/Videos/Finished Videos/...`) — but happens to work because it's the `-i` (input) argument, which ffmpeg is more lenient with
2. **Font path uses escape sequences** (`fontfile='C\\:/Windows/Fonts/arialbd.ttf'`) — this is correct and working
3. **The filter complex itself is built correctly** (drawtext, crop, scale all syntax-valid)
4. **Output argument is the last item and is unquoted** — this is where the shell splits on spaces

---

## Why All 16 Failed Identically

The ffmpeg command building logic does not quote:
1. The **output file path** in all 16 clips (11 individual + 5 stitched)
2. The **input file path** (but this doesn't cause visible error because ffmpeg reads `-i` flag more gracefully)

Since the output directory structure is identical across all clips (`C:/Users/Groot/Videos/Finished Videos/batch campaign 1/CLAUDE CODE SKILLS/`), every single clip fails with the same error message.

---

## Exit Code Analysis

**Exit code: 4294967274** (Windows unsigned 32-bit)
- Binary: `0xFFFFFFEC`
- Signed interpretation: `-22`
- Windows HRESULT: `ERROR_INVALID_ARGUMENT`

This is **not a GPU/encoder issue** (which would show `EAGAIN` or `ENODEV`). This is a **command-line parsing failure** at the OS/shell level.

---

## Font Path Escaping (Working Correctly)

The fontfile path demonstrates proper escaping:
```
fontfile='C\\:/Windows/Fonts/arialbd.ttf'
```

This is **correctly escaped** and uses single quotes within the filter string. This path has no spaces, so it's not affected by the bug. The font resolution log confirms success:
```
[2026-03-24 13:03:55.490] [INFO ] [Overlays] [Overlays] Font resolved: C:\Windows\Fonts\arialbd.ttf
```

---

## Source File Path Issue

The **input video source path is also unquoted**:
```
-i C:/Users/Groot/Videos/Finished Videos/batch campaign 1/CLAUDE CODE SKILLS/CLAUDE CODE SKILLS.mp4
```

This path has **4 spaces** but doesn't cause an explicit error in the log because:
- ffmpeg's input parser is more forgiving (it attempts path resolution even with malformed arguments)
- The command fails at **output file open** (later in execution), which terminates the process before input ambiguity becomes fatal

However, this is also a latent bug that could cause failures if the input file is accessed differently.

---

## Timestamp & Concurrency

- All 16 clips attempt render within **seconds** (13:03:56 → 13:03:59)
- Concurrency setting: **1** (sequential render)
- Encoder: **h264_nvenc** (NVIDIA GPU, active)
- Quality: **normal preset, crf=23, veryfast ffmpeg preset**

The rapid succession of failures rules out transient issues; this is a **systematic code path problem**.

---

## Summary for Code Investigation

**File to inspect:** `src/main/render-pipeline.ts` (or related FFmpeg command builder)

**What to look for:**
1. Where the **output file path** is constructed and passed to ffmpeg
2. Whether the path is quoted when building the command string
3. Whether the **input file path** is quoted (secondary issue)
4. The function that converts Windows paths to forward-slash format (the `toFFmpegPath()` function shown in logs)

**Expected fix:**
- Output path must be quoted: `"C:/Users/Groot/Videos/..."` or with escaped spaces
- Input path should also be quoted for robustness
- Test with paths containing multiple spaces to verify fix
