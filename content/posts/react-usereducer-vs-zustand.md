---
title: 'useReducer vs Zustand: 보일러플레이트 비교와 선택 기준'
slug: react-usereducer-vs-zustand
description: >-
  `useReducer`는 action·dispatch·reducer로 상태 변경을 예측 가능하게 만들지만, 액션 하나를 추가하려면
  타입·reducer·UI 세 곳을 함께 고쳐야 하는 보일러플레이트가 따릅니다. 같은 기능을 Zustand로 짜면 dispatch·switch
  없이 함수 하나로 끝납니다. 두 방식을 나란히 비교하고, 격리된 복잡 로컬 상태에는 `useReducer`, 전역·다도메인 상태에는
  Zustand라는 선택 기준을 정리합니다.
published_at: '2026-07-09T22:34:43-07:00'
labels:
  - AI 작성
  - 학습 정리
  - React
  - TypeScript
  - Zustand
source: 사용자 학습 노트 (React 상태관리 — useReducer 보일러플레이트 vs Zustand)
legacy_url: 'https://saver7942.blogspot.com/2026/07/usereducer-vs-zustand.html'
draft: false
series: zustand
part: 3
---

[이전 글](/posts/react-zustand-slice-pattern/)에서 Zustand의 슬라이스 패턴을 봤습니다. Zustand가 등장하기 전부터 복잡한 상태에는 `useReducer`라는 React 내장 방법이 있었는데, 많은 팀이 전역 상태에서는 Zustand로 옮겨갑니다. 왜일까요? 이 글은 `useReducer`의 보일러플레이트를 짚고, 같은 기능을 Zustand로 대비한 뒤, 언제 무엇을 쓸지 정리합니다. `useReducer`에 타입을 입히는 방법 자체는 [선행 글(useReducer 타입)](/posts/react-ts-typed-usereducer/)에서 다뤘습니다.

---

## 📦 1. useReducer의 구조

`useReducer`는 상태를 직접 바꾸는 대신, 정해진 절차를 거치게 해 변경을 예측 가능하게 만듭니다. 은행 창구에 비유하면 이렇습니다.

- **액션(action)** — "무엇을 해달라"는 요청서. 예: `{ type: 'INCREMENT' }`

- **디스패치(dispatch)** — 요청서를 창구에 전달하는 행위.

- **리듀서(reducer)** — 규정집을 보고 현재 상태와 액션으로 새 상태를 계산하는 함수.

상태를 컴포넌트 바깥의 순수 함수(reducer)로 분리해, 변경 규칙을 한곳에 모으는 것이 핵심입니다. 타입을 입히는 방법은 [선행 글](/posts/react-ts-typed-usereducer/)에서 다뤘습니다.

---

## ⚠️ 2. 보일러플레이트의 실체

카운터와 메시지를 다루는 단순한 기능도, `useReducer`로 짜면 절차가 제법 깁니다.

```tsx
import { useReducer } from 'react';

// (1) 액션 종류 — 기능을 추가하면 여기부터 고쳐야 한다
type Action =
  | { type: 'INCREMENT' }
  | { type: 'DECREMENT' }
  | { type: 'UPDATE_MESSAGE'; payload: string };

interface State { count: number; message: string; }
const initialState: State = { count: 0, message: '안녕하세요' };

// (2) 규칙을 담은 reducer — 모든 로직이 이 switch 안에 모인다
function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'INCREMENT':
      return { ...state, count: state.count + 1 }; // ...state 반복
    case 'DECREMENT':
      return { ...state, count: state.count - 1 };
    case 'UPDATE_MESSAGE':
      return { ...state, message: action.payload };
    default:
      return state;
  }
}

function Counter() {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <>
      <p>{state.count} · {state.message}</p>
      {/* (3) 변경할 때마다 액션 객체를 만들어 dispatch */}
      <button onClick={() => dispatch({ type: 'INCREMENT' })}>증가</button>
      <button onClick={() => dispatch({ type: 'UPDATE_MESSAGE', payload: '반가워요' })}>
        메시지
      </button>
    </>
  );
}
```

- **액션 하나 추가 = 세 곳 수정** — `Action` 타입에 추가하고, `reducer`의 `switch`에 `case`를 넣고, UI의 `dispatch` 호출까지 손봐야 합니다.

