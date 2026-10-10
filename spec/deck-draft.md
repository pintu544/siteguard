# SiteGuard — Stage I Proposal Deck (draft content)

**Event:** ASUS UGen AI League Innovation Hackathon — Battlefield Thunderstorm · Global Online Track · Workplace AI theme
**Team:** Pintu Kumar (solo) · **Stage I deadline:** Oct 14, 2026, 14:30 IST
**Repo:** https://github.com/pintu544/siteguard

17 slides total (≤20-page cap respected). One section per slide: title, bullets,
speaker notes. **This file is draft content, not a final PDF/PPTX submission.**

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
- Perception: third-party YOLOv8 PPE weights through the Ultralytics runtime (licensing caveats disclosed, not treated as production-cleared)
- Reasoning: deterministic policy engine — N-frame confirmation + zone escalation
- Transport: Express + Socket.IO real-time pipeline, vanilla-JS dashboard
- Data: JSON incident log + frame snapshots — human-inspectable, no database needed
- The "agent" is the loop: it holds state across frames and acts only on confirmed, repeated violations

> Speaker notes: Pre-empt the "it's just YOLO" objection here: say it out loud — detection is the commodity input, the agentic contribution is stateful reasoning over time (confirmation, escalation, audit). That maps directly to the 30% Innovation criterion.

---

## Slide 6 — Perception: real inference, named model

**Person + hard-hat detection runs real neural inference—not a mock.**
- Model: `Hansung-Cho/yolov8-ppe-detection` (YOLOv8-compatible, `best.pt` 6.25 MB)
- Provenance: the Hugging Face repository is tagged MIT; its card leaves source-dataset licenses with unnamed original providers, so production data-license clearance is unresolved
- Runtime: Ultralytics documents AGPL-3.0 for open-source use and an Enterprise path for proprietary/commercial deployments
- Classes include Person, Hardhat, No-Hardhat, Safety Vest (~10 total); hard-hat presence = Hardhat box overlapping Person box
- Verified on real images: construction clip frames detect Person 0.88 / Vest 0.80 / Hardhat 0.49; a No-Hardhat frame scores 0.90 — both the compliant and violation paths confirmed
- Known limitation (stated, not hidden): on one test photo the model found the person (0.67) but missed a green hard hat — edge cases like this are exactly what the N-frame confirmation exists to absorb

> Speaker notes: Naming the model, runtime, license caveats, and a disclosed miss is the honesty flex. Judges in this track know detectors are imperfect; showing a measured failure mode and engineering around flicker (next slide) is stronger than claiming 99% accuracy.

---

## Slide 7 — The agentic policy loop: perceive → reason → act

**Deterministic in Stage I — every rule is code you can read, no black boxes.**
- PERCEIVE: vision worker posts per-frame detections (person boxes + hard-hat flags)
- REASON: violation confirmed only after **N = 5 consecutive processed frames** on the same lightweight track (configurable); one episode escalates in place **warning → alert → critical** and resolves after 20 clear processed frames
- ACT: Socket.IO broadcast to the dashboard, incident + transition history persisted, snapshot saved, CSV export available
- Why deterministic, not an LLM planner, in Stage I: a safety system must be explainable — "the 5th consecutive frame triggered it" is an auditable reason; Stage II adds LLM incident *summaries*, never LLM *decisions*

> Speaker notes: This is the Innovation-criterion slide (30%). Hammer the distinction: the loop is stateful and explainable. LLM-as-decider would be a liability story; LLM-as-summarizer in Stage II is the responsible upgrade path.

---

## Slide 8 — Measured pipeline & incident record

**A measured prototype with an inspectable evidence trail.**
- Transport: annotated JPEG frames + detection JSON over HTTP (worker → server); live feed, alerts, and incidents over Socket.IO (server → dashboard)
- Conservative verified baseline: **33 processed frames at 1.4 processed FPS** on the Windows laptop (`--skip 8 --imgsz 480`); one run, not a generic laptop benchmark
- Alert latency and per-stage timing are **not instrumented**, so no latency claim is made
- Every confirmed incident persists current state plus lifecycle transitions; the log starts empty and fills only from pipeline runs
- Dashboard: live annotated feed, zone status, alert stack, incident table, acknowledgement, snapshot links, and CSV export—zero build step

