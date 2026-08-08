---
title: 'useMutation으로 서버 바꾸기: 성공 후 캐시를 무효화해 화면 맞추기'
slug: react-query-usemutation-invalidate
description: >-
  `useQuery`가 서버를 관찰하는 읽기였다면, `useMutation`은 서버를 바꾸는
  쓰기(Create·Update·Delete)입니다. `mutate`로 방아쇠를 당기는 명령형 인터페이스와
  `onSuccess`·`onError`·`onSettled` 콜백을 정리하고, 이 편의 핵심 — mutationFn이 성공해도 화면 속
  캐시는 자동으로 바뀌지 않는다는 사실과, 앞서 만든 팩토리 키로 `invalidateQueries`를 호출해 화면을 서버와 다시 맞추는
  마무리를 다룹니다.
published_at: '2026-07-23T23:40:41-07:00'
labels:
  - AI 작성
  - 학습 정리
  - React
  - TypeScript
  - 서버 상태 관리
source: >-
  사용자 학습 노트 (서버 상태 관리 —
  useMutation·onSuccess/onError/onSettled·invalidateQueries)
legacy_url: 'https://saver7942.blogspot.com/2026/07/usemutation.html'
draft: false
series: react-query
part: 6
---

[이전 편](/posts/react-query-parallel-suspense-queries/)까지 여섯 편은 전부 **읽기**였습니다. `useQuery`도 `useSuspenseQuery`도 서버 데이터를 관찰해 화면에 비추는 도구입니다. 하지만 실제 앱은 데이터를 읽기만 하지 않습니다. 글을 쓰고, 고치고, 지웁니다.

`useMutation`은 그 쓰기를 담당합니다. `useQuery`가 마운트되면 알아서 데이터를 가져오는 **관찰자**라면, `useMutation`은 버튼을 눌러야 비로소 움직이는 **행동 대장**입니다. 이 편은 그 사용법과 함께, 초보가 반드시 한 번은 부딪히는 지점 — "서버는 바꿨는데 화면이 그대로"인 상황을 풀어냅니다.

---

## 🎯 1. useQuery vs useMutation — 관찰자와 행동 대장

둘은 실행 방식부터 반대입니다.

| 구분 | useQuery | useMutation |
| :---: | :---: | :---: |
| 실행 시점 | 마운트·키 변경 시 자동 | `mutate()` 호출 시에만 |
| 성격 | 선언적 관찰 | 명령형 행동 |
| 담당 | Read | Create · Update · Delete |
| 비유 | 메뉴판을 계속 지켜봄 | 벨을 눌러 "주문할게요" |

`useQuery`는 화면에 나타나는 순간 스스로 데이터를 가져옵니다. `useMutation`은 아무리 렌더돼도 가만히 있다가, 사용자가 버튼을 누르거나 폼을 제출해 `mutate`를 호출해야 그때 서버로 요청을 보냅니다. 서버의 상태를 **바꾸는** 일은 사용자의 명시적 행동에 묶여야 하기 때문입니다.

---

## 🔫 2. 기본형 — mutate라는 방아쇠

게시글을 수정하는 예입니다. 먼저 요청/응답 규격을 나눕니다.

```tsx
// src/api/mockApi.ts
export interface Post { id: number; title: string; content: string; }
export interface UpdatePostDto { id: number; title: string; content: string; }

export const updatePost = async (dto: UpdatePostDto): Promise<Post> => {
  console.log(`📡 [Network] 게시글 수정 요청: ${dto.title}`);
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() < 0.1) reject(new Error('서버가 수정을 거절했습니다.'));
      resolve({ id: dto.id, title: dto.title, content: dto.content });
    }, 2000);
  });
};
```

`UpdatePostDto`(보낼 것)와 `Post`(받을 것)를 나눈 이유는, `mutate`에 넘길 인자와 성공 시 돌아올 데이터의 타입을 각각 못박기 위해서입니다.

```tsx
// src/components/PostEditor.tsx
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { updatePost } from '../api/mockApi';
import type { Post, UpdatePostDto } from '../api/mockApi';

export default function PostEditor() {
  const [title, setTitle] = useState('기존 제목');

  // useMutation<TData, TError, TVariables>
  const { mutate, isPending } = useMutation<Post, Error, UpdatePostDto>({
    mutationFn: (dto) => updatePost(dto),
  });

  return (
    <div>
      <input value={title} onChange={(e) => setTitle(e.target.value)} disabled={isPending} />
      <button onClick={() => mutate({ id: 1, title, content: '수정된 내용' })} disabled={isPending}>
        {isPending ? '수정 중...' : '수정하기'}
      </button>
    </div>
  );
}
```

- **`mutate(변수)`** — 이 호출이 방아쇠입니다. 넘긴 인자가 `mutationFn`의 파라미터로 그대로 전달됩니다.

- **`isPending`** — 요청이 진행 중인지입니다. 버튼과 입력을 `disabled`로 묶어 응답을 기다리는 동안의 중복 제출을 막습니다.

