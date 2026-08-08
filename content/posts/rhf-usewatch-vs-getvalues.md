---
title: 'React Hook Form: useWatch vs getValues — 리렌더링 성능 다루기'
slug: rhf-usewatch-vs-getvalues
description: >-
  react-hook-form에서 폼 필드 값을 읽는 두 방식을 비교합니다. `useWatch`는 구독 기반으로 지정한 필드 변화 시 해당
  컴포넌트만 리렌더링하고, `getValues`는 호출 시점의 값을 동기적으로 반환하여 렌더링을 유발하지 않습니다. RenderCounter를
  활용한 실습으로 두 방식의 리렌더링 동작 차이를 확인합니다.
published_at: '2026-07-12T03:45:29-07:00'
labels:
  - AI 작성
  - 학습 정리
  - React
source: >-
  C:/Users/jhs02/AppData/Local/Temp/claude/C--Users-jhs02-Desktop-blog/fe27660a-d234-405a-bb90-f7629ae1dff8/scratchpad/rhf-material.md
legacy_url: >-
  https://saver7942.blogspot.com/2026/07/react-hook-form-usewatch-vs-getvalues.html
draft: false
---

폼 필드 값을 실시간으로 화면에 반영해야 할 때, `useState`나 `watch`를 사용하면 글자 하나 입력할 때마다 폼 전체가 리렌더링됩니다. react-hook-form은 이 문제를 해결하는 두 가지 방식을 제공합니다. 필드 단위 구독 기반 훅인 `useWatch`와, 렌더링을 전혀 유발하지 않는 스냅샷 함수 `getValues`입니다. 두 방식의 동작 원리와 적절한 사용 시점을 RenderCounter 실습과 함께 살펴봅니다.

#### 목차

