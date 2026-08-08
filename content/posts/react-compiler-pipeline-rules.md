---
title: 'React Compiler 내부 해부: 파이프라인 4단계와 Rules of React'
slug: react-compiler-pipeline-rules
description: >-
  "기계가 어떻게 내 코드의 의도를 알까"라는 의심을 확신으로 바꿉니다. React Compiler가 코드를 AST → HIR → SSA →
  최적화의 4단계로 씹어 데이터 흐름을 파악하고, `_c` 캐시와 `if`문으로 메모이제이션을 주입하는 과정을 해부합니다. 그리고 컴파일러가
  최적화를 포기(bail-out)하지 않도록 지켜야 할 Rules of React 세 가지와, TypeScript `Readonly`로 위반을
  예방하는 법, "정밀 반응성"의 정확한 메커니즘을 정리합니다.
published_at: '2026-07-27T22:56:18-07:00'
labels:
  - AI 작성
  - 학습 정리
  - React
  - 성능 최적화
source: 사용자 학습 노트 (React 렌더링 최적화 — 컴파일러 파이프라인·HIR·SSA·Rules of React·정밀 반응성)
legacy_url: 'https://saver7942.blogspot.com/2026/07/react-compiler-4-rules-of-react.html'
draft: false
series: react-compiler
part: 2
---

[이전 편](/posts/react-compiler-auto-memoization/)에서 "최적화는 기계가 한다"고 했습니다. 그러면 당연히 의심이 듭니다. **"기계가 어떻게 내 코드의 의도를 알아채지? 엉뚱하게 건드려서 버그만 만드는 거 아냐?"** 이 편은 그 블랙박스를 열어 안을 봅니다. 그리고 컴파일러가 제 실력을 내도록 우리가 지켜야 할 규칙을 정리합니다.

---

## 🔬 1. 4단계 파이프라인 — 코드를 씹는 과정

컴파일러는 여러분의 코드를 있는 그대로 읽지 않습니다. 더 똑똑하게 분석하려고 네 단계로 변환합니다.

| 단계 | 이름 | 하는 일 |
| :---: | :---: | :---: |
| 1 | 구문 분석(Parsing) | 코드를 AST(나무 구조)로 |
| 2 | HIR | 데이터 흐름을 그래프로 |
| 3 | SSA 변환 | 변수마다 고유 이름 부여 |
| 4 | 최적화 | 캐싱 코드 주입 |

- **구문 분석** — `.jsx`를 **AST(추상 구문 트리)** 로 바꿉니다. 영어 문장에서 "이건 주어, 이건 동사"로 쪼개는 단계입니다. 아직 의미는 모릅니다.

- **HIR(High-level Intermediate Representation)** — 여기가 두뇌입니다. 문법이 아니라 **데이터의 흐름**을 그래프로 그립니다. 지하철 노선도처럼, 역 사이 실제 거리는 버리고 "A가 변하면 B도 변한다"는 연결(의존성)만 남깁니다.

- **SSA(Static Single Assignment)** — 모든 변수가 **딱 한 번만** 값을 받도록 이름을 바꿉니다. `val = 1` 후 `val = 2`가 되면 헷갈리니, `val1`·`val2`로 족보를 나눠 추적합니다.

- **최적화** — 정리된 족보에서 "값이 안 변하는 구간"을 찾아 메모이제이션 코드를 주입합니다.

이 파이프라인 덕분에 컴파일러는 "무엇이 언제 바뀌는가"를 실행 없이 확정합니다.

---

## 🔓 2. 코드 해부 — _c 금고와 if 캐싱

평범한 코드가 어떻게 개조되는지 봅니다.

```tsx
// [Input] 개발자가 짠 코드
function PriceCalculator({ price, taxRate }) {
  const finalPrice = price * (1 + taxRate);
  return <div>{finalPrice}</div>;
}
```

컴파일러는 `useMemo`조차 무겁다고 보고, 더 원시적인 저수준 코드로 바꿉니다.

<details>
<summary>컴파일러가 생성하는 코드(개념)</summary>
<pre><code>import { c as _c } from "react/compiler-runtime";

function PriceCalculator(t0) {          // t0 = props
  const $ = _c(4);                      // 캐시 슬롯 4개짜리 '금고'
  const { price, taxRate } = t0;
  let finalPrice;

  // 금고의 옛 값과 지금 값이 다른가?
  if ($[0] !== price || $[1] !== taxRate) {
    finalPrice = price * (1 + taxRate);  // Cache Miss → 재계산
    $[0] = price; $[1] = taxRate; $[2] = finalPrice;   // 금고 갱신
  } else {
    finalPrice = $[2];                   // Cache Hit → 재사용
  }
  return finalPrice;
}</code></pre>
</details>

