#!/usr/bin/env python3
"""시너지스 홈페이지 로컬 검증 — 레이아웃·이미지·콘솔·구조화 데이터.

사용법:
    python3 tools/verify.py            # 서버를 직접 띄워 검사
    python3 tools/verify.py --url http://127.0.0.1:8080/

검사 항목
- 데스크톱 1440×900 / 모바일 390×844 에서 가로 넘침(overflow) 0
- 깨진 이미지(load 실패) 0
- 콘솔 오류·페이지 예외·요청 실패 0
- 필수 시맨틱 태그(h1 1개, header/main/section/article, FAQ details 10개)
- JSON-LD 파싱 + Organization/SoftwareApplication/FAQPage 존재
- 내부 앵커(#id) 대상 존재
- 스크린샷 저장 (tools/out/)
"""
from __future__ import annotations

import argparse
import http.server
import json
import os
import re
import socketserver
import sys
import threading
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "tools" / "out"


def serve(port: int):
    handler = lambda *a, **k: http.server.SimpleHTTPRequestHandler(  # noqa: E731
        *a, directory=str(ROOT), **k
    )
    socketserver.TCPServer.allow_reuse_address = True
    httpd = socketserver.TCPServer(("127.0.0.1", port), handler)
    t = threading.Thread(target=httpd.serve_forever, daemon=True)
    t.start()
    return httpd


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", default=None)
    ap.add_argument("--port", type=int, default=8977)
    args = ap.parse_args()

    httpd = None
    url = args.url
    if not url:
        httpd = serve(args.port)
        url = f"http://127.0.0.1:{args.port}/"

    from playwright.sync_api import sync_playwright

    OUT.mkdir(parents=True, exist_ok=True)
    problems: list[str] = []
    info: dict = {}

    with sync_playwright() as p:
        browser = p.chromium.launch()
        for name, w, h, full in [
            ("desktop", 1440, 900, True),
            ("desktop-hero", 1440, 900, False),
            ("mobile", 390, 844, True),
            ("mobile-hero", 390, 844, False),
            ("tablet", 820, 1180, True),
            ("laptop", 1280, 800, True),
            ("small", 1024, 768, False),
        ]:
            page = browser.new_page(viewport={"width": w, "height": h},
                                    device_scale_factor=1 if "mobile" in name else 1)
            errors: list[str] = []
            page.on("console", lambda m: errors.append(f"console.{m.type}: {m.text}")
                    if m.type in ("error",) else None)
            page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
            page.on("requestfailed", lambda r: errors.append(f"requestfailed: {r.url} {r.failure}"))
            page.goto(url, wait_until="networkidle")
            page.wait_for_timeout(600)
            try:
                page.wait_for_function(
                    "() => [...document.images].every(i => i.naturalWidth > 0)",
                    timeout=8000)
            except Exception:
                pass

            # 넘침 / 깨진 이미지
            metrics = page.evaluate("""() => {
              const de = document.documentElement;
              const imgs = [...document.images].map(i => ({
                src: i.currentSrc || i.src, ok: i.naturalWidth > 0,
                w: i.naturalWidth, h: i.naturalHeight }));
              const skip = '.hero__bg,.hero__veil,.hero__grid,.orb__ring,.cta__bg';
              const wide = [...document.querySelectorAll('body *')]
                .filter(el => !el.matches(skip) && !el.closest('[role="presentation"]'))
                .filter(el => { const r = el.getBoundingClientRect();
                  return r.width > 0 && (r.right > de.clientWidth + 1 || r.left < -1); })
                .slice(0, 12)
                .map(el => el.tagName + '.' + (el.className && el.className.toString().split(' ')[0] || '')
                     + ' [' + Math.round(el.getBoundingClientRect().left) + ',' +
                     Math.round(el.getBoundingClientRect().right) + ']');
              return { scrollW: de.scrollWidth, clientW: de.clientWidth,
                       scrollH: de.scrollHeight, imgs, wide,
                       h1: document.querySelectorAll('h1').length,
                       sections: document.querySelectorAll('main section').length,
                       faq: document.querySelectorAll('.faq details').length,
                       title: document.title,
                       desc: (document.querySelector('meta[name=description]')||{}).content || '' };
            }""")

            if metrics["scrollW"] > metrics["clientW"] + 1:
                problems.append(f"{name}: 가로 넘침 {metrics['scrollW']}px > {metrics['clientW']}px")
            if metrics["wide"]:
                problems.append(f"{name}: 화면 밖 요소 {metrics['wide']}")
            bad = [i for i in metrics["imgs"] if not i["ok"]]
            if bad:
                problems.append(f"{name}: 깨진 이미지 {bad}")
            if errors:
                problems.append(f"{name}: 콘솔/네트워크 오류 {errors}")

            if full:
                # 등장 애니메이션을 실제 스크롤로 발동시킨 뒤 전체 페이지를 찍는다
                page.add_style_tag(content="#header{position:absolute !important}")
                page.evaluate("""async () => {
                  document.documentElement.style.scrollBehavior = 'auto';
                  const step = Math.round(window.innerHeight * 0.6);
                  const end = () => document.documentElement.scrollHeight;
                  for (let y = 0; y < end(); y += step) {
                    window.scrollTo({top: y, behavior: 'instant'});
                    await new Promise(r => setTimeout(r, 120));
                  }
                  window.scrollTo({top: end(), behavior: 'instant'});
                  await new Promise(r => setTimeout(r, 500));
                  window.scrollTo({top: 0, behavior: 'instant'});
                  await new Promise(r => setTimeout(r, 400));
                }""")
            if name.endswith("-hero"):
                page.screenshot(path=str(OUT / f"{name}.png"))
            else:
                page.screenshot(path=str(OUT / f"{name}.png"), full_page=full)
            info[name] = {k: metrics[k] for k in ("scrollW", "clientW", "scrollH", "h1", "sections", "faq")}
            page.close()

        # 구조 검사 (데스크톱)
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        page.goto(url, wait_until="networkidle")

        ld = page.evaluate("""() => [...document.querySelectorAll('script[type="application/ld+json"]')]
            .map(s => s.textContent)""")
        types: list[str] = []
        for block in ld:
            try:
                data = json.loads(block)
            except Exception as e:  # noqa: BLE001
                problems.append(f"JSON-LD 파싱 실패: {e}")
                continue
            nodes = data.get("@graph", [data])
            types += [n.get("@type") for n in nodes]
        for need in ("Organization", "SoftwareApplication", "FAQPage"):
            if need not in types:
                problems.append(f"JSON-LD 누락: {need}")

        anchors = page.evaluate("""() => {
            const bad = [];
            document.querySelectorAll('a[href^="#"]').forEach(a => {
                const id = a.getAttribute('href').slice(1);
                if (id && !document.getElementById(id)) bad.push(a.getAttribute('href'));
            });
            return bad; }""")
        if anchors:
            problems.append(f"없는 앵커: {sorted(set(anchors))}")

        # 한글 텍스트에 깨진 글자(replacement char) 없는지
        text = page.inner_text("body")
        if "\ufffd" in text:
            problems.append("본문에 깨진 문자()가 있습니다")

        # 내부 링크 자원 확인 (CSS/JS/llms/robots/sitemap)
        for rel in ("styles.css", "app.js", "llms.txt", "robots.txt", "sitemap.xml",
                    "assets/og-image.jpg", "assets/hero-forest.webp"):
            resp = page.request.get(url.rstrip("/") + "/" + rel)
            if resp.status != 200:
                problems.append(f"{rel} → HTTP {resp.status}")

        # 접근성 기본 점검
        a11y = page.evaluate("""() => {
            const out = {};
            out.imgsNoAlt = [...document.images].filter(i => !i.hasAttribute('alt')).length;
            out.emptyLinks = [...document.querySelectorAll('a')].filter(a =>
                !(a.textContent || '').trim() && !a.getAttribute('aria-label')).length;
            out.buttonsNoName = [...document.querySelectorAll('button')].filter(b =>
                !(b.textContent || '').trim() && !b.getAttribute('aria-label')).length;
            out.lang = document.documentElement.lang;
            out.headings = [...document.querySelectorAll('h1,h2,h3,h4')].map(h => h.tagName);
            out.dupIds = (() => {
                const seen = new Set(), dup = [];
                document.querySelectorAll('[id]').forEach(el => {
                    if (seen.has(el.id)) dup.push(el.id); else seen.add(el.id);
                });
                return dup;
            })();
            out.tinyText = [...document.querySelectorAll('p,li,dd,td')].filter(el => {
                const fs = parseFloat(getComputedStyle(el).fontSize);
                return fs > 0 && fs < 12;
            }).length;
            return out;
        }""")
        if a11y["imgsNoAlt"]:
            problems.append(f"alt 없는 이미지 {a11y['imgsNoAlt']}개")
        if a11y["emptyLinks"]:
            problems.append(f"이름 없는 링크 {a11y['emptyLinks']}개")
        if a11y["buttonsNoName"]:
            problems.append(f"이름 없는 버튼 {a11y['buttonsNoName']}개")
        if a11y["lang"] != "ko":
            problems.append(f"html lang={a11y['lang']}")
        if a11y["dupIds"]:
            problems.append(f"중복 id: {sorted(set(a11y['dupIds']))}")
        order = [h for h in a11y["headings"]]
        if order and order[0] != "H1":
            problems.append(f"첫 제목이 H1이 아님: {order[0]}")
        if a11y["tinyText"]:
            problems.append(f"12px 미만 본문 요소 {a11y['tinyText']}개")

        # FAQ 질문-답변 쌍이 JSON-LD와 화면에서 같은 개수·내용인지
        faq_dom = page.evaluate("() => document.querySelectorAll('.faq details').length")
        if faq_dom != 10:
            problems.append(f"FAQ 개수 {faq_dom} (기대 10)")

        faq_visible = page.evaluate("""() => [...document.querySelectorAll('.faq details')].map(d => ({
            q: d.querySelector('summary').innerText.replace(/^Q\\d+\\s*/, '').replace(/\\s+/g, ' ').trim(),
            a: d.querySelector('.a').textContent.replace(/\\s+/g, ' ').trim() }))""")
        faq_ld = []
        for block in ld:
            try:
                data = json.loads(block)
            except Exception:
                continue
            for node in data.get("@graph", [data]):
                if node.get("@type") == "FAQPage":
                    for q in node.get("mainEntity", []):
                        faq_ld.append({"q": q["name"].replace("\n", " ").strip(),
                                       "a": q["acceptedAnswer"]["text"].replace("\n", " ").strip()})
        for i, (v, j) in enumerate(zip(faq_visible, faq_ld), 1):
            if v["q"] != j["q"]:
                problems.append(f"FAQ Q{i} 질문 불일치: 화면='{v['q']}' 스키마='{j['q']}'")
            if v["a"] != j["a"]:
                problems.append(f"FAQ Q{i} 답변 불일치")
        if len(faq_ld) != faq_dom:
            problems.append(f"FAQ 스키마 {len(faq_ld)}개 / 화면 {faq_dom}개")

        # 메타 길이
        meta = page.evaluate("""() => ({
            title: document.title,
            desc: (document.querySelector('meta[name=description]')||{}).content||'',
            canonical: (document.querySelector('link[rel=canonical]')||{}).href||'',
            ogimg: (document.querySelector('meta[property=\"og:image\"]')||{}).content||''
        })""")
        info["meta"] = {"title_len": len(meta["title"]), "desc_len": len(meta["desc"]),
                        "canonical": meta["canonical"], "og_image": meta["ogimg"]}
        if not (25 <= len(meta["title"]) <= 70):
            problems.append(f"title 길이 {len(meta['title'])}자")
        if not (70 <= len(meta["desc"]) <= 180):
            problems.append(f"description 길이 {len(meta['desc'])}자")

        page.close()
        browser.close()

    if httpd:
        httpd.shutdown()

    print(json.dumps({"ok": not problems, "problems": problems, "info": info},
                     ensure_ascii=False, indent=2))
    print(f"\n스크린샷: {OUT}")
    return 0 if not problems else 1


if __name__ == "__main__":
    sys.exit(main())
