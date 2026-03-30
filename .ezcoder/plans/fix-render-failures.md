# Fix Style Preset Render Failures

## Problem
When a style preset is active, ALL clips fail with:
```
ffmpeg exited with code 4294967274: Conversion failed!
```
Exit code 4294967274 = -54 (signed 32-bit). This happens for every clip in the batch.

## Root Cause Analysis

### Issue 1: False GPU error detection (masking real errors)
In `src/main/ffmpeg.ts:244`, `isGpuSessionError()` checks:
```typescript
errorMessage.includes('4294967274')
```
The comment claims this is "FFmpeg exit code -26" but `0xFFFFFFE6 = 4294967270`, not `4294967274`. The value `4294967274 = 0xFFFFFFCA = -54 signed`. This is NOT a GPU-specific error — it's a generic FFmpeg failure code on Windows. This causes **all errors with this exit code to be falsely classified as GPU errors**, triggering a software fallback that also fails (because the real issue isn't GPU-related). The actual error details are swallowed.

### Issue 2: No FFmpeg stderr in error messages
fluent-ffmpeg's `err.message` only contains `"ffmpeg exited with code N: <last stderr line>"`. The last stderr line is always the generic `"Conversion failed!"`. The ACTUAL error (e.g., "No such filter: 'xyz'" or "Invalid option: ...") is in earlier stderr lines, which are not captured or logged.

### Issue 3: Missing filter_complex diagnostic logging
When the sound design path fails, there's no log of what filter_complex string was actually sent to FFmpeg. Without this, debugging is impossible.

## Fix Plan

### Step 1: Fix `isGpuSessionError` in `src/main/ffmpeg.ts`

**Line 243-244**: Remove the `4294967274` check. This exit code is not GPU-specific.

```typescript
// REMOVE these lines:
// FFmpeg exit code -26 (0xFFFFFFE6 unsigned = 4294967274) is an NVENC error
errorMessage.includes('4294967274') ||
errorMessage.includes('exit code -26') ||
```

The remaining checks (OpenEncodeSessionEx, nvcuda.dll, CUDA, nvenc, hwupload, scale_cuda, etc.) are sufficient to detect actual GPU errors from the error MESSAGE content.

### Step 2: Add FFmpeg stderr capture to base-render.ts

**File: `src/main/render/base-render.ts`**

In the `runWithSoundEncoder` function (line ~191), add stderr capture:

```typescript
function runWithSoundEncoder(enc: string, flags: string[], useHwAccel = true): FfmpegCommand {
  const cmd = ffmpeg(toFFmpegPath(job.sourceVideoPath))
  let stderrOutput = ''  // ADD: capture stderr
  
  // ... existing code ...
  
  cmd
    // ... existing options ...
    .on('stderr', (line: string) => { stderrOutput += line + '\n' })  // ADD
    .on('error', (err: Error) => {
      // ADD: log full stderr on failure
      console.error(`[Render] FFmpeg stderr for clip ${job.clipId}:\n${stderrOutput}`)
      // ... existing error handling ...
    })
```

Do the same for `runWithLogoEncoder` and `runWithEncoder` (simple path).

### Step 3: Log filter_complex string before FFmpeg invocation

**File: `src/main/render/base-render.ts`**

After building the filter_complex at line ~214-219, log it:

```typescript
const filterComplex = buildSoundFilterComplex(
  videoFilter, placements, clipDuration, logoOverlay
)
console.log(`[Render] Sound filter_complex for clip ${job.clipId}: ${filterComplex}`)
```

### Step 4: Add filter_complex to error reporting

**File: `src/main/render/base-render.ts`**

When the error is rejected, include the filter_complex and stderr in the error message so it reaches the user:

```typescript
.on('error', (err: Error) => {
  if (!soundFallbackAttempted && isGpuSessionError(err.message)) {
    // ... existing fallback ...
  } else {
    // Enhanced error with stderr context
    const enhanced = new Error(
      `${err.message}\n[stderr tail] ${stderrOutput.split('\n').slice(-10).join('\n')}`
    )
    reject(enhanced)
  }
})
```

## Files to Modify

1. **`src/main/ffmpeg.ts`** — Remove lines 243-245 (false GPU error detection for exit code 4294967274/-26)
2. **`src/main/render/base-render.ts`** — Add stderr capture + filter_complex logging to all 3 render paths (sound, logo, simple)

## Verification

1. `npx electron-vite build` — must compile clean
2. Deploy to Windows and attempt render with the style preset
3. If the render still fails, the error log will now contain:
   - The full filter_complex string
   - The FFmpeg stderr output showing exactly which filter or option is invalid
   - This will allow us to fix the actual filter issue in a follow-up

## Risk Assessment

- **Low risk**: Removing the `4294967274` check means this specific exit code won't trigger GPU fallback. But the other checks (CUDA, nvenc, hwupload keywords in the error message) will still catch real GPU errors. If a GPU error does produce exit code -54 without any GPU-related text in stderr, we'd miss it — but that's extremely unlikely and the fallback mechanism has other checks.
- **Medium benefit**: We'll get actual diagnostic info instead of masked errors, enabling us to fix the root cause filter issue.
