# 시너지스 (SynerSI) — 홈페이지

치유관광 프로그램 효과검증 및 관리 포털 **시너지스(SynerSI)** 의 공식 소개 사이트입니다.
빌드 도구 없이 `index.html` · `styles.css` · `app.js` 세 파일과 `assets/` 만으로 동작하는 정적 사이트이며,
GitHub Pages(`https://profusive68-ship-it.github.io/synersi-homepage/`)에 그대로 배포됩니다.

## 디자인 언어 — Matte Obsidian / Biometric Glass

Apple Health·Whoop 계열의 다크 하이테크. 검은 현무암 위의 워치와, 그 위에 떠 있는 유리질 생체신호 패널이 첫인상을 만듭니다.

| 항목 | 값 |
| --- | --- |
| 배경 | Obsidian `#060808` · Raised `#080B0A` |
| 패널 | `rgba(255,255,255,.03)` + `1px rgba(255,255,255,.09)` 테두리 + `backdrop-filter: blur(20px)` |
| 액센트 | Emerald-Cyan `#34E0A1` · `#4EF2B8` · `#8CF7D2` |
| 경고·과부하 | Amber `#E2B567` · Red `#E5786B` |
| 본문 | Pretendard 400·500·600·700 (`assets/fonts/`) |
| 숫자·라벨 | 시스템 모노, `tabular-nums` |
| 히어로 아트 | `assets/brand/hero-watch.webp`(데스크톱) · `hero-watch-mobile.webp`(≤720px) |

원칙

- **어두운 유리 위에 빛을 얹는다.** 카드는 반투명 유리, 경계는 1px 헤어라인, 강조는 에메랄드 한 색.
- **숫자가 주인공.** 대시보드의 수치는 크고 가늘게, 라벨은 작은 모노로. 모든 예시 화면에는 `예시 데이터` 배지를 붙인다.
- **가짜 제3자 로고를 쓰지 않는다.** 히어로 하단은 실제 도입 대상(지자체 치유의 숲·웰니스 관광 사업단·호텔·리조트·기업·학술 기관)만 적는다.
- **주장은 제품에 근거한다.** 1Hz·아이폰 1대당 워치 5대·20인 그리드·최대 50명·오프라인 1시간 3,600건·4종 OCR·5개 언어·2단 파기·비의료 고지.
- 한국어는 `word-break: keep-all` 로 어절 단위 줄바꿈.

## 구조

```
index.html                 한 페이지 (12개 섹션) + JSON-LD @graph
styles.css                 디자인 토큰 · 레이아웃 · 반응형 (1320/1180/1080/900/720/380)
app.js                     헤더 · 메뉴 · 히어로 파형 · 1H/6H/24H 토글 · 3탭 · 20인 그리드 · 복사 토스트
llms.txt                   LLM/생성형 검색용 사이트 요약 (섹션·사양·FAQ 전체)
robots.txt                 검색·AI 크롤러 허용
sitemap.xml / site.webmanifest
assets/
  brand/                   심볼 · 3D 크리스탈 · 히어로 워치 아트(데스크톱/모바일) · 파비콘
  fonts/                   Pretendard 4종 (+ 레거시 세리프 서브셋, 현재 미사용)
  og-image.jpg             소셜 카드 1200×630 (히어로에서 캡처)
tools/verify.py            로컬/원격 검증 (넘침·깨진 이미지·콘솔·JSON-LD·FAQ 일치)
tools/sections.py          섹션별 스크린샷 (디자인 리뷰)
tools/shot.py              뷰포트별 스크린샷
```

## 섹션

1. Hero — “측정하고. 분석하고. 증명합니다.” + 워치 아트 + 글래스 대시보드(심박 74 BPM 파형·HRV 82 ms·회복 점수 92)
2. 제품 미리보기 — 실시간 20인 관제 / HRV 회복 곡선 / 효과 리포트 3탭 (인터랙티브)
3. 회사 소개 — 크리스탈 심볼 플레이트
4. 검증이 필요한 이유 — 3가지 문제 + 인용
5. 증거 아키텍처 — Watch → iPhone → iPad → macOS 현장 서버
6. 운영 6단계 — 입소·매칭 → 일정 → 관제 → OCR → 리포트 → 파기
7. 기술 사양 — 12행 표
8. 보안·개인정보 — 4원칙 + 5단계 처리 흐름
9. 도입 대상 — 5개 기관 유형
10. 도입 절차 — 4단계
11. FAQ — 10문항 (JSON-LD `FAQPage` 와 문구 100% 동일)
12. 도입 문의 — 이메일 · 주소 복사 · 체크리스트

### 히어로 아트 교체

`assets/brand/hero-watch.webp` 는 1536×1024 원본에서 가장자리를 알파로 페더링한 파일입니다.
모바일용 `hero-watch-mobile.webp` 는 같은 원본의 워치 영역(70,90)–(1000,1010) 크롭입니다.
아트를 바꿀 때는 두 파일을 함께 만들고, `<picture>` 의 `source` 와 `img` 를 같은 비율로 유지하세요.
원본(`hero-watch.jpg`)은 보관용이며 페이지에서 직접 쓰지 않습니다.

## 검증

```bash
# 로컬 (Playwright Chromium 필요)
python3 tools/verify.py

# 배포 후
python3 tools/verify.py --url https://profusive68-ship-it.github.io/synersi-homepage/
```

검사 항목: 데스크톱·모바일 가로 넘침 0, 깨진 이미지 0, 콘솔 오류 0, h1 1개,
`article`/`section` 구조, JSON-LD 파싱과 Organization·SoftwareApplication·FAQPage 존재,
내부 앵커, FAQ 화면 문구 ↔ 스키마 일치, 12px 미만 본문, 중복 id, 메타 길이.

> 이 실행 환경에서 Chromium 이 `libnspr4.so` 를 찾지 못하면
> `LD_LIBRARY_PATH=/workspace/pw-chromium-libs/libs/usr/lib/x86_64-linux-gnu python3 tools/verify.py`
> 로 실행합니다.

## 문의

- 이메일: profusive68@gmail.com
- 사이트: https://profusive68-ship-it.github.io/synersi-homepage/
- 본 서비스는 웰니스 프로그램의 효과 확인을 위한 검증 도구이며, 의료적 진단·치료를 목적으로 하지 않습니다.
