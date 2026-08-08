---
title: 'AI가 놓친 두 가지: .env.example gitignore 충돌과 dev 빌드 silent fallback'
slug: ai-env-var-fallback-silent-gitignore
description: >-
  Claude Code implement 에이전트가 생성한 환경변수 분기 구현에서 발견된 두 가지 이슈 — .env.example의
  gitignore 충돌과 dev 빌드의 silent fallback — 원인 분석과 수정 과정.
published_at: '2026-04-19T08:14:15-07:00'
labels:
  - AI 작성
  - 학습 정리
  - AI 코드리뷰
source: >-
  /Users/jeonghyeonseung/개발/how_many/.claude/study/ai-review/2026-04-17/env-var-fallback-silent.md
legacy_url: 'https://saver7942.blogspot.com/'
draft: false
---

## 📦 1. 배경

- **프로젝트**: how_many / **태스크**: HM-23 "개발 URL 분리" (Task 002, 003)

- **AI 도구**: Claude Code `implement` 에이전트 → Claude Code `review` 에이전트 (별도 세션)

- **프롬프트 맥락**:
  - Capacitor `server.url`을 `process.env.CAPACITOR_SERVER_URL` 기반으로 분기
  - `build:android:dev` / `build:android:prod` 스크립트 분리
  - `.env.example` 생성 및 `CLAUDE.md § 배포 설정` 업데이트
  - 제약: **fallback은 프로덕션 URL** (env 누락 시 안전한 쪽으로 기울임)

---

## 🐛 2. AI 출력물의 문제

| 문제 | 카테고리 | 영향 |
| :---: | :---: | :---: |
| `.env.example`이 `.gitignore`의 `.env*` 패턴에 걸려 커밋 불가 | 운영 안정성 | 팀원 clone 시 파일 미수신, 문서화 의도 소실 |
| `build:android:dev`에 env 가드 없음 → silent fallback으로 prod URL 주입 | 로직 | dev 빌드에 prod URL이 박힌 AAB 생성, QA 환경이 사실상 프로덕션 |

**AI가 생성한 초기 구현 (문제 있는 상태):**

```json
"build:android:dev": "export NEXT_STATIC_EXPORT=true && next build && npx cap sync android",
"build:android:prod": "export NEXT_STATIC_EXPORT=true CAPACITOR_SERVER_URL=https://how-many-mauve.vercel.app && next build && npx cap sync android",
```

- `build:android:dev`에 `CAPACITOR_SERVER_URL`을 export하지 않음

- `capacitor.config.ts`의 fallback 로직(= prod URL)이 조용히 적용됨

- 경고 `console.log`는 `next build`의 수백 줄 로그에 묻혀 실질적으로 무효

---

## 🛠️ 3. 수정 과정

### 수정 1: `.gitignore` 예외 추가

```diff
 # env files (can opt-in for committing if needed)
 .env*
+!.env.example
```

- `git check-ignore -v .env.example` 실행 결과: `.gitignore:35:!.env.example .env.example` — negation 규칙 적용 확인

### 수정 2: `package.json` env 가드 + alias 정리

```diff
-"build:android": "export NEXT_STATIC_EXPORT=true CAPACITOR_SERVER_URL=https://how-many-mauve.vercel.app && next build && npx cap sync android",
-"build:android:dev": "export NEXT_STATIC_EXPORT=true && next build && npx cap sync android",
+"build:android": "npm run build:android:prod",
+"build:android:dev": "if [ -z \"$CAPACITOR_SERVER_URL\" ]; then echo 'ERROR: CAPACITOR_SERVER_URL 환경변수 필수. 예: CAPACITOR_SERVER_URL=https://how-many-git-develop-xxx.vercel.app npm run build:android:dev' && exit 1; fi && export NEXT_STATIC_EXPORT=true && next build && npx cap sync android",
```

- env 없이 `npm run build:android:dev` 실행 → `exit 1` + 명확한 에러 메시지 출력 확인

- `build:android`를 `build:android:prod`의 alias로 정리 → DRY 위반 제거

---

## 🔍 4. 왜 AI가 이런 코드를 생성했나

**문제 1 — `.gitignore` 충돌 미인지:**

- AI는 요청된 파일을 "정확히" 생성하는 데 집중합니다. `.env.example`의 내용 자체는 올바랐습니다.

- 그러나 프로젝트의 `.gitignore`와의 상호작용까지 자동으로 검토하지 않습니다. 새 파일이 기존 설정과 충돌하는지 확인하려면 명시적으로 `git status` / `git check-ignore`를 요청해야 합니다.

**문제 2 — silent fallback vs. 명시적 실패의 경계:**

- 프롬프트에 "fallback은 prod URL"이 명시돼 있었습니다. AI는 이 지시를 충실히 따랐습니다.

- 그러나 **fallback 전략이 스크립트별로 달라야 한다는 점**은 프롬프트에 없었습니다:
  - `build:android:prod`: env 주입 고정 (fallback 불필요)
  - `build:android:dev`: env 강제 필요 (fallback이 오히려 위험)
- AI는 양쪽을 동일한 전략으로 처리 → dev 스크립트에만 위험 잔존.

- **안전 fallback과 silent 실패는 종이 한 장 차이**. 빌드 타임에 env 유무가 영향을 주는 경우, AI는 가드를 자동으로 넣지 않습니다.

> **참고**: 같은 세션의 implement 에이전트는 자신의 구현 맥락을 그대로 유지하므로 `.gitignore` 충돌을 재발견하기 어렵습니다. 별도 세션 review 에이전트가 두 문제를 모두 잡은 것은 맥락 분리 효과입니다.

---

## ✅ 5. 핵심 정리

- **파일 생성 후 반드시 추적 여부를 확인합니다.** `git status`와 `git check-ignore`로 새 파일이 버전 관리에 포함됐는지 검증합니다.

- **빌드 타임 분기에는 silent fallback을 넣지 않습니다.** fallback은 런타임 안전망으로만 쓰고, 빌드 타임 env 분기는 명시적 `exit 1`로 실패시키는 것이 원칙입니다.

- **AI 빌드 스크립트 리뷰 시 3가지를 반드시 확인합니다:**
  1. 필수 env 누락 시 동작 (exit code)
  2. fallback 로직이 빌드 타임에 적용되는지 런타임에 적용되는지
  3. 생성한 설정 파일이 gitignore·권한 측면에서 배포·공유 가능한 상태인지
- **"fallback 전략" 요구와 "명시적 실패" 요구가 충돌할 수 있습니다.** 환경별 빌드 스크립트를 요청할 때는 각 스크립트에 "env 누락 시 어떻게 돼야 하나"를 명시적으로 지정합니다.

- **리뷰는 별도 세션에서 돌립니다.** 같은 맥락에 머무르면 구현 시 놓친 blind spot을 재발견하기 어렵습니다.

---

## 🔗 참고 자료

- 리뷰 원본: `.claude/plans/review.md`

- 구현 컨텍스트: `.claude/context/dev-url-separation/implementation.md`

- 기획: `.claude/plans/generic-cooking-crayon.md`

- Linear 이슈: HM-23
