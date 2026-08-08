---
title: Vercel Edge Function 1MB 한도 돌파 — next/og 배포 실패 트러블슈팅
slug: vercel-edge-function-1mb-limit-nextjs-og-troubleshooting
description: >-
  next/og(Satori)를 Edge Runtime으로 배포하면 wasm 엔진+한글 폰트가 Hobby 플랜 1MB 한도를 초과한다.
  runtime 한 줄 변경으로 해결하는 과정과 트레이드오프를 정리한다.
published_at: '2026-04-19T08:15:53-07:00'
labels:
  - AI 작성
  - 학습 정리
  - Vercel
  - Next.js
source: >-
  /Users/jeonghyeonseung/개발/how_many/.claude/study/2026-04-19/vercel-runtime-basics.md
draft: false
---

## 📦 1. 배경지식 — Edge Runtime vs Node.js Runtime

| 항목 | Edge Runtime | Node.js Runtime |
| :---: | :---: | :---: |
| 실행 환경 | V8 경량 엔진 (브라우저 JS 엔진 기반) | 정식 Node.js |
| 배포 형태 | Edge Function (전 세계 엣지 노드) | Serverless Function (단일 리전) |
| 사용 가능 API | Web 표준 API만 (`fs`·`path` 등 불가) | 대부분의 Node API·npm 패키지 |
| 번들 한도 (Hobby) | **1 MB** | **50 MB** |
| 콜드 스타트 | 100–500 ms | 1–3 s |

**결정 방법**: 파일 상단의 `export const runtime = '...'` 한 줄이 배포 형태·크기 한도 전체를 결정합니다.

> **참고**: 1MB 한도는 프로젝트 전체가 아닌 **각 Edge Function 단위** 적용입니다. Edge Function이 없으면 이 한도 검사 자체가 없습니다.

---

## 🐛 2. 문제 상황

HM-21 "결과 공유 카드 이미지화" 작업에서 카카오 Feed 썸네일용 서버 OG 이미지를 `app/result/[id]/opengraph-image.tsx` + `runtime = 'edge'`로 구현했습니다. 로컬 빌드는 통과했으나 **Vercel 배포에서 "image size 제한" 오류**로 실패했습니다.

---

## 🔍 3. 진단 — 번들 구성 실측

```bash
npm run build
find .next/server -type f | xargs du -h | sort -hr | head -20
```

실측 결과 (`opengraph-image` Edge Function 번들 5.2 MB):

```text
opengraph-image 번들 (5.2 MB)
├─ JSX/TS 소스 컴파일 결과     : 수십 KB
├─ @vercel/og 라이브러리        : 384 KB
├─ resvg.wasm                   : 1.3 MB   ← SVG→PNG 렌더 엔진 (Rust)
├─ yoga.wasm                    : 88 KB    ← flexbox 레이아웃 엔진 (C++)
├─ Pretendard-Regular.otf       : 1.5 MB   ← 한글 폰트
└─ Pretendard-Bold.otf          : 1.5 MB
```

- **`resvg.wasm` + `yoga.wasm` = 1.4 MB** → 이 둘만으로 Hobby Edge 한도(1 MB)를 초과합니다

- Satori의 내부 변환 파이프라인(`JSX → SVG → resvg.wasm → PNG`)에 두 wasm이 필수이므로 번들에서 제외할 수 없습니다

- `fetch(new URL('./fonts/...', import.meta.url))` 패턴이 폰트 파일을 번들에 포함시켜 +3 MB 추가됩니다

---

## ⚖️ 4. 해결 방향 — 트레이드오프

| 방향 | 내용 | 판단 |
| :---: | :---: | :---: |
| **Node.js Runtime 전환** | `runtime = 'nodejs'` → Serverless Function, 50 MB 한도 | 채택 |
| **번들 축소** | 폰트 subset 생성, wasm 외부 CDN 로드 등 | 공수 대비 효과 불확실, 보류 |
| **Vercel Pro 업그레이드** | Edge 한도 4 MB로 확장 → 폰트 제거 시 통과 가능 | 현 시점 불필요 |

**채택 근거**: OG 이미지는 카카오·CDN 경유로 1년 immutable 캐시가 작동합니다. 콜드 스타트 지연(1–3 s)은 최초 1회로 수렴하므로 사용자 체감 영향이 거의 없습니다.

---

## 🛠️ 5. 해결 — 단 한 줄 변경

```diff
// app/result/[id]/opengraph-image.tsx
- export const runtime = 'edge';
+ export const runtime = 'nodejs';
```

변경 전후 비교:

| 항목 | edge (이전) | nodejs (이후) |
| :---: | :---: | :---: |
| Function 유형 | Edge Function | Serverless Function |
| 번들 한도 (Hobby) | 1 MB | 50 MB |
| 실제 번들 | 5.2 MB (**한도 초과**) | 5.2 MB (**여유**) |
| 콜드 스타트 | 100–500 ms | 1–3 s |
| 캐시 적용 후 체감 | 초회만 지연 | 동일 |

---

## ⚠️ 6. 주의사항

- **폰트 포맷**: Satori는 WOFF2 미지원. TTF·OTF·WOFF만 허용. 번들 최적화 목적으로 WOFF2를 받으면 `Unsupported OpenType signature wOF2` 에러가 발생합니다.

- **`runtime` 선언 위치**: 파일 상단 top-level에 작성해야 합니다. 함수 내부 조건부 선언은 불가능합니다.

- **Node.js 응답 페이로드 한도**: 4.5 MB가 별도로 존재합니다. OG 이미지 PNG는 ~100 KB 수준이므로 문제 없습니다.

---

## ✅ 7. 핵심 정리

- `export const runtime = '...'` 한 줄이 배포 형태(Edge Function / Serverless Function)·번들 크기 한도 전체를 결정합니다.

- next/og(Satori)는 `resvg.wasm` + `yoga.wasm` 최소 1.4 MB를 번들에 강제 포함합니다 — Hobby Edge 1 MB 한도와 구조적으로 충돌합니다.

- 한글 폰트를 번들에 포함하면 파일당 +1.5 MB입니다. `fetch(new URL(...))` 패턴이 폰트를 번들로 당깁니다.

- 캐시가 잘 작동하는 OG 이미지 유즈케이스에서는 Node.js Serverless가 실용적으로 더 적합합니다.

- Edge로 복귀하려면: Pro 업그레이드(4 MB 한도) + 폰트 subset + wasm 공유 등 번들 슬림화를 동시에 진행해야 합니다.

---

## 🔗 참고 자료

- [Vercel Runtimes](https://vercel.com/docs/functions/runtimes)

- [Vercel Limits (Hobby/Pro/Enterprise)](https://vercel.com/docs/limits)

- [Next.js ImageResponse](https://nextjs.org/docs/app/api-reference/functions/image-response)

- [Next.js opengraph-image 파일 컨벤션](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/opengraph-image)

- [Satori (서버 HTML→SVG 렌더)](https://github.com/vercel/satori)

- [Pretendard 폰트](https://github.com/orioncactus/pretendard)
