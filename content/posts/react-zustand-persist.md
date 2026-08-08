---
title: 'Zustand persist로 상태 자동 저장하기: localStorage 수동 관리에서 벗어나기'
slug: react-zustand-persist
description: >-
  새로고침하면 상태가 사라집니다. `localStorage`에 수동으로 저장·복원하면 `JSON.stringify`/`parse` 직렬화,
  검증되지 않은 `any`, SSR 방어 코드가 매번 따라붙습니다. Zustand의 `persist` 미들웨어는 이 과정을 설정 한 번으로
  자동화합니다. 수동 관리의 문제와 `persist` 구현, 저장소 교체·부분 저장, 그리고 persist가 형태까지 검증하지는 않는다는
  주의점을 정리합니다.
published_at: '2026-07-09T23:30:57-07:00'
labels:
  - AI 작성
  - 학습 정리
  - React
  - TypeScript
  - Zustand
source: 사용자 학습 노트 (React 상태관리 — Zustand persist/localStorage)
legacy_url: 'https://saver7942.blogspot.com/2026/07/zustand-persist-localstorage.html'
draft: false
---

React 상태는 새로고침하면 초기화됩니다. 장바구니처럼 유지되어야 하는 값은 브라우저 저장소(`localStorage`)에 옮겨 두어야 하는데, 이를 손으로 하면 저장·복원 코드가 비즈니스 로직보다 길어집니다. Zustand의 **`persist` 미들웨어**는 상태를 저장소와 자동으로 동기화합니다. 먼저 수동 관리의 문제를 짚고, `persist`로 어떻게 줄어드는지 정리합니다.

#### 목차

