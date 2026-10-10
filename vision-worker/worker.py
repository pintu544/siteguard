"""
SiteGuard vision worker — Stage I proposal prototype.

Reads a video file (or webcam with --webcam), runs real YOLOv8 PPE inference
via ultralytics, and POSTs detection events + annotated frames to the API server.

Detection provenance (honesty label): hard-hat classification comes from the
third-party pretrained model Hansung-Cho/yolov8-ppe-detection. Third-party
runtime, model, and source-dataset terms are documented separately.
Person + hard-hat boxes are real model inference; the *policy* (violation
confirmation, escalation) lives in the Node API server, not here.

Usage:
    python worker.py --video /path/to/clip.mp4 --server http://localhost:3000
    python worker.py --webcam --server http://localhost:3000
"""

import argparse
import base64
import queue
import threading
import time

import cv2
import requests
from ultralytics import YOLO

# Third-party pretrained PPE model. Downloaded separately; see README and
# THIRD_PARTY_NOTICES.md for runtime, model, and training-data caveats.
# https://huggingface.co/Hansung-Cho/yolov8-ppe-detection
MODEL_PATH = "models/ppe-yolov8n.pt"

# Class names emitted by the PPE model (subset we care about).
PERSON_CLASS = "Person"
HARDHAT_CLASS = "Hardhat"
NO_HARDHAT_CLASS = "No-Hardhat"


def parse_args():
    p = argparse.ArgumentParser(description="SiteGuard vision worker")
    src = p.add_mutually_exclusive_group(required=True)
    src.add_argument("--video", help="path to input video file")
    src.add_argument("--webcam", action="store_true", help="use webcam (device 0)")
    p.add_argument("--server", default="http://localhost:3000",
                   help="API server base URL")
    p.add_argument("--skip", type=int, default=2,
                   help="process every Nth frame (default 2)")
    p.add_argument("--conf", type=float, default=0.35,
                   help="detection confidence threshold (default 0.35)")
    p.add_argument("--model", default=MODEL_PATH, help="path to .pt weights")
    p.add_argument("--imgsz", type=int, default=480,
                   help="inference image size (default 480)")
    return p.parse_args()


def bbox_overlap(a, b):
    """IoU-ish overlap: area of intersection / area of smaller box."""
    x1 = max(a[0], b[0]); y1 = max(a[1], b[1])
    x2 = min(a[2], b[2]); y2 = min(a[3], b[3])
    inter = max(0, x2 - x1) * max(0, y2 - y1)
    if inter == 0:
        return 0.0
    area_a = (a[2] - a[0]) * (a[3] - a[1])
    area_b = (b[2] - b[0]) * (b[3] - b[1])
    return inter / min(area_a, area_b)


# --- Lightweight person tracking -------------------------------------------
# Greedy bbox-overlap matching across processed frames. Gives each visible
# person a stable trackId so the server's "N consecutive frames" confirmation
# genuinely refers to the same person, not just "someone in the zone".
# Stage I scope: no ReID embeddings, no Kalman filter — overlap is enough at
# the processed frame rates we run.
TRACK_OVERLAP = 0.3   # min overlap to match a detection to an existing track
TRACK_MAX_MISSED = 10  # drop a track after this many processed frames unseen

_tracks = []
_next_track_id = 1


def match_tracks(person_bboxes):
    """Assign a stable trackId to each person bbox. Returns list of trackIds
    aligned with person_bboxes."""
    global _next_track_id
    unmatched = list(_tracks)
    track_ids = []
    for bbox in person_bboxes:
        best, best_ov = None, 0.0
        for t in unmatched:
            ov = bbox_overlap(bbox, t["bbox"])
            if ov > best_ov:
                best, best_ov = t, ov
        if best is not None and best_ov >= TRACK_OVERLAP:
            best["bbox"] = bbox
            best["missed"] = 0
            unmatched.remove(best)
            track_ids.append(best["id"])
        else:
            new = {"id": _next_track_id, "bbox": bbox, "missed": 0}
            _next_track_id += 1
            _tracks.append(new)
            track_ids.append(new["id"])
    for t in unmatched:
        t["missed"] += 1
    _tracks[:] = [t for t in _tracks if t["missed"] <= TRACK_MAX_MISSED]
    return track_ids


