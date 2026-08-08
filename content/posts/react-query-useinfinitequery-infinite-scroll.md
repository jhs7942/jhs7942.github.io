---
title: '무한 스크롤: 수동 상태의 늪에서 useInfiniteQuery로'
slug: react-query-useinfinitequery-infinite-scroll
description: >-
  무한 스크롤을 `useState`로 직접 만들면 누적 배열·페이지 번호·다음 페이지 여부·로딩까지 네 개의 상태를 손으로 관리하게 되고,
  광클 시 중복 데이터·새로고침 시 유실 같은 버그가 따라옵니다. `useInfiniteQuery`는 이 네 상태를 `pages` 구조와
  `initialPageParam`·`getNextPageParam`으로 대체합니다. 수동 구현의 함정을 먼저 짚고, 같은 화면을 전용 훅으로
  옮겨 무엇이 사라지는지 확인합니다.
published_at: '2026-07-26T23:36:59-07:00'
labels:
  - AI 작성
  - 학습 정리
  - React
  - TypeScript
  - 서버 상태 관리
source: >-
  사용자 학습 노트 (서버 상태 관리 — 무한 스크롤 수동 구현의 늪 /
  useInfiniteQuery·pageParam·getNextPageParam)
legacy_url: 'https://saver7942.blogspot.com/2026/07/useinfinitequery.html'
draft: false
---

