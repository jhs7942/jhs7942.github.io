---
title: '프리페칭으로 로딩 없는 UX: 호버 prefetchQuery와 IntersectionObserver'
slug: react-query-prefetching
description: >-
  가장 좋은 로딩 UI는 로딩이 아예 없는 것입니다. 사용자가 필요로 하기 직전에 데이터를 미리 캐시에 채우는 프리페칭을 두 방식으로
  구현합니다. 마우스 호버에 반응하는 명령형 `prefetchQuery`와, 리스트 바닥에 닿기 전 다음 페이지를 당기는 가시성 기반
  `IntersectionObserver`입니다. 후자는 스크롤 이벤트 대신 브라우저가 요소의 노출을 감지하는 표준 API로, 라인별로 뜯어
  동작을 정리합니다.
published_at: '2026-07-27T00:38:59-07:00'
labels:
  - AI 작성
  - 학습 정리
  - React
  - TypeScript
  - 서버 상태 관리
source: 사용자 학습 노트 (서버 상태 관리 — 프리페칭 prefetchQuery 호버·IntersectionObserver 무한스크롤 트리거)
legacy_url: >-
  https://saver7942.blogspot.com/2026/07/ux-prefetchquery-intersectionobserver.html
draft: false
series: react-query
part: 9
---

[이전 편](/posts/react-query-useinfinitequery-infinite-scroll/)에서 무한 스크롤을 "더 보기" 버튼으로 만들면서, 실서비스에서는 버튼 대신 감시 요소로 `fetchNextPage`를 부른다고 예고했습니다. 이번 편이 그 구현이자, 한 걸음 더 나아간 이야기입니다.

유튜브나 인스타그램에서 로딩을 거의 느끼지 못하는 이유는, 지금 보는 콘텐츠 **바로 아래**의 데이터를 앱이 백그라운드에서 미리 받아 두기 때문입니다. 이 기법이 **프리페칭(prefetching)** 입니다. TanStack Query에서는 두 가지 트리거로 구현합니다 — 사용자의 행동(호버)에 반응하는 **명령형** 방식과, 요소가 화면에 보이는지를 감지하는 **가시성 기반** 방식입니다.

---

## 🛰️ 1. 프리페칭이란 — 로딩을 없애는 발상

프리페칭은 사용자가 데이터를 요청하기 **직전에** 백그라운드에서 캐시를 미리 채우는 전략입니다. 데이터가 이미 캐시에 있으면, 실제로 필요해진 순간 요청 없이 즉시 화면에 뜹니다. 로딩 스피너를 볼 틈이 없습니다.

두 가지 트리거를 이 편에서 다룹니다.

| 방식 | 트리거 | 도구 |
| :---: | :---: | :---: |
| 명령형 | 마우스 호버 등 사용자 행동 | `queryClient.prefetchQuery` |
| 가시성 기반 | 요소가 화면에 노출됨 | `IntersectionObserver` + `fetchNextPage` |

실습 시나리오는 이렇습니다. 목록에서 게시글 제목에 마우스를 올리면 상세 내용을 미리 가져오고(호버), 리스트 바닥에 닿기 전 다음 페이지를 미리 당깁니다(가시성).

---

## 🖱️ 2. 호버 프리페칭 — 클릭 직전의 찰나를 산다

사용자가 항목을 클릭하기 전, 마우스를 올려 둔 100~300ms의 짧은 시간이 있습니다. 이 찰나에 상세 데이터를 미리 가져옵니다.

```tsx
const queryClient = useQueryClient();

const handleMouseEnter = (id: number) => {
  queryClient.prefetchQuery({
    queryKey: ['post', id],           // 상세 화면이 쓸 바로 그 키
    queryFn: () => fetchPostById(id),
    staleTime: 1000 * 60 * 5,
  });
};

// <li onMouseEnter={() => handleMouseEnter(post.id)} onClick={() => onSelect(post.id)}>
```

- **`prefetchQuery`** — `useQuery`와 거의 같은 인자를 받지만, 화면에 값을 반환하지 않고 **캐시만 채웁니다.** 이미 그 키에 신선한 데이터가 있으면 요청조차 하지 않습니다.

- **키가 상세 화면과 같아야 합니다** — `['post', id]`는 상세 컴포넌트의 `useQuery`가 쓸 키와 정확히 일치해야 합니다. 그래야 진입 시 이 캐시를 그대로 씁니다([3편](/posts/react-query-key-factory/)에서 키를 팩토리로 관리한 이유가 여기서도 살아납니다).

- **중복은 엔진이 합칩니다** — 프리페칭이 진행 중일 때 사용자가 클릭해도, 같은 키의 요청은 새로 나가지 않고 진행 중인 것을 재사용합니다([2편](/posts/react-tanstack-query-server-state-sync/)의 중복 제거와 같은 동작).

---

## 🔭 3. IntersectionObserver — 바닥에 닿기 전 미리 당긴다

무한 스크롤의 두 번째 트리거입니다. `IntersectionObserver`는 **특정 DOM 요소가 화면에 보이기 시작하는 순간**을 감지하는 브라우저 API입니다. 리스트 맨 아래에 감시용 빈 요소(sentinel)를 두고, 그것이 화면에 들어오면 = 사용자가 리스트 끝까지 스크롤했다는 신호로 삼아 다음 페이지를 당깁니다.

