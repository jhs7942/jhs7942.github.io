---
title: 'TanStack Query 데이터 생애주기: Fresh·Stale·Inactive와 isFetching의 정확한 의미'
slug: react-query-data-lifecycle
description: >-
  `staleTime`이 지나면 데이터가 "자동으로 갱신된다"는 흔한 오해를 바로잡습니다. stale은 즉시 재요청이 아니라 '다음 트리거가
  오면 갱신할 자격'이며, 그 트리거는 화면 클릭이 아니라 재마운트·윈도우 재포커스·재연결·수동 무효화입니다. `staleTime`
  2초·`gcTime` 5초로 가속한 실습 랩에서 Fresh·Stale·Inactive 전이를 Devtools 색으로 관찰하고,
  `isPending`과 `isFetching`이 각각 무엇을 가리키는지 구분합니다.
published_at: '2026-07-23T23:34:10-07:00'
labels:
  - AI 작성
  - 학습 정리
  - React
  - TypeScript
  - 서버 상태 관리
source: >-
  사용자 학습 노트 (서버 상태 관리 — 데이터 생애주기 Fresh/Stale/Inactive·isPending vs
  isFetching·refetch 트리거)
legacy_url: 'https://saver7942.blogspot.com/2026/07/tanstack-query-freshstaleinactive.html'
draft: false
---