> Speaker notes: Say exactly what was measured: 33 processed frames at 1.4 processed FPS on this laptop. Do not turn one run into a broad hardware claim, and do not quote alert latency. The empty log filling from the live pipeline is the Practical Value story.

---

## Slide 9 — What's real vs. simulated (stated plainly)

**Stage I runs on a laptop. Everything below is labeled in the UI, README, and here.**

| Component | Status |
|---|---|
| Person + hard-hat detection | Real inference—third-party YOLOv8 PPE weights, not trained by us; repository/runtime/training-data licensing caveats disclosed |
| N-frame confirmation, escalation, incident log | Real — our policy-engine code |
| Dashboard, snapshots, CSV export | Real—localhost pipeline; end-to-end alert latency is not instrumented |
| Input footage | Sample — downloaded Coverr stock clip, not a live site; current license/provenance notes are disclosed in `THIRD_PARTY_NOTICES.md` |
| "Agent" reasoning | Rule-based in Stage I (labeled as such); LLM reasoning is Stage II |
| Deployment | Laptop in Stage I; Thunderstorm VM is the Stage II target |

> Speaker notes: Read the table title out loud and pause. In a field of overclaimed hackathon decks, the team that labels its simulation wins trust — and trust is what the 35% Commercial/Feasibility criterion is actually scoring.

---

## Slide 10 — Expected outcomes: Stage I

**Built now, with submission packaging still to finish.**
- ✅ Working clip prototype: video → detection → per-track confirmation → live dashboard → incident log, snapshots, acknowledgement, resolution, CSV export
- ✅ Policy integration tests: 8/8, including clean-frame reset, in-place escalation history, acknowledged → resolved behavior, and restart interruption handling
- ✅ One conservative local throughput observation documented: 33 processed frames at 1.4 processed FPS; latency remains unmeasured
- ✅ Public repo with setup instructions and one-command launchers after one-time setup
- 🟡 Deck content and recording runbook drafted; no final PDF/PPTX is claimed
- ⏳ Record, upload, and verify the required ≤3-minute unlisted YouTube video
- What Stage I deliberately does NOT claim: multi-camera, LLM reasoning, cloud hosting, Thunderstorm deployment

> Speaker notes: The symbols are literal: checks are verified repo artifacts, yellow is draft-only, and the video remains pending. Do not show a final-deck or final-video check until the actual file/link exists.

---

## Slide 11 — Expected outcomes: Stage II (if shortlisted)

**The same loop, ported to Thunderstorm silicon — Nov 6 → Dec 4.**
- Port and benchmark the pipeline on the organizer-provided VM (Intel Arc Pro B70, 32 GB, up to 367 TOPS INT8); do not project a speedup before measuring it
- Multi-camera input with per-zone mapping (Stage I is a single logical zone)
- LLM incident *summarization* over the auditable log (decisions stay rule-based)
- Add and test SMS / email / push integrations (no outbound webhook exists in Stage I)
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
- Detection (transient, per frame): `{ frameId, ts, persons: [{ bbox, hardHat: bool, confidence, trackId }] }`
- Incident (persisted): `{ id, ts, zone, type, trackId, frames, severity, snapshotPath, status, acknowledgedAt?, resolvedAt?, interruptedAt?, transitions[] }`
- Alert (transient broadcast): `{ incidentId, severity: warning|alert|critical, message }`
- `POST /api/detections` → 202 (policy engine evaluates) · `POST /api/frames` → 202 (rebroadcast)
- `GET /api/incidents` (dashboard initial load) · `GET /api/incidents/export` (CSV) · `POST /api/incidents/:id/ack` (acknowledge button)
- Socket.IO server→client: `frame`, `alert`, `incident`, `stats` (fps, persons-in-frame)
- Knobs: `CONFIRM_FRAMES=5`, `CLEAR_FRAMES=20`, `ESCALATE_ALERT_FRAMES=15`, `ESCALATE_CRITICAL_FRAMES=30`, `--skip N`, `--conf 0.35`, `--imgsz 480`

