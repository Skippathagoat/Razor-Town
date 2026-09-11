#!/usr/bin/env bash
# One-time QA browser setup — kept deliberately OUT of the repo (big binary, host-specific).
# Safe to re-run after a sandbox reprovision. ~60s.
set -e
mkdir -p ~/.local/qa ~/.cache/puppeteer ~/.local/debs ~/.local/syslibs
( cd ~/.local/qa && npm init -y >/dev/null 2>&1 && npm i puppeteer-core >/dev/null 2>&1 )
( cd ~/.local/qa && npx -y @puppeteer/browsers install chrome-headless-shell@stable --path ~/.cache/puppeteer >/dev/null )
sudo apt-get update -qq >/dev/null 2>&1 || true
( cd ~/.local/debs && apt-get download libxdamage1 libasound2t64 libatk1.0-0t64 libatk-bridge2.0-0t64 libatspi2.0-0t64 libnspr4 libnss3 libxkbcommon0 >/dev/null 2>&1 || apt-get download libxdamage1 libasound2 libatk1.0-0 libatk-bridge2.0-0 libatspi2.0-0 libnspr4 libnss3 libxkbcommon0 >/dev/null 2>&1 )
for d in ~/.local/debs/*.deb; do dpkg -x "$d" ~/.local/syslibs; done
echo "QA stack ready. LD_LIBRARY_PATH=~/.local/syslibs/usr/lib/x86_64-linux-gnu node tools/e2e/qa.mjs"