[이전 편](https://saver7942.blogspot.com/2026/07/onmutate-0-ux.html)까지 읽기·쓰기·낙관적 업데이트를 다뤘습니다. 이번엔 읽기의 특수한 형태 — **무한 스크롤**입니다.

무한 스크롤은 일반 페이지네이션과 성격이 다릅니다. 페이지네이션은 현재 페이지 데이터만 갈아 끼우면 되지만, 무한 스크롤은 **과거 데이터를 보존하면서 새 데이터를 이어 붙이는 누적형**입니다. 이 누적이 `useState`로 옮겨지는 순간 상태가 비대해지기 시작합니다. 이 편은 그 늪을 먼저 겪고, `useInfiniteQuery`로 빠져나옵니다.

#### 목차

1. [누적형이라는 차이](#1)

2. [수동 구현의 늪 — 네 개의 상태](#2)

3. [useInfiniteQuery — pages와 네 옵션](#3-useinfinitequery-pages)

4. [무엇이 사라졌나 — before/after](#4-beforeafter)

5. [렌더링 — pages를 펼치기](#5-pages)

6. [주의사항](#6)

7. [핵심 정리](#7)

---

## 📜 1. 누적형이라는 차이

무한 스크롤은 사용자가 리스트 끝에 닿을 때마다 다음 데이터를 불러와 **뒤에 이어 붙입니다.** 화면에는 1페이지부터 지금까지의 모든 항목이 함께 남아 있어야 합니다.

이 "함께 남아 있어야 함"이 핵심입니다. 지금까지의 `useQuery`는 키가 바뀌면 이전 데이터를 새 데이터로 교체했습니다. 무한 스크롤은 교체가 아니라 축적이라, 그대로 옮기면 페이지마다 별도 캐시가 생기거나 직접 배열을 합쳐야 합니다. 그래서 전용 훅이 따로 있습니다.

---

## 🌊 2. 수동 구현의 늪 — 네 개의 상태

먼저 라이브러리 없이 만들어 봅니다. 페이지당 10개, 5페이지가 끝인 API입니다.

```tsx
// src/api/mockApi.ts
export interface Post { id: number; title: string; }

export const fetchPosts = async (page: number): Promise<Post[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (page > 5) return resolve([]); // 5페이지가 마지막
      resolve(Array.from({ length: 10 }, (_, i) => ({
        id: (page - 1) * 10 + i + 1,
        title: `${page}페이지 ${i + 1}번째 글`,
      })));
    }, 1000);
  });
};
```

수동 컴포넌트는 상태 네 개로 시작합니다.

```tsx
// src/components/ManualScroll.tsx
import { useState } from 'react';
import { fetchPosts } from '../api/mockApi';
import type { Post } from '../api/mockApi';

export default function ManualScroll() {
  const [posts, setPosts] = useState<Post[]>([]);       // 누적 데이터
  const [page, setPage] = useState(1);                   // 다음에 요청할 페이지
  const [hasNext, setHasNext] = useState(true);          // 더 있는지
  const [isFetching, setIsFetching] = useState(false);   // 요청 중인지

  const fetchMore = async () => {
    if (!hasNext || isFetching) return;   // 중복 호출 수동 가드
    setIsFetching(true);
    try {
      const next = await fetchPosts(page);
      if (next.length === 0) setHasNext(false);
      else {
        setPosts((prev) => [...prev, ...next]); // 손으로 이어 붙이기
        setPage((prev) => prev + 1);            // 페이지 수동 증가
      }
    } finally {
      setIsFetching(false);
    }
  };

  return (
    <div>
      <ul>{posts.map((p) => <li key={p.id}>{p.title}</li>)}</ul>
      {hasNext && (
        <button onClick={fetchMore} disabled={isFetching}>
          {isFetching ? '로딩 중...' : '더 보기'}
        </button>
      )}
    </div>
  );
}
```

동작은 합니다. 문제는 이 네 상태를 사람이 계속 손으로 맞춰야 한다는 것입니다.

- **누적 배열** — `[...prev, ...next]`로 매번 새 배열을 만듭니다. 항목이 수천 개가 되면 이 복사가 무거워집니다.

- **페이지 계산** — `page`를 직접 1씩 올리고, 빈 배열이 오면 `hasNext`를 손으로 내립니다.

- **중복 호출** — `if (!hasNext || isFetching) return` 가드를 빠뜨리면, 버튼을 빠르게 두 번 눌렀을 때 같은 페이지가 두 번 붙습니다.

- **새로고침 유실** — 상태가 컴포넌트 안에 있어, 3페이지까지 봤어도 새로고침하면 전부 사라집니다.

1편에서 본 그 구조 — 서버 데이터를 컴포넌트가 소유해서 생기는 문제 — 가 무한 스크롤에서 더 커진 모습입니다.

---

## 🔁 3. useInfiniteQuery — pages와 네 옵션

같은 화면을 `useInfiniteQuery`로 옮깁니다. 네 상태가 네 개의 설정으로 바뀝니다.

```tsx
// src/components/InfiniteScroll.tsx
import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchPosts } from '../api/mockApi';

export default function InfiniteScroll() {
  const {
    data, fetchNextPage, hasNextPage, isFetchingNextPage, status,
  } = useInfiniteQuery({
    queryKey: ['posts', 'infinite'],

    // pageParam이 각 요청의 페이지 번호로 들어온다
    queryFn: ({ pageParam }) => fetchPosts(pageParam),

    // 첫 요청의 pageParam (v5에서 필수)
    initialPageParam: 1,

    // 다음 pageParam을 계산. undefined를 반환하면 "더 없음"
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length < 10 ? undefined : allPages.length + 1,
  });

  if (status === 'pending') return <p>로딩 중...</p>;
  if (status === 'error') return <p>에러가 발생했습니다.</p>;

  return (
    <div>
      <ul>
        {data.pages.flatMap((page) => page).map((post) => (
          <li key={post.id}>{post.title}</li>
        ))}
      </ul>
      {hasNextPage && (
        <button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
          {isFetchingNextPage ? '로딩 중...' : '더 보기'}
        </button>
      )}
    </div>
  );
}
```

네 옵션의 역할입니다.

- **`queryFn: ({ pageParam }) => ...`** — 일반 `useQuery`와 달리 `pageParam`을 받습니다. 이 값이 "지금 몇 페이지를 요청하는가"입니다.

- **`initialPageParam`** — 첫 `pageParam`입니다. v5에서 새로 필수가 됐습니다(v4에는 없던 항목이라 마이그레이션 시 자주 놓칩니다).

- **`getNextPageParam(lastPage, allPages)`** — 다음 `pageParam`을 계산합니다. `undefined`를 반환하면 `hasNextPage`가 `false`가 됩니다. 위에서는 마지막 페이지 길이가 10 미만이면(= 더 없음) `undefined`를 돌려줍니다. 빈 배열이 올 때까지 한 번 더 요청하는 것보다, 개수로 판단하는 편이 헛요청이 없습니다.

- **`fetchNextPage()`** — 다음 페이지를 불러오는 트리거입니다. 이미 요청 중이면 라이브러리가 중복 호출을 무시합니다.

---

## 📊 4. 무엇이 사라졌나 — before/after

수동 네 상태가 전부 훅의 반환값·옵션으로 흡수됩니다.

| 수동 상태 | useInfiniteQuery |
| :---: | :---: |
| `posts` 누적 배열 | `data.pages` (자동 축적) |
| `page` 수동 증가 | `getNextPageParam` 반환값 |
| `hasNext` 수동 전환 | `hasNextPage` (반환) |
| `isFetching` 수동 토글 | `isFetchingNextPage` (반환) |
| 중복 호출 가드 | `fetchNextPage`가 내부 처리 |

`setPosts((prev) => [...prev, ...next])` 같은 명령형 코드가 사라지고, "다음 페이지 번호를 어떻게 구하는가"만 `getNextPageParam`에 선언합니다. 새로고침 유실도 해결됩니다 — 데이터가 컴포넌트가 아니라 캐시에 있으므로, `staleTime` 안이면 재마운트 시 캐시에서 즉시 복원됩니다.

---

## 🧩 5. 렌더링 — pages를 펼치기

한 가지 새로운 점은 `data`의 모양입니다. `useInfiniteQuery`의 `data`는 단순 배열이 아니라 **페이지들의 배열**입니다.

```tsx
// data.pages 구조
{
  pages: [
    [ {id:1}, ...{id:10} ],   // 1페이지
    [ {id:11}, ...{id:20} ],  // 2페이지
  ],
  pageParams: [1, 2],
}
```

그래서 화면에 그릴 때는 페이지 경계를 없애고 하나의 리스트로 펼칩니다.

```tsx
{data.pages.flatMap((page) => page).map((post) => (
  <li key={post.id}>{post.title}</li>
))}
```

`flatMap`으로 페이지들을 이어 붙여 평평한 배열로 만든 뒤 렌더합니다. 페이지 구분을 유지한 채(예: "2페이지" 구분선) 그리고 싶다면 `pages`를 그대로 이중 순회하면 됩니다.

---

## ⚠️ 6. 주의사항

- **`initialPageParam`을 빠뜨리지 않습니다** — v5 필수입니다. 없으면 타입 오류 또는 첫 요청 실패로 이어집니다.

- **`getNextPageParam`은 마지막 페이지 기준으로 판단합니다** — 빈 배열이 올 때까지 요청하기보다, 페이지 크기(여기선 10) 미만이면 끝으로 간주하는 편이 헛요청을 줄입니다. 서버가 `nextCursor`를 준다면 그 값을 그대로 반환하는 커서 방식이 더 정확합니다.

- **`staleTime`을 반드시 둡니다** — 무한 스크롤에서 이게 특히 중요합니다. `staleTime`이 기본값 `0`이면, 사용자가 다른 탭에 갔다 돌아오는 순간(윈도우 재포커스) 지금까지 쌓인 **모든 페이지가 한꺼번에** 재요청됩니다. 20~30페이지를 봤다면 그만큼의 요청이 동시에 나가 서버에 부담을 줍니다. 몇 분의 신선도를 부여해 이 재요청 폭풍을 막습니다([4편](https://saver7942.blogspot.com/2026/07/tanstack-query-freshstaleinactive.html)의 stale 트리거가 누적 페이지 전체에 적용되기 때문입니다).

- **`maxPages`로 메모리 상한을 둡니다** — 사용자가 100페이지까지 내려가면 그만큼 `pages`가 메모리에 쌓입니다. `maxPages: 5`처럼 두면 최신 5페이지만 유지하고 오래된 페이지는 캐시에서 비웁니다. 화면에 실제로 그리는 항목만 남기는 가상 리스트(virtual list)와 함께 쓰면 메모리 점유를 크게 낮출 수 있습니다.

- **버튼 대신 Intersection Observer** — 실서비스는 "더 보기" 버튼 대신 리스트 끝의 감시용 요소가 화면에 들어오면 `fetchNextPage`를 부릅니다. 이때도 데이터 로직은 `useInfiniteQuery`에 그대로 두고, `IntersectionObserver`는 트리거만 담당하게 분리합니다.

- **개별 항목 수정은 setQueryData로** — 목록 중 하나를 고칠 때 수천 개 배열을 순회하는 대신, `setQueryData`로 해당 페이지의 그 항목만 바꾸거나 `invalidateQueries`로 다시 받습니다([7편](https://saver7942.blogspot.com/2026/07/usemutation.html) 참고).

- **양방향·역방향** — 채팅처럼 위로도 불러와야 하면 `getPreviousPageParam`과 `fetchPreviousPage`가 대칭으로 있습니다.

---

## ✅ 7. 핵심 정리

- **무한 스크롤은 누적형입니다.** 교체가 아니라 축적이라, 수동으로 하면 누적 배열·페이지·다음 여부·로딩 네 상태를 사람이 계속 맞춰야 합니다.

- **`useInfiniteQuery`가 네 상태를 흡수합니다.** `data.pages`가 축적을, `getNextPageParam`이 페이지 계산과 종료 판단을, `hasNextPage`·`isFetchingNextPage`가 상태 노출을 맡습니다.

- **`initialPageParam`(v5 필수)과 `getNextPageParam`이 설계의 중심입니다.** 다음 페이지를 어떻게 구하고 언제 끝나는지만 선언하면 나머지는 훅이 처리합니다.

- **`data.pages`는 페이지들의 배열입니다.** 화면에는 `flatMap`으로 펼쳐 그리고, 개별 항목 수정·무한 트리거는 앞 편들의 도구(`setQueryData`·`invalidateQueries`·Intersection Observer)와 조합합니다.

---

## 🔗 참고 자료

- 다음 편: [프리페칭으로 로딩 없는 UX — 호버 prefetchQuery와 IntersectionObserver](https://saver7942.blogspot.com/2026/07/ux-prefetchquery-intersectionobserver.html)

- 이전 편: [낙관적 업데이트 — onMutate·롤백·최종 동기화로 0초 UX 만들기](https://saver7942.blogspot.com/2026/07/onmutate-0-ux.html)

- [TanStack Query 공식 문서 — Infinite Queries](https://tanstack.com/query/latest/docs/framework/react/guides/infinite-queries)

- [TanStack Query 공식 문서 — v5 마이그레이션(initialPageParam)](https://tanstack.com/query/latest/docs/framework/react/guides/migrating-to-v5)

- [TkDodo 블로그 — Infinite Queries](https://tkdodo.eu/blog/react-query-fa-qs)
