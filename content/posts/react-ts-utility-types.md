---
title: >-
  TypeScript 유틸리티 타입으로 기존 타입 재활용:
  ComponentPropsWithoutRef·extends·Pick·Omit·Partial
slug: react-ts-utility-types
description: >-
  같은 필드를 매번 처음부터 다시 정의하는 대신, 기존 타입을 재료로 새 타입을 파생시키는 도구를 정리합니다. HTML 요소의 표준 속성
  타입을 통째로 가져오는 `ComponentPropsWithoutRef`, 기존 타입을 상속하는 `extends`, 키를
  고르거나(`Pick`) 빼는(`Omit`) 유틸리티, 모든 속성을 선택적으로 바꾸는 `Partial`을 커스텀 버튼·보안 데이터·프로필 수정
  실습으로 다룹니다.
published_at: '2026-07-09T18:45:47-07:00'
labels:
  - AI 작성
  - 학습 정리
  - React
  - TypeScript
source: 사용자 학습 노트 (React+TS — 유틸리티 타입/인터페이스 확장)
legacy_url: >-
  https://saver7942.blogspot.com/2026/07/typescript-componentpropswithoutrefexte.html
draft: false
series: react-ts
part: 5
---

같은 구조의 타입을 매번 처음부터 다시 정의하면, 원본이 바뀔 때마다 사본까지 전부 고쳐야 합니다. TypeScript는 **기존 타입을 재료로 새 타입을 파생시키는** 도구를 제공합니다. HTML 요소의 속성 타입을 통째로 가져오고, 상속으로 확장하고, 필요한 키만 고르거나 빼고, 전부 선택적으로 바꾸는 방법을 실습과 함께 정리합니다. HTML 표준 속성 상속과 `Omit`의 기초는 [선행 글(컴포넌트 타입)](/posts/react-ts-component-prop-types/)에서 다뤘고, 이 글은 그 도구 상자를 넓힙니다.

---

## 🧬 1. ComponentPropsWithoutRef — HTML 타입 추출

커스텀 컴포넌트가 진짜 HTML 요소처럼 동작하려면 `id`, `className`, `onClick`, `aria-label` 등 표준 속성을 모두 받아야 합니다. 이 속성들을 하나씩 정의하는 대신, 리액트가 태그별로 정의해 둔 타입을 통째로 가져옵니다.

```tsx
// button 태그의 모든 표준 속성 타입을 그대로 추출
type NativeButtonProps = React.ComponentPropsWithoutRef<'button'>;
// onClick, disabled, type, aria-label ... 전부 포함
```

- HTML 표준이 갱신돼도 우리 코드를 고칠 필요가 없습니다. 타입을 참조만 하기 때문입니다.

- 사용자가 `title`, `onBlur` 같은 속성을 커스텀 컴포넌트에 그대로 쓸 수 있습니다.

**`WithoutRef`와 `WithRef`의 차이** — `ref`는 DOM에 직접 접근하는 특수 prop입니다. 컴포넌트가 `ref`를 내부 요소로 전달(forward)하지 않는다면 `ComponentPropsWithoutRef`가 안전한 기본값입니다. `ref`까지 넘겨야 하는 컴포넌트라면 [04강에서 다룬](/posts/react-ts-component-prop-types/) `ComponentPropsWithRef`를 씁니다.

---

## 🏗️ 2. interface extends — 상속으로 확장

`extends`는 "A는 B를 포함한다"는 상속 관계를 만듭니다. 부모 인터페이스의 모든 속성을 자식이 물려받고, 자신만의 속성을 더합니다.

```tsx
interface Animal {
  species: string;
  age: number;
}

// Animal의 모든 속성을 물려받고 breed를 추가
interface Dog extends Animal {
  breed: string;
}
// Dog = species + age + breed
```

이 상속을 1절의 HTML 타입 추출과 결합하면, 표준 버튼 속성을 전부 물려받으면서 우리 서비스만의 속성을 더한 커스텀 버튼을 만들 수 있습니다.

```tsx
// src/components/PrimaryButton.tsx
import React from 'react';

// 표준 button 속성을 상속하고 variant·isLoading를 추가
interface PrimaryButtonProps extends React.ComponentPropsWithoutRef<'button'> {
  variant: 'solid' | 'outline';
  isLoading?: boolean;
}

export function PrimaryButton({ variant, isLoading, children, ...props }: PrimaryButtonProps) {
  return (
    <button disabled={isLoading} {...props}>
      {isLoading ? '처리 중…' : children}
    </button>
  );
}
```

- `...props` (rest) — 커스텀 속성(`variant`, `isLoading`, `children`)만 빼내고, 남은 표준 속성을 한데 모읍니다.

- `{...props}` (spread) — 모은 표준 속성을 실제 `<button>`에 펼칩니다. 덕분에 `<PrimaryButton onClick={...} />`처럼 표준 속성을 그대로 쓸 수 있습니다.

- `disabled={isLoading}` — 상속받은 표준 속성 `disabled`를 로딩 상태와 연결합니다.

---

## ✂️ 3. Pick·Omit — 고르고 빼기

하나의 큰 타입에서 상황에 맞는 부분 집합을 만들 때 씁니다. `Pick`은 필요한 키만 고르고(화이트리스트), `Omit`은 특정 키만 빼냅니다(블랙리스트).

```tsx
interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
}

type ContactInfo = Pick<User, 'name' | 'email'>; // 고른다 → { name; email }
type PublicProfile = Omit<User, 'phone'>;         // 뺀다 → { id; name; email }
```

