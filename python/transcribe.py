#!/usr/bin/env python3
"""
transcribe.py — Parakeet TDT v3 (NeMo ASR) transcription script.

Usage:
    python transcribe.py --input <audio_path> --output <json_path> [--model <model_name>]

Output (stdout, one JSON object per line):
    {"type": "progress", "stage": "loading-model", "message": "Loading Parakeet TDT v3..."}
    {"type": "progress", "stage": "transcribing", "message": "Transcribing audio..."}
    {"type": "done", "text": "...", "words": [...], "segments": [...]}

On error:
    {"type": "error", "message": "details"}
"""

import argparse
import json
import sys
import os
import tempfile


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def emit(obj: dict) -> None:
    """Emit a JSON line to stdout (flushed immediately for streaming)."""
    print(json.dumps(obj), flush=True)


def emit_progress(stage: str, message: str) -> None:
    emit({"type": "progress", "stage": stage, "message": message})


def emit_error(message: str) -> None:
    emit({"type": "error", "message": message})


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Transcribe audio with Parakeet TDT v3")
    parser.add_argument("--input", required=True, help="Path to input audio file (.wav or .flac)")
    parser.add_argument(
        "--model",
        default="nvidia/parakeet-tdt-0.6b-v3",
        help="NeMo model name (default: nvidia/parakeet-tdt-0.6b-v3)",
    )
    parser.add_argument("--output", required=True, help="Path to write output JSON")
    return parser.parse_args()


def write_output(path: str, data: dict) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


# ---------------------------------------------------------------------------
# Audio duration helper (uses stdlib wave for WAV files)
# ---------------------------------------------------------------------------

def get_audio_duration_seconds(audio_path: str) -> float:
    """Return duration in seconds. Works for WAV via stdlib; fallback returns 0."""
    try:
        import wave
        with wave.open(audio_path, "rb") as wf:
            frames = wf.getnframes()
            rate = wf.getframerate()
            return frames / float(rate)
    except Exception:
        return 0.0


# ---------------------------------------------------------------------------
# Chunked transcription for audio > 24 minutes
# ---------------------------------------------------------------------------

MAX_FULL_ATTENTION_SECONDS = 24 * 60  # 1440 s
CHUNK_SECONDS = 20 * 60              # 20 min per chunk
OVERLAP_SECONDS = 10                 # 10 s overlap between chunks


def _chunk_audio_ffmpeg(audio_path: str, start: float, duration: float, out_path: str) -> bool:
    """Extract a slice of audio using ffmpeg."""
    import subprocess
    cmd = [
        "ffmpeg", "-y",
        "-ss", str(start),
        "-t", str(duration),
        "-i", audio_path,
        "-ar", "16000",
        "-ac", "1",
        out_path,
    ]
    result = subprocess.run(cmd, capture_output=True)
    return result.returncode == 0


