---
title: 'ai_quiz 상태관리 회고 — Zustand, 스토리지 전략, 그리고 답변 검증 분리'
slug: ai-quiz-state-management-zustand-review
description: >-
  AI 주도 코딩으로 만든 ai_quiz 프로젝트의 상태관리 구조를 면접 수준으로 분석한다. Zustand 선택 근거,
  selectAnswer/checkAnswer 분리, sessionStorage vs localStorage 전략, 이중 상태 구조,
  React Query 미도입 이유를 Q&A 형식으로 정리한다.
published_at: '2026-04-19T23:30:34-07:00'
labels:
  - AI 작성
  - 프로젝트
  - AI 퀴즈
  - 면접-대비
  - 상태관리
  - React
  - Zustand
source: >-
  /Users/jeonghyeonseung/개발/AI_quiz/.claude/study/2026-04-20/ai-quiz-state-management.md
tabs: 코드
legacy_url: 'https://saver7942.blogspot.com/2026/04/aiquiz-zustand.html'
draft: false
---

## 📦 1. 배경

**바이브 코딩**(AI 주도 코딩)으로 만든 ai_quiz 프로젝트의 상태관리 구조를 면접에서 설명할 수 있는 수준으로 이해하기 위한 학습 기록입니다.

- **기술 스택**: Vite + React 18, Zustand 4.x, React Router 7

- **학습 방식**: AI가 코드 위치와 질문을 제시 → 본인이 먼저 답을 작성 → AI가 검수·보강하는 소크라테스식 하이브리드 방식

- 처음엔 답하지 못했던 질문은 해설을 덧붙여 별도 표기합니다.

---

## 🔍 2. Q1. 왜 Zustand인가

> 처음엔 답하지 못했던 질문 — 학습 후 정리

**결론**: 1인 소규모 프로젝트에서 "페이지 간 상태 공유 + persist + 리렌더 최소화"를 최소 코드로 해결하는 최적해입니다.

**도구 비교**:

| 항목 | Redux (+ Toolkit) | Context API | Zustand |
| :---: | :---: | :---: | :---: |
| 보일러플레이트 | Action·Reducer·Store 분리 | Provider·Consumer 분리 | `create()` 하나 |
| 리렌더링 제어 | `useSelector`로 선택적 구독 | value 변경 시 구독 컴포넌트 **전체** 리렌더 | selector로 선택적 구독 |
| Provider 필요 | 필요 | 필요 | **불필요** |
| persist | redux-persist 별도 | 직접 구현 | `persist` 미들웨어 한 줄 |
| 번들 크기 | ~16KB | 0KB (내장) | **~1KB** |

**이 프로젝트에 맞은 이유 (코드 근거)**:
- `quizStore.ts:26-187` — `create()` 호출 한 번으로 state + 10개 액션 선언

- `quizStore.ts:183-186` — `persist(sessionStorage)` 3줄로 새로고침 복원 기능 완성

- 페이지 컴포넌트에서 `useQuizStore((s) => s.currentIndex)` 같은 selector 구독 → `selectedAnswers` 변경 시에도 `currentIndex`만 쓰는 컴포넌트는 리렌더 안 함

**면접 꼬리 질문**:
- Redux Toolkit이 개선됐는데 왜 Zustand? → `configureStore` + `Provider` 래핑이 여전히 필요. 1인 단일 스토어엔 Zustand가 가벼움

- Zustand 단점? → DevTools 통합이 약하고(별도 미들웨어 필요), 팀 규모 커지면 스토어 구조 파편화 위험

---

## 🏗️ 3. Q2. `selectAnswer` / `checkAnswer` 분리 이유

**종합 답 (4각도)**:

1. **선택 복원** — `currentIndex` 이동 후 재방문 시 이전 답 유지

2. **UX — 숙고 시간 보장** — 즉시 채점되면 답을 못 바꿉니다. `selectAnswer` 내부에서 기존 `scoredAnswers` 자동 폐기(`quizStore.ts:86-91`)로 "답 바꾸기 허용" 보장

