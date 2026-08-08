---
title: 'Zustand 셀렉터로 불필요한 리렌더 막기: 선택적 구독과 엄격한 비교'
slug: react-zustand-selector
description: >-
  스토어를 통째로 구독하면 관계없는 상태가 바뀌어도 컴포넌트가 리렌더됩니다. 셀렉터 `(state) => state.bears`는 필요한
  조각만 구독하게 하고, Zustand는 셀렉터 결과값을 이전 값과 엄격하게(`===`) 비교해 값이 바뀔 때만 리렌더합니다. 곰·물고기
  스토어로 렌더링 격리를 확인하고, 셀렉터가 객체를 반환할 때의 함정과 `useShallow` 대응까지 정리합니다.
published_at: '2026-07-09T22:55:25-07:00'
labels:
  - AI 작성
  - 학습 정리
  - React
  - TypeScript
  - Zustand
source: 사용자 학습 노트 (React 상태관리 — Zustand 셀렉터/선택적 구독)
legacy_url: 'https://saver7942.blogspot.com/2026/07/zustand.html'
draft: false
---

앞선 글들에서 셀렉터를 짧게 언급했는데, 이 글은 그 동작 원리와 렌더링 격리를 자세히 봅니다. 코드가 아무리 간결해도, 데이터 하나가 바뀔 때마다 상관없는 컴포넌트까지 다시 그려진다면 성능이 무너집니다. **셀렉터(selector)**는 스토어에서 필요한 조각만 골라 구독해, 그 조각이 바뀔 때만 컴포넌트를 리렌더하게 합니다.

#### 목차

