# DESIGN — SiteGuard Stage I

## Architecture (words, not drawings)
Three processes on one laptop, all localhost:

- **vision-worker** (Python 3.12, `ultralytics`): opens the video file (or webcam), runs the third-party YOLOv8 PPE model per processed frame, associates Hardhat boxes with Person boxes, assigns lightweight overlap-based `trackId` values, draws labels, then POSTs two things to the API server: (1) a JSON detection event, (2) the annotated frame as base64 JPEG. Frame-skipping processes every Nth source frame. This is real third-party inference, not a heuristic; the licensing caveats are documented in `THIRD_PARTY_NOTICES.md`.
- **api-server** (Node.js + Express, port 3000): receives detection events at `POST /api/detections` and frames at `POST /api/frames`; runs the **policy engine**; broadcasts `frame`, `alert`, and `incident` events over Socket.IO; serves the dashboard static page; persists incidents to `data/incidents.json` and snapshots to `data/snapshots/`.
- **dashboard** (single `index.html` + vanilla JS + Socket.IO client): renders the live annotated feed, per-zone compliance chips, an alert banner stack, and the incident log table. No build step.

Data flow: camera/file → vision-worker → (HTTP) → api-server → (Socket.IO) → dashboard. The policy engine is the "agent": it holds per-track episode state across processed frames and acts only on a confirmed violation by that track—one incident per continuous episode, escalated in place, then resolved after the configured clear streak. The tracker is simple bounding-box overlap, not identity recognition or production-grade re-identification.

## Data model
- **Detection** (transient, per frame): `{ frameId, ts, persons: [{ bbox:[x1,y1,x2,y2], hardHat: bool, confidence: float, trackId, method }] }`
- **Incident** (persisted current state + audit history): `{ id, ts, zone, type: "missing_hard_hat", trackId, frames, severity, snapshotPath, status, acknowledgedAt?, resolvedAt?, interruptedAt?, transitions[] }`. On startup, a prior-session `open`/`acknowledged` record becomes terminal `interrupted` because its in-memory episode cannot be reconstructed safely. Consult `server/server.js` for the authoritative schema.
- **Alert** (transient broadcast): `{ incidentId, severity: "warning|alert|critical", message }`
- Zone is a single logical zone ("Zone A") for Stage I — multi-zone mapping is deferred.

## API contracts
- `POST /api/detections` — body: Detection JSON → 202 accepted (policy engine evaluates).
- `POST /api/frames` — body: `{ frameId, jpegBase64 }` → 202 (rebroadcast as `frame` event).
- `GET /api/incidents` — returns persisted incident array (dashboard initial load).
- `POST /api/incidents/:id/ack` — marks acknowledged (dashboard button).
- `GET /api/incidents/export` — returns the current incident log as CSV.
- Socket.IO events (server→client): `frame`, `alert`, `incident`, `stats` (fps, persons-in-frame).

## Key decisions
- Ultralytics/YOLOv8 PPE inference: one runtime plus separately downloaded pretrained weights; no model training in Stage I. The Hugging Face repository is tagged MIT, but the unnamed source-dataset licenses and Ultralytics AGPL-3.0/Enterprise licensing path mean production clearance is a separate task. See `THIRD_PARTY_NOTICES.md`.
- Python worker → Node via HTTP (not stdout piping): debuggable, restartable independently, honest about being two processes.
- Vanilla-JS dashboard: zero build tooling, fastest path to a live page. Rejected: React (build overhead buys nothing for one screen).
- Incidents in `data/incidents.json`: no database for a 4-day proposal prototype; file is human-inspectable, which judges like. Rejected: SQLite/Postgres (overkill).
- Base64 JPEG frames over Socket.IO: intentionally simple and localhost-only; documented as not a production video transport. A conservative verified Windows-laptop run processed 33 frames at 1.4 processed FPS with `--skip 8 --imgsz 480`.

## Risks (top 3) + de-risking
1. **Model/runtime licensing is not fully cleared for production.** The model repository is tagged MIT, but source training datasets are unnamed, and Ultralytics documents AGPL-3.0 or Enterprise paths. De-risk: disclose this for Stage I; obtain appropriate licenses or replace the stack before proprietary/commercial deployment.
2. **Laptop throughput varies and is below the original aspirational target.** The conservative verified baseline is 1.4 processed FPS, not 10 FPS. De-risk: use deterministic footage and documented settings, report the measured number, and benchmark the actual recording laptop.
3. **Tracking is deliberately lightweight.** Bounding-box overlap can change IDs under occlusion or rapid motion. De-risk: keep claims to per-track episodes in the controlled Stage I clip; evaluate a production tracker in Stage II.
4. **Demo-video crunch on Pintu's side.** De-risk: deterministic sample footage + a fixed shot list (`spec/demo-script.md`) so recording is rehearsed rather than improvised.
