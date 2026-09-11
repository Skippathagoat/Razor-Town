#!/usr/bin/env python3
"""
FIXBOT — the site's own watchdog + field-medic.
=================================================

A little Python bot that sits next to your browser, keeps a live copy of
the game open, watches it for errors, and repairs the usual breakage on
its own. If it ever can't, it writes you a ready-made bug report to hand
back (screenshot + console log included).

WHEN TO RUN IT
--------------
Run it while you play. It opens its own small browser window (or an
invisible one), so it doesn't touch the tab you are playing in — it just
patrols a copy of the same site and fixes it the moment something on the
page side snaps (stale scripts, busted cache, hung session…).

WHAT IT FIXES BY ITSELF (the repair ladder)
--------------------------------------------
  rung 1  soft reload                (page unresponsive / heartbeat lost)
  rung 2  hard reload, cache flushed (stale app.js / old assets after deploy)
  rung 3  session purge + reload     (corrupt localStorage, hung UI state)

If all three rungs fail it stops touching the page and saves a report
folder with console errors, the failed-network list and a screenshot —
send me that folder (or paste fixbot-report.json) and I get a real fix
out of it fast.

INSTALL (once)
--------------
  pip install playwright
  playwright install chromium

(Or just run the bot once and answer yes when it offers to do that for
you.)

RUN
---
  python3 tools/fixbot.py                     # headless patrol, forever
  python3 tools/fixbot.py --show              # open the medic's window so
                                              # you can watch it work
  python3 tools/fixbot.py --once              # single health check, exit
                                              # code 0 ok / 1 repaired / 2 needs a human
  python3 tools/fixbot.py --url http://my-copy:9546   # watch a local copy
  python3 tools/fixbot.py --every 20          # patrol every 20 s (default 30)

Stop it with Ctrl+C.
"""

import argparse
import json
import os
import pathlib
import shutil
import subprocess
import sys
import time

DEFAULT_URL = os.environ.get("FIXBOT_URL", "http://localhost:9546")
REPORTS = pathlib.Path(__file__).resolve().parent / "fixbot-reports"

# --------------------------------------------------------------------------
# console chatter
# --------------------------------------------------------------------------

def say(msg, tag="•"):
    print(f"[fixbot {time.strftime('%H:%M:%S')}] {tag} {msg}", flush=True)


def bootstrap_playwright():
    try:
        import playwright  # noqa: F401
        return True
    except ImportError:
        pass
    ans = input(
        "fixbot needs the playwright package (~one-off install).\n"
        "Install it now with:  pip install playwright && playwright install chromium ? [Y/n] "
    ).strip().lower()
    if ans in ("", "y", "yes"):
        subprocess.check_call([sys.executable, "-m", "pip", "install", "playwright"])
        subprocess.check_call([sys.executable, "-m", "playwright", "install", "chromium"])
        try:
            import playwright  # noqa: F401
            return True
        except ImportError:
            pass
    say("playwright missing — bot can't drive a browser without it.", "✗")
    return False