- **제네릭 3개** — `<Post, Error, UpdatePostDto>`는 각각 성공 데이터·에러·`mutate` 인자의 타입입니다. `mutationFn`의 인자 타입을 적으면 `TVariables`는 추론되지만, `TError`는 기본이 `unknown`이라 `Error`로 좁히려면 명시하는 편이 콜백에서 편합니다.

---

## 🎭 3. 콜백 트리오 — onSuccess · onError · onSettled

`useMutation`의 힘은 요청 이후의 흐름을 선언적으로 나눠 잡는 데 있습니다.

```tsx
const { mutate, isPending } = useMutation<Post, Error, UpdatePostDto>({
  mutationFn: (dto) => updatePost(dto),

  onSuccess: (data, variables) => {
    // data: 서버가 돌려준 결과, variables: 내가 보낸 값
    console.log(`✅ '${data.title}'로 수정됨`);
  },
  onError: (error, variables) => {
    console.error(`❌ 실패: ${error.message} (보낸 제목: ${variables.title})`);
  },
  onSettled: () => {
    // 성공·실패 무관하게 항상 마지막에
    console.log('🏁 통신 종료');
  },
});
```

| 콜백 | 호출 시점 | 받는 인자 |
| :---: | :---: | :---: |
| `onSuccess` | 성공 | `(data, variables, context)` |
| `onError` | 실패 | `(error, variables, context)` |
| `onSettled` | 성공·실패 모두 | `(data, error, variables, context)` |

특히 모든 콜백이 `variables` — 내가 보낸 값 — 를 함께 받는 점이 유용합니다. 실패 시 "무엇을 보내다 실패했는지"를 그대로 알 수 있어 재시도나 에러 메시지에 활용합니다.

---

## 🕳️ 4. 함정 — 서버는 바꿨는데 화면이 그대로

여기가 이 편의 핵심입니다. `mutationFn`이 성공해도 **화면 속 데이터(캐시)는 저절로 바뀌지 않습니다.**

`updatePost`는 서버의 값을 고칩니다. 하지만 그 게시글을 화면에 그리던 `useQuery(['posts','detail',1])`의 캐시는 여전히 옛 데이터를 들고 있습니다. TanStack Query는 "이 mutation이 그 캐시와 관련 있다"는 것을 알 방법이 없기 때문입니다.

> 서버라는 과녁은 맞혔지만, 눈앞의 점수판은 아직 옛 점수 그대로입니다.

`onSuccess`에서 `alert`만 띄우고 끝내면, 사용자는 "수정됐습니다"라는 메시지를 보면서도 화면엔 그대로인 옛 제목을 보게 됩니다. 캐시를 서버와 다시 맞추는 한 걸음이 빠졌기 때문입니다.

맞추는 방법을 몰라 흔히 두 갈래의 나이브한 길로 샙니다.

- **강제 새로고침** — `onSuccess`에서 `window.location.reload()`. 서버 값은 확실히 다시 받지만, 이미 받아 둔 JS·CSS·이미지를 전부 버리고 앱을 통째로 재부팅합니다. 스크롤 위치와 작성 중이던 입력이 사라지고 화면이 잠깐 하얘집니다. SPA의 이점을 스스로 반납하는 셈입니다.

- **수동 `setState` 동기화** — 응답으로 관련 `useState`를 `map`으로 갈아끼웁니다. 그러나 이 데이터와 엮인 상태가 어디어디 있는지 전부 기억해야 하고(인지 부하), 하나라도 빠뜨리면 불일치, 여러 요청이 겹치면 경쟁 상태입니다. [1편](/posts/react-useeffect-fetching-pitfalls/)에서 벗어났던 그 지옥으로 되돌아갑니다.

두 길 모두 캐시를 "내가 관리할 남의 문제"로 취급합니다. 하지만 그 캐시를 관리하는 주체는 이미 있습니다. 거기에 "낡았다"고 알리기만 하면 됩니다.

---

## 🔄 5. invalidateQueries — 점수판을 다시 맞춘다

맞추는 방법이 [3편](/posts/react-query-key-factory/)의 `invalidateQueries`입니다. 성공 직후, 영향받은 캐시를 무효화합니다.

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updatePost } from '../api/mockApi';
import { postKeys } from '../queries/queryKeys';

