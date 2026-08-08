---
title: ai_quiz 데이터 레이어 회고 — 정적 JSON과 Supabase를 병행하고 fail-silent로 감싼 이유
slug: ai-quiz-data-layer-static-json-supabase-fail-silent
description: >-
  ai_quiz 프로젝트의 데이터 레이어 설계를 Q&A 형식으로 정리한다. axios 미도입 근거, lib/ 분리 이유, fail-silent
  장단점, 정적 JSON과 Supabase 병행 이유, 캐싱·재시도 부재 대응을 다룬다.
published_at: '2026-04-20T00:08:06-07:00'
labels:
  - AI 작성
  - 프로젝트
  - AI 퀴즈
  - 면접-대비
  - API설계
  - fetch
  - Supabase
source: >-
  /Users/jeonghyeonseung/개발/AI_quiz/.claude/study/2026-04-20/ai-quiz-data-flow-api.md
tabs: 코드
legacy_url: 'https://saver7942.blogspot.com/2026/04/aiquiz-json-supabase-fail-silent.html'
draft: false
---

> **SUMMARY**: ai_quiz 프로젝트의 데이터 흐름 구조(정적 JSON + Supabase 병행)와 API 레이어(`src/lib/*`) 설계를 Q&A 형식으로 정리합니다. axios 미도입 근거부터 fail-silent 장단점, 캐싱·재시도 부재 대응까지 면접 답변 수준으로 정리한 학습 기록입니다.

---

## 📦 1. 배경

- 프로젝트: ai_quiz (Vite + React 19, @supabase/supabase-js 2.x, TypeScript 5.9)

- 상태관리 노트(노트 1)의 후속으로, **상태에 데이터가 어떻게 주입되는지**를 따라갑니다.

- 데이터 흐름 구조: 정적 JSON 퀴즈 파일 + Supabase(쓰기·분석) 병행

---

## ❓ 2. Q1. axios 없이 fetch만으로 충분했던 근거

ai_quiz는 퀴즈 데이터를 정적 JSON에서 읽고, 쓰기는 Supabase 클라이언트(`@supabase/supabase-js`)에 위임합니다. axios 같은 추가 라이브러리가 필요한 지점이 없습니다.

**axios 기능별 필요 여부 체크**:

| axios 기능 | 필요? | 이유 |
| :---: | :---: | :---: |
| 인터셉터(공통 헤더·토큰 부착) | 불필요 | 인증 없음 |
| `baseURL` 공통화 | 불필요 | 호출 3곳 — 이득 미미 |
| 자동 JSON 파싱 | 불필요 | `res.json()` 한 줄로 충분 |
| 요청 취소 | 불필요 | 취소 시나리오 없음 |
| 타임아웃 | 불필요 | 정적 파일은 ms 응답 |
| 리트라이 | 불필요 | 사용자 수동 재시도 |
| 구형 브라우저 호환 | 불필요 | 모던 브라우저 타깃 |

모든 축에서 불필요합니다. 13KB(gzip) 번들을 추가하고 "axios 사용법"을 강제할 이유가 없습니다.

**Supabase 호출에 axios가 빠진 이유**:
- `@supabase/supabase-js`가 내부적으로 fetch를 감싸 인증 헤더·토큰 갱신·쿼리 DSL을 자동 처리합니다.

- 개발자 코드에는 `supabase.from('x').select()`만 등장하므로 axios 인터셉터의 주 용도(헤더 부착)가 이미 해결됩니다.

**axios 도입이 정당화되는 시점**:
- 인증 토큰 자동 부착이 필요한 직접 REST API 호출

- 여러 엔드포인트 baseURL·공통 에러 처리 반복

- 요청 취소·재시도 정책이 UX에 중요한 경우(검색·자동완성 등)

---

## 🏗️ 3. Q2. `lib/` 폴더 분리 이유 (quiz/mockExam/db/session/supabase)

분리의 핵심 개념은 **관심사 분리(Separation of Concerns, SoC)**입니다. UI 컴포넌트와 데이터 레이어를 분리합니다.

**분리가 가져오는 4가지 이득**:

| 이득 | 이 프로젝트 구체 예 |
| :---: | :---: |
| **DRY** | `logAccess()`를 세 페이지가 직접 `supabase.from('access_logs').insert(...)` 작성하면 3번 중복. `lib/db.ts`에 함수로 모으면 호출만 하면 된다. |
| **단일 책임(SRP)** | `supabase.ts`는 6줄 — 인스턴스 초기화만. `db.ts`는 CRUD만. `session.ts`는 UUID만. |
| **교체 용이성** | Supabase → Firebase 시 `supabase.ts`·`db.ts`만 수정. 컴포넌트 불변. |
| **테스트 용이성** | `lib` 함수는 mock이 용이하다. 컴포넌트에 묶이면 전체 렌더가 필요하다. |

**계층 구조**:

```text
Page/Component  →  lib/ (도메인 함수)  →  lib/supabase.ts + fetch
"어떻게 보여줄까"    "무엇을 가져올까"       "어떻게 통신할까"
```

**`supabase.ts`가 6줄짜리인 이유**: **교체 경계 명확화**입니다. 테스트에서 mock 주입, 관리자/사용자 인스턴스 분리 같은 확장 시 이 파일 하나만 바꾸면 됩니다.

**분리 기준의 일관성**: 이 프로젝트는 **도메인별(quiz vs mockExam vs session)** + **데이터 소스별(lib 전체가 외부 접근 레이어)** 두 축을 동시에 사용합니다. `db.ts`에 현재 테이블 5개 CRUD가 모여 있으나, 확장 시 `db/users.ts`·`db/sessions.ts`로 재분할이 가능한 구조입니다.

> **참고**: `db.ts` 함수가 이미 9개(`upsertUser`, `logAccess`, `createDraftSession`, `saveQuizAnswer`, `updateSessionResult`, `saveQuizSession`, `saveFeedback` 등)입니다. 컴포넌트에 섞으면 비대해집니다.

---

## ⚖️ 4. Q3. fail-silent 설계의 장단점 + `saveFeedback` 예외

**fail-silent**: 에러가 발생해도 throw하지 않고 조용히 무시하는 설계 방식입니다.

**장점 4가지**:
1. **핵심 기능 보호** — 퀴즈 데이터는 정적 JSON이라 DB 무관

2. **오프라인/네트워크 불안정 대응** — 모바일에서 신호가 끊겼다 돌아와도 퀴즈를 계속 풀 수 있습니다

3. **DB 스키마·RLS 변경 중에도 서비스 지속** — 순간적 권한 오류가 사용자에게 전파되지 않습니다

4. **분석 데이터의 "있으면 좋고 없어도 그만" 성격과 부합**

> **참고**: RLS(Row Level Security) — 테이블 행 단위 접근 제어. Supabase에서 사용자별 데이터 격리에 활용합니다.

**단점 4가지** (면접 필수 대비):
1. **조용한 데이터 유실** — RLS 오설정으로 한 달 간 로그 0건이 쌓여도 몇 주 뒤에 발견됩니다

2. **관찰 가능성(observability) 부재** — Sentry·DevTools 어디에도 기록이 남지 않아 문제 자체를 감지하지 못합니다

3. **디버깅 곤란** — 스택 트레이스조차 없어서 원인 추적이 불가합니다

4. **부분 실패 감지 실패** — `saveQuizSession`에서 session insert는 성공·answers insert만 실패 시 DB에 **데이터 불일치** 발생 가능

**`saveFeedback`만 예외인 이유**: **"분석 로그는 fail-silent, 사용자 의도 전달은 fail-loud"** 원칙입니다.

| 구분 | 자동 로그 | feedback |
| :---: | :---: | :---: |
| 주체 | 시스템 자동 기록 | **사용자가 의도적으로 신고** |
| 사용자 기대 | 없음 (투명한 수집) | "내 신고가 전달됐다" |
| 실패 시 UX | 사용자 인지 없음 | **"신고됨"으로 믿고 지나가면 기만** |
| 재시도 가능성 | 의미 없음 (시점성) | **반드시 재시도 기회 제공 필요** |

`saveFeedback`만 throw하는 것은 **UI에 에러를 노출시켜 재시도를 유도**하기 위해서입니다.

**실무 개선 방향**:

