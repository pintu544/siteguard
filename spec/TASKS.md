# TASKS — SiteGuard Stage I

Status reconciled with the repository on October 10, 2026. A checked item
means its repository work is present; manual submission artifacts remain
unchecked. Third-party licensing is assessed and disclosed, not represented as
production-cleared.

## Slice 1 — Stage I proposal package (Oct 10 → Oct 14, 14:30 IST)

- [x] **T1 — PPE-model research spike.** Selected
  `Hansung-Cho/yolov8-ppe-detection`, ran it on the demo clip, and recorded the
  result and caveats in `spec/research.md`. The repository is tagged MIT, but
  source-dataset provenance is incomplete and Ultralytics has separate
  AGPL-3.0/Enterprise terms; see `THIRD_PARTY_NOTICES.md`.
- [x] **T2 — Repository scaffold.** Public repository, project directories,
  ignore rules, and an MIT license for SiteGuard-authored source are present.
  That license does not relicense dependencies, weights, datasets, or footage.
- [x] **T3 — Vision worker.** Video/webcam ingestion, PPE inference,
  lightweight `trackId` assignment, annotated JPEG frames, and HTTP events are
  implemented.
- [x] **T4 — API server + policy engine + incident log.** Same-track
  consecutive-frame confirmation, in-place warning → alert → critical
  escalation, clear resolution, transition history, snapshots, acknowledgement,
  persistence, and CSV export are implemented and integration-tested.
- [x] **T5 — Dashboard.** Live annotated feed, zone state, active-alert stack,
  incident table, snapshots, acknowledgement, and export are implemented.
  Alert latency is deliberately reported as unmeasured.
- [x] **T6 — E2E rehearsal + honesty pass.** A local clip run processed 33
  sampled frames at 1.4 processed FPS with `--skip 8 --imgsz 480`; the measured
  result and simulation/provenance boundaries are documented. This is not the
  final submission recording.
- [x] **T7 — README as code documentation.** Architecture, pinned setup,
  one-command launchers, reset/archive behavior, measured throughput, real vs.
  simulated boundaries, and third-party notices are documented. Repeat the
  setup on the actual recording laptop as a submission preflight.
- [x] **T8 — Deck content draft.** `spec/deck-draft.md` contains the required
  sections and honest Stage I/Stage II boundary. A final PDF/PPTX has not yet
  been assembled or page-count verified.
- [x] **T9 — Demo runbook and script.** The recording flow is documented in
  `spec/recording-runbook.md` and `spec/demo-script.md`.
- [ ] **T10 — Submission assembly.** Assemble and verify the final deck, record
  and upload the ≤3-minute unlisted YouTube video, confirm all public links,
  submit through the official portal, and retain submission confirmation before
  October 14, 2026 at 14:30 IST.

## Slice 2 — Stage II (if shortlisted; out of scope for Stage I)

Port and benchmark on the Thunderstorm VM, then consider multi-camera/zone
mapping, LLM incident summaries, outbound notification integrations,
site-specific detector work, authentication, and production retention. No
performance or integration result is claimed before that work is completed.

## Critical path remaining

Recording-laptop preflight → final deck assembly/page-count check → one-take
demo recording → upload/link verification → submission confirmation.