3. **부수효과 격리** — `checkAnswer` 안에서만 `wrongNoteStore.addWrongNote` 호출(Line 103-105). 중간에 바꿔본 선택이 오답노트를 오염시키지 않음

4. **모의고사 모드 전제** — `checkAllAnswers`(Line 130)로 일괄 채점하려면 "답은 쌓이되 채점은 유예" 구조가 필요합니다

> **참고**: 성능(lazy evaluation) 각도는 부차적입니다. `gradeAnswer`(Line 6-24) 비용이 작아서 이 프로젝트 규모에선 본질이 아닙니다. 면접에서 이걸 내세우면 과장.

**면접 꼬리 질문**:
- 하나로 합칠 수도 있지 않나? → 기술적으로 가능. 하지만 `isCorrect` 옵셔널 필드로 시점 구분하게 되어 타입 안전성 저하. 분리하면 `scoredAnswers[id]` 존재 자체가 "채점됐음"의 진위 값

- 왜 `scoredAnswers`에 `answer`도 같이 저장? → "채점 당시 답의 스냅샷" 필요. ResultPage에서 회고 가능

---

## 🗄️ 4. Q3. `sessionStorage` vs `localStorage` 분리

**스토리지 비교**:

| | `sessionStorage` | `localStorage` |
| :---: | :---: | :---: |
| 생명주기 | 탭/창 닫으면 삭제 | 명시적 삭제 전까지 영구 |
| 탭 간 공유 | 독립 | 같은 도메인 모든 탭 공유 |
| 크기 | ~5MB | ~5-10MB |
| XSS | JS 접근 가능 (동일) | JS 접근 가능 (동일) |

**분리 근거**:
- `quizStore` → `sessionStorage`: 현재 퀴즈 풀이 세션만 유지. 탭 닫으면 초기화가 자연스러운 UX

- `wrongNoteStore` → `localStorage`: 탭을 닫아도 오답 기록이 남아야 오답노트 기능이 의미 있음

**반대로 설계했을 때의 문제**:
- `quizStore` → `localStorage`: 어제 퀴즈 찌꺼기 남음. 탭 간 상태 엉킴

- `wrongNoteStore` → `sessionStorage`: 탭 닫으면 오답 사라짐 → 오답노트 기능 무의미화

**면접 꼬리 질문**:
- IndexedDB 안 쓴 이유? → 오답노트는 `{id, quizId, addedAt}` 배열이라 수 MB 한도 내. IndexedDB는 오버스펙

- XSS 위험? → 민감 데이터 아님(문제 ID). 진짜 민감 데이터면 httpOnly 쿠키 사용

- 여러 탭 동시 수정? → `storage` 이벤트 미구독 → race condition 가능성 존재

---

## 🧩 5. Q4. `selectedAnswers` + `scoredAnswers` 이중 구조

> 처음엔 부분적으로 오해했던 구조 — 학습 후 정리

**오해 바로잡기**:
- "실제 정답"은 둘 중 어디에도 없습니다. 정답은 `question.answer` 필드에 존재합니다.

- `selectedAnswers`·`scoredAnswers` **둘 다** "사용자가 고른 답"만 담습니다.

- 강약점 분석은 `scoredAnswers`로 가능하지만, 이는 결과이지 분리의 원인이 아닙니다.

**진짜 이유**: "선택 시점" vs "채점 시점"의 스냅샷 분리

| 상태 | 의미 | 성격 |
| :---: | :---: | :---: |
| `selectedAnswers[id]` | 지금 현재 고른 답 | Mutable (덮어씀) |
| `scoredAnswers[id].answer` | 채점 당시 고른 답의 스냅샷 | 채점 때 고정 |
| `scoredAnswers[id].isCorrect` | 그 스냅샷으로 채점한 결과 | 채점 때 고정 |

**대표 시나리오**: 1번에 "A" 선택 → 채점(틀림) → 2번으로 이동 후 1번에 다시 와서 "B" 선택 → 재채점
- `selectAnswer("B")`가 기존 `scoredAnswers[1]` 자동 삭제 (Line 86-91)