`Omit`은 노출되면 안 되는 필드를 걸러 "안전한 타입"을 만들 때 특히 유용합니다.

```tsx
// src/components/ProductDisplay.tsx
interface Product {
  id: string;
  name: string;
  price: number;
  adminNote: string;   // 노출 금지
  secretToken: string; // 노출 금지
}

// 민감 필드를 제거한 사용자 노출용 타입
type UserViewProduct = Omit<Product, 'adminNote' | 'secretToken'>;

export function ProductDetail({ product }: { product: UserViewProduct }) {
  return (
    <div>
      <p>상품명: {product.name}</p>
      <p>판매가: {product.price.toLocaleString()}원</p>
    </div>
  );
}
```

<details>
<summary>이 컴포넌트에서 민감 필드에 접근하면?</summary>
<pre><code>// product의 타입은 UserViewProduct (adminNote·secretToken 없음)
product.secretToken;
// 컴파일 에러: 'secretToken' 속성이 'UserViewProduct'에 없음

// 보안 사고를 코드 작성 단계에서 차단</code></pre>
</details>

---

## 🧩 4. Partial — 전부 선택적으로

`Partial<T>`은 타입의 모든 속성 뒤에 `?`를 붙여 선택적으로 만듭니다. 일부 필드만 갱신하는 "patch" 상황에 씁니다.

```tsx
interface UserProfile {
  name: string;
  email: string;
  bio: string;
}

type ProfilePatch = Partial<UserProfile>;
// { name?: string; email?: string; bio?: string }
```

`title`만 바꿨다면 `{ title: '새 제목' }`만 넘겨도 "나머지 속성은 어디 갔냐"는 오류가 나지 않습니다. 상태 일부만 덮어쓰는 업데이트 함수에 잘 맞습니다.

```tsx
// src/components/ProfileEditor.tsx
import { useState } from 'react';

export function ProfileEditor() {
  const [profile, setProfile] = useState<UserProfile>({
    name: '홍길동',
    email: 'gildong@example.com',
    bio: '리액트 공부 중',
  });

  // 바뀐 필드만 받아 기존 상태 위에 덮어씀
  const handleUpdate = (changes: Partial<UserProfile>) => {
    setProfile((prev) => ({ ...prev, ...changes }));
  };

  return (
    <button onClick={() => handleUpdate({ name: 'React Expert' })}>
      닉네임만 업데이트
    </button>
  );
}
```

- `changes: Partial<UserProfile>` — `name`, `email`, `bio` 중 아무것이나, 하나만 들어와도 허용합니다.

- `{ ...prev, ...changes }` — 기존 상태를 복사한 뒤 바뀐 필드만 덮어쓰는 불변성 유지 패턴입니다. `changes`에 `name`만 있으면 `email`·`bio`는 그대로 유지됩니다.

---

## ⚠️ 5. 주의사항

- **`Pick`·`Omit`의 키는 실제 속성명이어야 합니다.** 존재하지 않는 키를 지정하면 컴파일 오류가 납니다. 오타가 걸러지는 대신, 원본 속성명이 바뀌면 함께 수정해야 합니다.

- **`Omit`은 "제외"라 원본에 새 필드가 추가되면 자동으로 포함됩니다.** 노출 필드를 명시적으로 통제하려면 화이트리스트 방식인 `Pick`이 더 안전할 수 있습니다.

- **`Partial`은 한 단계(shallow)만 적용됩니다.** 중첩 객체의 내부 속성까지 선택적으로 만들지는 않습니다. 깊은 구조에는 별도 처리가 필요합니다.

- **상속 시 같은 이름의 속성 타입이 충돌하면 오류가 납니다.** 표준 속성과 의미가 겹치는 커스텀 속성을 넣으려면 `Omit`으로 먼저 제거한 뒤 재정의합니다([04강](/posts/react-ts-component-prop-types/) 참고).

---

## ✅ 6. 핵심 정리

- **ComponentPropsWithoutRef** — HTML 요소의 표준 속성 타입을 통째로 추출합니다. `ref`를 전달하지 않는 컴포넌트의 안전한 기본값입니다.

- **extends** — 기존 인터페이스를 상속해 속성을 물려받고 확장합니다. 표준 속성 상속 + 커스텀 속성 추가에 씁니다.

- **Pick / Omit** — 원본 타입에서 필요한 키만 고르거나(`Pick`, 화이트리스트) 특정 키만 빼냅니다(`Omit`, 블랙리스트). 민감 필드 차단에 유용합니다.

- **Partial** — 모든 속성을 선택적으로 바꿔, 일부만 갱신하는 patch 패턴을 안전하게 만듭니다.

- **공통 원리** — 타입을 처음부터 다시 쓰지 말고, 기존 타입을 재료로 파생시키면 원본과의 정합성이 자동으로 유지됩니다.

| 도구 | 하는 일 |
| :---: | :---: |
| `ComponentPropsWithoutRef<'tag'>` | HTML 요소 표준 속성 추출 |
| `extends` | 기존 타입 상속·확장 |
| `Pick<T, K>` | 지정한 키만 추출 (화이트리스트) |
| `Omit<T, K>` | 지정한 키만 제외 (블랙리스트) |
| `Partial<T>` | 모든 속성을 선택적으로 |

---

## 🔗 참고 자료

- 선행 글: [React 컴포넌트에 타입 붙이기 (ComponentPropsWithRef·Omit 포함)](/posts/react-ts-component-prop-types/)

- [TypeScript 공식 문서 — Utility Types](https://www.typescriptlang.org/docs/handbook/utility-types.html)
