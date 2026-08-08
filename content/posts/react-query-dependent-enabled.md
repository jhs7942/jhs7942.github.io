---
title: '의존적 쿼리: enabled로 순서 있는 데이터 호출 제어하기'
slug: react-query-dependent-enabled
description: >-
  유저 정보를 먼저 받아 그 안의 ID로 게시글을 불러오는, 순서가 정해진 호출을 다룹니다. 두 요청을 동시에 보내면 두 번째는 ID 없이
  나가 실패합니다. `enabled` 옵션으로 "앞 데이터가 준비될 때까지 기다렸다가 실행"을 선언적으로 제어하고, 비활성 쿼리의
  `status`/`fetchStatus`가 왜 `pending`/`idle`인지, `userId!` 대신 v5의 `skipToken`으로
  타입까지 안전하게 만드는 법을 정리합니다.
published_at: '2026-07-27T17:03:55-07:00'
labels:
  - AI 작성
  - 학습 정리
  - React
  - TypeScript
  - 서버 상태 관리
source: 사용자 학습 노트 (서버 상태 관리 — 의존적 쿼리 enabled·skipToken·status/fetchStatus)
legacy_url: 'https://saver7942.blogspot.com/2026/07/enabled.html'
draft: false
series: react-query
part: 12
---

[이전 편](https://saver7942.blogspot.com/2026/07/select.html)까지는 하나의 요청을 다루는 이야기였습니다. 이번엔 **요청 사이에 순서가 있는** 경우입니다.

사용자 프로필을 먼저 가져와야 그 안의 `id`를 알 수 있고, 그 `id`가 있어야 사용자의 게시글을 요청할 수 있습니다. 두 요청을 동시에 보내면 두 번째는 `id`가 `undefined`인 채로 나가 서버 에러를 만납니다. 앞 요청이 끝날 때까지 뒤 요청을 붙잡아 둬야 합니다. 이 제어를 `enabled` 옵션으로 선언적으로 합니다.

---

## 🔗 1. 순서가 있는 호출 — 의존적 쿼리

두 번째 쿼리가 첫 번째 쿼리의 결과를 **입력으로 필요로 하는** 관계를 의존적 쿼리라고 합니다.

```
fetchUser(email) → user.id → fetchPosts(user.id)
```

`user.id`가 없으면 `fetchPosts`를 호출할 수 없습니다. 그래서 두 번째 쿼리는 첫 번째가 성공한 뒤에야 실행돼야 합니다. 과거에는 첫 데이터가 오면 `useEffect` 안에서 두 번째 함수를 수동 호출했지만, 코드가 지저분하고 경쟁 상태에 취약했습니다. `enabled`는 이 순서를 옵션 하나로 선언합니다.

---

## 🚪 2. enabled — 실행을 여는 게이트

`useQuery`는 보통 마운트 즉시 실행되지만, `enabled: false`면 **신호가 올 때까지 요청을 보내지 않고 대기**합니다.

```tsx
import { useQuery } from '@tanstack/react-query';
import { fetchUserByEmail, fetchPostsByUserId } from '../api/postApi';

export function UserPosts({ email }: { email: string }) {
  // 1단계 — 유저 정보. 이게 성공해야 id가 생긴다
  const { data: user } = useQuery({
    queryKey: ['user', email],
    queryFn: () => fetchUserByEmail(email),
  });

  const userId = user?.id;

  // 2단계 — userId가 있을 때만 실행
  const { data: posts, fetchStatus } = useQuery({
    queryKey: ['posts', userId],
    queryFn: () => fetchPostsByUserId(userId!),
    enabled: !!userId,          // ← 게이트: userId가 생기면 열린다
  });

  // ...
}
```

- **`enabled: !!userId`** — `userId`가 `undefined`이면 `false`(대기), 값이 생기면 `true`(실행). `!!`는 값을 불리언으로 바꾸는 관용구입니다.

- **자동 트리거** — 첫 쿼리가 성공해 `userId`가 채워지면 `enabled`가 `true`로 바뀌고, 엔진이 그 변화를 감지해 두 번째 `queryFn`을 실행합니다. "언제 실행하라"는 코드는 어디에도 없습니다. 조건만 선언하고 타이밍은 엔진이 정합니다.

---

## 🚦 3. status와 fetchStatus — 왜 pending인데 로딩이 아닌가

여기서 자주 헷갈리는 지점이 있습니다. `enabled: false`로 대기 중인 쿼리의 상태입니다. v5에는 상태를 나타내는 값이 **두 개**입니다.

| 값 | 의미 | 대기 중(enabled:false)일 때 |
| :---: | :---: | :---: |
| `status` | 데이터가 있는가 | `'pending'` (아직 데이터 없음) |
| `fetchStatus` | 지금 통신 중인가 | `'idle'` (요청 안 나감) |

두 축이 다릅니다. `status`는 "데이터를 가졌나", `fetchStatus`는 "지금 네트워크가 도는가"입니다. 대기 중인 쿼리는 데이터가 없으니 `status: 'pending'`이지만, 요청은 안 나가니 `fetchStatus: 'idle'`입니다.

그래서 **`isLoading`으로 대기 상태를 판단하면 안 됩니다.** `isLoading`은 `isPending && isFetching`이라, `fetchStatus`가 `idle`인 대기 쿼리에서는 `false`입니다. 대기 중임을 로딩 UI로 보여주려면 첫 쿼리 기준으로 판단하는 편이 명확합니다.

```tsx
// 첫 쿼리가 아직이거나, 둘째가 실제로 통신 중이면 로딩
if (!user || fetchStatus === 'fetching') {
  return <div>불러오는 중...</div>;
}
```

---

## 🛂 4. 타입 안전 — userId!와 skipToken

`queryFn: () => fetchPostsByUserId(userId!)`의 `!`(non-null assertion)가 눈에 걸릴 수 있습니다. `userId`는 `number | undefined`인데 `!`로 "undefined 아님"을 단언하기 때문입니다.

여기서는 안전합니다. `enabled: !!userId`가 게이트를 지키므로, `queryFn`이 실행되는 시점엔 `userId`가 반드시 존재합니다. 논리적으로 보장된 자리라 `!`를 써도 됩니다.

다만 v5에는 `!` 없이 타입까지 깔끔하게 푸는 방법이 있습니다. `queryFn` 자리에 **`skipToken`** 을 쓰는 것입니다.

```tsx
import { useQuery, skipToken } from '@tanstack/react-query';

const { data: posts } = useQuery({
  queryKey: ['posts', userId],
  // userId가 없으면 skipToken → 쿼리 비활성 + 타입이 좁혀짐
  queryFn: userId ? () => fetchPostsByUserId(userId) : skipToken,
});
```

`queryFn`을 `skipToken`으로 두면 쿼리가 실행되지 않습니다(`enabled: false`와 같은 효과). 그리고 삼항의 `true` 가지 안에서는 `userId`가 이미 `number`로 좁혀져 있어 `!`가 필요 없습니다. 타입 단언 없이 안전을 얻습니다.

---

## 🌊 5. 의존적 쿼리는 워터폴이다

의존적 쿼리는 요청이 계단식으로 순차 실행되는 **워터폴**을 의도적으로 만듭니다. `fetchUser`(0.5초) → `fetchPosts`(0.5초)라면 총 1초가 걸립니다. 순서가 필요하니 어쩔 수 없지만, 워터폴 자체는 성능상 피하고 싶은 것이라는 점을 기억해야 합니다.

- **정말 의존적일 때만 씁니다** — 두 데이터가 서로 무관하다면 병렬로 두는 게 빠릅니다([6편](https://saver7942.blogspot.com/2026/07/usesuspensequeries-suspense-waterfall.html)의 병렬 페칭). 습관적으로 `enabled` 체인을 만들면 불필요하게 느려집니다.

- **가능하면 서버에서 합칩니다** — "유저와 그 게시글"을 한 번에 주는 API가 있으면 왕복이 한 번으로 줄어듭니다. 프론트의 워터폴은 서버 응답 구조를 바꿀 수 없을 때의 차선책입니다.

---

## ⚠️ 6. 주의사항

- **대기 상태는 `fetchStatus`로 봅니다** — `isLoading`은 대기 쿼리에서 `false`입니다. "아직 시작 안 함"과 "통신 중"을 구분하려면 `status`(데이터 유무)와 `fetchStatus`(통신 여부)를 함께 봅니다.

- **`queryKey`에 의존 값을 넣습니다** — `['posts', userId]`처럼 `userId`를 키에 포함해야, 다른 유저로 바뀌면 별도 캐시로 관리됩니다. 빠뜨리면 유저가 달라져도 이전 게시글 캐시를 재사용합니다.

- **`skipToken`과 `enabled`를 섞지 않습니다** — 둘 다 "실행 막기"라 하나만 씁니다. 타입까지 좁히고 싶으면 `skipToken`, 단순 토글이면 `enabled`.

- **첫 쿼리 실패 처리** — 첫 쿼리가 에러면 `userId`가 없어 둘째는 계속 대기합니다. 첫 쿼리의 `error`를 따로 처리해 사용자에게 알립니다.

- **워터폴을 남발하지 않습니다** — `enabled` 체인이 세 단계, 네 단계로 길어지면 그만큼 지연이 쌓입니다. 정말 순서가 필요한지 먼저 확인합니다.

---

## ✅ 7. 핵심 정리

- **의존적 쿼리는 앞 결과를 입력으로 씁니다.** 순서가 있으니 두 번째는 첫 번째가 성공한 뒤 실행돼야 합니다.

- **`enabled`가 실행 게이트입니다.** `enabled: !!userId`로 "값이 생기면 실행"을 선언하면, 호출 타이밍은 엔진이 정합니다. `useEffect` 수동 호출이 사라집니다.

- **대기 쿼리는 `pending` + `idle`입니다.** 데이터는 없지만(`status: pending`) 요청은 안 나갑니다(`fetchStatus: idle`). `isLoading`은 이때 `false`이므로 대기 판단에 쓰지 않습니다.

- **`skipToken`으로 타입까지 안전하게.** `queryFn`을 `skipToken`으로 두면 `!` 단언 없이 실행을 막고 타입을 좁힐 수 있습니다. 그리고 의존적 쿼리는 워터폴이니, 정말 순서가 필요할 때만 씁니다.

---

## 🔗 참고 자료

- 다음 편: [오프라인과 TanStack Query — paused 상태와 휘발성 캐시의 실체](https://saver7942.blogspot.com/2026/07/tanstack-query-paused.html)

- 이전 편: [select 옵션 — 서버 데이터를 컴포넌트에 맞게 변환하고 리렌더 줄이기](https://saver7942.blogspot.com/2026/07/select.html)

- [TanStack Query 공식 문서 — Dependent Queries](https://tanstack.com/query/latest/docs/framework/react/guides/dependent-queries)

- [TanStack Query 공식 문서 — Query Functions (skipToken)](https://tanstack.com/query/latest/docs/framework/react/guides/query-functions#skiptoken)

- [TanStack Query 공식 문서 — status vs fetchStatus](https://tanstack.com/query/latest/docs/framework/react/guides/queries)
