---
title: '낙관적 업데이트: onMutate·롤백·최종 동기화로 0초 UX 만들기'
slug: react-query-optimistic-update
description: >-
  서버 응답을 기다린 뒤 화면을 바꾸는 대신, 성공을 가정하고 UI부터 즉시 바꾸는 낙관적 업데이트를 다룹니다. 인스타그램 좋아요 하트가 즉시
  빨개지는 그 방식입니다. `onMutate`에서 진행 중 쿼리를 취소하고 스냅샷을 찍은 뒤 캐시를 선제적으로 바꾸고, 실패하면
  `onError`가 스냅샷(TContext)으로 롤백하고, `onSettled`가 서버와 최종 동기화합니다. 체감 속도를 크게 높이지만 롤백
  설계라는 대가가 따르는 기법입니다.
published_at: '2026-07-24T01:23:19-07:00'
labels:
  - AI 작성
  - 학습 정리
  - React
  - TypeScript
  - 서버 상태 관리
source: 사용자 학습 노트 (서버 상태 관리 — 낙관적 업데이트 onMutate·cancelQueries·TContext 롤백·onSettled)
legacy_url: 'https://saver7942.blogspot.com/2026/07/onmutate-0-ux.html'
draft: false
series: react-query
part: 7
---

[이전 편](https://saver7942.blogspot.com/2026/07/usemutation.html)의 기본 리듬은 "쓰고 나서 무효화"였습니다. `mutate` → 서버 변경 → `invalidateQueries` → 재요청 → 화면 갱신. 안전하지만, 사용자는 요청이 끝날 때까지 결과를 못 봅니다. 1초 걸리면 1초를 기다립니다.

**낙관적 업데이트**는 순서를 뒤집습니다. 서버가 성공할 것이라 낙관하고, 응답이 오기 전에 화면부터 바꿉니다. 좋아요 버튼을 누르면 서버 응답을 기다리지 않고 하트가 즉시 빨개지는 그 방식입니다. 체감 대기 시간이 0이 됩니다. 대신 "실패하면 되돌린다"는 안전장치를 직접 설계해야 합니다. 그 설계가 이 편의 전부입니다.

---

## ⚡ 1. 발상 — 응답을 기다리지 않는다

두 방식의 시간축을 비교하면 차이가 분명합니다.

| | 기본(무효화) | 낙관적 업데이트 |
| :---: | :---: | :---: |
| 화면이 바뀌는 시점 | 서버 응답 후 | `mutate` 호출 즉시 |
| 사용자 체감 대기 | 요청 시간만큼 | 0초 |
| 실패 시 | 화면 변화 없음 | 되돌려야 함(롤백) |
| 설계 비용 | 낮음 | 높음 |

핵심은 "화면부터 바꾸고, 서버 응답으로 확정 또는 롤백"입니다. 성공을 낙관하되 실패를 대비합니다. 이 대비가 없으면, 서버 저장은 실패했는데 화면에는 성공한 것처럼 남는 **유령 데이터**가 생깁니다. 낙관적 업데이트에서 롤백은 선택이 아니라 필수입니다.

---

## 🎬 2. 세 단계 설계 — onMutate · onError · onSettled

`useMutation`의 콜백 세 개가 각자 역할을 맡습니다. 여기에 [이전 편](https://saver7942.blogspot.com/2026/07/usemutation.html)에서 안 쓰던 `onMutate`와 네 번째 제네릭 `TContext`가 등장합니다.

| 콜백 | 시점 | 역할 |
| :---: | :---: | :---: |
| `onMutate` | `mutate` 호출 직후(서버 요청 전) | 스냅샷 저장 + 화면 선제 변경 |
| `onError` | 실패 | 스냅샷으로 롤백 |
| `onSettled` | 성공·실패 모두 | 서버와 최종 동기화 |

`onMutate`가 반환한 값이 `onError`·`onSettled`의 `context` 인자로 전달됩니다. 이 통로가 롤백용 스냅샷을 나르는 `TContext`입니다.

```tsx
// useMutation<TData, TError, TVariables, TContext>
const { mutate } = useMutation<Todo, Error, Todo, { previousTodos: Todo[] | undefined }>({
  mutationFn: (newTodo) => postTodoApi(newTodo),
  onMutate: async (newTodo) => { /* ... 스냅샷 반환 */ },
  onError: (err, newTodo, context) => { /* context로 롤백 */ },
  onSettled: () => { /* invalidate */ },
});
```

---

## 📸 3. onMutate — 취소 · 스냅샷 · 선제 타격

`onMutate`는 `mutate`를 부르는 순간, 서버 요청이 나가기도 전에 실행됩니다. 세 가지를 순서대로 합니다.

```tsx
onMutate: async (newTodo: Todo) => {
  // 1. 진행 중인 재요청을 취소 — 뒤늦은 응답이 낙관적 UI를 덮지 않도록
  await queryClient.cancelQueries({ queryKey: todoKeys.all });

  // 2. 현재 캐시를 스냅샷으로 백업 (롤백용)
  const previousTodos = queryClient.getQueryData<Todo[]>(todoKeys.all);

  // 3. 서버 응답을 기다리지 않고 캐시에 낙관적 값을 즉시 주입
  queryClient.setQueryData<Todo[]>(todoKeys.all, (old) => [...(old ?? []), newTodo]);

  // 4. 스냅샷을 반환 → onError·onSettled의 context로 전달
  return { previousTodos };
},
```

- **`cancelQueries`가 왜 필수인가** — 마침 그 키의 배경 재요청이 진행 중이었다면, 그 응답이 방금 넣은 낙관적 값을 덮어써 화면이 깜빡입니다. 먼저 취소해 이 경쟁 상태를 막습니다. 빠뜨리면 "추가됐다가 잠깐 사라졌다 다시 나타나는" 현상이 생깁니다.

- **`getQueryData`로 스냅샷** — 되돌릴 지점을 사진처럼 찍어 둡니다. 이것이 롤백의 원본입니다.

- **`setQueryData`로 선제 타격** — 캐시를 직접 갈아끼웁니다. 화면이 이 캐시를 구독하고 있으니 즉시 새 항목이 뜹니다.

- **`return`이 곧 TContext** — 반환한 객체가 다음 콜백들의 `context`로 배달됩니다.

---

## ⏪ 4. onError — TContext로 롤백

서버가 거절하면, `onMutate`가 넘긴 스냅샷으로 캐시를 되돌립니다.

```tsx
onError: (err, newTodo, context) => {
  // onMutate가 반환한 스냅샷이 context로 도착
  if (context?.previousTodos) {
    queryClient.setQueryData(todoKeys.all, context.previousTodos);
  }
  alert(`복구됨: ${err.message}`);
},
```

`context.previousTodos`는 낙관적 변경 **직전**의 상태입니다. 그대로 `setQueryData`에 써 넣으면 방금 추가된 항목이 화면에서 사라지며 원래대로 돌아갑니다. `TContext` 타입을 `{ previousTodos: Todo[] | undefined }`로 명시해 둔 덕분에, 롤백 코드에서 `context`의 구조가 타입으로 보장됩니다. 여기서 타입을 대충 잡으면 롤백 도중 `undefined`를 참조하는 2차 사고가 납니다.

---

## 🧹 5. onSettled — 서버와 최종 동기화

성공했든 롤백했든, 마지막에 한 번 서버와 맞춥니다.

```tsx
onSettled: () => {
  queryClient.invalidateQueries({ queryKey: todoKeys.all });
},
```

성공한 경우에도 이 무효화가 필요한 이유가 있습니다. 낙관적으로 넣은 값은 **가짜**이기 때문입니다. 위 예에서 `id: Date.now()`처럼 임시로 만든 값은 서버가 실제로 부여한 ID·타임스탬프와 다릅니다. `onSettled`의 `invalidateQueries`가 서버의 진짜 데이터를 다시 가져와 임시 값을 조용히 교체합니다. 낙관적 UI가 "거의 맞는 화면"을 즉시 보여주고, 최종 동기화가 "정확히 맞는 화면"으로 마무리하는 구조입니다.

<details style="margin:10px 0 4px">
<summary style="cursor:pointer;font-weight:700;color:#C8443C">성공 / 실패 두 시나리오</summary>
<pre><code>[성공]
mutate → onMutate(임시항목 즉시 표시) → 서버 OK
       → onSettled invalidate → 진짜 ID로 교체
화면: 0초에 뜨고, 잠시 후 실제 데이터로 정합

[실패]
mutate → onMutate(임시항목 즉시 표시) → 서버 거절
       → onError(스냅샷으로 롤백, 항목 사라짐)
       → onSettled invalidate → 서버 기준으로 최종 확인
화면: 0초에 떴다가 실패 시 되돌아감</code></pre>
</details>

---

## ⚠️ 6. 주의사항 — 언제 쓰고 무엇을 조심하나

- **모든 곳에 쓰지 않습니다** — 낙관적 업데이트는 성공률이 높고 즉시성이 중요한 동작(좋아요, 토글, 정렬, 할 일 추가)에 맞습니다. 실패가 잦거나, 결과가 서버 계산에 크게 의존하는 동작(결제·잔액·재고)은 오히려 롤백의 깜빡임이 사용자를 혼란스럽게 합니다. 그런 곳은 기본 무효화가 낫습니다.

- **`cancelQueries`를 빠뜨리지 않습니다** — 이것이 낙관적 업데이트에서 가장 자주 생기는 버그의 원인입니다. 진행 중 요청을 취소하지 않으면 낙관적 값이 옛 응답에 덮여 화면이 깜빡입니다.

- **`onMutate`는 동기적으로 캐시를 바꿉니다** — 화면 반영이 즉시여야 하므로 `setQueryData`는 `await` 없이 곧장 호출합니다. `await`가 필요한 것은 `cancelQueries`뿐입니다.

- **임시 ID 충돌 주의** — `Date.now()`나 음수 ID 같은 임시 키는 잠깐만 유효합니다. `onSettled`의 무효화로 반드시 서버 값으로 교체되게 하고, 그 사이 `key`로 쓰지 않도록 합니다.

- **여러 필드를 바꾸면 스냅샷도 그만큼** — 목록과 상세를 함께 낙관적으로 바꾼다면, `onMutate`에서 각 캐시를 모두 백업하고 `onError`에서 모두 되돌려야 합니다. 하나라도 빠지면 부분 롤백으로 더 어긋납니다.

---

## ✅ 7. 핵심 정리

- **순서를 뒤집는 기법입니다.** 서버 응답을 기다린 뒤 화면을 바꾸는 대신, 성공을 가정해 화면부터 바꾸고 응답으로 확정하거나 되돌립니다. 체감 대기가 0이 됩니다.

- **세 콜백이 한 팀입니다.** `onMutate`(취소·스냅샷·선제 변경) → `onError`(스냅샷으로 롤백) → `onSettled`(서버와 최종 동기화). `onMutate`의 반환값이 `TContext`로 롤백 원본을 나릅니다.

- **`cancelQueries`와 롤백이 안전장치입니다.** 취소를 빠뜨리면 깜빡이고, 롤백을 빠뜨리면 유령 데이터가 남습니다. 둘 다 필수입니다.

- **비용을 아는 채로 씁니다.** 강력하지만 롤백 설계라는 대가가 따릅니다. 성공률 높고 즉시성이 값진 곳에 쓰고, 그렇지 않은 곳은 [이전 편](https://saver7942.blogspot.com/2026/07/usemutation.html)의 기본 무효화로 충분합니다.

---

## 🔗 참고 자료

- 다음 편: [무한 스크롤 — 수동 상태의 늪에서 useInfiniteQuery로](https://saver7942.blogspot.com/2026/07/useinfinitequery.html)

- 이전 편: [useMutation으로 서버 바꾸기 — 성공 후 캐시를 무효화해 화면 맞추기](https://saver7942.blogspot.com/2026/07/usemutation.html)

- [TanStack Query 공식 문서 — Optimistic Updates](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates)

- [TanStack Query 공식 문서 — cancelQueries](https://tanstack.com/query/latest/docs/framework/react/guides/query-cancellation)

- [TkDodo 블로그 — Mastering Mutations in React Query](https://tkdodo.eu/blog/mastering-mutations-in-react-query)