class FrameReader:
    """Background-thread video reader.

    H.264 decode of skipped frames was the dominant end-to-end cost
    (measured ~100ms per processed frame at --skip 8 on a 2-CPU box).
    Decoding in a daemon thread overlaps it with inference instead of
    serializing it. Bounded queue with drop-oldest keeps a LIVE source
    (webcam) from falling behind; file sources block when full so the
    --skip cadence stays exact.
    """

    def __init__(self, src, live=False, maxsize=32):
        self.cap = cv2.VideoCapture(src)
        if not self.cap.isOpened():
            raise SystemExit("[worker] cannot open video source")
        self.live = live
        self.q = queue.Queue(maxsize=maxsize)
        self.stopped = False
        self.t = threading.Thread(target=self._run, daemon=True)
        self.t.start()

    def _run(self):
        while not self.stopped:
            ok, frame = self.cap.read()
            if not ok:
                break
            if self.live:
                try:
                    self.q.put(frame, timeout=1)
                except queue.Full:
                    try:
                        self.q.get_nowait()  # drop oldest: stay live
                    except queue.Empty:
                        pass
                    try:
                        self.q.put(frame, timeout=1)
                    except queue.Full:
                        pass
            else:
                self.q.put(frame)  # block: keep file cadence exact
        self.stopped = True
        self.cap.release()
        # Sentinel: unblock a reader waiting on an empty queue at end of stream.
        try:
            self.q.put(None, timeout=1)
        except queue.Full:
            pass

    def read(self, timeout=10):
        try:
            frame = self.q.get(timeout=timeout)
        except queue.Empty:
            return False, None
        if frame is None:
            return False, None
        return True, frame

    def stop(self):
        self.stopped = True


def main():
    args = parse_args()
    model = YOLO(args.model)
    print(f"[worker] loaded {args.model}; names={model.names}", flush=True)

    cap = FrameReader(0 if args.webcam else args.video, live=args.webcam)

    frame_id = 0
    processed = 0
    t_start = time.time()

    while True:
        ok, frame = cap.read()
        if not ok:
            break
        frame_id += 1
        if frame_id % args.skip != 0:
            continue
        processed += 1

        results = model.predict(frame, imgsz=args.imgsz, conf=args.conf, verbose=False)[0]
        persons, hardhats = [], []
        for box in results.boxes:
            cls = model.names[int(box.cls[0])]
            xyxy = [float(v) for v in box.xyxy[0]]
            conf = float(box.conf[0])
            if cls == PERSON_CLASS:
                persons.append({"bbox": xyxy, "confidence": conf})
            elif cls == HARDHAT_CLASS:
                hardhats.append({"bbox": xyxy, "confidence": conf})
            # NO-Hardhat boxes are informational; absence of a Hardhat
            # overlapping the person is what marks a violation.

        detections = []
        track_ids = match_tracks([p["bbox"] for p in persons])
        for person, track_id in zip(persons, track_ids):
            worn = any(bbox_overlap(person["bbox"], h["bbox"]) > 0.15
                       for h in hardhats)
            detections.append({
                "bbox": [round(v, 1) for v in person["bbox"]],
                "hardHat": worn,
                "confidence": round(person["confidence"], 3),
                "trackId": track_id,
                # Provenance label: real inference, third-party pretrained model.
                "method": "pretrained-ppe-model",
            })
            # Annotate.
            x1, y1, x2, y2 = (int(v) for v in person["bbox"])
            color = (0, 200, 0) if worn else (0, 0, 255)
            label = "HARD HAT" if worn else "NO HARD HAT"
            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
            cv2.putText(frame, label, (x1, y1 - 8),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

        # POST detection event.
        try:
            requests.post(f"{args.server}/api/detections", json={
                "frameId": frame_id,
                "ts": time.time(),
                "persons": detections,
            }, timeout=5)
        except requests.RequestException as e:
            print(f"[worker] detection POST failed: {e}", flush=True)

        # POST annotated frame as base64 JPEG.
        _, jpeg = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
        try:
            requests.post(f"{args.server}/api/frames", json={
                "frameId": frame_id,
                "jpegBase64": base64.b64encode(jpeg).decode(),
            }, timeout=5)
        except requests.RequestException as e:
            print(f"[worker] frame POST failed: {e}", flush=True)

        if processed % 30 == 0:
            fps = processed / (time.time() - t_start)
            print(f"[worker] {processed} frames, {fps:.1f} fps, "
                  f"{len(detections)} persons", flush=True)

    cap.stop()
    fps = processed / max(time.time() - t_start, 0.001)
    print(f"[worker] done: {processed} frames at {fps:.1f} fps", flush=True)


if __name__ == "__main__":
    main()
