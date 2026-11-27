# 시너지스 (SynerSI) — 홈페이지

치유관광 프로그램 효과검증 및 관리 포털 **시너지스(SynerSI)** 의 공식 소개 사이트입니다.
빌드 도구 없이 `index.html` · `styles.css` · `app.js` 세 파일과 `assets/` 만으로 동작하는 정적 사이트이며,
GitHub Pages(`https://profusive68-ship-it.github.io/synersi-homepage/`)에 그대로 배포됩니다.

## 디자인 언어

| 항목 | 값 |
| --- | --- |
| 다크 | Obsidian `#0B0E0D` · `#101513` |
| 라이트 | Alabaster `#F6F4EF` · Paper `#FBFAF7` |
| 액센트 | Sage `#1E5645` / `#2C6A55` / `#8FB6A2` |
| 금속 | Champagne `#C8B79A` |
| 디스플레이 | `SynerSI Serif` (Noto Serif KR 서브셋, `assets/fonts/synersi-serif.woff`) |
| 본문 | `Pretendard` 400·500·600·700 (`assets/fonts/`) |
| 숫자·라벨 | 시스템 모노, tabular-nums |

원칙

- **선(線)으로 나눈다.** 카드와 그림자 대신 1px 헤어라인과 여백으로 위계를 만든다.
- **글로우·네온·그라디언트 배경을 쓰지 않는다.** 다크 섹션은 평평한 흑요석 위에 4% 이하의 빛만 얹는다.
- **숫자는 임상 리포트처럼.** 표·축·구간 라벨은 모노, 수치는 tabular-nums, 색은 세이지 한 가지.
- **브랜드 3D 크리스탈은 한 곳에서만** 크게 보여 준다(회사 소개 화이트 플레이트). 헤더는 34px 심볼 + 조판 워드마크.
- 한국어는 `word-break: keep-all` 로 어절 단위 줄바꿈.

## 구조

```
index.html                 한 페이지 (12개 섹션) + JSON-LD @graph
styles.css                 디자인 토큰 · 레이아웃 · 반응형
app.js                     헤더·메뉴·탭·SVG 차트·20인 그리드·복사 토스트
llms.txt                   LLM/생성형 검색용 사이트 요약 (섹션·사양·FAQ 전체)
robots.txt                 검색·AI 크롤러 허용
sitemap.xml / site.webmanifest
assets/
  brand/                   상징(symbol) · 3D 워드마크 · 파비콘
  fonts/                   Pretendard 4종 + 서브셋 세리프
  og-image.jpg             소셜 카드 1200×630
tools/verify.py            로컬/원격 검증 (넘침·깨진 이미지·콘솔·JSON-LD·FAQ 일치)
tools/shot.py              디자인 리뷰용 섹션 스크린샷
```

## 섹션

1. Hero — “치유의 순간을, 기록으로 남깁니다.” + 개인 회복 리포트 카드(예시)
2. 제품 미리보기 — 실시간 20인 관제 / HRV 회복 곡선 / 효과 리포트 3탭 (인터랙티브)
3. 회사 소개 — 브랜드 플레이트
4. 검증이 필요한 이유 — 3가지 문제 + 인용
5. 증거 아키텍처 — Watch → iPhone → iPad → macOS 현장 서버
6. 운영 6단계 — 입소·매칭 → 일정 → 관제 → OCR → 리포트 → 파기
7. 기술 사양 — 12행 표
8. 보안·개인정보 — 4원칙 + 5단계 처리 흐름
9. 도입 대상 — 5개 기관 유형
10. 도입 절차 — 4단계
11. FAQ — 10문항 (JSON-LD `FAQPage` 와 문구 100% 동일)
12. 도입 문의 — 이메일 · 주소 복사 · 체크리스트

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
