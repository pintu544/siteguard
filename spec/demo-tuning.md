# Demo tuning — SiteGuard Stage I video (verified 2026-10-10)

## Key finding

Both Coverr clips are ~10–11s long (clip1: 10.0s, clip2: 11.2s), so there is no
60–90s continuous segment to select. The 60s demo window (demo-script 0:45–1:45)
is filled by **one fast clip pass (~8s of live incident action)** followed by
narrated walkthrough of the populated dashboard (incident table, snapshot,
acknowledge, escalation story).

## Recommended settings (verified, reproducible across 3 runs)

| Flag | Value | Why |
|------|-------|-----|
| `--conf` | 0.35 (default) | Detections are high-confidence; raising to 0.5/0.6 changed nothing |
| `--skip` | 8 | 6 incidents with the full escalation arc; higher skip loses the story, lower skip floods the table |
| `--imgsz` | 480 (default) | ~4 fps wall-clock on CPU; fine for screen recording |

Rejected: `--skip 2` → 26 incidents (table flood, all critical — noisy);
`--skip 12` → 4 incidents, no critical (weaker story); `--skip 16` → 3 incidents
(too thin). `--conf 0.5/0.6` → identical 26-incident flood at skip 2.

## Exact run sequence (Pintu: run verbatim while recording)

Terminal 1 — server (from repo root):
```
cd ~/workspace/siteguard
PORT=3000 node server/server.js
```

Terminal 2 — worker (**must run from inside vision-worker/** — the model path is relative):
```
cd ~/workspace/siteguard/vision-worker
./venv/bin/python worker.py --video ../.tmp/demo-clip.mp4 --server http://localhost:3000 --conf 0.35 --skip 8 --imgsz 480
```

Dashboard (open BEFORE starting the worker, full-window for the recording):
```
http://localhost:3000
```

## What the incident narrative looks like

One pass of the clip (11.2s source, ~8s wall-clock) produces **exactly 6 incidents**:

| # | Severity | Violators | Story beat |
|---|----------|-----------|------------|
| 1 | warning  | 2 | First confirmation — "the loop waits for 5 consecutive frames, no single-frame alarms" |
| 2 | warning  | 2 | Repeat violation, still warning |
| 3 | alert    | 2 | Escalation kicks in — banner turns red |
| 4 | alert    | 2 | Sustained non-compliance |
| 5 | alert    | 2 | — |
| 6 | critical | 2 | Peak escalation — "this is what a safety officer gets woken up for" |

Each incident lands with a timestamped snapshot in the log table (~1.3s apart —
lively but narratable). The dashboard keeps the `STAGE I PROTOTYPE · SIMULATION`
badge and provenance line throughout (honesty labels intact, verified in UI).

## 60-second recording choreography

- **0:00–0:10** — Dashboard open, log empty. Start the worker. Bounding boxes
  appear; "NO HARD HAT" labels track the violators.
- **0:10–0:20** — The 6 incidents land with the warning → alert → critical arc.
  Narrate the 5-frame confirmation rule as the first banner fires.
- **0:20–0:45** — Worker finished; dashboard is now a populated evidence board.
  Click an incident → snapshot opens. Acknowledge one. Point at the escalation
  column: "the policy loop, not the detector, is the product."
- **0:45–0:60** — Honesty beat: gesture at the SIMULATION badge — "laptop,
  pretrained detector, rule-based loop; Thunderstorm silicon is Stage II."

## Before recording (Pintu)

```
cd ~/workspace/siteguard
echo "[]" > data/incidents.json
rm -f data/snapshots/*.jpg
```
The log must start empty — it fills only from the live run (honesty rule).

## Footage provenance (for README/deck references slide)

- Clip: `coverr-construction-workers-454` (1080p), Coverr royalty-free
  commercial-use license, no attribution required, no watermark.
- Local copy: `.tmp/demo-clip.mp4` — **gitignored, never commit**.
- Download URL (if re-needed): https://cdn.coverr.co/videos/coverr-construction-workers-454/1080p.mp4
- Alternate clip (unused): `coverr-construction-worker-walking-6415`,
  https://cdn.coverr.co/videos/coverr-construction-worker-walking-6415/1080p.mp4

## Caveats

- `--webcam` flag exists but was **not tested** (no camera on this machine) —
  Pintu must verify it on his laptop before the webcam-prop take.
- Incident pacing (~1.3s apart) is brisk; if it feels rushed on camera,
  `--skip 12` gives 4 slower incidents (warning, warning, alert, alert) as fallback.
- Server policy knobs (`CONFIRM_FRAMES=5`, `ESCALATE_AFTER=3`) were left at
  defaults — tuning was worker-flags only, no code changed.