먼저 감시 대상이 될 요소입니다. 리스트 맨 아래에 둔 40px짜리 빈 div입니다.

```tsx
const loadMoreRef = useRef<HTMLDivElement>(null);

// ...리스트 아래에
<div ref={loadMoreRef} style={{ height: 40 }}>
  {isFetchingNextPage && '🛰️ 다음 데이터를 당겨오는 중...'}
</div>
```

이 요소를 감시하는 부분입니다.

```tsx
useEffect(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    { threshold: 0.1 }
  );

  if (loadMoreRef.current) observer.observe(loadMoreRef.current);
  return () => observer.disconnect();
}, [hasNextPage, isFetchingNextPage, fetchNextPage]);
```

한 줄씩 뜯어봅니다.

- **`(entries) => {...}`** — 감시 대상의 "보임 상태"가 바뀔 때마다 브라우저가 자동으로 부르는 콜백입니다. `entries`는 관찰 중인 요소들의 배열인데, 여기선 하나만 감시하니 `entries[0]`입니다.

- **`entries[0].isIntersecting`** — 그 div가 **지금 화면에 보이는가**(`true`/`false`)입니다. 스크롤을 내려 화면에 들어오면 `true`가 됩니다.

- **조건 세 개** — 화면에 보이고(`isIntersecting`) + 다음 페이지가 남아 있고(`hasNextPage`) + 지금 가져오는 중이 아니면(`!isFetchingNextPage`) 다음 페이지를 부릅니다. 뒤의 둘은 **중복 요청을 막는 가드**입니다.

- **`{ threshold: 0.1 }`** — 대상의 10%만 보여도 "교차했다"로 판정합니다. 값이 클수록 더 많이 보여야 발동합니다.

- **`observer.observe(...)`** — 실제로 감시를 시작합니다. 이 호출이 있어야 콜백이 작동합니다.

- **`return () => observer.disconnect()`** — 클린업입니다. 이펙트가 다시 실행되기 전이나 컴포넌트가 사라질 때 감시를 해제해, observer가 중복 생성되거나 메모리에 남는 것을 막습니다.

- **의존성 `[hasNextPage, isFetchingNextPage, fetchNextPage]`** — 이 값들이 바뀌면 observer를 새로 만듭니다. 콜백은 만들어질 당시의 값을 **클로저로 붙잡기** 때문에, 값이 바뀌었는데 observer를 새로 안 만들면 콜백이 옛 값을 참조해 조건 판정이 어긋납니다.

<details style="margin:10px 0 4px">
<summary style="cursor:pointer;font-weight:700;color:#C8443C">스크롤에 따른 동작 흐름</summary>
<pre><code>1. 리스트 렌더 → 맨 아래에 감시용 div 존재
2. 사용자가 스크롤 → 감시 div가 화면에 10% 보임 → isIntersecting: true
3. 다음 페이지 있고 로딩 중 아니면 → fetchNextPage()
4. 새 페이지가 붙어 리스트가 길어짐 → 감시 div가 다시 아래로 밀려남 → isIntersecting: false
5. 또 스크롤 → 2번부터 반복</code></pre>
</details>

**왜 스크롤 이벤트 대신 이걸 쓰나요.** `onScroll`로 만들면 스크롤할 때마다 초당 수십~수백 번 콜백이 돌아 성능 부담이 크고, "끝에 닿았는지"를 `scrollHeight`·`scrollTop` 계산으로 직접 재야 합니다. `IntersectionObserver`는 브라우저가 최적화해 요소가 실제로 교차할 때만 콜백을 부르므로 가볍고 코드도 단순합니다. 감시 div를 리스트 진짜 끝보다 살짝 위에 두거나 `rootMargin: '200px'`을 주면, 사용자가 바닥에 닿기 200px 전에 미리 당겨 스크롤이 끊기지 않습니다.

---

## ⚡ 4. 캐시 히트 — 상세 진입 시 로딩이 사라진다

호버로 프리페칭해 둔 데이터가 상세 화면에서 어떻게 즉시 뜨는지입니다. 상세 컴포넌트는 평범한 `useQuery`입니다.

```tsx
export default function PostDetail({ id }: { id: number }) {
  const { data: post, isPending } = useQuery({
    queryKey: ['post', id],           // 호버 때 프리페칭한 그 키
    queryFn: () => fetchPostById(id),
    staleTime: 1000 * 60 * 5,         // 프리페칭과 맞춰 배경 재요청까지 없앤다
  });

  if (isPending) return <div>로딩 중...</div>; // 프리페칭 성공 시 여기 안 걸림
  return <article><h2>{post.title}</h2><p>{post.body}</p></article>;
}
```

목록에서 이미 `['post', id]`로 캐시를 채웠다면, 이 `useQuery`는 캐시를 즉시 만나 `isPending`이 `false`가 됩니다. 로딩 화면을 거치지 않고 바로 그려집니다.

