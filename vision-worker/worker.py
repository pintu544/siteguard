"""
SiteGuard vision worker — Stage I proposal prototype.

Reads a video file (or webcam with --webcam), runs real YOLOv8 PPE inference
via ultralytics, and POSTs detection events + annotated frames to the API server.

Detection provenance (honesty label): hard-hat classification comes from the
third-party pretrained model Hansung-Cho/yolov8-ppe-detection (MIT license).
Person + hard-hat boxes are real model inference; the *policy* (violation
confirmation, escalation) lives in the Node API server, not here.

Usage:
    python worker.py --video /path/to/clip.mp4 --server http://localhost:3000
    python worker.py --webcam --server http://localhost:3000
"""

import argparse
import base64
import time

import cv2
import requests
from ultralytics import YOLO

# Third-party pretrained PPE model (MIT). Downloaded separately; see README.
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
                   help="inference image size (default 480; 640 is ~9x slower on CPU)")
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


def main():
    args = parse_args()
    model = YOLO(args.model)
    print(f"[worker] loaded {args.model}; names={model.names}", flush=True)

    cap = cv2.VideoCapture(0 if args.webcam else args.video)
    if not cap.isOpened():
        raise SystemExit("[worker] cannot open video source")

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
        for person in persons:
            worn = any(bbox_overlap(person["bbox"], h["bbox"]) > 0.15
                       for h in hardhats)
            detections.append({
                "bbox": [round(v, 1) for v in person["bbox"]],
                "hardHat": worn,
                "confidence": round(person["confidence"], 3),
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

    cap.release()
    fps = processed / max(time.time() - t_start, 0.001)
    print(f"[worker] done: {processed} frames at {fps:.1f} fps", flush=True)


if __name__ == "__main__":
    main()
