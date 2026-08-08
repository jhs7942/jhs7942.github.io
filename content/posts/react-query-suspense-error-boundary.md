---
title: '선언적 데이터 페칭: useSuspenseQuery로 로딩·에러를 컴포넌트 밖으로'
slug: react-query-suspense-error-boundary
description: >-
  `if (isPending)`·`if (error)` 분기를 컴포넌트마다 반복하는 명령형 페칭을, `useSuspenseQuery`로
  걷어냅니다. 로딩은 부모의 `Suspense`가, 에러는 `ErrorBoundary`가 맡고, 컴포넌트는 "데이터가 있을 때의 화면"만
  그립니다. 대신 `data`가 항상 존재해 옵셔널 체이닝이 사라지는 이점과, 여러 쿼리를 순차로 만들 수 있는 waterfall 함정 같은
  트레이드오프를 함께 정리합니다.
published_at: '2026-07-23T23:36:04-07:00'
labels:
  - AI 작성
  - 학습 정리
  - React
  - TypeScript
  - 서버 상태 관리
source: 사용자 학습 노트 (서버 상태 관리 — useSuspenseQuery·Suspense·ErrorBoundary 선언적 페칭)
legacy_url: 'https://saver7942.blogspot.com/2026/07/usesuspensequery.html'
draft: false
series: react-query
part: 4
---

[이전 편](/posts/react-query-data-lifecycle/)까지 `useQuery`가 돌려주는 `isPending`·`isFetching`·`error`를 컴포넌트 안에서 분기했습니다. 화면 하나마다 `if (isPending) return ...`, `if (error) return ...`가 데이터를 그리는 코드 위에 얹힙니다. 이건 "로딩이면 이걸 켜고, 에러면 저걸 켜라"는 **명령형** 방식입니다.

이번 편은 그 분기를 컴포넌트 밖으로 들어냅니다. 컴포넌트는 "데이터가 있을 때 무엇을 그릴지"만 선언하고, 로딩과 에러라는 **상태 전환의 책임을 부모에게 위임**합니다. `useSuspenseQuery` + `Suspense` + `ErrorBoundary` 조합입니다.

---

## 🎭 1. 명령형에서 선언형으로 — 무엇을 걷어내나

명령형은 과정을 하나하나 지시합니다. 주방에 들어가 "불을 켜라, 팬을 올려라"를 일일이 참견하는 방식입니다. 선언형은 결과만 선언합니다. 손님이 "음식이 나오면 이 자리에 놓고, 재료가 떨어졌으면 알려 달라"고 말해 두고 과정은 주방에 맡깁니다.

데이터 페칭에 옮기면, 지금까지 컴포넌트가 짊어지던 세 가지 — 로딩 화면, 에러 화면, "데이터가 아직 없을 수 있음"에 대한 방어 — 를 각각 다른 곳에 위임합니다.

| 책임 | 명령형(useQuery) | 선언형 |
| :---: | :---: | :---: |
| 로딩 표시 | 컴포넌트 안 `if (isPending)` | 부모 `<Suspense fallback>` |
| 에러 표시 | 컴포넌트 안 `if (error)` | 부모 `<ErrorBoundary>` |
| 데이터 방어 | `data?.name` 옵셔널 체이닝 | 불필요 (`data` 항상 존재) |

컴포넌트 안에는 "데이터가 있을 때의 화면"만 남습니다.

---

## 🎬 2. useSuspenseQuery — data가 항상 존재한다

`useSuspenseQuery`는 데이터가 준비되지 않으면 그 자리에서 컴포넌트 실행을 **중단(suspend)** 합니다. 리액트에게 "데이터를 기다리는 중이니 준비되면 다시 부르라"는 신호를 던지고, 제어를 상위로 넘깁니다.

```tsx
// src/components/UserProfile.tsx
import { useSuspenseQuery } from '@tanstack/react-query';
import { fetchUser } from '../api/mockApi';
import { userKeys } from '../queries/queryKeys';

export default function UserProfile({ id }: { id: number }) {
  // 데이터가 올 때까지 이 아래로 내려오지 않습니다.
  const { data: user } = useSuspenseQuery({
    queryKey: userKeys.detail(id),
    queryFn: () => fetchUser(id),
  });

  // 여기 도달했다면 user는 반드시 존재합니다. user?.name이 아니라 user.name.
  return (
    <div style={{ border: '2px solid #333', padding: '1.5rem', borderRadius: 12 }}>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  );
}
```