1. [localStorage 수동 관리의 고통](#1-localstorage)

2. [persist 미들웨어로 자동화](#2-persist)

3. [저장소 선택과 부분 저장](#3)

4. [주의사항](#4)

5. [핵심 정리](#5)

---

## 📦 1. localStorage 수동 관리의 고통

`localStorage`에 상태를 직접 저장·복원하면 대략 이런 코드가 됩니다.

```tsx
// src/components/ManualStorage.tsx
import { useState, useEffect } from 'react';

export function ManualStorage() {
  // 첫 렌더에 저장소에서 복원 (지연 초기화)
  const [cart, setCart] = useState<string[]>(() => {
    const saved = localStorage.getItem('my-cart');
    try {
      return saved ? JSON.parse(saved) : []; // JSON.parse의 반환은 any
    } catch {
      return [];
    }
  });

  // 상태가 바뀔 때마다 문자열로 직렬화해 저장
  useEffect(() => {
    localStorage.setItem('my-cart', JSON.stringify(cart));
  }, [cart]);

  const addItem = (item: string) => setCart([...cart, item]);
  // ...
}
```

- **검증되지 않은 `any`** — `JSON.parse`의 결과는 `any`입니다. 저장된 데이터가 실제로 `string[]`인지 런타임에 보장되지 않습니다.

- **직렬화 반복** — `localStorage`는 문자열만 저장하므로, 매번 `JSON.stringify`/`parse`를 직접 호출해야 합니다. 관리할 상태가 늘면 이 코드가 파일마다 복사됩니다.

- **SSR 문제** — `localStorage`는 브라우저에만 있어, 서버(Next.js 등)에서 실행하면 오류가 납니다. `typeof window !== 'undefined'` 같은 방어 코드가 필요합니다.

---

## 🛠️ 2. persist 미들웨어로 자동화

`persist`는 스토어 생성 함수를 감싸는 미들웨어입니다. 상태를 저장소와 자동으로 동기화하므로, 위의 `useState` 초기화·`useEffect`·`JSON` 처리가 모두 사라집니다.

```tsx
// src/store/useCartStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CartStore {
  cart: string[];
  addItem: (item: string) => void;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set) => ({
      cart: [],
      addItem: (item) => set((s) => ({ cart: [...s.cart, item] })),
    }),
    { name: 'my-cart' }, // 저장소에 쓸 키
  ),
);
```

- `persist((set) => ({...}), { name })` — 첫 인자는 평소의 스토어 생성 함수, 둘째 인자의 `name`은 저장소 키입니다.

- 직렬화·역직렬화·저장·복원이 자동입니다. 컴포넌트는 평소처럼 스토어를 쓰기만 하면 됩니다.

- `create<CartStore>()(persist(...))` — [슬라이스 편](https://saver7942.blogspot.com/2026/07/zustand-statecreator.html)에서 본 `create<T>()`의 빈 괄호 형태가 여기서도 쓰입니다. `persist`는 `StateCreator`의 미들웨어 자리에 들어가는 미들웨어입니다.

---

## 🔧 3. 저장소 선택과 부분 저장

기본 저장소는 `localStorage`지만, 옵션으로 바꾸거나 일부만 저장할 수 있습니다.

```tsx
import { persist, createJSONStorage } from 'zustand/middleware';

persist(
  (set) => ({ /* ... */ }),
  {
    name: 'my-cart',
    // 세션 저장소로 교체 (탭을 닫으면 사라짐)
    storage: createJSONStorage(() => sessionStorage),
    // 일부 필드만 저장 (액션·임시 상태 제외)
    partialize: (state) => ({ cart: state.cart }),
  },
);
```

- **저장소 교체** — `storage` 옵션만 바꾸면 `sessionStorage`나 커스텀 저장소로 옮길 수 있습니다. 수동 관리처럼 코드를 전면 수정할 필요가 없습니다.

- **부분 저장** — `partialize`로 저장할 필드를 고릅니다. 액션이나 일시적 상태는 저장에서 제외합니다.

- **SSR** — 서버에서는 저장소가 없어 스토어가 기본값으로 시작하고, 클라이언트에서 복원(하이드레이션)됩니다. 서버·클라이언트 초기 화면이 다를 수 있으므로, 필요하면 마운트 이후에 렌더하거나 `skipHydration` 옵션으로 복원 시점을 직접 제어합니다.

---

## ⚠️ 4. 주의사항

- **persist는 형태를 검증하지 않습니다.** 저장·복원을 자동화할 뿐, 복원된 데이터가 현재 타입과 맞는지는 보장하지 않습니다. 예전 버전의 데이터가 남아 있으면 잘못된 모양으로 복원될 수 있습니다. 스키마가 바뀌면 `version`과 `migrate` 옵션으로 이전 데이터를 변환하고, 신뢰할 수 없는 값은 [타입 가드](https://saver7942.blogspot.com/2026/07/typescript-is-api.html)로 검증합니다.

- **함수는 저장되지 않습니다.** 액션 함수는 직렬화되지 않으며, 복원 시 스토어 생성 함수가 다시 만들어 줍니다. `partialize`로 상태만 저장하는 편이 명확합니다.

- **큰 데이터는 성능에 주의합니다.** `localStorage` 접근은 동기이고 용량 제한이 있어, 큰 상태를 통째로 저장하면 부담이 됩니다.

- **민감 정보는 저장하지 않습니다.** `localStorage`는 스크립트로 읽을 수 있으므로 토큰·개인정보 저장은 피합니다.

---

## ✅ 5. 핵심 정리

- **수동 관리의 문제** — `JSON.stringify`/`parse` 직렬화, 검증되지 않은 `any`, SSR 방어 코드가 매번 따라붙고 상태마다 반복됩니다.

- **persist 미들웨어** — 스토어 생성 함수를 감싸 저장소와 자동 동기화합니다. `name` 하나로 저장·복원이 처리됩니다.

- **유연한 옵션** — `storage`로 저장소를 바꾸고, `partialize`로 저장할 필드를 고릅니다.

- **형태 검증은 별개** — persist는 저장·복원만 자동화합니다. 스키마 변경은 `version`/`migrate`로, 신뢰 못 할 데이터는 타입 가드로 직접 다뤄야 합니다.

| 항목 | 수동 관리 | persist |
| :---: | :---: | :---: |
| 직렬화 | `JSON.stringify`/`parse` 수동 | 자동 |
| 저장소 교체 | 코드 전면 수정 | 옵션 한 줄 |
| SSR | `typeof window` 방어 | 기본값→클라이언트 복원 |
| 형태 검증 | 수동 | 여전히 수동(`version`/`migrate`) |

---

## 🔗 참고 자료

- [Zustand 공식 문서 — persist 미들웨어](https://zustand.docs.pmnd.rs/integrations/persisting-store-data)

- 관련 글: [TypeScript 타입 가드 (외부 데이터 검증)](https://saver7942.blogspot.com/2026/07/typescript-is-api.html)

<p style="margin:24px 0 2px;padding:13px 18px;border:1.5px solid #C8443C;border-radius:14px 15px 13px 15px;background:rgba(200,68,60,0.06);text-align:center;font-size:14.5px;line-height:1.7;color:#2F3A39">🧩 <b>React 상태 관리(Zustand) 시리즈</b> &nbsp;·&nbsp; <a style="color:#C8443C;font-weight:700;text-decoration:none" href="https://saver7942.blogspot.com/2026/07/zustand-zustand.html">전체 정리 · 목차 보기 →</a></p>
