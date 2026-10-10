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
- **License:** MIT (explicitly declared on the model card) — clears the license bar.
- **Weights:** `best.pt` (6.25MB, YOLOv8-compatible), downloaded to `vision-worker/models/ppe-yolov8n.pt` (gitignored, NOT committed).
- **Classes:** Person, Hardhat, No-Hardhat, Safety Vest, No-Safety Vest, Mask, No-Mask (~10 total). Hard-hat presence = Hardhat bbox overlapping Person bbox.
- **Candidates evaluated:** keremberke/yolov8n-hard-hat-detection (no license declared — rejected on license bar despite 0.836 mAP); lanseria/yolov8n-hard-hat-detection_web_model (MIT but TF.js weights only — not ultralytics-compatible); Tanishjain9/yolov8n-ppe-detection-6classes (MIT, backup); Hexmon/vyra-yolo-ppe-detection (CC-BY-4.0, backup).
- **Sample footage:** Coverr royalty-free clips (no attribution required, cleared for commercial use, no watermark):
  - Primary: `coverr-construction-worker-walking-6415` (1080p, 5.4MB) — https://cdn.coverr.co/videos/coverr-construction-worker-walking-6415/1080p.mp4
  - Alternate: `coverr-construction-workers-454` (1080p, 6.0MB) — https://cdn.coverr.co/videos/coverr-construction-workers-454/1080p.mp4
  - License: Coverr Commercial-Use License (royalty-free, no attribution). Clips are NOT committed to the repo (downloaded at demo time; URLs documented here).
- **Inference verification:** ✅ 2026-10-10 ~08:25 UTC — ran on real images via ultralytics:
  - Welder photo (Wikimedia, green hard hat): Person 0.67 (hard hat missed — noted as model limitation)
  - Coverr clip 1 mid-frame: Person 0.88, Safety Vest 0.80, Hardhat 0.49 → compliant path
  - Coverr clip 2 mid-frame: NO-Hardhat 0.90, Person 0.86/0.81/0.80, Hardhat 0.53 → violation path (ideal demo clip)
  - Selected demo clip: `coverr-construction-workers-454` (shows both compliant and violation states)

## Technical leads (to verify in T1 spike — NOT yet verified)
- `ultralytics` pip package provides YOLOv8n pretrained weights (`yolov8n.pt`) with no training needed. Source: https://docs.ultralytics.com — verify install + inference latency on the build laptop during T1.
- Pretrained hard-hat/PPE detection models exist on HuggingFace and Roboflow Universe (typically YOLOv8 fine-tunes on hard-hat worker datasets). Candidate to evaluate in T1: license terms, input size, CPU inference speed, false-positive behavior on non-construction footage. If none clears the bar, fall back to labeled heuristic per GRILL Q3.
- Sample footage: needs a royalty-free construction-site clip with people. Candidates: public-domain/CC0 stock clips (e.g. Pixabay/Pexels license, Coverr). Source + license MUST be recorded here before the clip enters the repo. Not yet selected — do during T1.

## Stack facts (verified from Pintu's own history)
- Node.js + Express + Socket.IO and real-time WebSocket dashboards are his proven stack (ShypBuddy tracking dashboards, 50K+ req/day APIs). Vanilla-JS dashboard chosen for Stage I speed; no claim this is the long-term frontend.
- Python ML services on Render are his proven pattern (CardioSight API). Local-only for Stage I; no deploy claim.
