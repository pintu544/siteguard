# Recording runbook — SiteGuard Stage I demo video (Pintu's laptop)

**Video requirement:** English narration, no more than 3 minutes, uploaded to
YouTube as "Anyone with the link."
**Stage I deadline:** October 14, 2026, 14:30 IST (17:00 Taipei time).

The final video and YouTube link are manual submission artifacts. This file is
the reproducible recording procedure; it does not claim that either artifact
already exists.

---

## 1. One-time setup

Prerequisites: Python 3.12, Node.js 18+, Git, npm, and curl. Setup duration has
not been independently measured, so allow plenty of time before recording day.

Linux/macOS:

```bash
git clone https://github.com/pintu544/siteguard.git
cd siteguard/vision-worker
python3 -m venv venv
./venv/bin/pip install -r requirements.txt
mkdir -p models
curl -L -o models/ppe-yolov8n.pt \
  https://huggingface.co/Hansung-Cho/yolov8-ppe-detection/resolve/main/best.pt
cd ../server
npm install
```

Windows PowerShell, from the repository root:

```powershell
uv venv --python 3.12 vision-worker\venv
uv pip install --python .\vision-worker\venv\Scripts\python.exe `
  -r .\vision-worker\requirements.txt
New-Item -ItemType Directory -Force vision-worker\models | Out-Null
Invoke-WebRequest `
  'https://huggingface.co/Hansung-Cho/yolov8-ppe-detection/resolve/main/best.pt' `
  -OutFile 'vision-worker\models\ppe-yolov8n.pt'
Push-Location server
npm install
Pop-Location
```

The PPE repository is tagged MIT, but the runtime and source-dataset licensing
have separate caveats. Read `THIRD_PARTY_NOTICES.md`; do not describe the whole
stack as unconditionally "MIT" or "commercially cleared."

## 2. Preflight before recording day

Run the deterministic clip once:

```bash
./demo.sh --reset
```

```powershell
.\demo.ps1 -ResetData
```

```bat
demo.bat --reset
```

`--reset` / `-ResetData` is recoverable: prior incident evidence is moved to a
timestamped `.tmp/data-backup-*` directory. The launcher refuses to attach to
an existing process on port 3000. After the clip finishes, the dashboard stays
open so you can inspect snapshots, acknowledge an incident, and export CSV.
Press `Ctrl+C` in the launcher terminal only after the walkthrough is complete.

The webcam path depends on the physical laptop and is not verified by the
repository checks. Test it separately before promising it in the recording:

```powershell
.\demo.ps1 -Webcam -ResetData
```

Put on and remove the hard-hat prop. Confirm that the camera opens, person
tracks remain reasonably stable, and an incident appears only after five
consecutive processed violation frames. Close Meet, Zoom, or Teams and grant
camera permission if OpenCV cannot open device 0.

## 3. Recording-day sequence

1. Close any process using port 3000.
2. Connect power, close CPU-heavy applications, and set the browser zoom so
   the feed, active alerts, and incident table are visible together.
3. Start screen recording at 1080p.
4. Run the clean launcher for your OS, for example:

   ```powershell
   .\demo.ps1 -ResetData
   ```

5. Let the clip complete. The verified settings are `--conf 0.35 --skip 8
   --imgsz 480`; clip mode explicitly uses demo-only escalation thresholds of
   10 and 15 processed violation frames. Normal server defaults remain 15/30.
6. While the server remains open, show a snapshot, acknowledge one active
   incident, and export CSV.
7. Point to the `STAGE I PROTOTYPE · SIMULATION` and provenance labels.
8. Press `Ctrl+C` in the launcher terminal to stop both process trees.

Detection and tracking can vary slightly between runs. Do not memorize an
exact incident count. Rehearse once on the recording laptop and narrate the
observable story: five consecutive frames for the same track, one incident per
continuous episode, escalation in place, human acknowledgement, and resolution
after the violation genuinely clears.

## 4. Suggested 2:30 video structure

| Time | Beat |
|---|---|
| 0:00–0:20 | Problem: manual PPE checks are intermittent and unauditable |
| 0:20–0:45 | Concept: camera → worker → deterministic policy → evidence dashboard |
| 0:45–1:45 | Live clip: bounding boxes, confirmation, escalation, snapshot, acknowledgement, CSV export |
| 1:45–2:15 | Honesty: stock footage, third-party detector, rule-based decisions, measured local throughput; Thunderstorm work is Stage II |
| 2:15–2:30 | Public repository and close: “SiteGuard: the safety officer that never blinks.” |

If the webcam preflight is reliable, use a 10–15 second prop shot as the
opening hook. Otherwise use a problem slide; the deterministic clip is the
primary Stage I demonstration.

## 5. Claims allowed in narration

- Real pretrained PPE inference is running locally.
- The policy and incident lifecycle are implemented and integration-tested.
- The verification laptop processed 33 sampled frames at 1.4 processed FPS in
  one `--skip 8 --imgsz 480` run.
- End-to-end alert latency has **not** been instrumented.
- The demo is not a certified safety system and does not automate penalties.
- Thunderstorm deployment and performance are Stage II plans, not current
  measurements.

## 6. Troubleshooting

| Symptom | Fix |
|---|---|
| Virtual environment missing | Complete the one-time setup using the OS-specific path above |
| Model file missing | Put weights at `vision-worker/models/ppe-yolov8n.pt` |
| Camera will not open | Close camera apps, grant permission, and retry device 0 |
| Port 3000 occupied | Stop the existing process; the launcher intentionally refuses to attach |
| Old incidents visible | Use the recoverable reset option and note the printed backup directory |
| Torch installation is slow | The CPU wheel is large; complete setup before recording day |
| Throughput differs | Quote only the recording laptop’s measured processed FPS; CPU and power mode matter |