> Speaker notes: This slide is for the technical judges. The contracts show the system was designed, not demoed-into-existence. Mention the knobs line — configurability signals engineering maturity.

---

## Slide 14 — Stage I deployment: the laptop

**The whole system runs on commodity hardware today — that is the feasibility argument.**
- One laptop, three processes, all localhost; no cloud, no GPU, no special hardware
- Prerequisites: Python 3.12, Node.js 18+, `pip`, `npm`; setup is documented, but fresh-machine setup time has not been independently measured
- Model weights (~6.25 MB) download once from Hugging Face and are excluded from the repo; third-party licensing and training-data caveats are explicit
- Conservative verified baseline on this Windows laptop: 33 processed frames at 1.4 processed FPS with `--skip 8 --imgsz 480`; other machines must be measured rather than estimated
- No secrets in the repo; footage downloaded at demo time from documented URLs

> Speaker notes: "Runs on a laptop today" is the core Stage I feasibility evidence. Treat the 367-TOPS figure only as the target platform's published capability; make no speedup claim until the pipeline is ported and benchmarked there. The gitignore/weights line opens the licensing discussion rather than pretending it is settled.

---

## Slide 15 — Stage II target architecture: Thunderstorm

**Same three boxes — new silicon underneath.**
- Vision worker → Intel Arc Pro B70 (32 GB VRAM, up to 367 TOPS INT8): higher inference resolution, multiple concurrent streams, headroom for larger detector variants
- API server + dashboard unchanged in structure; multi-zone mapping and multi-camera fan-in added
- LLM summarizer sidecar (new box): reads the incident log, writes natural-language shift summaries — advisory only, never in the decision path
- SMS/email/push requires a new integration component; Stage I has no outbound webhook
- Deployment: organizer-provided VM + SDV system access (no hardware shipping on the Thunderstorm track); finals judged remotely on the designated platform
- What changes vs. Stage I: scale and silicon — the loop's logic is already proven on the laptop

> Speaker notes: One new box (the summarizer), everything else is the same diagram with bigger numbers. That continuity is the point: Stage I de-risks Stage II.

---

## Slide 16 — References

- Ultralytics YOLOv8 documentation — https://docs.ultralytics.com
- PPE detection model: `Hansung-Cho/yolov8-ppe-detection` (repository tagged MIT; source-dataset licenses not enumerated) — https://huggingface.co/Hansung-Cho/yolov8-ppe-detection
- Ultralytics licensing (AGPL-3.0 / Enterprise paths) — https://www.ultralytics.com/license
- Sample footage: Coverr clips used as demo input under the current Coverr license—https://coverr.co/license—`coverr-construction-workers-454`, `coverr-construction-worker-walking-6415`
- ASUS UGen AI League official rules — https://contest.bhuntr.com/en/39jg9vimiynrhlksze/home/
- Intel Arc Pro B70 / Thunderstorm platform brief (organizer-provided at Stage II)
- Socket.IO, Express.js documentation (pipeline transport)

> Speaker notes: Every third-party thing in the build is on this slide with a license or source. If a judge asks "where did X come from," the answer is always here.

---

## Slide 17 — Code documentation & repo

**Everything is public, documented, and labeled.**
- 🔗 **https://github.com/pintu544/siteguard** (public; MIT applies to SiteGuard-authored source, with third-party terms disclosed separately)
- README covers architecture, setup, launchers, the verified 1.4 processed-FPS run, the absence of a latency measurement, policy tests, and the full real-vs-simulated table
- Reproduce the demo from a fresh terminal following only the README — that is the documented acceptance bar
- Honesty statement (also in the README and the UI): Stage I is a laptop proposal prototype — real pretrained inference, rule-based policy loop, sample footage; LLM reasoning and Thunderstorm deployment are explicitly Stage II
- IP note: per the official rules, winners grant ASUS/Intel/Hailo a perpetual royalty-free license to the winning entry — acknowledged and accepted at entry

> Speaker notes: End on the repo link — leave it on screen during Q&A. The IP line is there because the rules require the acknowledgment; state it once, plainly, and move on.
