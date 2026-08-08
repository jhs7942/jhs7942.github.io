---
title: 'React Error Boundary로 앱 전체 크래시 막기: 클래스 컴포넌트와 unknown 에러 좁히기'
slug: react-ts-error-boundary
description: >-
  하위 컴포넌트에서 던진 렌더 에러는 React에서 앱 전체를 언마운트시켜 화면을 백지로 만듭니다. Error Boundary는 그 에러를
  특정 구역에서 붙잡아 나머지 화면은 살리고 해당 구역만 대체 UI로 바꿉니다. 이 글은 Error Boundary를 TypeScript로
  구현하며, 왜 클래스 컴포넌트여야 하는지와 잡은 에러(`unknown`)를 `instanceof`로 안전하게 좁히는 방법을 정리합니다.
published_at: '2026-07-09T20:13:41-07:00'
labels:
  - AI 작성
  - 학습 정리
  - React
  - TypeScript
source: 사용자 학습 노트 (React+TS — Error Boundary·클래스 컴포넌트·unknown 에러)
legacy_url: 'https://saver7942.blogspot.com/2026/07/react-error-boundary-unknown.html'
draft: false
series: react-ts
part: 9
---

React에서는 하위 컴포넌트 하나가 렌더 도중 에러를 던지면, 기본적으로 앱 전체가 언마운트되어 화면이 백지가 됩니다. **Error Boundary**는 그 에러를 특정 구역에서 붙잡아, 나머지 화면은 그대로 두고 그 구역만 대체 UI로 전환합니다. 전기의 차단기가 한 회로의 이상을 그 회로에서만 끊어 내는 것과 비슷합니다. 이 글은 Error Boundary를 TypeScript로 구현하면서, 왜 클래스로 만들어야 하는지와 잡은 에러를 안전하게 다루는 법을 정리합니다.

---

## 🏗️ 1. 왜 Error Boundary는 클래스 컴포넌트인가

지금 React 개발은 대부분 훅(Hooks)을 쓰는 함수형 컴포넌트가 주도합니다. 하지만 Error Boundary만큼은 클래스 컴포넌트로 만들어야 합니다.

하위 트리의 렌더 에러를 붙잡는 API는 두 생명주기 메서드 **`getDerivedStateFromError`**와 **`componentDidCatch`** 뿐인데, 이 둘은 클래스에만 존재하고 동등한 훅이 없습니다(React 19 기준). 그래서 이 컴포넌트 하나는 함수형이 주류인 지금도 예외적으로 클래스로 작성합니다.

감쌀 대상인 `children`과 대체 UI인 `fallback`의 타입에는 `React.ReactNode`를 씁니다. `ReactNode`는 JSX·문자열·숫자·배열·`null` 등 React가 그릴 수 있는 모든 값을 포함하는 타입입니다([04강에서 정리](/posts/react-ts-component-prop-types/)).

---

## 🔍 2. unknown 에러를 instanceof로 좁히기

JavaScript는 `throw`로 무엇이든 던질 수 있습니다. `Error` 객체뿐 아니라 문자열이나 숫자도 던질 수 있어, 잡은 에러가 `Error`라는 보장이 없습니다. 그래서 TypeScript에서 잡은 에러의 타입은 `unknown`입니다.

```tsx
function getMessage(error: unknown): string {
  // error.message;  // ❌ unknown에는 message가 없을 수 있어 접근 불가

  if (error instanceof Error) {
    return error.message; // ✅ 이 블록에서 error는 Error로 좁혀진다
  }
  return '알 수 없는 오류가 발생했습니다.';
}
```

`instanceof Error`는 값이 표준 `Error` 객체인지 실행 중에 검사하고, 통과한 블록 안에서 타입을 `Error`로 좁혀 줍니다. [10강의 타입 가드](/posts/react-ts-type-guard/)와 같은 좁히기(narrowing) 원리이며, `instanceof`는 클래스 인스턴스를 확인하는 내장 타입 가드입니다.

---

## 🛠️ 3. Error Boundary 구현

`Props`와 `State`의 타입을 정의하고, 두 생명주기 메서드와 `render`를 구현합니다.

```tsx
// src/components/GlobalErrorBoundary.tsx
import React, { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode; // 감쌀 대상
  fallback: ReactNode; // 에러 시 보여줄 대체 UI
}

interface State {
  hasError: boolean;
  error: unknown; // 잡은 에러는 정체가 불확실하므로 unknown
}

export class GlobalErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  // 하위에서 에러가 나면 React가 호출 → 상태를 에러 모드로 전환
  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, error };
  }

  // 에러 상세 정보를 외부 로그 서비스에 기록할 때 사용
  componentDidCatch(error: unknown, errorInfo: ErrorInfo) {
    console.error('에러 감지:', error, errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError) {
      const message =
        this.state.error instanceof Error
          ? this.state.error.message
          : '알 수 없는 시스템 오류가 발생했습니다.';

      return (
        <div role="alert">
          <p>문제가 발생했습니다: {message}</p>
          {this.props.fallback}
        </div>
      );
    }
    return this.props.children; // 에러가 없으면 평소대로 자식을 렌더
  }
}
```

