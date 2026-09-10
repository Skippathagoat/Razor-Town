#!/usr/bin/env bash
# Razor Town — one command to get the whole thing up (and keep it up).
#
#   ./start-all.sh             installs deps, builds the world if needed, starts the
#                              self-healing supervisor in the background
#   ./start-all.sh --public    ...and also opens a public Cloudflare link, printed at the end
#   ./start-all.sh --fg        run the supervisor in the foreground (Ctrl-C to stop)
#
# The server boot self-bootstraps: an empty/missing database gets 42 NPC citizens,
# 3 gangs and the founder account automatically. Nothing to do by hand.
set -e
cd "$(dirname "$0")"
mkdir -p logs

PORT="${PORT:-8787}"
PUBLIC=0; FG=0
for a in "$@"; do
  case "$a" in
    --public) PUBLIC=1 ;;
    --fg|--foreground) FG=1 ;;
  esac
done

echo "[1/4] Checking dependencies..."
if [ ! -d node_modules/better-sqlite3 ]; then
  npm install --no-audit --no-fund --loglevel=error >/dev/null 2>&1 || npm install --no-audit --no-fund >/dev/null 2>&1
fi

echo "[2/4] Building / verifying the world (idempotent)..."
node -e "
const boot = require('./lib/bootstrap.js');
const w = boot.ensureWorld({ bots: Number(process.env.BOTS || 42) });
console.log('      citizens:', w.citizens, '| gangs:', w.gangs, '| accounts:', w.accounts,
  '| founder:', w.founder ? w.founder.username : '-');
"

if [ "$FG" = "1" ]; then
  echo "[3/4] Running supervisor in the foreground — Ctrl-C to stop."
  exec ./keep-up.sh
fi

echo "[3/4] Starting self-healing supervisor in the background..."
if [ -f logs/keep-up.pid ] && kill -0 "$(cat logs/keep-up.pid)" 2>/dev/null; then
  echo "      supervisor already running (pid $(cat logs/keep-up.pid))"
else
  setsid nohup ./keep-up.sh >/dev/null 2>&1 &
  sleep 1
fi

# wait for the port to answer
for i in $(seq 1 30); do
  if curl -fsS -m 2 "http://127.0.0.1:$PORT/api/health" >/dev/null 2>&1; then break; fi
  sleep 0.5
done

echo "[4/4] Status:"
if curl -fsS -m 3 "http://127.0.0.1:$PORT/api/health" 2>/dev/null | sed 's/^/      /'; then
  echo "      local:   http://localhost:$PORT"
else
  echo "      server not answering yet — check logs/server.log"
fi
echo "      logs:    logs/server.log"
echo "      founder: ghost / Delilah2023!@   (change with FOUNDER_PASS, or node tools/founder.js reset)"

if [ "$PUBLIC" = "1" ]; then
  echo ""
  echo "Opening a public Cloudflare link..."
  # find a usable cloudflared: env override -> persisted copy -> /tmp -> download it
  CF="${CLOUDFLARED:-}"
  for c in "$CF" "$HOME/cloudflared" /tmp/cloudflared; do
    [ -n "$c" ] && [ -x "$c" ] && CF="$c" && break
  done
  if [ -z "$CF" ] || [ ! -x "$CF" ]; then
    CF="$HOME/cloudflared"
    curl -fsSL -o "$CF" https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 && chmod +x "$CF"
  fi
  setsid nohup "$CF" tunnel --url "http://127.0.0.1:$PORT" --no-autoupdate --protocol http2 > logs/tunnel.log 2>&1 &
  for i in $(seq 1 40); do
    URL=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' logs/tunnel.log | head -1 || true)
    [ -n "$URL" ] && break
    sleep 1
  done
  if [ -n "$URL" ]; then
    echo "$URL" > public-url.txt
    # wait for DNS so the link works the moment it is printed
    for i in $(seq 1 30); do
      st=$(curl -s "https://dns.google/resolve?name=${URL#https://}&type=A" | grep -o '"Status":[0-9]*' | head -1 | cut -d: -f2)
      [ "$st" = "0" ] && break
      sleep 2
    done
    echo "      public:  $URL   (saved to public-url.txt)"
  else
    echo "      tunnel did not come up — see logs/tunnel.log"
  fi
fi
