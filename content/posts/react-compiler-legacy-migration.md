---
title: 'React Compiler 마이그레이션: 레거시 라이브러리와 공존하는 3가지 전략'
slug: react-compiler-legacy-migration
description: >-
  컴파일러를 켠다고 node_modules의 수천 개 라이브러리가 갑자기 최적화되진 않습니다. 오히려 렌더 중 DOM을 조작하는 구형
  라이브러리와 충돌해 드래그가 튕기거나 차트가 깜빡일 수 있습니다. 문제 컴포넌트를 `"use no memo"`로 격리하고, `sources`
  설정으로 레거시 폴더를 통째로 제외하고, Wrapper 패턴으로 안전하게 연결하는 세 전략과, 범인을 찾는 디버깅 프로토콜을 정리합니다.
published_at: '2026-07-28T00:02:07-07:00'
labels:
  - AI 작성
  - 학습 정리
  - React
  - 성능 최적화
source: 사용자 학습 노트 (React 렌더링 최적화 — 컴파일러 마이그레이션·use no memo·sources 설정·Wrapper 패턴)
legacy_url: 'https://saver7942.blogspot.com/2026/07/react-compiler-3.html'
draft: false
series: react-compiler
part: 5
---

[이전 편](/posts/react-compiler-why-hooks-still-matter/)까지 컴파일러가 무엇을 하고 무엇을 남기는지 봤습니다. 이번엔 실무의 현실 — **레거시와 공존**입니다.

컴파일러를 설치해도 `node_modules`의 수천 개 라이브러리가 갑자기 최적화되진 않습니다. 오히려 예전 방식(렌더 중 ref 조작, mutation)에 의존하는 구형 라이브러리와 **충돌**할 수 있습니다. 규칙을 잘 지키는 최신 라이브러리는 컴파일러와 잘 맞지만, 구형 드래그앤드롭·차트·jQuery 의존 플러그인은 내부에서 리액트 규칙을 어깁니다. 이 둘이 섞인 프로젝트에 컴파일러를 켜면 드래그가 튕기거나 화면이 멈출 수 있습니다. 이 지뢰밭을 건너는 세 전략입니다.

---

## 🌪️ 1. 혼돈의 공존 — 모두가 컴파일러를 지원하진 않는다

라이브러리는 두 부류로 나뉩니다.

| | 최신 라이브러리 | 구형 라이브러리 |
| :---: | :---: | :---: |
| 특징 | Rules of React를 지킴 | 렌더 중 ref 조작·mutation |
| 컴파일러와 | 잘 맞음 | 충돌 가능 |
| 증상 | 정상 | 드래그 튕김·차트 깜빡임·멈춤 |

핵심 원칙은 하나입니다. **컴파일러가 이해하지 못하는 코드는 억지로 최적화하지 말고 존중하며 격리한다.** "무조건 100% 최적화"를 고집하지 않는 유연함이, 레거시가 섞인 실무에서는 오히려 강함입니다.

---

## 🚧 2. 전략 1 — "use no memo"로 격리

가장 쉽고 확실한 방법입니다. 컴파일러가 해석하기 위험하거나 내부를 알 수 없는 블랙박스 컴포넌트를, 최적화 대상에서 아예 뺍니다. `"use no memo"` 지시어가 "이 컴포넌트는 옛날(React 18) 방식대로 두라"고 명령합니다.

구형 드래그앤드롭 라이브러리는 종종 렌더링 도중 DOM ref를 직접 수정합니다. 컴파일러는 이를 "렌더 중 mutation"으로 보고 bail-out하거나, 반대로 "값이 안 바뀌었으니 렌더를 건너뛰자"고 판단해, 드래그한 아이템이 제자리로 튕기는 버그를 냅니다.

```jsx
import { Draggable } from 'legacy-dnd-library';

function DraggableItem({ item }) {
  "use no memo";   // 컴파일러야, 이 컴포넌트는 물러서 줘

  // 아래는 순수 React 18 런타임 방식 그대로 — 라이브러리의 '더러운' 로직이 안 깨진다
  return (
    <Draggable id={item.id}>
      {(provided) => (
        <div ref={provided.innerRef} {...provided.draggableProps}>
          {item.content}
        </div>
      )}
    </Draggable>
  );
}
```

문제가 되는 그 컴포넌트만 콕 집어 격리하므로, 나머지 앱은 최적화를 그대로 누립니다.

---

## 🛡️ 3. 전략 2 — sources 설정으로 광역 제외

`src/legacy/` 폴더가 통째로 있거나 특정 파일군을 제외하고 싶을 때, 파일마다 `"use no memo"`를 붙이긴 번거롭습니다. 컴파일러 설정의 `sources` 옵션으로 **경로 기반 광역 방어막**을 칩니다.

```js
// vite.config.js / babel.config.js
const ReactCompilerConfig = {
  target: '18',
  sources: (filename) => {
    // node_modules는 기본 제외지만 명시적으로 한 번 더
    if (filename.includes('node_modules')) return false;

    // 리팩터링하기 무서운 레거시 폴더 통째로 제외
    if (filename.includes('src/legacy/')) return false;

    // 특정 패턴(예: 클래스 컴포넌트 호환 파일) 제외
    if (filename.includes('.class.jsx')) return false;

    return true;   // 나머지는 최적화
  },
};
```

