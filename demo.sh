#!/usr/bin/env bash
# SiteGuard one-command demo launcher (Stage I).
#   ./demo.sh                  -> plays the tuned demo clip
#   ./demo.sh --webcam         -> uses the laptop webcam (device 0)
#   ./demo.sh --reset          -> archives prior demo evidence, then starts clean
# Options may be combined. Ctrl+C stops the worker and API server process trees.
set -euo pipefail
cd "$(dirname "$0")"

mkdir -p .tmp

MODE="clip"
RESET_DATA=0
for arg in "$@"; do
  case "$arg" in
    --webcam) MODE="webcam" ;;
    --reset) RESET_DATA=1 ;;
    -h|--help)
      echo "Usage: ./demo.sh [--webcam] [--reset]"
      exit 0
      ;;
    *)
      echo "Unknown option: $arg" >&2
      echo "Usage: ./demo.sh [--webcam] [--reset]" >&2
      exit 2
      ;;
  esac
done

# --- preflight ---------------------------------------------------------------
command -v node >/dev/null || { echo "node not found. Install Node 18+ first." >&2; exit 1; }
command -v curl >/dev/null || { echo "curl not found. Install curl first." >&2; exit 1; }
[[ -d server/node_modules ]] || { echo "server/node_modules missing. Run 'npm install' in server/ once, then re-run." >&2; exit 1; }

if [[ -x vision-worker/venv/bin/python ]]; then
  WORKER_PYTHON="./venv/bin/python"
elif [[ -f vision-worker/venv/Scripts/python.exe ]]; then
  # Git Bash/MSYS uses the Windows virtual-environment layout.
  WORKER_PYTHON="./venv/Scripts/python.exe"
else
  echo "vision-worker/venv missing. Follow README 'Setup' once, then re-run." >&2
  exit 1
fi

# Bind exactly as the API server would. A failed bind means another/stale
# process already owns the port; never attach to an unknown server.
PORT_PROBE='const s=require("net").createServer();s.once("error",()=>process.exit(1));s.listen(3000,()=>s.close(()=>process.exit(0)));'
if ! node -e "$PORT_PROBE" >/dev/null 2>&1; then
  echo "Port 3000 is already occupied. Stop the existing/stale server, then re-run SiteGuard." >&2
  exit 1
fi

# --- demo clip (tuned segment source) ----------------------------------------
CLIP=".tmp/demo-clip.mp4"
CLIP_URL="https://cdn.coverr.co/videos/coverr-construction-workers-454/1080p.mp4"
if [[ "$MODE" == "clip" && ! -f "$CLIP" ]]; then
  echo "[demo] downloading sample demo clip from Coverr (third-party terms apply)..."
  curl -fsSL -o "$CLIP" "$CLIP_URL"
fi

# --- optional clean recording state -----------------------------------------
if [[ "$RESET_DATA" -eq 1 ]]; then
  BACKUP_DIR=".tmp/data-backup-$(date +%Y%m%d-%H%M%S)"
  [[ ! -e "$BACKUP_DIR" ]] || BACKUP_DIR="${BACKUP_DIR}-$$"
  mkdir -p "$BACKUP_DIR"
  [[ ! -f data/incidents.json ]] || mv data/incidents.json "$BACKUP_DIR/incidents.json"
  [[ ! -e data/snapshots ]] || mv data/snapshots "$BACKUP_DIR/snapshots"
  echo "[demo] prior incident data archived to: $BACKUP_DIR"
fi

SERVER_PID=""
WORKER_PID=""
CLEANED_UP=0

terminate_tree() {
  local pid="${1:-}"
  [[ -n "$pid" ]] || return 0
  kill -0 "$pid" 2>/dev/null || return 0

  case "$(uname -s 2>/dev/null || true)" in
    MINGW*|MSYS*|CYGWIN*)
      if command -v taskkill.exe >/dev/null 2>&1; then
        MSYS2_ARG_CONV_EXCL='*' taskkill.exe /PID "$pid" /T /F >/dev/null 2>&1 || true
        return 0
      fi
      ;;
  esac

  if command -v pgrep >/dev/null 2>&1; then
    local child
    while IFS= read -r child; do
      [[ -z "$child" ]] || terminate_tree "$child"
    done < <(pgrep -P "$pid" 2>/dev/null || true)
  fi

  kill -TERM "$pid" 2>/dev/null || true
  for _ in {1..20}; do
    kill -0 "$pid" 2>/dev/null || return 0
    sleep 0.1
  done
  kill -KILL "$pid" 2>/dev/null || true
}

