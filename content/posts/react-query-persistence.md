---
title: '캐시 지속성: persistQueryClient로 새로고침 너머 데이터 살리기'
slug: react-query-persistence
description: >-
  기본 캐시는 RAM에 있어 새로고침 한 번에 증발합니다. 캐시를 `localStorage`에 박제하는 지속성(persistence)
  전략으로, 새로고침·재실행 후에도 이전 데이터를 즉시 복원합니다. v5 권장 방식인 `PersistQueryClientProvider`로
  하이드레이션까지 안전하게 처리하고, `gcTime`이 `maxAge` 이상이어야 하는 이유, `buster`로 낡은 캐시를 폐기하는 법,
  그리고 무엇을 저장하면 안 되는지를 정리합니다.
published_at: '2026-07-27T17:31:58-07:00'
labels:
  - AI 작성
  - 학습 정리
  - React
  - TypeScript
  - 서버 상태 관리
source: >-
  사용자 학습 노트 (서버 상태 관리 — 지속성
  persistQueryClient·PersistQueryClientProvider·gcTime/maxAge/buster)
legacy_url: 'https://saver7942.blogspot.com/2026/07/persistqueryclient.html'
draft: false
series: react-query
part: 14
---

[이전 편](/posts/react-query-offline-paused/)에서 기본 캐시가 휘발성 RAM에 있어 새로고침에 증발한다는 것을 봤습니다. 데이터(알맹이)를 새로고침 너머로 살리는 방법이 이번 편입니다.

핵심은 간단합니다. 메모리에만 있던 캐시를 `localStorage` 같은 영속 저장소에 **박제**해 두고, 앱이 다시 켜질 때 그것을 읽어 메모리를 채웁니다. 그러면 지하철에서 새로고침해도(앱 파일이 캐시돼 있다는 전제하에) 이전에 본 데이터가 즉시 뜹니다.

---

## 🧊 1. 지속성이란 — 캐시를 저장소에 박제

TanStack Query의 캐시는 기본적으로 자바스크립트 메모리(RAM)에 있습니다. 페이지를 새로고침하면 실행 컨텍스트가 초기화되며 캐시도 사라집니다. 지속성 전략은 이 캐시를 **직렬화해 외부 저장소에 저장**하고, 앱 재시작 시 다시 읽어 들입니다.

두 개념이 등장합니다.

- **Persister(퍼시스터)** — 엔진의 캐시를 저장소와 동기화하는 전달자입니다. 캐시가 바뀌면 저장소에 써 두고, 앱 시작 시 저장소에서 읽어 옵니다.

- **Hydration(하이드레이션)** — 앱이 켜질 때 저장소에 박제된 데이터로 메모리 캐시를 채우는 과정입니다. 마른 캐시에 물을 붓는 셈입니다.

---

## 📦 2. Persister 설치와 정의

`localStorage`용 퍼시스터를 씁니다. 두 패키지를 설치합니다.

```bash
npm install @tanstack/react-query-persist-client @tanstack/query-sync-storage-persister
```

퍼시스터를 만듭니다.

```tsx
import { QueryClient } from '@tanstack/react-query';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24,   // 24시간 (maxAge 이상이어야 함)
      staleTime: 1000 * 60 * 5,
    },
  },
});

const persister = createSyncStoragePersister({
  storage: window.localStorage,
});
```

`localStorage`는 문자열만 저장하므로, 퍼시스터가 캐시 객체를 JSON 문자열로 직렬화해 넣고 읽을 때 역직렬화합니다. `createSyncStoragePersister`는 이름 그대로 **동기** 저장소(`localStorage`·`sessionStorage`)용입니다. IndexedDB처럼 비동기 저장소를 쓰려면 `createAsyncStoragePersister`를 씁니다.

---

## 🛡️ 3. PersistQueryClientProvider — 하이드레이션까지 안전하게

원본 강의는 `persistQueryClient()` 함수를 직접 호출했지만, v5에서는 **`PersistQueryClientProvider`** 컴포넌트로 감싸는 방식이 권장됩니다. 이 컴포넌트가 하이드레이션이 끝날 때까지 자식 렌더링을 조율해 주기 때문입니다.

```tsx
// src/main.tsx
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        buster: 'v1-github-2026',        // 캐시 버전
        maxAge: 1000 * 60 * 60 * 24,     // 24시간
      }}
    >
      <App />
    </PersistQueryClientProvider>
  </StrictMode>
);
```

`PersistQueryClientProvider`는 `QueryClientProvider`의 역할도 겸합니다. 따로 `QueryClientProvider`로 또 감쌀 필요가 없습니다. 함수 방식(`persistQueryClient()` 직접 호출)과 달리, 저장소에서 캐시를 복원하는 동안 어정쩡한 빈 화면이 렌더되는 것을 이 컴포넌트가 막아 줍니다.

이제 컴포넌트의 `useQuery`는 평소와 똑같이 씁니다. 지속성은 전적으로 상위 설정의 몫이라, 데이터를 읽는 코드는 바뀌지 않습니다.

```tsx
const { data, isPending, isPaused } = useQuery({
  queryKey: ['github-user', searchQuery],
  queryFn: () => fetchGitHubUser(searchQuery),
  enabled: !!searchQuery,
});
```

---

## ⏳ 4. gcTime·maxAge·buster — 세 설정의 의미

지속성에서 헷갈리기 쉬운 세 값입니다.

| 설정 | 무엇을 정하나 | 권장 |
| :---: | :---: | :---: |
| `gcTime` | 메모리 캐시의 수명 | `maxAge` 이상으로 길게 |
| `maxAge` | **박제된** 캐시의 유효 기간 | 24시간 등 |
| `buster` | 캐시 버전 문자열 | 스키마 바뀌면 변경 |