**점진적 도입이 핵심입니다.** 마이그레이션 초기에는 `sources`를 아주 좁게(예: `src/components/ui`만) 열어 두고, 문제가 없음을 확인하며 점차 범위를 넓힙니다. 처음부터 전체에 켜서 어디가 깨지는지 헤매는 것보다, 안전 구역을 조금씩 확장하는 편이 사고를 줄입니다.

---

## 🥪 4. 전략 3 — Wrapper 패턴으로 안전하게 연결

구형 라이브러리를 격리는 하되 부모의 최적화는 살리고 싶을 때, **샌드위치 구조**로 감쌉니다. 리렌더에 민감한 외부 차트(props가 바뀔 때마다 캔버스를 다시 그리는)를 예로 봅니다.

```jsx
// Layer 1: 부모 — 컴파일러 최적화 구역
function Dashboard() {
  const data = [10, 20, 30, 40];
  const config = { color: 'red' };

  // Layer 2: 연결 다리 — 외부 라이브러리 경계라 참조를 명시적으로 고정
  const safeData = useMemo(() => data, []);
  const safeConfig = useMemo(() => config, []);

  return <SafeChartWrapper data={safeData} config={safeConfig} />;
}

// Layer 3: 자식 — 라이브러리 격리 구역
function SafeChartWrapper({ data, config }) {
  "use no memo";
  return <OldChartLibrary data={data} options={config} />;
}
```

세 층의 역할이 다릅니다.

- **부모(Dashboard)** — 비즈니스 로직은 컴파일러가 자동 최적화합니다.

- **다리(useMemo)** — 데이터가 넘어가는 경계를 수동으로 고정합니다. [4편](/posts/react-compiler-why-hooks-still-matter/)에서 본 "리액트 밖 라이브러리와의 민감한 interop" 자리입니다. 컴파일러는 개발자가 명시한 `useMemo`를 무시하지 않고 "건드리지 말라"는 신호로 존중합니다.

- **래퍼(SafeChartWrapper)** — 구형 라이브러리는 `"use no memo"` 안에서만 놉니다.

컴파일러 + 수동 + 레거시가 각자 제 구역에서 공존하는 하이브리드 구조입니다.

---

## 🔍 5. 디버깅 — 범인 색출 프로토콜

컴파일러 적용 후 앱이 이상해졌다면, 3단계로 범인을 찾습니다.

1. **격리로 확인** — 의심되는 컴포넌트 최상단에 `"use no memo"`를 붙여 봅니다. 버그가 사라지면 그 컴포넌트가 범인입니다 — 어딘가에서 리액트 규칙을 어기고 있는 것입니다.

2. **ESLint로 심문** — React Compiler ESLint 룰을 켜고 빨간 줄을 봅니다. 대개 mutation(값 수정)이나 훅 규칙 위반입니다. "아, 여기서 props를 수정했구나."

3. **DevTools로 검증** — React DevTools에서 컴포넌트 이름 옆에 ✨ 배지가 없으면 최적화가 안 된(bail-out) 것입니다. 왜 안 됐는지는 DevTools 설정에서 이유를 확인할 수 있습니다.

`"use no memo"`는 임시 격리이자 진단 도구입니다. 범인을 찾았으면, 급하지 않다면 규칙을 지키도록 고쳐 최적화를 되찾고, 고치기 어려운 레거시라면 격리한 채로 둡니다.

---

## ✅ 6. 핵심 정리

- **모든 라이브러리가 컴파일러를 지원하진 않습니다.** 렌더 중 ref·mutation에 의존하는 구형 라이브러리는 충돌할 수 있어, 공존 전략이 필수입니다.

- **전략 1: `"use no memo"`로 문제 컴포넌트를 격리합니다.** 그 컴포넌트만 옛 방식으로 두고 나머지는 최적화를 누립니다.

- **전략 2: `sources` 설정으로 레거시 폴더·파일군을 광역 제외합니다.** 좁게 시작해 넓히는 점진적 도입이 안전합니다.

- **전략 3: Wrapper 패턴으로 연결합니다.** 부모(컴파일러) → `useMemo`(수동 다리) → `"use no memo"`(격리 래퍼)의 3단 구조입니다. 그리고 이상 증상은 격리 → ESLint → DevTools 순으로 범인을 찾습니다.

---

## 🔗 참고 자료

- 이전 편: [컴파일러 시대에도 훅이 필요한 이유 — 참조 안정성과 의도적 설계](/posts/react-compiler-why-hooks-still-matter/)

- [React 공식 문서 — React Compiler 도입하기](https://react.dev/learn/react-compiler/incremental-adoption)

- [React 공식 문서 — React Compiler 설정](https://react.dev/reference/react-compiler/configuration)

- [React 공식 문서 — React Compiler](https://react.dev/learn/react-compiler)
