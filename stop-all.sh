#!/usr/bin/env bash
# Razor Town — stop everything started by ./start-all.sh
cd "$(dirname "$0")" || exit 1

if [ -f logs/keep-up.pid ]; then
  PID=$(cat logs/keep-up.pid)
  kill "$PID" 2>/dev/null && echo "stopped supervisor (pid $PID)"
  rm -f logs/keep-up.pid
fi
pkill -f 'node serve[r]\.js' 2>/dev/null && echo "stopped game server"
pkill -f 'cloudflar[e]d tunnel' 2>/dev/null && echo "stopped public tunnel"
echo "done."