- **`...state` 반복** — 참조를 바꿔 변경을 알리려면 매 분기에서 기존 상태를 펼쳐 복사해야 합니다. 상태가 깊어질수록 중첩이 늘어납니다.

- **`dispatch` 경유** — 함수를 직접 부르지 않고, 액션 객체를 만들어 `dispatch`라는 창구를 거쳐야 상태가 바뀝니다.

---

## 🛠️ 3. 같은 기능을 Zustand로

같은 카운터를 Zustand로 만들면, `Action` 타입도 `switch`도 `dispatch`도 없습니다. 액션은 그냥 `set`을 호출하는 함수입니다.

```tsx
import { create } from 'zustand';

interface CounterStore {
  count: number;
  message: string;
  increment: () => void;
  updateMessage: (msg: string) => void;
}

const useCounter = create<CounterStore>((set) => ({
  count: 0,
  message: '안녕하세요',
  increment: () => set((s) => ({ count: s.count + 1 })),
  updateMessage: (msg) => set({ message: msg }),
}));

function Counter() {
  const count = useCounter((s) => s.count);
  const increment = useCounter((s) => s.increment);
  return <button onClick={increment}>{count}</button>;
}
```

- **액션 = 함수** — `increment`를 그대로 호출합니다. 액션 타입, `switch`, `dispatch`가 필요 없습니다.

- **기능 추가 = 한 곳** — 스토어 객체에 함수 하나를 더하면 끝입니다. 세 파일을 넘나들 일이 없습니다.

- **`set`의 얕은 병합** — 바꿀 속성만 넘기면 나머지는 보존되어, `...state` 반복이 줄어듭니다.

---

## ⚖️ 4. 언제 useReducer, 언제 Zustand

`useReducer`가 항상 나쁜 것은 아닙니다. 둘은 쓰임이 다릅니다.

**`useReducer`가 맞을 때**

- 한 컴포넌트 안의 복잡한 로컬 상태가 여러 개 얽혀 상태 머신처럼 동작할 때. 전이 규칙을 reducer 한곳에 모으는 이점이 큽니다.

- 외부 라이브러리 없이 React 내장 기능만으로 상태 로직을 분리하고 싶을 때.

**Zustand가 맞을 때**

- 여러 컴포넌트·도메인이 공유하는 전역 상태를 다룰 때. `useReducer`의 장황함이 부담이 됩니다.

- 빠른 반복 개발이 중요할 때. 보일러플레이트를 줄여 기능 추가가 가벼워집니다.

정리하면, 전역·다도메인 상태는 Zustand가, 격리된 복잡 로컬 상태 머신은 `useReducer`가 어울립니다. 도구를 상황에 맞게 고르는 것이 요점입니다.

---

## ✅ 5. 핵심 정리

- **`useReducer`의 절차** — action·dispatch·reducer로 상태 변경을 예측 가능하게 만들지만, 액션 추가에 타입·reducer·UI 세 곳 수정과 `...state` 반복이 따릅니다.

- **Zustand의 간결함** — 액션이 `set`을 호출하는 함수라, `dispatch`·`switch` 없이 스토어 한 곳에 기능을 추가합니다.

- **선택 기준** — 격리된 복잡 로컬 상태 머신에는 `useReducer`, 전역·다도메인 상태와 빠른 개발에는 Zustand.

- **도구는 상황에 맞게** — 어느 하나가 정답이 아니라, 상태의 범위와 복잡도에 따라 고릅니다.

| 항목 | useReducer | Zustand |
| :---: | :---: | :---: |
| 액션 정의 | `Action` 유니온 타입 | 스토어 안의 함수 |
| 상태 변경 | `dispatch` → reducer `switch` | `set` 직접 호출 |
| 기능 추가 | 타입·reducer·UI 세 곳 | 스토어 한 곳 |
| 어울리는 곳 | 격리된 복잡 로컬 상태 | 전역·다도메인 상태 |

---

## 🔗 참고 자료

- 선행 글: [TypeScript로 useReducer 타입 안전하게 쓰기](/posts/react-ts-typed-usereducer/)

- 이전 글: [Zustand 슬라이스 패턴으로 스토어 나누기](/posts/react-zustand-slice-pattern/)

- [Zustand 공식 문서](https://zustand.docs.pmnd.rs/)

- [React 공식 문서 — useReducer](https://react.dev/reference/react/useReducer)
