---
title: 'React useRef·useId 타입 실전: 폼 입력값을 타입 가드로 검증하기'
slug: react-ts-useref-useid
description: >-
  `useRef`로 DOM 요소를 참조할 때 `.current`는 `HTMLInputElement`이거나 `null`이라, 접근 전에 null
  처리가 필요합니다. `useId`는 label과 input을 연결하는 접근성용 고유 id를 만듭니다. 여기에 타입 가드를 결합해, 폼에
  입력된 값을 검증되지 않은 외부 데이터처럼 취급하고 규격을 통과한 값만 안전하게 사용하는 컴포넌트를 만듭니다.
published_at: '2026-07-09T20:18:40-07:00'
labels:
  - AI 작성
  - 학습 정리
  - React
  - TypeScript
source: 사용자 학습 노트 (React+TS — useRef·useId·타입 가드 입력 검증)
legacy_url: 'https://saver7942.blogspot.com/2026/07/react-userefuseid.html'
draft: false
---

폼 입력값도 API 응답만큼이나 신뢰할 수 없는 외부 데이터입니다. 이 글에서는 입력창을 `useRef`로 참조하고, `useId`로 label과 연결하며, 입력값을 타입 가드로 검증해 규격에 맞는 값만 통과시키는 컴포넌트를 만듭니다. 타입 가드와 `is` 타입 술어의 원리 자체는 [선행 글(10강)](https://saver7942.blogspot.com/2026/07/typescript-is-api.html)에서 다뤘으므로, 이 글은 React 훅의 타입과 실전 적용에 집중합니다.

#### 목차

1. [useRef로 DOM 요소 타입 안전하게 참조하기](#1-useref-dom)

2. [useId로 label과 input 연결하기](#2-useid-label-input)

3. [입력값을 타입 가드로 검증하기](#3)

4. [주의사항](#4)

5. [핵심 정리](#5)

---

## 🎯 1. useRef로 DOM 요소 타입 안전하게 참조하기

`useRef`로 DOM 요소를 참조할 때는 제네릭으로 요소 타입을 지정하고 초기값을 `null`로 둡니다.

```tsx
import { useRef } from 'react';

const inputRef = useRef<HTMLInputElement>(null);
// inputRef.current 의 타입: HTMLInputElement | null
```

핵심은 `inputRef.current`의 타입이 **`HTMLInputElement`이거나 `null`**이라는 점입니다. 컴포넌트가 마운트되기 전이나 요소가 화면에서 사라진 뒤에는 `current`가 `null`입니다. 그래서 접근하기 전에 반드시 null을 처리해야 합니다.

```tsx
const value = inputRef.current?.value ?? ''; // 옵셔널 체이닝으로 null 안전 접근
inputRef.current?.focus();                    // null이면 호출을 건너뜀

if (inputRef.current) {
  inputRef.current.style.border = '2px solid blue'; // 가드 후 조작
}
```

제네릭으로 `HTMLInputElement`를 지정했기 때문에, null만 통과하면 `.value`·`.focus()`·`.style` 같은 입력 요소 고유 속성에 자동 완성과 타입 검사가 동작합니다.

---

## 🏷️ 2. useId로 label과 input 연결하기

`<label>`의 `htmlFor`와 `<input>`의 `id`를 같은 값으로 연결하면, label을 클릭했을 때 입력창에 포커스가 가고 스크린 리더가 둘을 짝지어 읽습니다. 이 id를 하드코딩하면 같은 컴포넌트를 여러 번 렌더할 때 id가 중복됩니다. **`useId`** 는 렌더마다 안정적인 고유 id를 만들어 이 문제를 해결합니다.

```tsx
import { useId } from 'react';

function NicknameField() {
  const id = useId();
  return (
    <>
      <label htmlFor={id}>닉네임</label>
      <input id={id} />
    </>
  );
}
```

- `useId`는 서버·클라이언트에서 같은 id를 생성해 하이드레이션 불일치도 피합니다.

- 접근성 연결용입니다. 리스트의 `key`처럼 데이터를 식별하는 용도가 아닙니다. `key`에는 데이터 고유값을 씁니다.

---

## 🛡️ 3. 입력값을 타입 가드로 검증하기

타입 가드는 `unknown` 데이터를 검사식에 통과시켜 타입을 좁히는 함수입니다(자세한 원리는 [10강](https://saver7942.blogspot.com/2026/07/typescript-is-api.html)). 입력값을 검증되지 않은 외부 데이터로 취급해, 규격을 통과한 값만 사용합니다.

```tsx
// src/guards/userGuard.ts
export interface UserProfile {
  id: string;
  nickname: string;
}

export function isUserProfile(data: unknown): data is UserProfile {
  if (typeof data !== 'object' || data === null) return false;

  const d = data as Record<string, unknown>;
  return (
    typeof d.id === 'string' &&
    typeof d.nickname === 'string' &&
    d.nickname.length >= 2 // 값의 규칙까지 검사: 닉네임 2자 이상
  );
}
```

`useRef`로 읽은 입력값을 `unknown`에 담고, 이 가드를 통과할 때만 상태를 갱신합니다.

```tsx
// src/components/UserSettings.tsx
import { useId, useRef, useState } from 'react';
import { isUserProfile } from '../guards/userGuard';

export function UserSettings() {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState('대기 중');

  const handleVerify = () => {
    // 입력값을 '정체불명의 외부 데이터'로 취급
    const rawData: unknown = {
      id: 'user-123',
      nickname: inputRef.current?.value ?? '',
    };

    if (isUserProfile(rawData)) {
      // 통과: rawData가 UserProfile로 좁혀져 nickname에 안전하게 접근
      setStatus(`승인됨: ${rawData.nickname}님 환영합니다.`);
    } else {
      setStatus('차단됨: 닉네임은 2자 이상 문자열이어야 합니다.');
      inputRef.current?.focus();
    }
  };

  return (
    <div>
      <label htmlFor={id}>닉네임 (2자 이상)</label>
      <input id={id} ref={inputRef} type="text" placeholder="예: 리액트" />
      <button onClick={handleVerify}>검증</button>
      <p>상태: {status}</p>
    </div>
  );
}
```

<details style="margin:10px 0 4px">
<summary style="cursor:pointer;font-weight:700;color:#C8443C">입력값에 따라 결과가?</summary>
<pre><code>입력 "리액트" → isUserProfile true  → "승인됨: 리액트님 환영합니다."
입력 "A"      → length >= 2 실패    → "차단됨: 닉네임은 2자 이상..."
               (+ inputRef.current?.focus()로 입력창에 다시 포커스)</code></pre>
</details>

- `rawData`는 `unknown`이라 가드를 통과하기 전에는 속성을 읽을 수 없습니다. `isUserProfile`을 통과한 뒤에야 `nickname`에 접근할 수 있습니다.

- `inputRef.current?.value ?? ''` — ref가 `null`일 수 있으므로 옵셔널 체이닝과 기본값으로 안전하게 값을 읽습니다.

---

## ⚠️ 4. 주의사항

- **`ref.current`는 항상 `null`일 수 있습니다.** 마운트 전·언마운트 후에는 `null`이므로, 옵셔널 체이닝(`?.`)이나 `if (ref.current)` 가드 없이 접근하면 타입 오류가 나거나 런타임에서 깨집니다.

- **`useId`는 접근성 id 전용입니다.** 리스트 렌더의 `key`로 쓰지 않습니다. `key`에는 데이터의 고유값을 씁니다.

- **ref로 값 읽기는 비제어(uncontrolled) 방식입니다.** 간단하지만, 입력마다 실시간으로 반응해야 한다면 `useState`로 관리하는 제어(controlled) 방식이 더 적합합니다. 상황에 맞게 고릅니다.

- **타입 가드는 `unknown`으로 받아야 의미가 있습니다.** `any`로 받으면 검사 없이도 속성 접근이 허용되어 방어 효과가 사라집니다. 가드 본문은 선언한 타입을 실제로 검사해야 합니다.

---

## ✅ 5. 핵심 정리

- **`useRef<HTMLInputElement>(null)`** — DOM 요소를 참조합니다. `.current`는 요소이거나 `null`이므로, 접근 전 null 처리가 필수입니다.

- **`useId`** — label과 input을 연결하는 접근성용 고유 id를 만듭니다. 서버·클라이언트에서 동일해 하이드레이션에도 안전합니다.

- **타입 가드** — 입력값을 `unknown`으로 받아 검사식을 통과시키고, 규격에 맞는 값만 타입이 좁혀져 사용됩니다.

- **경계에서 검증** — 폼 입력도 외부 데이터입니다. 상태에 반영하기 전에 가드로 한 번 걸러 냅니다.

| 도구 | 역할 | 타입 포인트 |
| :---: | :---: | :---: |
| `useRef<T>` | DOM 요소 참조 | `.current`가 요소 또는 `null` → null 처리 |
| `useId` | label·input 연결 id | 접근성용 (리스트 key 아님) |
| 타입 가드 `is` | 입력값 검증 후 좁히기 | `unknown` → 검사 → 타입 확정 |

---

## 🔗 참고 자료

- 선행 글: [TypeScript 타입 가드 (is 타입 술어·좁히기)](https://saver7942.blogspot.com/2026/07/typescript-is-api.html)

- [React 공식 문서 — useRef](https://react.dev/reference/react/useRef)

- [React 공식 문서 — useId](https://react.dev/reference/react/useId)

<p style="margin:24px 0 2px;padding:13px 18px;border:1.5px solid #C8443C;border-radius:14px 15px 13px 15px;background:rgba(200,68,60,0.06);text-align:center;font-size:14.5px;line-height:1.7;color:#2F3A39">📚 <b>React · TypeScript 타입 안전</b> 시리즈 &nbsp;·&nbsp; <a style="color:#C8443C;font-weight:700;text-decoration:none" href="https://saver7942.blogspot.com/2026/07/react-typescript.html">전체 목차 · 정리 보기 →</a></p>
