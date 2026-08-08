---
title: 'TypeScript로 useReducer 타입 안전하게 쓰기: State·구별된 공용체 Action·Reducer'
slug: react-ts-typed-usereducer
description: >-
  `useReducer`의 `dispatch`에 아무 객체나 넘길 수 있으면 오타난 action이나 잘못된 payload가 런타임에야
  드러납니다. State는 `interface`로, Action은 구별된 공용체(Discriminated Union)로 규격화하면,
  dispatch가 정해진 명령만 받도록 강제되고 reducer의 `switch` 안에서 payload 타입까지 자동으로 좁혀집니다. 타입
  지정 State·Action·Reducer·연산 유틸을 한 흐름으로 정리합니다.
published_at: '2026-07-09T18:30:22-07:00'
labels:
  - AI 작성
  - 학습 정리
  - React
  - TypeScript
source: 사용자 학습 노트 (React+TS — TS 마이그레이션/Reducer)
legacy_url: 'https://saver7942.blogspot.com/2026/07/typescript-usereducer-state.html'
draft: false
series: react-ts
part: 4
---

`useReducer`를 JavaScript로 쓰면 `dispatch`에 어떤 객체든 넘길 수 있습니다. `type`에 오타를 내거나 `payload`에 문자열을 넣어도 편집기는 조용하고, 문제는 실행 중에야 터집니다. 상태(State)와 명령(Action)에 타입을 입히면, dispatch가 "정의된 명령"만 받도록 강제되고 reducer 내부에서 데이터 타입까지 자동으로 맞춰집니다. 이 글은 그 과정을 end-to-end로 정리합니다. 여기서 쓰는 기초 문법은 선행 글 [interface·import type](/posts/typescript-interface-import-type-react-props/)과 [구별된 공용체](/posts/react-ts-component-prop-types/)에서 다룹니다.

---

## 🔍 1. 왜 useReducer에 타입이 필요한가

JavaScript `useReducer`에서는 `state`도 `action`도 형태가 자유롭습니다. 그래서 아래 같은 실수가 컴파일러를 그냥 통과합니다.

```js
dispatch({ type: 'UPDATE_PIRCE', payload: 65000 }); // 'PIRCE' 오타 — 조용히 무시됨
dispatch({ type: 'UPDATE_PRICE', payload: '65000' }); // 문자열 payload — 나중에 계산이 깨짐
```

이런 버그는 실행 중에야 드러납니다. State와 Action에 타입을 지정하면 두 실수 모두 **작성 시점에** 빨간 줄로 막히고, `dispatch`를 칠 때 유효한 명령이 자동 완성됩니다.

- 오류 시점: 런타임 → 컴파일 타임

- `dispatch`에 넘길 수 있는 명령이 목록으로 한정됨

- reducer 안에서 각 명령의 `payload` 타입이 자동으로 확정됨

---

## 🏗️ 2. State와 Action 규격 정의

시스템의 상태와 명령 규격부터 정의합니다. State는 `interface`(객체의 계약서), Action은 구별된 공용체로 표현합니다.

```tsx
// src/types/product.ts

// 상태의 형태 — 두 값 모두 숫자로 제한
export interface ProductState {
  productId: number;
  price: number;
}

// 내릴 수 있는 명령 목록 — 공통 필드 type이 각 명령을 구별
export type ProductAction =
  | { type: 'SET_PRODUCT'; payload: number }
  | { type: 'UPDATE_PRICE'; payload: number };
```

- `interface ProductState` — 상태는 반드시 `productId`, `price`를 숫자로 가져야 합니다.

- `type ProductAction` — 유니온(`|`)으로 두 명령만 허용합니다. 목록에 없는 명령은 dispatch 단계에서 거절됩니다.

- 공통 `type` 필드가 **식별자(discriminant)** 역할을 해서, `type`이 정해지면 그에 묶인 `payload` 타입도 함께 확정됩니다.

---

## 🛠️ 3. 타입 안전한 Reducer 작성

reducer의 매개변수와 반환값에 타입을 지정하면, "이 엔진은 상품 규격만 처리하고 결과도 상품 규격"이라는 계약이 생깁니다. `switch (action.type)`는 각 분기에서 `payload` 타입을 자동으로 좁힙니다.

```tsx
// src/store/productReducer.ts
import type { ProductState, ProductAction } from '../types/product';

export function productReducer(state: ProductState, action: ProductAction): ProductState {
  switch (action.type) {
    case 'SET_PRODUCT':
      // 이 분기에서 action.payload는 number로 확정됨
      return { ...state, productId: action.payload };

    case 'UPDATE_PRICE':
      return { ...state, price: action.payload };

    default:
      return state; // 알 수 없는 명령은 상태를 그대로 반환
  }
}
```

- `import type` — 타입 정보만 가져와 런타임 번들에서 제거됩니다.

- `(state: ProductState, action: ProductAction): ProductState` — 입력과 출력을 모두 상품 규격으로 고정합니다.

- `switch (action.type)` — `type`이 좁혀지면서 `SET_PRODUCT` 분기의 `action.payload`는 `number`임이 보장됩니다.

<details>
<summary>잘못된 명령을 dispatch하면?</summary>
<pre><code>dispatch({ type: 'UPDATE_PRICE', payload: '65000' });
// 컴파일 에러: Type 'string' is not assignable to type 'number'.

dispatch({ type: 'DELETE_PRODUCT', payload: 1 });
// 컴파일 에러: '{ type: "DELETE_PRODUCT"; ... }'는 ProductAction에 없음</code></pre>
</details>