1. [useWatch — 필드 단위 구독](#1-usewatch)
2. [useWatch 기본 사용법](#2-usewatch)
3. [getValues — 렌더링 없는 스냅샷](#3-getvalues)
4. [getValues 기본 사용법](#4-getvalues)
5. [useWatch vs getValues 비교](#5-usewatch-vs-getvalues)
6. [실습: 구독 vs 스냅샷 리렌더링 대조](#6-vs)
7. [주의사항](#7)
8. [핵심 정리](#8)

## 📦 1. useWatch — 필드 단위 구독

**useWatch**는 구독(Subscription) 기반 훅입니다. 지정한 `name`의 필드 값이 변할 때, 그 훅을 사용하는 컴포넌트만 리렌더링됩니다.

비밀번호 강도 실시간 표시, 체크박스에 따른 조건부 입력창 노출처럼 특정 필드 값을 실시간으로 화면에 반영해야 하는 상황에서 `watch` 함수를 쓰면 관련 없는 컴포넌트까지 포함해 폼 전체 트리가 리렌더링됩니다.

react-hook-form이 제공하는 `watch` 함수와 `useWatch` 훅의 차이를 아파트 방송 시스템에 비유하면 다음과 같습니다.

- **`watch` 함수**: 단지 전체 스피커 방송 — 폼 전체 트리가 리렌더링됩니다.

- **`useWatch` 훅**: 특정 세대 전용 인터폰 — 해당 필드를 구독하는 컴포넌트만 리렌더링됩니다.

`useWatch`는 내부적으로 구독 모델을 사용하여 지정한 `name` 값이 바뀌지 않으면 렌더링 신호를 보내지 않습니다.

## 🛠️ 2. useWatch 기본 사용법

```tsx
import { useWatch } from "react-hook-form";

function Watcher({ control }) {
  const userName = useWatch({
    control,
    name: "userName",      // userName 필드 변화만 감시
    defaultValue: "방문자"  // 초기값 설정 가능
  });
  return <p>현재 입력 중인 이름: {userName}</p>;
}
```

- `control`은 부모의 `useForm()`에서 받아 전달합니다.

- `defaultValue`로 초기 렌더링 시 표시할 값을 지정할 수 있습니다.

- 값을 실제로 사용하는 말단 자식 컴포넌트에서 `useWatch`를 호출하면, 부모 컴포넌트의 리렌더링을 막을 수 있습니다.

## 🔍 3. getValues — 렌더링 없는 스냅샷

**getValues**는 구독이 아니라 호출 시점의 현재 값을 동기적으로 반환하는 일회성 스냅샷 함수입니다. 렌더링 사이클을 건드리지 않습니다.

제출 버튼 클릭 시 현재 값 확인, 로직 계산용 값 참조 등 화면을 다시 그릴 필요가 없는 상황에 적합합니다. react-hook-form 내부의 순수 JS 저장소에 직접 접근하므로 렌더링 비용이 사실상 없습니다.

## 🛠️ 4. getValues 기본 사용법

```tsx
const { getValues } = useForm();

const handleCheckData = () => {
  const currentValues = getValues();        // 전체 값 스냅샷
  const specificValue = getValues("email"); // 특정 필드만
  console.log(currentValues);
};
```

- 전체 필드 값이 필요하면 `getValues()`, 특정 필드만 필요하면 `getValues("fieldName")`을 사용합니다.

- 로깅, 조건문 처리 등 값은 필요하지만 화면 갱신이 불필요한 상황에 적합합니다.

> **참고**: `getValues`는 구독이 아니므로 값이 바뀌어도 자동으로 화면을 갱신하지 않습니다. 실시간 표시가 필요한 경우에는 `useWatch`를 사용해야 합니다.

## 📊 5. useWatch vs getValues 비교

| 구분 | useWatch | getValues |
| :---: | :---: | :---: |
| 동작 방식 | 구독(Subscription) | 동기적 스냅샷 |
| 리렌더링 | 해당 컴포넌트만 (필드 변화 시) | 0회 |
| 사용 목적 | 실시간 UI 피드백 | 로직 연산·데이터 참조 |
| 대표 사용 사례 | 비밀번호 강도, 조건부 필드 | 제출 전 값 가공, 로그 |
| 반환 시점 | 구독 필드 변화 시 자동 | 호출 즉시 |

## 🛠️ 6. 실습: 구독 vs 스냅샷 리렌더링 대조

`RenderCounter`를 활용해 어떤 동작이 리렌더링을 유발하는지 확인합니다. `useRef`로 렌더링 횟수를 카운팅하여 각 컴포넌트의 리렌더링 여부를 실측합니다.

```tsx
import React, { useRef } from "react";
import { useForm, useWatch } from "react-hook-form";

interface PerformanceForm {
  title: string;
}

// 렌더링 횟수 추적 헬퍼
function RenderCounter({ name }: { name: string }) {
  const count = useRef(0);
  count.current++;
  return <span>{name} Render: {count.current}</span>;
}

// useWatch 전용 하위 컴포넌트 (리렌더링 고립)
function TitleWatcher({ control }: { control: any }) {
  const title = useWatch({ control, name: "title" });
  return (
    <div>
      <h3>useWatch (구독 중)</h3>
      <RenderCounter name="Child" />
      <p>"{title || "대기 중..."}"</p>
    </div>
  );
}

export default function PerformanceDeepDive() {
  const { register, control, getValues } = useForm<PerformanceForm>();

  return (
    <div>
      <header>
        <h1>Performance Lab</h1>
        <RenderCounter name="Parent" />
      </header>

      <input {...register("title")} placeholder="입력 시 Child만 반응합니다" />

      {/* 이 자식 컴포넌트만 리렌더링됨 */}
      <TitleWatcher control={control} />

      <button type="button" onClick={() => alert(`[Snapshot]: ${getValues("title")}`)}>
        getValues 스냅샷 (부모/자식 렌더링 0회)
      </button>
    </div>
  );
}
```

### 확인 포인트

세 가지 동작을 순서대로 확인합니다.

1. **리렌더링 고립 확인** — `title` 입력란에 글자를 10자 입력합니다. `Child Render` 카운트는 올라가고 `Parent Render` 카운트는 변하지 않는지 확인합니다.

2. **getValues 렌더링 0회 확인** — `getValues 스냅샷` 버튼을 여러 번 클릭합니다. `alert`만 표시되고 어떤 카운트도 변하지 않는지 확인합니다.

3. **동기적 일관성 확인** — 입력 직후 즉시 버튼을 클릭합니다. `getValues`는 다음 렌더 사이클을 기다리지 않고 호출 즉시 최신 값을 반환합니다.

<details style="margin:10px 0 4px">
<summary style="cursor:pointer;font-weight:700;color:#C8443C">실행 결과 보기</summary>
<pre><code># title 입력란에 글자 10자 입력 후
Parent Render: 1   ← 변화 없음 (초기 마운트 1회)
Child Render: 11   ← 마운트 1회 + 글자 입력 10회

# getValues 버튼 10회 클릭 후
Parent Render: 1   ← 변화 없음
Child Render: 11   ← 변화 없음
# alert([Snapshot]: ...)만 표시됨</code></pre>
</details>

## ⚠️ 7. 주의사항

- **useWatch는 말단 자식 컴포넌트에서 호출합니다.** 부모 컴포넌트에서 `useWatch`를 호출하면 해당 부모가 리렌더링됩니다. 값을 실제로 표시하는 컴포넌트로 분리해야 부모 리렌더링을 막는 효과가 있습니다.

- **getValues는 자동 갱신이 없습니다.** 구독이 아니므로 필드 값이 바뀌어도 화면이 자동으로 갱신되지 않습니다. 실시간 표시가 필요한 경우에는 `useWatch`를 사용해야 합니다.

- **자식 컴포넌트에는 control을 전달해야 합니다.** 자식 컴포넌트에서 `useWatch`를 사용할 때는 부모의 `useForm()`에서 받은 `control`을 props로 전달해야 합니다.

## ✅ 8. 핵심 정리

- `useWatch`는 구독 기반 훅으로, 지정한 필드 변화 시 해당 컴포넌트만 리렌더링합니다. 비밀번호 강도, 조건부 필드처럼 실시간 UI 반영이 필요한 상황에 사용합니다.

- `getValues`는 동기적 스냅샷 함수로, 호출 즉시 현재 값을 반환하고 렌더링을 유발하지 않습니다. 로직 연산·데이터 참조처럼 화면 갱신이 불필요한 상황에 사용합니다.

- `useWatch`는 말단 자식 컴포넌트에서 호출해야 부모 리렌더링을 차단하는 효과가 있습니다.

- `watch` 함수는 폼 전체 트리를 리렌더링하므로, 특정 필드만 구독할 때는 `useWatch`를 사용합니다.

- 선택 기준: **실시간 표시가 필요하면 `useWatch`**, **값 참조만 필요하면 `getValues`**.