- 이 자동 삭제 덕분에 "어긋난 상태"(answer가 서로 다른 상태)가 화면에 노출되지 않습니다

**UI 역할 분담**:
- QuizPage 보기 하이라이트 ← `selectedAnswers`

- QuizPage 정답/오답 색상 ← `scoredAnswers.isCorrect`

- ResultPage "당시 뭐 골랐나" 회고 ← `scoredAnswers.answer`

**면접 꼬리 질문**:
- 하나로 합칠 수도? → 옵셔널 필드로 시점 구분하게 되어 타입 안전성 저하

- 왜 자료구조가 다른가(문자열 vs 객체)? → 상태 목적이 다르면 자료구조도 다르다는 원칙입니다. `selectedAnswers`는 UI 상태(값 1개로 충분), `scoredAnswers`는 결과 기록(answer+isCorrect 2필드 필수)

---

## 🧭 6. Q5. React Query / SWR 미도입 이유

> 처음엔 답하지 못했던 질문 — 학습 후 정리

**핵심 개념 구분**:
- **서버 상태**: 원본이 서버에 있고 클라이언트는 사본 관리. stale 가능성·동기화·중복 호출 이슈 → React Query / SWR 대상

- **클라이언트 상태**: 오직 UI에서만 생겨나고 조작됨 → Zustand / Context 대상

**이 프로젝트 데이터 분류**:

| 데이터 | 성격 | React Query 이득? |
| :---: | :---: | :---: |
| `/quizzes/*.json` | 정적 파일 (배포 시에만 갱신) | ❌ 브라우저/CDN 캐시로 충분 |
| Supabase `upsertUser`, `logAccess` | 쓰기 전용, fire-and-forget | ❌ 화면 갱신 안 함 |
| Supabase `createDraftSession` | 쓰기 후 ID만 받음 | ❌ 캐시 대상 아님 |
| 사용자 답변 | 완전한 클라이언트 상태 (Zustand) | ❌ 서버에서 오는 값이 아님 |

→ **"서버 상태다운 상태"가 존재하지 않기 때문에** React Query가 해결할 문제 자체가 없습니다.

**도입 비용**:
- React Query ~39KB gzip / SWR ~11KB gzip

- `queryKey`, `staleTime`, `mutation`, `infinite query` 등 개념 학습 비용

- YAGNI: 지금 필요 없는 추상화는 나중에 도입합니다.

**언제 도입해야 하는가**:
- 실시간 리더보드 (주기적 refetch)

- 다기기 동기화되는 학습 히스토리

- 본인 답변 히스토리 페이지 (여러 페이지에서 같은 데이터 참조)

- 관리자 CRUD (mutation + cache invalidation 패턴 필수)

> **면접 모범 답변**: 데이터 호출이 정적 JSON 로드와 fire-and-forget 쓰기 두 종류뿐이라, React Query가 해결해주는 "서버 상태 동기화" 문제가 이 프로젝트엔 없었습니다. 클라이언트 상태는 Zustand, 정적 데이터는 fetch + 브라우저 캐시, Supabase는 쓰기 중심 — 각 도구가 자기 역할만 맡는 구조라 추가 추상화가 오버스펙이었습니다. 실시간 리더보드나 학습 히스토리 페이지가 추가되는 시점엔 React Query 도입이 맞습니다.

---

## 🛠️ 7. 핵심 코드

### 답변 선택 → 채점 흐름

