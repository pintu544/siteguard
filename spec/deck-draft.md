# SiteGuard — Stage I Proposal Deck (draft content)

**Event:** ASUS UGen AI League Innovation Hackathon — Battlefield Thunderstorm · Global Online Track · Workplace AI theme
**Team:** Pintu Kumar (solo) · **Stage I deadline:** Oct 14, 2026, 14:30 IST
**Repo:** https://github.com/pintu544/siteguard

16 slides total (≤20-page cap respected). One section per slide: title, bullets, speaker notes.

---

## Slide 1 — Title

**SiteGuard: Agentic AI Workplace Safety Copilot**
- Real-time hard-hat (PPE) violation detection → auditable incident response
- Battlefield Thunderstorm · Global Online Track · Workplace AI
- Pintu Kumar — solo entry
- Stage I proposal · October 2026

> Speaker notes: Set the frame in 15 seconds — this is a *safety copilot*, not a detector demo. The detector is commodity; the closed perceive → reason → act loop is the product.

---

## Slide 2 — The problem: preventable head injuries

**Construction sites lose workers to head injuries that PPE would have prevented.**
- Hard hats only work when they are worn — compliance is the gap, not the equipment
- Violations happen continuously across large, dynamic sites
- A single serious incident costs far more than continuous monitoring ever will
- Anchor stat (ILO, via EHS Today): at least **60,000 fatal construction accidents occur worldwide each year** — about **one death every 10 minutes** — and construction accounts for roughly **17% of all fatal workplace accidents** (source: https://www.ehstoday.com/archive/article/21906775/ilo-releases-report-for-workers-memorial-day)

> Speaker notes: Do not read a stat you cannot source. Pick one anchor number from ILO, BLS, or India's DGFASLI/NSC data and cite it on the slide. One number, one source — that is the whole credibility move on this slide.

---

## Slide 3 — Why today's checks fail

**PPE compliance is still enforced by humans with clipboards.**
- Spot checks: a supervisor walks the site a few times a day — coverage is minutes, not hours
- Unrecorded: what was seen, where, and when lives in memory or on paper
- Unauditable: no evidence trail when an incident is investigated afterwards
- Unscalable: more site area means more supervisors, linearly

> Speaker notes: This is the "why now" slide. Every limitation maps to a SiteGuard feature on the next slides (continuous → camera feed; recorded → incident log; auditable → snapshots + timestamps).

---

## Slide 4 — What SiteGuard changes

**From anecdotes to evidence: a closed loop that never blinks.**
- Watches: ingests site camera feeds continuously
- Detects: flags missing hard hats per person, per frame
- Confirms: acts only after N consecutive frames — no single-frame false alarms
- Responds: escalates warning → alert → critical, logs every incident with a snapshot
- Result: the safety officer acts on a timestamped evidence trail, not a rumor

> Speaker notes: Five verbs, one loop. This is the elevator version of the whole proposal — if a judge remembers one slide, make it this one.

---

## Slide 5 — Intended tools & methods (overview)

**Commodity perception, original policy loop — built on a proven stack.**
- Perception: YOLOv8 PPE detection (pretrained, open weights, MIT license)
- Reasoning: deterministic policy engine — N-frame confirmation + zone escalation
- Transport: Express + Socket.IO real-time pipeline, vanilla-JS dashboard
- Data: JSON incident log + frame snapshots — human-inspectable, no database needed
- The "agent" is the loop: it holds state across frames and acts only on confirmed, repeated violations

> Speaker notes: Pre-empt the "it's just YOLO" objection here: say it out loud — detection is the commodity input, the agentic contribution is stateful reasoning over time (confirmation, escalation, audit). That maps directly to the 30% Innovation criterion.

---

## Slide 6 — Perception: real inference, named model

**Person + hard-hat detection runs real neural inference — not a mock.**
- Model: `Hansung-Cho/yolov8-ppe-detection` (YOLOv8-compatible, `best.pt` 6.25 MB)
- License: MIT — explicitly declared on the model card, verified before use
- Classes include Person, Hardhat, No-Hardhat, Safety Vest (~10 total); hard-hat presence = Hardhat box overlapping Person box
- Verified on real images: construction clip frames detect Person 0.88 / Vest 0.80 / Hardhat 0.49; a No-Hardhat frame scores 0.90 — both the compliant and violation paths confirmed
- Known limitation (stated, not hidden): on one test photo the model found the person (0.67) but missed a green hard hat — edge cases like this are exactly what the N-frame confirmation exists to absorb

> Speaker notes: Naming the model + license + a disclosed miss is the honesty flex. Judges in this track know detectors are imperfect; showing you measured the failure mode and engineered around it (next slide) is stronger than claiming 99% accuracy.

---

## Slide 7 — The agentic policy loop: perceive → reason → act

**Deterministic in Stage I — every rule is code you can read, no black boxes.**
- PERCEIVE: vision worker posts per-frame detections (person boxes + hard-hat flags)
- REASON: violation confirmed only after **N = 5 consecutive frames** of the same person without a hard hat (configurable); repeats per zone escalate **warning → alert → critical**
- ACT: WebSocket broadcast to dashboard, incident appended to log with snapshot, webhook hook-point for future SMS/email
- Why deterministic, not an LLM planner, in Stage I: a safety system must be explainable — "the 5th consecutive frame triggered it" is an auditable reason; Stage II adds LLM incident *summaries*, never LLM *decisions*

> Speaker notes: This is the Innovation-criterion slide (30%). Hammer the distinction: the loop is stateful and explainable. LLM-as-decider would be a liability story; LLM-as-summarizer in Stage II is the responsible upgrade path.

---

## Slide 8 — Real-time pipeline & incident record

**From photon to banner in under 2 seconds — and everything is logged.**
- Transport: annotated JPEG frames + detection JSON over HTTP (worker → server); live feed, alerts, and incidents over Socket.IO (server → dashboard)
- Alert-latency design target: **< 2 s** from violation confirmation to dashboard banner
- Measured throughput: **9.9 FPS end-to-end** at 480p inference on a laptop CPU (frame-skipping keeps the budget honest)
- Every confirmed incident persists: `{ id, timestamp, zone, type, frame count, snapshot path, status }` — the log starts empty and fills only from real pipeline runs
- Dashboard: live annotated feed, per-zone compliance chips, alert stack, incident table with acknowledge buttons — zero build step

> Speaker notes: 9.9 FPS is the measured number — say "≈10 FPS measured at 480p" and move on. The <2s is a design target; do not present it as measured. The empty-log-fills-from-real-runs line is the Practical Value story (25%).

---

## Slide 9 — What's real vs. simulated (stated plainly)

**Stage I runs on a laptop. Everything below is labeled in the UI, README, and here.**

| Component | Status |
|---|---|
| Person + hard-hat detection | Real inference — third-party pretrained YOLOv8 model (MIT), not trained by us |
| N-frame confirmation, escalation, incident log | Real — our policy-engine code |
| Alert latency, dashboard, snapshots | Real — WebSocket on localhost |
| Input footage | Sample — royalty-free Coverr stock clips (commercial-use license, no attribution required), not a live site |
| "Agent" reasoning | Rule-based in Stage I (labeled as such); LLM reasoning is Stage II |
| Deployment | Laptop in Stage I; Thunderstorm VM is the Stage II target |

> Speaker notes: Read the table title out loud and pause. In a field of overclaimed hackathon decks, the team that labels its simulation wins trust — and trust is what the 35% Commercial/Feasibility criterion is actually scoring.

---

## Slide 10 — Expected outcomes: Stage I

**By Oct 14: a working loop on a laptop, measured and auditable.**
- ✅ Working prototype: video file (or webcam) → detection → confirmed violations → live dashboard → incident log
- ✅ Measured numbers: ≈10 FPS @ 480p, <2s alert-latency design, N=5 confirmation, 3-level escalation — all documented in the README
- ✅ Demo video (≤3 min): the loop running on sample construction footage, both compliant and violation states shown
- ✅ Public repo with setup instructions a reviewer can follow
- What Stage I deliberately does NOT claim: multi-camera, LLM reasoning, cloud hosting, Thunderstorm deployment

> Speaker notes: Checkboxes = done-or-dated. Every "expected" here is either already measured (FPS) or a dated deliverable (video, repo). Nothing on this slide is a wish.

---

## Slide 11 — Expected outcomes: Stage II (if shortlisted)

**The same loop, ported to Thunderstorm silicon — Nov 6 → Dec 4.**
- Port the pipeline to the organizer-provided VM (Intel Arc Pro B70, 32 GB, up to 367 TOPS INT8) — the current CPU-bound 10 FPS becomes headroom for higher resolution and more streams
- Multi-camera input with per-zone mapping (Stage I is a single logical zone)
- LLM incident *summarization* over the auditable log (decisions stay rule-based)
- Alert integrations: SMS / email / push via the webhook hook-point already in the architecture
- Site-specific fine-tuning of the detector on real site footage
- Final: ≤10-min demo running on the designated platform + full repo with architecture diagram and performance validation data

> Speaker notes: Every Stage II bullet is an "if shortlisted" — say so. The Thunderstorm story is credible precisely because Stage I already runs the full loop; Stage II is a port and scale-up, not a rewrite.

---

## Slide 12 — HW/SW architecture: components

**Three processes on one laptop (Stage I) — every box is built or explicitly planned code.**

```
video file / webcam
      │
      ▼
┌──────────────┐   HTTP POST      ┌──────────────┐   Socket.IO   ┌───────────┐
│ vision-worker│  /api/detect-    │  api-server  │ ───────────▶ │ dashboard │
│ (Python 3.12 │  ions, /frames   │  (Node.js +  │              │ (browser,  │
│  ultralytics)│                  │  Express)    │              │ vanilla JS)│
│  YOLOv8 PPE  │                  │  policy      │              └───────────┘
│  inference   │                  │  engine      │
└──────────────┘                  └──────┬───────┘
                                        │ writes
                                        ▼
                                 data/incidents.json
                                 data/snapshots/
```

- **vision-worker**: video ingestion → YOLOv8 PPE inference → annotated frames → POSTs detection JSON + base64 JPEG
- **api-server**: policy engine (N-frame confirmation, escalation), Socket.IO broadcast, incident persistence, serves the dashboard
- **dashboard**: live feed, zone chips, alert banners, incident table — no build step
- Deliberate choices: HTTP between worker and server (independently debuggable/restartable); JSON file for incidents (human-inspectable, right-sized for a prototype); base64 JPEG over localhost (documented as "not a production transport")

> Speaker notes: Walk the diagram top to bottom in 30 seconds. The "deliberate choices" bullets pre-empt architecture questions — each names the rejected alternative implicitly (why not stdout piping, why not Postgres, why not a video stream).

---

## Slide 13 — Data flow & API contracts

**Typed at every boundary — the loop is inspectable, not magic.**
- Detection (transient, per frame): `{ frameId, ts, persons: [{ bbox, hardHat: bool, confidence }] }`
- Incident (persisted): `{ id, ts, zone, type: "missing_hard_hat", frames, snapshotPath, status: open|acknowledged }`
- Alert (transient broadcast): `{ incidentId, severity: warning|alert|critical, message }`
- `POST /api/detections` → 202 (policy engine evaluates) · `POST /api/frames` → 202 (rebroadcast)
- `GET /api/incidents` (dashboard initial load) · `POST /api/incidents/:id/ack` (acknowledge button)
- Socket.IO server→client: `frame`, `alert`, `incident`, `stats` (fps, persons-in-frame)
- Knobs: `CONFIRM_FRAMES=5`, `ESCALATE_AFTER=3`, `--skip N`, `--conf 0.35`, `--imgsz 480`

> Speaker notes: This slide is for the technical judges. The contracts show the system was designed, not demoed-into-existence. Mention the knobs line — configurability signals engineering maturity.

---

## Slide 14 — Stage I deployment: the laptop

**The whole system runs on commodity hardware today — that is the feasibility argument.**
- One laptop, three processes, all localhost; no cloud, no GPU, no special hardware
- Prerequisites: Python 3.12, Node.js 18+, `pip`, `npm` — setup documented in the README, reviewer path ≤15 minutes
- Model weights (6.25 MB, MIT) download once from Hugging Face; excluded from the repo via `.gitignore` — nothing proprietary is smuggled in
- 480p inference keeps a laptop CPU at ≈10 FPS; 640p is ~9× slower on CPU, so 480p is the documented operating point (frame-skipping available)
- No secrets in the repo; footage downloaded at demo time from documented URLs

> Speaker notes: "Runs on a laptop today" is the entire 35% Commercial Potential & Feasibility argument for Stage I: if it works here, it flies on 367 TOPS. The gitignore/weights line answers the licensing question before it's asked.

---

## Slide 15 — Stage II target architecture: Thunderstorm

**Same three boxes — new silicon underneath.**
- Vision worker → Intel Arc Pro B70 (32 GB VRAM, up to 367 TOPS INT8): higher inference resolution, multiple concurrent streams, headroom for larger detector variants
- API server + dashboard unchanged in structure; multi-zone mapping and multi-camera fan-in added
- LLM summarizer sidecar (new box): reads the incident log, writes natural-language shift summaries — advisory only, never in the decision path
- Alert integrations (SMS/email/push) attach at the existing webhook hook-point
- Deployment: organizer-provided VM + SDV system access (no hardware shipping on the Thunderstorm track); finals judged remotely on the designated platform
- What changes vs. Stage I: scale and silicon — the loop's logic is already proven on the laptop

> Speaker notes: One new box (the summarizer), everything else is the same diagram with bigger numbers. That continuity is the point: Stage I de-risks Stage II.

---

## Slide 16 — References

- Ultralytics YOLOv8 documentation — https://docs.ultralytics.com
- PPE detection model: `Hansung-Cho/yolov8-ppe-detection` (MIT) — https://huggingface.co/Hansung-Cho/yolov8-ppe-detection
- Sample footage: Coverr royalty-free clips, Commercial-Use License (no attribution required) — `coverr-construction-workers-454`, `coverr-construction-worker-walking-6415`
- ASUS UGen AI League official rules — https://contest.bhuntr.com/en/39jg9vimiynrhlksze/home/
- Intel Arc Pro B70 / Thunderstorm platform brief (organizer-provided at Stage II)
- Socket.IO, Express.js documentation (pipeline transport)

> Speaker notes: Every third-party thing in the build is on this slide with a license or source. If a judge asks "where did X come from," the answer is always here.

---

## Slide 17 — Code documentation & repo

**Everything is public, documented, and labeled.**
- 🔗 **https://github.com/pintu544/siteguard** (public, MIT)
- README covers: architecture, setup, how to run, the measured numbers (9.9 FPS @ 480p, <2s alert-latency design target), and the full real-vs-simulated table
- Reproduce the demo from a fresh terminal following only the README — that is the documented acceptance bar
- Honesty statement (also in the README and the UI): Stage I is a laptop proposal prototype — real pretrained inference, rule-based policy loop, sample footage; LLM reasoning and Thunderstorm deployment are explicitly Stage II
- IP note: per the official rules, winners grant ASUS/Intel/Hailo a perpetual royalty-free license to the winning entry — acknowledged and accepted at entry

> Speaker notes: End on the repo link — leave it on screen during Q&A. The IP line is there because the rules require the acknowledgment; state it once, plainly, and move on.
