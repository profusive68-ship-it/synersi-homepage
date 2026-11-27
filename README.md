# 시너지스 (SynerSI) — AI 검색 최적화 홈페이지

치유관광·웰니스 프로그램 효과검증 솔루션 **시너지스(SynerSI)** 의 정적 홈페이지입니다.
서버·프레임워크 없이 `index.html` 하나로 동작하며, 어떤 정적 호스팅(GitHub Pages, Netlify, Vercel, S3, 카페24 등)에도 그대로 올릴 수 있습니다.

## 파일 구성

```
synersi-homepage/
├── index.html            # 홈페이지 본문 + 메타태그 + JSON-LD(구조화 데이터)
├── styles.css            # 디자인 시스템 (다크 포레스트·사파이어 크리스탈)
├── app.js                # 헤더 상태 · 모바일 메뉴 · 스크롤 등장 · FAQ 아코디언
├── llms.txt              # LLM(ChatGPT·Perplexity 등) 크롤러용 사이트 요약
├── robots.txt            # GPTBot·OAI-SearchBot·PerplexityBot·Google-Extended·ClaudeBot·Yeti 등 허용
├── sitemap.xml           # 검색엔진 사이트맵
├── site.webmanifest      # 홈 화면 추가(PWA) 메타
├── assets/               # 로고·히어로 이미지·OG 이미지·파비콘
└── tools/verify.py       # 로컬 검증 스크립트 (Playwright)
```

## AI 검색(GEO/AIO) 최적화 내역

- **정의 블록** — `#about` 절의 "시너지스(SynerSI)는 …" 문장을 AI가 그대로 인용할 수 있는 형태로 배치.
- **구조화 데이터(JSON-LD)** — `Organization` · `WebSite` · `SoftwareApplication` · `Service` · `FAQPage` 5종을 `@graph`로 연결.
- **FAQ 10문항** — 화면의 질문·답변과 `FAQPage` 스키마의 텍스트가 동일합니다(수정 시 양쪽을 함께 고쳐야 함).
- **llms.txt** — 회사 개요, 1~6단계, 기술 사양, 개인정보 원칙, FAQ, 인용 표기 가이드.
- **robots.txt** — 주요 AI 크롤러를 개별 `User-agent`로 명시 허용 + `Sitemap:` 지정.
- **메타** — canonical, Open Graph, Twitter Card, `max-snippet:-1`, 1200×630 OG 이미지.

## 배포 주소

- 저장소: <https://github.com/profusive68-ship-it/synersi-homepage> (공개)
- 라이브 사이트: <https://profusive68-ship-it.github.io/synersi-homepage/>
- GitHub Pages 설정: `main` 브랜치 / 루트(`/`) 배포

모든 도메인 표기(canonical·og:url·og:image, `sitemap.xml`, `llms.txt`, `robots.txt`)는 위 라이브 주소로 맞춰져 있습니다.
`site.webmanifest`의 `start_url`·`scope`는 `./`, `index.html`의 `llms.txt` alternate 링크는 상대 경로라서 `/synersi-homepage/` 하위 경로에서도 그대로 동작합니다.

## 확정되지 않은 값 (임시값)

| 항목 | 현재 값 | 위치 |
|---|---|---|
| 문의 이메일 | `profusive68@gmail.com` | `index.html`(본문·CTA·JSON-LD), `llms.txt` |
| 소재지 | 제주특별자치도 서귀포시 | `index.html`, `llms.txt` |
| 전화번호 | 없음 | 확정 시 `#contact` 카드와 JSON-LD `contactPoint`에 추가 |
| 사업자 정보 | 없음 | 확정 시 푸터에 대표·사업자등록번호 추가 |

자체 도메인(`synersi.co.kr` 등)을 붙이면 루트에 `CNAME` 파일을 추가하고,

```bash
grep -rl "profusive68-ship-it.github.io/synersi-homepage" . \
  | xargs sed -i 's|https://profusive68-ship-it.github.io/synersi-homepage|https://새도메인|g'
```

로 주소를 한 번에 바꿉니다.

## 로컬에서 보기

```bash
cd synersi-homepage
python3 -m http.server 8080
# 브라우저에서 http://127.0.0.1:8080/
```

## 검증

```bash
# 이 작업 환경에서 (헤드리스 크로미움 라이브러리 필요)
LD_LIBRARY_PATH=/workspace/pw-chromium-libs/libs/usr/lib/x86_64-linux-gnu \
  python3 tools/verify.py

# 일반 맥/PC에서
python3 tools/verify.py
```

검사 항목: 1440×900 / 820×1180 / 390×844 가로 넘침, 깨진 이미지, 콘솔·네트워크 오류,
h1 개수, FAQ 개수, JSON-LD 파싱·필수 타입, 내부 앵커, 필수 파일 HTTP 200.
스크린샷은 `tools/out/`에 저장됩니다.

## 배포 (GitHub Pages)

```bash
git add . && git commit -m "..." && git push origin main
# Pages: main / (root) — 푸시하면 1분 안에 자동 반영
gh api -X POST repos/profusive68-ship-it/synersi-homepage/pages \
  -f 'source[branch]=main' -f 'source[path]=/'
```

`.nojekyll`이 있어 Jekyll 빌드 없이 정적 파일이 그대로 올라가고, `tools/out/`(검증 스크린샷)은 `.gitignore`로 제외됩니다.

## 참고

- 제품 사양은 비공개 저장소 `profusive68-ship-it/wellness-camp-system`의 구현(1~6단계, 1Hz 수집, 아이폰 1대당 워치 5대, 오프라인 큐 1시간, 20명 관제, 정원 50명, 4종 검사지 OCR, 5개 언어 리포트, 신뢰도 100점, 익명 통계 k=5)을 기준으로 작성했습니다.
- 의료법·표시광고 이슈를 피하기 위해 진단·치료 표현은 쓰지 않고 "웰니스 효과검증"으로만 표기하며, 비의료 고지를 넣었습니다.
- 사이트는 공개 저장소에 배포되어 GitHub Pages로 서비스 중입니다. 자체 도메인·전화번호·사업자 정보는 확정되면 갱신합니다.
