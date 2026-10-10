# Research — SiteGuard Stage I

Findings that grill/spec/design answers depend on. Rule 12: if it isn't written here with a source, it doesn't count as verified. Research dates: 2026-10-10.

## Hackathon facts (from official recon, verified 2026-10-10 via contest.bhuntr.com)
- Event: ASUS UGen AI League Innovation Hackathon. Official page: https://contest.bhuntr.com/en/39jg9vimiynrhlksze/home/ (Details tab carries the official rules; News/FAQ tabs empty as of recon).
- Battlefield: **Thunderstorm** (high-performance development track: ASUS UGen Intel Arc Pro B70 32GB, up to 367 TOPS INT8). Stage II: organizer provides a VM + SDV system access — no hardware shipping for this track.
- Track: **Global Online** (judged remotely; no Taipei travel required).
- Theme: **Workplace AI** (efficiency & safety; hard-hat detection is a named example in the official themes).
- Stage I deadline: **Oct 14, 2026, 17:00 Taipei = 14:30 IST**. Deadline enforced by platform backend.
- Stage I deliverables: proposal deck (main body ≤20 pages, appendices excluded) covering scenario + problem, tools + methods, expected outcomes, HW/SW architecture, references, GitHub code-documentation link; hands-on demo video ≤3 min on YouTube ("Anyone with the link"); Stage I needs NO designated hardware — laptop/SBC/VM simulation explicitly allowed.
- Eligibility: solo allowed (teams of 1–5), worldwide incl. India, 18+. Entry must be new — not previously published/entered/awarded.
- Judging: Innovation & Creativity 30%, Commercial Potential & Feasibility 35%, Practical Value 25%, Storytelling & Presentation 10%.
- Prizes (Thunderstorm): Champion USD 5,000; three category awards USD 1,700 each. Non-Taiwan residents: 20% withholding tax.
- IP note: winners grant ASUS/Intel/Hailo a perpetual, royalty-free license (economic rights, worldwide, incl. sublicensing). Flagged to Pintu before entry; he approved proceeding.
- 20 teams advance to Stage II (10 per battlefield: 5 online + 5 onsite). Stage II kick-off Nov 6; final submission Dec 4.

## T1 spike outcome (completed 2026-10-10, ~08:00 UTC — within 3h timebox)
- **Model selected:** `Hansung-Cho/yolov8-ppe-detection` — https://huggingface.co/Hansung-Cho/yolov8-ppe-detection
- **Model-repository tag:** MIT, as declared on the Hugging Face page. This is
  not presented as complete production clearance: the card says its public
  source datasets retain their providers' licenses but does not enumerate
  them, and the implementation runs through Ultralytics (AGPL-3.0 for
  open-source use, with an Enterprise path for proprietary/commercial use).
- **Weights:** `best.pt` (6.25MB, YOLOv8-compatible), downloaded to `vision-worker/models/ppe-yolov8n.pt` (gitignored, NOT committed).
- **Classes:** Person, Hardhat, No-Hardhat, Safety Vest, No-Safety Vest, Mask, No-Mask (~10 total). Hard-hat presence = Hardhat bbox overlapping Person bbox.
- **Candidates evaluated:** keremberke/yolov8n-hard-hat-detection (no license declared, not selected despite its reported 0.836 mAP); lanseria/yolov8n-hard-hat-detection_web_model (MIT-tagged but TF.js weights only, not compatible with this worker); Tanishjain9/yolov8n-ppe-detection-6classes (MIT-tagged backup); Hexmon/vyra-yolo-ppe-detection (CC-BY-4.0-tagged backup). Repository tags were screening signals, not legal conclusions.
- **Sample footage:** Coverr stock clips (no watermark):
  - Primary demo: `coverr-construction-workers-454` (1080p, ~6.0MB) — https://cdn.coverr.co/videos/coverr-construction-workers-454/1080p.mp4
  - Alternate: `coverr-construction-worker-walking-6415` (1080p, ~5.4MB) — https://cdn.coverr.co/videos/coverr-construction-worker-walking-6415/1080p.mp4
  - License: https://coverr.co/license permits commercial and non-commercial use without required attribution, subject to its restrictions. The clips are demo inputs only, not training/fine-tuning data, and are not committed to the repo.
- **Inference verification:** ✅ 2026-10-10 ~08:25 UTC — ran on real images via ultralytics:
  - Welder photo (Wikimedia, green hard hat): Person 0.67 (hard hat missed — noted as model limitation)
  - Coverr clip 1 mid-frame: Person 0.88, Safety Vest 0.80, Hardhat 0.49 → compliant path
  - Coverr clip 2 mid-frame: NO-Hardhat 0.90, Person 0.86/0.81/0.80, Hardhat 0.53 → violation path (ideal demo clip)
  - Selected demo clip: `coverr-construction-workers-454` (shows both compliant and violation states)

## Runtime, licensing, and performance verification

- The worker imports the `ultralytics` package and loads the selected `.pt`
  weights; versions are pinned in `vision-worker/requirements.txt`.
- Ultralytics' official licensing page says its YOLO code/models use AGPL-3.0
  for open-source use and offers Enterprise licensing for proprietary or
  commercial deployment: https://www.ultralytics.com/license. The root MIT
  license applies only to SiteGuard-authored source and does not override these
  third-party terms.
- The selected model card identifies its training material only as public PPE
  / construction datasets and says their original licenses apply. Because it
  does not name them, dataset-license provenance remains unresolved for a
  production deployment. Source:
  https://huggingface.co/Hansung-Cho/yolov8-ppe-detection.
- **Conservative verified local baseline (2026-10-10):** Windows laptop, primary Coverr
  clip, `--skip 8 --imgsz 480`, and the launcher's demo-only 10/15 escalation
  thresholds: 33 processed frames at a worker-reported **1.4 processed FPS**.
  The isolated run produced three incidents ending alert/critical/warning and
  persisted the critical transition. Counts can vary with detection/tracking,
  so this is one end-to-end observation—not a generic benchmark or scripted
  count. A later full-launcher run with the same settings reached 2.3 processed
  FPS, demonstrating load/run variability; public claims use the lower 1.4
  baseline. No per-stage timing or browser-render latency was instrumented.

## Stack facts (verified from Pintu's own history)
- Node.js + Express + Socket.IO and real-time WebSocket dashboards are his proven stack (ShypBuddy tracking dashboards, 50K+ req/day APIs). Vanilla-JS dashboard chosen for Stage I speed; no claim this is the long-term frontend.
- Python ML services on Render are his proven pattern (CardioSight API). Local-only for Stage I; no deploy claim.