1. [통째로 구독하면 다 리렌더된다](#1)

2. [셀렉터의 동작 원리 — 엄격한 비교](#2)

3. [실습: 렌더링 격리 확인](#3)

4. [주의사항](#4)

5. [핵심 정리](#5)

---

## 📦 1. 통째로 구독하면 다 리렌더된다

스토어를 통째로 가져오면, 어떤 상태가 바뀌든 그 컴포넌트가 다시 그려집니다.

```tsx
// 통째 구독 — bears만 쓰는데 fish가 바뀌어도 리렌더된다
const { bears } = useZooStore();
```

곰 마릿수만 화면에 쓰는 컴포넌트가, 물고기 마릿수가 바뀌었다고 다시 그려질 이유는 없습니다. 이런 불필요한 리렌더가 쌓이면 전역 상태를 쓰는 앱은 금세 느려집니다. 셀렉터는 "나는 이 조각만 보겠다"고 구독 범위를 좁혀 이 문제를 막습니다.

---

## 🔍 2. 셀렉터의 동작 원리 — 엄격한 비교

셀렉터는 스토어에서 원하는 값만 뽑는 함수입니다. Zustand는 이 함수가 반환한 값을 기억해 두었다가, 상태가 바뀔 때마다 새 결과와 이전 결과를 **엄격한 동등 비교(`===`)**로 견줍니다.

```tsx
const bears = useZooStore((state) => state.bears);
```

상태가 바뀌면 다음 순서로 동작합니다.

1. `set`이 호출되어 새 상태 객체가 만들어집니다.

2. 이 스토어를 구독하는 각 컴포넌트의 셀렉터 함수가 다시 실행됩니다.

3. 셀렉터의 새 결과값과 이전 결과값을 `===`로 비교합니다.

4. 값이 **다를 때만** 리렌더 신호를 보냅니다. 같으면 조용히 건너뜁니다.

그래서 `fish`가 바뀌어도 `state.bears` 셀렉터의 결과는 그대로(`0 === 0`)이므로, 곰 컴포넌트는 리렌더되지 않습니다.

---

## 🛠️ 3. 실습: 렌더링 격리 확인

곰과 물고기 마릿수를 관리하는 스토어를 만들고, 각각을 셀렉터로 구독하는 두 컴포넌트로 렌더링 격리를 확인합니다.

```tsx
// src/store/useZooStore.ts
import { create } from 'zustand';

interface ZooStore {
  bears: number;
  fish: number;
  addBear: () => void;
  addFish: () => void;
}

export const useZooStore = create<ZooStore>((set) => ({
  bears: 0,
  fish: 0,
  addBear: () => set((s) => ({ bears: s.bears + 1 })),
  addFish: () => set((s) => ({ fish: s.fish + 1 })),
}));
```

```tsx
// src/components/BearCounter.tsx — bears만 구독
import { useZooStore } from '../store/useZooStore';

export function BearCounter() {
  const bears = useZooStore((s) => s.bears);
  const addBear = useZooStore((s) => s.addBear); // 액션도 셀렉터로

  console.log('🐻 곰 컴포넌트 리렌더');
  return <button onClick={addBear}>곰: {bears}</button>;
}
```

`FishCounter`도 같은 방식으로 `fish`만 구독합니다. 두 컴포넌트는 같은 스토어를 공유하지만, 서로의 변화에는 반응하지 않습니다.

<details style="margin:10px 0 4px">
<summary style="cursor:pointer;font-weight:700;color:#C8443C">물고기 버튼을 누르면 콘솔에 무엇이 찍힐까?</summary>
<pre><code>[물고기 추가 클릭]
🐟 물고기 컴포넌트 리렌더
// 🐻 곰 로그는 찍히지 않음

// 곰 셀렉터 state.bears 결과가 0 === 0 (변화 없음)
// → 곰 컴포넌트는 리렌더 신호를 받지 않는다</code></pre>
</details>

같은 스토어를 공유하면서도, 성능 관점에서는 각자 독립된 `useState`를 쓰는 것처럼 렌더링이 분리됩니다.

---

## ⚠️ 4. 주의사항

- **셀렉터가 객체를 반환하면 매번 리렌더될 수 있습니다.** `useZooStore((s) => ({ bears: s.bears, fish: s.fish }))`는 매 실행마다 **새 객체**를 만들어 `===` 비교가 항상 거짓이 됩니다. 결과적으로 어떤 상태가 바뀌어도 리렌더됩니다.

- **여러 값이 필요하면 `useShallow` 또는 값별 셀렉터를 씁니다.** `useZooStore(useShallow((s) => ({ bears: s.bears, fish: s.fish })))`는 얕은 비교로 각 필드를 견주어 실제로 바뀐 경우에만 리렌더합니다. 또는 값마다 셀렉터를 따로 호출해도 됩니다.

- **통째 구독(`const s = useZooStore()`)은 지양합니다.** 편해 보여도 모든 상태 변화에 리렌더되므로, 필요한 조각만 셀렉터로 가져오는 습관이 좋습니다.

- **액션 함수도 셀렉터로 가져올 수 있습니다.** 스토어의 함수는 참조가 바뀌지 않으므로, `(s) => s.addBear`로 가져와도 불필요한 리렌더를 유발하지 않습니다.

---

## ✅ 5. 핵심 정리

- **선택적 구독** — 셀렉터 `(state) => state.part`로 필요한 조각만 구독해, 관계없는 상태 변화에 리렌더되지 않게 합니다.

- **엄격한 비교** — Zustand는 셀렉터 결과를 이전 값과 `===`로 비교해, 값이 바뀔 때만 리렌더합니다.

- **렌더링 격리** — 같은 스토어를 공유해도, 셀렉터로 나눈 컴포넌트들은 서로의 변화에 영향을 받지 않습니다.

- **객체 반환 주의** — 셀렉터가 객체를 반환하면 매번 새 참조라 항상 리렌더됩니다. 여러 값은 `useShallow`나 값별 셀렉터로 다룹니다.

| 구독 방식 | 리렌더 시점 |
| :---: | :---: |
| `useStore()` (통째) | 모든 상태 변화 |
| `useStore((s) => s.bears)` | `bears`가 `===`로 바뀔 때만 |
| `useStore((s) => ({ ... }))` | 매번 (새 객체) — `useShallow` 필요 |

---

## 🔗 참고 자료

- [Zustand 공식 문서 — Selecting multiple state slices (useShallow)](https://zustand.docs.pmnd.rs/guides/prevent-rerenders-with-use-shallow)

- [Zustand 공식 문서](https://zustand.docs.pmnd.rs/)

<p style="margin:24px 0 2px;padding:13px 18px;border:1.5px solid #C8443C;border-radius:14px 15px 13px 15px;background:rgba(200,68,60,0.06);text-align:center;font-size:14.5px;line-height:1.7;color:#2F3A39">🧩 <b>React 상태 관리(Zustand) 시리즈</b> &nbsp;·&nbsp; <a style="color:#C8443C;font-weight:700;text-decoration:none" href="https://saver7942.blogspot.com/2026/07/zustand-zustand.html">전체 정리 · 목차 보기 →</a></p>