```ts
// 최소 비용: 콘솔에라도 남기기
try { await supabase.from('access_logs').insert(...) }
catch (e) { console.warn('[logAccess] failed:', e) }

// 중급: 원격 에러 추적
catch (e) { Sentry.captureException(e, { tags: { component: 'logAccess' } }) }

// 고급: 중요 로그에 백오프 리트라이
```

---

## ⚖️ 5. Q4. 정적 JSON + Supabase 병행 이유

**정적 JSON 선택 5각도**:

| 각도 | 설명 |
| :---: | :---: |
| **성능** | CDN edge 캐시 vs DB 쿼리 RTT — 전자가 압도적 |
| **안정성** | 정적 호스팅은 의존성·장애 지점 최소 |
| **호스팅 비용·무료 플랜 한도** | Supabase 무료는 API 호출·대역폭 제한. 퀴즈 고빈도 읽기엔 부담 |
| **Git 버전 관리 + PR 리뷰** | `public/quizzes/*.json`이 리포 안 → 커밋 히스토리·PR 리뷰로 품질 관리 |
| **관리 UI 비용 제거** | DB면 관리자 페이지 필수. JSON은 에디터로 직접 편집 → 비용 0 |

**"전부 localStorage로 Supabase를 제거하면 안 되는가"**:

| 잃는 것 | 문제 |
| :---: | :---: |
| `access_logs`, `quiz_sessions`, `quiz_answers` | 학습 패턴 분석 불가 → 문제 품질 개선 불가 |
| `feedbacks` | 사용자 신고를 개발자에게 전달할 방법 상실 |
| 오답노트 다기기 동기화 확장성 | 서버 기반 없어 향후 확장 막힘 |

**쓰기 기능이 서버 저장을 요구**하므로 Supabase는 필수입니다. 다만 **읽기는 정적 JSON이 유리**합니다. **"읽기는 정적, 쓰기는 DB"** 이중 구조가 이 프로젝트 규모에서 최적입니다.

**최종 원칙**: 성격이 다른 데이터에 같은 도구를 강제하면 양쪽 모두 손해입니다.
- 읽기·고빈도·정적 → JSON + CDN

- 쓰기·분석 필요 → Supabase

---

## 🔍 6. Q5. 캐싱·재시도·중복 제거 부재 대응

핵심은 **"없는 게 아니라 다른 계층이 대신하고 있음"**입니다.

### 6-1. 캐싱은 자동으로 되고 있다

```text
[컴포넌트] → fetch('/quizzes/index.json')
   ↓ [브라우저 HTTP 캐시]  ← Cache-Control 기반 메모리/디스크 캐시
   ↓ (miss 시) [Vercel/Netlify Edge CDN]  ← 전 세계 에지 노드
   ↓ (miss 시) [Origin]
```

- Vercel/Netlify는 정적 에셋에 long-cache(`max-age=31536000, immutable`) 자동 적용

- 같은 세션에서 `fetchCategories()` 재호출 시 두 번째부터 수 ms 이내 응답

