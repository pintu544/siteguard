# Demo script — SiteGuard Stage I video

Target: one English take of about 2:30, safely below the three-minute limit.
Pintu records on the laptop after completing `spec/recording-runbook.md`.

## 0:00–0:20 — Problem

Show the title/problem slide (or the webcam prop only if its preflight passed).

> “PPE checks are usually periodic: a supervisor sees only the moment they walk
> past. SiteGuard turns continuous camera observations into reviewable safety
> incidents.”

## 0:20–0:40 — Architecture

Show the three-box architecture.

> “A local vision worker runs a third-party pretrained PPE detector. Our
> deterministic policy engine confirms the same tracked violation across five
> processed frames, then publishes evidence to this dashboard. Nothing here
> identifies a person.”

## 0:40–1:45 — Live proof

Before recording, launch a clean run with `./demo.sh --reset`, `demo.bat
--reset`, or `.\demo.ps1 -ResetData`. During the take, show the annotated clip,
active-alert area, and incident table together.

> “This is downloaded stock footage, visibly labeled as a Stage I simulation.
> A single-frame miss cannot open an incident. Once the same track violates for
> five consecutive processed frames, SiteGuard opens one warning and escalates
> that incident in place instead of flooding the log. Clip mode uses explicit
> demo-only alert and critical thresholds of ten and fifteen frames.”

After the clip ends, the launcher deliberately keeps the dashboard live. Open
one snapshot, acknowledge an active incident, and click **Export CSV**.

> “Each lifecycle change is persisted with a timestamp. Acknowledgement records
> human review; it does not hide an active hazard. When the violation clears for
> twenty processed frames, the same incident resolves.”

Do not promise an exact incident count—the detector and lightweight tracker can
vary slightly by machine and run.

## 1:45–2:15 — Honest boundary and feasibility

Show the provenance label and, briefly, the README measurement.

> “Stage I is real local inference plus our tested rule-based policy loop. On
> this verification laptop, one conservative 33-frame sampled run measured 1.4 processed
> frames per second. Alert latency is not yet instrumented. The model runtime
> and source-data licensing caveats are disclosed. Thunderstorm deployment,
> multi-camera scale, and LLM summaries are Stage II work—not claims about this
> prototype.”

## 2:15–2:30 — Close

Show the public repository URL.

> “The reproducible code, tests, setup, and third-party notices are public.
> SiteGuard: continuous PPE awareness, with evidence a human can audit.”

Recording notes: capture at 1080p, keep the launcher terminal available for
`Ctrl+C`, close other camera/CPU-heavy apps, check microphone levels, and verify
the exported CSV before uploading the unlisted video.