핵심은 **`useMemo`의 의존성 배열을 사람이 관리하던 것을, 컴파일러가 `if`문으로 완벽하게 통제**한다는 점입니다. `_c(4)`가 캐시 저장소를 만들고, `if ($[0] !== price ...)`가 의존성을 검사하고, 바뀌었을 때만 다시 계산합니다. 사람이 의존성 배열을 빠뜨려 생기던 버그가 원천적으로 사라집니다.

`react/compiler-runtime`에서 `_c`를 가져오는 것에 주목하세요. React 19에 내장된 경로입니다(17·18은 `react-compiler-runtime` 패키지).

---

## 📜 3. Rules of React — 컴파일러의 헌법

컴파일러는 "엉망인 코드도 고쳐 주는 마법사"가 아니라 **공항 보안 검색대**입니다. 위험한 물건(규칙 위반)이 하나라도 있으면 통과시키는 대신 **검사를 중단(bail-out)** 합니다. 억지 최적화로 앱이 깨지는 걸 막기 위해서입니다. bail-out되면 앱은 정상 동작하지만 성능 이득은 0입니다.

언제 "위험하다"고 볼까요. Rules of React를 어길 때입니다. 가장 흔한 셋입니다.

**규칙 1 — 렌더링 중에 값을 바꾸지 않는다(No Mutation)**

```tsx
function BadUserProfile({ user }: { user: User }) {
  user.age = user.age + 1;   // props를 직접 수정 → bail-out
  return <div>{user.name} ({user.age})</div>;
}
```

컴포넌트는 순수 함수여야 합니다. 입력(props)이 같으면 출력(JSX)도 같아야 하는데, 렌더링 도중 재료를 바꾸면 컴파일러가 결과를 예측할 수 없습니다.

**규칙 2 — 렌더링 중에 딴짓하지 않는다(No Side Effects)**

```jsx
let renderCount = 0;              // 컴포넌트 밖 변수
function Counter() {
  renderCount = renderCount + 1;  // 렌더 중 외부 변수 수정 → bail-out
  return <div>{renderCount}</div>;
}
```

렌더는 "화면을 그리는 계산"만 해야 합니다. 전역 변수·`localStorage`를 렌더 중 건드리면 렌더 횟수에 따라 결과가 달라져 불확실해집니다. 이런 부수 효과는 `useEffect`로 옮깁니다.

**규칙 3 — 훅은 항상 같은 순서로(Rules of Hooks)**

```jsx
function SearchBar({ isOpen }) {
  if (isOpen) {
    const [keyword, setKeyword] = useState('');  // 조건부 훅 → bail-out
  }
  return <input />;
}
```

정적 분석은 실행 전에 코드의 지도를 그립니다. 실행마다 훅 개수가 달라지면 지도를 그릴 수 없습니다. 훅은 조건문·반복문 안이 아니라 최상위에서 호출합니다.

---

## 🛡️ 4. TypeScript Readonly — 위반을 타입으로 예방

규칙 1(No Mutation)은 TypeScript로 **컴파일러가 보기 전에** 막을 수 있습니다. props를 읽기 전용으로 선언하는 것입니다.

```tsx
interface Props {
  readonly user: Readonly<User>;
}

function GoodUserProfile({ user }: Props) {
  // user.age = 20;  ← 이렇게 쓰면 TypeScript가 컴파일 에러로 차단

  // 원본을 건드리지 않고 새 객체로 복사해서 쓴다
  const updatedUser = { ...user, age: user.age + 1 };
  return <div>{updatedUser.name} ({updatedUser.age})</div>;
}
```

`Readonly<User>`로 감싸면, 실수로 `user.age = ...`를 쓰는 순간 타입 에러가 납니다. bail-out을 런타임에 발견하기 전에, 코드를 짜는 시점에 봉쇄하는 셈입니다. 불변성을 지키는 습관을 타입 시스템이 강제해 줍니다.

---

## 🔎 5. "정밀 반응성"의 정확한 정체

컴파일러가 규칙을 지킨 코드에 주는 선물을 흔히 "정밀 반응성(fine-grained reactivity)"이라 부릅니다. 여기서 오해를 하나 바로잡습니다.

