#!/usr/bin/env python3
"""Quick local screenshot helper for design review.

usage: python3 tools/shot.py [--mobile] [--tabs] prefix
Saves viewport shots at several scroll positions + full page into tools/out/.
"""
import argparse
import functools
import http.server
import os
import pathlib
import socketserver
import threading

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "tools" / "out"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("prefix")
    ap.add_argument("--url", default=None)
    args = ap.parse_args()

    OUT.mkdir(exist_ok=True)
    srv = None
    url = args.url
    if not url:
        handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(ROOT))
        socketserver.TCPServer.allow_reuse_address = True
        srv = socketserver.TCPServer(("127.0.0.1", 8992), handler)
        threading.Thread(target=srv.serve_forever, daemon=True).start()
        url = "http://127.0.0.1:8992/"

    from playwright.sync_api import sync_playwright

    with sync_playwright() as p:
        b = p.chromium.launch()
        for label, w, h in (("d", 1440, 900), ("m", 390, 844)):
            pg = b.new_page(viewport={"width": w, "height": h}, device_scale_factor=1)
            errs = []
            pg.on("console", lambda m: errs.append(f"{m.type}: {m.text}") if m.type == "error" else None)
            pg.on("pageerror", lambda e: errs.append(f"pageerror: {e}"))
            pg.goto(url, wait_until="networkidle")
            pg.wait_for_timeout(1500)
            pg.evaluate("""async () => {
              const step = Math.round(window.innerHeight * 0.5);
              for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
                window.scrollTo(0, y); await new Promise(r => setTimeout(r, 90));
              }
              window.scrollTo(0, 0); await new Promise(r => setTimeout(r, 700));
            }""")
            pg.screenshot(path=str(OUT / f"{args.prefix}_{label}_full.png"), full_page=True)
            for i, sel in enumerate(
                ["#top", "#product", "#about", "#why", "#architecture", "#stages",
                 "#specs", "#trust", "#who", "#process", "#faq", "#contact"]
            ):
                pg.evaluate(f"document.querySelector('{sel}').scrollIntoView({{block:'start'}})")
                pg.wait_for_timeout(650)
                pg.screenshot(path=str(OUT / f"{args.prefix}_{label}_{i:02d}{sel.strip('#')}.png"))
            if errs:
                print("errors:", errs)
            pg.close()
        b.close()

    if srv:
        srv.shutdown()
    print("saved to", OUT)


if __name__ == "__main__":
    main()
