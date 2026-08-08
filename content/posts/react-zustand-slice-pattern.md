---
title: 'Zustand 슬라이스 패턴으로 스토어 나누기: StateCreator와 타입 통합'
slug: react-zustand-slice-pattern
description: >-
  상태가 커지면 스토어를 도메인별로 조각내는 슬라이스 패턴이 유지보수에 유리합니다. 각 슬라이스를 `interface`로 정의하고
  `extends`로 하나의 스토어 타입으로 합친 뒤, `StateCreator<전체, [], [], 슬라이스>`로 각 조각을 구현하고
  `create`에서 전개 연산자로 합칩니다. `StateCreator`의 네 제네릭 인자와 `import type`의 역할, 셀렉터 사용까지
  정리합니다.
published_at: '2026-07-09T22:27:31-07:00'
labels:
  - AI 작성
  - 학습 정리
  - React
  - TypeScript
  - Zustand
source: 사용자 학습 노트 (React 상태관리 — Zustand 슬라이스 패턴/StateCreator)
legacy_url: 'https://saver7942.blogspot.com/2026/07/zustand-statecreator.html'
draft: false
series: zustand
part: 2
---

[이전 글](/posts/react-zustand-create-set-get/)에서 `create`·`set`·`get`으로 스토어의 기본 동작을 봤습니다. 상태가 커질수록 모든 로직을 한 파일에 몰아넣으면 수정이 어려워집니다. **슬라이스 패턴(Slice Pattern)**은 스토어를 도메인(관리 영역)별로 조각내어 각자 관리하고, 최종적으로 하나로 합치는 구조입니다. 이 글은 슬라이스 패턴을 타입과 함께 구성하는 과정을 정리합니다.

---

## 📦 1. 슬라이스 패턴이란

상태를 하나의 거대한 객체에 몰아넣으면, 작은 기능 하나를 고칠 때도 전체를 헤집게 됩니다. 슬라이스 패턴은 스토어를 기능 단위(예: 유저·상품·알림)로 나눠 각 조각이 자기 데이터만 책임지게 하고, 마지막에 하나의 스토어로 합칩니다.

백화점을 층별로 나눠 관리하는 것과 비슷합니다. 화장품 층과 의류 층은 각자 재고를 관리하지만, 결국 하나의 백화점으로 운영됩니다.

- **독립성** — 각 도메인 로직이 파일 단위로 분리되어, 담당자가 서로의 코드를 건드리지 않고 작업할 수 있습니다.

- **확장성** — 새 도메인이 생기면 슬라이스 파일과 타입만 추가하면 되고, 기존 코드는 거의 손대지 않습니다.

---

## 🏗️ 2. 슬라이스 타입 설계

먼저 각 슬라이스의 규격을 `interface`로 정의하고, `extends`로 이들을 합친 전체 스토어 타입을 만듭니다.

```tsx
// src/store/types.ts

// 화장품 슬라이스: 상태 + 액션
export interface CosmeticsSlice {
  perfumeStock: number;
  sellPerfume: () => void;
}

// 의류 슬라이스
export interface ClothingSlice {
  shirtStock: number;
  sellShirt: () => void;
}

// 통합: 두 슬라이스를 하나의 스토어 타입으로 합친다
export interface DepartmentStore extends CosmeticsSlice, ClothingSlice {}
```

- 각 슬라이스는 자기 도메인의 상태와 액션만 정의합니다(단일 책임).

- `interface ... extends A, B`는 여러 인터페이스를 하나로 병합합니다. 이 통합 타입 `DepartmentStore`가 "전체 스토어의 모양"이 되고, 각 슬라이스가 다른 슬라이스를 참조할 때 기준이 됩니다.

---

## 🛠️ 3. StateCreator로 슬라이스 구현

각 슬라이스는 `StateCreator` 타입으로 만듭니다. 네 개의 제네릭 인자를 받습니다.

