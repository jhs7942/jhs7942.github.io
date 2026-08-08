---
title: 'React Compiler 규칙 실전: 멱등성과 Local Mutation 안전지대'
slug: react-compiler-local-mutation
description: >-
  컴파일러 시대의 최적화는 '기교'가 아니라 '준법'입니다. `useMemo`에 빈 배열을 넣는 꼼수는 오히려 bail-out을 부릅니다.
  성능의 조건은 두 가지 — 같은 입력이면 같은 출력을 내는 멱등성, 그리고 남의 것(props·state·전역)을 건드리지 않는 것입니다.
  그런데 반전이 있습니다. 함수 안에서 만들고 함수 안에서 끝나는 **지역 변수는 마음껏 수정해도 안전**합니다. 이 경계(Local
  Mutation)와 대표 안티패턴을 정리합니다.
published_at: '2026-07-27T23:05:58-07:00'
labels:
  - AI 작성
  - 학습 정리
  - React
  - 성능 최적화
source: 사용자 학습 노트 (React 렌더링 최적화 — 멱등성·Local Mutation·안티패턴 Ref/전역변수)
legacy_url: 'https://saver7942.blogspot.com/2026/07/react-compiler-local-mutation.html'
draft: false
series: react-compiler
part: 3
---

[이전 편](/posts/react-compiler-pipeline-rules/)에서 Rules of React를 봤습니다. 이번엔 그 규칙을 실무 코드에 적용하며, 가장 헷갈리는 경계 하나를 확실히 합니다.

과거엔 "`useMemo`에 빈 의존성 배열(`[]`)을 넣어 렌더링을 막는" 꼼수가 통했습니다. 컴파일러 시대엔 이런 **기교가 독**입니다. 컴파일러는 여러분의 꼼수를 이해하지 못하고, 안전을 위해 최적화를 포기(bail-out)합니다. 이제 성능을 얻는 길은 하나입니다 — **멍청할 정도로 정직하게 규칙을 지키는 것.**

---

## 🔄 1. 기교에서 준법으로

패러다임이 바뀌었습니다.

| | 과거 | 컴파일러 시대 |
| :---: | :---: | :---: |
| 최적화의 정체 | 기술(technique) | 준법(compliance) |
| 성능을 얻는 법 | 영리한 `useMemo`·`memo` 배치 | 규칙을 지킨 순수한 코드 |
| 꼼수의 결과 | 성능 이득 | bail-out(최적화 포기) |

컴파일러는 **불변성**과 **순수성**에 광적으로 집착하는 기계입니다. 이 둘만 지키면 100% 최적화해 줍니다. 반대로 영리한 척하는 코드는 컴파일러의 분석을 방해해 오히려 손해입니다.

---

## 🎰 2. 멱등성 — 같은 입력, 같은 출력

컴포넌트는 **자판기**여야 합니다. 1,000원을 넣고 콜라 버튼을 누르면, 오늘이든 내일이든 비가 오든 항상 콜라가 나와야 합니다. 갑자기 사이다가 나오면 안 됩니다. React로 옮기면 **"props(입력)가 같으면 JSX(출력)도 무조건 같아야 한다"** 입니다.

이를 깨는 대표가 렌더링 중의 `new Date()`나 `Math.random()`입니다.

```jsx
// ❌ 렌더마다 결과가 달라짐 — 입력이 그대로인데 출력이 변한다
function Clock() {
  const time = new Date().toLocaleTimeString();  // 매 렌더 다른 값
  return <div>{time}</div>;
}
```

입력(props)이 안 바뀌었는데 출력이 매번 달라지니, 컴파일러는 "예측 불가능"으로 보고 최적화를 포기합니다. 해결은 변하는 값을 **밖에서 받는** 것입니다.

```jsx
// ✅ time을 props로 — 같은 time이면 항상 같은 화면(순수 함수)
function Clock({ time }: { time: string }) {
  return <div>{time}</div>;
}
```

시각·난수처럼 렌더마다 달라지는 값은 컴포넌트 밖에서 만들어(부모 또는 `useEffect`) 내려보냅니다. 그래야 컴포넌트가 자판기가 됩니다.

> 엄밀히는 "멱등성"보다 **결정성**(같은 입력이면 같은 출력)이 정확한 표현이지만, 요점은 하나입니다 — 렌더 결과가 입력에만 의존해야 한다는 것.

---

## 🏛️ 3. 남의 것 vs 내 것 — Local Mutation 안전지대

여기가 이 편의 핵심이자 가장 헷갈리는 경계입니다. "불변성을 지키라"는 말을 "변수는 절대 수정하면 안 된다"로 오해하기 쉽습니다. 그렇지 않습니다.

**금지되는 것은 "남의 것"을 수정하는 것입니다.** props·state·전역 변수는 내가 만든 게 아니라 밖에서 온 것이라, 수정하면 데이터가 오염돼 컴파일러가 bail-out합니다.

```jsx
// ❌ props 배열 원본에 push — 남의 것을 훼손
function UserList({ users }) {
  users.push({ id: 999, name: 'Admin' });   // bail-out
  return <div>{users.map((u) => u.name)}</div>;
}
```

```jsx
// ✅ 복사본을 만들어 사용 — 원본 보존
function UserList({ users }) {
  const displayUsers = [...users, { id: 999, name: 'Admin' }];
  return <div>{displayUsers.map((u) => u.name)}</div>;
}
```

