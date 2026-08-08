---
title: TypeScript interface·import type으로 React 컴포넌트 타입 안전하게 만들기
slug: typescript-interface-import-type-react-props
description: >-
  TypeScript에서 `interface`는 객체의 데이터 규격을 정의하는 계약입니다. `import type`은 타입 정보만 가져오며
  컴파일 시 JS에서 제거되어 번들 최적화와 순환 참조 방지에 유리합니다. React 컴포넌트 props에 interface를 적용하면 잘못된
  데이터가 주입될 때 런타임 이전 컴파일 타임에 오류를 검출할 수 있습니다.
published_at: '2026-07-08T08:27:45-07:00'
labels:
  - AI 작성
  - 학습 정리
  - React
  - TypeScript
source: >-
  C:/Users/jhs02/AppData/Local/Temp/claude/C--Users-jhs02-Desktop-blog/fe27660a-d234-405a-bb90-f7629ae1dff8/scratchpad/ts-react-material.md
legacy_url: >-
  https://saver7942.blogspot.com/2026/07/typescript-interfaceimport-type-react.html
draft: false
---

JavaScript로 작성된 React 앱에서 컴포넌트에 잘못된 타입의 데이터가 들어가면 오류가 실행 도중에야 드러납니다. TypeScript는 코드 작성 시점에 이 문제를 미리 잡아냅니다. 이 글에서는 `interface`로 데이터 규격을 정의하고, `import type`으로 타입만 가져오며, React 컴포넌트 props에 타입을 적용하는 과정을 단계별로 정리합니다.

#### 목차

