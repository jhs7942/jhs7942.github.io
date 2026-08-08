---
title: 'React Compiler: useMemo·useCallback을 폐지하는 자동 메모이제이션'
slug: react-compiler-auto-memoization
description: >-
  "부모가 리렌더되면 자식도 무조건 리렌더"라는 규칙 때문에 우리는 `React.memo`·`useMemo`·`useCallback`이라는
  '최적화 세금'을 내 왔습니다. React Compiler는 빌드 타임 정적 분석으로 이 메모이제이션을 자동 삽입해 세금을 폐지합니다. 새
  문법은 없고 코드는 깨끗해집니다. 다만 불변성 규칙을 어기면 최적화를 포기하는(bail-out) 안전장치와, 훅이 반환하는 불안정한 참조라는
  컴파일러 경계 밖의 함정을 함께 짚습니다.
published_at: '2026-07-27T22:46:54-07:00'
labels:
  - AI 작성
  - 학습 정리
  - React
  - 성능 최적화
source: 사용자 학습 노트 (React 렌더링 최적화 — React Compiler·빌드타임 정적분석·bail-out·참조 동일성)
legacy_url: 'https://saver7942.blogspot.com/2026/07/react-compiler-usememousecallback.html'
draft: false
series: react-compiler
part: 1
---

이 글은 서버 상태([TanStack Query 시리즈](/posts/react-tanstack-query-server-state-sync/))와 별개인, React 자체의 **렌더링 최적화** 이야기입니다.

React의 기본 규칙은 단순합니다. **부모가 리렌더되면 자식도 무조건 리렌더됩니다.** 대규모 앱에서 이 규칙은 가혹해서, 개발자는 `React.memo`·`useMemo`·`useCallback`으로 끝없이 방어 코드를 써 왔습니다. 이 방어 코드가 우리가 내던 '최적화 세금'입니다. React Compiler는 이 세금을 없앱니다.

---

## 💸 1. 최적화 세금 — 우리가 내던 비용

세금은 두 형태로 부과됐습니다.

**정신적 비용** — 비즈니스 로직을 고민할 시간에 렌더링 메커니즘을 달래야 했습니다. "이 객체를 자식에 넘기면 부모 리렌더마다 새 참조로 인식돼 자식도 렌더되겠지 → `useMemo` 써야겠네 → 의존성 배열 빠뜨려서 버그났네…"의 무한 반복입니다.

**코드의 오염** — 본질 로직보다 최적화 코드가 더 눈에 띕니다.

```jsx
// ❌ 최적화 세금을 내는 코드 — memo·useCallback·의존성 배열이 로직을 덮는다
const UserItem = React.memo(({ user, onRemove }) => {
  const handleDelete = useCallback(() => {
    onRemove(user.id);
  }, [onRemove, user.id]);   // 의존성 관리의 귀찮음과 실수 가능성

  return <button onClick={handleDelete}>{user.name} 삭제</button>;
});
```

정작 하고 싶은 건 "버튼 누르면 삭제"인데, 그 주위를 `memo`·`useCallback`·의존성 배열이 감쌉니다. React Compiler(옛 코드네임 React Forget)는 이 노동을 폐지하려고 나왔습니다.

---

## 🏭 2. 어떻게 자동인가 — 빌드타임 정적분석

"개발자는 코드를 짜고, 최적화는 기계가 한다"가 어떻게 가능할까요. 두 개념입니다.

**빌드 타임** — 작성한 코드가 브라우저에서 실행(런타임)되기 전, Vite·Webpack 같은 도구가 코드를 변환하는 준비 시간입니다. 컴파일러는 이 시점에 개입합니다.

**정적 분석** — 코드를 실행해 보지 않고 **텍스트 구조(구문)만으로 데이터 흐름을 파악**합니다. 코드를 AST(추상 구문 트리)로 바꿔 분석합니다.

```
1. 입력: UserProfile 컴포넌트
2. 분석: "name이 선언되고 <div>에서 쓰인다. 중간에 name을 바꾸는 코드는 없다."
3. 판단: "name이 안 바뀌면 이 <div> 결과는 늘 같다 → 캐싱하자."
4. 출력: 캐싱 로직(if문)이 자동 삽입된 최적화 코드
```

개발자가 손으로 하던 "무엇이 언제 바뀌는가"의 추적을, 컴파일러가 빌드 타임에 대신 합니다.

---

## ⚙️ 3. 설치와 설정 — Vite와 target

컴파일러는 Babel 플러그인이고, Vite에서는 `@vitejs/plugin-react`의 babel 옵션으로 끼웁니다.

