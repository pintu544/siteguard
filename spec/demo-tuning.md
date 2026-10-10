# Demo tuning — SiteGuard Stage I video (verified 2026-10-10, re-verified after per-track episode policy)

## Key finding

Both Coverr clips are ~10–11s long (clip1: 10.0s, clip2: 11.2s), so there is no
60–90s continuous segment to select. The 60s demo window (demo-script 0:45–1:45)
is filled by **one fast clip pass (~8s of live incident action)** followed by
narrated walkthrough of the populated dashboard (incident table, snapshot,
acknowledge, escalation story).

## Recommended settings (verified)

| Flag | Value | Why |
|------|-------|-----|
| `--conf` | 0.35 (default) | Detections are high-confidence; raising to 0.5/0.6 changed nothing |
| `--skip` | 8 | Best balance: each violating person gets one incident with the escalation arc |
| `--imgsz` | 480 (default) | ~6 fps end-to-end on the 2-CPU build VM (decode-bound; inference itself ≈16 fps) |

Rejected: `--skip 2` → incident flood (noisy table); `--skip 12` → thinner story;
`--skip 16` → too thin. `--conf 0.5/0.6` → no meaningful change.

## Exact run sequence (Pintu: run verbatim while recording)

One command (recommended):
```
./demo.sh            # Linux/macOS — tuned demo clip
demo.bat             :: Windows (cmd)
.\demo.ps1           # Windows (PowerShell)
```

Manual, if you prefer — Terminal 1, server (from repo root):
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

## What the incident narrative looks like (new per-track episode policy)

One pass of the clip produces **one incident per violating person** (typically
4–5), each **escalating in place** warning → alert → critical as that person's
violation persists — instead of the old behavior of six separate incidents for
one continuous violation. Verified 2026-10-10: e.g. track 1 → critical,
track 5 → critical, track 3 → alert, track 6 → warning. Exact counts vary
slightly run to run with detection variance; the per-person arc is stable.

Narrate it as: "the policy loop confirms the SAME person for 5 consecutive
frames, opens one incident, and escalates it while the violation persists —
no alarm floods, no single-frame false alarms."

## 60-second recording choreography

- **0:00–0:10** — Dashboard open, log empty. Start the worker. Bounding boxes
  appear; "NO HARD HAT" labels track the violators.
- **0:10–0:20** — Incidents open (warning) and escalate to alert/critical.
  Narrate the 5-frame same-person confirmation rule as the first banner fires.
- **0:20–0:45** — Worker finished; dashboard is now a populated evidence board.
  Click an incident → snapshot opens. Acknowledge one. Hit "Export CSV".
  Point at the severity column: "the policy loop, not the detector, is the product."
- **0:45–0:60** — Honesty beat: gesture at the SIMULATION badge — "laptop,
  pretrained detector, rule-based loop; Thunderstorm silicon is Stage II."

## Before recording (Pintu)

```
cd ~/workspace/siteguard
rm -f data/incidents.json data/snapshots/*.jpg
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
- Server policy knobs: `CONFIRM_FRAMES=5`, `CLEAR_FRAMES=20`,
  `ESCALATE_ALERT_FRAMES=15`, `ESCALATE_CRITICAL_FRAMES=30` (env-overridable).
- End-to-end fps is decode-bound on weak CPUs (~6 fps on the 2-CPU build VM);
  inference itself runs ≈16 fps. Fine for screen recording; measure on the
  recording laptop, and fall back to `--skip 12 --imgsz 320` if needed.
