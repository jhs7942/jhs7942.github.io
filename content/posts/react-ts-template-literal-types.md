---
title: 'TypeScript 템플릿 리터럴 타입으로 디자인 토큰 만들기: 유니온 조합 자동 생성'
slug: react-ts-template-literal-types
description: >-
  템플릿 리터럴 타입은 문자열 조합 문법(`${A}-${B}`)을 타입 시스템으로 옮긴 기능입니다. 유니온 타입 두 개를 결합하면 가능한 모든
  조합을 문자열 리터럴 타입으로 자동 생성합니다. `Color`(3종)와 `Level`(5종)을 조합해 15개의 디자인 토큰을 만들고, 이를
  컴포넌트 prop 타입으로 강제해 정의되지 않은 토큰을 편집기에서 차단하는 과정을 정리합니다.
published_at: '2026-07-09T19:38:28-07:00'
labels:
  - AI 작성
  - 학습 정리
  - React
  - TypeScript
source: 사용자 학습 노트 (React+TS — type 별칭·템플릿 리터럴 타입·디자인 토큰)
legacy_url: 'https://saver7942.blogspot.com/2026/07/typescript.html'
draft: false
series: react-ts
part: 8
---

버튼 클래스를 `btn-primary-100`, `btn-secondary-300`처럼 문자열로 조립하다 보면, `btn-primry-100` 같은 오타가 런타임까지 조용히 흘러갑니다. 템플릿 리터럴 타입은 허용되는 조합을 타입 수준에서 못박아, 정의되지 않은 토큰을 코드 작성 시점에 막습니다. 이 글에서는 유니온 타입을 조합해 디자인 토큰 타입을 자동 생성하고, 이를 컴포넌트에 강제하는 방법을 정리합니다.

---

## 📦 1. type 별칭과 유니온

**`type`** 은 복잡한 타입에 이름을 붙이는 타입 별칭(type alias)입니다. **유니온(`|`)** 은 "여러 값 중 하나"로 범위를 좁힙니다.

```tsx
type BrandColor = 'primary' | 'secondary'; // 두 문자열 중 하나만 허용
```

`BrandColor`라고 적힌 자리에는 `'primary'` 또는 `'secondary'`만 들어올 수 있습니다. 사전에서 단어의 뜻을 정의하듯, 프로젝트에서 쓸 값의 범위를 규정하는 역할입니다. 이 유니온이 다음 절에서 조합의 재료가 됩니다.

---

## 🧩 2. 템플릿 리터럴 타입

자바스크립트의 백틱 문자열 조합을 타입에 적용한 것이 **템플릿 리터럴 타입**입니다. `` `${...}` `` 안에 다른 타입을 넣으면, TypeScript가 가능한 모든 조합을 문자열 리터럴 타입으로 계산합니다.

```tsx
type Color = 'primary' | 'secondary' | 'accent';
type Level = 100 | 200 | 300 | 400 | 500;

// Color와 Level의 모든 조합을 자동 생성 (3 × 5 = 15개)
type DesignToken = `${Color}-${Level}`;
```

`` `${Color}-${Level}` `` 는 "Color의 값 하나 + 하이픈 + Level의 값 하나"를 붙인 문자열을 뜻합니다. 색상 3종과 단계 5종을 손으로 15줄 적는 대신, 규칙 한 줄로 조합을 전부 만들어 냅니다. 재료가 늘면 조합도 자동으로 따라 늘어납니다.

<details style="margin:10px 0 4px">
<summary style="cursor:pointer;font-weight:700;color:#C8443C">DesignToken이 실제로 펼쳐지면?</summary>
<pre><code>type DesignToken =
  | 'primary-100'   | 'primary-200'   | 'primary-300'   | 'primary-400'   | 'primary-500'
  | 'secondary-100' | 'secondary-200' | 'secondary-300' | 'secondary-400' | 'secondary-500'
  | 'accent-100'    | 'accent-200'    | 'accent-300'    | 'accent-400'    | 'accent-500';