```bash
# 컴파일러 본체(개발 의존성)
npm install -D babel-plugin-react-compiler

# React 17·18 사용자만: 변환 결과를 실행할 런타임 (React 19는 내장)
npm install react-compiler-runtime
```

```tsx
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const ReactCompilerConfig = {
  target: '18',   // React 17·18이면 명시 필수. React 19는 생략(기본 최신)
};

export default defineConfig({
  plugins: [
    react({
      babel: { plugins: [['babel-plugin-react-compiler', ReactCompilerConfig]] },
    }),
  ],
});
```

- **`react-compiler-runtime`** — 컴파일러가 만든 캐싱 헬퍼(`_c`, `useMemoCache` 등)를 제공합니다. React 19에는 내장돼 있어 17·18에서만 따로 설치합니다.

- **`target`** — 어느 React 버전에 맞춰 변환할지입니다. 17·18인데 명시하지 않으면 19 기준으로 동작해 에러가 날 수 있습니다.

---

## 🧩 4. 새 문법은 없다 — 감지 규칙과 지시어

가장 큰 장점은 **배울 게 없다**는 점입니다. 컴파일러는 이름 규칙으로 대상을 판별합니다.

- **컴포넌트** — 대문자로 시작하는 함수(PascalCase): `UserProfile`, `HeaderLayout`

- **훅** — `use`로 시작하는 함수: `useTheme`, `useUserData`

이 규칙을 따르는 함수를 자동으로 최적화합니다. 반대로 **최적화를 끄고 싶을 때**는 지시어를 씁니다. 예를 들어 1초에 수십 번 데이터가 바뀌는 실시간 차트는 캐싱 비용이 더 클 수 있습니다.

```jsx
function RealTimeStockChart({ data }) {
  "use no memo";   // 이 컴포넌트는 컴파일러가 건드리지 않는다
  return <Canvas data={data} />;
}
```

`"use no memo"`는 특정 컴포넌트만 최적화에서 제외하는 탈출구입니다. 정상 동작하는데 컴파일러 최적화 후 문제가 생긴 곳을 임시로 격리할 때도 씁니다.

---

## 🔍 5. Before / After — 컴파일러가 보는 코드

같은 컴포넌트를 손 최적화와 컴파일러로 비교합니다.

```jsx
// ❌ Before — 수동 최적화
const UserProfile = React.memo(({ name, onEdit }) => {
  const displayName = useMemo(() => name.toUpperCase(), [name]);
  const handleEdit = useCallback(() => onEdit(name), [name, onEdit]);
  return <div onClick={handleEdit}>{displayName}</div>;
});
```

```jsx
// ✅ After — 컴파일러 시대. 하고 싶은 일만 적는다
function UserProfile({ name, onEdit }) {
  const displayName = name.toUpperCase();
  const handleEdit = () => onEdit(name);
  return <div onClick={handleEdit}>{displayName}</div>;
}
```

컴파일러는 이 깨끗한 코드를 빌드 타임에 아래 개념으로 변환합니다.

<details>
<summary>컴파일러가 삽입하는 캐싱(개념도)</summary>
<pre><code>function UserProfile(t0) {
  const $ = useMemoCache(2);        // 캐시 슬롯 생성
  const { name, onEdit } = t0;

  let displayName;
  if ($[0] !== name) {              // name이 바뀌었을 때만 재계산
    displayName = name.toUpperCase();
    $[0] = name; $[1] = displayName;
  } else {
    displayName = $[1];             // 아니면 캐시 재사용
  }
  // handleEdit도 동일하게 참조 캐싱
}</code></pre>
</details>

소스는 깨끗해지고(clean code), 실행은 기계적으로 최적화됩니다. 손으로 하던 `memo`·`useMemo`·`useCallback`이 전부 사라집니다.

---

## 🧊 6. Bail-out — 안전이 최우선이다

"설치만 하면 끝"은 반은 맞고 반은 틀립니다. 컴파일러는 **안전을 최우선**으로 합니다. 코드를 분석하다 "이걸 최적화하면 로직이 꼬이겠다"고 판단하면, 그 컴포넌트의 최적화를 **포기(bail-out)** 하고 기존 방식(항상 리렌더)으로 되돌립니다.

가장 흔한 트리거는 **불변성 위반(mutation)** 입니다.

```jsx
function BadComponent({ user }) {
  user.age = user.age + 1;   // props를 직접 수정 — 불변성 규칙 위반
  return <div>{user.age}</div>;
}
```

