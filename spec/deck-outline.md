# Deck outline — SiteGuard Stage I proposal (≤20 pages)

Covers all six required sections. Page counts are ceilings, not targets.

1. **Title** (1): SiteGuard — Agentic AI Workplace Safety Copilot. Battlefield Thunderstorm, Global Online, Workplace AI. Team: Pintu Kumar (solo).
2. **Scenario + problem** (3): construction head injuries from missing PPE; clipboard inspections are spotty and unauditable; the cost of one incident vs. continuous monitoring. One real-world anchor stat with source.
3. **Intended tools + methods** (4): third-party YOLOv8 PPE weights through Ultralytics (model/runtime/data-license caveats disclosed); lightweight overlap tracking; Node/Express + Socket.IO real-time pipeline; the agentic policy loop—perceive → reason (per-track N-frame confirmation, escalation, clear resolution) → act (alerts, incident log, snapshot, acknowledgement, CSV export). What is real vs. simulated, stated plainly.
4. **Expected outcomes** (2): Stage I—working laptop simulation with measured processed-frame throughput, explicitly unmeasured alert latency, and an auditable incident log. Stage II—port and benchmark on the Thunderstorm VM (Intel Arc Pro B70, 367 TOPS), multi-camera, LLM incident summaries.
5. **HW/SW architecture** (4): component diagram (vision-worker → api-server → dashboard); data flow; Stage I laptop deployment; Stage II Thunderstorm target architecture. No vapor — every box maps to built or explicitly planned code.
6. **References** (1): YOLOv8/Ultralytics docs and AGPL/Enterprise licensing page, PPE model repository tag + training-data uncertainty, footage license, ASUS/Hailo/Intel platform docs.
7. **Code documentation + honesty statement** (1): GitHub repo link (public), README contents, and the explicit real-vs-simulated boundary.

Total: ≤16 pages of body, leaving headroom under the 20-page cap for title/section dividers.
