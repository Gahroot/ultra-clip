#!/usr/bin/env python3
"""
face_detect.py — MediaPipe face detection for 9:16 crop rectangle generation.

Usage:
    python face_detect.py --input <video_path> --segments <segments_json_path> --output <output_json_path>

segments_json format:
    [{"start": 10.5, "end": 40.2}, ...]

Output (written to --output file AND printed as JSON lines on stdout):
    Progress lines:   {"type": "progress", "segment": 0, "total": 5}
    Final result:     {"type": "done", "crops": [...]}
    Error:            {"type": "error", "message": "..."}

Each crop entry:
    {"x": 100, "y": 0, "width": 607, "height": 1080, "face_detected": true}
"""

from __future__ import annotations

import argparse
import json
import sys
import os


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def eprint(msg: str) -> None:
    print(msg, file=sys.stderr, flush=True)


def emit(obj: dict) -> None:
    """Print a JSON line to stdout (for IPC progress/result)."""
    print(json.dumps(obj), flush=True)


def round_to_even(value: int) -> int:
    """Round down to nearest even integer for H.264 compatibility."""
    return value - (value % 2)


# ---------------------------------------------------------------------------
# Crop calculation
# ---------------------------------------------------------------------------

def center_crop(frame_width: int, frame_height: int) -> dict:
    """Return a 9:16 center crop, H.264-safe (even dimensions)."""
    if frame_width / frame_height > 9 / 16:
        # Landscape / wider than 9:16 — crop width
        crop_w = round_to_even(int(frame_height * 9 / 16))
        crop_h = round_to_even(frame_height)
        crop_x = round_to_even((frame_width - crop_w) // 2)
        crop_y = 0
    else:
        # Portrait / narrower than 9:16 — crop height
        crop_w = round_to_even(frame_width)
        crop_h = round_to_even(int(frame_width * 16 / 9))
        crop_x = 0
        crop_y = round_to_even(max(0, (frame_height - crop_h) // 2))

    return {"x": crop_x, "y": crop_y, "width": crop_w, "height": crop_h, "face_detected": False}


def face_centered_crop(
    face_centers: list[tuple[int, int, int, float]],
    frame_width: int,
    frame_height: int,
) -> dict:
    """
    Compute a 9:16 crop centred on the weighted average of detected faces.

    face_centers: list of (x, y, area, confidence) in absolute pixel coords.
    """
    if frame_width / frame_height > 9 / 16:
        crop_w = round_to_even(int(frame_height * 9 / 16))
        crop_h = round_to_even(frame_height)
    else:
        crop_w = round_to_even(frame_width)
        crop_h = round_to_even(int(frame_width * 16 / 9))

    total_weight = sum(area * conf for _, _, area, conf in face_centers)
    if total_weight <= 0:
        # Degenerate — fall back to center
        crop_x = round_to_even((frame_width - crop_w) // 2)
        crop_y = round_to_even(max(0, (frame_height - crop_h) // 2))
        return {"x": crop_x, "y": crop_y, "width": crop_w, "height": crop_h, "face_detected": False}

    weighted_x = sum(x * area * conf for x, _, area, conf in face_centers) / total_weight
    weighted_y = sum(y * area * conf for _, y, area, conf in face_centers) / total_weight

    # Slight upward bias for better face framing (same as supoclip reference)
    weighted_y = max(0.0, weighted_y - crop_h * 0.1)

    crop_x = int(weighted_x - crop_w / 2)
    crop_y = int(weighted_y - crop_h / 2)

    # Clamp to frame bounds
    crop_x = max(0, min(crop_x, frame_width - crop_w))
    crop_y = max(0, min(crop_y, frame_height - crop_h))

    # Ensure even offsets for H.264
    crop_x = round_to_even(crop_x)
    crop_y = round_to_even(crop_y)

    return {"x": crop_x, "y": crop_y, "width": crop_w, "height": crop_h, "face_detected": True}


# ---------------------------------------------------------------------------
# Face detection helpers
# ---------------------------------------------------------------------------

def filter_face_outliers(
    face_centers: list[tuple[int, int, int, float]],
) -> list[tuple[int, int, int, float]]:
    """Remove detections that are > 2 std deviations from the median position."""
    if len(face_centers) < 3:
        return face_centers

    try:
        import numpy as np

        x_positions = [x for x, _, _, _ in face_centers]
        y_positions = [y for _, y, _, _ in face_centers]

        median_x = float(np.median(x_positions))
        median_y = float(np.median(y_positions))
        std_x = float(np.std(x_positions))
        std_y = float(np.std(y_positions))

        filtered = [
            fc for fc in face_centers
            if abs(fc[0] - median_x) <= 2 * std_x and abs(fc[1] - median_y) <= 2 * std_y
        ]

        eprint(f"[face_detect] Outlier filter: {len(face_centers)} -> {len(filtered)} faces")
        return filtered if filtered else face_centers  # Never discard everything
    except Exception as exc:
        eprint(f"[face_detect] Outlier filter error: {exc}")
        return face_centers


def detect_faces_in_segment(
    cap,
    fps: float,
    frame_width: int,
    frame_height: int,
    start_sec: float,
    end_sec: float,
    mp_detector,
    haar_cascade,
    num_samples: int = 6,
) -> list[tuple[int, int, int, float]]:
    """
    Sample `num_samples` frames from [start_sec, end_sec] and collect
    (center_x, center_y, area, confidence) face measurements in absolute pixels.

    Uses MediaPipe as primary detector; Haar cascade as last resort.
    """
    import cv2

    duration = end_sec - start_sec
    if num_samples > 1 and duration > 0:
        sample_times = [start_sec + duration * i / (num_samples - 1) for i in range(num_samples)]
    else:
        sample_times = [start_sec]

    face_centers: list[tuple[int, int, int, float]] = []
    frame_area = frame_width * frame_height

    for t in sample_times:
        frame_idx = int(t * fps)
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
        ret, frame = cap.read()
        if not ret:
            continue

        detected_in_frame: list[tuple[int, int, int, int, float]] = []  # (x, y, w, h, conf)

        # --- MediaPipe (primary) ---
        if mp_detector is not None:
            try:
                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                result = mp_detector.process(rgb)
                if result.detections:
                    for det in result.detections:
                        bbox = det.location_data.relative_bounding_box
                        conf = det.score[0] if det.score else 0.0
                        x = int(bbox.xmin * frame_width)
                        y = int(bbox.ymin * frame_height)
                        w = int(bbox.width * frame_width)
                        h = int(bbox.height * frame_height)
                        if w > 30 and h > 30:
                            detected_in_frame.append((x, y, w, h, float(conf)))
            except Exception as exc:
                eprint(f"[face_detect] MediaPipe frame error at t={t:.2f}s: {exc}")

        # --- Haar cascade fallback ---
        if not detected_in_frame and haar_cascade is not None:
            try:
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                faces = haar_cascade.detectMultiScale(
                    gray,
                    scaleFactor=1.05,
                    minNeighbors=3,
                    minSize=(40, 40),
                    maxSize=(int(frame_width * 0.7), int(frame_height * 0.7)),
                )
                for (x, y, w, h) in faces:
                    face_area_px = w * h
                    relative_size = face_area_px / frame_area
                    conf = min(0.9, 0.3 + relative_size * 2.0)
                    detected_in_frame.append((x, y, w, h, conf))
            except Exception as exc:
                eprint(f"[face_detect] Haar cascade error at t={t:.2f}s: {exc}")

        # Accumulate face centers (filter out implausible sizes)
        for (x, y, w, h, conf) in detected_in_frame:
            face_area_px = w * h
            relative_area = face_area_px / frame_area
            if 0.005 < relative_area < 0.3:
                cx = x + w // 2
                cy = y + h // 2
                face_centers.append((cx, cy, face_area_px, conf))

    return face_centers


# ---------------------------------------------------------------------------
# Argument parsing
# ---------------------------------------------------------------------------

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Detect faces and generate 9:16 crop rectangles")
    parser.add_argument("--input", required=True, help="Path to input video file")
    parser.add_argument("--segments", required=True, help="Path to segments JSON file")
    parser.add_argument("--output", required=True, help="Path to write output JSON")
    return parser.parse_args()


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    args = parse_args()

    # Validate inputs
    if not os.path.isfile(args.input):
        emit({"type": "error", "message": f"Input video not found: {args.input}"})
        sys.exit(1)

    if not os.path.isfile(args.segments):
        emit({"type": "error", "message": f"Segments file not found: {args.segments}"})
        sys.exit(1)

    with open(args.segments, "r", encoding="utf-8") as f:
        segments = json.load(f)

    total = len(segments)
    eprint(f"[face_detect] Processing {total} segment(s) from: {args.input}")

    # --- Import cv2 ---
    try:
        import cv2
    except ImportError as exc:
        emit({"type": "error", "message": f"OpenCV not installed: {exc}"})
        sys.exit(1)

    # --- Import MediaPipe ---
    mp_face_module = None
    try:
        import mediapipe as mp
        mp_face_module = mp.solutions.face_detection  # type: ignore[attr-defined]
        eprint("[face_detect] MediaPipe loaded OK")
    except ImportError:
        eprint("[face_detect] MediaPipe not available — will use Haar cascade only")
    except Exception as exc:
        eprint(f"[face_detect] MediaPipe init error: {exc}")

    # Ensure numpy is available for outlier filtering (soft dependency)
    try:
        import numpy as _np  # noqa: F401
    except ImportError:
        eprint("[face_detect] numpy not available — outlier filtering disabled")

    # --- Open video ---
    cap = cv2.VideoCapture(args.input)
    if not cap.isOpened():
        emit({"type": "error", "message": f"Cannot open video: {args.input}"})
        sys.exit(1)

    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    frame_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    frame_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    eprint(f"[face_detect] Video: {frame_width}x{frame_height} @ {fps:.2f} fps")

    # --- Haar cascade (always loaded as last-resort fallback) ---
    haar_cascade = None
    try:
        haar_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        haar_cascade = cv2.CascadeClassifier(haar_path)
        if haar_cascade.empty():
            haar_cascade = None
            eprint("[face_detect] Haar cascade XML not found — cascade fallback disabled")
    except Exception as exc:
        eprint(f"[face_detect] Haar cascade load error: {exc}")

    crops: list[dict] = []

    mp_ctx = (
        mp_face_module.FaceDetection(model_selection=1, min_detection_confidence=0.5)
        if mp_face_module is not None
        else None
    )

    try:
        for idx, seg in enumerate(segments):
            emit({"type": "progress", "segment": idx, "total": total})

            start_sec = float(seg.get("start", 0.0))
            end_sec = float(seg.get("end", start_sec + 1.0))

            try:
                face_centers = detect_faces_in_segment(
                    cap=cap,
                    fps=fps,
                    frame_width=frame_width,
                    frame_height=frame_height,
                    start_sec=start_sec,
                    end_sec=end_sec,
                    mp_detector=mp_ctx,
                    haar_cascade=haar_cascade,
                    num_samples=6,
                )

                if len(face_centers) > 2:
                    face_centers = filter_face_outliers(face_centers)

                if face_centers:
                    crop = face_centered_crop(face_centers, frame_width, frame_height)
                    eprint(
                        f"[face_detect] Segment {idx}: face crop at "
                        f"x={crop['x']} y={crop['y']} "
                        f"({len(face_centers)} detections)"
                    )
                else:
                    crop = center_crop(frame_width, frame_height)
                    eprint(f"[face_detect] Segment {idx}: no face detected — center crop")

            except Exception as exc:
                eprint(f"[face_detect] Segment {idx} error: {exc}")
                crop = center_crop(frame_width, frame_height)

            crops.append(crop)

    finally:
        if mp_ctx is not None:
            try:
                mp_ctx.close()
            except Exception:
                pass
        cap.release()

    # Write output file
    result: dict = {"type": "done", "crops": crops}
    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    emit(result)
    eprint(f"[face_detect] Done. Output written to: {args.output}")


if __name__ == "__main__":
    main()
