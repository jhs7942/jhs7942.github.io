---
title: 'Zustand 선언적 상태 관리 총정리: 왜 Zustand인가와 종합 예제'
slug: react-zustand-declarative-recap
description: >-
  Zustand의 핵심은 선언적 상태 변경입니다. `useReducer`가 액션 타입·`dispatch`·`switch`라는 절차(명령형)를
  요구했다면, Zustand는 "무엇을 바꿀지"를 함수로 정의하면 끝입니다. 함수 자체가 액션이고 내부의 `set`이 리듀서 역할을 하며,
  얕은 병합이 불변성을 자동으로 관리합니다. 이 글은 상태 관리 파트를 선언적 방식이라는 축으로 정리하고, 종합 예제와 시리즈 인덱스를
  제공합니다.
published_at: '2026-07-09T22:41:42-07:00'
labels:
  - AI 작성
  - 학습 정리
  - React
  - TypeScript
  - Zustand
source: 사용자 학습 노트 (React 상태관리 — 선언적 방식/Section 2 결산)
legacy_url: 'https://saver7942.blogspot.com/2026/07/zustand-zustand.html'
draft: false
series: zustand
part: 7
---

상태 관리 파트에서 Zustand의 `create`·`set`·`get`, 슬라이스 패턴, `useReducer`와의 비교를 다뤘습니다. 이 글은 그 흐름을 **선언적 상태 변경**이라는 한 축으로 정리하는 결산입니다. 왜 Zustand가 간결한지 되짚고, 종합 예제와 각 주제로 가는 목록을 붙였습니다. 앞선 [타입 안전 시리즈](/posts/react-ts-type-safety-recap/)에 이은 상태 관리 정리입니다.

---

## 📌 1. 왜 Zustand인가 — 선언적 상태 변경

`useReducer`와 Zustand의 차이는 **명령형과 선언형**으로 요약됩니다.

- **명령형(`useReducer`)** — 상태를 바꾸려면 액션 타입을 정의하고, `dispatch`로 요청을 보내고, `switch`에서 그 타입을 찾아 새 상태를 계산합니다. "어떻게 바꿀지" 절차를 매번 밟습니다.

- **선언형(Zustand)** — "무엇을 바꿀지"를 함수로 정의하면 끝입니다. 함수 자체가 액션이고, 그 안의 `set` 호출이 리듀서 역할을 합니다. 별도의 액션 타입도, `switch`도, `dispatch`도 없습니다.

```tsx
const useStore = create((set) => ({
  count: 0,
  // 함수 이름이 곧 액션, 내부 set이 곧 리듀서
  increase: () => set((state) => ({ count: state.count + 1 })),
}));
```

여기에 **얕은 병합(shallow merge)**이 더해집니다. `set`에 바꿀 값만 넘기면 나머지 상태는 엔진이 보존하므로, `useReducer`에서 매번 쓰던 `...state` 복사가 필요 없습니다.

```tsx
// ...state 없이 message만 교체 — 나머지는 자동 보존
updateMessage: (msg) => set({ message: msg }),
```

정리하면, 개발자는 "상태를 어떻게 복사해 전달할지"가 아니라 "무엇을 바꿀지"에만 집중하게 됩니다.

---

## 🛠️ 2. 종합 예제: 선언적 스토어

상태와 액션을 하나의 `interface`에 정의하고, 함수 단위로 로직을 작성한 스토어입니다. `switch`도 액션 타입도 없습니다.

```tsx
// src/store/useSimpleStore.ts
import { create } from 'zustand';

interface SimpleStore {
  count: number;
  message: string;
  increase: () => void;
  updateMessage: (msg: string) => void;
  reset: () => void;
}

export const useSimpleStore = create<SimpleStore>((set) => ({
  count: 0,
  message: '안녕하세요',

  increase: () => set((s) => ({ count: s.count + 1 })), // 함수형 업데이트
  updateMessage: (msg) => set({ message: msg }),         // 얕은 병합
  reset: () => set({ count: 0, message: '초기화됨' }),    // 여러 값도 객체 하나로
}));
```

컴포넌트에서는 액션을 이벤트 핸들러에 그대로 연결합니다.

```tsx
// src/components/SimpleCounter.tsx
import { useSimpleStore } from '../store/useSimpleStore';

export function SimpleCounter() {
  const count = useSimpleStore((s) => s.count);
  const increase = useSimpleStore((s) => s.increase);
  return <button onClick={increase}>{count}</button>; // dispatch 없이 직접 호출
}
```

- **상태+액션 통합** — `interface`에 데이터와 함수를 함께 두는 것이 선언적 설계의 기본형입니다.

- **얕은 병합** — `set({ message })`처럼 바꿀 값만 넘기면 `count` 등은 그대로 유지됩니다.

- **선언적 호출** — `onClick={increase}`로 액션을 직접 연결해, "이 버튼 → 이 행위"의 인과가 명확합니다.

- **셀렉터** — `useSimpleStore((s) => s.count)`로 필요한 조각만 구독해 불필요한 리렌더를 피합니다.

---

## 🗺️ 3. 상태 관리 시리즈 인덱스

상태 관리 파트에서 다룬 글입니다. 순서대로 읽으면 Zustand의 기본기부터 구조 설계, `useReducer`와의 비교까지 이어집니다.

| 주제 | 다룬 내용 |
| :---: | :---: |
| [Zustand create·set·get](/posts/react-zustand-create-set-get/) | 스토어 기본 · useSyncExternalStore 동작 원리 |
| [슬라이스 패턴](/posts/react-zustand-slice-pattern/) | StateCreator · 도메인별 스토어 분리 |
| [useReducer vs Zustand](/posts/react-usereducer-vs-zustand/) | 보일러플레이트 비교 · 선택 기준 |
| [Zustand 셀렉터](/posts/react-zustand-selector/) | 선택적 구독 · 불필요한 리렌더 방지 |
| [Zustand persist](/posts/react-zustand-persist/) | 상태 자동 저장 · localStorage 미들웨어 |
| [하이드레이션 · SSR](/posts/react-zustand-hydration/) | 복원 시점 · SSR 불일치 · 깜빡임 제어 |

---

## ✅ 4. 핵심 정리

- **선언적 상태 변경** — 함수로 "무엇을 바꿀지"만 정의하면, 액션 타입·`switch`·`dispatch` 없이 상태가 바뀝니다. 함수가 액션, 내부 `set`이 리듀서입니다.

- **얕은 병합** — 바꿀 값만 넘기면 나머지는 자동 보존되어 `...state` 복사가 필요 없습니다.

- **보일러플레이트 제거** — 기능을 추가할 때 세 파일을 넘나들지 않고 스토어 한 곳에 함수만 더합니다.

- **셀렉터로 구독** — 컴포넌트는 필요한 조각만 구독해 성능을 지킵니다.

| 개념 | 내용 |
| :---: | :---: |
| 선언적 액션 | 함수 정의 = 액션 + 리듀서 |
| 얕은 병합 | 바꿀 값만, 나머지 자동 보존 |
| 셀렉터 | 필요한 조각만 구독 |

---

## 🔗 참고 자료

- 이전 시리즈: [React·TypeScript 타입 안전 설계 총정리](/posts/react-ts-type-safety-recap/)

- 다음 시리즈: [React Hook Form 폼 관리 총정리](/posts/react-hook-form-recap/)

- [Zustand 공식 문서](https://zustand.docs.pmnd.rs/)
