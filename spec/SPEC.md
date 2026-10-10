# SPEC — SiteGuard Stage I proposal package

## Problem
Construction sites lose workers to preventable head injuries, yet PPE compliance is still checked by humans walking the site with clipboards — spotty, unrecorded, and impossible to audit. SiteGuard is an agentic AI safety copilot: it watches site camera feeds, detects hard-hat violations in real time, and turns each violation into an auditable incident with an alert — so safety officers act on evidence instead of anecdotes. Stage I proves the loop on a laptop with a simulation prototype; Stage II ports it to Thunderstorm silicon.

## Users
- Safety officer / site supervisor: watches the live dashboard, acknowledges alerts, exports the incident log.
- Hackathon judges (Stage I): evaluate the proposal deck, demo video, and repo.

## Functional requirements (Stage I slice)
- FR-1: The system SHALL ingest video from a file (primary input) and expose a webcam input option. The webcam path remains machine-dependent and must be smoke-tested on the recording laptop.
- FR-2: The system SHALL detect persons and PPE per processed frame using real inference from the third-party `Hansung-Cho/yolov8-ppe-detection` YOLOv8 weights through the Ultralytics runtime.
- FR-3: The system SHALL classify hard-hat presence by associating detected Hardhat boxes with detected Person boxes. The UI/README/deck SHALL name the model and distinguish third-party perception from SiteGuard's policy code.
- FR-4: The policy engine SHALL raise a violation alert only after N consecutive frames of the same person without a hard hat (N configurable, default 5) — no single-frame false alarms.
- FR-5: The system SHALL open exactly one incident per continuous violation by
  the same tracked person, escalating it in place (warning → alert → critical)
  as the violation persists, and mark it resolved once the violation genuinely
  clears. The persisted incident SHALL expose its current severity and status,
  and SHALL append each lifecycle change to `transitions[]`. On server restart,
  an active prior-session record SHALL become terminal `interrupted`, not remain
  a stale active alert and not be mislabeled `resolved` without clear-frame
  evidence.
- FR-6: The system SHALL stream annotated frames, alerts, incident updates, and stats to the dashboard over Socket.IO on localhost. No latency number SHALL be presented until it has been instrumented and measured.
- FR-7: The system SHALL append every confirmed violation to an incident log (`data/incidents.json`) with timestamp, zone, violation type, and snapshot path; the log starts empty and fills only from real pipeline runs.
- FR-8: The dashboard SHALL show the live annotated feed, per-zone compliance status, active alerts, and the incident log, and SHALL support acknowledgement and CSV export.
- FR-9: Every simulated or third-party-pretrained component SHALL carry a visible "SIMULATION" / provenance label in the UI, README, and deck. No overclaiming, anywhere.
- FR-10: The repo README SHALL document architecture, setup, how to run, and the exact real-vs-simulated boundary.
- FR-11: The proposal deck SHALL be ≤20 pages and cover all six required sections: scenario + problem, tools + methods, expected outcomes, HW/SW architecture, references, GitHub code-documentation link.

## Non-functional
- NFR-1: Document processed-frame throughput and the exact run settings instead of asserting a generic laptop target. The conservative verified Windows-laptop baseline is one 33-frame sample-clip run at 1.4 processed FPS with `--skip 8 --imgsz 480`.
- NFR-2: Treat end-to-end alert latency as unmeasured until timestamps are captured at detection, policy decision, and browser render.
- NFR-3: Provide reproducible one-time setup plus one-command launchers. Fresh-machine setup duration has not been independently measured and SHALL NOT be claimed.
- NFR-4: No secrets in the repo; sample-footage source + license documented in `spec/research.md`.

## Judging-criteria mapping
- Innovation & Creativity (30%): FR-4/FR-5 agentic perceive→reason→act loop with escalation — the detector is commodity, the policy loop is the idea.
- Commercial Potential & Feasibility (35%): real YOLO pipeline on commodity hardware today + credible port to Thunderstorm VM (367 TOPS) for Stage II; construction compliance is a funded, real market.
- Practical Value (25%): FR-7/FR-8 — an auditable incident record a safety officer can act on, not a demo overlay.
- Storytelling & Presentation (10%): demo video + deck.

## Out of scope (Stage I)
Multi-camera; LLM-based reasoning or incident summarization; SMS/email/push integrations; model training or fine-tuning; Thunderstorm VM deployment (laptop only — target architecture lives in the deck); auth/multi-user; cloud hosting; automated retention; the demo-video recording itself (Pintu records); any work beyond the Oct 14, 14:30 IST submission. No outbound webhook is implemented in Stage I.