cleanup() {
  local exit_code=$?
  [[ "$CLEANED_UP" -eq 0 ]] || return "$exit_code"
  CLEANED_UP=1
  trap - EXIT INT TERM HUP
  if [[ -n "$WORKER_PID" || -n "$SERVER_PID" ]]; then
    echo
    echo "[demo] stopping SiteGuard process trees..."
  fi
  terminate_tree "$WORKER_PID"
  terminate_tree "$SERVER_PID"
  [[ -z "$WORKER_PID" ]] || wait "$WORKER_PID" 2>/dev/null || true
  [[ -z "$SERVER_PID" ]] || wait "$SERVER_PID" 2>/dev/null || true
  return "$exit_code"
}

trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
trap 'exit 129' HUP

# --- start server ------------------------------------------------------------
echo "[demo] starting API server on :3000 ..."
if [[ "$MODE" == "clip" ]]; then
  echo "[demo] clip policy: alert=10, critical=15 processed violation frames (demo-only)."
  PORT=3000 ESCALATE_ALERT_FRAMES=10 ESCALATE_CRITICAL_FRAMES=15 \
    node server/server.js >.tmp/server.log 2>&1 &
else
  PORT=3000 node server/server.js >.tmp/server.log 2>&1 &
fi
SERVER_PID=$!

SERVER_READY=0
for _ in {1..60}; do
  kill -0 "$SERVER_PID" 2>/dev/null || break
  if curl -fs -o /dev/null http://127.0.0.1:3000/api/incidents 2>/dev/null; then
    SERVER_READY=1
    break
  fi
  sleep 0.5
done
if [[ "$SERVER_READY" -ne 1 ]]; then
  echo "Server failed to start; recent output from .tmp/server.log:" >&2
  tail -n 20 .tmp/server.log >&2 || true
  exit 1
fi

# --- start worker ------------------------------------------------------------
echo "[demo] starting vision worker ($MODE) ..."
if [[ "$MODE" == "webcam" ]]; then
  (cd vision-worker && exec "$WORKER_PYTHON" worker.py --webcam --conf 0.35 --skip 8 --imgsz 480) &
else
  (cd vision-worker && exec "$WORKER_PYTHON" worker.py --video ../.tmp/demo-clip.mp4 --conf 0.35 --skip 8 --imgsz 480) &
fi
WORKER_PID=$!

# --- open dashboard ----------------------------------------------------------
URL="http://localhost:3000"
echo "[demo] dashboard: $URL"
case "$(uname -s 2>/dev/null || true)" in
  MINGW*|MSYS*|CYGWIN*)
    if command -v cmd.exe >/dev/null 2>&1; then cmd.exe /c start "" "$URL" >/dev/null 2>&1 & fi
    ;;
  Darwin*)
    if command -v open >/dev/null 2>&1; then open "$URL" >/dev/null 2>&1 & fi
    ;;
  *)
    if command -v xdg-open >/dev/null 2>&1; then xdg-open "$URL" >/dev/null 2>&1 & fi
    ;;
esac

if wait "$WORKER_PID"; then
  WORKER_STATUS=0
else
  WORKER_STATUS=$?
fi
WORKER_PID=""
if [[ "$WORKER_STATUS" -ne 0 ]]; then
  echo "[demo] vision worker exited with status $WORKER_STATUS." >&2
  exit "$WORKER_STATUS"
fi

echo
echo "[demo] vision worker finished. The dashboard remains live for review, acknowledgement, and CSV export."
echo "[demo] Press Ctrl+C in this window when you are done."
while kill -0 "$SERVER_PID" 2>/dev/null; do
  sleep 1
done

wait "$SERVER_PID" 2>/dev/null || true
SERVER_PID=""
echo "[demo] API server stopped unexpectedly; see .tmp/server.log." >&2
exit 1