props·state는 읽기 전용이어야 합니다. 이를 어기면 데이터 흐름이 예측 불가능해져 컴파일러가 손을 뗍니다. 중요한 건, **bail-out돼도 앱이 깨지지 않는다**는 점입니다. 그 컴포넌트만 최적화 없이 원래대로 동작할 뿐입니다. 대신 성능 이득도 못 받습니다.

그래서 어디가 bail-out되는지 알아야 합니다. React Compiler의 **ESLint 룰**(현재 `eslint-plugin-react-hooks`에 통합되는 흐름)을 켜면, 불변성 위반이나 훅 규칙 위반을 에디터에서 미리 잡아 줍니다.

---

## 🎯 7. 참조 동일성 — 컴파일러 경계 밖의 함정

여기가 컴파일러 시대에도 남는 드문 함정입니다. "컴파일러를 켰는데 자식이 여전히 리렌더돼요"의 정체입니다.

먼저 컴파일러가 **해결해 주는** 것부터 정리하면, 부모 컴포넌트가 **직접 만드는** 객체·함수는 컴파일러가 자동으로 메모합니다. 그래서 `const obj = { a, b }`를 자식에 넘겨도 값이 같으면 참조가 유지됩니다. 예전에 `useMemo`로 감싸던 대부분이 자동 해결됩니다.

문제는 **훅이 내부에서 만들어 반환하는 객체**입니다. 이건 컴파일러의 분석 범위 밖(그 훅의 구현)이라, 컴파일러가 참조 안정성을 보장할 수 없습니다.

```jsx
// ❌ 훅이 반환하는 객체를 통째로 넘기기
function Parent() {
  const mutation = useMutation({ /* ... */ });
  // mutation은 렌더마다 새 참조일 수 있다 → 자식이 리렌더될 수 있다
  return <ChildComponent mutation={mutation} />;
}
```

`useMutation` 같은 라이브러리 훅의 반환 객체는 매 렌더 새로 만들어질 수 있습니다. 컴파일러는 그 객체를 부모가 만든 게 아니라 훅에서 받은 것이라, 안정성을 단정하지 못합니다. 해결은 **안정적인 알맹이만 꺼내 넘기는** 것입니다.

```jsx
// ✅ 안정적인 함수만 구조분해로 꺼내 넘기기
function Parent() {
  const { mutate } = useMutation({ /* ... */ });
  // mutate는 참조가 유지되도록(stable) 설계돼 있다 → 자식이 안 흔들린다
  return <ChildComponent onSave={mutate} />;
}
```

TanStack Query의 `mutate`처럼, 잘 설계된 라이브러리는 함수 참조를 안정적으로 유지합니다. 객체 껍데기를 벗기고 변하지 않는 알맹이만 넘기면, 컴파일러가 "props가 안 바뀌었네"라고 확신하고 최적화합니다. 컴파일러 시대의 설계는 **"자식에게 무엇을 넘기는가"** 를 더 세심히 봅니다.

---

## ✅ 8. 핵심 정리

- **React Compiler는 최적화 세금을 폐지합니다.** 빌드 타임 정적 분석으로 메모이제이션을 자동 삽입해, `React.memo`·`useMemo`·`useCallback`을 손으로 쓰지 않아도 됩니다.

- **새 문법은 없습니다.** 대문자 함수는 컴포넌트, `use`로 시작하면 훅으로 자동 판별합니다. 최적화를 끄려면 `"use no memo"`, 버전에 맞추려면 `target`을 씁니다.

- **안전을 위해 bail-out합니다.** props·state를 직접 수정하는 등 불변성을 어기면 그 컴포넌트만 최적화를 포기합니다(앱은 정상 동작). ESLint 룰로 미리 잡습니다.

- **컴파일러 경계 밖은 여전히 신경 씁니다.** 부모가 만드는 값은 자동 메모되지만, 훅이 반환하는 불안정한 객체는 예외입니다. `mutation` 전체 대신 `{ mutate }`처럼 안정적인 알맹이만 넘깁니다.

---

## 🔗 참고 자료

- 다음 편: [React Compiler 내부 해부 — 파이프라인 4단계와 Rules of React](/posts/react-compiler-pipeline-rules/)

- 관련 시리즈: [서버 상태 관리(TanStack Query) — useMutation 편](/posts/react-query-usemutation-invalidate/)

- [React 공식 문서 — React Compiler](https://react.dev/learn/react-compiler)

- [React 공식 문서 — React Compiler 설치](https://react.dev/learn/react-compiler/installation)

- [React 공식 블로그 — React Compiler](https://react.dev/blog)
