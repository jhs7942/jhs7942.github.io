---
title: 'TypeScript 타입 가드 실전: is 타입 술어로 API 데이터 검증하고 우아하게 실패하기'
slug: react-ts-type-guard
description: >-
  `is` 타입 술어(type predicate)는 함수가 `true`를 반환할 때 인자의 타입을 좁혀 주는 특수 반환 타입입니다. 단순
  `boolean` 반환과 달리, 함수 밖에서도 데이터가 확정된 타입으로 취급됩니다. 이 술어로 타입 가드 함수를 만들어 API 응답을
  시스템에 들이기 전에 검증하고, 실패 시 화면을 멈추는 대신 안내 UI로 우아하게 전환하는 방어 컴포넌트를 정리합니다.
published_at: '2026-07-09T19:23:33-07:00'
labels:
  - AI 작성
  - 학습 정리
  - React
  - TypeScript
source: 사용자 학습 노트 (React+TS — 타입 가드·is 타입 술어·방어 컴포넌트)
legacy_url: 'https://saver7942.blogspot.com/2026/07/typescript-is-api.html'
draft: false
---

[선행 글(09강)](https://saver7942.blogspot.com/2026/07/typescript-api-as.html)에서 `as`로 검증을 건너뛴 데이터가 런타임에 앱을 멈추는 과정을 봤습니다. 그때 방어책으로 타입 가드를 짧게 소개했는데, 이 글에서는 그 핵심인 **`is` 타입 술어가 정확히 어떻게 동작하는지**와, 검증 실패를 화면 붕괴 없이 처리하는 컴포넌트까지 깊이 들여다봅니다.

#### 목차

1. [is 키워드 — boolean과 무엇이 다른가](#1-is-boolean)

2. [타입 가드로 데이터 검문](#2)

3. [검증 실패를 우아하게 처리하기](#3)

4. [주의사항](#4)

5. [핵심 정리](#5)

---

## 🔍 1. is 키워드 — boolean과 무엇이 다른가

검사 함수의 반환 타입을 그냥 `boolean`으로 두면, 함수가 `true`를 돌려줘도 함수 **밖에서는** 데이터 타입이 좁혀지지 않습니다.

```tsx
// boolean 반환 — 검사는 하지만 타입은 안 좁혀진다
function isString(v: unknown): boolean {
  return typeof v === 'string';
}

const value: unknown = 'Hello';
if (isString(value)) {
  value.toUpperCase(); // 오류: value는 여전히 unknown
}
```

반환 타입을 **`v is string`** 형태의 타입 술어(type predicate)로 지정하면 달라집니다. 함수가 `true`를 반환하는 순간, TypeScript는 "이 변수는 이제 확실히 이 타입"이라고 확정(narrowing)합니다.

```tsx
// v is string 반환 — true면 타입이 좁혀진다
function isStringGuard(v: unknown): v is string {
  return typeof v === 'string';
}

if (isStringGuard(value)) {
  value.toUpperCase(); // OK: value는 string으로 확정
}
```

`is`는 런타임 검사 결과를 타입 시스템에 연결하는 다리입니다. 실행 중에 확인한 사실을, 컴파일러가 이후 코드에서 신뢰하게 만듭니다.

---

## 🛂 2. 타입 가드로 데이터 검문

`is`를 인터페이스와 결합하면, 외부에서 들어온 정체불명의 값을 규격과 대조하는 검문 함수를 만들 수 있습니다.

```tsx
interface ProductDetail {
  id: number;
  title: string;
  price: number;
}

function validateProduct(data: unknown): data is ProductDetail {
  if (typeof data !== 'object' || data === null) return false;

  const d = data as Record<string, unknown>;
  return (
    typeof d.id === 'number' &&
    typeof d.title === 'string' &&
    typeof d.price === 'number'
  );
}
```

- `data: unknown` — 검증되지 않은 값은 `unknown`으로 받습니다. 검사를 거치기 전에는 함부로 쓸 수 없어, 검증을 강제하게 됩니다.

- 먼저 객체인지 확인한 뒤, `Record<string, unknown>`으로 좁혀 각 필드의 자료형을 `typeof`로 대조합니다.

- 모든 조건이 참이면 `data is ProductDetail`이 발동해, 이 함수를 통과한 값은 이후 코드에서 `ProductDetail`로 취급됩니다.

---

## 🛡️ 3. 검증 실패를 우아하게 처리하기

컴포넌트에서 API 데이터를 상태에 담기 **전에** 검문 함수를 통과시킵니다. 통과하지 못한 데이터는 상태에 들이지 않고, 화면을 멈추는 대신 안내 UI로 전환합니다.

```tsx
// src/components/ProductPage.tsx
import { useState, useEffect } from 'react';

export function ProductPage({ productId }: { productId: number }) {
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/products/${productId}`)
      .then((res) => res.json())
      .then((data: unknown) => {
        if (validateProduct(data)) {
          setProduct(data); // 통과: data는 ProductDetail로 확정
          setError(null);
        } else {
          setError('상품 데이터 형식이 올바르지 않습니다.');
        }
      })
      .catch(() => setError('네트워크 오류가 발생했습니다.'));
  }, [productId]);

  if (error) return <p role="alert">{error}</p>;
  if (!product) return <p>불러오는 중…</p>;

  return <p>{product.title} — {product.price.toLocaleString()}원</p>;
}
```

- `if (validateProduct(data))` — 데이터가 상태로 들어가기 전의 최전방 검문입니다. 통과한 값만 시스템 안으로 진입합니다.

- 통과 블록 안에서는 `setProduct(data)`에 타입 오류가 없습니다. `is` 술어로 `data`가 `ProductDetail`임이 확정됐기 때문입니다.

- 검증 실패 시 화면을 터뜨리는 대신 `error` 상태로 전환해 안내를 렌더링합니다. 잘못된 데이터를 빨리 걸러내고(fail fast), 사용자에게는 깨진 화면 대신 설명을 보여 주는 방식입니다.

<details style="margin:10px 0 4px">
<summary style="cursor:pointer;font-weight:700;color:#C8443C">서버가 price를 문자열로 보내면?</summary>
<pre><code>// 응답: { id: 101, title: "키보드", price: "89000" }  ← price가 문자열
// validateProduct: typeof d.price === 'number' 실패 → false 반환

// 09강처럼 크래시하지 않고, 아래가 렌더링됨:
// &lt;p role="alert"&gt;상품 데이터 형식이 올바르지 않습니다.&lt;/p&gt;</code></pre>
</details>

---

## ⚠️ 4. 주의사항

- **타입 술어의 본문은 선언한 타입을 실제로 검사해야 합니다.** `data is ProductDetail`이라 적어 놓고 일부 필드만 검사하면, 나머지는 검사 없이 통과됩니다. 이 경우 타입 가드도 `as`만큼 위험합니다.

- **중첩 객체·배열은 얕은 검사로 부족합니다.** `typeof`는 한 단계만 확인합니다. 내부 구조까지 보장하려면 필드별로 재귀적으로 검사해야 합니다.

- **필드가 많으면 손으로 짠 검사는 유지보수가 어렵습니다.** 이럴 때는 `zod` 같은 스키마 검증 라이브러리로 스키마 하나를 선언해 검증을 위임하는 편이 낫습니다.

- **검증은 경계에서 한 번만 합니다.** API 응답·`localStorage`·URL 파라미터 같은 외부 입력 지점에서 검증하면, 그 안쪽 코드는 타입을 신뢰하고 검사를 반복하지 않아도 됩니다.

---

## ✅ 5. 핵심 정리

- **`is` 타입 술어** — 함수 반환 타입을 `data is Type`으로 지정하면, `true` 반환 시 인자가 해당 타입으로 좁혀집니다. 단순 `boolean` 반환은 이 좁히기가 일어나지 않습니다.

- **타입 가드** — `is` 술어에 `typeof` 검사를 결합해, 외부 데이터가 인터페이스 규격에 맞는지 런타임에 확인하는 함수입니다.

- **방어 컴포넌트** — API 응답을 상태에 담기 전에 검문하고, 실패 시 크래시 대신 안내 UI로 전환합니다.

- **우아한 실패** — 잘못된 데이터를 빨리 걸러내고(fail fast), 사용자에게는 깨진 화면 대신 상황 설명을 제공합니다.

| 반환 타입 | 함수가 `true`일 때, 함수 밖에서 |
| :---: | :---: |
| `boolean` | 타입이 좁혀지지 않음 (그대로 `unknown`) |
| `data is T` | `T`로 좁혀짐 (narrowing) |

---

## 🔗 참고 자료

- 선행 글: [TypeScript가 API 응답을 지켜주지 못하는 이유 (as의 함정)](https://saver7942.blogspot.com/2026/07/typescript-api-as.html)

- [TypeScript 공식 문서 — Narrowing과 타입 술어](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)

- [Zod — 런타임 스키마 검증 라이브러리](https://zod.dev/)

<p style="margin:24px 0 2px;padding:13px 18px;border:1.5px solid #C8443C;border-radius:14px 15px 13px 15px;background:rgba(200,68,60,0.06);text-align:center;font-size:14.5px;line-height:1.7;color:#2F3A39">📚 <b>React · TypeScript 타입 안전</b> 시리즈 &nbsp;·&nbsp; <a style="color:#C8443C;font-weight:700;text-decoration:none" href="https://saver7942.blogspot.com/2026/07/react-typescript.html">전체 목차 · 정리 보기 →</a></p>
