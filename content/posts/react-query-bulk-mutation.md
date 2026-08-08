---
title: '벌크 뮤테이션: N번의 요청을 한 번으로 묶어 네트워크 폭풍과 원자성 잡기'
slug: react-query-bulk-mutation
description: >-
  100개를 지우려고 삭제 요청을 100번 보내면 네트워크가 폭주하고, 47개 성공·3개 실패처럼 데이터가 어정쩡해집니다. ID 배열을 하나의
  요청에 실어 보내는 벌크 API와 `useMutation`(배열 인자)으로 요청을 1번으로 줄이고, all-or-nothing 원자성은 서버
  트랜잭션에 맡깁니다. MSW로 서버 없이 이 흐름을 재현하는 법과, 흔히 "쿼리 배칭"으로 잘못 부르는 이 패턴의 정확한 정체를 정리합니다.
published_at: '2026-07-27T18:08:56-07:00'
labels:
  - AI 작성
  - 학습 정리
  - React
  - TypeScript
  - 서버 상태 관리
source: 사용자 학습 노트 (서버 상태 관리 — 벌크 뮤테이션·bulk API·원자성·MSW 목킹)
legacy_url: 'https://saver7942.blogspot.com/2026/07/n.html'
draft: false
---

[이전 편](https://saver7942.blogspot.com/2026/07/persistqueryclient.html)까지는 읽기·쓰기의 개별 동작을 다뤘습니다. 이번엔 **대량 작업**입니다.

관리자 화면에서 유저 100명을 선택해 지운다고 합시다. 순진하게 만들면 `selectedIds.forEach(id => deleteMutation.mutate(id))`처럼 삭제 요청이 100번 나갑니다. 브라우저의 동시 연결 제한(6개)에 걸려 요청이 줄을 서고, 그중 몇 개가 실패하면 "일부만 지워진" 상태가 됩니다. 이 두 문제 — 네트워크 폭풍과 원자성 파괴 — 를 벌크 요청 하나로 잡습니다.

#### 목차

1. [개별 처리의 두 재앙](#1)

2. [벌크 API — 배열을 한 요청에](#2-api)

3. [useMutation — 배열을 통째로 넘긴다](#3-usemutation)

4. [원자성은 서버의 몫](#4)

5. [MSW로 서버 없이 재현](#5-msw)

6. [주의사항](#6)

7. [핵심 정리](#7)

---

## 🌩️ 1. 개별 처리의 두 재앙

100개를 개별 요청으로 지우면 두 가지가 무너집니다.

- **네트워크 폭풍** — 요청이 100개 나갑니다. 브라우저는 한 호스트에 동시 연결을 6개쯤으로 제한하므로, 나머지는 대기열에서 순서를 기다립니다(waterfall). 그동안 다른 요청(이미지·API)도 밀립니다.

- **원자성 파괴** — 100개 중 97개는 성공하고 3개가 실패하면, 데이터가 "일부만 지워진" 어정쩡한 상태가 됩니다. "전부 되거나, 아예 안 되거나"가 보장되지 않습니다.

두 문제의 뿌리는 같습니다. **하나의 논리적 작업(100명 삭제)을 100개의 물리적 요청으로 쪼갰기 때문입니다.** 작업을 하나로 묶으면 둘 다 사라집니다.

> 용어를 짚고 갑니다. 이 패턴을 "쿼리 배칭"이라 부르기도 하지만, TanStack Query에 그런 기능이 따로 있는 것은 아닙니다. 정확히는 **벌크(bulk) 엔드포인트를 클라이언트가 명시적으로 호출**하는 것입니다. 여러 요청을 라이브러리가 자동 병합하는 DataLoader류와는 다릅니다.

---

## 📦 2. 벌크 API — 배열을 한 요청에

`DELETE /users/:id`를 ID마다 부르는 대신, ID 배열을 본문에 담아 한 번 보냅니다.

```tsx
// src/api/userApi.ts
export const bulkDeleteUsers = async (userIds: number[]): Promise<{ success: boolean }> => {
  // 본문에 데이터를 실어야 하므로 POST를 관례적으로 씁니다
  const res = await fetch('/api/users/bulk-delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids: userIds }),   // ID가 100개여도 요청은 1번
  });
  if (!res.ok) throw new Error('벌크 삭제 중 에러가 발생했습니다.');
  return res.json();
};
```

ID가 몇 개든 요청은 한 번입니다. 네트워크 왕복이 100회에서 1회로 줄어듭니다. `DELETE`도 본문을 가질 수는 있지만, 프록시·캐시 호환성 때문에 벌크 작업은 `POST`로 두는 편이 무난합니다.

---

## 🎯 3. useMutation — 배열을 통째로 넘긴다

[7편](https://saver7942.blogspot.com/2026/07/usemutation.html)의 `useMutation`을 그대로 쓰되, `mutationFn`의 인자가 단일 ID가 아니라 **ID 배열**이라는 점만 다릅니다.

```tsx
// src/hooks/useBulkDelete.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { bulkDeleteUsers } from '../api/userApi';

export function useBulkDeleteUsers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userIds: number[]) => bulkDeleteUsers(userIds),  // 배열을 받는다
    onSuccess: () => {
      // 100번이 아니라 단 한 번의 무효화
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
```

컴포넌트에서는 반복문 없이 배열을 통째로 넘깁니다.

```tsx
const bulkDelete = useBulkDeleteUsers();

// 반복문 없이 선택 배열을 한 번에 — 요청 1회
bulkDelete.mutate(selectedIds, {
  onSuccess: () => setSelectedIds([]),
});

// 버튼: 진행 중엔 잠근다
<button disabled={selectedIds.length === 0 || bulkDelete.isPending}>
  {bulkDelete.isPending ? '삭제 중...' : '일괄 삭제'}
</button>
```

핵심은 두 가지입니다. **요청이 한 번**이라 `isPending`도 하나로 관리되고, **무효화도 한 번**([3편](https://saver7942.blogspot.com/2026/07/query-key-factory.html)의 키로 `['users']` 무효화)이라 목록 갱신 연산이 100번 반복되지 않습니다.

---

## 🔒 4. 원자성은 서버의 몫

여기서 명확히 할 것이 있습니다. **원자성(all-or-nothing)을 보장하는 주체는 클라이언트가 아니라 서버입니다.**

클라이언트가 하는 일은 "ID 배열을 한 요청으로 보내고, 성공·실패 응답을 받는 것"까지입니다. 서버는 그 배열을 받아 하나의 **DB 트랜잭션**으로 처리합니다.

```sql
-- 서버: 한 트랜잭션 안에서
DELETE FROM users WHERE id IN (101, 102, 103, ...);
-- 하나라도 실패하면 전체 ROLLBACK → "일부만 삭제" 상태가 생기지 않음
```

클라이언트 입장에서 얻는 것은 **부분 실패 상태가 사라진다**는 점입니다. 응답은 "전체 성공" 또는 "전체 실패" 둘 중 하나이므로, `onSuccess`면 전부 지워졌고 `onError`면 하나도 안 지워졌다고 확신할 수 있습니다. 개별 요청 100개일 때의 "몇 개는 됐고 몇 개는 안 됐다"는 회색 지대가 없어집니다.

---

## 🧪 5. MSW로 서버 없이 재현

벌크 엔드포인트가 아직 없어도, MSW(Mock Service Worker)로 서버 응답을 가로채 실습할 수 있습니다.

```tsx
// src/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.post('/api/users/bulk-delete', async ({ request }) => {
    const { ids } = (await request.json()) as { ids: number[] };
    // 서버가 한 트랜잭션으로 처리한다고 가정
    return HttpResponse.json({ success: true, count: ids.length });
  }),
];
```

```tsx
// src/mocks/browser.ts
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';
export const worker = setupWorker(...handlers);
```

```tsx
// src/main.tsx — 개발 환경에서만 워커 실행
async function enableMocking() {
  if (!import.meta.env.DEV) return;         // Vite 환경 판별
  const { worker } = await import('./mocks/browser');
  return worker.start({ onUnhandledRequest: 'bypass' });
}

enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
});
```

- **`import.meta.env.DEV`** — 원본 강의의 `process.env.NODE_ENV`는 Vite에서 기본으로 정의되지 않습니다. Vite는 `import.meta.env.DEV`(개발 시 `true`)를 씁니다.

- **MSW v2 API** — `http`·`HttpResponse`·`msw/browser`는 v2 형식입니다. Vite에서 `optimizeDeps.exclude: ['@mswjs/interceptors']`로 노드 전용 모듈이 브라우저 번들에 섞이는 것을 막습니다.

이제 삭제를 실행하면 Network 탭에 `bulk-delete` 요청이 **정확히 1개**만 남습니다. 개별 처리의 계단식 waterfall이 사라진 것을 눈으로 확인할 수 있습니다.

---

## ⚠️ 6. 주의사항

- **벌크는 서버 계약이 먼저입니다** — 클라이언트만 배열을 보내도 서버에 `bulk-delete` 엔드포인트가 없으면 소용없습니다. 벌크는 프론트·백엔드가 함께 합의하는 API 설계입니다.

- **"쿼리 배칭"과 혼동하지 않습니다** — 이건 명시적 벌크 엔드포인트 호출이지, 라이브러리가 여러 요청을 자동 병합하는 기능이 아닙니다.

- **한 번에 보내는 양에 상한을 둡니다** — ID 1만 개를 한 요청에 담으면 본문이 지나치게 커지고 서버 트랜잭션도 무거워집니다. 수백~수천 단위로 청크를 나눠 보내는 편이 안전합니다.

- **낙관적 업데이트와 조합** — 삭제가 성공할 것이 확실하면 [8편](https://saver7942.blogspot.com/2026/07/onmutate-0-ux.html)의 낙관적 업데이트로 선택 항목을 즉시 화면에서 지우고, 실패 시 롤백할 수 있습니다.

- **부분 성공 API라면 응답 처리를 다르게** — 서버가 "성공한 ID / 실패한 ID"를 나눠 돌려주는 설계라면, `onSuccess`에서 그 결과를 보고 UI를 부분 갱신해야 합니다. 원자적 all-or-nothing과는 다른 계약입니다.

---

## ✅ 7. 핵심 정리

- **개별 요청 N개의 두 재앙은 네트워크 폭풍과 원자성 파괴입니다.** 하나의 논리적 작업을 여러 물리적 요청으로 쪼갰기 때문입니다.

- **벌크 API + `useMutation`(배열 인자)로 요청을 1번으로 줄입니다.** 왕복이 100회에서 1회가 되고, 무효화도 한 번이면 됩니다.

- **원자성은 서버 트랜잭션의 몫입니다.** 클라이언트는 부분 실패 상태가 사라지는 이점을 얻습니다 — 응답이 전체 성공 아니면 전체 실패입니다.

- **"쿼리 배칭"이라는 이름에 속지 않습니다.** TanStack Query의 자동 기능이 아니라, 벌크 엔드포인트를 설계해 명시적으로 호출하는 패턴입니다. 양이 크면 청크로 나눕니다.

---

## 🔗 참고 자료

- 이전 편: [캐시 지속성 — persistQueryClient로 새로고침 너머 데이터 살리기](https://saver7942.blogspot.com/2026/07/persistqueryclient.html)

- [TanStack Query 공식 문서 — Mutations](https://tanstack.com/query/latest/docs/framework/react/guides/mutations)

- [MSW 공식 문서 — Getting Started](https://mswjs.io/docs/getting-started)

- [MDN — 브라우저 동시 연결 제한](https://developer.mozilla.org/en-US/docs/Web/HTTP/Connection_management_in_HTTP_1.x)