- `Component<Props, State>` — 클래스 컴포넌트에 props와 state의 타입을 각각 주입합니다.

- `getDerivedStateFromError` — 하위에서 에러가 터지면 React가 가장 먼저 호출합니다. `hasError: true`를 반환하는 순간 `render`가 대체 UI를 그립니다.

- `render` 안에서 `error instanceof Error`로 좁혀 메시지를 안전하게 꺼냅니다. 2절에서 본 그 방식입니다.

---

## 📊 4. 에러를 격리해 보기

일부러 에러를 던지는 컴포넌트를 Error Boundary로 감싸, 바깥 영역이 영향을 받지 않는지 확인합니다.

```tsx
// src/App.tsx
import { GlobalErrorBoundary } from './components/GlobalErrorBoundary';

function Bomb(): React.ReactNode {
  throw new Error('상품 데이터를 불러오지 못했습니다.');
}

export default function App() {
  return (
    <div>
      <GlobalErrorBoundary
        fallback={<button onClick={() => window.location.reload()}>다시 시도</button>}
      >
        <Bomb />
      </GlobalErrorBoundary>

      <p>이 문장은 바운더리 밖에 있어 에러의 영향을 받지 않습니다.</p>
    </div>
  );
}
```

<details>
<summary>Bomb이 터지면 화면은?</summary>
<pre><code>[바운더리 안]  "문제가 발생했습니다: 상품 데이터를 불러오지 못했습니다."
              + [다시 시도] 버튼 (fallback)

[바운더리 밖]  "이 문장은 바운더리 밖에 있어..." → 정상 렌더

// 바운더리가 없었다면: 앱 전체가 언마운트되어 화면 전체가 백지</code></pre>
</details>

`Bomb`이 에러를 던져도 앱 전체가 죽지 않고, 바운더리로 감싼 구역만 대체 UI로 바뀝니다. 바깥 문장은 그대로 렌더됩니다. 특정 기능의 장애가 서비스 전체 중단으로 번지지 않게 하는 격리 방식입니다.

---

## ⚠️ 5. 주의사항

- **Error Boundary는 렌더·생명주기 에러만 잡습니다.** 이벤트 핸들러, 비동기 코드(`setTimeout`·`fetch().then`), 서버 사이드 렌더링에서 발생한 에러는 잡지 못합니다. 그런 경우는 `try/catch`로 직접 처리합니다.

- **큰 바운더리 하나보다 작은 바운더리 여럿이 낫습니다.** 위험 구역마다 바운더리를 두면, 한 구역이 실패해도 나머지 UI는 계속 동작합니다.

- **잡은 에러는 `unknown`으로 두고 좁혀 씁니다.** `error.message`에 바로 접근하지 말고 `instanceof Error`로 확인한 뒤 사용합니다.

- **실무에서는 `react-error-boundary` 라이브러리를 쓰기도 합니다.** 내부는 클래스지만 함수형처럼 선언적으로 쓸 수 있고, 재시도(reset)·`onError` 콜백 같은 편의를 제공합니다.

---

## ✅ 6. 핵심 정리

- **클래스 컴포넌트** — Error Boundary의 핵심 메서드(`getDerivedStateFromError`·`componentDidCatch`)는 클래스에만 있어, 이 컴포넌트만은 클래스로 만듭니다.

- **`getDerivedStateFromError`** — 하위 에러 발생 시 상태를 에러 모드로 전환해 대체 UI 렌더를 유발합니다. **`componentDidCatch`** 는 에러를 로깅하는 데 씁니다.

- **`unknown` + `instanceof`** — 잡은 에러는 `unknown`입니다. `instanceof Error`로 좁힌 뒤에야 `message`에 안전하게 접근합니다.

- **`ReactNode`** — `children`·`fallback`의 타입으로, React가 그릴 수 있는 모든 값을 받습니다.

- **격리** — 위험 구역을 바운더리로 감싸면, 그 구역의 에러가 앱 전체로 번지지 않습니다.

| 요소 | 역할 |
| :---: | :---: |
| `getDerivedStateFromError` | 에러 발생 → 상태를 에러 모드로 (대체 UI 렌더) |
| `componentDidCatch` | 에러 로깅 (외부 서비스 기록) |
| `error: unknown` + `instanceof` | 잡은 에러를 좁혀 안전하게 메시지 추출 |
| `children` / `fallback: ReactNode` | 감쌀 대상 / 대체 UI |

---

## 🔗 참고 자료

- 선행 글: [React 컴포넌트에 타입 붙이기 (ReactNode 포함)](/posts/react-ts-component-prop-types/)

- 선행 글: [TypeScript 타입 가드 (is 타입 술어·좁히기)](/posts/react-ts-type-guard/)

- [React 공식 문서 — Error Boundary (Component.getDerivedStateFromError)](https://react.dev/reference/react/Component#static-getderivedstatefromerror)