// 숫자 Level(100)은 문자열에 들어가며 '100'으로 변환됨</code></pre>
</details>

---

## 🛠️ 3. 디자인 토큰 컴포넌트

`DesignToken`을 컴포넌트의 prop 타입으로 지정하면, 15가지 조합에 없는 값은 편집기에서 거부됩니다.

```tsx
// src/components/DesignButton.tsx
import type { DesignToken } from '../types/design';

interface DesignButtonProps {
  token: DesignToken; // 정의된 15개 조합만 허용
  label: string;
}

export function DesignButton({ token, label }: DesignButtonProps) {
  // token이 이미 검증된 값이므로 className이 CSS와 어긋나지 않는다
  return <button className={`btn-${token}`}>{label}</button>;
}
```

컴포넌트를 사용할 때, 유효한 토큰은 통과하고 정의되지 않은 값은 컴파일 오류가 납니다.

```tsx
<DesignButton token="primary-500" label="승인" />   // OK
<DesignButton token="secondary-200" label="취소" /> // OK

<DesignButton token="red-100" label="오류" />
// 컴파일 에러: '"red-100"'은 DesignToken에 할당할 수 없음
```

- `token: DesignToken` — `btn-${token}`으로 클래스를 만들 때 `token`이 이미 유효함이 보장되어, CSS 클래스명과 어긋날 여지가 없습니다.

- 편집기에서 `token=""`의 따옴표 안에 커서를 두면, 유효한 15개 토큰이 자동 완성 목록으로 제안됩니다. 오타를 내면 "그 값은 없다"는 오류가 즉시 표시됩니다.

---

## ⚠️ 4. 주의사항

- **조합이 곱으로 늘어납니다.** `Color`(n) × `Level`(m) = n×m 개의 타입이 생성됩니다. 재료가 커지면 조합이 폭발해 자동 완성과 컴파일 성능에 부담이 될 수 있습니다.

- **타입은 이름만 보장합니다.** 템플릿 리터럴 타입은 `token` 문자열이 규칙에 맞는지만 강제할 뿐, 실제 CSS에 `btn-primary-100` 클래스가 존재하는지는 확인하지 않습니다. 타입과 CSS의 동기화는 별도로 관리해야 합니다.

- **숫자는 문자열로 변환됩니다.** `${Level}`에 숫자 `100`을 넣으면 `'100'` 문자열이 됩니다. 결과 타입은 항상 문자열 리터럴입니다.

- **유니온·템플릿 리터럴은 `type`으로만 만듭니다.** `interface`는 객체 형태 정의 전용이라, 이런 문자열 조합 타입에는 `type` 별칭을 씁니다.

---

## ✅ 5. 핵심 정리

- **`type` 별칭** — 복잡한 타입에 이름을 붙입니다. 유니온·템플릿 리터럴 같은 형태는 `type`으로 정의합니다.

- **유니온(`|`)** — 여러 값 중 하나로 범위를 제한합니다. 조합의 재료가 됩니다.

- **템플릿 리터럴 타입** — `` `${A}-${B}` `` 로 유니온들의 모든 조합을 문자열 리터럴 타입으로 자동 생성합니다. 규칙 한 줄로 수많은 조합을 관리합니다.

- **컴포넌트 강제** — 생성한 토큰 타입을 prop에 지정하면, 정의되지 않은 값이 컴파일 타임에 차단되고 자동 완성이 유효한 목록을 제안합니다.

| 도구 | 역할 |
| :---: | :---: |
| `type` 별칭 | 복잡한 타입에 이름 부여 |
| 유니온 `\|` | 여러 값 중 하나로 제한 |
| 템플릿 리터럴 `` `${A}-${B}` `` | 유니온들의 조합을 문자열로 자동 생성 |

---

## 🔗 참고 자료

- 선행 글: [React 컴포넌트에 타입 붙이기 (문자열 리터럴 유니온 포함)](/posts/react-ts-component-prop-types/)

- [TypeScript 공식 문서 — Template Literal Types](https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html)