class FixBot:
    """Patrols one copy of the site; climbs the repair ladder when it snaps."""

    def __init__(self, url, every=30, show=False, window_size="1280,800"):
        self.url = url.rstrip("/")
        self.every = every
        self.show = show
        self.window = window_size
        self.errors = []          # console/page errors seen this cycle
        self.failures = []        # network requests that 4xx/5xx'd this cycle
        self.repairs = 0          # repairs applied since boot
        self.cycles = 0
        self.browser = None
        self.page = None

    # ---- lifecycle -------------------------------------------------------

    def boot(self, pw):
        say(f"patrolling {self.url} every {self.every}s — Ctrl+C to retire me", "▶")
        self.pw = pw
        w, h = (int(x) for x in self.window.split(","))
        launch = dict(headless=not self.show, args=["--no-sandbox", "--disable-dev-shm-usage"])
        if self.show:
            launch["args"].append(f"--window-size={w},{h}")
        self.browser = pw.chromium.launch(**launch)
        self.context = self.browser.new_context(viewport={"width": w, "height": h}, ignore_https_errors=True)
        self._open_page()

    def _open_page(self):
        if getattr(self, "page", None):
            try:
                self.page.close()
            except Exception:
                pass
        self.page = self.context.new_page()
        self.page.on("pageerror", lambda e: self.errors.append(f"pageerror: {e}"))
        self.page.on("console", lambda m: self.errors.append(f"console: {m.text[:200]}") if m.type == "error" else None)
        self.page.on("response", lambda r: self.failures.append(f"{r.status} {r.url[:120]}") if r.status >= 400 else None)
        try:
            self.page.goto(self.url, wait_until="domcontentloaded", timeout=20000)
        except Exception as e:
            self.errors.append(f"goto failed: {e}")

    # ---- health -----------------------------------------------------------

    def heartbeat(self):
        """True when the page is alive and showing either the game or login form."""
        try:
            self.page.wait_for_selector(
                "#rail, #seek, form[action], input[type='password'], .auth, #view",
                timeout=8000,
            )
            dead = self.page.evaluate(
                "() => { const b = document.body; const t = b ? b.innerText : '';"
                " return /cannot GET|not found|internal server error|service unavailable/i.test(t.slice(0, 400)); }"
            )
            return not dead
        except Exception as e:
            self.errors.append(f"heartbeat: {e}")
            return False

    # ---- the repair ladder ------------------------------------------------

    def _purge_cache(self):
        try:
            session = self.context.new_cdp_session(self.page)
            session.send("Network.enable")
            session.send("Network.clearBrowserCache")
        except Exception:
            pass

    def _purge_storage(self):
        try:
            self.page.evaluate("() => { localStorage.clear(); sessionStorage.clear(); }")
        except Exception:
            pass

    def repair(self):
        """Climb the ladder until the heartbeat comes back. Returns rung reached or None."""
        rungs = [
            ("soft reload", lambda: self.page.reload(wait_until="domcontentloaded", timeout=20000)),
            ("hard reload + clear browser cache", lambda: (self._purge_cache(), self.page.reload(wait_until="domcontentloaded", timeout=20000))),
            ("session purge + reload", lambda: (self._purge_storage(), self._purge_cache(), self.page.reload(wait_until="domcontentloaded", timeout=20000))),
            ("fresh page", self._open_page),
        ]
        for i, (name, op) in enumerate(rungs, 1):
            say(f"repair rung {i}: {name}", "🔧")
            try:
                op()
            except Exception as e:
                self.errors.append(f"rung {i} threw: {e}")
            time.sleep(2)
            if self.heartbeat():
                say(f"RECOVERED on rung {i} ({name})", "✓")
                self.repairs += 1
                return i
        return None

    def write_report(self):
        stamp = time.strftime("%Y%m%d-%H%M%S")
        folder = REPORTS / f"crash-{stamp}"
        folder.mkdir(parents=True, exist_ok=True)
        shot = folder / "page.png"
        try:
            self.page.screenshot(path=str(shot), full_page=True)
        except Exception:
            shot = None
        report = {
            "when": stamp,
            "url": self.url,
            "console_errors": self.errors[-40:],
            "bad_requests": self.failures[-40:],
            "screenshot": str(shot) if shot else None,
        }
        out = folder / "fixbot-report.json"
        out.write_text(json.dumps(report, indent=2))
        say(f"all rungs failed — bug report saved to {out}", "⚠")
        return out

    # ---- main loop ---------------------------------------------------------

    def patrol_once(self):
        ok = self.heartbeat()
        self.cycles += 1
        if ok and not self.errors:
            say("healthy — page booted, no console errors", "✓")
            self.errors.clear(); self.failures.clear()
            return 0
        for note in (self.errors[:4] + self.failures[:4]):
            say(f"noticed: {note}", "·")
        rung = self.repair()
        if rung:
            self.errors.clear(); self.failures.clear()
            return 1
        self.write_report()
        self.errors.clear(); self.failures.clear()
        return 2

    def run(self, once=False):
        from playwright.sync_api import sync_playwright
        with sync_playwright() as pw:
            self.boot(pw)
            if once:
                code = self.patrol_once()
                self._close()
                return code
            try:
                while True:
                    self.patrol_once()
                    time.sleep(self.every)
            except KeyboardInterrupt:
                say(f"retiring — {self.cycles} patrols, {self.repairs} repairs applied", "⏏")
            finally:
                self._close()
        return 0

    def _close(self):
        try:
            self.browser.close()
        except Exception:
            pass


def main():
    ap = argparse.ArgumentParser(description="Watchdog + field medic for the site.")
    ap.add_argument("--url", default=DEFAULT_URL, help=f"site to patrol (default {DEFAULT_URL})")
    ap.add_argument("--every", type=int, default=30, help="seconds between patrols (default 30)")
    ap.add_argument("--show", action="store_true", help="show the medic's browser window")
    ap.add_argument("--once", action="store_true", help="run a single patrol and exit with a status code")
    args = ap.parse_args()

    if not bootstrap_playwright():
        sys.exit(3)
    bot = FixBot(args.url, every=args.every, show=args.show)
    sys.exit(bot.run(once=args.once))


if __name__ == "__main__":
    main()
