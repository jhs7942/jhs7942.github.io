---
title: Next.js Turbopack .next 캐시 혼재(cache bleed) 이슈 배경지식 정리
slug: nextjs-turbopack-cache-bleed
description: >-
  next build 직후 next dev를 실행하면 .next 폴더에 두 모드의 산출물이 혼재해 Turbopack이 FATAL panic을
  반복하는 원인과 해결법을 정리한다.
published_at: '2026-04-19T08:14:13-07:00'
labels:
  - AI 작성
  - 학습 정리
  - Next.js
source: >-
  /Users/jeonghyeonseung/개발/how_many/.claude/study/2026-04-17/nextjs-turbopack-cache-bleed.md
legacy_url: 'https://saver7942.blogspot.com/'
draft: false
---

## 📦 1. 배경

- Next.js 16.1.7 + React 19.2.3 + Capacitor 모바일 앱 프로젝트(how_many)에서 발생

- 작업 흐름:
  1. Realtime race 수정(HM-8, HM-22) + Toast safe-area 수정(HM-4) 반영
  2. 검증 목적으로 `npm run build` 실행 → 성공
  3. 로컬 테스트용으로 `npm run dev` 실행 → FATAL 반복
- 요청은 200으로 정상 응답되지만 터미널에 FATAL 로그가 계속 출력되는 상태

```text
FATAL: An unexpected Turbopack error occurred.
A panic log has been written to /var/folders/32/.../T/next-panic-*.log
To help make Turbopack better, report this error by clicking here.
```

- panic log 내부에 `"Next.js package not found"`가 수십 번 반복 기록됨

---

## 🔍 2. 핵심 개념

### 2-1. Next.js 두 가지 실행 모드

| 모드 | 명령 | 용도 | 출력물 |
| :---: | :---: | :---: | :---: |
| **Development** | `next dev` | 로컬 개발 (HMR 포함) | `.next/dev/` 하위 중심 |
| **Production Build** | `next build` | 배포용 최적화 빌드 | `.next/` 루트 + `BUILD_ID`, `build-manifest.json` 등 |
| **Production Start** | `next start` | 빌드 결과로 서버 실행 | `.next/` 루트 사용 (read-only) |

두 모드는 **같은 `.next/` 폴더를 공유**합니다. 이것이 cache bleed 이슈의 실마리입니다.

### 2-2. `.next/` 디렉토리 구성

| 파일/폴더 | 생성 주체 | 역할 |
| :---: | :---: | :---: |
| `BUILD_ID` | `build` | 프로덕션 빌드 식별자 (해시) |
| `build-manifest.json` | `build` | 페이지별 번들 매핑 |
| `export-marker.json` | `build` | 정적 export 여부 표식 |
| `next-server.js.nft.json` | `build` | 서버 실행에 필요한 파일 트레이스 |
| `dev/` | `dev` | Turbopack의 HMR 작업 공간 |
| `cache/` | 공용 | 모듈 변환 결과 캐시 |

프로덕션 빌드가 남긴 `BUILD_ID`나 `export-marker.json`은 dev 모드 입장에서 "외계 파일"입니다. Turbopack이 컴파일 컨텍스트를 구성할 때 폴더를 스캔하다 이 파일들을 발견하면 판단이 흔들립니다.

### 2-3. Turbopack

Next.js에 내장된 **Rust 기반 번들러**. Webpack을 대체하기 위해 Vercel이 개발했으며 Next.js 16부터 기본값입니다.

- 빠른 incremental compilation (바뀐 부분만 재컴파일)

- Rust의 Salsa 스타일 memoization 프레임워크 `turbo-tasks` 기반

- 각 컴파일 단계가 "task"로 메모이제이션되며 task들은 의존성 그래프를 이룹니다

### 2-4. HMR (Hot Module Replacement)

- 개발 중 코드를 바꾸면 **페이지 전체 리로드 없이** 바뀐 모듈만 교체하는 기술

- 브라우저와 dev 서버는 WebSocket으로 연결됨

- 서버는 파일 변경을 감지하면 새 모듈을 번들링 → WebSocket으로 브라우저에 푸시

---

## 🔍 3. 이번 panic 에러 체인 해석

```text
Project::hmr_version_state          ← HMR 버전 계산 시도
  VersionedContentMap::get          ← 컨텐츠 맵 조회
    endpoint_output_assets          ← 엔드포인트 출력 자산 수집
      AppEndpoint::output           ← /page 출력
        get_server_resolve_options_context ← 서버 resolve 컨텍스트 생성
          get_next_server_import_map       ← Next.js import map 생성
            FAIL: "Next.js package not found"
```

- `get_next_server_import_map`은 dev 서버가 `next/*` 경로를 어디로 해석할지 결정하는 매핑을 생성하는 task

- 이 작업 중 Turbopack이 `.next/` 루트에 남아 있던 **프로덕션 빌드 메타파일**을 우선 참조합니다

- 해당 메타의 내부 참조가 dev 컨텍스트와 어긋나면서 `"Next.js package not found"` false negative 발생

