# SPEC — SiteGuard Stage I proposal package

## Problem
Construction sites lose workers to preventable head injuries, yet PPE compliance is still checked by humans walking the site with clipboards — spotty, unrecorded, and impossible to audit. SiteGuard is an agentic AI safety copilot: it watches site camera feeds, detects hard-hat violations in real time, and turns each violation into an auditable incident with an alert — so safety officers act on evidence instead of anecdotes. Stage I proves the loop on a laptop with a simulation prototype; Stage II ports it to Thunderstorm silicon.

## Users
- Safety officer / site supervisor: watches the live dashboard, acknowledges alerts, exports the incident log.
- Hackathon judges (Stage I): evaluate the proposal deck, demo video, and repo.

## Functional requirements (Stage I slice)
- FR-1: The system SHALL ingest video from a file (primary input); webcam input is a stretch toggle.
- FR-2: The system SHALL detect persons per processed frame using real YOLOv8n inference (ultralytics).
- FR-3: The system SHALL classify hard-hat presence per detected person via a pretrained PPE model; if the T1 spike finds no reliable license-clear model, a heuristic MAY stand in, and the UI/README/deck SHALL label it "SIMULATED".
- FR-4: The policy engine SHALL raise a violation alert only after N consecutive frames of the same person without a hard hat (N configurable, default 5) — no single-frame false alarms.
- FR-5: The system SHALL open exactly one incident per continuous violation by
  the same tracked person, escalating it in place (warning → alert → critical)
  as the violation persists, and mark it resolved once the violation genuinely
  clears; each transition is logged.
- FR-6: The system SHALL stream annotated frames and alerts to the dashboard over WebSocket with end-to-end alert latency < 2s on a laptop.
- FR-7: The system SHALL append every confirmed violation to an incident log (`data/incidents.json`) with timestamp, zone, violation type, and snapshot path; the log starts empty and fills only from real pipeline runs.
- FR-8: The dashboard SHALL show the live annotated feed, per-zone compliance status, active alerts, and the incident log.
- FR-9: Every simulated or third-party-pretrained component SHALL carry a visible "SIMULATION" / provenance label in the UI, README, and deck. No overclaiming, anywhere.
- FR-10: The repo README SHALL document architecture, setup, how to run, and the exact real-vs-simulated boundary.
- FR-11: The proposal deck SHALL be ≤20 pages and cover all six required sections: scenario + problem, tools + methods, expected outcomes, HW/SW architecture, references, GitHub code-documentation link.

## Non-functional
- NFR-1: ≥10 FPS on 720p input on a standard laptop CPU (frame-skipping permitted; document the actual number achieved).
- NFR-2: Alert latency (violation confirmed → dashboard banner) < 2s.
- NFR-3: Reviewer setup from README ≤15 minutes (documented steps; not independently verified in Stage I — stated honestly).
- NFR-4: No secrets in the repo; sample-footage source + license documented in `spec/research.md`.

## Judging-criteria mapping
- Innovation & Creativity (30%): FR-4/FR-5 agentic perceive→reason→act loop with escalation — the detector is commodity, the policy loop is the idea.
- Commercial Potential & Feasibility (35%): real YOLO pipeline on commodity hardware today + credible port to Thunderstorm VM (367 TOPS) for Stage II; construction compliance is a funded, real market.
- Practical Value (25%): FR-7/FR-8 — an auditable incident record a safety officer can act on, not a demo overlay.
- Storytelling & Presentation (10%): demo video + deck.

## Out of scope (Stage I)
Multi-camera; LLM-based reasoning or incident summarization; SMS/email/push integrations (webhook hook-point only); model training or fine-tuning; Thunderstorm VM deployment (laptop only — target architecture lives in the deck); auth/multi-user; cloud hosting; the demo-video recording itself (Pintu records); any work beyond the Oct 14, 14:30 IST submission.
