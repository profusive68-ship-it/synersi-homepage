import http.server, socketserver, threading, pathlib, sys
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).resolve().parent.parent
handler=lambda *a,**k: http.server.SimpleHTTPRequestHandler(*a,directory=str(ROOT),**k)
socketserver.TCPServer.allow_reuse_address=True
httpd=socketserver.TCPServer(('127.0.0.1',8993),handler)
threading.Thread(target=httpd.serve_forever,daemon=True).start()
out=ROOT/'tools/out'
secs=sys.argv[1:] or ['product','about','why','architecture','stages','specs','trust','who','process','faq','contact']
with sync_playwright() as p:
    b=p.chromium.launch()
    pg=b.new_page(viewport={'width':1440,'height':1000},device_scale_factor=1)
    pg.goto('http://127.0.0.1:8993/',wait_until='networkidle')
    pg.evaluate("document.documentElement.style.scrollBehavior='auto'; window.scrollTo(0,0)")
    pg.wait_for_timeout(500)
    pg.screenshot(path=str(out/'hero_1440.png'))
    for s in secs:
        el=pg.query_selector('#'+s)
        if not el: print('missing',s); continue
        el.scroll_into_view_if_needed(); pg.wait_for_timeout(700)
        el.screenshot(path=str(out/f'sec_{s}.png'))
        print('shot',s)
    b.close()
httpd.shutdown()