여기서 [4편](/posts/react-query-data-lifecycle/)의 구분을 정확히 적용해야 합니다. **로딩 스피너가 사라지는 것은 캐시가 있기 때문(`gcTime`)이고, 진입 직후의 배경 재요청까지 없애는 것은 `staleTime` 덕분입니다.** 프리페칭에만 `staleTime`을 주고 상세 `useQuery`에는 주지 않으면, 화면은 즉시 뜨지만 진입하는 순간 데이터가 stale로 간주돼 배경 재요청이 한 번 더 나갑니다(스피너는 안 뜹니다). 두 곳의 `staleTime`을 맞춰야 재요청까지 완전히 없어집니다.

---

## 🏛️ 5. 언제 프리페칭하나 — 의도를 읽는 설계

프리페칭은 공짜가 아닙니다. 미리 가져온 데이터는 서버 요청과 사용자 데이터를 소비합니다. 그래서 "무조건 다 미리"는 오히려 낭비입니다.

- **자원의 균형** — 사용자가 보지도 않을 데이터를 무한정 프리페칭하면 서버 비용과 데이터 낭비만 늘어납니다. "곧 클릭할 것 같은 찰나"(호버)나 "곧 필요해질 것"(다음 페이지)처럼, **의도가 읽히는 순간**만 노립니다.

- **호버가 좋은 신호인 이유** — 마우스를 올렸다는 것은 관심의 표현이고, 클릭까지 100~300ms의 여유가 있습니다. 이 짧은 시간이 상세 요청을 끝내기에 충분할 때가 많습니다.

- **모바일에는 호버가 없습니다** — 터치 환경에서는 호버 대신 화면에 보이는 항목을 기준으로 프리페칭하거나, 다음 페이지 프리페칭에 집중합니다.

---

## ⚠️ 6. 주의사항

- **프리페칭과 소비처의 `staleTime`을 맞춥니다** — 앞서 본 대로, 프리페칭에만 `staleTime`을 주면 진입 시 배경 재요청이 남습니다. 로딩 스피너는 캐시로 없애고, 재요청은 양쪽 `staleTime`으로 없앱니다.

- **키가 정확히 같아야 캐시가 연결됩니다** — 프리페칭 키와 소비처 `useQuery` 키가 한 글자라도 다르면 별개 캐시가 되어 프리페칭이 무용지물입니다. 키를 팩토리로 관리하면 이 실수를 막습니다.

- **감시 요소의 클린업을 잊지 않습니다** — `IntersectionObserver`는 `useEffect`의 반환에서 `disconnect()`로 반드시 해제합니다. 빠뜨리면 관찰이 중첩돼 `fetchNextPage`가 여러 번 불릴 수 있습니다.

- **리스트가 화면보다 짧으면 연쇄 로드** — 감시 div가 처음부터 보이면 여러 페이지가 잇달아 자동 로드됩니다. `hasNextPage`/`!isFetchingNextPage` 가드가 폭주는 막지만, "한 화면 채울 만큼만" 원하면 `rootMargin`이나 페이지 크기를 조절합니다.

- **호버 프리페칭 남발 주의** — 마우스가 목록을 빠르게 지나가면 스치는 항목마다 요청이 나갈 수 있습니다. 민감하면 짧은 디바운스로 "잠깐 머문" 항목만 프리페칭합니다.

---

## ✅ 7. 핵심 정리

- **최고의 로딩 UI는 로딩이 없는 것입니다.** 필요해지기 직전에 캐시를 채우면, 실제 진입 시 요청 없이 즉시 뜹니다.

- **두 트리거를 씁니다.** 사용자 행동에 반응하는 명령형 `prefetchQuery`(호버)와, 요소 노출을 감지하는 `IntersectionObserver`(다음 페이지)입니다.

- **`IntersectionObserver`는 스크롤 이벤트의 대안입니다.** 감시용 요소가 화면에 들어오는 순간만 콜백이 돌아 가볍고, 클린업(`disconnect`)과 의존성 관리(클로저 최신화)가 핵심입니다.

- **캐시 히트에는 두 축이 있습니다.** 스피너 실종은 캐시(`gcTime`), 배경 재요청 억제는 `staleTime`. 프리페칭과 소비처의 `staleTime`을 맞춰야 완전한 "0 로딩"이 됩니다.

- **프리페칭은 의도를 읽어 절제합니다.** 곧 클릭할 항목, 곧 필요할 페이지만 노려 자원 낭비를 피합니다.

---

## 🔗 참고 자료

- 다음 편: [검색 UX 깜빡임 없애기 — keepPreviousData와 디바운스](/posts/react-query-keep-previous-data-search/)

- 이전 편: [무한 스크롤 — 수동 상태의 늪에서 useInfiniteQuery로](/posts/react-query-useinfinitequery-infinite-scroll/)

- [TanStack Query 공식 문서 — Prefetching](https://tanstack.com/query/latest/docs/framework/react/guides/prefetching)

- [MDN — Intersection Observer API](https://developer.mozilla.org/ko/docs/Web/API/Intersection_Observer_API)

- [TkDodo 블로그 — Prefetching](https://tkdodo.eu/blog/prefetching-with-react-query)