export default function PostEditor() {
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation<Post, Error, UpdatePostDto>({
    mutationFn: (dto) => updatePost(dto),
    onSuccess: (data) => {
      // 이 게시글 상세 캐시를 무효화 → 화면이 자동으로 다시 가져온다
      queryClient.invalidateQueries({ queryKey: postKeys.detail(data.id) });
      // 목록에도 반영돼야 하면 목록 계열까지
      queryClient.invalidateQueries({ queryKey: postKeys.lists() });
    },
  });
  // ...
}
```

이 한 걸음이 앞의 두 편을 회수합니다. `invalidateQueries`는 해당 캐시를 [4편](/posts/react-query-data-lifecycle/)에서 본 **stale 상태로 만들고**, 그 쿼리를 지금 화면에서 쓰고 있다면 곧바로 배경 재요청을 트리거합니다. stale이 되는 트리거 네 가지 중 "수동 무효화"가 바로 이것입니다.

그리고 [3편](/posts/react-query-key-factory/)의 팩토리 키가 여기서 빛을 냅니다. `postKeys.lists()`처럼 계열 키 하나를 넘기면 부분 매칭으로 목록 관련 캐시가 한 번에 걸립니다. 문자열을 흩어 놨다면 무효화할 키를 일일이 찾아 적어야 했을 자리입니다.

<details>
<summary>수정 버튼을 누른 뒤의 전체 흐름</summary>
<pre><code>1. mutate({ id:1, title:'새 제목', ... }) 호출
2. mutationFn(updatePost) 실행 → 서버 값 변경 (2초)
3. onSuccess 진입 → invalidateQueries({ queryKey: ['posts','detail',1] })
4. 해당 캐시가 stale로 전환 + 화면에서 활성 상태라 즉시 refetch
5. 새 데이터 도착 → 화면의 제목이 '새 제목'으로 갱신</code></pre>
</details>

"쓰고 나서 무효화한다"가 TanStack Query에서 쓰기의 기본 리듬입니다.

---

## ⚠️ 6. 주의사항

- **`mutate` vs `mutateAsync`** — `mutate`는 프로미스를 반환하지 않고 결과를 콜백으로 다룹니다. `await`가 필요하거나 여러 mutation을 순서대로 엮어야 하면 `mutateAsync`를 쓰되, 반드시 `try/catch`로 감쌉니다(안 그러면 unhandled rejection).

- **`onSuccess`는 두 곳에 둘 수 있다** — `useMutation` 옵션의 콜백과 `mutate(vars, { onSuccess })` 호출 시 콜백이 있습니다. 캐시 무효화처럼 항상 필요한 로직은 옵션에, 특정 호출에만 필요한 UI 처리는 `mutate` 쪽에 둡니다. 컴포넌트가 언마운트되면 `mutate` 쪽 콜백은 실행되지 않을 수 있으니, 무효화는 옵션 콜백에 두는 편이 안전합니다.

- **무효화 대신 직접 갱신도 가능** — `queryClient.setQueryData(key, 새값)`로 응답 데이터를 캐시에 곧장 써 넣으면 재요청 없이 즉시 반영됩니다. 다만 서버 계산 결과와 어긋날 위험이 있어, 확실할 때만 씁니다.

- **낙관적 업데이트는 다음 단계** — 응답을 기다리지 않고 화면을 먼저 바꾸는 방식은 `onMutate`에서 캐시를 미리 고치고 `onError`에서 되돌리는 패턴입니다. 체감 속도를 크게 높이지만 롤백 설계가 필요해, 기본 리듬(무효화)에 익숙해진 뒤 적용합니다. [다음 편](/posts/react-query-optimistic-update/)에서 이 패턴을 자세히 다룹니다.

- **`isPending`으로 버튼을 잠급니다** — mutation의 `isPending`은 요청 진행 상태입니다. 결제·전송처럼 중복 실행이 치명적인 동작은 반드시 버튼을 `disabled`로 묶습니다.

---

## ✅ 7. 핵심 정리

- **`useMutation`은 명령형 쓰기입니다.** `mutate` 호출이 방아쇠이고, 마운트만으로는 실행되지 않습니다. Create·Update·Delete를 담당합니다.

- **콜백 트리오로 이후를 나눠 잡습니다.** `onSuccess`·`onError`·`onSettled`가 각각 성공·실패·마무리를 맡고, 모두 내가 보낸 `variables`를 함께 받습니다.

- **성공이 곧 화면 갱신은 아닙니다.** `mutationFn`은 서버만 바꾸고 캐시는 그대로입니다. `onSuccess`에서 `invalidateQueries`로 관련 캐시를 무효화해야 화면이 서버와 맞춰집니다.

- **여기서 시리즈가 하나로 묶입니다.** 3편의 팩토리 키로 무효화 대상을 지목하고, 그 무효화가 4편의 stale→트리거 흐름을 일으켜 화면을 갱신합니다. 읽기(`useQuery`)와 쓰기(`useMutation`)가 캐시라는 공용 저장소를 통해 이어집니다.

---

## 🔗 참고 자료

- 다음 편: [낙관적 업데이트 — onMutate·롤백·최종 동기화로 0초 UX 만들기](/posts/react-query-optimistic-update/)

- 이전 편: [useSuspenseQueries로 병렬 페칭 — Waterfall 함정 풀기](/posts/react-query-parallel-suspense-queries/)

- [TanStack Query 공식 문서 — Mutations](https://tanstack.com/query/latest/docs/framework/react/guides/mutations)

- [TanStack Query 공식 문서 — Mutation 이후 무효화](https://tanstack.com/query/latest/docs/framework/react/guides/invalidations-from-mutations)

- [TanStack Query 공식 문서 — Optimistic Updates](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates)