가장 큰 차이는 반환 타입입니다. `useQuery`의 `data`는 `User | undefined`라 옵셔널 체이닝이 필요했지만, `useSuspenseQuery`의 `data`는 **`User`로 확정**됩니다. 로딩·에러 상태에서는 애초에 이 코드가 실행되지 않기 때문입니다. `isPending`도 반환하지 않습니다. 컴포넌트 관점에서 데이터는 "언제나 거기 있는 것"이 됩니다.

---

## ⏸️ 3. Suspense — 로딩을 부모로 올린다

중단된 컴포넌트를 받아 로딩 UI를 대신 그리는 것이 부모의 `<Suspense>`입니다.

```tsx
import { Suspense } from 'react';
import UserProfile from './components/UserProfile';

const Skeleton = () => (
  <div style={{ padding: '1.5rem', border: '2px dashed #ccc', color: '#666' }}>
    ⌛ 불러오는 중...
  </div>
);

// Suspense가 자식의 중단을 가로채 fallback을 띄웁니다
<Suspense fallback={<Skeleton />}>
  <UserProfile id={1} />
</Suspense>
```

로딩 시점의 화면(`fallback`)을 자식이 아니라 부모가 정합니다. 자식이 몇 개든, 그중 하나라도 중단되면 `Suspense`가 `fallback`을 보여주고, 전부 준비되면 실제 자식으로 교체합니다. `fallback`에는 단순 스피너 대신 실제 콘텐츠 자리를 미리 그리는 스켈레톤을 두는 편이 자연스럽습니다.

---

## 🚧 4. ErrorBoundary — 에러도 하나의 UI 시나리오

에러 처리는 `ErrorBoundary`가 맡습니다. 리액트에는 함수형 훅 기반 에러 경계가 아직 내장돼 있지 않아, 사실상 표준인 `react-error-boundary`를 씁니다.

```bash
npm install react-error-boundary
```

```tsx
import { Suspense } from 'react';
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary';

function ErrorPage({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div style={{ color: 'red', padding: '1.5rem', border: '2px solid red' }}>
      <p>❌ {error.message}</p>
      <button onClick={resetErrorBoundary}>다시 시도</button>
    </div>
  );
}

export default function App() {
  return (
    // 에러를 낚아채는 펜스가 로딩 대기실을 감쌉니다
    <ErrorBoundary FallbackComponent={ErrorPage}>
      <Suspense fallback={<Skeleton />}>
        <UserProfile id={1} />
      </Suspense>
    </ErrorBoundary>
  );
}
```

`useSuspenseQuery`는 요청이 실패하면(기본 재시도까지 소진한 뒤) 에러를 **위로 던집니다.** 그러면 `ErrorBoundary`가 그것을 잡아, 에러가 난 자식을 치우고 `FallbackComponent`를 대신 그립니다. 에러가 특정 영역에 격리되어, 컴포넌트 하나가 실패해도 앱 전체가 흰 화면이 되지 않습니다.

<details style="margin:10px 0 4px">
<summary style="cursor:pointer;font-weight:700;color:#C8443C">id=0으로 에러를 유발했을 때의 흐름</summary>
<pre><code>1. fetchUser(0)이 reject
2. useSuspenseQuery가 에러를 감지해 위로 throw
3. 가장 가까운 ErrorBoundary가 낚아챔
4. UserProfile을 화면에서 치우고 ErrorPage로 교체
   → 나머지 앱 영역은 그대로 살아 있음</code></pre>
</details>

> 원자료는 `fallbackRender={ErrorPage}`로 컴포넌트를 넘겼는데, `fallbackRender`는 `(props) => ReactNode` 형태의 렌더 함수를 받는 자리입니다. 컴포넌트를 넘길 때는 `FallbackComponent={ErrorPage}`가 맞습니다. 둘을 섞으면 리렌더 시 경고가 날 수 있습니다.

`ErrorBoundary`가 로딩 대기실(`Suspense`)을 감싸는 순서가 자연스럽습니다. 로딩은 정상 흐름의 일부지만, 에러는 그 흐름 전체를 대체하기 때문입니다.

---

## 🔁 5. 무엇이 사라졌나 — before/after

같은 화면을 두 방식으로 비교하면 컴포넌트에서 걷힌 것이 보입니다.

