---
title: 'TypeScript 제네릭으로 재사용 컴포넌트 만들기: 제네릭 함수·extends 제약·제네릭 컴포넌트'
slug: react-ts-generics
description: >-
  제네릭은 타입을 미리 확정하지 않고 호출 시점에 주입받아, 하나의 함수·컴포넌트를 여러 타입에 재사용하게 합니다. `any`와 달리 데이터의
  타입 정보를 끝까지 추적해 자동 완성과 컴파일 검사를 유지합니다. 제네릭 함수 `wrapWithMetadata`와 `extends`로 제약을
  건 리스트 컴포넌트 `DataList`를 만들어, 하나의 컴포넌트에 User·Product 타입을 주입하는 과정을 정리합니다.
published_at: '2026-07-09T18:15:31-07:00'
labels:
  - AI 작성
  - 학습 정리
  - React
  - TypeScript
source: 사용자 학습 노트 (React+TS — 제네릭 심화)
legacy_url: 'https://saver7942.blogspot.com/2026/07/typescript-extends.html'
draft: false
series: react-ts
part: 3
---

유저 목록과 상품 목록은 담긴 데이터만 다를 뿐 "리스트를 그린다"는 구조는 똑같습니다. 타입마다 `UserList`, `ProductList`를 따로 만들면 같은 코드가 계속 늘어납니다. 그렇다고 `any`로 뭉뚱그리면 타입 안전성이 사라집니다. **제네릭(Generic)**은 이 사이에서, 구조는 하나로 두되 타입은 사용하는 쪽에서 주입받는 방법입니다. 이 글은 [선행 글(컴포넌트 타입)](https://saver7942.blogspot.com/2026/07/react-reactnodecomponentpropswithref.html)에 이어, 제네릭으로 재사용 컴포넌트를 만드는 과정을 정리합니다.

---

## 📦 1. 제네릭이란

제네릭은 코드를 작성하는 시점에 타입을 확정하지 않고, 코드가 **실제로 호출되는 시점에 타입을 주입받는** 기법입니다.

와플 메이커에 비유할 수 있습니다. 기계의 형태와 굽는 로직(코드 구조)은 고정돼 있지만, 초코 반죽을 넣으면 초코 와플이, 딸기 반죽을 넣으면 딸기 와플이 나옵니다. 맛별로 기계를 따로 사는 대신 반죽(타입)만 바꾸면 됩니다.

```tsx
// <T>는 호출 시점에 정해지는 '타입 변수'
function identity<T>(value: T): T {
  return value;
}

const a = identity<string>("리액트"); // a: string
const b = identity<number>(42);        // b: number
```

`<T>`는 함수가 호출될 때 결정될 타입에 붙인 이름표입니다. `string`을 주입하면 `T`가 `string`이 되어 반환 타입까지 `string`으로 고정됩니다.

---

## 🔍 2. any와 제네릭의 결정적 차이

"무엇이든 되는 `any`를 쓰면 되지 않느냐"는 질문이 흔하지만, 둘은 타입 추적에서 갈립니다.

- **`any` — 속이 안 보이는 봉지**: 무엇이든 담지만, 꺼낼 때 그것이 무엇인지 타입 정보가 없습니다. 자동 완성이 동작하지 않고, 잘못된 속성 접근이 런타임까지 살아남습니다.

- **제네릭 — 속이 보이는 상자**: 무엇이든 담으면서도, 넣는 순간 "이건 사과 상자"라고 타입을 끝까지 기억합니다. 꺼낼 때도 타입이 유지됩니다.

```tsx
function withAny(v: any) { return v; }
function withGeneric<T>(v: T): T { return v; }

withAny("hi").toFixed(2);      // 컴파일 통과 → 런타임 에러 (string엔 toFixed 없음)
withGeneric("hi").toFixed(2);  // 컴파일 시점에 즉시 차단 (string엔 toFixed 없음)
```

`any`는 검사를 꺼 버리고, 제네릭은 검사를 유지한 채 유연성만 얻습니다.

---

## 🛠️ 3. 제네릭 함수 만들기

어떤 데이터가 들어오든 생성 시간과 고유 ID를 붙여 돌려주는 래퍼 함수를 만듭니다. 주입된 타입 `T`를 그대로 보존하는 것이 핵심입니다.

```tsx
// src/utils/wrapWithMetadata.ts
export function wrapWithMetadata<T>(content: T) {
  return {
    data: content,                                    // 원본 타입 T를 그대로 유지
    timestamp: Date.now(),
    id: Math.random().toString(36).substring(2, 9),
  };
}
```

- `<T>`로 선언하고 인자를 `content: T`로 받으면, 반환 객체의 `data`가 주입된 타입을 그대로 유지합니다.

- 반환 타입을 직접 적지 않아도 TypeScript가 `{ data: T; timestamp: number; id: string }`으로 추론합니다.

<details style="margin:10px 0 4px">
<summary style="cursor:pointer;font-weight:700;color:#C8443C">주입한 타입이 끝까지 추적될까?</summary>
<pre><code>const wrapped = wrapWithMetadata({ name: "React" });
// wrapped.data 의 타입: { name: string }
wrapped.data.name;   // 자동 완성 동작, 안전
wrapped.data.age;    // 컴파일 에러: 'age' 속성 없음</code></pre>
</details>

---

## 🏗️ 4. extends로 제약 걸기

`<T>`만 쓰면 "무엇이든" 들어올 수 있어서, 함수 안에서 `item.id`를 꺼내려 하면 TypeScript가 막습니다. "`T`에 `id`가 있다고 누가 보장했나?"라는 것입니다. 이때 **`extends`**로 최소 조건을 겁니다.

```tsx
// ❌ T가 무엇인지 몰라 item.id 접근 불가
function badLog<T>(item: T) {
  // console.log(item.id); // 에러: T에 id가 있는지 보장 못 함
}

// ✅ 최소한 id는 있다고 약속
function goodLog<T extends { id: string }>(item: T) {
  console.log(item.id); // OK
}
```

`T extends { id: string }`은 "`T`는 무엇이든 될 수 있지만, 최소한 `{ id: string }` 모양은 갖춰야 한다"는 제약입니다. 이 제약을 리스트 컴포넌트에 적용하면, `key`로 쓸 `id`가 항상 있음을 보장할 수 있습니다.

```tsx
// src/components/DataList.tsx
import React from 'react';

interface DataListProps<T extends { id: string | number }> {
  items: T[];
  renderRow: (item: T) => React.ReactNode; // 무엇을 그릴지는 바깥에서 주입
}

export function DataList<T extends { id: string | number }>({
  items,
  renderRow,
}: DataListProps<T>) {
  return (
    <div>
      {items.map((item) => (
        <div key={item.id}>   {/* extends 덕분에 id 접근 안전 */}
          {renderRow(item)}
        </div>
      ))}
    </div>
  );
}
```

- `T extends { id: string | number }` — 어떤 타입이든 받되 `id`만은 반드시 있어야 하고, 그 타입은 `string` 또는 `number`여야 합니다.

- `renderRow: (item: T) => React.ReactNode` — 컴포넌트는 배치(layout)만 맡고, 각 행을 무엇으로 그릴지는 사용하는 쪽이 정하는 render props 패턴입니다.

---

## 📊 5. 하나의 컴포넌트, 여러 타입

같은 `DataList`에 서로 다른 타입을 주입해 봅니다. `User`는 이전 글에서 정의한 타입을 그대로 재사용하고, `Product`를 새로 정의합니다. 둘 다 `id`를 가지므로 `extends` 제약을 만족합니다.

```tsx
// src/App.tsx
import { DataList } from './components/DataList';
import type { User } from './types/user';

interface Product {
  id: string;      // extends 조건 충족
  title: string;
  price: number;
}

const users: User[] = [
  { id: 1, displayName: "Alice" },
  { id: 2, displayName: "Bob" },
];
const products: Product[] = [
  { id: "p1", title: "키보드", price: 150000 },
  { id: "p2", title: "마우스", price: 89000 },
];

export default function App() {
  return (
    <>
      <DataList<User>
        items={users}
        renderRow={(user) => <strong>{user.displayName} (ID: {user.id})</strong>}
      />
      <DataList<Product>
        items={products}
        renderRow={(product) => <span>{product.title} — {product.price.toLocaleString()}원</span>}
      />
    </>
  );
}
```

- `DataList<User>` — 주입한 타입 덕분에 `renderRow`의 `user`가 `User`로 좁혀져, `user.displayName`이 자동 완성됩니다.

- `DataList<Product>` — 같은 컴포넌트인데 `product.price` 같은 `Product` 고유 속성에 안전하게 접근합니다.

- 컴포넌트를 타입마다 새로 만들지 않고 하나로 재사용하면서, 각 사용처의 타입 안전성은 그대로 유지됩니다.

---

## ⚠️ 6. 주의사항

- **제약이 필요할 때만 `extends`를 씁니다.** 함수 내부에서 특정 속성(`id` 등)에 접근할 때만 제약이 필요합니다. 값을 그대로 전달만 한다면 `<T>`만으로 충분합니다.

- **`.tsx`에서 제네릭 화살표 함수는 모호할 수 있습니다.** `<T>(x) => ...`가 JSX 태그로 해석될 수 있어, `<T,>`처럼 쉼표를 넣거나 `function` 선언을 쓰기도 합니다.

- **`any`로 우회하지 않습니다.** 제네릭이 번거로워 보여도 `any`로 바꾸면 자동 완성과 컴파일 검사가 사라집니다. 유연성과 안전성을 동시에 원한다면 제네릭이 맞습니다.

- **타입 주입은 대개 생략 가능합니다.** `wrapWithMetadata({ name: "React" })`처럼 인자에서 타입이 추론되면 `<...>`를 명시하지 않아도 됩니다. 추론이 애매할 때만 `<User>`처럼 직접 지정합니다.

---

## ✅ 7. 핵심 정리

- **제네릭** — 타입을 미리 고정하지 않고 호출 시점에 주입받아, 하나의 함수·컴포넌트를 여러 타입에 재사용합니다.

- **any와의 차이** — `any`는 타입 검사를 끄지만, 제네릭은 검사를 유지한 채 유연성만 얻습니다. 자동 완성과 컴파일 오류 검출이 살아 있습니다.

- **제네릭 함수** — `function fn<T>(x: T)`로 선언하면 주입된 타입이 반환까지 추적됩니다.

- **extends 제약** — `<T extends { id: ... }>`로 "최소한 이 속성은 있어야 한다"를 강제해, 내부에서 그 속성에 안전하게 접근합니다.

- **제네릭 컴포넌트** — `DataList<User>`, `DataList<Product>`처럼 타입을 주입해 하나의 컴포넌트를 여러 데이터에 재사용하면서 각각의 타입 안전성을 지킵니다.

| 개념 | 역할 |
| :---: | :---: |
| `<T>` | 호출 시점에 주입되는 타입 변수 |
| `any` vs 제네릭 | 검사 끄기 vs 검사 유지 + 유연성 |
| `<T extends {...}>` | 최소 조건 제약 |
| render props | 배치는 컴포넌트, 내용은 사용처 |

---

## 🔗 참고 자료

- 선행 글: [React 컴포넌트에 타입 붙이기 (기본 타입·구별된 공용체·ReactNode)](https://saver7942.blogspot.com/2026/07/react-reactnodecomponentpropswithref.html)

- [React 공식 문서 — TypeScript 사용하기](https://react.dev/learn/typescript)