```ts
// quizStore.ts:83-117
selectAnswer: (questionId, answer) =>
  set((state) => {
    const { [questionId]: _s, ...restScored } = state.scoredAnswers
    return {
      selectedAnswers: { ...state.selectedAnswers, [questionId]: answer },
      scoredAnswers: restScored,  // 새 답 선택 시 기존 채점 자동 폐기
      checkedIds: state.checkedIds.filter((id) => id !== questionId),
    }
  }),

checkAnswer: (questionId) => {
  const { questions, selectedAnswers } = get()
  const question = questions.find((q) => q.id === questionId)
  const userAnswer = selectedAnswers[questionId]
  if (!question || !userAnswer) return

  const isCorrect = gradeAnswer(question, userAnswer)

  if (!isCorrect) {
    useWrongNoteStore.getState().addWrongNote(questionId, question.quizId ?? '')
  }

  set((state) => ({
    scoredAnswers: {
      ...state.scoredAnswers,
      [questionId]: { answer: userAnswer, isCorrect },
    },
    checkedIds: state.checkedIds.includes(questionId)
      ? state.checkedIds
      : [...state.checkedIds, questionId],
    skippedIds: state.skippedIds.filter((id) => id !== questionId),
  }))
},
```

- `selectAnswer`는 새 답을 저장하면서 동시에 기존 `scoredAnswers` 항목을 삭제합니다.

- `checkAnswer`는 오답노트 기록(`addWrongNote`)이라는 부수효과를 이 함수 안에서만 처리합니다.

- 두 함수가 분리되어 있어 "선택은 했지만 아직 채점 안 된" 상태가 유효하게 존재합니다.

### 스토리지 분리 설정

```ts
// quizStore.ts:183-186 - 현재 세션만
{
  name: 'ai-quiz-store',
  storage: createJSONStorage(() => sessionStorage),
}

// wrongNoteStore.ts:32-35 - 영구 저장
{
  name: 'ai-quiz-wrong-notes',
  storage: createJSONStorage(() => localStorage),
}
```

---

## ⚠️ 8. 주의사항

- **상태 3개 동기화 책임**: `selectedAnswers` / `scoredAnswers` / `checkedIds`가 함께 움직여야 합니다. `selectAnswer`에서 세 상태 모두 건드리는 이유입니다. 하나라도 빠뜨리면 "채점됐는데 선택이 안 보이는" 류의 버그가 발생합니다.

- **Zustand selector 구독 습관**: 컴포넌트에서 `useQuizStore()` 전체 구독 대신 `useQuizStore((s) => s.currentIndex)` 같은 selector를 써야 리렌더 최소화 이득이 살아납니다.

- **`storage` 이벤트 미구독**: 여러 탭에서 오답노트를 동시에 수정하면 탭 간 동기화가 안 됩니다. 다기기·다탭 동시 사용이 요구 기능이 되면 `storage` 이벤트 구독 추가가 필요합니다.

- **React Query 판단 기준**: "서버에 원본이 있고 클라이언트가 사본을 유지하는가?"를 먼저 물어야 합니다. 이 질문에 "예"가 나올 때만 도입합니다.

---

## ✅ 9. 핵심 정리

- **Zustand 선택 기준**: Provider 없음 + persist 미들웨어 한 줄 + selector 구독 — 1인 프로젝트에서 이 세 가지가 결정 요인입니다.

- **selectAnswer / checkAnswer 분리**의 본질은 "선택 시점"과 "채점 시점"을 다른 상태로 표현하는 것입니다. 부수효과(오답노트 기록)를 checkAnswer 안에서만 처리하는 구조도 이 분리에서 나옵니다.

- **스토리지 선택 원칙**: 세션이 끝나면 사라져도 되는 데이터 → sessionStorage, 탭을 닫아도 유지해야 하는 데이터 → localStorage.

- **selectedAnswers vs scoredAnswers**: 두 필드 모두 "사용자가 고른 답"입니다. 차이는 Mutable(현재 선택) vs 채점 시점 스냅샷(고정).

- **React Query 도입 판단**: "서버 상태다운 상태가 있는가?"가 첫 번째 질문입니다. 정적 JSON + fire-and-forget 쓰기만 있다면 도입 근거가 없습니다.

---

## 🔗 참고 자료

- Zustand 공식 문서: https://zustand-demo.pmnd.rs/

- Zustand persist 미들웨어: https://github.com/pmndrs/zustand/blob/main/docs/integrations/persisting-store-data.md

- TanStack Query "Server State vs Client State": https://tanstack.com/query/latest/docs/framework/react/overview

- MDN — sessionStorage vs localStorage: https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API