- 앱 레벨 캐시(React Query 등)는 **YAGNI**(You Aren't Gonna Need It)

### 6-2. 재시도는 선택적으로만 필요하다

| 케이스 | 재시도? | 이유 |
| :---: | :---: | :---: |
| 정적 JSON 404 | 불필요 | 무한 루프 위험 |
| RLS 권한 오류 | 불필요 | 재시도해도 계속 거부 |
| 일시적 네트워크 끊김 | 필요 | 백오프 후 재시도로 해결 |
| `saveFeedback` 실패 | 필요 | 사용자 의도 전달 — 재시도 UI 필수 |
| `saveQuizAnswer` 중복 | 주의 | **멱등성 보장 없이 재시도하면 답변 중복 저장** |

제대로 구현하려면 지수 백오프, 에러 종류별 분기(5xx vs 4xx), 멱등성 키가 필요합니다.

### 6-3. 중복 제거는 구조적으로 거의 발생하지 않는다

- `fetchCategories()` — MainPage `useEffect`에서 마운트 시 1회

- `upsertUser()` — QuizPage `useEffect`에서 마운트 시 1회

- "시작" 연타 → `setStarting(true/false)` 플래그로 방어

React Query의 `queryKey` dedup 이득이 발휘될 지점이 없습니다.

### 6-4. 추가 우선순위

| 순위 | 항목 | 근거 |
| :---: | :---: | :---: |
| 1 | **`saveFeedback` 재시도 UI** | 이미 throw 중. 호출부에서 catch + 재시도 버튼 |
| 2 | **`saveQuizAnswer` 멱등성 키** | `(sessionId, questionId)` 유니크 제약 또는 idempotency key |
| 3 | **Sentry 등 원격 에러 추적** | fail-silent 약점 보완 — "실패를 아는 것"이 먼저 |
| 4 | **React Query 도입** | 실시간 리더보드·학습 히스토리 추가 시 |

---

## 🛠️ 7. 실제 적용 코드

### `lib/quiz.ts` — 정적 JSON fetch 패턴

```ts
export async function fetchCategories(): Promise<QuizCategory[]> {
  const res = await fetch('/quizzes/index.json')
  if (!res.ok) throw new Error('카테고리 목록 로드 실패')
  return res.json()
}

export async function fetchQuiz(categoryId: string, file: string): Promise<Question[]> {
  const res = await fetch(`/quizzes/${file}`)
  if (!res.ok) throw new Error(`퀴즈 파일 로드 실패: ${file}`)
  const questions: Question[] = await res.json()
  return questions.map((q) => ({ ...q, quizId: categoryId }))
}
```

- 정적 JSON은 응답 실패 시 throw합니다. 퀴즈 파일이 없으면 앱 자체가 동작 불가이므로 fail-loud가 맞습니다.

### `lib/db.ts` — fail-silent 기본 + `saveFeedback` 예외

```ts
// 조용히 무시 (자동 로그)
export async function logAccess(userId, pagePath, userAgent) {
  try {
    await supabase.from('access_logs').insert({...})
  } catch {
    // 조용히 무시
  }
}

// 에러 전파 (사용자 의도 전달)
export async function saveFeedback(payload) {
  const { error } = await supabase.from('feedbacks').insert({...})
  if (error) throw error
}
```

- `logAccess`는 분석 목적의 자동 수집이므로 실패해도 사용자 경험에 영향이 없습니다.

- `saveFeedback`은 사용자가 의도적으로 보낸 신고이므로 실패를 반드시 UI에 노출해야 합니다.

### `lib/supabase.ts` — 6줄짜리 얇은 레이어

```ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

- 초기화 로직만 분리합니다. 교체 시 이 파일만 수정하면 됩니다.

---

## 🔗 8. 참고 자료

- MDN — Fetch API: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API

- Vercel — Static Asset Caching: https://vercel.com/docs/edge-network/caching

- Supabase JS Client: https://supabase.com/docs/reference/javascript

- Martin Fowler — Layered Architecture: https://martinfowler.com/bliki/PresentationDomainDataLayering.html

- Idempotency-Key 패턴: https://stripe.com/docs/api/idempotent_requests

---

## ✅ 9. 핵심 정리

- **axios vs fetch**: 인터셉터·baseURL·재시도가 필요 없으면 fetch로 충분합니다. 라이브러리 도입 전 필요 기능 체크리스트를 먼저 확인합니다.

- **lib/ 분리**: 컴포넌트와 데이터 레이어를 분리하면 DRY·SRP·교체 용이성·테스트 용이성 4가지 이득을 동시에 얻습니다. 관심사 분리(SoC)가 핵심 원리입니다.

- **fail-silent는 의도적 계약**: "lib는 에러를 삼킨다"는 규약을 문서화하지 않으면 새 개발자가 혼란을 겪습니다. 단점(조용한 데이터 유실, observability 부재)을 인지한 상태에서 선택해야 합니다.

- **읽기는 정적, 쓰기는 DB**: 성격이 다른 데이터에 같은 도구를 강제하면 양쪽 모두 손해입니다. 데이터 특성에 맞는 저장소를 선택합니다.

- **관찰 가능성 우선**: 캐시·재시도보다 "실패했다는 사실"을 아는 것이 먼저입니다. 최소한 `console.warn`이라도 남기는 것이 아무것도 없는 것보다 낫습니다.

- **멱등성 없는 재시도는 위험**: `insert` 계열 재시도 전 `(sessionId, questionId)` 유니크 제약 또는 idempotency key를 먼저 설계합니다.
