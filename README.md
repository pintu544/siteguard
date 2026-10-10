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
  one continuous violation opens exactly **one incident** (confirmed after
  **N consecutive frames**, default 5); the incident **escalates in place**
  (**warning → alert → critical**) while the violation persists and is marked
  **resolved** once it genuinely clears. Broadcasts over WebSocket, persists
  incidents to `data/incidents.json`.
- **dashboard/** (single `index.html`, vanilla JS): live annotated feed,
  zone-compliance chips, alert banners, incident-log table with acknowledge
  buttons. No build step.

## Setup

Prerequisites: Python 3.12, Node.js 18+, `pip`, `npm`.

```bash
# 1. Vision worker (pinned deps, CPU-only torch)
cd vision-worker
python3 -m venv venv
./venv/bin/pip install -r requirements.txt   # Windows: venv\Scripts\pip install -r requirements.txt

# 2. PPE model weights (MIT) — NOT in the repo, download once:
mkdir -p models
curl -L -o models/ppe-yolov8n.pt \
  https://huggingface.co/Hansung-Cho/yolov8-ppe-detection/resolve/main/best.pt

# 3. API server
cd ../server
npm install
```

## Run

One command (starts server + worker, opens the dashboard; Ctrl+C stops):

```bash
./demo.sh            # Linux/macOS — tuned demo clip
./demo.sh --webcam   # Linux/macOS — your webcam
```
```bat
demo.bat             :: Windows (cmd) — tuned demo clip
demo.bat --webcam    :: Windows (cmd) — your webcam
```
```powershell
.\demo.ps1           # Windows (PowerShell) — tuned demo clip
.\demo.ps1 -Webcam   # Windows (PowerShell) — your webcam
```

Manual (three terminals) if you prefer:

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
Server env: `CONFIRM_FRAMES=5`, `CLEAR_FRAMES=10`,
`ESCALATE_ALERT_FRAMES=15`, `ESCALATE_CRITICAL_FRAMES=30`, `PORT=3000`.

**Measured performance (honest numbers, not projections):** on the 2-CPU
build VM, the worker sustains **≈6 fps end-to-end** (`--skip 8 --imgsz 480`,
1080p clip). Per-stage medians: inference 62 ms (≈16 fps ceiling),
JPEG encode 7 ms, localhost POSTs 8 ms — the remainder is H.264 decode of
skipped frames (~30 ms/frame × 7 skipped per processed frame), which the
worker overlaps with inference via a background decode thread. On stronger
hardware (4+ cores) expect 8–12 fps; the inference core itself is not the
bottleneck. If your machine is slower, use `--skip 12` and/or `--imgsz 320`.
Measure on your own hardware before quoting a number — laptop results vary
widely with CPU, thermals, and power settings.

**Detection accuracy:** we did not hand-label our own eval set (a 30-frame
self-graded eval would be weak evidence). The model author reports on the
validation set: mAP@0.50 **0.744**, precision **0.831**, recall **0.685**
(source: the [model card](https://huggingface.co/Hansung-Cho/yolov8-ppe-detection)).
Our contribution is the policy loop on top, which is covered by
`server/test/policy.test.js` (6/6: flicker rejection, same-person
confirmation, one-incident-per-violation, in-place escalation, resolution,
acknowledgement).

**Confirmation latency:** 5 consecutive processed frames at the measured
≈6 fps ≈ **0.8 s** from violation start to incident open (plus <100 ms
alert broadcast over localhost WebSocket).

## What is real vs. simulated

| Component | Status |
|---|---|
| Person + hard-hat detection | **Real inference** — third-party pretrained YOLOv8 model (`Hansung-Cho/yolov8-ppe-detection`, MIT). Not trained by us. |
| Violation confirmation (N consecutive frames) | **Real** — our policy engine code. One continuous violation = one incident. |
| Escalation warning → alert → critical | **Real** — our policy engine code. Escalates in place as the violation persists; incident marked resolved when it clears. |
| Incident log + snapshots | **Real** — written by real pipeline runs; starts empty. |
| Alert latency / dashboard | **Real** — WebSocket, localhost. |
| Input footage | **Sample** — royalty-free Coverr stock clip (commercial-use license, no attribution required). Not a live site. |
| "Agent" reasoning | **Rule-based** in Stage I (labeled as such). LLM summarization is Stage II. |
| Deployment target | **Laptop** in Stage I. Thunderstorm VM (Intel Arc Pro B70) is the Stage II target — see the proposal deck. |

## Privacy & responsible use

- **Local processing:** video never leaves the machine (Stage I) / the site
  network (Stage II). No cloud uploads, no third-party analytics.
- **No facial recognition:** the model detects *persons* and *hard hats* only.
  No face detection, no identity matching, no biometric templates — by design,
  not just by policy.
- **Configurable retention:** snapshots and the incident log live in `data/`
  (gitignored). Retention is a deployment setting: keep the rolling window
  your site policy requires, purge the rest.
- **Human review before action:** SiteGuard raises *alerts for supervisors*,
  not automated penalties. The dashboard's acknowledge flow exists so a human
  confirms every incident before any disciplinary use.
- **Visible honesty:** the dashboard and every public artifact carry a
  `STAGE I PROTOTYPE · SIMULATION` label and a detection-provenance note, so
  no one mistakes the demo for a certified safety system.

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
