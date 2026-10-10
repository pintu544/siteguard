# Deck references — verified facts for T8 (researched 2026-10-10)

All facts below were verified today with citable sources. Deck outline expects:
problem section "one real-world anchor stat with source" + references section
(model, footage, platform docs). Keep claims dated/honest — several stats are
2017-era, the canonical figures still cited in the literature.

## Anchor stats for the problem section (pick ONE)

1. **British Safety Council / ILO (2017):** ~48,000 workers die in India each year
   due to occupational accidents; the construction sector contributes 24.20% of
   occupational fatalities — about **38 fatal accidents every day** in the
   construction sector. Workplace deaths in India are **20x higher than in the
   UK**. Only 20% of India's 465M-strong workforce is covered by health & safety
   law.
   - https://indianexpress.com/article/india/accidents-at-workplaces-in-india-under-reported-38-per-day-in-construction-sector-study-4947079/lite/
   - https://timesofindia.indiatimes.com/business/india-business/48000-die-due-to-occupational-accidents-yearly-study/articleshow/61725283.cms

2. **IndiaSpend / DGFASLI (2022, RTI data):** 3,331 deaths recorded 2018–2020 in
   registered factories — ~3 deaths/day; covers only registered factories (~90%
   of workers are informal, so the real number is higher).
   - https://www.business-standard.com/amp/article/economy-policy/three-deaths-every-day-labour-safety-under-construction-in-india-123012900704_1.html

3. **"Fatal four" (OSHA framing, cited in Indian construction literature):** the
   four leading causes of construction fatalities are falls, electrocutions,
   struck-by-objects, and caught-in-between.
   - https://ns2.irjet.net/archives/V6/i5/IRJET-V6I5377.pdf

## Model reference (methods + references sections)

- **Hansung-Cho/yolov8-ppe-detection** — YOLOv8n fine-tuned for PPE detection
  (Person, Hardhat, No-Hardhat, Safety Vest, No-Safety Vest, Mask, No-Mask,
  ~10 classes). Reported validation mAP@0.50 = 0.744, precision 0.831.
- **License: MIT** — declared via `license:mit` tag on the model card
  (verified 2026-10-10 via HF API; model README itself disclaims that training
  data licenses follow their original providers — worth one honesty line in deck).
- Model page: https://huggingface.co/Hansung-Cho/yolov8-ppe-detection
- Citation given on card: Cho, Hansung. "YOLOv8 PPE Detection – End-to-End AI
  System for Safety Monitoring." Hugging Face Model Hub, 2025.
- Limitations worth citing for honesty: domain bias (indoor/night performance
  drops), occlusion false-negatives, low-resolution distant-person misses.

## Footage license reference

- Coverr clips (already in spec/research.md): Coverr Commercial-Use License —
  royalty-free, no attribution required, cleared for commercial use.

## Platform reference (HW/SW architecture section)

- **Intel Arc Pro B70 (Thunderstorm battlefield target):** 32GB GDDR6 (ECC),
  32 Xe2 cores / 256 XMX engines, **up to 367 INT8 TOPS**, 608 GB/s bandwidth,
  PCIe 5.0 x16, 230W reference board power. Confirmed across launch coverage:
  - https://wccftech.com/big-battlemage-gpu-is-here-intel-arc-pro-b70-b65-32-gb-graphics-cards/
  - https://www.backend.ai/blog/engineering/2026-06-intel-arc-pro-b70-meets-backend-ai
- For Intel's own spec page, search "Intel Arc Pro B70 specifications" on
  intel.com (spec figures above match Intel's reference card numbers).

## YOLOv8 reference

- Ultralytics YOLOv8 docs: https://docs.ultralytics.com ; source:
  https://github.com/ultralytics/ultralytics