[이전 편](https://saver7942.blogspot.com/2026/07/query-key-factory.html)까지 캐시의 주소를 다뤘습니다. 이번엔 그 주소에 담긴 데이터가 시간에 따라 어떤 상태를 지나는지입니다.

"`staleTime`이 지나면 데이터가 상한다"까지는 [2편](https://saver7942.blogspot.com/2026/07/tanstack-query.html)에서 값으로 정했습니다. 그런데 상한 다음이 문제입니다. 흔히 "상하면 엔진이 알아서 새로 가져온다"고 넘기는데, **stale이 됐다고 그 순간 재요청이 나가지는 않습니다.** 이 오해 하나가 "왜 갱신이 안 되지" 또는 반대로 "왜 요청이 이렇게 많지"를 만듭니다. 이 글은 데이터의 세 상태와, 갱신을 실제로 당기는 트리거가 무엇인지 실습으로 확인합니다.

#### 목차

1. [데이터의 세 상태 — Fresh · Stale · Inactive](#1-fresh-stale-inactive)

2. [핵심 — stale은 '즉시 갱신'이 아니라 '갱신 자격'](#2-stale)

3. [실습 랩 — 생애주기를 2초로 가속](#3-2)

4. [isPending과 isFetching — 최초 로딩과 배경 갱신](#4-ispending-isfetching)

5. [Devtools로 상태 전이 관찰](#5-devtools)

6. [주의사항](#6)

7. [핵심 정리](#7)

---

## 🔄 1. 데이터의 세 상태 — Fresh · Stale · Inactive

캐시에 올라온 데이터는 세 상태를 지납니다.

| 상태 | 의미 | 이 상태에서 재마운트하면 |
| :---: | :---: | :---: |
| Fresh | 서버 값과 일치한다고 보증하는 기간 | 요청 없이 캐시만 즉시 반환 |
| Stale | 서버와 다를 수 있다고 의심받는 상태 | 캐시를 먼저 보여주고 배경에서 재요청 |
| Inactive | 이 데이터를 쓰는 컴포넌트가 하나도 없음 | (해당 없음 — `gcTime` 타이머 작동) |

- **Fresh → Stale** 은 `staleTime`이 결정합니다. 기본값은 `0`이라, 별도 설정이 없으면 데이터는 도착하자마자 stale입니다.

- **Inactive** 는 시간이 아니라 **구독자 수**로 정해집니다. 그 데이터를 쓰던 컴포넌트가 전부 언마운트되면 inactive가 되고, 그때부터 `gcTime` 타이머가 돌아 만료되면 캐시가 메모리에서 삭제됩니다.

Fresh/Stale은 "얼마나 믿을 수 있는가", Inactive는 "아직 쓰이고 있는가"를 나타냅니다. 축이 다릅니다.

---

## 🎯 2. 핵심 — stale은 '즉시 갱신'이 아니라 '갱신 자격'

가장 자주 어긋나는 지점입니다. **`staleTime`이 지나도 그 자리에서 재요청이 나가지 않습니다.** stale이 된다는 것은 "다음 기회가 오면 다시 가져와도 좋다"는 자격을 얻는 것일 뿐입니다.

그 "기회"는 이벤트입니다. 데이터가 stale인 상태에서 아래 중 하나가 일어나면 배경 재요청(refetch)이 트리거됩니다.

| 트리거 | 옵션 | 기본값 |
| :---: | :---: | :---: |
| 쿼리를 쓰는 컴포넌트가 다시 마운트 | `refetchOnMount` | `true` |
| 브라우저 창이 다시 포커스를 얻음 | `refetchOnWindowFocus` | `true` |
| 네트워크가 다시 연결됨 | `refetchOnReconnect` | `true` |
| 코드에서 직접 무효화 | `invalidateQueries` 호출 | — |

두 가지가 여기서 갈립니다.

- **데이터가 Fresh라면** 위 이벤트가 와도 **아무 요청도 나가지 않습니다.** 창을 아무리 다시 클릭해도 조용합니다.

- **화면을 그냥 클릭하는 것은 트리거가 아닙니다.** 흔히 "클릭하면 갱신된다"고 오해하는데, 실제 트리거는 창이 **포커스를 잃었다가 되찾을 때**(다른 탭·창에 갔다 돌아올 때)입니다. 같은 페이지 안에서의 클릭은 포커스 이벤트가 아닙니다.

정리하면, 갱신은 `staleTime`이라는 시간과 트리거라는 이벤트가 **둘 다** 충족될 때 일어납니다. stale은 그중 시간 조건만 만족시킨 상태입니다.

---

## 🧪 3. 실습 랩 — 생애주기를 2초로 가속

기본값(`staleTime: 0`, `gcTime: 5분`)으로는 전이가 너무 빠르거나 느려 관찰하기 어렵습니다. `staleTime`을 2초, `gcTime`을 5초로 줄여 눈으로 따라갑니다.

```tsx
// src/App.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import LifecycleDemo from './components/LifecycleDemo';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 2, // 2초 뒤 Fresh → Stale
      gcTime: 1000 * 5,    // 언마운트 후 5초 뒤 캐시 삭제
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div style={{ padding: '2rem' }}>
        <h1>TanStack Query Lifecycle Lab</h1>
        <LifecycleDemo />
      </div>
      <ReactQueryDevtools initialIsOpen={true} />
    </QueryClientProvider>
  );
}
```

`queryFn`에 1초 지연을 넣어, 데이터가 도착하기 전(`isPending`)과 도착 후 배경 갱신(`isFetching`)을 구분할 여지를 둡니다.

```tsx
// src/api/mockApi.ts
export interface User { id: number; name: string; }

export const fetchUser = async (id: number): Promise<User> => {
  console.log(`📡 [Network Log] 유저 ${id} 동기화 시도`);
  return new Promise((resolve) => {
    setTimeout(() => resolve({ id, name: '시니어 아키텍트' }), 1000);
  });
};
```

```tsx
// src/components/LifecycleDemo.tsx
import { useQuery } from '@tanstack/react-query';
import { fetchUser } from '../api/mockApi';
import { userKeys } from '../queries/queryKeys';

export default function LifecycleDemo() {
  // data 타입은 fetchUser의 Promise<User>에서 추론됩니다
  const { data, isPending, isFetching, error } = useQuery({
    queryKey: userKeys.detail(1),
    queryFn: () => fetchUser(1),
  });

  if (isPending) return <div>⌛ 최초 데이터 로딩 중... (isPending)</div>;
  if (error) return <div>❌ 에러: {error.message}</div>;

  return (
    <div style={{ border: '2px solid #333', padding: '1.5rem', borderRadius: 12 }}>
      <h3>유저 이름: {data.name}</h3>
      {isFetching && <p style={{ color: '#007bff' }}>🔄 배경에서 최신화 중... (isFetching)</p>}
    </div>
  );
}
```

`queryKeys.ts`는 [이전 편](https://saver7942.blogspot.com/2026/07/query-key-factory.html)의 팩토리를 그대로 씁니다(`userKeys.detail(1)` → `['users','detail',1]`).

---

## 🚦 4. isPending과 isFetching — 최초 로딩과 배경 갱신

두 플래그를 혼동하면 로딩 UI가 엉뚱하게 뜹니다. 가리키는 대상이 다릅니다.

| 플래그 | 참이 되는 때 | 화면 의도 |
| :---: | :---: | :---: |
| `isPending` | 캐시에 데이터가 아예 없음 (최초) | 전체 로딩 화면 |
| `isFetching` | `queryFn`이 실행 중 (최초든 배경이든) | 조용한 갱신 표시 |

핵심은 **stale 데이터를 배경에서 다시 가져올 때**입니다. 이때 캐시에는 (낡았지만) 값이 있으므로 `isPending`은 `false`이고, 요청은 진행 중이므로 `isFetching`만 `true`가 됩니다.

<details style="margin:10px 0 4px">
<summary style="cursor:pointer;font-weight:700;color:#C8443C">두 플래그의 시간축</summary>
<pre><code>t=0.0s  최초 마운트, 캐시 없음
        isPending = true,  isFetching = true   → 전체 로딩 화면
t=1.0s  응답 도착, 캐시 채워짐 (Fresh)
        isPending = false, isFetching = false  → 데이터 표시
t=2.0s  staleTime 경과 → Stale (이 순간엔 아무 요청도 없음)
t=?     다른 탭 갔다 복귀(윈도우 재포커스) → 배경 refetch 시작
        isPending = false, isFetching = true   → 화면 유지 + 파란 갱신 표시
t=?+1s  갱신 완료 → Fresh 복귀
        isPending = false, isFetching = false</code></pre>
</details>

그래서 전체 로딩 스피너는 `isPending`에 물리고, "뒤에서 갱신 중" 같은 은근한 표시는 `isFetching`에 물립니다. 둘을 바꿔 쓰면 배경 갱신 때마다 화면이 통째로 스피너로 덮입니다.

---

## 🔍 5. Devtools로 상태 전이 관찰

`ReactQueryDevtools` 패널에서 쿼리 옆 색으로 상태를 직접 봅니다.

| 색 | 상태 |
| :---: | :---: |
| 초록 | Fresh |
| 노랑 | Stale |
| 파랑(테두리) | Fetching 중 |
| 회색 | Inactive |

**Fresh 테스트** — 최초 로딩 뒤 2초가 지나기 전에 다른 탭에 갔다 돌아옵니다. 데이터가 Fresh(초록)이므로 배경 갱신이 트리거되지 않습니다. 파란 `isFetching` 표시도 안 뜨고, 콘솔 `[Network Log]`도 늘지 않으면 성공입니다.

**Stale 테스트** — 2초가 지나 색이 노랑(Stale)으로 바뀐 것을 확인한 뒤, 다른 탭에 갔다 돌아옵니다.

<details style="margin:10px 0 4px">
<summary style="cursor:pointer;font-weight:700;color:#C8443C">실행 결과 보기</summary>
<pre><code>// 콘솔
📡 [Network Log] 유저 1 동기화 시도   ← 최초
📡 [Network Log] 유저 1 동기화 시도   ← 윈도우 재포커스로 배경 refetch

// 화면: 유저 이름은 그대로 유지, 파란 "배경에서 최신화 중" 잠깐 깜빡
// Devtools: 노랑 → (파란 테두리) → 초록</code></pre>
</details>

화면이 멈추지 않고 유지되면서 뒤에서만 갱신되는 것이 SWR의 실제 모습입니다.

**Inactive 테스트** — 컴포넌트를 언마운트하면 색이 회색(Inactive)으로 바뀌고 `gcTime`(5초) 타이머가 시작됩니다. 5초가 지나기 전에 다시 마운트하면 캐시가 살아 있어 즉시 표시되고(stale이면 배경 갱신), 5초가 지난 뒤면 캐시가 삭제돼 다시 `isPending`부터 시작합니다.

---

## ⚠️ 6. 주의사항

- **화면 클릭 ≠ refetch** — 트리거는 윈도우 **재포커스**(창이 포커스를 잃었다가 되찾음)입니다. 데스크톱에서 이미 포커스된 창을 그냥 클릭하면 포커스 이벤트가 없어 갱신되지 않습니다. 관찰하려면 다른 탭·앱에 갔다 돌아옵니다.

- **StrictMode 이중 마운트** — 개발 모드에서는 최초에 마운트→언마운트→재마운트가 일어나 `[Network Log]`가 예상보다 더 찍힐 수 있습니다. 정확한 횟수는 프로덕션 빌드나 Network 탭에서 확인합니다.

- **`gcTime`은 언마운트 후에 셉니다** — 컴포넌트가 화면에 떠 있는 동안은 아무리 시간이 지나도 캐시가 지워지지 않습니다. `gcTime`은 inactive가 된 순간부터의 타이머입니다.

- **`gcTime`은 `staleTime`보다 짧게 두지 않습니다** — 캐시가 stale이 되기도 전에 사라지면 배경 갱신을 관찰할 수 없습니다. 실습의 2초/5초처럼 `gcTime`을 더 길게 잡습니다.

- **기본 refetch 3종이 요청을 만듭니다** — `refetchOnMount`·`refetchOnWindowFocus`·`refetchOnReconnect`가 모두 기본 `true`입니다. 요청이 예상보다 잦다면 대개 이 셋 중 하나입니다. 데이터 성격에 따라 끄거나 `staleTime`을 늘려 조절합니다.

---

## ✅ 7. 핵심 정리

- **세 상태의 축이 다릅니다.** Fresh/Stale은 신뢰도(`staleTime`), Inactive는 사용 여부(구독자 수 → `gcTime`)입니다.

- **stale은 즉시 갱신이 아니라 갱신 자격입니다.** 재요청은 stale인 상태에서 트리거(재마운트·윈도우 재포커스·재연결·수동 무효화)가 왔을 때만 일어납니다. Fresh면 트리거가 와도 요청이 없습니다.

- **`isPending`과 `isFetching`은 다릅니다.** 캐시가 비었을 때가 `isPending`, `queryFn`이 도는 중이 `isFetching`입니다. 배경 갱신은 `isPending: false` · `isFetching: true`이므로, 전체 스피너는 `isPending`에만 물립니다.

- **`gcTime`은 언마운트 이후의 타이머입니다.** inactive가 되고 나서 만료돼야 캐시가 삭제되고, 그 전에 다시 마운트하면 캐시를 재사용합니다.

- **다음 단계는 이 캐시를 직접 바꾸는 쪽입니다.** 지금까지는 읽고(`useQuery`) 그 상태를 관찰했습니다. `useMutation`으로 서버를 수정한 뒤 팩토리 키로 무효화하면, stale → 트리거 → 갱신의 흐름을 코드가 능동적으로 일으키게 됩니다.

---

## 🔗 참고 자료

- 다음 편: [선언적 데이터 페칭 — useSuspenseQuery로 로딩·에러를 컴포넌트 밖으로](https://saver7942.blogspot.com/2026/07/usesuspensequery.html)

- 이전 편: [Query Key Factory — 캐시 주소를 오타 없이, 계층으로 관리하기](https://saver7942.blogspot.com/2026/07/query-key-factory.html)

- [TanStack Query 공식 문서 — Important Defaults](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults)

- [TanStack Query 공식 문서 — Caching 예시](https://tanstack.com/query/latest/docs/framework/react/guides/caching)

- [TkDodo 블로그 — Practical React Query](https://tkdodo.eu/blog/practical-react-query)
