# SiteGuard — Agentic AI Workplace Safety Monitor

**Stage I proposal prototype** for the ASUS UGen AI League Innovation Hackathon
(Battlefield Thunderstorm, Global Online track, Workplace AI theme).

SiteGuard watches workplace camera feeds, detects hard-hat (PPE) violations in
real time, and turns each confirmed violation into an auditable incident with
an alert — so safety officers act on evidence instead of anecdotes.

> **Honesty notice (please read):** this is a Stage I *proposal prototype* running
> on a laptop. Person + hard-hat detection uses real inference from a
> third-party pretrained model (`Hansung-Cho/yolov8-ppe-detection`, MIT
> license). The agentic policy loop (violation confirmation, escalation,
> incident log) is rule-based in Stage I — there is no LLM planner.
> Sample footage is royalty-free stock, not a real site. Every simulated or
> third-party element is labeled `SIMULATION` / with provenance in the UI below.

## Architecture

Three processes on one laptop, all localhost:

```
video file / webcam
      │
      ▼
┌─────────────┐   HTTP POST    ┌──────────────┐   Socket.IO   ┌───────────┐
│ vision-     │  /api/detect-  │  api-server  │ ───────────▶ │ dashboard │
│ worker      │  ions,/frames  │  (Node.js)   │              │ (browser) │
│ (Python,    │                │  policy      │              └───────────┘
│  YOLOv8)    │                │  engine      │
└─────────────┘                └──────┬───────┘
                                      │ writes
                                      ▼
                               data/incidents.json
                               data/snapshots/
```

- **vision-worker/** (Python 3.12, `ultralytics`): reads the video file (or
  `--webcam`), runs YOLOv8 PPE inference per processed frame, draws
  bounding boxes, POSTs detection JSON + annotated JPEG frames to the server.
- **server/** (Node.js + Express + Socket.IO, port 3000): the policy engine —
  confirms violations only after **N consecutive frames** (default 5),
  escalates repeats per zone (**warning → alert → critical**), broadcasts
  over WebSocket, persists incidents to `data/incidents.json`.
- **dashboard/** (single `index.html`, vanilla JS): live annotated feed,
  zone-compliance chips, alert banners, incident-log table with acknowledge
  buttons. No build step.

## Setup

Prerequisites: Python 3.12, Node.js 18+, `pip`, `npm`.

```bash
# 1. Vision worker
cd vision-worker
python3 -m venv venv
./venv/bin/pip install torch --index-url https://download.pytorch.org/whl/cpu
./venv/bin/pip install ultralytics opencv-python-headless requests numpy

# 2. PPE model weights (MIT) — NOT in the repo, download once:
mkdir -p models
curl -L -o models/ppe-yolov8n.pt \
  https://huggingface.co/Hansung-Cho/yolov8-ppe-detection/resolve/main/best.pt

# 3. API server
cd ../server
npm install
```

## Run

Terminal 1 — API server:
```bash
cd server && node server.js
# → http://localhost:3000
```

Terminal 2 — vision worker (sample royalty-free clip):
```bash
# Download the demo clip (Coverr, royalty-free, no attribution required):
curl -L -o /tmp/demo.mp4 \
  https://cdn.coverr.co/videos/coverr-construction-workers-454/1080p.mp4

cd vision-worker
./venv/bin/python worker.py --video /tmp/demo.mp4 --server http://localhost:3000
```

Terminal 3 — open the dashboard:
```bash
# → http://localhost:3000 in a browser
```

Webcam instead of a file:
```bash
./venv/bin/python worker.py --webcam --server http://localhost:3000
```

Knobs: `--skip N` (process every Nth frame), `--conf 0.35` (confidence),
`--imgsz 480` (inference size; 640 is ~9x slower on CPU).
Server env: `CONFIRM_FRAMES=5`, `ESCALATE_AFTER=3`, `PORT=3000`.

**Measured performance (laptop CPU):** ≈10 fps end-to-end at 480p inference
(9.9 fps measured). Frame-skipping keeps CPU budgets honest.

## What is real vs. simulated

| Component | Status |
|---|---|
| Person + hard-hat detection | **Real inference** — third-party pretrained YOLOv8 model (`Hansung-Cho/yolov8-ppe-detection`, MIT). Not trained by us. |
| Violation confirmation (N consecutive frames) | **Real** — our policy engine code. |
| Escalation warning → alert → critical | **Real** — our policy engine code. |
| Incident log + snapshots | **Real** — written by real pipeline runs; starts empty. |
| Alert latency / dashboard | **Real** — WebSocket, localhost. |
| Input footage | **Sample** — royalty-free Coverr stock clip (commercial-use license, no attribution required). Not a live site. |
| "Agent" reasoning | **Rule-based** in Stage I (labeled as such). LLM summarization is Stage II. |
| Deployment target | **Laptop** in Stage I. Thunderstorm VM (Intel Arc Pro B70) is the Stage II target — see the proposal deck. |

## Sample footage provenance

- `coverr-construction-workers-454` (primary demo clip) —
  https://cdn.coverr.co/videos/coverr-construction-workers-454/1080p.mp4 —
  Coverr Commercial-Use License (royalty-free, no attribution required).
- `coverr-construction-worker-walking-6415` (alternate) —
  https://cdn.coverr.co/videos/coverr-construction-worker-walking-6415/1080p.mp4 —
  same license.
- Clips are **not** committed to the repo; download at demo time from the URLs above.

## License

MIT — see [LICENSE](LICENSE). Third-party model weights are excluded
(`*.pt` is gitignored); download per Setup above.
