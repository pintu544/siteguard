#!/usr/bin/env bash
# SiteGuard one-command demo launcher (Stage I).
#   ./demo.sh           -> plays the tuned demo clip (violation -> escalation story)
#   ./demo.sh --webcam  -> uses your laptop webcam (device 0) instead
# Ctrl+C stops everything.
set -euo pipefail
cd "$(dirname "$0")"

MODE="clip"
if [[ "${1:-}" == "--webcam" ]]; then MODE="webcam"; fi

# --- preflight ---------------------------------------------------------------
command -v node >/dev/null || { echo "node not found. Install Node 18+ first."; exit 1; }
[[ -d vision-worker/venv ]] || { echo "vision-worker/venv missing. Follow README 'Setup' once, then re-run."; exit 1; }
[[ -d server/node_modules ]] || { echo "server/node_modules missing. Run 'npm install' in server/ once, then re-run."; exit 1; }

# --- demo clip (tuned segment source) ----------------------------------------
CLIP=".tmp/demo-clip.mp4"
CLIP_URL="https://cdn.coverr.co/videos/coverr-construction-workers-454/1080p.mp4"
if [[ "$MODE" == "clip" && ! -f "$CLIP" ]]; then
  echo "[demo] downloading royalty-free demo clip (Coverr, commercial-use)..."
  mkdir -p .tmp
  curl -fsSL -o "$CLIP" "$CLIP_URL"
fi

# --- start server ------------------------------------------------------------
echo "[demo] starting API server on :3000 ..."
PORT=3000 node server/server.js > .tmp/server.log 2>&1 &
SERVER_PID=$!
for i in $(seq 1 30); do
  curl -fs -o /dev/null http://localhost:3000/api/incidents 2>/dev/null && break
  sleep 1
done
curl -fs -o /dev/null http://localhost:3000/api/incidents || { echo "server failed to start; see .tmp/server.log"; kill $SERVER_PID; exit 1; }

# --- start worker ------------------------------------------------------------
echo "[demo] starting vision worker ($MODE) ..."
if [[ "$MODE" == "webcam" ]]; then
  ( cd vision-worker && ./venv/bin/python worker.py --webcam --conf 0.35 --skip 8 --imgsz 480 ) &
else
  ( cd vision-worker && ./venv/bin/python worker.py --video ../.tmp/demo-clip.mp4 --conf 0.35 --skip 8 --imgsz 480 ) &
fi
WORKER_PID=$!

cleanup() { echo; echo "[demo] stopping..."; kill $WORKER_PID $SERVER_PID 2>/dev/null || true; }
trap cleanup INT TERM

# --- open dashboard ----------------------------------------------------------
URL="http://localhost:3000"
echo "[demo] dashboard: $URL  (Ctrl+C to stop everything)"
if command -v xdg-open >/dev/null; then xdg-open "$URL" >/dev/null 2>&1 &
elif command -v open >/dev/null; then open "$URL" >/dev/null 2>&1 & fi

wait $WORKER_PID 2>/dev/null || true
cleanup
