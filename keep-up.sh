#!/usr/bin/env bash
# Razor Town — supervisor. Keeps the game server alive and self-healing.
#
#   ./keep-up.sh
#
# What it does, on a loop:
#   1. reinstalls dependencies if node_modules went missing (this sandbox wipes them)
#   2. runs `node server.js` (which self-bootstraps an empty world + founder account)
#   3. if the server ever exits or crashes, restarts it 2 seconds later
#
# Logs: logs/server.log       PID: logs/keep-up.pid
cd "$(dirname "$0")" || exit 1
mkdir -p logs
echo "$$" > logs/keep-up.pid

log() { echo "[$(date -Is)] $*" >> logs/server.log; }

log "supervisor started (pid $$)"

while true; do
  # --- self-heal dependencies
  if [ ! -d node_modules/better-sqlite3 ]; then
    log "dependencies missing — running npm install"
    npm install --no-audit --no-fund --loglevel=error >> logs/server.log 2>&1 \
      || npm install --no-audit --no-fund >> logs/server.log 2>&1
  fi

  # --- run the game
  log "starting server"
  node server.js >> logs/server.log 2>&1
  code=$?
  log "server exited with code $code — restarting in 2s"
  sleep 2
done