**반면 "내 것"은 마음껏 수정해도 됩니다.** 함수 안에서 새로 만들어 함수 안에서 끝나는 지역 변수는, 밖으로 새어 나가지 않으므로 컴파일러가 안전하다고 판단합니다. 이걸 **Local Mutation(지역적 변경)** 이라 부릅니다.

```jsx
// ✅ 지역 변수는 반복문으로 push해도 안전
function TagList({ tags }) {
  const processedTags = [];                    // 이 함수만의 것(local)
  for (const tag of tags) {
    processedTags.push(tag.toLowerCase());     // Local Mutation — 허용
  }
  return <div>{processedTags.join(', ')}</div>;
}
```

`processedTags`는 이 함수 안에서 태어나 이 함수 안에서 죽습니다. 남이 참조하지 않으니 지지고 볶아도 결과의 순수성이 깨지지 않습니다. 컴파일러는 "이 변수는 밖으로 안 새네?"라고 판단하고 최적화를 유지합니다.

한 문장으로: **남의 것(props·state·전역)은 불변, 내 것(지역 변수)은 자유.**

---

## 🚫 4. 안티패턴 — Ref 남용과 전역 변수

[2편](/posts/react-compiler-pipeline-rules/)의 3규칙(mutation·side effect·조건부 훅)에 더해, 실무에서 자주 나오는 두 안티패턴입니다.

**렌더링 중 Ref 읽고 쓰기** — `useRef`는 렌더링과 무관한 값을 담거나 DOM을 잡을 때 씁니다. 이걸 화면을 결정하는 렌더 로직에 끼우면 안 됩니다.

```jsx
function Toggle() {
  const isEnabled = useRef(false);
  isEnabled.current = !isEnabled.current;   // ❌ 렌더 중 ref 수정
  return <div>{isEnabled.current ? 'ON' : 'OFF'}</div>;  // ❌ 렌더 중 ref로 화면 결정
}
```

ref는 바뀌어도 리렌더를 트리거하지 않습니다. 그래서 렌더 중 ref로 화면을 그리면 화면과 데이터가 따로 노는 불일치가 생깁니다. **화면에 영향을 주는 값은 `useState`** 로 둬야 React가 "다시 그려야겠구나"를 압니다.

**전역 변수 의존** — 컴포넌트 밖의 `let`·`var`를 읽거나 쓰면, 컴파일러는 그 값이 언제 바뀌는지 알 수 없습니다.

```jsx
let count = 0;                    // 리액트 밖의 야생 변수
function Counter() {
  count++;                        // ❌ 외부 변수 수정(side effect)
  return <span>{count}</span>;
}
```

이 값이 필요하면 `useState`나 `useRef`로 **리액트 안으로** 가져옵니다. 그래야 React가 변화를 추적합니다.

---

## 🩺 5. 진단과 결론 — 코딩 스타일이 성능이다

규칙을 다 외울 필요는 없습니다. React Compiler의 **ESLint 룰**이 경찰관 역할을 합니다([2편](/posts/react-compiler-pipeline-rules/) 참고). 위반에 밑줄이 그이고, 메시지가 이유를 알려 줍니다.

```
Mutating a value which was passed as a prop is not allowed.
→ props 원본을 수정하지 마세요.
Hook is called conditionally...
→ if문 안에 훅을 넣지 마세요.
```

경고가 없는 상태가 곧 최고 성능 상태입니다. 결론은 명확합니다.

> 과거의 최적화는 '테크닉'이었지만, 미래의 최적화는 '준법 정신'이다.

이상한 기교 없이 정석대로, 순수하게 코드를 짜는 개발자가 가장 빠른 앱을 만듭니다. `useMemo`를 잘 쓰는 기술이 아니라, **코딩 스타일 자체가 성능 지표**가 됐습니다.

---

## ✅ 6. 핵심 정리

- **최적화는 준법입니다.** 꼼수(빈 의존성 배열 등)는 bail-out을 부릅니다. 불변성과 순수성을 지킨 코드만 컴파일러가 최적화합니다.

- **멱등성 = 같은 입력, 같은 출력.** 렌더 중 `new Date()`·`Math.random()`은 출력을 매번 바꿔 최적화를 막습니다. 변하는 값은 밖에서 받습니다.

- **남의 것은 불변, 내 것은 자유.** props·state·전역 수정은 금지지만, 함수 안에서 만들고 끝나는 지역 변수(Local Mutation)는 마음껏 바꿔도 안전합니다. "밖으로 새는가"가 기준입니다.

- **대표 안티패턴은 Ref 남용·조건부 훅·전역 변수입니다.** 화면에 영향 주는 값은 `useState`로, 외부 상태는 리액트 안으로 가져옵니다. ESLint 경고가 없는 상태가 최고 성능입니다.

---

## 🔗 참고 자료

- 다음 편: [컴파일러 시대에도 훅이 필요한 이유 — 참조 안정성과 의도적 설계](/posts/react-compiler-why-hooks-still-matter/)

- 이전 편: [React Compiler 내부 해부 — 파이프라인 4단계와 Rules of React](/posts/react-compiler-pipeline-rules/)

- [React 공식 문서 — 컴포넌트를 순수하게 유지하기](https://react.dev/learn/keeping-components-pure)

- [React 공식 문서 — Rules of React](https://react.dev/reference/rules)

- [React 공식 문서 — ref로 값 참조하기](https://react.dev/learn/referencing-values-with-refs)
