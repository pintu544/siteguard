# Recording runbook — SiteGuard Stage I demo video (Pintu's laptop)

**Video spec (from the official rules):** ≤3 minutes, YouTube visibility "Anyone with the link".
**Stage I deadline:** Oct 14, 2026, 14:30 IST (17:00 Taipei time). Plan: setup anytime,
test run Oct 13, record + submit Oct 14 morning.

---

## 1. One-time laptop setup (~15 min, do it before Oct 13)

Prerequisites: Python 3.12, Node.js 18+, git. Then:

```bash
git clone https://github.com/pintu544/siteguard.git
cd siteguard

# Vision worker
cd vision-worker
python3 -m venv venv
./venv/bin/pip install torch --index-url https://download.pytorch.org/whl/cpu
./venv/bin/pip install ultralytics opencv-python-headless requests numpy

# PPE model weights (MIT, ~6 MB) — NOT in the repo, download once:
mkdir -p models
curl -L -o models/ppe-yolov8n.pt \
  https://huggingface.co/Hansung-Cho/yolov8-ppe-detection/resolve/main/best.pt

# API server
cd ../server
npm install
```

(On Windows: run the same steps in Git Bash; if torch errors, follow the CPU
wheel instructions at pytorch.org — the ultralytics package handles the rest.)

## 2. Preflight — verify once, before recording day

The `--webcam` path was **never tested** (the build machine has no camera).
Do this smoke test so there are no surprises on camera:

```bash
# Terminal 1
cd siteguard && node server/server.js          # → http://localhost:3000

# Terminal 2 (open http://localhost:3000 full-window first)
cd siteguard/vision-worker
./venv/bin/python worker.py --webcam --server http://localhost:3000 --conf 0.35 --skip 8 --imgsz 480
```

Put on the hard-hat prop, walk in and out of frame. You should see bounding
boxes + "NO HARD HAT" labels when the prop is off, incidents landing in the log
table, and the banner escalating warning → alert → critical. If the camera
fails to open: close any app holding the camera (Meet/Zoom/Teams), grant the
terminal camera permission in OS settings, retry. Ctrl+C both terminals when done.

## 3. Recording-day sequence (verbatim)

Two shots, in this order:

### Shot A — screen recording (the money shot, ~60s of footage)

```bash
# 0. Reset the evidence board — the log must start empty
cd siteguard
echo "[]" > data/incidents.json
rm -f data/snapshots/*.jpg

# 1. Server
node server/server.js

# 2. Dashboard — open http://localhost:3000 FULL-WINDOW, log visibly empty

# 3. Worker (from inside vision-worker/ — the model path is relative)
cd vision-worker
./venv/bin/python worker.py --video ../.tmp/demo-clip.mp4 --server http://localhost:3000 --conf 0.35 --skip 8 --imgsz 480
# (first run downloads the royalty-free Coverr clip automatically)
```

Narrate the 60s choreography (from demo-tuning):
- **0:00–0:10** — log empty → bounding boxes appear, "NO HARD HAT" labels track violators.
- **0:10–0:20** — 6 incidents land (warning, warning, alert, alert, alert, critical),
  ~1.3s apart. Narrate the 5-frame confirmation rule as the first banner fires.
- **0:20–0:45** — worker finished; the dashboard is a populated evidence board.
  Click an incident → snapshot opens. Acknowledge one. "The policy loop, not the
  detector, is the product."
- **0:45–0:60** — honesty beat: point at the STAGE I PROTOTYPE · SIMULATION badge —
  "laptop, pretrained detector, rule-based loop; Thunderstorm silicon is Stage II."

If the incident pacing feels rushed on camera, fall back to `--skip 12`
(4 slower incidents: warning, warning, alert, alert).

### Shot B — webcam with hard-hat prop (~15–20s)

Use the preflighted `--webcam` setup. One continuous take: you, on camera,
wearing the prop, then removing it — the dashboard behind/beside you (or
picture-in-picture) shows the "NO HARD HAT" label and alert firing in real time.
This is the opening hook ("a worker without a hard hat is invisible until
someone walks past with a clipboard") or the closer. Keep it under 20s.

## 4. Full video structure (budget 2:30 of the 3:00 cap)

| Time | Beat |
|------|------|
| 0:00–0:20 | The problem — Shot B (webcam prop) or slides |
| 0:20–0:45 | The concept — one architecture slide (camera → vision-worker → policy engine → dashboard) |
| 0:45–1:45 | Live demo — Shot A screen recording, narrated |
| 1:45–2:15 | Honesty beat — laptop + pretrained detector + rule-based loop, labeled throughout; Stage II on Thunderstorm |
| 2:15–2:30 | Close — repo link on screen: github.com/pintu544/siteguard. "SiteGuard: the safety officer that never blinks." |

Recording notes: 1080p screen capture, dashboard full-window, mic check before
the take, sample clip pre-downloaded so the demo starts instantly. One take per
shot is fine — this is a proposal video, not a film.

## 5. Troubleshooting

| Symptom | Fix |
|---------|-----|
| `vision-worker/venv` missing | You skipped setup step 1 — run it once |
| Worker: model file not found | Weights must be at `vision-worker/models/ppe-yolov8n.pt`; worker must run from inside `vision-worker/` |
| Camera won't open | Close Meet/Zoom/Teams; grant camera permission to the terminal in OS settings |
| Port 3000 busy | Another server instance is running — kill it, or `PORT=3001 node server/server.js` (then `--server http://localhost:3001`) |
| Dashboard shows old incidents | You forgot the reset step (section 3.0) — the log fills only from live runs |
| torch install is slow | Normal — CPU wheel is ~200 MB; let it finish |
| Laptop fans screaming | Expected on CPU inference (~4 fps wall-clock at 480p); close Chrome tabs, keep the charger plugged in |
