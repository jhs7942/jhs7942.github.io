---
title: 'useSuspenseQueries로 병렬 페칭: Suspense의 Waterfall 함정 풀기'
slug: react-query-parallel-suspense-queries
description: >-
  `useSuspenseQuery`를 한 컴포넌트에서 두 번 나란히 쓰면, 첫 요청이 중단(suspend)되는 순간 두 번째 요청은 시작조차
  못 해 순차 실행(waterfall)이 됩니다. 2초 걸리는 요청 둘이 4초가 되는 함정입니다. 이 편은 그 원인을 렌더 흐름으로 짚고,
  `useSuspenseQueries`로 여러 요청을 한 묶음으로 병렬화해 총 시간을 가장 느린 요청 하나(2초)로 줄입니다.
published_at: '2026-07-23T23:38:13-07:00'
labels:
  - AI 작성
  - 학습 정리
  - React
  - TypeScript
  - 서버 상태 관리
source: 사용자 학습 노트 (서버 상태 관리 — useSuspenseQueries 병렬 페칭·Waterfall)
legacy_url: >-
  https://saver7942.blogspot.com/2026/07/usesuspensequeries-suspense-waterfall.html
draft: false
series: react-query
part: 5
---

[이전 편](/posts/react-query-suspense-error-boundary/)에서 `useSuspenseQuery`가 로딩·에러를 부모로 위임한다고 했습니다. 편리한데, 한 컴포넌트에서 데이터를 **둘 이상** 가져올 때 조용히 성능을 갉아먹는 함정이 하나 숨어 있습니다.

유저 정보와 게시글 목록을 각각 2초 걸려 가져온다고 합시다. 둘은 서로 무관하니 동시에 요청하면 2초면 됩니다. 그런데 `useSuspenseQuery`를 순진하게 두 번 쓰면 4초가 걸립니다. 스테이크가 다 구워진 뒤에야 파스타를 올리는 주방인 셈입니다. 이 편은 그 원인과 해법을 다룹니다.

---

## 🌊 1. Waterfall — 왜 순차가 되나

원인은 `useSuspenseQuery`의 동작 그 자체입니다. 데이터가 없으면 **그 줄에서 컴포넌트 실행을 멈춥니다.**

```tsx
export default function UserAndPosts({ id }: { id: number }) {
  // 첫 번째 — 데이터가 없으면 여기서 실행이 멈추고 부모로 제어가 넘어간다
  const { data: user } = useSuspenseQuery({ queryKey: userKeys.detail(id), queryFn: () => fetchUser(id) });

  // 두 번째 — 위가 끝나 컴포넌트가 다시 실행될 때에야 비로소 시작된다
  const { data: posts } = useSuspenseQuery({ queryKey: postKeys.list(id), queryFn: () => fetchPosts(id) });

  return /* ... */;
}
```

첫 번째 `useSuspenseQuery`가 중단되면 컴포넌트 함수 실행이 그 자리에서 끝납니다. 두 번째 훅은 **호출되지도 않습니다.** 유저 요청(2초)이 완료돼 컴포넌트가 다시 렌더될 때에야 두 번째 훅이 실행돼 게시글 요청(2초)이 시작됩니다. 그래서 2 + 2 = 4초입니다.

`useQuery`에서는 이 문제가 없었습니다. `useQuery`는 중단하지 않고 `isPending`을 반환하며 다음 줄로 넘어가므로, 두 요청이 같은 렌더에서 나란히 시작됩니다. 중단이라는 편의가 순차 실행이라는 대가를 데려온 셈입니다.

---

## 🍳 2. useSuspenseQueries — 배열로 묶어 병렬

해법은 여러 요청을 **하나의 훅 호출로 묶는 것**입니다. `useSuspenseQueries`는 `queries` 배열을 받아, 중단하기 전에 배열 안의 모든 요청을 한꺼번에 띄웁니다.

