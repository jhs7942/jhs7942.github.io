---
title: 'React 컴포넌트에 타입 붙이기: 기본 타입·구별된 공용체·ReactNode·ComponentPropsWithRef'
slug: react-ts-component-prop-types
description: >-
  React 컴포넌트 props에 타입을 붙이는 핵심 도구를 실습 컴포넌트와 함께 정리합니다. `: string` 같은 기본 타입 이름표와
  선택적 속성 `?`, 모순된 상태 조합을 차단하는 구별된 공용체(Discriminated Union), 렌더 가능한 모든 값을 담는
  `ReactNode`, HTML 표준 속성을 통째로 상속하는 `ComponentPropsWithRef`와 `Omit`, 그리고 이벤트·스타일
  전용 타입까지 다룹니다.
published_at: '2026-07-09T16:57:50-07:00'
labels:
  - AI 작성
  - 학습 정리
  - React
  - TypeScript
source: 사용자 학습 노트 (React+TS — 실전 타입 이름표)
legacy_url: >-
  https://saver7942.blogspot.com/2026/07/react-reactnodecomponentpropswithref.html
draft: false
---

React를 JavaScript로 작성하면 `<Welcome age="스물다섯" />`처럼 잘못된 타입을 넘겨도, 화면이 깨지고 나서야 원인을 알게 됩니다. TypeScript는 이 실수를 코드를 저장하는 순간 편집기에서 잡아냅니다. 이 글에서는 컴포넌트에 타입 "이름표"를 붙이는 도구들을 각각의 실습 컴포넌트와 함께 정리합니다. 컴포넌트 데이터 규격을 `interface`로 정의하는 기초는 [선행 글(interface·import type)](https://saver7942.blogspot.com/2026/07/typescript-interfaceimport-type-react.html)에서 다룹니다.

#### 목차

1. [기본 타입과 선택적 속성](#1)

2. [구별된 공용체로 모순 상태 차단](#2)

3. [ReactNode — 렌더 가능한 모든 것](#3-reactnode)

4. [ComponentPropsWithRef와 Omit](#4-componentpropswithref-omit)

5. [이벤트와 스타일 타입](#5)

6. [주의사항](#6)

7. [핵심 정리](#7)

---

## 📦 1. 기본 타입과 선택적 속성

TypeScript의 출발점은 변수나 속성 뒤에 콜론(`:`)을 붙여 어떤 값이 들어올지 선언하는 것입니다.

```tsx
let age: number = 25;            // 숫자만 허용
let userName: string = "리액트";  // 문자열만 허용
let isVIP: boolean = true;       // 참/거짓만 허용
```

- `string` — 문자열 데이터

- `number` — 숫자 데이터

- `boolean` — 참(`true`) 또는 거짓(`false`)

컴포넌트가 받는 props도 `interface`로 같은 이름표를 붙입니다. 속성 이름 뒤에 `?`를 붙이면 **선택적 속성(optional)**이 되어, 전달하지 않아도 오류가 나지 않습니다.

```tsx
// src/components/Welcome.tsx
interface WelcomeProps {
  name: string;     // 반드시 문자열
  age: number;      // 반드시 숫자
  isVIP?: boolean;  // '?' — 있어도 되고 없어도 됨
}

export function Welcome({ name, age, isVIP }: WelcomeProps) {
  return (
    <div style={{ border: isVIP ? '3px solid gold' : '1px solid #ddd' }}>
      <h2>{name}님, {age}살을 축하합니다! {isVIP && '👑'}</h2>
      {isVIP && <p>VIP 전용 서비스를 이용하실 수 있습니다.</p>}
    </div>
  );
}
```

- `{ name, age, isVIP }: WelcomeProps` — 구조 분해 할당과 동시에 인자 전체에 타입을 지정합니다.

- `isVIP`가 전달되지 않으면 값은 `undefined`가 되고, `isVIP && ...` 조건은 자연스럽게 거짓으로 처리됩니다.

- `age`에 문자열을 넘기면 컴파일 타임에 곧바로 오류가 표시됩니다.

<details style="margin:10px 0 4px">
<summary style="cursor:pointer;font-weight:700;color:#C8443C">age에 문자열을 넣으면?</summary>
<pre><code>&lt;Welcome name="리액트" age="스물다섯" /&gt;
//                    ~~~
// 컴파일 에러 (런타임 전):
// Type 'string' is not assignable to type 'number'. ts(2322)</code></pre>
</details>

---

## 🔍 2. 구별된 공용체로 모순 상태 차단

로딩 여부를 `isLoading: boolean`, 데이터를 `data`, 오류를 `error`로 각각 따로 두면 "로딩 중이면서 동시에 오류가 난" 모순된 조합도 타입상 허용됩니다. **구별된 공용체(Discriminated Union)**는 공통 식별 속성 하나로 이 모순을 원천 차단합니다.

```tsx
// state 값에 따라 함께 존재하는 데이터가 달라진다
type FetchStatus =
  | { state: 'loading' }                 // 로딩 중엔 데이터 없음
  | { state: 'success'; data: string }   // 성공일 때만 data 존재
  | { state: 'error'; error: Error };    // 오류일 때만 error 존재
```

`state` 속성이 세 객체를 구별하는 **식별자(discriminant)** 역할을 합니다. `if`로 `state` 값을 확인하는 순간, TypeScript는 그 블록 안에서 어떤 속성이 존재하는지 확정합니다. 이를 타입 좁히기(narrowing)라고 합니다.

```tsx
// src/components/StatusDisplay.tsx
export function StatusDisplay({ status }: { status: FetchStatus }) {
  if (status.state === 'success') {
    return <div>성공: {status.data}</div>;          // data 접근 안전
  }
  if (status.state === 'error') {
    return <div>오류: {status.error.message}</div>;  // error 접근 안전
  }
  return <div>불러오는 중…</div>;
}
```

- `status.state === 'success'`가 확인된 블록 안에서만 `status.data`에 접근할 수 있습니다.

- 로딩 분기에서 `status.data`를 쓰면 "해당 속성이 존재하지 않는다"는 컴파일 오류가 납니다. 모순된 접근이 코드 단계에서 막힙니다.

---

## 📦 3. ReactNode — 렌더 가능한 모든 것

`children`처럼 "무엇이든 담아 화면에 그리는" 자리에는 `React.ReactNode`를 씁니다. 문자열, 숫자, JSX 요소, 그리고 그 배열까지 — 리액트가 렌더할 수 있는 모든 값을 포함하는 타입입니다.

```tsx
interface LayoutProps {
  children: React.ReactNode;  // 텍스트·숫자·JSX·배열 무엇이든
}
```

`children`의 타입으로 가장 널리 쓰입니다. 레이아웃이나 래퍼(wrapper) 컴포넌트처럼 내부에 어떤 내용이 올지 미리 특정하지 않는 자리에 적합합니다.

---

## 🏗️ 4. ComponentPropsWithRef와 Omit

직접 만든 버튼이 진짜 `<button>`의 표준 속성(`onClick`, `disabled`, `type`, `ref` 등)을 전부 갖게 하려면, 그 속성들을 하나하나 다시 선언하는 대신 `ComponentPropsWithRef<'button'>`으로 통째로 상속합니다. 여기에 `Omit`을 더하면 특정 속성만 골라 교체할 수 있습니다.

```tsx
// src/components/CustomButton.tsx
// button의 표준 속성을 모두 상속하되, 기존 color만 제거하고 customColor로 대체
interface CustomButtonProps
  extends Omit<React.ComponentPropsWithRef<'button'>, 'color'> {
  customColor: 'primary' | 'secondary';
  children: React.ReactNode;
}

export function CustomButton({ customColor, children, style, ...rest }: CustomButtonProps) {
  const buttonStyle: React.CSSProperties = {
    backgroundColor: customColor === 'primary' ? '#646cff' : '#2f3640',
    color: 'white',
    ...style,   // 외부에서 넘긴 style과 합성
  };
  return <button style={buttonStyle} {...rest}>{children}</button>;
}
```

- `Omit<X, 'color'>` — 타입 `X`에서 `color` 속성만 제거한 새 타입입니다. 표준 `color`와 우리의 `customColor` 사이의 의미 충돌을 막습니다.

- `customColor: 'primary' | 'secondary'` — 두 문자열 리터럴만 허용하는 유니온 타입입니다. 오타를 컴파일 타임에 잡습니다.

- `...rest` — `customColor`, `children`, `style`을 뺀 나머지 표준 속성(`onClick` 등)을 실제 `<button>`에 그대로 전달합니다.

---

## 🛠️ 5. 이벤트와 스타일 타입

입력창의 변경 이벤트에는 전용 타입 `React.ChangeEvent<HTMLInputElement>`를 붙입니다. 이렇게 하면 `e.target.value`가 문자열임이 보장되고 자동 완성도 동작합니다. 스타일 객체에는 `React.CSSProperties`를 붙여 표기 실수를 방지합니다.

```tsx
// src/components/InputField.tsx
import { useState } from 'react';

export function InputField() {
  const [text, setText] = useState<string>("");   // 상태 타입 명시

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);   // e.target이 input임이 확정 → value 안전
  };

  const boxStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',   // 'flex-direction'로 쓰면 오류
  };

  return (
    <div style={boxStyle}>
      <input value={text} onChange={handleChange} placeholder="입력하세요" />
      <p>입력된 값: {text}</p>
    </div>
  );
}
```

- `useState<string>("")` — 제네릭으로 이 상태가 문자열만 담는다고 선언합니다.

- `React.ChangeEvent<HTMLInputElement>` — 이벤트의 `target`이 `<input>`임을 확정해 `value`를 안전하게 읽습니다.

- `React.CSSProperties` — 카멜케이스(`flexDirection`) 규칙을 강제해, `flex-direction` 같은 CSS 문자열 표기 실수를 차단합니다.

---

## ⚠️ 6. 주의사항

- **선택적 속성 `?`는 `undefined`를 포함합니다.** `isVIP?: boolean`은 실제로 `boolean | undefined` 타입입니다. 값을 쓰기 전에 존재 여부를 확인하거나 기본값을 두어야 합니다.

- **구별된 공용체는 식별 속성이 공통이어야 동작합니다.** 각 멤버가 같은 이름의 리터럴 속성(`state`)을 가져야 `if`로 좁히기가 됩니다. 식별 속성이 없으면 narrowing이 되지 않습니다.

- **의미가 겹치는 속성은 `Omit`으로 먼저 제거합니다.** 표준 `color`를 남긴 채 커스텀 `color`를 선언하면 타입 충돌이 발생합니다.

- **`ReactNode`는 넓은 타입입니다.** 반드시 하나의 JSX 요소만 받아야 하는 자리라면 `ReactElement`가 더 정확할 수 있습니다.

---

## ✅ 7. 핵심 정리

- **기본 타입 이름표** — 속성 뒤 `: string`, `: number`, `: boolean`으로 허용 값을 못박고, `?`로 선택적 속성을 표현합니다.

- **구별된 공용체** — 공통 식별 속성(`state`)으로 상태를 구분해, 논리적으로 불가능한 데이터 조합을 타입 수준에서 차단합니다.

- **ReactNode** — `children`처럼 렌더 가능한 모든 값을 받는 자리에 쓰는 넓은 타입입니다.

- **ComponentPropsWithRef + Omit** — HTML 요소의 표준 속성을 통째로 상속하고, 겹치는 속성만 제거해 커스텀 타입으로 교체합니다.

- **이벤트·스타일 타입** — `React.ChangeEvent<HTMLInputElement>`로 이벤트 대상을, `React.CSSProperties`로 스타일 객체를 안전하게 다룹니다.

| 도구 | 용도 |
| :---: | :---: |
| `: string` / `?` | 기본 타입 · 선택적 속성 |
| Discriminated Union | 모순 상태 차단 |
| `ReactNode` | 렌더 가능한 모든 값 |
| `ComponentPropsWithRef` + `Omit` | 표준 속성 상속 · 교체 |
| `ChangeEvent` / `CSSProperties` | 이벤트 · 스타일 타입 |

---

## 🔗 참고 자료

- 선행 글: [TypeScript interface·import type으로 React 컴포넌트 타입 안전하게 만들기](https://saver7942.blogspot.com/2026/07/typescript-interfaceimport-type-react.html)

- [React 공식 문서 — TypeScript 사용하기](https://react.dev/learn/typescript)

<p style="margin:24px 0 2px;padding:13px 18px;border:1.5px solid #C8443C;border-radius:14px 15px 13px 15px;background:rgba(200,68,60,0.06);text-align:center;font-size:14.5px;line-height:1.7;color:#2F3A39">📚 <b>React · TypeScript 타입 안전</b> 시리즈 &nbsp;·&nbsp; <a style="color:#C8443C;font-weight:700;text-decoration:none" href="https://saver7942.blogspot.com/2026/07/react-typescript.html">전체 목차 · 정리 보기 →</a></p>
