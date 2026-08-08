---
title: 'TanStack Query 입문: 데이터를 가져오는 대신 서버와 동기화하기'
slug: react-tanstack-query-server-state-sync
description: >-
  `useEffect` 페칭이 무너지던 세 지점을 TanStack Query로 다시 씁니다. 서버 데이터는 컴포넌트의 소유물이 아니라 잠시
  빌려온 사본이라는 관점에서 출발해, `queryKey`·`queryFn`·`staleTime`·`gcTime`이 각각 무엇을 결정하는지
  정리합니다. 캐시가 있으면 스피너가 뜨지 않는 이유, `signal`을 넘기지 않으면 요청이 취소되지 않는다는 사실까지 확인합니다.
published_at: '2026-07-23T19:38:40-07:00'
labels:
  - AI 작성
  - 학습 정리
  - React
  - TypeScript
  - 서버 상태 관리
source: 사용자 학습 노트 (서버 상태 관리 — TanStack Query 도입 / queryKey·staleTime)
legacy_url: 'https://saver7942.blogspot.com/2026/07/tanstack-query.html'
draft: false
series: react-query
part: 1
---

[이전 편](/posts/react-useeffect-fetching-pitfalls/)에서 `useEffect` 페칭이 무너지는 세 지점을 확인했습니다. 늦게 도착한 응답이 최신 화면을 덮고, 같은 데이터를 컴포넌트 수만큼 요청하고, 로딩·에러·취소 코드를 화면마다 다시 씁니다.

이 문제들을 하나씩 막는 대신, 먼저 지워야 할 전제가 하나 있습니다. **"데이터는 내 컴포넌트의 상태"라는 생각입니다.** 서버 데이터는 소유물이 아니라 잠시 빌려온 사본이고, 원본은 서버에 있으며 언제든 다른 사람에 의해 바뀝니다. 그렇다면 클라이언트가 할 일은 데이터를 가져와 보관하는 것이 아니라, **원본을 비추는 거울을 유지하는 것**입니다.

---

## 🧭 1. 관점 전환 — 서버 상태는 클라이언트 상태가 아니다

모달이 열렸는지, 어떤 탭이 선택됐는지는 브라우저 안에서만 존재하는 정보입니다. 반면 사용자 프로필이나 게시글 목록은 서버에 원본이 있고, 화면에 떠 있는 것은 어느 시점에 복사해 온 사본입니다. 둘의 성질이 다른데 같은 `useState`로 다루면서 문제가 시작됩니다.

| 구분 | 클라이언트 상태 | 서버 상태 |
| :---: | :---: | :---: |
| 원본의 위치 | 브라우저 | 서버 |
| 최신 여부 | 항상 최신 | 언제든 낡을 수 있음 |
| 바꾸는 주체 | 내 코드만 | 다른 사용자 · 다른 탭도 |
| 필요한 장치 | 저장 · 갱신 | 캐시 · 무효화 · 재검증 |

서버 상태를 다루는 전략을 정수기에 비유하면 이해가 빠릅니다. 물이 필요할 때마다 우물까지 걸어가는 대신, 미리 받아 둔 물을 즉시 내주고 뒤에서 조용히 새 물을 채워 둡니다. 이 전략의 이름이 **SWR(Stale-While-Revalidate)** 입니다. 낡은(stale) 데이터를 먼저 보여주고, 동시에 재검증(revalidate)해 조용히 교체합니다.

사용자는 기다리지 않고, 화면은 결국 최신이 됩니다. TanStack Query는 이 전략을 기본 동작으로 구현한 라이브러리입니다.

---

## 🛰️ 2. 엔진 설치 — QueryClient와 Provider

```bash
npm install @tanstack/react-query
```

모든 쿼리의 상태와 캐시를 관리하는 `QueryClient`를 만들고, `QueryClientProvider`로 앱을 감쌉니다.

```tsx
// src/App.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import UserProfile from './components/UserProfile';

// 컴포넌트 바깥에서 생성합니다. 안에서 만들면 리렌더마다 캐시가 통째로 날아갑니다.
const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div style={{ padding: '20px' }}>
        <h1>TanStack Query 관제 센터</h1>
        {/* 같은 데이터를 쓰는 컴포넌트를 둘 배치해 중복 제거를 확인합니다 */}
        <UserProfile userId={1} />
        <UserProfile userId={1} />
      </div>
    </QueryClientProvider>
  );
}
```

캐시는 Context를 타고 앱 전체가 공유합니다. 이전 편에서 `ProfileIcon`과 `Sidebar`가 서로의 존재를 몰라 각자 요청하던 문제가, 컴포넌트 바깥에 공용 저장소를 두는 것만으로 사라집니다.

이전 편의 랩에 사용자 API를 하나 추가합니다.