| 항목 | useQuery | useSuspenseQuery |
| :---: | :---: | :---: |
| 로딩 분기 | `if (isPending) return ...` | 컴포넌트 안에 없음 |
| 에러 분기 | `if (error) return ...` | 컴포넌트 안에 없음 |
| 데이터 접근 | `data?.name` | `data.name` |
| 로딩·에러 UI 위치 | 컴포넌트마다 | 부모에 한 번 |

경쟁 상태도 별도 방어가 필요 없습니다. 다만 그 이유는 "리액트가 렌더 타이밍을 조절해서"가 아니라, [2편](/posts/react-tanstack-query-server-state-sync/)에서 본 것과 같습니다. `id`가 바뀌면 `queryKey`가 바뀌고, 늦게 도착한 이전 응답은 자기 키의 캐시에만 기록됩니다. 화면이 구독하는 것은 현재 키이므로 과거 데이터가 끼어들지 못합니다. 선언형으로 바꿔서 생긴 이점이 아니라, 처음부터 캐시 키가 주던 이점입니다.

---

## ⚠️ 6. 주의사항 — 공짜가 아니다

- **한 컴포넌트에서 여러 개를 연달아 쓰면 waterfall** — `useSuspenseQuery`를 두 번 나란히 호출하면, 첫 번째가 중단되는 순간 컴포넌트 실행이 멈춰 두 번째 요청은 시작조차 못 합니다. 두 요청이 순차로 이어져 느려집니다. 병렬로 묶으려면 `useSuspenseQueries`가 필요합니다(다음 편 주제).

- **배경 갱신 표시를 컴포넌트 안에서 하기 어렵다** — 로딩이 곧 중단이라, "데이터는 보여주되 뒤에서 갱신 중"인 `isFetching` 표시를 컴포넌트 내부에서 다루기 번거롭습니다. `useQuery`가 더 맞는 화면도 있습니다.

- **`id`가 바뀔 때마다 fallback으로 되돌아간다** — 전환 때마다 중단이 일어나 스켈레톤이 다시 뜹니다. 이전 화면을 유지하며 전환하려면 `useTransition`이나 `useDeferredValue`를 함께 씁니다.

- **재시도가 에러 표시를 지연시킨다** — 실패해도 기본 재시도(3회)를 소진해야 `ErrorBoundary`로 던져집니다. 즉시 에러 화면을 보려면 해당 쿼리(또는 클라이언트)에 `retry: false`를 둡니다.

- **에러 후 복구** — `ErrorBoundary`는 에러 상태를 기억합니다. 다시 시도하려면 `resetErrorBoundary`를 호출하고, 필요하면 TanStack Query의 `QueryErrorResetBoundary`와 연동해 캐시 에러도 함께 초기화합니다.

---

## ✅ 7. 핵심 정리

- **선언형 페칭은 상태 전환의 책임을 부모로 옮깁니다.** 로딩은 `Suspense`, 에러는 `ErrorBoundary`가 맡고, 컴포넌트에는 "데이터가 있을 때의 화면"만 남습니다.

- **`useSuspenseQuery`의 `data`는 항상 존재합니다.** 로딩·에러에서는 코드가 실행되지 않으므로 옵셔널 체이닝과 `isPending` 분기가 사라집니다.

- **에러는 위로 던져지고 경계에서 잡힙니다.** 실패한 영역만 격리되어 앱 전체가 멈추지 않습니다. 컴포넌트를 넘길 땐 `FallbackComponent`, 즉시 에러를 보려면 `retry: false`.

- **선언형은 만능이 아닙니다.** 여러 쿼리의 waterfall, 배경 갱신 표시, 전환 시 fallback 깜빡임이라는 비용이 따릅니다. 화면 성격에 따라 `useQuery`와 나눠 씁니다.

---

## 🔗 참고 자료

- 다음 편: [useSuspenseQueries로 병렬 페칭 — Waterfall 함정 풀기](/posts/react-query-parallel-suspense-queries/)

- 이전 편: [데이터 생애주기 — Fresh·Stale·Inactive와 isFetching](/posts/react-query-data-lifecycle/)

- [TanStack Query 공식 문서 — Suspense](https://tanstack.com/query/latest/docs/framework/react/guides/suspense)

- [react-error-boundary — GitHub](https://github.com/bvaughn/react-error-boundary)

- [React 공식 문서 — Suspense](https://react.dev/reference/react/Suspense)
