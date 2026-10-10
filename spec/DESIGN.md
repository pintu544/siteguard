# DESIGN — SiteGuard Stage I

## Architecture (words, not drawings)
Three processes on one laptop, all localhost:

- **vision-worker** (Python 3.12, `ultralytics`): opens the video file (or webcam), runs YOLOv8n person detection per processed frame, classifies hard-hat presence per person (pretrained PPE model, or labeled heuristic fallback per GRILL Q3), draws bounding boxes + labels on the frame, then POSTs two things to the API server: (1) a JSON detection event, (2) the annotated frame as base64 JPEG. Frame-skipping (process every Nth frame) keeps CPU budgets honest.
- **api-server** (Node.js + Express, port 3000): receives detection events at `POST /api/detections` and frames at `POST /api/frames`; runs the **policy engine**; broadcasts `frame`, `alert`, and `incident` events over Socket.IO; serves the dashboard static page; persists incidents to `data/incidents.json` and snapshots to `data/snapshots/`.
- **dashboard** (single `index.html` + vanilla JS + Socket.IO client): renders the live annotated feed, per-zone compliance chips, an alert banner stack, and the incident log table. No build step.

Data flow: camera/file → vision-worker → (HTTP) → api-server → (Socket.IO) → dashboard. The policy engine is the "agent": it holds per-person episode state across frames (the worker's lightweight bbox tracker gives each person a stable trackId) and only acts on confirmed violations by the same person — one incident per continuous violation, escalated in place, resolved on clear.

## Data model
- **Detection** (transient, per frame): `{ frameId, ts, persons: [{ bbox:[x1,y1,x2,y2], hardHat: bool, confidence: float }] }`
- **Incident** (persisted): `{ id, ts, zone, type: "missing_hard_hat", frames: int, snapshotPath, status: "open|acknowledged" }`
- **Alert** (transient broadcast): `{ incidentId, severity: "warning|alert|critical", message }`
- Zone is a single logical zone ("Zone A") for Stage I — multi-zone mapping is deferred.

## API contracts
- `POST /api/detections` — body: Detection JSON → 202 accepted (policy engine evaluates).
- `POST /api/frames` — body: `{ frameId, jpegBase64 }` → 202 (rebroadcast as `frame` event).
- `GET /api/incidents` — returns persisted incident array (dashboard initial load).
- `POST /api/incidents/:id/ack` — marks acknowledged (dashboard button).
- Socket.IO events (server→client): `frame`, `alert`, `incident`, `stats` (fps, persons-in-frame).

## Key decisions
- ultralytics/YOLOv8n: one `pip install`, pretrained weights, no training possible in 4 days. Rejected: training a custom PPE model (no time, no labeled data).
- Python worker → Node via HTTP (not stdout piping): debuggable, restartable independently, honest about being two processes.
- Vanilla-JS dashboard: zero build tooling, fastest path to a live page. Rejected: React (build overhead buys nothing for one screen).
- Incidents in `data/incidents.json`: no database for a 4-day proposal prototype; file is human-inspectable, which judges like. Rejected: SQLite/Postgres (overkill).
- Base64 JPEG frames over Socket.IO at ~10fps, 720p: heavy but localhost-only and fine for Stage I; documented as "not a production transport."

## Risks (top 3) + de-risking
1. **No reliable pretrained hard-hat model found.** De-risk: T1 is a strict 3-hour research spike (run inference on a real image, check license). If it fails, the labeled-heuristic fallback is already spec'd (FR-3) — the plan survives either outcome.
2. **Laptop CPU can't sustain 10 FPS with detection running.** De-risk: YOLOv8n (nano) only, frame-skipping, 480p fallback; NFR-1 says "document the actual number achieved" — honesty over hitting the number.
3. **Demo-video crunch on Pintu's side.** De-risk: deterministic sample footage + a fixed shot list (`spec/demo-script.md`) so recording is one take, not an exploration.
