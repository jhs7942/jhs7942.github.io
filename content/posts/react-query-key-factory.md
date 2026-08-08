---
title: 'Query Key Factory: 캐시 주소를 오타 없이, 계층으로 관리하기'
slug: react-query-key-factory
description: >-
  TanStack Query의 `queryKey`를 문자열로 직접 적으면 오타 하나와 분산 관리가 캐시를 조용히 어긋나게 합니다. 키를 한
  객체에서 찍어내는 Query Key Factory 패턴으로 오타를 컴파일 타임에 막고, `as const` 계층 구조를 세웁니다. 그리고 이
  계층이 실제로 힘을 발휘하는 지점 — `invalidateQueries`의 부분 매칭으로 뿌리 키 하나가 하위 전체를 무효화하는 동작을
  코드로 확인합니다.
published_at: '2026-07-23T22:30:14-07:00'
labels:
  - AI 작성
  - 학습 정리
  - React
  - TypeScript
  - 서버 상태 관리
source: 사용자 학습 노트 (서버 상태 관리 — Query Key Factory / as const 계층 구조·부분 매칭 무효화)
legacy_url: 'https://saver7942.blogspot.com/2026/07/query-key-factory.html'
draft: false
series: react-query
part: 2
---

[이전 편](https://saver7942.blogspot.com/2026/07/tanstack-query.html)에서 `queryKey`가 캐시의 주소라고 했습니다. 주소인데 매번 손으로 문자열을 적습니다. `['user', userId]`와 `['users', userId]`는 사람 눈엔 거의 같지만 캐시에겐 완전히 다른 번지수입니다. 's' 하나 차이로 한쪽은 캐시를 맞히고 다른 쪽은 빗나가, 데이터를 고쳐도 화면이 안 바뀌는 버그가 됩니다.

이 글은 키를 한 곳에서 찍어내는 **Query Key Factory** 패턴으로 오타를 원천 차단하고, 계층 구조를 세워 그 구조가 무효화(invalidation)에서 어떻게 힘을 발휘하는지까지 정리합니다.

---

## 🧩 1. 문자열 키의 두 위험 — 오타와 분산

`queryKey`를 컴포넌트마다 문자열로 직접 적으면 두 가지가 무너집니다.

**오타** — 캐시는 키를 문자 그대로 비교합니다. 한 컴포넌트가 `['users', 1]`로 저장한 데이터를, 다른 컴포넌트가 `['user', 1]`로 찾으면 못 찾습니다. 타입스크립트도 `string`은 다 통과시키므로, 이 실수는 런타임에 "왜 캐시가 안 먹지"로만 드러납니다.

**분산** — 무효화하려면 그 키를 다시 정확히 적어야 합니다. 유저 정보를 수정한 뒤 `invalidateQueries`로 다시 불러오려면, 프로필을 저장할 때 쓴 키와 **한 글자도 다르지 않게** 재입력해야 합니다. 키가 프로젝트 곳곳에 흩어져 있으면 이 대조는 사람이 감당할 수 없습니다.

두 문제의 뿌리는 같습니다. **키가 "약속"이 아니라 매번 새로 치는 자유 문자열이기 때문입니다.** 약속을 한 곳에 모아 두면 둘 다 사라집니다.

---

## 🏭 2. Query Key Factory — 한 곳에서 찍어내는 바코드

모든 키를 한 객체에서 생성합니다. 도메인(여기서는 유저)마다 파일 하나를 둡니다.

```tsx
// src/queries/queryKeys.ts
export const userKeys = {
  // 뿌리(Root) — 유저 도메인 전체
  all: ['users'] as const,

  // 가지(Branch) — 목록 계열
  lists: () => [...userKeys.all, 'list'] as const,

  // 가지(Branch) — 상세 계열
  details: () => [...userKeys.all, 'detail'] as const,

  // 잎(Leaf) — 특정 id 하나
  detail: (id: number) => [...userKeys.details(), id] as const,
};
```

이제 컴포넌트는 문자열 대신 `userKeys.detail(userId)`를 씁니다. `userKeys.`까지 치면 에디터가 `all`·`lists`·`details`·`detail`을 제안하므로, 존재하지 않는 키를 적으면 그 자리에서 타입 오류가 납니다. **오타가 런타임 버그에서 컴파일 오류로 앞당겨집니다.**

목록·상세를 굳이 함수(`lists()`)로 둔 이유는 두 가지입니다. 하나는 `detail(id)`처럼 인자를 받는 키와 호출 형태를 통일하기 위해서고, 다른 하나는 나중에 `list(filters)`처럼 조건을 받도록 확장하기 좋기 때문입니다.

---

## 🌳 3. as const 계층 구조 — 뿌리·가지·잎

두 가지가 이 패턴의 핵심입니다.

**`as const`** — 배열을 `string[]`이 아니라 값이 고정된 **읽기 전용 튜플**로 굳힙니다. `['users']`가 "문자열 배열"이 아니라 "`'users'` 하나짜리 상수"가 되어, 키의 모양이 타입 수준에서 확정됩니다.

**스프레드로 쌓는 계층** — 상위 키를 `...`로 펼쳐 하위 키를 만들면, 자연스럽게 접두사를 공유하는 트리가 생깁니다.

| 팩토리 호출 | 실제 키 | 계층 |
| :---: | :---: | :---: |
| `userKeys.all` | `['users']` | 뿌리 |
| `userKeys.lists()` | `['users', 'list']` | 가지 |
| `userKeys.details()` | `['users', 'detail']` | 가지 |
| `userKeys.detail(1)` | `['users', 'detail', 1]` | 잎 |

모든 유저 관련 키가 `['users']`로 시작합니다. 이 공통 접두사가 다음 섹션에서 무효화의 열쇠가 됩니다.

---

## 🎯 4. 계층이 힘을 발휘하는 순간 — 부분 매칭 무효화

계층 구조는 보기 좋으라고 만든 게 아닙니다. `invalidateQueries`가 **키를 접두사로 매칭**하기 때문에 실질적 이득이 생깁니다. 넘긴 키로 "시작하는" 모든 캐시가 한 번에 대상이 됩니다.

```tsx
import { useQueryClient } from '@tanstack/react-query';
import { userKeys } from '../queries/queryKeys';

const queryClient = useQueryClient();

// 유저 1명만 수정 → 그 잎 하나만
queryClient.invalidateQueries({ queryKey: userKeys.detail(1) });

// 목록이 바뀜 → 목록 계열만
queryClient.invalidateQueries({ queryKey: userKeys.lists() });

// 유저 도메인 전체를 한 번에
queryClient.invalidateQueries({ queryKey: userKeys.all });
```

마지막 한 줄이 계층의 보상입니다. `userKeys.all`(`['users']`)을 넘기면, 그 접두사로 시작하는 캐시가 전부 걸립니다.

<details style="margin:10px 0 4px">
<summary style="cursor:pointer;font-weight:700;color:#C8443C">invalidateQueries({ queryKey: ['users'] })가 매칭하는 캐시</summary>
<pre><code>캐시에 담긴 키들:
  ['users', 'detail', 1]     ← 매칭 (users로 시작)
  ['users', 'detail', 2]     ← 매칭
  ['users', 'list']          ← 매칭
  ['posts', 'detail', 1]     ← 매칭 안 됨 (posts로 시작)

→ 유저 관련 캐시 3건이 한 번에 stale 처리되고, 화면에 떠 있는 것만 다시 요청됩니다.</code></pre>
</details>

정확히 그 키 하나만 무효화하려면 부분 매칭을 끕니다.

```tsx
// ['users','detail',1]만. ['users','detail',1,'comments'] 같은 하위는 제외
queryClient.invalidateQueries({ queryKey: userKeys.detail(1), exact: true });
```

문자열을 흩어 놓았다면 "유저 관련 캐시를 전부 갱신"하려고 프로젝트 곳곳의 키를 찾아 나열해야 합니다. 계층 팩토리에서는 `userKeys.all` 한 줄이 그 일을 합니다.

---

## 🛰️ 5. 컴포넌트 적용과 Devtools 확인

컴포넌트에서는 팩토리가 만든 키를 그대로 넘깁니다.

```tsx
// src/components/UserProfile.tsx
import { useQuery } from '@tanstack/react-query';
import { fetchUserData } from '../api/mockApi';
import { userKeys } from '../queries/queryKeys';

export default function UserProfile({ userId }: { userId: number }) {
  const { data, isPending, error } = useQuery({
    queryKey: userKeys.detail(userId),   // 문자열 하드코딩 대신 팩토리
    queryFn: () => fetchUserData(userId),
  });

  if (isPending) return <div>⌛ 동기화 중...</div>;
  if (error) return <div>❌ 에러: {error.message}</div>;

  return (
    <div style={{ border: '1px solid #ddd', padding: '1rem' }}>
      <h4>유저 정보</h4>
      <p>이름: {data.name}</p>
      <p>이메일: {data.email}</p>
    </div>
  );
}
```

`@tanstack/react-query-devtools`를 붙이면 캐시가 실제로 어떤 키로 저장됐는지 눈으로 확인할 수 있습니다.

```tsx
// src/App.tsx
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
// ...QueryClientProvider 안에
<ReactQueryDevtools initialIsOpen={false} />
```

Devtools 패널을 열면 캐시 목록에 `["users","detail",1]` 형태로 계층화된 주소가 보입니다. 같은 `userId`를 쓰는 컴포넌트를 여럿 배치해도 이 항목은 하나뿐이고, 네트워크 요청도 한 번만 나갑니다. 같은 키의 동시 요청을 엔진이 하나로 합치기 때문입니다(개발 모드의 `<StrictMode>` 이중 마운트에서도, 두 번째 마운트는 이미 만들어진 캐시를 만나므로 요청은 늘지 않습니다).

---

## ⚠️ 6. 주의사항

- **제네릭보다 추론** — `useQuery<UserData, Error>`처럼 타입 인자를 일부만 적으면 나머지가 기본값으로 채워져 `select` 등에서 어긋납니다. `queryFn`의 반환 타입(`Promise<UserData>`)을 명시하고 `data` 타입은 추론에 맡깁니다. 이전 편들과 같은 원칙입니다.

- **키에는 요청에 영향을 주는 값을 모두 넣습니다** — `list(filters)`로 확장할 때 검색어·페이지·정렬을 빠뜨리면, 조건이 다른 결과가 같은 캐시를 덮어씁니다. 팩토리 함수의 인자로 받아 키에 포함시킵니다.

- **부분 매칭은 기본, 양날의 검** — `invalidateQueries`는 접두사로 매칭하므로 편리하지만, 뿌리 키를 무심코 넘기면 의도보다 넓게 무효화됩니다. 좁게 지우려면 `exact: true`를 씁니다.

- **팩토리는 도메인별로 분리** — `userKeys`·`postKeys`처럼 도메인마다 둡니다. 한 파일에 전부 몰면 뿌리 키(`all`)가 겹칠 위험이 생깁니다.

- **키 자체는 직렬화 가능해야** — `queryKey`의 값은 캐시 비교에 쓰이므로 함수·클래스 인스턴스가 아니라 문자열·숫자·평범한 객체여야 합니다.

---

## ✅ 7. 핵심 정리

- **키는 자유 문자열이 아니라 약속입니다.** 한 객체에서 찍어내면 오타가 컴파일 타임에 잡히고, 무효화할 때 다시 정확히 적을 필요가 없어집니다.

- **`as const` + 스프레드로 계층을 만듭니다.** `['users']` → `['users','detail']` → `['users','detail',1]`. 모든 하위 키가 공통 접두사를 공유합니다.

- **계층의 보상은 부분 매칭 무효화입니다.** `invalidateQueries`는 접두사로 매칭하므로, `userKeys.all` 한 줄이 유저 관련 캐시 전체를 갱신합니다. 정확히 하나만 지울 땐 `exact: true`.

- **다음 단계는 이 캐시를 바꾸는 쪽입니다.** 지금까지는 읽기(`useQuery`)였습니다. 데이터를 쓰고(`useMutation`) 나서 방금 만든 팩토리 키로 무효화하면, 화면이 서버와 다시 맞춰집니다.

---

## 🔗 참고 자료

- 다음 편: [데이터 생애주기 — Fresh·Stale·Inactive와 isFetching](https://saver7942.blogspot.com/2026/07/tanstack-query-freshstaleinactive.html)

- 이전 편: [TanStack Query 입문 — 데이터를 가져오는 대신 서버와 동기화하기](https://saver7942.blogspot.com/2026/07/tanstack-query.html)

- [TkDodo 블로그 — Effective React Query Keys](https://tkdodo.eu/blog/effective-react-query-keys)

- [TanStack Query 공식 문서 — Query Invalidation](https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation)

- [TanStack Query 공식 문서 — Query Keys](https://tanstack.com/query/latest/docs/framework/react/guides/query-keys)