```tsx
// StateCreator<전체 스토어, 미들웨어1, 미들웨어2, 이 슬라이스 타입>
```

```tsx
// src/store/cosmeticsSlice.ts
import type { StateCreator } from 'zustand';
// 타입은 import type으로 — 런타임에 존재하지 않는 값을 가져오지 않도록
import type { CosmeticsSlice, DepartmentStore } from './types';

export const createCosmeticsSlice: StateCreator<
  DepartmentStore, // ① 전체 스토어 타입 — 다른 슬라이스를 get()으로 참조하기 위함
  [],              // ② 미들웨어 (없음)
  [],              // ③ 미들웨어 (없음)
  CosmeticsSlice   // ④ 이 파일이 책임질 슬라이스 타입
> = (set) => ({
  perfumeStock: 100,
  sellPerfume: () => set((state) => ({ perfumeStock: state.perfumeStock - 1 })),
});
```

- **① 전체 스토어 타입** — 첫 인자를 `DepartmentStore`로 두면, 이 슬라이스에서도 스토어 전체 모양을 인지해 다른 슬라이스 값을 `get()`으로 참조할 수 있고 자동 완성이 동작합니다.

- **②③ 미들웨어 자리** — `persist`·`devtools` 같은 미들웨어를 쓸 때 채우는 예약석입니다. 없으면 빈 배열로 둡니다.

- **④ 이 슬라이스 타입** — `CosmeticsSlice`를 명시해, 이 파일이 구현해야 할 필드를 강제합니다.

의류 슬라이스도 같은 구조로 만듭니다.

```tsx
// src/store/clothingSlice.ts
import type { StateCreator } from 'zustand';
import type { ClothingSlice, DepartmentStore } from './types';

export const createClothingSlice: StateCreator<DepartmentStore, [], [], ClothingSlice> = (set) => ({
  shirtStock: 50,
  sellShirt: () => set((state) => ({ shirtStock: state.shirtStock - 1 })),
});
```

<details style="margin:10px 0 4px">
<summary style="cursor:pointer;font-weight:700;color:#C8443C">화장품 슬라이스에서 셔츠 재고를 참조할 수 있을까?</summary>
<pre><code>// StateCreator의 첫 인자가 DepartmentStore(전체)이므로 가능
export const createCosmeticsSlice: StateCreator&lt;DepartmentStore, [], [], CosmeticsSlice&gt;
  = (set, get) =&gt; ({
    perfumeStock: 100,
    sellPerfume: () =&gt; {
      const shirts = get().shirtStock; // 다른 슬라이스 값 참조 OK
      set((state) =&gt; ({ perfumeStock: state.perfumeStock - 1 }));
    },
  });</code></pre>
</details>

---

## 🔗 4. 슬라이스 합쳐 스토어 만들기

분리한 슬라이스들을 `create`에서 전개 연산자로 합쳐 하나의 훅으로 만듭니다.

```tsx
// src/store/index.ts
import { create } from 'zustand';
import type { DepartmentStore } from './types';
import { createCosmeticsSlice } from './cosmeticsSlice';
import { createClothingSlice } from './clothingSlice';

export const useDepartmentStore = create<DepartmentStore>()((...a) => ({
  ...createCosmeticsSlice(...a),
  ...createClothingSlice(...a),
}));
```

- `create<DepartmentStore>()` — 타입만 지정하고 빈 괄호 `()`를 한 번 더 붙이는 형태입니다. Zustand에서 제네릭과 슬라이스 추론이 맞물리도록 하는 문법이니 `()`를 빠뜨리지 않습니다.

- `(...a)` — Zustand가 넘기는 `set`·`get`·`api` 도구 묶음을 통째로 받습니다.

- `...createCosmeticsSlice(...a)` — 각 슬라이스 생성 함수에 그 도구를 넘겨 실행하고, 결과 객체들을 전개해 하나의 스토어로 병합합니다.

---

## 📊 5. 컴포넌트에서 셀렉터로 쓰기

