---
title: 'Zustand 상태 관리 입문: create·set·get과 useSyncExternalStore 동작 원리'
slug: react-zustand-create-set-get
description: >-
  Zustand는 React 트리 바깥에 상태를 두고 필요한 컴포넌트만 구독하게 하는 가벼운 상태 관리 라이브러리입니다. `create`로
  스토어를 만들고, `set`으로 상태를 바꾸며(얕은 병합·함수형 업데이트), `get`으로 리렌더링 없이 값을 읽습니다. React 바깥
  상태가 화면을 갱신하는 원리(`useSyncExternalStore`)와 타입을 지정한 스토어 예제까지 정리합니다.
published_at: '2026-07-09T22:14:13-07:00'
labels:
  - AI 작성
  - 학습 정리
  - React
  - TypeScript
  - Zustand
source: 사용자 학습 노트 (React 상태관리 — Zustand create·set·get)
legacy_url: 'https://saver7942.blogspot.com/2026/07/zustand-createsetget.html'
draft: false
series: zustand
part: 1
---

컴포넌트가 많아질수록 상태를 어디에 두고 어떻게 나눠 쓸지가 문제가 됩니다. Zustand는 상태를 React 트리 바깥에 두고, 그 값이 필요한 컴포넌트만 구독하게 하는 가벼운 라이브러리입니다. 이 글은 Zustand의 핵심인 `create`·`set`·`get` 세 함수의 동작과, React 바깥 상태가 어떻게 화면을 다시 그리게 하는지를 정리합니다. 타입 안전 설계를 다룬 [이전 시리즈](https://saver7942.blogspot.com/2026/07/react-typescript.html)에 이어, 여기서부터는 상태 관리를 다룹니다.

---

## 📦 1. create — 스토어를 만드는 공장

`create`는 스토어를 만드는 함수입니다. 관리할 상태와 그 상태를 바꾸는 액션을 한 묶음으로 정의하면, 컴포넌트에서 쓸 커스텀 훅을 돌려줍니다.

```tsx
import { create } from 'zustand';

// create에 넘기는 콜백은 (set, get)을 인자로 받는다
const useStore = create((set) => ({
  count: 0,
  inc: () => set((state) => ({ count: state.count + 1 })),
}));
```

Zustand의 특징은 상태를 **React 컴포넌트 트리 바깥**, 순수한 JavaScript 영역에 정의한다는 점입니다. `create`의 콜백은 상태의 초기값과 함께, 상태를 바꿀 도구인 `set`·`get`을 인자로 받습니다. `useContext`가 컴포넌트 트리 안에 묶여 있던 것과 달리, `create`로 만든 스토어는 트리 밖에 독립적으로 존재하며 필요한 곳 어디서든 구독할 수 있습니다.

---

## 🔗 2. 구독과 useSyncExternalStore

React 바깥에 있는 Zustand가 어떻게 컴포넌트를 다시 그리게 할까요? React가 제공하는 **구독(subscription)** 메커니즘을 통해서입니다.

```tsx
// Zustand 내부가 대략 이렇게 동작한다 (개념 코드)
const state = useSyncExternalStore(
  store.subscribe,  // 값이 바뀌면 알림을 받을 리스너 등록
  store.getState,   // 현재 최신 값을 읽어오는 스냅샷
);
```

React 18부터 외부 상태 라이브러리를 위한 전용 훅 `useSyncExternalStore`가 제공됩니다.

- **배경** — 동시성 렌더링(concurrent rendering) 중 외부 상태가 바뀌면, 같은 상태를 참조하는 두 컴포넌트가 서로 다른 값을 보여주는 **티어링(tearing)**이 생길 수 있었습니다.

- **역할** — 이 훅은 외부 저장소의 변경을 React 렌더링 사이클과 동기화합니다. Zustand에서 `set`이 호출되면 이 가교를 통해 "값이 바뀌었다"는 신호가 전달되고, 알림을 받은 React가 해당 컴포넌트를 다시 그립니다.

---

## 🛠️ 3. set — 얕은 병합과 함수형 업데이트

`set`은 상태를 바꾸는 함수입니다. 두 가지 방식이 있습니다.

**얕은 병합(shallow merge)** — 바꿀 부분만 객체로 넘깁니다. 나머지 속성은 그대로 보존됩니다.

```tsx
set({ username: '새 이름' });
// username만 교체, points·isLoggedIn 등은 유지됨
```

**함수형 업데이트(functional update)** — 현재 상태를 인자로 받아 다음 상태를 계산합니다.

```tsx
set((state) => ({ points: state.points + 10 }));
```

- 얕은 병합은 단순한 값 교체에 간결합니다. Zustand가 넘긴 객체를 기존 상태에 최상위 수준에서 병합합니다.

- 함수형 업데이트는 콜백이 항상 최신 상태(`state`)를 받으므로, 짧은 시간에 여러 번 갱신되거나 비동기가 섞일 때 값이 유실되는 문제(race condition)를 피합니다. 현재 값을 기반으로 계산할 때는 이 방식을 씁니다.

---

## 🔍 4. get — 리렌더링 없이 값 읽기

`get`은 구독 없이 현재 상태를 스냅샷처럼 읽어오는 함수입니다. 화면을 다시 그리지 않고 값만 필요할 때 씁니다.

```tsx
const currentPoints = get().points;

if (currentPoints > 100) {
  set({ rank: 'VIP' });
}
```

컴포넌트는 보통 상태를 구독하며 화면을 그리지만, 액션 내부에서 "지금 값이 얼마인지"만 확인해야 할 때가 있습니다. 이때 `get()`은 리렌더링을 유발하지 않고 값만 읽어옵니다. 조건 분기나 로그처럼, 화면과 무관한 연산에 적합합니다.

---

## 🏗️ 5. 실습: 타입 지정 스토어

`interface`로 스토어의 규격을 정의하고, `create<UserStore>`로 그 규격을 강제합니다. `set`(함수형)과 `get`을 함께 쓰는 예제입니다.

```tsx
// src/store/useUserStore.ts
import { create } from 'zustand';

interface UserStore {
  username: string;
  points: number;
  isLoggedIn: boolean;
  increasePoints: (amount: number) => void;
  resetUser: () => void;
}

export const useUserStore = create<UserStore>((set, get) => ({
  username: '아키텍트',
  points: 100,
  isLoggedIn: true,

  // 함수형 업데이트: 현재 points를 기반으로 안전하게 합산
  increasePoints: (amount) =>
    set((state) => ({ points: state.points + amount })),

  // get으로 현재 값을 읽어 조건 분기 후, 얕은 병합으로 초기화
  resetUser: () => {
    const currentPoints = get().points;
    if (currentPoints > 0) {
      console.log(`${get().username}님의 ${currentPoints}포인트가 초기화됩니다.`);
      set({ username: '', points: 0, isLoggedIn: false });
    }
  },
}));
```

<details style="margin:10px 0 4px">
<summary style="cursor:pointer;font-weight:700;color:#C8443C">increasePoints(50) → resetUser() 실행하면?</summary>
<pre><code>increasePoints(50); // points: 100 → 150 (함수형 업데이트)
resetUser();
// get().points = 150 (> 0)
// 콘솔: "아키텍트님의 150포인트가 초기화됩니다."
// set으로 username='', points=0, isLoggedIn=false</code></pre>
</details>

- `create<UserStore>` — 제네릭으로 스토어가 규격을 따르도록 강제합니다. 없는 속성이나 잘못된 타입은 컴파일 타임에 걸립니다.

- `set`은 넘긴 속성만 교체하고 나머지는 보존하므로, `...state`로 전체를 복사하지 않아도 불변성이 유지됩니다.

---

## ⚠️ 6. 주의사항

- **컴포넌트에서는 셀렉터로 필요한 값만 구독합니다.** `const { points } = useUserStore()`처럼 전체를 구독하면 어떤 상태가 바뀌든 리렌더됩니다. `const points = useUserStore((s) => s.points)`로 필요한 조각만 구독해야 불필요한 렌더를 피합니다.

- **`set`의 병합은 최상위(shallow)입니다.** 중첩 객체는 깊게 병합되지 않습니다. `set({ profile: { name } })`은 `profile` 전체를 교체하므로, 중첩을 보존하려면 `set((s) => ({ profile: { ...s.profile, name } }))`처럼 직접 펼쳐야 합니다.

- **`get`은 스냅샷일 뿐 구독이 아닙니다.** `get()`으로 읽은 값은 그 시점의 값입니다. 화면에 반영해야 한다면 컴포넌트에서 훅으로 구독해야 합니다.

- **액션도 상태의 일부로 정의합니다.** Zustand에서는 `set`을 호출하는 함수(액션)를 스토어 객체 안에 함께 두는 것이 일반적인 구조입니다.

---

## ✅ 7. 핵심 정리

- **`create`** — 관리할 상태와 액션을 한 묶음으로 정의해 스토어 훅을 만듭니다. 상태는 React 트리 바깥에 존재합니다.

- **`useSyncExternalStore`** — React 18의 외부 상태 전용 훅으로, 외부 저장소의 변경을 렌더링과 동기화해 티어링을 막습니다. `set` 호출이 이 가교를 통해 리렌더로 이어집니다.

- **`set`** — 얕은 병합(바꿀 속성만 교체)과 함수형 업데이트(현재 상태 기반 계산) 두 방식이 있습니다. 현재 값을 기반으로 할 때는 함수형을 씁니다.

- **`get`** — 리렌더링 없이 현재 값을 읽습니다. 액션 내부의 조건 분기·로그에 적합합니다.

- **타입 지정** — `create<Store>`로 규격을 강제하고, 컴포넌트에서는 셀렉터로 필요한 조각만 구독합니다.

| 함수 | 역할 |
| :---: | :---: |
| `create` | 스토어(상태+액션) 생성 |
| `set` | 상태 변경 (얕은 병합 / 함수형) |
| `get` | 리렌더링 없이 값 읽기 (스냅샷) |
| `useSyncExternalStore` | 외부 상태를 React 렌더와 동기화 |

---

## 🔗 참고 자료

- 이전 시리즈: [React·TypeScript 타입 안전 설계 총정리](https://saver7942.blogspot.com/2026/07/react-typescript.html)

- [Zustand 공식 문서](https://zustand.docs.pmnd.rs/)

- [React 공식 문서 — useSyncExternalStore](https://react.dev/reference/react/useSyncExternalStore)