- 즉 **실제 패키지 부재가 아니라 resolve context 오염**이 원인입니다

### 200 응답과 FATAL이 섞여 반복되는 이유

- FATAL이 떠도 dev 서버 프로세스 자체는 죽지 않음 (Turbopack은 task 단위 panic을 catch해 복구)

- `GET /` 200은 **이전에 캐시된 페이지 버전**으로 응답 → 브라우저에는 에러가 안 보임

- HMR WebSocket은 panic 때마다 끊김 → 브라우저가 자동 재연결 시도

- 재연결 → Turbopack이 `hmr_version_state`를 다시 계산 → 동일 panic 재발

- 이 루프가 FATAL 로그를 계속 출력하는 원인입니다

---

## 🐛 4. 문제 진단 절차

```bash
# 1. next 패키지가 실제로 있는지
ls node_modules/next/package.json
# → -rw-r--r-- 정상 존재

# 2. CLI 심볼릭 링크 유효성
readlink node_modules/.bin/next
# → ../next/dist/bin/next  (정상)

# 3. .next 디렉토리 상태 (핵심 증거)
ls -la .next/
# → BUILD_ID, build/, build-manifest.json, export-marker.json  ← build 산출물 (16:11)
# → dev/                                                        ← dev 작업 폴더 (16:27)
# 두 모드 산출물이 한 폴더에 혼재

# 4. 중복 프로세스 없는지
ps aux | grep -E "next dev|next-server|turbopack" | grep -v grep
# → 출력 없음 (중복 아님)
```

4가지 조사로 "패키지는 정상, 프로세스도 하나만, 문제는 `.next` 상태"라는 결론에 도달합니다.

---

## 🛠️ 5. 해결 및 재발 방지

### 해결 조치

```bash
# 1. dev 서버 중지
Ctrl + C

# 2. 혼재된 캐시 비우기
rm -rf .next .turbo node_modules/.cache

# 3. dev 서버 재시작
npm run dev
```

### 재발 방지 루틴

`.next`를 오염시키지 않는 검증 방법으로 교체합니다.

```bash
# build 대신 타입 체크만 — .next를 건드리지 않음
npx tsc --noEmit
```

`next build`를 꼭 실행해야 한다면 **반드시 직후**에 `rm -rf .next`를 끼워 넣습니다.

> **참고**: `.next`, `.turbo`, `node_modules/.cache`는 모두 `.gitignore` 대상이므로 로컬 삭제는 안전합니다. 다른 팀원이나 CI에 영향 없음.

---

## ⚠️ 6. 주의사항

1. **"Next.js package not found"는 직역하면 안 됨**
   - `node_modules/next`가 없다는 뜻이 아님
   - Turbopack이 resolve context를 만들다 실패했다는 내부 표현이 외부로 노출된 것
   - `npm install`을 재실행해도 해결되지 않음

2. **FATAL이 뜨는데 200이 계속 오는 상태는 위험**
   - 페이지 응답은 이전 캐시 결과이고 새 변경은 반영되지 않음
   - "동작하는 것처럼 보이지만 실제로는 stale"인 상태

3. **중복 dev 서버라고 오해하기 쉬움**
   - 반복 FATAL을 보면 "서버 여러 개가 충돌하나?"를 먼저 의심하게 됨
   - 단일 프로세스 내부의 task 재시도 루프인 경우가 많음
   - `ps aux | grep next`를 먼저 확인

4. **팀 스크립트에서 `build` → `dev` 순서를 쓰고 있다면 그 사이에 `rm -rf .next`가 반드시 필요**

5. **`rm -rf node_modules/next`는 하면 안 됨**
   - 에러 메시지만 보고 실제 패키지 폴더를 삭제하면 `npm install` 왕복 시간만 늘어남

6. **Capacitor live reload를 쓰고 있다면** `.next` 삭제 후 기기/시뮬레이터도 재연결해야 HMR이 다시 붙음

---

## ✅ 7. 핵심 정리

- **cache bleed**: `next build`와 `next dev`가 `.next/` 폴더를 공유하기 때문에 순차 실행 시 두 모드의 산출물이 혼재하는 현상

- `"Next.js package not found"` FATAL은 패키지 부재가 아니라 **resolve context 오염** 신호입니다

- 해결은 `rm -rf .next .turbo node_modules/.cache` 후 dev 서버 재시작

- 검증은 `next build` 대신 `npx tsc --noEmit`로 대체하는 것이 안전

- FATAL이 있어도 200 응답이 오면 "stale 캐시 제공 중"이라고 판단합니다

---

## 🔗 참고 자료

- [Next.js 공식 문서](https://nextjs.org/docs)

- [Turbopack 공식 문서](https://nextjs.org/docs/app/api-reference/turbopack)

- [turbo-tasks (Salsa 스타일 incremental 프레임워크)](https://turbo.build/pack/docs)

- panic log 경로: `/var/folders/32/.../T/next-panic-*.log` (macOS 임시 경로, 세션마다 해시 달라짐)