- **`gcTime`을 왜 길게 잡나** — 메모리에서 `gcTime`이 지나 캐시가 GC되면, 그 캐시는 저장소에도 반영되지 못하고 사라집니다. 그래서 `gcTime`이 `maxAge`보다 **짧으면 지속성이 제대로 동작하지 않습니다.** 오프라인 지원을 위해 `gcTime`을 24시간처럼 넉넉히 둡니다.

- **`maxAge`는 박제물의 유통기한** — 하이드레이션할 때 저장소의 캐시가 `maxAge`보다 오래됐으면 버립니다. 너무 낡은 데이터를 되살리지 않기 위한 안전장치입니다.

- **`buster`는 버전 도장** — 데이터 구조를 바꿨을 때 이전 버전 캐시가 남아 있으면 앱이 깨질 수 있습니다. `buster` 문자열을 바꾸면, 그와 다른 버전으로 저장된 낡은 캐시를 통째로 폐기하고 새로 받습니다. 배포 때 스키마가 바뀌면 이 값을 올립니다.

---

## 🔐 5. 무엇을 박제하고, 무엇을 말 것인가

지속성은 강력하지만 아무거나 저장하면 안 됩니다.

- **민감 정보 금지** — `localStorage`는 **평문**으로 저장되고 자바스크립트로 누구나 읽을 수 있습니다. 토큰·개인정보·결제 정보 같은 민감 데이터는 박제하지 않습니다.

- **용량 한계** — `localStorage`는 대략 5MB 제한이 있고 동기 저장이라, 큰 데이터를 넣으면 메인 스레드가 잠깐 멈출 수 있습니다. 큰 데이터는 `createAsyncStoragePersister` + IndexedDB로 옮기거나, `dehydrateOptions`로 저장 대상을 골라냅니다.

- **성공한 쿼리만 기본 저장** — 기본적으로 성공(`success`) 상태의 쿼리만 직렬화됩니다. 로딩·에러 상태를 굳이 살릴 필요가 없기 때문입니다. 특정 쿼리만 저장하려면 `dehydrateOptions.shouldDehydrateQuery`로 필터링합니다.

어떤 데이터가 지속성에 어울리는지는 성격으로 판단합니다. 방금 본 계좌 잔액, 장바구니 목록, 읽던 기사, 작성 중이던 초안처럼 **"오프라인에서도 잠깐 보여도 되는" 비민감 데이터**가 대상입니다.

---

## ⚠️ 6. 주의사항

- **공룡 게임은 여전히 나옵니다** — 지속성은 데이터(알맹이)를 살릴 뿐, 앱 파일(껍데기)은 못 살립니다([14편](/posts/react-query-offline-paused/)). 오프라인 새로고침에서 앱 자체가 실행되게 하려면 서비스 워커(PWA)가 앱 셸을 캐싱해야 합니다. 지속성과 PWA는 사는 대상이 다릅니다.

- **`gcTime ≥ maxAge`를 지킵니다** — 이 관계가 깨지면 캐시가 저장되기 전에 메모리에서 사라져 지속성이 헛돕니다.

- **`buster`를 배포 스키마와 함께 올립니다** — 응답 구조를 바꿨는데 `buster`를 그대로 두면, 낡은 구조의 캐시가 하이드레이션돼 렌더 에러가 날 수 있습니다.

- **저장 확인은 Application 탭에서** — `localStorage`에 `REACT_QUERY_OFFLINE_CACHE` 키로 직렬화된 캐시가 들어갑니다. 동작을 검증할 때 여기를 봅니다.

- **오프라인 복원은 서버 통신이 없습니다** — 하이드레이션은 로컬에서 즉시 끝나므로 온라인 첫 로드보다 빠릅니다. 이 즉시성이 견고한 UX의 실체입니다.

---

## ✅ 7. 핵심 정리

- **지속성은 캐시를 저장소에 박제합니다.** 퍼시스터가 캐시를 `localStorage`에 직렬화해 두고, 앱 재시작 시 하이드레이션으로 메모리를 채웁니다. 새로고침 너머로 데이터가 살아남습니다.

- **v5는 `PersistQueryClientProvider`를 권장합니다.** 하이드레이션 중 렌더를 조율하고 `QueryClientProvider` 역할까지 겸합니다. 함수 직접 호출보다 안전합니다.

- **`gcTime ≥ maxAge`가 전제입니다.** `gcTime`(메모리 수명)이 `maxAge`(박제 유효기간)보다 짧으면 지속성이 동작하지 않습니다. `buster`로 스키마 변경 시 낡은 캐시를 폐기합니다.

- **민감·대용량 데이터는 박제하지 않습니다.** `localStorage`는 평문·5MB·동기입니다. 그리고 지속성은 알맹이만 살리니, 껍데기(앱 셸)까지는 PWA의 몫입니다.

---

## 🔗 참고 자료

- 다음 편: [벌크 뮤테이션 — N번의 요청을 한 번으로 묶어 네트워크 폭풍과 원자성 잡기](/posts/react-query-bulk-mutation/)

- 이전 편: [오프라인과 TanStack Query — paused 상태와 휘발성 캐시의 실체](/posts/react-query-offline-paused/)

- [TanStack Query 공식 문서 — Persistence](https://tanstack.com/query/latest/docs/framework/react/plugins/persistQueryClient)

- [TanStack Query 공식 문서 — createSyncStoragePersister](https://tanstack.com/query/latest/docs/framework/react/plugins/createSyncStoragePersister)

- [TkDodo 블로그 — Offline React Query](https://tkdodo.eu/blog/offline-react-query)