```tsx
// src/components/UserAndPosts.tsx
import { useSuspenseQueries } from '@tanstack/react-query';
import { fetchUser, fetchPosts } from '../api/mockApi';
import { userKeys, postKeys } from '../queries/queryKeys';

export default function UserAndPosts({ id }: { id: number }) {
  const [userQuery, postsQuery] = useSuspenseQueries({
    queries: [
      { queryKey: userKeys.detail(id), queryFn: () => fetchUser(id), staleTime: 1000 * 60 * 5 },
      { queryKey: postKeys.list(id),  queryFn: () => fetchPosts(id), staleTime: 1000 * 60 },
    ],
  });

  // 둘 다 준비된 뒤에야 여기 도달. 각 data는 확정 타입(User, Post[])으로 추론됩니다.
  return (
    <section style={{ border: '2px solid #333', padding: '1rem', borderRadius: 8 }}>
      <h2>{userQuery.data.name}님의 공간</h2>
      <ul>
        {postsQuery.data.map((post) => (
          <li key={post.id}><strong>{post.title}</strong></li>
        ))}
      </ul>
    </section>
  );
}
```

두 요청이 같은 시점에 출발하므로, 중단은 "둘 다 도착할 때까지"로 한 번만 걸립니다. 총 시간은 합(4초)이 아니라 **더 느린 쪽 하나(2초)** 가 됩니다. 반환도 배열이라 각 요소의 `data`가 `User`·`Post[]`로 정확히 잡힙니다.

각 쿼리는 자기 옵션을 따로 가집니다. 위에서 유저는 `staleTime` 5분, 게시글은 1분으로 다르게 둔 것처럼요.

---

## 🧪 3. 실습 — 4초가 2초로

[5편](/posts/react-query-suspense-error-boundary/)에서 만든 `Suspense` + `ErrorBoundary` 구조를 그대로 재사용합니다. 다만 에러를 즉시 보기 위해 `retry`를 끕니다.

```tsx
// src/App.tsx
import { Suspense } from 'react';
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import UserAndPosts from './components/UserAndPosts';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } }, // 에러를 즉시 ErrorBoundary로
});

const Skeleton = () => <div style={{ color: '#666' }}>⌛ 병렬로 불러오는 중...</div>;
const ErrorPage = ({ error }: FallbackProps) => (
  <div style={{ color: 'red' }}>❌ {error.message}</div>
);

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary FallbackComponent={ErrorPage}>
        <Suspense fallback={<Skeleton />}>
          <UserAndPosts id={1} />
        </Suspense>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}
```

`retry: false`가 없으면, 에러가 나도 기본 재시도(3회)를 소진하느라 `ErrorPage`가 10초 넘게 뒤에 뜹니다. 실습에서 에러 UI를 바로 확인하려면 꺼 둡니다.

```tsx
// src/api/mockApi.ts — 각 요청에 2초 지연
export const fetchUser = (id: number): Promise<User> =>
  new Promise((resolve, reject) =>
    setTimeout(() => (id === 0 ? reject(new Error('존재하지 않는 유저')) : resolve({ id, name: '시니어 아키텍트' })), 2000));

export const fetchPosts = (id: number): Promise<Post[]> =>
  new Promise((resolve) =>
    setTimeout(() => resolve([{ id: 1, title: '첫 글' }, { id: 2, title: '둘째 글' }]), 2000));
```

---

## 📊 4. 검증 — Network 타임라인

두 방식의 차이는 개발자 도구 Network 탭에서 가장 뚜렷합니다.

<details>
<summary>Waterfall vs Parallel 타임라인</summary>
<pre><code>// useSuspenseQuery 두 번 (Waterfall)
user  ├████████┤                    (0~2s)
posts           ├████████┤          (2~4s)  ← user가 끝나야 시작
총 4초

// useSuspenseQueries 한 번 (Parallel)
user  ├████████┤                    (0~2s)
posts ├████████┤                    (0~2s)  ← 같은 시점 출발
총 2초</code></pre>
</details>