```tsx
function UserCard({ user }: UserCardProps) {
  // 부모 리렌더로 user.age만 바뀌고 name·bio는 그대로인 상황
  return (
    <div>
      <h1>{user.name}</h1>   {/* 안 바뀜 → DOM 업데이트 안 함 */}
      <p>Age: {user.age}</p> {/* 바뀜 → 이 부분만 갱신 */}
      <p>{user.bio}</p>      {/* 안 바뀜 → 건너뜀 */}
    </div>
  );
}
```

결과는 "안 바뀐 부분은 DOM이 갱신되지 않는다"가 맞습니다. 하지만 **메커니즘은 "그 DOM만 핀셋으로 교체"가 아닙니다.** 정확히는 이렇습니다.

- 컴파일러가 `<h1>{user.name}</h1>`이 만드는 **React 요소(element)를 메모이즈**합니다.

- `user.name`이 안 바뀌면 그 요소 객체를 **재사용**합니다(같은 참조).

- React의 재조정(reconciliation)이 같은 참조 요소를 만나면 그 서브트리의 diff를 **건너뜁니다.**

즉 "요소 메모이제이션 + 재조정 스킵"으로 DOM 업데이트가 안 일어나는 것이지, Solid.js·Svelte 같은 **진짜 fine-grained(신호 기반으로 DOM 노드를 직접 갱신)** 와는 원리가 다릅니다. React는 여전히 가상 DOM 위에서 동작하고, 컴파일러는 그 위에서 diff 범위를 줄입니다. 결과가 비슷해 보여도 "핀셋"보다는 "diff를 똑똑하게 생략"에 가깝습니다.

---

## 🩺 6. 진단 — ESLint로 bail-out 잡기

"내 코드가 bail-out됐는지 눈으로 확인할 방법"이 있습니다. React Compiler의 **ESLint 룰**입니다(현재 `eslint-plugin-react-hooks`에 통합되는 흐름이며, 초기에는 `eslint-plugin-react-compiler`로 배포됐습니다).

이 룰은 맞춤법 검사기가 아니라 **컴파일러의 대변인**입니다. 코드를 작성하는 순간 규칙 위반에 빨간 줄을 긋고, 왜 최적화를 포기하는지 알려 줍니다.

```
React Compiler: Mutating a value which was passed as a prop is not allowed.
→ props로 받은 값을 직접 수정하지 마세요. 컴파일러가 분석을 포기합니다.
```

성공 공식은 단순합니다.

1. **TypeScript `Readonly`** 로 mutation을 타입에서 봉쇄한다.

2. **ESLint** 빨간 줄이 뜨면 "규칙을 어겼구나" 인정한다.

3. 코드를 **순수 함수**로 리팩터링한다.

4. 경고가 사라지면 컴파일러가 100% 최적화하고, React DevTools에서 컴포넌트 옆에 ✨ 배지가 뜹니다.

---

## ✅ 7. 핵심 정리

- **컴파일러는 4단계로 코드를 씹습니다.** AST(구문) → HIR(흐름) → SSA(족보) → 최적화(캐싱 주입). 이 과정으로 "무엇이 언제 바뀌는가"를 실행 없이 확정합니다.

- **`_c` 금고와 `if`문이 `useMemo`를 대체합니다.** 사람이 관리하던 의존성 배열을 컴파일러가 `if ($[0] !== ...)`로 완벽히 통제해, 의존성 실수가 사라집니다.

- **Rules of React를 어기면 bail-out합니다.** 렌더 중 mutation·부수 효과·조건부 훅이 대표적입니다. bail-out은 실패가 아니라 앱을 지키는 안전장치이고, 대신 성능 이득은 없습니다.

- **규칙이 곧 성능입니다.** `useMemo`를 잘 쓰는 기술보다 순수한 코드를 짜는 습관이 속도를 결정합니다. `Readonly` 타입과 ESLint로 위반을 예방하세요. 그리고 "정밀 반응성"은 요소 메모이제이션 + 재조정 스킵이지, Solid식 진짜 fine-grained와는 원리가 다릅니다.

---

## 🔗 참고 자료

- 다음 편: [React Compiler 규칙 실전 — 멱등성과 Local Mutation 안전지대](/posts/react-compiler-local-mutation/)

- 이전 편: [React Compiler — useMemo·useCallback을 폐지하는 자동 메모이제이션](/posts/react-compiler-auto-memoization/)

- [React 공식 문서 — Rules of React](https://react.dev/reference/rules)

- [React 공식 문서 — React Compiler](https://react.dev/learn/react-compiler)

- [React 공식 문서 — 컴포넌트를 순수하게 유지하기](https://react.dev/learn/keeping-components-pure)
