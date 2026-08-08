---
title: '오프라인과 TanStack Query: paused 상태와 휘발성 캐시의 실체'
slug: react-query-offline-paused
description: >-
  아무리 코드가 완벽해도 사용자의 네트워크는 통제할 수 없습니다. 오프라인이 되면 TanStack Query는 요청을 실패시키는 대신
  `fetchStatus`를 `paused`로 두고 연결을 기다립니다. 이때 `isFetching`은 `false`, `isPending`은
  `true`인 '죽은 시간'이 생깁니다. 이 상태의 정확한 정체와 `networkMode`, 그리고 새로고침 한 번에 캐시가 증발하는 휘발성
  메모리의 한계(공룡 게임)를 짚습니다.
published_at: '2026-07-27T17:15:01-07:00'
labels:
  - AI 작성
  - 학습 정리
  - React
  - TypeScript
  - 서버 상태 관리
source: 사용자 학습 노트 (서버 상태 관리 — 오프라인 fetchStatus paused·networkMode·휘발성 캐시)
legacy_url: 'https://saver7942.blogspot.com/2026/07/tanstack-query-paused.html'
draft: false
series: react-query
part: 13
---

[이전 편](/posts/react-query-dependent-enabled/)까지 요청의 순서와 형태를 다뤘습니다. 그런데 개발자가 통제할 수 없는 거대한 변수가 하나 남아 있습니다. **사용자의 네트워크 연결**입니다.

지하철 터널을 지나거나 와이파이가 끊기는 찰나, 아무리 잘 짠 코드도 멈춥니다. 이때 TanStack Query가 어떻게 반응하는지, 그리고 왜 새로고침 한 번에 모든 게 사라지는지를 정확히 아는 것이 오프라인 UX 설계의 출발점입니다. 이 편은 그 "고통"의 실체를 봅니다. 해결책(캐시 지속성)은 다음 편입니다.

---

## 📡 1. 통제할 수 없는 변수 — 네트워크

지금까지의 이야기는 전부 "요청이 나가고 응답이 온다"를 전제했습니다. 하지만 응답은커녕 요청조차 나갈 수 없는 상황이 있습니다. 오프라인입니다.

실제 GitHub API로 확인해 봅니다.