병렬에서는 두 막대의 시작점이 거의 일직선으로 정렬되고, 전체 로딩이 가장 느린 요청 하나의 길이로 줄어듭니다.

**에러 격리** — `id`를 `0`으로 바꾸면 유저 요청이 실패합니다. `useSuspenseQueries`는 배열 중 하나라도 실패하면 그 에러를 위로 던지므로, `retry: false`와 함께라면 2초 뒤 곧장 `ErrorPage`로 교체됩니다. 병렬로 묶여도 실패 하나가 전체 영역을 안전하게 격리합니다.

---

## ⚠️ 5. 주의사항

- **개수가 고정일 때만 구조분해** — `const [a, b] = useSuspenseQueries(...)`는 요청 수가 정해졌을 때입니다. 목록처럼 개수가 런타임에 정해지면 `queries`를 배열로 생성해 넘기고 결과도 `.map`으로 다룹니다. 훅 규칙상 호출 자체를 조건문·반복문으로 감싸면 안 됩니다.

- **부분 로딩이 필요하면 Suspense를 나눕니다** — `useSuspenseQueries`는 묶인 요청이 전부 준비돼야 렌더됩니다. 유저는 먼저 보여주고 게시글만 나중에 채우고 싶다면, 두 컴포넌트로 나눠 각자 `Suspense`로 감쌉니다. 병렬성과 부분 표시는 별개의 선택입니다.

- **경쟁 상태는 여기서도 캐시 키 덕분** — `id`를 빠르게 바꿔도 마지막 요청 결과가 남는 이유는 "리액트가 렌더 타이밍을 조절해서"가 아니라, 응답이 각자 `queryKey`의 캐시에만 기록되기 때문입니다([2편](/posts/react-tanstack-query-server-state-sync/)과 같은 원리).

- **`FallbackComponent` vs `fallbackRender`** — 컴포넌트를 넘길 땐 `FallbackComponent`입니다. `fallbackRender`는 `(props) => ReactNode` 렌더 함수 자리입니다([5편](/posts/react-query-suspense-error-boundary/) 참고).

---

## ✅ 6. 핵심 정리

- **`useSuspenseQuery`의 순차 함정** — 한 컴포넌트에서 두 번 쓰면 첫 중단이 두 번째 호출을 막아 요청이 순차로 이어집니다. 2초 + 2초가 4초가 됩니다.

- **`useSuspenseQueries`가 병렬화합니다** — `queries` 배열로 묶으면 모든 요청이 같은 시점에 출발해, 총 시간이 가장 느린 하나로 줄어듭니다. 반환은 배열이고 각 `data`는 확정 타입입니다.

- **각 쿼리는 독립 옵션을 가집니다** — `staleTime` 등을 요청마다 다르게 둘 수 있고, 하나만 실패해도 그 에러가 경계에서 잡힙니다.

- **병렬 ≠ 부분 표시** — 전부 준비돼야 함께 렌더됩니다. 먼저 온 것부터 보여주려면 `Suspense`를 나눠 감쌉니다.

---

## 🔗 참고 자료

- 다음 편: [useMutation으로 서버 바꾸기 — 성공 후 캐시를 무효화해 화면 맞추기](/posts/react-query-usemutation-invalidate/)

- 이전 편: [선언적 데이터 페칭 — useSuspenseQuery로 로딩·에러를 컴포넌트 밖으로](/posts/react-query-suspense-error-boundary/)

- [TanStack Query 공식 문서 — useSuspenseQueries](https://tanstack.com/query/latest/docs/framework/react/reference/useSuspenseQueries)

- [TanStack Query 공식 문서 — Suspense](https://tanstack.com/query/latest/docs/framework/react/guides/suspense)

- [TkDodo 블로그 — React Query와 Suspense](https://tkdodo.eu/blog/react-query-and-react-context)