def transcribe_chunked(model, audio_path: str, duration_sec: float) -> dict:
    """Split audio into overlapping chunks, transcribe each, merge results."""
    emit_progress("transcribing", f"Audio is {duration_sec/60:.1f} min — using chunked transcription")

    chunks = []
    start = 0.0
    while start < duration_sec:
        end = min(start + CHUNK_SECONDS, duration_sec)
        chunks.append((start, end - start))
        if end >= duration_sec:
            break
        start = end - OVERLAP_SECONDS  # back up by overlap

    all_words: list = []
    all_segments: list = []
    full_text_parts: list = []

    tmp_dir = tempfile.mkdtemp()

    for i, (chunk_start, chunk_dur) in enumerate(chunks):
        emit_progress(
            "transcribing",
            f"Transcribing chunk {i + 1}/{len(chunks)} "
            f"({chunk_start/60:.1f}–{(chunk_start + chunk_dur)/60:.1f} min)..."
        )
        chunk_path = os.path.join(tmp_dir, f"chunk_{i}.wav")
        if not _chunk_audio_ffmpeg(audio_path, chunk_start, chunk_dur, chunk_path):
            continue

        try:
            output = model.transcribe([chunk_path], timestamps=True, batch_size=1, num_workers=0)
            result = output[0]
        except Exception as e:
            emit_progress("transcribing", f"Warning: chunk {i + 1} failed: {e}")
            continue
        finally:
            try:
                os.remove(chunk_path)
            except Exception:
                pass

        raw_words = result.timestamp.get("word", []) if hasattr(result, "timestamp") else []
        for w in raw_words:
            word_start = float(w.get("start", 0.0)) + chunk_start
            word_end = float(w.get("end", 0.0)) + chunk_start
            # Skip words already covered by previous chunk (overlap zone)
            if i > 0 and word_start < (chunk_start + OVERLAP_SECONDS):
                continue
            all_words.append({
                "text": w.get("word", ""),
                "start": round(word_start, 3),
                "end": round(word_end, 3),
            })

        raw_segs = result.timestamp.get("segment", []) if hasattr(result, "timestamp") else []
        for s in raw_segs:
            seg_start = float(s.get("start", 0.0)) + chunk_start
            seg_end = float(s.get("end", 0.0)) + chunk_start
            if i > 0 and seg_start < (chunk_start + OVERLAP_SECONDS):
                continue
            all_segments.append({
                "text": s.get("segment", ""),
                "start": round(seg_start, 3),
                "end": round(seg_end, 3),
            })

        full_text_parts.append(result.text.strip())

    try:
        os.rmdir(tmp_dir)
    except Exception:
        pass

    return {
        "text": " ".join(full_text_parts),
        "words": all_words,
        "segments": all_segments,
    }


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    args = parse_args()

    if not os.path.isfile(args.input):
        emit_error(f"Input file not found: {args.input}")
        write_output(args.output, {"error": f"Input file not found: {args.input}"})
        sys.exit(1)

    # Suppress NeMo / PyTorch verbose logging
    import logging
    logging.getLogger("nemo_logger").setLevel(logging.ERROR)
    logging.getLogger("nemo").setLevel(logging.ERROR)
    os.environ.setdefault("NEMO_LOGGING_LEVEL", "ERROR")

    try:
        import nemo.collections.asr as nemo_asr
    except ImportError as e:
        emit_error(f"NeMo not installed: {e}")
        write_output(args.output, {"error": f"NeMo not installed: {e}"})
        sys.exit(1)

    # Check if the model is already cached; if not, we'll see download progress
    try:
        from huggingface_hub import try_to_load_from_cache, snapshot_download
        import re as _re

        # Determine if model is cached by checking the hub cache
        _model_id = args.model.replace("/", "--") if "/" in args.model else args.model
        _cache_hit = try_to_load_from_cache(args.model, filename="model_config.yaml") is not None
    except Exception:
        _cache_hit = True  # Assume cached if we can't check (avoid false download message)

    if not _cache_hit:
        emit({"type": "progress", "stage": "downloading-model",
              "message": "Downloading Parakeet TDT v3 (~1.2 GB) — first time only...",
              "percent": 0})
        # Patch tqdm to emit download progress lines
        try:
            import tqdm as _tqdm_mod

            _orig_tqdm_init = _tqdm_mod.tqdm.__init__

            def _patched_tqdm_init(self, *args, **kwargs):
                _orig_tqdm_init(self, *args, **kwargs)

            _orig_tqdm_update = _tqdm_mod.tqdm.update

            def _patched_tqdm_update(self, n=1):
                _orig_tqdm_update(self, n)
                try:
                    total = self.total or 1
                    pct = min(99, int((self.n / total) * 100))
                    desc = str(self.desc or "")
                    emit({"type": "progress", "stage": "downloading-model",
                          "message": f"Downloading Parakeet TDT v3 ({desc.strip()})...",
                          "percent": pct})
                except Exception:
                    pass

            _tqdm_mod.tqdm.update = _patched_tqdm_update
        except Exception:
            pass  # tqdm not available or patch failed — no progress, that's fine
    else:
        emit_progress("loading-model", f"Loading Parakeet TDT v3 ({args.model})...")

    try:
        asr_model = nemo_asr.models.ASRModel.from_pretrained(model_name=args.model)
        asr_model.eval()
    except Exception as e:
        emit_error(f"Failed to load model '{args.model}': {e}")
        write_output(args.output, {"error": f"Failed to load model: {e}"})
        sys.exit(1)

    # Signal that model is loaded (after potential download)
    emit({"type": "progress", "stage": "loading-model",
          "message": f"Model loaded successfully"})

    duration_sec = get_audio_duration_seconds(args.input)
    emit_progress("transcribing", f"Transcribing audio ({duration_sec/60:.1f} min)...")

    try:
        if duration_sec > MAX_FULL_ATTENTION_SECONDS:
            payload = transcribe_chunked(asr_model, args.input, duration_sec)
        else:
            output = asr_model.transcribe([args.input], timestamps=True, batch_size=1, num_workers=0)
            result = output[0]
            full_text: str = result.text

            raw_words = result.timestamp.get("word", []) if hasattr(result, "timestamp") else []
            words = []
            for w in raw_words:
                words.append({
                    "text": w.get("word", ""),
                    "start": round(float(w.get("start", 0.0)), 3),
                    "end": round(float(w.get("end", 0.0)), 3),
                })

            raw_segments = result.timestamp.get("segment", []) if hasattr(result, "timestamp") else []
            segments = []
            for s in raw_segments:
                segments.append({
                    "text": s.get("segment", ""),
                    "start": round(float(s.get("start", 0.0)), 3),
                    "end": round(float(s.get("end", 0.0)), 3),
                })

            payload = {
                "text": full_text,
                "words": words,
                "segments": segments,
            }
    except Exception as e:
        emit_error(f"Transcription failed: {e}")
        write_output(args.output, {"error": f"Transcription failed: {e}"})
        sys.exit(1)

    write_output(args.output, payload)

    # Emit the final done line with full payload
    emit({
        "type": "done",
        "text": payload["text"],
        "words": payload["words"],
        "segments": payload["segments"],
    })


if __name__ == "__main__":
    main()