컴포넌트에서는 셀렉터로 필요한 상태·액션만 골라 구독합니다.

```tsx
// src/App.tsx
import { useDepartmentStore } from './store';

export function App() {
  const perfumeStock = useDepartmentStore((s) => s.perfumeStock);
  const sellPerfume = useDepartmentStore((s) => s.sellPerfume);
  const shirtStock = useDepartmentStore((s) => s.shirtStock);
  const sellShirt = useDepartmentStore((s) => s.sellShirt);

  return (
    <div>
      <p>향수 재고: {perfumeStock}</p>
      <button onClick={sellPerfume}>향수 판매</button>
      <p>셔츠 재고: {shirtStock}</p>
      <button onClick={sellShirt}>셔츠 판매</button>
    </div>
  );
}
```

- 셀렉터로 필요한 조각만 구독하므로, 셔츠 재고가 바뀌어도 향수 재고만 쓰는 부분은 리렌더되지 않습니다. 성능의 핵심입니다.

- 슬라이스로 나눴지만 컴포넌트 입장에서는 하나의 스토어처럼 자연스럽게 사용합니다.

---

## ⚠️ 6. 주의사항

- **타입은 `import type`으로 가져옵니다.** `StateCreator`와 슬라이스 인터페이스는 모두 타입입니다. 일반 `import`로 가져오면, 런타임에 존재하지 않는 값을 불러오려다 빌드·실행 오류가 날 수 있습니다(특히 `isolatedModules`/`verbatimModuleSyntax` 환경).

- **`StateCreator`의 첫 제네릭은 전체 스토어 타입이어야 합니다.** 슬라이스 자기 타입만 넣으면 다른 슬라이스를 `get()`으로 참조하지 못하고 자동 완성도 좁아집니다.

- **`create<T>()`의 빈 괄호를 빠뜨리지 않습니다.** `create<T>(...)`로 바로 쓰면 슬라이스 타입 추론이 깨집니다. `create<T>()(...)` 커리 형태를 씁니다.

- **슬라이스는 관심사 분리를 위한 것입니다.** 슬라이스 간 상호 참조가 지나치게 많아지면 경계 설정을 다시 살펴보는 것이 좋습니다.

---

## ✅ 7. 핵심 정리

- **슬라이스 패턴** — 스토어를 도메인 단위로 조각내 독립적으로 관리하고 하나로 합칩니다. 유지보수와 확장에 유리합니다.

- **타입 통합** — 각 슬라이스를 `interface`로 정의하고 `extends`로 합쳐 전체 스토어 타입을 만듭니다.

- **StateCreator** — `<전체, 미들웨어, 미들웨어, 슬라이스>` 네 인자로, 전체 구조를 인지하며 한 슬라이스를 구현합니다.

- **결합** — `create<전체>()((...a) => ({ ...sliceA(...a), ...sliceB(...a) }))`로 도구를 각 슬라이스에 배분해 합칩니다.

- **셀렉터** — 컴포넌트는 필요한 조각만 구독해 불필요한 리렌더를 피합니다.

| 요소 | 역할 |
| :---: | :---: |
| 슬라이스 `interface` | 도메인별 상태+액션 규격 |
| `extends` 통합 타입 | 슬라이스들을 하나의 스토어 타입으로 |
| `StateCreator<전체,[],[],슬라이스>` | 전체를 인지하며 한 슬라이스 구현 |
| `create<T>()((...a) => …)` | 슬라이스들을 합쳐 스토어 생성 |

---

## 🔗 참고 자료

- 이전 글: [Zustand 상태 관리 입문 (create·set·get)](/posts/react-zustand-create-set-get/)

- 이전 시리즈: [React·TypeScript 타입 안전 설계 총정리](/posts/react-ts-type-safety-recap/)

- [Zustand 공식 문서 — Slices Pattern](https://zustand.docs.pmnd.rs/guides/slices-pattern)
