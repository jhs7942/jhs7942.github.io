---
title: 'select 옵션: 서버 데이터를 컴포넌트에 맞게 변환하고 리렌더 줄이기'
slug: react-query-select-transform
description: >-
  서버는 범용적인 큰 객체를 보내지만 컴포넌트가 쓰는 건 그중 일부입니다. `useQuery`의 `select` 옵션으로 변환을 쿼리 레벨에
  두면, 컴포넌트는 가공된 결과만 받고 UI 로직이 깨끗해집니다. 핵심은 두 가지 — **같은 `queryKey`에 다른 `select`**
  로 하나의 캐시를 여러 뷰로 구독하는 것, 그리고 원본이 바뀌어도 `select` 결과가 같으면 리렌더를 건너뛰는 최적화입니다.
published_at: '2026-07-27T16:50:31-07:00'
labels:
  - AI 작성
  - 학습 정리
  - React
  - TypeScript
  - 서버 상태 관리
source: 사용자 학습 노트 (서버 상태 관리 — select 데이터 변환·부분 구독·리렌더 최적화)
legacy_url: 'https://saver7942.blogspot.com/2026/07/select.html'
draft: false
series: react-query
part: 11
---

[이전 편](https://saver7942.blogspot.com/2026/07/ux-keeppreviousdata.html)까지 화면 깜빡임을 잡았습니다. 이제 코드 안쪽의 비효율을 봅니다.

서버는 보통 범용적인 목적으로 **날것의 큰 객체**를 보냅니다. 유저 객체 하나에 이름·이메일·전화·주소가 다 들어 있지만, 정작 어떤 컴포넌트는 이름 목록만, 다른 컴포넌트는 활성 유저 수만 필요합니다. 이 변환을 컴포넌트 본문에서 `map`·`filter`로 하면 UI 로직이 지저분해지고 매 렌더마다 연산이 반복됩니다. `useQuery`의 `select` 옵션이 이 변환을 쿼리 레벨로 옮깁니다.

---

## 🥩 1. 날것 데이터의 문제

서버가 주는 유저 객체입니다. 컴포넌트가 필요로 하는 것보다 훨씬 큽니다.

```tsx
// src/api/userApi.ts
export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  isActive: boolean;
  address: { city: string; street: string; zipcode: string };
}

export const fetchUsers = async (): Promise<User[]> => {
  // ...서버에서 전체 유저 배열을 받아온다
};
```

어떤 화면은 이름 목록(`string[]`)만, 어떤 화면은 활성 유저 수(`number`)만 씁니다. 이 변환을 컴포넌트에서 하면 두 가지가 나빠집니다.

- **UI 로직 비대화** — 렌더 함수 안에 `users.filter(...).map(...)`가 섞입니다.

- **매 렌더 재연산** — 컴포넌트가 리렌더될 때마다 변환이 다시 돌고, 결과가 새 배열이라 하위도 리렌더됩니다.

소고기에 비유하면, 서버는 소 한 마리를 통째로 보냅니다. 손님(컴포넌트) 앞에서 고기를 써는 대신, 주방(`select`)에서 필요한 부위만 발라 접시에 담아 내보내는 것이 이 편의 목표입니다.

---

## 🔪 2. select — 변환을 쿼리로 옮긴다

`select`는 `queryFn`이 받아온 원본을, 컴포넌트에 전달되기 전에 가공하는 함수입니다.

```tsx
import { useQuery } from '@tanstack/react-query';
import { fetchUsers } from '../api/userApi';

// 이름 목록만 필요한 컴포넌트
const { data: userNames } = useQuery({
  queryKey: ['users'],
  queryFn: fetchUsers,               // 원본: User[]
  select: (users) => users.map((u) => u.name),   // 가공: string[]
});
// userNames: string[] | undefined
```

- **`select`의 인자는 원본** — `queryFn`이 반환한 `User[]`가 그대로 들어옵니다. `select`는 데이터가 **성공적으로 도착했을 때만** 실행되므로, 인자는 항상 존재합니다(`users?.map`처럼 옵셔널 체이닝을 붙일 필요가 없습니다).

- **캐시는 원본을 저장** — `select`는 컴포넌트에 전달되는 `data`만 바꿉니다. 캐시에는 여전히 원본 `User[]`가 그대로 남아, 다른 곳에서 원본이 필요할 때 재사용됩니다.

컴포넌트 본문에는 `map`·`filter`가 사라지고, 가공된 `userNames`만 받아 그리면 됩니다. UI와 데이터 가공의 관심사가 분리됩니다.

---

## 🧩 3. 같은 캐시, 다른 뷰 — select의 진짜 힘

`select`의 핵심은 여기 있습니다. **같은 `queryKey`에 서로 다른 `select`** 를 두면, 하나의 캐시를 여러 형태로 나눠 구독할 수 있습니다.

```tsx
// 컴포넌트 A — 이름 목록만
const { data: userNames } = useQuery({
  queryKey: ['users'],                       // ← 같은 키
  queryFn: fetchUsers,
  select: (users) => users.map((u) => u.name),
});

// 컴포넌트 B — 활성 유저 수만
const { data: activeCount } = useQuery({
  queryKey: ['users'],                       // ← 같은 키
  queryFn: fetchUsers,
  select: (users) => users.filter((u) => u.isActive).length,
});
```

두 컴포넌트가 **같은 키 `['users']`** 를 쓰므로, `fetchUsers`는 **한 번만** 호출됩니다([2편](https://saver7942.blogspot.com/2026/07/tanstack-query.html)의 중복 제거). 하나의 캐시를 두고 A는 `string[]`으로, B는 `number`로 각자 필요한 모양만 뽑아 씁니다.

> 원본 강의에서는 `['users', 'names']`와 `['users', 'active-count']`처럼 키를 **다르게** 뒀는데, 그러면 캐시가 둘로 나뉘어 `fetchUsers`가 두 번 호출됩니다. `select`의 이점(하나의 서버 데이터를 여러 뷰로 구독)을 살리려면 **키를 같게** 두어야 합니다. 뽑아내는 모양이 다를 뿐 출처는 같은 데이터이기 때문입니다.

---

## ⚡ 4. 리렌더 최적화 — 결과가 같으면 건너뛴다

`select`의 두 번째 이점은 성능입니다. TanStack Query는 `select`가 반환한 결과를 이전 값과 비교(structural sharing)해서, **값이 같으면 같은 참조를 유지**합니다. 참조가 그대로면 컴포넌트는 리렌더되지 않습니다.

예를 들어 서버 데이터에서 어떤 유저의 `email`만 바뀌었다고 합시다.

<details style="margin:10px 0 4px">
<summary style="cursor:pointer;font-weight:700;color:#C8443C">email이 바뀌어도 이름 목록 컴포넌트가 안 그려지는 이유</summary>
<pre><code>원본 User[]        : email 하나 바뀜 → 원본은 "변경됨"
select 결과(names) : ['Gemini','React','TypeScript'] → 값 동일

→ select 결과의 참조가 유지됨
→ userNames를 구독하는 컴포넌트는 리렌더 스킵
   (email을 안 쓰는 컴포넌트는 email 변경에 영향받지 않음)</code></pre>
</details>

컴포넌트가 "원본 전체"가 아니라 "`select`로 뽑은 일부"만 구독하기 때문에, 자기가 안 쓰는 필드가 바뀌어도 조용합니다. 이름 목록 컴포넌트는 이름이 바뀔 때만 다시 그려집니다.

---

## 🧬 5. 타입은 추론된다

원본 강의는 `useQuery<User[], Error, string[]>`처럼 제네릭을 세 개 적었지만, 그럴 필요가 없습니다. **`select`의 반환 타입에서 최종 `data` 타입이 추론**됩니다.

```tsx
const { data } = useQuery({
  queryKey: ['users'],
  queryFn: fetchUsers,                         // Promise<User[]>
  select: (users) => users.map((u) => u.name), // string[]
});
// data: string[] | undefined  ← 자동 추론
```

`queryFn`이 `Promise<User[]>`를 반환하니 `select`의 인자가 `User[]`로 잡히고, `select`가 `string[]`을 반환하니 `data`가 `string[]`으로 좁혀집니다. 제네릭을 일부만 적으면 오히려 나머지가 기본값으로 채워져 어긋날 수 있으니, 추론에 맡기는 편이 안전합니다(이 시리즈가 계속 지켜 온 원칙입니다).

---

## ⚠️ 6. 주의사항

- **키를 같게, select를 다르게** — 다시 강조합니다. 같은 서버 데이터에서 여러 모양을 뽑을 때는 `queryKey`를 통일해야 캐시가 하나로 공유됩니다. 키를 나누면 같은 데이터를 중복해서 받아옵니다.

- **무거운 변환은 참조를 안정화** — `select`에 인라인 화살표 함수를 넘기면 매 렌더 새 함수라 변환이 매번 실행됩니다. 가벼운 `map`·`filter`는 문제없지만, 정렬·대규모 가공처럼 무거우면 `useCallback`으로 `select` 함수를 감싸 재실행을 줄입니다.

- **원본이 필요한 곳도 있습니다** — `select`는 그 쿼리의 `data`만 바꿀 뿐 캐시 원본은 그대로입니다. 다른 컴포넌트가 같은 키를 `select` 없이 구독하면 원본 `User[]`를 받습니다.

- **`select`는 성공 데이터에만 실행** — 로딩·에러 상태에서는 호출되지 않습니다. 그래서 인자에 옵셔널 체이닝이 필요 없고, `select` 안에서 데이터 존재를 다시 검사하지 않아도 됩니다.

---

## ✅ 7. 핵심 정리

- **`select`는 변환을 쿼리 레벨로 옮깁니다.** 컴포넌트는 가공된 결과만 받아 UI에 집중하고, `map`·`filter` 같은 로직이 렌더 함수에서 사라집니다.

- **같은 키 + 다른 select가 핵심입니다.** 하나의 캐시(서버 요청 1회)를 여러 컴포넌트가 각자 필요한 모양으로 구독합니다. 키를 나누면 이 이점이 사라집니다.

- **결과가 같으면 리렌더를 건너뜁니다.** structural sharing으로 `select` 결과의 참조가 유지되면, 컴포넌트가 안 쓰는 필드가 바뀌어도 다시 그리지 않습니다.

- **타입은 `select` 반환에서 추론됩니다.** 제네릭을 억지로 적기보다 `queryFn`·`select`의 반환 타입에 맡깁니다. 무거운 변환만 `useCallback`으로 안정화합니다.

---

## 🔗 참고 자료

- 다음 편: [의존적 쿼리 — enabled로 순서 있는 데이터 호출 제어하기](https://saver7942.blogspot.com/2026/07/enabled.html)

- 이전 편: [검색 UX 깜빡임 없애기 — keepPreviousData와 디바운스](https://saver7942.blogspot.com/2026/07/ux-keeppreviousdata.html)

- [TanStack Query 공식 문서 — select](https://tanstack.com/query/latest/docs/framework/react/guides/render-optimizations#select)

- [TkDodo 블로그 — React Query Data Transformations](https://tkdodo.eu/blog/react-query-data-transformations)