```tsx
// src/api/userApi.ts
export interface GitHubUser { id: number; name: string; bio: string; avatar_url: string; }

export const fetchGitHubUser = async (username: string): Promise<GitHubUser> => {
  const res = await fetch(`https://api.github.com/users/${username}`);
  if (!res.ok) throw new Error('유저를 찾을 수 없거나 네트워크 에러입니다.');
  return res.json();
};
```

온라인에서 `octocat`을 검색하면 잘 나옵니다. 문제는 개발자 도구 Network 탭을 Offline으로 바꾼 뒤 다른 아이디를 검색할 때입니다.

---

## ⏸️ 2. paused — 오프라인에서 엔진이 멈춘다

오프라인에서 쿼리가 실행되려 하면, TanStack Query는 요청을 즉시 실패시키지 않습니다. 대신 **`fetchStatus`를 `paused`로 두고 네트워크가 돌아오기를 기다립니다.** 연결이 복구되면 자동으로 재개합니다.

이 동작은 `networkMode` 옵션이 결정합니다. 기본값이 `'online'`이기 때문입니다.

| `networkMode` | 오프라인일 때 |
| :---: | :---: |
| `'online'` (기본) | 요청을 보내지 않고 `paused`로 대기 |
| `'always'` | 네트워크와 무관하게 항상 시도(fetch가 자체 실패) |
| `'offlineFirst'` | 캐시·서비스워커를 먼저 쓰고, 없으면 한 번 시도 |

기본이 `'online'`이라, 오프라인에서는 "실패한 에러"가 아니라 "멈춘 대기"가 됩니다. 무한히 재시도하며 서버를 두드리는 대신, 조용히 연결을 기다리는 편이 배터리와 서버에 유리하기 때문입니다.

---

## 🩺 3. 죽은 시간의 정체 — isPending·isFetching·isPaused

여기가 가장 자주 오해하는 지점입니다. 오프라인에서 처음 검색해 데이터가 아직 없는 쿼리의 상태를 정확히 보면 이렇습니다.

| 플래그 | 값 | 의미 |
| :---: | :---: | :---: |
| `status` | `'pending'` | 데이터가 아직 없다 |
| `fetchStatus` | `'paused'` | 통신이 멈춰 있다 |
| `isPending` | `true` | (status가 pending) |
| `isFetching` | `false` | 지금 통신 중이 아니다 |
| `isPaused` | `true` | 네트워크 대기로 멈춰 있다 |
| `isLoading` | `false` | (`isPending && isFetching`) |

핵심은 **`paused` 상태에서 `isFetching`은 `false`**라는 점입니다. 실제로 통신하고 있지 않으니까요. 따라서 `isLoading`(=`isPending && isFetching`)도 `false`입니다.

그렇다면 "무한 로딩 스피너"는 왜 생길까요? 개발자가 스피너를 `isPending`(또는 `status === 'pending'`)에 걸었을 때입니다. 오프라인이라 데이터가 영영 오지 않으니 `isPending`이 계속 `true`로 남아 스피너가 멈춘 채 돕니다. 하지만 그 아래에서 실제로는 아무 통신도 일어나지 않는 **죽은 시간**입니다.

그래서 오프라인 UX는 이렇게 나눠야 합니다.

```tsx
if (isPaused) return <p>🚫 오프라인입니다. 연결되면 자동으로 이어집니다.</p>;
if (isPending) return <p>불러오는 중...</p>;   // 실제 통신 중(fetchStatus: fetching)일 때
```

`isPaused`로 "멈춤"을 먼저 걸러내야, 사용자에게 "앱이 죽은 게 아니라 네트워크를 기다린다"고 정확히 알릴 수 있습니다.

---

## 💨 4. 휘발성 캐시 — 새로고침에 증발한다

오프라인에서도, 이미 온라인에서 받아 둔 데이터는 캐시에 남아 화면에 보입니다. 그런데 여기에 한계가 있습니다. **기본 캐시는 RAM(휘발성 메모리)에 있습니다.**

RAM에 있다는 것은, 페이지를 새로고침하면 자바스크립트 실행 컨텍스트가 초기화되면서 **캐시가 통째로 사라진다**는 뜻입니다. 애써 받아 둔 데이터도 F5 한 번이면 흔적 없이 증발합니다. `staleTime`이나 `gcTime`을 아무리 길게 잡아도, 그것들은 "한 세션 안에서"의 수명일 뿐 새로고침을 넘기지 못합니다.

새로고침을 넘겨 데이터를 살리려면, 캐시를 `localStorage` 같은 영속 저장소에 박제하는 **지속성(persistence)** 전략이 필요합니다. 그게 다음 편의 주제입니다.

---

## 🦖 5. 공룡 게임 — 껍데기와 알맹이는 다르다

오프라인에서 새로고침을 누르면 크롬의 공룡 게임(No Internet)이 뜹니다. 이 현상이 중요한 교훈을 줍니다. 우리 앱은 두 겹으로 되어 있습니다.

| 층위 | 정체 | 오프라인 새로고침 시 |
| :---: | :---: | :---: |
| 껍데기 | 앱 파일(HTML·JS·CSS) | 서버에서 못 받아옴 → 공룡 게임 |
| 알맹이 | 캐시된 데이터 | (지속성 있으면) 살릴 수 있음 |

새로고침은 브라우저가 앱 파일 자체를 서버에서 다시 받아오는 것부터 시작합니다. 오프라인이면 그 파일을 못 받으니, 우리 앱이 실행되기도 전에 공룡이 나옵니다. **다음 편의 지속성 전략을 써도 공룡 게임은 여전히 나옵니다.** 지속성은 데이터(알맹이)를 `localStorage`에 살리는 기술이지, 앱 파일(껍데기)을 살리는 기술이 아니기 때문입니다.

껍데기까지 오프라인에서 살리려면 **서비스 워커(PWA)** 가 앱 파일을 캐싱해야 합니다. 지속성과 PWA는 사는 대상이 다릅니다 — 하나는 데이터, 하나는 앱 셸입니다.

---

## ⚠️ 6. 주의사항

- **`paused`는 에러가 아닙니다** — 오프라인 대기를 실패로 처리해 에러 화면을 띄우면 잘못된 피드백입니다. `isPaused`로 걸러 "연결 대기 중"으로 안내하고, 연결되면 자동 재개되게 둡니다.

- **무한 스피너의 원인은 `isPending`** — 스피너를 `isPending`/`status==='pending'`에 걸면 오프라인에서 멈춘 채 돕니다. 실제 통신 표시는 `isFetching`(=`fetchStatus === 'fetching'`)에 걸어야 합니다.

- **`gcTime`·`staleTime`은 새로고침을 못 넘깁니다** — 세션 내 캐시 수명일 뿐입니다. 새로고침 후에도 데이터를 살리려면 지속성이 필요합니다.

- **`networkMode: 'always'`가 항상 답은 아닙니다** — 오프라인에서도 시도하게 만들면 `fetch`가 즉시 실패해 에러가 반복될 수 있습니다. 대부분은 기본 `'online'`(paused)이 자연스럽습니다.

- **온라인 복귀 시 자동 재개** — `paused` 쿼리는 연결이 돌아오면 개발자가 아무것도 안 해도 이어서 실행됩니다. 수동 재시도 로직을 덧붙일 필요가 없습니다.

---

## ✅ 7. 핵심 정리

- **오프라인에서 쿼리는 실패가 아니라 `paused`입니다.** 기본 `networkMode: 'online'`이라, 요청을 멈추고 연결을 기다렸다가 자동 재개합니다.

- **`paused`면 `isFetching`은 `false`입니다.** `isLoading`(=`isPending && isFetching`)도 `false`입니다. 무한 스피너는 `isPending`에 스피너를 걸었을 때 생기는 '죽은 시간'이므로, 오프라인은 `isPaused`로 따로 안내합니다.

- **기본 캐시는 휘발성입니다.** RAM에 있어 새로고침 한 번에 증발합니다. `staleTime`·`gcTime`은 세션 안의 수명일 뿐입니다.

- **공룡 게임은 껍데기 문제입니다.** 지속성은 데이터(알맹이)를 살리고, 앱 파일(껍데기)을 오프라인에서 살리는 것은 서비스 워커(PWA)의 몫입니다. 다음 편에서 데이터를 새로고침 너머로 살리는 지속성 전략을 다룹니다.

---

## 🔗 참고 자료

- 다음 편: [캐시 지속성 — persistQueryClient로 새로고침 너머 데이터 살리기](/posts/react-query-persistence/)

- 이전 편: [의존적 쿼리 — enabled로 순서 있는 데이터 호출 제어하기](/posts/react-query-dependent-enabled/)

- [TanStack Query 공식 문서 — Network Mode](https://tanstack.com/query/latest/docs/framework/react/guides/network-mode)

- [TanStack Query 공식 문서 — status vs fetchStatus](https://tanstack.com/query/latest/docs/framework/react/guides/queries)

- [web.dev — 서비스 워커와 오프라인](https://web.dev/articles/offline-cookbook)
