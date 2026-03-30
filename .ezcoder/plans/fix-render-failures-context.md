# Context Notes for Implementation

## Key File Locations and Line Numbers

### src/main/ffmpeg.ts
- Line 227-249: `isGpuSessionError()` function
- Line 243-244: The buggy check to REMOVE:
  ```typescript
  // FFmpeg exit code -26 (0xFFFFFFE6 unsigned = 4294967274) is an NVENC error
  errorMessage.includes('4294967274') ||
  errorMessage.includes('exit code -26') ||
  ```
- Line 247: Also remove the generic regex that matches huge exit codes:
  ```typescript
  /exited with code [34]\d{9}/.test(errorMessage)
  ```
  This is too broad and catches non-GPU errors

### src/main/render/base-render.ts
- Line 176: `renderMain()` starts
- Line 181-269: SOUND DESIGN PATH (`if (hasSoundDesign)`)
  - Line 191: `runWithSoundEncoder()` function definition
  - Line 214-219: `buildSoundFilterComplex()` call — LOG the result here
  - Line 236: `on('start')` handler — already logs command
  - Line 246-261: `on('error')` handler — ADD stderr capture + enhanced error
  - Line 249: `isGpuSessionError` check — will be fixed by Step 1
  - Line 253: `stripCudaScaleFilter` on fallback

- Line 271-335: LOGO-ONLY PATH (`if (hasLogo)`)
  - Line 275: `runWithLogoEncoder()` function definition
  - Line 316: `on('error')` handler

- Line 337-392: SIMPLE PATH (no sound, no logo)
  - Line 340: `runWithEncoder()` function definition
  - Line 372: `on('error')` handler

ALL THREE PATHS need stderr capture added.

### src/main/render/overlay-runner.ts
- Line 40-92: `applyFilterPass()` — also has `isGpuSessionError` check at line 75
- Line 102-153: `applyFilterComplexPass()` — also has `isGpuSessionError` check at line 136
- These should also get stderr capture for debugging

## fluent-ffmpeg stderr event
fluent-ffmpeg emits a `'stderr'` event for each stderr line. Capture with:
```typescript
let stderrOutput = ''
cmd.on('stderr', (line: string) => { stderrOutput += line + '\n' })
```

## What the full isGpuSessionError function looks like (lines 227-249):
```typescript
export function isGpuSessionError(errorMessage: string): boolean {
  const msg = errorMessage.toLowerCase()
  return (
    errorMessage.includes('OpenEncodeSessionEx failed') ||
    errorMessage.includes('No capable devices found') ||
    errorMessage.includes('Cannot load nvcuda.dll') ||
    errorMessage.includes('out of memory') ||
    errorMessage.includes('hwupload_cuda failed') ||
    errorMessage.includes('CUDA') ||
    msg.includes('cuda') ||
    msg.includes('nvenc') ||
    msg.includes('h264_nvenc') ||
    msg.includes('h264_qsv') ||
    msg.includes('hwupload') ||
    msg.includes('hwdownload') ||
    msg.includes('scale_cuda') ||
    // FFmpeg exit code -26 (0xFFFFFFE6 unsigned = 4294967274) is an NVENC error
    errorMessage.includes('4294967274') ||
    errorMessage.includes('exit code -26') ||
    // Generic GPU session exhaustion codes
    /exited with code [34]\d{9}/.test(errorMessage)
  )
}
```

After fix, remove lines with 4294967274, exit code -26, and the generic regex.
Keep all the keyword-based checks (OpenEncodeSessionEx, CUDA, nvenc, etc.)
