---
title: 'TypeScript가 API 응답을 지켜주지 못하는 이유: as의 함정과 런타임 검증'
slug: react-ts-runtime-validation
description: >-
  `interface`로 완벽한 타입을 정의해도, TypeScript는 컴파일 타임에만 작동하므로 서버가 실제로 보내는 데이터를 강제하지
  못합니다. 특히 `as` 타입 단언은 검사를 꺼 버려, 서버가 필드 이름을 바꾸면 잘못된 데이터가 그대로 들어와 런타임에 앱이 멈춥니다. 이
  문제의 원인과, 외부 데이터를 경계에서 검증하는 방법(타입 가드·스키마 검증)을 정리합니다.
published_at: '2026-07-09T19:05:12-07:00'
labels:
  - AI 작성
  - 학습 정리
  - React
  - TypeScript
source: '사용자 학습 노트 (React+TS — 컴파일 타임 vs 런타임, as, 런타임 검증)'
legacy_url: 'https://saver7942.blogspot.com/2026/07/typescript-api-as.html'
draft: false
series: react-ts
part: 6
---

`interface`로 데이터 타입을 아무리 정확히 정의해도, 서버가 약속과 다른 응답을 보내면 앱은 런타임에 빈 화면으로 멈출 수 있습니다. 원인은 TypeScript가 **컴파일 타임에만 존재하는 도구**이기 때문이고, `as`는 그 컴파일 타임 검사마저 꺼 버리기 때문입니다. 이 글은 왜 이런 일이 생기는지 짚고, 외부에서 들어오는 데이터를 안전하게 다루는 방법을 정리합니다. `as` 단언의 기초는 [선행 글(interface·import type)](https://saver7942.blogspot.com/2026/07/typescript-interfaceimport-type-react.html)에서 다뤘습니다.

---

## 📦 1. 데이터 계약과 컴파일 타임의 한계

프론트엔드와 백엔드는 "이런 이름과 모양의 데이터를 주고받자"고 약속합니다. 이를 데이터 계약이라 하고, 그 약속을 `interface`로 옮깁니다.

```tsx
interface ProductDetail {
  id: number;
  title: string;
  price: number; // 서버가 숫자를 보내주기로 약속
}
```

TypeScript는 이 정의를 보고 `price`를 숫자로 취급해 `toLocaleString()` 같은 숫자 메서드를 허용합니다. 하지만 이것은 **문서상의 약속**일 뿐입니다.

TypeScript는 코드를 빌드하는 컴파일 타임에만 작동하는 정적 분석 도구입니다. 브라우저에서 코드가 실제로 도는 런타임에는 TypeScript가 존재하지 않습니다. 즉, 서버가 실제로 보내는 데이터의 모양을 실행 중에 검사해 주는 장치가 아닙니다.

---

## 🎭 2. as 타입 단언 — 검사를 끄는 스위치

**`as`** 는 타입 단언(type assertion)입니다. "이 값은 이 타입이라고 내가 보증할 테니 더 묻지 말고 믿어라"라고 컴파일러에게 강요하는 문법입니다.

```tsx
const data = (await res.json()) as ProductDetail; // "이건 ProductDetail이야"
```

`as`를 쓰는 순간 TypeScript는 해당 값에 대한 검사를 포기합니다. 문제는 `res.json()`이 반환하는 값이 검증되지 않은 데이터라는 점입니다. 서버가 `price`를 `cost`로 바꿔도, `as ProductDetail`은 존재하지 않는 `price`를 "있는 숫자"인 것처럼 통과시킵니다.

`as`는 값을 실제로 바꾸거나 검사하지 않습니다. 단지 컴파일러의 눈을 가릴 뿐입니다. 검증되지 않은 외부 데이터에 `as`를 쓰면, 잘못된 데이터가 아무 저항 없이 시스템 안으로 들어옵니다.

---

## 🐛 3. API 명세가 바뀌면 무너지는 코드

서버가 `price` 대신 `amount`를 보내는 상황을 가정합니다. `as`로 검증을 건너뛰면 이 불일치가 런타임까지 그대로 살아남습니다.

```tsx
// src/components/ProductPage.tsx
import { useState, useEffect } from 'react';

interface ProductDetail {
  id: number;
  title: string;
  price: number;
}

export function ProductPage({ productId }: { productId: number }) {
  const [product, setProduct] = useState<ProductDetail | null>(null);

  useEffect(() => {
    // 서버가 price 대신 amount를 보냈다고 가정
    const response = { id: productId, title: '키보드', amount: 89000 };

    // as로 검증 없이 주입 — 실제로는 price가 없다
    setProduct(response as unknown as ProductDetail);
  }, [productId]);

  if (!product) return <div>불러오는 중…</div>;

  // product.price는 undefined → undefined.toLocaleString() 호출에서 중단
  return <p>가격: {product.price.toLocaleString()}원</p>;
}
```

`response as unknown as ProductDetail`은 `amount`만 있는 객체를 `ProductDetail`로 강제합니다. 컴파일러는 통과시키지만, 런타임에 `product.price`는 `undefined`이고 그 위에서 `toLocaleString()`을 호출하면 실행이 중단됩니다. 사용자에게는 빈 화면만 남습니다.

<details style="margin:10px 0 4px">
<summary style="cursor:pointer;font-weight:700;color:#C8443C">런타임에 실제로 뜨는 오류</summary>
<pre><code>Uncaught TypeError: Cannot read properties of undefined (reading 'toLocaleString')

// product.price 가 undefined → 숫자 메서드 호출 불가 → 렌더 중단(빈 화면)</code></pre>
</details>

---

## 🛡️ 4. 런타임 검증으로 방어하기

외부에서 들어오는 데이터는 실행 중에 실제로 검사해야 합니다. `as`가 "검사를 끄는" 것이라면, **타입 가드(type guard)**는 "실제로 검사한 뒤 타입을 좁히는" 것입니다.

```tsx
// 반환 타입 data is ProductDetail — '검사를 통과하면 이 타입'임을 알린다
function isProductDetail(data: unknown): data is ProductDetail {
  return (
    typeof data === 'object' && data !== null &&
    typeof (data as Record<string, unknown>).price === 'number' &&
    typeof (data as Record<string, unknown>).title === 'string'
  );
}

const json: unknown = await res.json();

if (!isProductDetail(json)) {
  // 계약 위반: 사용자에게 오류를 표시하거나 로깅
  return <div>상품 정보를 표시할 수 없습니다.</div>;
}

// 이 아래에서 json은 ProductDetail로 안전하게 좁혀진다
setProduct(json);
```

- `res.json()`의 결과를 `unknown`으로 받으면, 검증 없이는 그 값을 쓸 수 없게 되어 검사를 강제하는 습관이 생깁니다.

- `data is ProductDetail`는 타입 술어(type predicate)입니다. 함수가 `true`를 반환하면 TypeScript가 그 값을 `ProductDetail`로 좁혀 줍니다. `as`와 달리 **실제 값을 검사한 결과**라는 점이 다릅니다.

- 필드가 많거나 중첩이 깊으면 검사 코드가 길어집니다. 실무에서는 `zod` 같은 스키마 검증 라이브러리로 스키마 하나를 선언해 파싱·검증을 한 번에 처리하는 방식이 널리 쓰입니다.

---

## ⚠️ 5. 주의사항

- **`as`는 정말 확실할 때만 씁니다.** `document.getElementById('root') as HTMLElement`처럼 존재가 보장된 경우가 대표적입니다. 검증되지 않은 API 응답에는 쓰지 않습니다.

- **`res.json()`의 반환은 사실상 검증되지 않은 값입니다.** 기본 타입이 `any`이므로, `unknown`으로 받아 검사를 거치도록 유도하는 편이 안전합니다.

- **타입 술어(`data is T`)의 본문은 실제로 검사해야 합니다.** 검사 내용과 선언한 타입이 어긋나면, 타입 가드도 `as`만큼 위험해집니다.

- **런타임 검증은 경계에서만 합니다.** API 응답·`localStorage`·URL 파라미터처럼 외부에서 들어오는 지점에만 적용하고, 이미 검증된 내부 데이터까지 매번 검사하지는 않습니다.

---

## ✅ 6. 핵심 정리

- **컴파일 타임 vs 런타임** — TypeScript는 빌드 시점에만 작동합니다. 실행 중 서버가 보내는 데이터의 모양은 TypeScript가 강제하지 못합니다.

- **`interface`는 문서상의 약속** — 데이터 계약을 표현하지만, 런타임에 그 계약을 지키게 하는 장치는 아닙니다.

- **`as`는 검사를 끕니다** — 값을 바꾸거나 검사하지 않고 컴파일러의 눈만 가립니다. 검증 안 된 외부 데이터에 쓰면 잘못된 데이터가 그대로 들어옵니다.

- **타입 가드로 방어** — `data is T` 타입 술어로 실제 값을 검사한 뒤 타입을 좁힙니다. 필드가 많으면 `zod` 같은 스키마 검증을 씁니다.

- **경계에서 검증** — 외부 입력이 들어오는 지점에서 한 번 검증하면, 그 안쪽 코드는 타입을 신뢰할 수 있습니다.

| 도구 | 하는 일 | 런타임 보호 |
| :---: | :---: | :---: |
| `interface` | 컴파일 타임 형태 정의 | 없음 (문서상 약속) |
| `as` | 검사를 끔 | 없음 (더 위험) |
| 타입 가드 `data is T` | 실제 값 검사 후 좁힘 | 있음 |
| `zod` 등 스키마 | 선언적 런타임 검증 | 있음 |

---

## 🔗 참고 자료

- 선행 글: [TypeScript interface·import type으로 React 컴포넌트 타입 안전하게 만들기](https://saver7942.blogspot.com/2026/07/typescript-interfaceimport-type-react.html)

- [TypeScript 공식 문서 — Narrowing (타입 가드)](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)

- [Zod — 런타임 스키마 검증 라이브러리](https://zod.dev/)