1. [왜 타입을 사용하는가](#1)
2. [interface로 데이터 규격 정의](#2-interface)
3. [import type — 타입만 가져오기](#3-import-type)
4. [컴포넌트 props에 타입 적용](#4-props)
5. [데이터 주입과 타입 고정](#5)
6. [as 타입 단언](#6-as)
7. [⚠️ 주의사항](#7)
8. [✅ 핵심 정리](#8)

---

## 🔍 1. 왜 타입을 사용하는가

JavaScript 객체는 어떤 구조든 자유롭게 만들 수 있습니다. 그만큼 속성을 잘못 참조하거나, 없는 값에 접근하는 실수가 실행 중에야 드러납니다.

TypeScript는 **컴파일 타임**에 객체 구조를 검사합니다. `interface`로 "이 객체는 반드시 이 속성들을 가져야 한다"는 규격을 정의하면, 규격을 어긴 코드는 실행 전에 오류로 표시됩니다.

- 오류 발생 시점: 런타임(JS) → 컴파일 타임(TS)으로 이동
- 자동 완성 지원: 타입이 확정된 속성은 IDE가 제안 목록을 제공
- 팀 협업: 컴포넌트가 어떤 데이터를 요구하는지 코드 자체로 명시

---

## 📦 2. interface로 데이터 규격 정의

**`interface`** — 객체의 속성 이름과 타입을 선언하는 TypeScript 구문입니다. 객체 구조 정의에 주로 사용됩니다.

```typescript
// src/types/user.ts
export interface User {
  id: number;          // 사용자의 고유 번호 (정수)
  displayName: string; // 화면에 표시할 이름 (문자열)
}
```

- `export`: 다른 파일에서 `import`할 수 있도록 공개합니다.
- `id: number`: `id` 키는 반드시 숫자 타입이어야 합니다.
- `displayName: string`: 반드시 문자열이어야 합니다. 세미콜론은 속성 구분자입니다.

이 파일을 `src/types/` 디렉토리에 두면 여러 컴포넌트에서 같은 규격을 공유할 수 있습니다.

---

## 🔍 3. import type — 타입만 가져오기

**`import type`** — TypeScript 3.8에서 도입된 문법으로, 타입 정보만 가져온다고 명시하는 방식입니다.

| 구문 | JS 컴파일 결과 | 용도 |
| :---: | :---: | :---: |
| `import { User }` | 값인지 타입인지 컴파일러가 판단 | 값과 타입 혼용 |
| `import type { User }` | 컴파일 시 완전히 제거됨 | 타입 전용 |

`import type`을 사용하는 이유:

- **번들 최적화**: 타입은 JS 실행에 불필요하므로 최종 번들에서 제거됩니다.
- **순환 참조 방지**: 파일 A가 B를, B가 A를 import하는 구조에서 타입만 참조할 때 순환을 끊어 줍니다.
- **명시성**: 이 import가 런타임 동작에 영향을 주지 않음을 코드에서 직접 표현합니다.

> **참고**: `import type`으로 가져온 식별자는 타입 위치에서만 사용 가능합니다. 런타임에 실제 값으로 사용되는 것(클래스, 함수, 상수 등)은 일반 `import`를 써야 합니다.

---

## 🛠️ 4. 컴포넌트 props에 타입 적용

컴포넌트가 받는 입력값(props)을 `interface`로 정의하면, 잘못된 데이터가 주입될 때 컴파일 타임에 오류가 발생합니다.

```tsx
// src/components/UserProfile.tsx
import type { User } from '../types/user';

interface UserProfileProps {
  user: User; // User 인터페이스를 props 타입으로 재사용
}

export function UserProfile({ user }: UserProfileProps) {
  return (
    <div>
      <h3>엔지니어 프로필</h3>
      <p>성함: <strong>{user.displayName.toUpperCase()}</strong></p>
      <code>ID Tag: {user.id}</code>
    </div>
  );
}
```

- `import type { User }`: 타입 정보만 가져옵니다. 컴파일 후 JS에서는 이 줄이 사라집니다.
- `interface UserProfileProps`: 이 컴포넌트가 받는 props 구조를 정의합니다.
- `({ user }: UserProfileProps)`: 구조 분해 할당과 동시에 인자 전체에 타입을 지정합니다.
- `user.displayName.toUpperCase()`: `displayName`이 문자열임이 보장되므로 문자열 메서드를 안전하게 호출할 수 있고, IDE 자동 완성도 동작합니다.

<details style="margin:10px 0 4px">
<summary style="cursor:pointer;font-weight:700;color:#C8443C">실행 결과 보기</summary>
<pre><code>// displayName이 string이므로 toUpperCase() 정상 동작
// 렌더링 출력 예시:
엔지니어 프로필
성함: REACT WITH TYPESCRIPT
ID Tag: 1004</code></pre>
</details>

---

## 🛠️ 5. 데이터 주입과 타입 고정

`App.tsx`에서 실제 데이터를 만들고 컴포넌트에 전달합니다. 변수 선언 시 `: User`로 타입을 명시하면 객체 리터럴이 `User` 인터페이스를 충족하는지 즉시 검사합니다.

```tsx
// src/App.tsx
import { UserProfile } from './components/UserProfile';
import type { User } from './types/user';

function App() {
  const currentUser: User = {
    id: 1004,
    displayName: 'React with TypeScript'
  };

  return (
    <div>
      <UserProfile user={currentUser} />
    </div>
  );
}

export default App;
```

- `const currentUser: User`: `User` 인터페이스와 맞지 않는 객체를 할당하면 이 위치에서 컴파일 오류가 납니다.
- `<UserProfile user={currentUser} />`: `UserProfile`이 요구하는 `UserProfileProps.user` 타입과 `currentUser`의 타입이 일치하므로 정상 결합됩니다.

<details style="margin:10px 0 4px">
<summary style="cursor:pointer;font-weight:700;color:#C8443C">displayName에 숫자를 넣으면?</summary>
<pre><code>const currentUser: User = {
  id: 1004,
  displayName: 9999   // ← 숫자 할당 시도
};

// 컴파일 에러 (런타임 전):
// Type 'number' is not assignable to type 'string'.
// ts(2322)</code></pre>
</details>

---

## 🛠️ 6. as 타입 단언

**타입 단언(type assertion)** — 컴파일러가 추론한 타입을 개발자가 다른 타입으로 강제 확정하는 문법입니다. `as 타입` 형태로 씁니다.

```tsx
// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root') as HTMLElement;

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- `document.getElementById('root')`: 반환 타입은 `HTMLElement | null`입니다. 요소가 없으면 `null`이 반환됩니다.
- `as HTMLElement`: "이 요소는 반드시 존재한다"고 개발자가 확신할 때 사용합니다. 컴파일러가 `null` 가능성 경고를 표시하지 않게 됩니다.
- `ReactDOM.createRoot(rootElement)`: `createRoot`는 `null`을 받지 못하므로 단언 없이는 타입 오류가 발생합니다.

---

## ⚠️ 7. 주의사항

- **`as` 단언은 타입 검사를 생략시킵니다.** 단언한 값이 실제로 `null`이면 런타임 오류가 발생합니다. `index.html`에 `id="root"` 요소가 확실히 있을 때만 사용하십시오.

- **`import type`은 타입 전용입니다.** 런타임에 실제로 사용하는 클래스, 함수, 상수는 일반 `import`로 가져와야 합니다. `import type`으로 가져온 식별자를 값으로 사용하면 컴파일 오류가 납니다.

- **`interface` 속성 위반은 컴파일 타임에 검출됩니다.** 런타임까지 가지 않으므로 개발 중 IDE에서 바로 확인할 수 있습니다.

---

## ✅ 8. 핵심 정리

- **`interface`** 는 객체의 속성 이름과 타입을 정의하는 데이터 계약입니다. 이 규격을 어긴 코드는 컴파일 타임에 오류로 표시됩니다.

- **`import type`** 은 타입 정보만 가져오며, 컴파일 시 JS에서 완전히 제거됩니다. 번들 크기 감소와 순환 참조 방지에 유리합니다.

- **컴포넌트 props 타입 지정**: `interface`로 props 구조를 정의하고, 컴포넌트 인자에 `: 타입명`으로 적용하면 잘못된 데이터 주입을 컴파일 타임에 검출합니다.

- **변수 선언 시 타입 명시**: `const currentUser: User = {...}`처럼 선언 위치에 타입을 붙이면 객체 리터럴이 규격을 충족하는지 즉시 검사됩니다.

- **`as` 타입 단언**: 컴파일러가 `null` 가능성을 의심하는 값에 개발자가 직접 타입을 확정할 때 사용합니다. 단언은 검사를 대체하지 않으므로, 실제 값이 확실할 때만 사용해야 합니다.

| 파일 | 역할 |
| :---: | :---: |
| `src/types/user.ts` | `User` 인터페이스 정의 (데이터 규격) |
| `src/components/UserProfile.tsx` | `import type` + props 타입 적용 |
| `src/App.tsx` | 데이터 생성 및 컴포넌트 조합 |
| `src/main.tsx` | 렌더링 엔트리, `as` 타입 단언 |

<p style="margin:24px 0 2px;padding:13px 18px;border:1.5px solid #C8443C;border-radius:14px 15px 13px 15px;background:rgba(200,68,60,0.06);text-align:center;font-size:14.5px;line-height:1.7;color:#2F3A39">📚 <b>React · TypeScript 타입 안전</b> 시리즈 &nbsp;·&nbsp; <a style="color:#C8443C;font-weight:700;text-decoration:none" href="https://saver7942.blogspot.com/2026/07/react-typescript.html">전체 목차 · 정리 보기 →</a></p>
