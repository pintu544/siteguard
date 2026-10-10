# GRILL — SiteGuard Stage I (compact, 4-day deadline)

Pre-implementation interrogation. Every answer below is locked; anything not decided here is out of scope.

## Q1. What is the one demo that proves it works?
A 60–90 second screen recording (which Pintu re-records as the ≤3-min submission video) showing: sample construction-site video playing → a person without a hard hat enters frame → bounding boxes + "NO HARD HAT" labels appear → after N consecutive frames the dashboard fires a red alert banner and the incident log gains a timestamped row with a snapshot. Completion evidence = that recording exists and the loop is reproducible from the README.

## Q2. Video source: sample file, webcam, or both?
Sample video file is primary (deterministic, repeatable, no prop needed). Webcam input is a supported stretch toggle, not required for Stage I. Rationale: the submission demo video must be reproducible; a file guarantees it.

## Q3. What does "PPE detection" actually run in Stage I?
Real person + PPE detection via `Hansung-Cho/yolov8-ppe-detection` through Ultralytics. The Hugging Face repository is tagged MIT, but the card does not enumerate the original training-dataset licenses; Ultralytics documents AGPL-3.0 for open-source use and an Enterprise path for proprietary/commercial deployment. Those caveats are disclosed instead of calling the stack production-cleared. The SiteGuard contribution is the policy loop: perceive → track/confirm → act (alerts, incident log, transition history, snapshots, acknowledgement, resolution, CSV export).

## Q4. What makes it "agentic" rather than just a detector + dashboard?
A deterministic policy loop with three stages: PERCEIVE (detection events + lightweight `trackId`) → REASON (five consecutive violation frames for the same track, one continuous episode, warning → alert → critical escalation, 20-frame clear resolution) → ACT (Socket.IO alert, incident + transition persistence, snapshot, acknowledgement, CSV export). Stage I reasoning is rule-based and labeled as such; LLM-based incident summarization is a Stage II item. No LLM planner or outbound webhook is claimed in Stage I.

## Q5. Stack and process layout?
- `vision-worker/`: Python 3.12 + `ultralytics` (YOLOv8n) + pretrained PPE model. Reads video file (or webcam), emits detection events as JSON via HTTP POST to the API server, and POSTs annotated JPEG frames (base64).
- `server/`: Node.js + Express + Socket.IO. Receives events, runs the policy engine, serves the dashboard, persists incidents to `data/incidents.json`.
- `dashboard/`: single HTML page + vanilla JS + Socket.IO client. No build step, no framework — speed over elegance for a 4-day proposal.
- Ports: server on 3000; vision worker configurable via env/CLI args.
Rationale: Python owns the only part Node can't do well (YOLO inference); everything else stays in Pintu's wheelhouse. Localhost-only for Stage I.

## Q6. Where does the Stage I demo run? What about Thunderstorm?
Entirely on a laptop (explicitly allowed for Stage I — no designated hardware needed). The deck's architecture section shows the Stage II target: the same pipeline containerized on the Thunderstorm VM (Intel Arc Pro B70), which is honest about "runs here now, scales there later."

## Q7. Sample footage and data provenance?
A Coverr construction-site clip is downloaded at demo time; its URL and current license are recorded in `spec/research.md`. It is an inference-demo input, not training data. Incident snapshots are saved to `data/snapshots/` at runtime. No hand-seeded incident data—the log starts empty and fills from pipeline runs.

## Q8. What is explicitly deferred to Stage II (December)?
Multi-camera, LLM incident summarization, SMS/email/push integrations, model fine-tuning on site-specific data, Thunderstorm VM deployment, auth/multi-user, cloud hosting, automated retention, and the demo-video recording itself (Pintu records). Stage I has no outbound webhook.

## Q9. How does the spec map to the judging criteria?
- Innovation & Creativity 30% → the agentic policy loop (perceive-reason-act with escalation), not the detector.
- Commercial Potential & Feasibility 35% → real YOLO pipeline on a commodity laptop + credible Stage II path to Thunderstorm silicon; construction-safety compliance is a real market.
- Practical Value 25% → auditable incident log + live dashboard = a compliance record a safety officer can actually use.
- Storytelling & Presentation 10% → demo video + deck.

## Q10. What does "done" mean for Stage I, in one line?
By Oct 14, 2026, 2:30 PM IST: proposal deck (≤20 pages, all six required sections) + unlisted ≤3-min YouTube demo video + public repo with honest code documentation are submitted via Bounty Hunter, and every simulated element is labeled as simulated.