```tsx
// src/api/mockApi.ts
export interface UserData {
  id: number;
  name: string;
  email: string;
}

export const fetchUserData = async (userId: number): Promise<UserData> => {
  console.log(`📡 [Network Log] 유저 ${userId} 정보 요청`);
  const res = await fetch(`https://jsonplaceholder.typicode.com/users/${userId}`);
  return res.json();
};
```

---

## 🔑 3. useQuery — queryKey와 queryFn

이전 편의 30줄짜리 방어 코드가 이렇게 줄어듭니다.

```tsx
// src/components/UserProfile.tsx
import { useQuery } from '@tanstack/react-query';
import { fetchUserData } from '../api/mockApi';

export default function UserProfile({ userId }: { userId: number }) {
  const { data, isPending, error } = useQuery({
    // 1. 이 데이터의 고유 주소. userId가 바뀌면 다른 데이터로 취급합니다.
    queryKey: ['user', userId],

    // 2. 실제 통신. 경쟁 상태 처리와 중복 제거는 엔진이 맡습니다.
    queryFn: () => fetchUserData(userId),

    // 3. 5분간은 이 데이터를 신선하다고 믿습니다.
    staleTime: 1000 * 60 * 5,
  });

  if (isPending) return <div>⌛ 동기화 중...</div>;
  if (error) return <div>❌ 에러: {error.message}</div>;

  return (
    <div style={{ border: '1px solid #ddd', padding: '1rem', margin: '10px' }}>
      <h4>유저 정보</h4>
      <p>이름: {data.name}</p>
    </div>
  );
}
```

- **`queryKey`** — 캐시의 주소입니다. 배열이며, 값이 하나라도 달라지면 별개의 데이터로 취급해 자동으로 다시 요청합니다. `useEffect`의 의존성 배열이 하던 역할을 캐시 키가 대신합니다.

- **`queryFn`** — 프로미스를 반환하는 함수면 무엇이든 됩니다. `fetch`든 `axios`든 상관없습니다.

- **타입은 추론됩니다** — `fetchUserData`가 `Promise<UserData>`를 반환하므로 `data`는 `UserData | undefined`로 잡힙니다. `useQuery<UserData, Error>`처럼 제네릭을 직접 적을 수도 있지만, 인자를 일부만 넘기면 나머지가 기본값으로 채워져 `select` 같은 옵션에서 타입이 어긋납니다. 반환 타입을 `queryFn` 쪽에 명시하고 추론에 맡기는 편이 안전합니다.

- **`isPending` 이후의 `data`** — 조기 반환으로 `isPending`과 `error`를 걸러내면 그 아래에서 `data`는 `UserData`로 좁혀집니다. `data?.name`의 물음표가 필요 없어집니다.

---

## ⏱️ 4. staleTime과 gcTime — 캐시가 동작하는 조건

두 옵션을 혼동하면 "캐시가 안 먹는다"거나 "왜 계속 요청이 나가지" 하는 상황을 만납니다. 서로 다른 것을 결정합니다.

| 옵션 | 기본값 | 결정하는 것 |
| :---: | :---: | :---: |
| `staleTime` | `0` | 재요청 없이 신선하다고 믿는 기간 |
| `gcTime` | 5분 | 화면에서 사라진 캐시를 메모리에 두는 기간 |

- **`staleTime`이 지나지 않았다면** 컴포넌트를 다시 마운트해도 요청이 아예 나가지 않습니다. 캐시에서 즉시 꺼내 씁니다.

- **`staleTime`이 지났다면** 캐시된 값을 먼저 그리고, 동시에 배경에서 새로 요청해 교체합니다. 이것이 SWR입니다.

- **`gcTime`이 지나면** 캐시 자체가 사라져, 다음 마운트는 `isPending`부터 다시 시작합니다.

여기서 흔한 오해를 하나 짚습니다. 위 예제처럼 `staleTime: 5분`을 걸어 두면 **그 5분 안에는 배경 재검증이 일어나지 않습니다.** 재마운트 시 스피너 없이 즉시 뜨는 이유는 SWR이 동작해서가 아니라 캐시가 남아 있기 때문이고, 배경 갱신은 데이터가 낡은 뒤에야 시작됩니다. 스피너가 뜨지 않는 것과 배경에서 갱신되는 것은 별개의 현상입니다.

목록처럼 자주 바뀌는 데이터는 `staleTime`을 짧게(또는 기본값 `0`으로) 두어 재검증을 자주 돌리고, 사용자 프로필처럼 잘 안 바뀌는 데이터는 길게 잡습니다.

---

## 🧪 5. 검증 — 세 재앙이 사라지는 지점

| 이전 편의 재앙 | 엔진의 대응 |
| :---: | :---: |
| 경쟁 상태 | 응답이 자기 `queryKey`의 캐시에만 기록됨 |
| 중복 요청 | 같은 키의 동시 요청을 하나로 합침 |
| 보일러플레이트 | 로딩 · 에러 · 재시도 · 캐시가 반환값으로 제공됨 |

**중복 제거 테스트** — `App.tsx`에 같은 `userId`를 쓰는 `UserProfile`을 둘 배치하고 콘솔을 봅니다.

<details style="margin:10px 0 4px">
<summary style="cursor:pointer;font-weight:700;color:#C8443C">실행 결과 보기</summary>
<pre><code>📡 [Network Log] 유저 1 정보 요청

// 컴포넌트 2개, 요청 1회.
// StrictMode 이중 실행에서도 1회 — 두 번째 마운트는 이미 캐시를 만납니다.
// 이전 편의 같은 구조에서는 개발 모드 4회였습니다.</code></pre>
</details>

늦게 마운트된 컴포넌트는 요청을 새로 보내지 않고, 이미 진행 중인 요청의 결과를 함께 받습니다.

**경쟁 상태 테스트** — 느린 1번과 빠른 2번을 연달아 요청해도 화면이 뒤집히지 않습니다. 1번 응답은 `['post', 1]` 캐시에 기록되고, 화면이 구독하는 것은 `['post', 2]`이기 때문입니다. 도착 순서가 아니라 키가 결과의 목적지를 정합니다.

**타입 안전 테스트** — `data.nane`처럼 오타를 내면 에디터에서 즉시 잡힙니다. `queryFn`의 반환 타입이 그대로 `data`까지 이어집니다.

---

## ⚠️ 6. 주의사항

- **`signal`을 넘기지 않으면 요청은 취소되지 않습니다** — 엔진은 필요 없어진 결과를 버릴 뿐, 네트워크 요청 자체는 끝까지 갑니다. 이전 편의 `isCancelled` 플래그와 같은 상태입니다. 실제로 끊으려면 `queryFn: ({ signal }) => fetch(url, { signal })`처럼 받은 시그널을 그대로 넘겨야 합니다.

- **`isPending`은 v4의 `isLoading`이 아닙니다** — v5에서 이름이 바뀌었고, 의미도 "캐시에 데이터가 없는 상태"입니다. 캐시가 있으면 배경에서 갱신 중이어도 `false`입니다. 갱신 여부를 표시하려면 `isFetching`을 씁니다.

- **기본값이 요청을 늘립니다** — 창 포커스 시 재요청(`refetchOnWindowFocus`)이 기본으로 켜져 있고, 실패 시 3회까지 재시도합니다. 콘솔 로그가 예상보다 많다면 대개 이 둘입니다. `staleTime`을 0으로 두면 특히 눈에 띕니다.

- **`QueryClient`를 컴포넌트 안에서 만들지 않습니다** — 리렌더마다 새 인스턴스가 생겨 캐시가 초기화됩니다. 모듈 스코프에 두거나 `useState(() => new QueryClient())`로 한 번만 만듭니다.

- **`queryKey`에는 요청에 영향을 주는 값을 모두 넣습니다** — 검색어나 페이지 번호를 빠뜨리면 서로 다른 결과가 같은 캐시를 덮어씁니다.

---

## ✅ 7. 핵심 정리

- **가져오기가 아니라 동기화입니다.** 서버 데이터는 컴포넌트의 소유물이 아니라 사본이고, 클라이언트가 할 일은 원본을 비추는 거울을 유지하는 것입니다.

- **`queryKey`가 캐시의 주소이자 의존성 배열입니다.** 키가 바뀌면 다시 요청하고, 응답은 자기 키의 캐시에만 기록됩니다. 경쟁 상태와 중복 요청이 여기서 함께 해결됩니다.

- **`staleTime`은 재요청 여부를, `gcTime`은 캐시의 수명을 정합니다.** 스피너가 안 뜨는 것은 캐시 덕분이고, 배경 갱신은 데이터가 낡은 뒤에 시작됩니다.

- **엔진에 맡겨도 짚어야 할 지점은 남습니다.** 요청 취소는 `signal`을 넘겨야 실제로 동작하고, 기본 재요청 정책은 미리 확인해 두는 편이 좋습니다.

- **`queryKey`는 곧 관리 대상이 됩니다.** [다음 편](/posts/react-query-key-factory/)에서 이 키를 문자열로 흩어 두지 않고 한 곳에서 계층으로 찍어내는 Query Key Factory 패턴을 다룹니다.

---

## 🔗 참고 자료

- 다음 편: [Query Key Factory — 캐시 주소를 오타 없이, 계층으로 관리하기](/posts/react-query-key-factory/)

- 이전 편: [useEffect 데이터 페칭이 무너지는 세 지점](/posts/react-useeffect-fetching-pitfalls/)

- [TanStack Query 공식 문서 — Important Defaults](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults)

- [TanStack Query 공식 문서 — Query Cancellation](https://tanstack.com/query/latest/docs/framework/react/guides/query-cancellation)

- [TanStack Query 공식 문서 — v5 마이그레이션(isPending · gcTime)](https://tanstack.com/query/latest/docs/framework/react/guides/migrating-to-v5)
