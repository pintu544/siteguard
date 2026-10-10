# SiteGuard — Agentic AI Workplace Safety Monitor

**Stage I proposal prototype** for the ASUS UGen AI League Innovation Hackathon
(Battlefield Thunderstorm, Global Online track, Workplace AI theme).

SiteGuard watches workplace camera feeds, detects hard-hat (PPE) violations in
real time, and turns each confirmed violation into an auditable incident with
an alert — so safety officers act on evidence instead of anecdotes.

> **Honesty notice (please read):** this is a Stage I *proposal prototype* running
> on a laptop. Person + hard-hat detection is real inference from the
> third-party `Hansung-Cho/yolov8-ppe-detection` weights through the Ultralytics
> runtime. The model repository is tagged MIT, but its model card does not name
> or license every source training dataset. Ultralytics separately publishes
> its runtime and YOLO models under AGPL-3.0 for open-source use and offers an
> Enterprise license for proprietary/commercial deployment. See
> [Third-party and licensing notes](#third-party-and-licensing-notes). The
> policy loop is rule-based in Stage I—there is no LLM planner. Sample footage
> is stock footage, not a real site.

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
  **resolved** after 20 consecutive processed frames without that tracked
  violation. If the server restarts mid-episode, the persisted record becomes
  **interrupted** rather than remaining a stale active alert or being falsely
  called resolved. Broadcasts over WebSocket, persists incidents to
  `data/incidents.json`, and provides CSV export.
- **dashboard/** (single `index.html`, vanilla JS): live annotated feed,
  zone-compliance chips, alert banners, incident-log table with acknowledge
  buttons. No build step.

## Setup

Prerequisites: Python 3.12, Node.js 18+, `pip`, `npm`, and `curl` (Linux/macOS).

Linux/macOS, from the repository root:

```bash
# 1. Vision worker (pinned deps, CPU-only torch)
python3 -m venv vision-worker/venv
vision-worker/venv/bin/pip install -r vision-worker/requirements.txt

# 2. PPE model weights — NOT in the repo, download once:
mkdir -p vision-worker/models
curl -L -o vision-worker/models/ppe-yolov8n.pt \
  https://huggingface.co/Hansung-Cho/yolov8-ppe-detection/resolve/main/best.pt

# 3. API server
cd server && npm install && cd ..
```

Windows PowerShell, from the repository root:

```powershell
python -m venv .\vision-worker\venv
.\vision-worker\venv\Scripts\python.exe -m pip install `
  -r .\vision-worker\requirements.txt
New-Item -ItemType Directory -Force .\vision-worker\models | Out-Null
Invoke-WebRequest `
  'https://huggingface.co/Hansung-Cho/yolov8-ppe-detection/resolve/main/best.pt' `
  -OutFile '.\vision-worker\models\ppe-yolov8n.pt'
Push-Location .\server
npm install
Pop-Location
```

## Run

One command (starts server + worker, opens the dashboard; Ctrl+C stops):

```bash
./demo.sh            # Linux/macOS — tuned demo clip
./demo.sh --webcam   # Linux/macOS — your webcam
./demo.sh --reset    # archive prior evidence, then run the clip with a clean log
```
```bat
demo.bat             :: Windows (cmd) — tuned demo clip
demo.bat --webcam    :: Windows (cmd) — your webcam
demo.bat --reset     :: archive prior evidence, then run with a clean log
```
```powershell
.\demo.ps1           # Windows (PowerShell) — tuned demo clip
.\demo.ps1 -Webcam   # Windows (PowerShell) — your webcam
.\demo.ps1 -ResetData # archive prior evidence, then run with a clean log
```

Options may be combined. In clip mode the launcher uses demo-only escalation
thresholds (alert at 10, critical at 15 processed violation frames); the normal
server defaults remain 15/30. When the clip finishes, the server and dashboard
stay open for snapshot review, acknowledgement, and CSV export. Press `Ctrl+C`
in the launcher terminal to stop the worker and API server. Reset mode moves
existing incident data into a timestamped `.tmp/data-backup-*` folder instead
of deleting it. The launcher refuses to attach to an existing process on port
3000.

Manual (three terminals) if you prefer:

Terminal 1 — API server:
```bash
cd server && node server.js
# → http://localhost:3000
```

Terminal 2 — vision worker (sample Coverr clip):
```bash
# Download the demo clip (Coverr; review THIRD_PARTY_NOTICES.md):
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
`--imgsz 480` (inference size).
Server env: `CONFIRM_FRAMES=5`, `CLEAR_FRAMES=20`,
`ESCALATE_ALERT_FRAMES=15`, `ESCALATE_CRITICAL_FRAMES=30`, `PORT=3000`.

**Measured performance (one local run, not a projection):** on the Windows
laptop used for verification, a conservative isolated sample-clip run processed
**33 frames at 1.4 processed FPS** (`--skip 8 --imgsz 480`). This is worker-reported
end-to-end processed-frame throughput for that run, not source-video FPS and
not a general laptop benchmark. No per-stage timings or end-to-end alert
latency have been instrumented, so this repo does not claim them. Measure on
the recording machine before quoting its result; CPU, thermals, and power mode
can change it materially.

**Detection accuracy:** we did not hand-label our own eval set (a 30-frame
self-graded eval would be weak evidence). The model author reports on the
validation set: mAP@0.50 **0.744**, precision **0.831**, recall **0.685**
(source: the [model card](https://huggingface.co/Hansung-Cho/yolov8-ppe-detection)).
Our contribution is the policy loop on top. Run its integration tests with:

```bash
cd server
npm test
```

The test file is `server/test/policy.test.mjs`; its eight cases exercise
flicker rejection, same-person confirmation, one incident per continuous
episode, in-place escalation with persisted transition history, resolution, a
later repeat episode, acknowledged-to-resolved behavior, and restart
reconciliation of prior active incidents.

## What is real vs. simulated

| Component | Status |
|---|---|
| Person + hard-hat detection | **Real inference** — third-party pretrained YOLOv8 PPE weights, not trained by us. The model repository is tagged MIT; runtime/model and training-data caveats are disclosed below. |
| Violation confirmation (N consecutive frames) | **Real** — our policy engine code. One continuous violation = one incident. |
| Escalation warning → alert → critical | **Real** — our policy engine code. Escalates in place as the violation persists; incident marked resolved when it clears. |
| Incident log + snapshots | **Real** — written by real pipeline runs; a `--reset` / `-ResetData` recording run starts clean after archiving prior evidence. |
| Dashboard transport | **Real** — Socket.IO on localhost. End-to-end alert latency has not been instrumented. |
| Input footage | **Sample** — a downloaded Coverr stock clip, not a live site. Verify the current license/provenance notes in `THIRD_PARTY_NOTICES.md` before redistribution or submission. |
| "Agent" reasoning | **Rule-based** in Stage I (labeled as such). LLM summarization is Stage II. |
| Deployment target | **Laptop** in Stage I. Thunderstorm VM (Intel Arc Pro B70) is the Stage II target — see the proposal deck. |

## Privacy & responsible use

- **Local processing:** video never leaves the machine (Stage I) / the site
  network (Stage II). No cloud uploads, no third-party analytics.
- **No facial recognition:** the model detects *persons* and *hard hats* only.
  No face detection, no identity matching, no biometric templates — by design,
  not just by policy.
- **Configurable retention:** snapshots and the incident log live in `data/`
  (gitignored). Automatic retention/purge is **not implemented** in Stage I;
  a production deployment would need a documented retention policy and job.
- **Human review before action:** SiteGuard raises *alerts for supervisors*,
  not automated penalties. The dashboard's acknowledge flow exists so a human
  confirms every incident before any disciplinary use.
- **Visible honesty:** the dashboard and every public artifact carry a
  `STAGE I PROTOTYPE · SIMULATION` label and a detection-provenance note, so
  no one mistakes the demo for a certified safety system.

## Sample footage provenance

- `coverr-construction-workers-454` (primary demo clip) —
  https://cdn.coverr.co/videos/coverr-construction-workers-454/1080p.mp4 —
  Coverr license permits commercial and non-commercial use without required
  attribution, subject to its restrictions.
- `coverr-construction-worker-walking-6415` (alternate) —
  https://cdn.coverr.co/videos/coverr-construction-worker-walking-6415/1080p.mp4 —
  same license.
- Clips are **not** committed to the repo; download at demo time from the URLs
  above. They are demo inputs only and are not used to train or fine-tune the
  model.

## Third-party and licensing notes

- SiteGuard-authored source is offered under [MIT](LICENSE). That file does
  not relicense third-party packages, model weights, datasets, or footage.
- The `ultralytics` dependency is distributed under AGPL-3.0 for open-source
  use; Ultralytics offers Enterprise licensing for proprietary/commercial
  deployment: https://www.ultralytics.com/license.
- The PPE model repository is tagged MIT, while its card says its unnamed
  public training datasets retain their original providers' licenses. Because
  those datasets are not enumerated, the training-data provenance is not fully
  cleared here for production use:
  https://huggingface.co/Hansung-Cho/yolov8-ppe-detection.
- The demo clip is governed by Coverr's current license:
  https://coverr.co/license.

See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for the consolidated
notice. This is a factual project disclosure, not legal advice; review the
applicable terms or replace the dependency/model before a production or
proprietary deployment.

## Submission status

The working prototype, policy tests, deck **draft content**, and recording
runbook are in the repository. A final PDF/PPTX deck and the ≤3-minute unlisted
YouTube video are not generated or claimed here; they remain submission tasks.
