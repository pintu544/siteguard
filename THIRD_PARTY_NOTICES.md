# Third-party and licensing notes

Verified 2026-10-10. This file records provenance and known licensing caveats;
it is not legal advice.

| Component | What this prototype uses | License/provenance note |
|---|---|---|
| Ultralytics | `ultralytics` Python package and YOLOv8 runtime | Ultralytics documents AGPL-3.0 for open-source use and an Enterprise license path for proprietary/commercial deployment: https://www.ultralytics.com/license. |
| PPE weights | `Hansung-Cho/yolov8-ppe-detection`, downloaded separately as `best.pt` | The Hugging Face repository is tagged MIT. Its model card says training data came from public PPE/construction datasets and remains subject to the original providers' licenses, but it does not enumerate those datasets. Training-data provenance is therefore not fully cleared here for production use: https://huggingface.co/Hansung-Cho/yolov8-ppe-detection. |
| PyTorch | Runtime dependency | See the version and upstream package source selected by `vision-worker/requirements.txt`; upstream terms apply. |
| OpenCV | Runtime dependency | See the version and upstream package source selected by `vision-worker/requirements.txt`; upstream terms apply. |
| Coverr clip | Sample construction footage downloaded at demo time | Coverr's license permits commercial and non-commercial use without required attribution, subject to its restrictions. The clip is used only as demo input, not for model training or fine-tuning: https://coverr.co/license. |
| Express / Socket.IO | API server and browser transport | Installed through `server/package-lock.json`; upstream package terms apply. |

The root [LICENSE](LICENSE) applies to SiteGuard-authored source only. It does
not override third-party terms. Before production, commercial, proprietary, or
safety-critical use, review the applicable terms and either satisfy them,
obtain the required licenses, or replace the affected components.
