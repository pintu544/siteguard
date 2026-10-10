# TASKS — SiteGuard Stage I

Ordered by dependency. Each task ≤ half a day with acceptance criteria. "Done means" is literal.

## Slice 1 — Stage I proposal package (Oct 10 → Oct 14, 14:30 IST)

- [ ] **T1 — PPE-model research spike (≤3h, unblocks T3).** Find a pretrained hard-hat/PPE detection model (YOLOv8-compatible), verify its license, run inference on one real image. Done means: model name + license + sample output recorded in `spec/research.md`, OR a written decision to use the labeled heuristic. Timebox is hard — no rabbit holes.
- [ ] **T2 — Repo scaffold (1h).** Public repo `pintu544/siteguard`: README skeleton, `.gitignore` (data/, *.pt, venv), LICENSE (MIT), `vision-worker/`, `server/`, `dashboard/`, `data/` dirs. Done means: repo is public and README renders on GitHub. (Parallel with T1.)
- [ ] **T3 — Vision worker (half day, after T1).** Video-file ingestion (webcam flag as stretch), YOLOv8n person detection, hard-hat classification, annotated-frame JPEG output, HTTP POST of events + frames. Done means: processes the sample clip end-to-end and the server logs sane detection JSON.
- [ ] **T4 — API server + policy engine + incident log (half day, after T3).** Express + Socket.IO, consecutive-frame confirmation (N=5 default), warning→alert→critical escalation, `data/incidents.json` persistence, snapshot saving. Done means: a scripted violation sequence produces exactly one incident with N-frame confirmation and correct escalation — no single-frame false positives.
- [ ] **T5 — Dashboard (half day, after T4).** Live annotated feed, per-zone status chips, alert banner stack, incident-log table with acknowledge buttons. Done means: opened in a browser, a live violation visibly triggers the banner and a new log row within 2s.
- [ ] **T6 — E2E rehearsal + honesty pass (2h, after T5).** Full loop run; every simulated/third-party element gets its visible label; record the actual FPS achieved and write it into the README. Done means: the 60–90s proof recording exists and every label is in place.
- [ ] **T7 — README as code documentation (2h, after T6).** Architecture, setup, run instructions, real-vs-simulated boundary, footage license. Done means: a fresh-terminal run following only the README reproduces the demo.
- [ ] **T8 — Deck content (half day, parallel with T6/T7).** Full ≤20-page deck content per `spec/deck-outline.md`, all six required sections. Done means: content complete and page-counted ≤20 (tooling per Pintu's answer on assembly).
- [ ] **T9 — Demo shot list + script for Pintu (1h, after T6).** Fixed script for the ≤3-min unlisted YouTube video. Done means: `spec/demo-script.md` lets Pintu record in one take.
- [ ] **T10 — Submission assembly (Oct 14 morning, 2h buffer).** Verify deck page count, video unlisted + link works, repo public + link works, submit via Bounty Hunter. Done means: platform shows submission confirmed, before 14:30 IST.

## Slice 2 — Stage II (Dec, if shortlisted; OUT OF SCOPE for Stage I)
Port pipeline to Thunderstorm VM (Intel Arc Pro B70), LLM incident summarization, multi-camera + zone mapping, SMS/email alert integrations, site-specific fine-tuning, auth. Not planned in detail until shortlist is announced (Oct 26).

## Critical-path order
T1 → T3 → T4 → T5 → T6 → T7 → T10, with T2 and T8 running in parallel. The longest chain is ~3 days of build + 1 day of packaging; the buffer is T10's morning slot on Oct 14.
