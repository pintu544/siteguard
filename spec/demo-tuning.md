# Demo tuning — SiteGuard Stage I

Verified on October 10, 2026 after the per-track episode-policy changes.

## Evidence-based settings

| Setting | Demo value | Evidence |
|---|---:|---|
| Confidence | `0.35` | Preserves the useful PPE detections in the selected clip |
| Frame skip | `8` | Produces 33 processed frames from the selected clip and enough samples for confirmation/escalation |
| Inference size | `480` | A conservative Windows-laptop verification measured 33 processed frames at 1.4 processed FPS |
| Confirmation | `5` frames | Normal policy default; covered by integration tests |
| Clip escalation | alert `10`, critical `15` | Explicit demo-only launcher settings so the short clip can show the arc |
| Normal escalation | alert `15`, critical `30` | Server defaults for manual/webcam runs |
| Resolution | `20` clear frames | Server default |

A comparison run at `--imgsz 320` measured only 0.9 processed FPS on the same
laptop. It is therefore not presented as a universal speed optimization. No
per-stage timings or browser-render latency were instrumented.

## Recommended clean launch

```bash
./demo.sh --reset
```

```powershell
.\demo.ps1 -ResetData
```

```bat
demo.bat --reset
```

The reset option archives prior evidence under `.tmp/data-backup-*`; it does
not delete it. All launchers reject an occupied port 3000, start the server and
worker, open the browser, and keep the dashboard live after clip EOF. Press
`Ctrl+C` after inspecting snapshots, acknowledging an incident, and exporting
CSV.

## Manual equivalent

Terminal 1 from the repository root:

```bash
PORT=3000 ESCALATE_ALERT_FRAMES=10 ESCALATE_CRITICAL_FRAMES=15 node server/server.js
```

Terminal 2 from `vision-worker/`:

```bash
./venv/bin/python worker.py --video ../.tmp/demo-clip.mp4 \
  --server http://localhost:3000 --conf 0.35 --skip 8 --imgsz 480
```

On Windows, use `venv\Scripts\python.exe` and set the three environment
variables with PowerShell or use the provided launcher.

## Narrative to demonstrate

The worker assigns lightweight overlap-based `trackId` values. The policy must
observe five consecutive violation frames for one track before opening an
incident. A continuous episode updates that same incident rather than flooding
the table. Severity changes are persisted in `transitions[]`; acknowledgement
is retained, and the incident resolves after 20 processed frames without that
tracked violation. If the server stops first, its next startup records a
terminal `session_interrupted` transition instead of reviving a stale alert.

Exact person tracks and incident counts may vary slightly with inference. Do
not script a claim such as “six incidents.” Rehearse on the recording laptop
and show the lifecycle that actually appears.

Suggested 60-second screen-recording beat:

- Begin with the clean dashboard and start the clip.
- Narrate same-track confirmation when the first warning appears.
- Show an incident escalating in place rather than multiplying.
- After clip EOF, open a snapshot, acknowledge an active incident, and export
  CSV while the launcher intentionally keeps the server alive.
- Close with the visible simulation/provenance label and Stage II boundary.

## Provenance and limitations

- Primary clip: `coverr-construction-workers-454`, downloaded to the ignored
  `.tmp/demo-clip.mp4` path.
- Coverr’s current license applies; the clip is an inference-demo input, not
  training data. See `THIRD_PARTY_NOTICES.md`.
- The webcam path requires a physical-camera preflight and is not verified by
  automated tests.
- The tracker is lightweight bounding-box overlap, not biometric identity or
  production-grade re-identification.
- The verified 1.4 processed-FPS result is one machine/run, not a promise for
  all laptops or the Thunderstorm platform.