---

## 🧮 4. 타입이 보장된 연산 유틸

State가 규격을 지키므로, 그 값을 받는 연산 함수는 타입을 신뢰하고 계산할 수 있습니다. 아래 함수는 `productId`로 추적 코드를 만드는데, `productId`가 숫자임이 보장되어 산술 연산이 의도대로 동작합니다.

```tsx
// src/utils/trackingCode.ts
import type { ProductState } from '../types/product';

export function makeTrackingCode(state: ProductState): number {
  // productId가 number이므로 덧셈이 수학 연산으로 동작한다.
  // 문자열이었다면 "101" + 100 = "101100" 같은 버그가 생길 수 있다.
  return state.productId + 100;
}
```

- `state: ProductState` — 정식 규격을 따르는 상태만 받겠다는 선언입니다.

- `state.productId + 100` — `productId`가 `number`로 확정되어, `+`가 문자열 이어붙이기가 아닌 덧셈으로 수행됩니다.

- 편집기에서 `state.`만 입력해도 `productId`, `price`가 자동 완성으로 제안됩니다.

---

## 📊 5. useReducer로 통합하고 동작 확인

`useReducer`에 타입이 지정된 reducer와 초기 상태를 넣으면, `dispatch`는 `ProductAction`에 있는 명령만 받습니다. 초기 상태도 `ProductState` 규격을 지켜야 합니다.

```tsx
// src/App.tsx
import { useReducer } from 'react';
import { productReducer } from './store/productReducer';
import { makeTrackingCode } from './utils/trackingCode';
import type { ProductState } from './types/product';

const initialState: ProductState = { productId: 101, price: 50000 };

export default function App() {
  const [state, dispatch] = useReducer(productReducer, initialState);
  const trackingCode = makeTrackingCode(state); // 101 + 100 = 201

  return (
    <div>
      <p>상품 번호: {state.productId}</p>
      <p>가격: {state.price.toLocaleString()}원</p>
      <p>추적 코드: {trackingCode}</p>

      {/* dispatch는 ProductAction 명령만 허용 */}
      <button onClick={() => dispatch({ type: 'UPDATE_PRICE', payload: 65000 })}>
        가격 업데이트
      </button>
    </div>
  );
}
```

- `useReducer(productReducer, initialState)` — reducer의 타입 덕분에 `state`는 `ProductState`, `dispatch`는 `ProductAction`만 받는 함수로 추론됩니다.

- `makeTrackingCode(state)` — `state`가 규격을 만족하므로 별도 검사 없이 안전하게 전달됩니다. 결과는 `201`.

- 버튼의 `dispatch`에 없는 명령이나 잘못된 payload를 쓰면 그 자리에서 컴파일 오류가 납니다.

---

## ⚠️ 6. 주의사항

- **`switch`에는 `default`를 두어 모든 경로가 State를 반환하게 합니다.** reducer는 항상 `ProductState`를 반환해야 하므로, 처리하지 않은 명령에서도 기존 상태를 돌려줘야 합니다.

- **구별된 공용체는 공통 리터럴 필드가 있어야 좁혀집니다.** 각 명령이 같은 이름의 `type` 필드(문자열 리터럴)를 가져야 `switch`로 구분됩니다. 이 필드가 없으면 `payload` 타입이 확정되지 않습니다.

- **`import type`은 타입 전용입니다.** 런타임에 실제로 쓰는 값(함수·상수)은 일반 `import`로 가져와야 합니다.

- **명령을 추가하면 union에 먼저 등록합니다.** `ProductAction`에 새 명령을 추가하지 않고 dispatch만 하면, 존재하지 않는 명령으로 간주되어 컴파일 오류가 납니다.

---

## ✅ 7. 핵심 정리

- **타입 지정 State** — `interface`로 상태의 필수 속성과 타입을 못박아, 규격을 어긴 초기값·갱신을 컴파일 타임에 차단합니다.

- **구별된 공용체 Action** — 공통 `type` 필드로 명령을 구분하는 유니온으로, dispatch 가능한 명령을 목록으로 한정하고 각 명령의 `payload` 타입을 함께 확정합니다.

- **타입 안전한 Reducer** — 매개변수·반환값에 타입을 지정하고 `switch (action.type)`로 좁히면, 각 분기에서 올바른 `payload`만 다루게 됩니다.

- **연산의 안전성** — State의 타입이 보장되므로 `productId + 100` 같은 산술이 문자열 버그 없이 의도대로 동작합니다.

- **useReducer 통합** — 타입이 지정된 reducer를 넣으면 `dispatch`가 유효한 명령만 받도록 강제되어, 상태 흐름이 예측 가능해집니다.

| 파일 | 역할 |
| :---: | :---: |
| `types/product.ts` | State(`interface`)·Action(구별된 공용체) 규격 |
| `store/productReducer.ts` | 타입 안전한 reducer |
| `utils/trackingCode.ts` | 타입이 보장된 연산 |
| `App.tsx` | `useReducer`로 조립·dispatch |

---

## 🔗 참고 자료

- 선행 글: [TypeScript interface·import type으로 React 컴포넌트 타입 안전하게 만들기](/posts/typescript-interface-import-type-react-props/)

- 선행 글: [React 컴포넌트에 타입 붙이기 (구별된 공용체 포함)](/posts/react-ts-component-prop-types/)

- [React 공식 문서 — useReducer](https://react.dev/reference/react/useReducer)
