---
title: '검색 UX 깜빡임 없애기: keepPreviousData와 디바운스'
slug: react-query-keep-previous-data-search
description: >-
  검색어를 한 글자 칠 때마다 리스트가 사라졌다 다시 뜨고, 그 사이 푸터가 위로 튑니다. `queryKey`에 검색어가 들어가 매번 새 키가
  되고, 새 키엔 캐시가 없어 `data`가 `undefined`로 비기 때문입니다. `placeholderData:
  keepPreviousData`로 전환 중 이전 결과를 유지해 깜빡임과 레이아웃 이동을 없애고, 디바운스로 키 변경(요청) 자체를 줄이는 두
  축을 정리합니다.
published_at: '2026-07-27T01:25:37-07:00'
labels:
  - AI 작성
  - 학습 정리
  - React
  - TypeScript
  - 서버 상태 관리
source: 사용자 학습 노트 (서버 상태 관리 — 검색 깜빡임/데이터 공백기 → keepPreviousData·디바운스)
legacy_url: 'https://saver7942.blogspot.com/2026/07/ux-keeppreviousdata.html'
draft: false
series: react-query
part: 10
---

[이전 편](https://saver7942.blogspot.com/2026/07/ux-prefetchquery-intersectionobserver.html)이 "로딩을 안 보이게" 하는 이야기였다면, 이번엔 "이미 보이던 것을 안 사라지게" 하는 이야기입니다.

검색창에 "안녕"을 한 글자씩 쳐 보면, 글자마다 리스트가 하얗게 비었다가 1초 뒤 팍 하고 다시 뜹니다. 그때마다 리스트가 차지하던 높이가 0이 되어 아래 푸터가 위로 홱 올라옵니다(레이아웃 이동, CLS). 이 깜빡임의 원인은 앞선 질문에서 짚었던 `queryKey` 동작에 있습니다. 원인을 정확히 보고, 두 가지 도구로 없앱니다.

---

## 🩹 1. 데이터 공백기 — 왜 리스트가 사라지나

문제 코드입니다.

```tsx
const [searchTerm, setSearchTerm] = useState('');

const { data, isLoading } = useQuery({
  queryKey: ['search', searchTerm],           // 검색어가 키에 들어간다
  queryFn: () => fetchSearchResults(searchTerm),
});

// ...
{isLoading ? <Spinner /> : <ul>{data?.map(...)}</ul>}   // 로딩이면 리스트를 지운다
```

`isLoading`이 `true`가 되는 순간 리스트 전체가 `<Spinner />`로 교체됩니다. 리스트가 차지하던 약 200px이 사라지면서, 브라우저가 레이아웃을 다시 계산하고 아래 요소가 위로 끌려 올라옵니다. 검색어를 칠 때마다 이 "공백기"가 반복되어 화면이 요동칩니다.

핵심 질문은 **왜 검색어를 칠 때마다 `isLoading`이 다시 `true`가 되는가**입니다.

---

## 🔑 2. queryKey 변경이 곧 다른 쿼리다

`searchTerm`이 `'안'` → `'안녕'`으로 바뀌면 `queryKey`가 `['search', '안']` → `['search', '안녕']`으로 달라집니다. TanStack Query는 `queryKey`를 **결정론적 문자열로 직렬화**해 캐시의 열쇠로 씁니다.

```
['search', '안']   →  '["search","안"]'
['search', '안녕'] →  '["search","안녕"]'
```

이 문자열이 다르면 캐시에서 **완전히 다른 주소**입니다. 그래서 검색어가 바뀌면:

| 값 | 새 키로 바뀐 직후 |
| :---: | :---: |
| 훅(`useQuery`) | 그대로 살아 있음 (초기화 아님) |
| 구독 대상 | 새 키의 쿼리로 갈아탐 |
| `data` | `undefined` (새 키엔 캐시 없음) |
| `isLoading` | `true` (첫 요청) |

`useQuery`가 초기화되는 게 아니라, **매번 새 키를 구독하는데 그 키에 캐시가 없어서** `data`가 비고 `isLoading`이 켜지는 것입니다. 이 "빈 데이터" 순간이 리스트를 지워 버립니다.

그렇다면 해법은 둘입니다. **전환 중에도 이전 결과를 화면에 남겨 두거나**(keepPreviousData), **키가 바뀌는 횟수 자체를 줄이는 것**(디바운스)입니다.

---

## 🎞️ 3. keepPreviousData — 전환 중 이전 결과를 유지

`placeholderData`에 `keepPreviousData`를 넘기면, 새 키의 데이터를 기다리는 동안 `data`가 `undefined`로 비지 않고 **직전 키의 결과를 그대로 유지**합니다.

```tsx
import { useQuery, keepPreviousData } from '@tanstack/react-query';

const { data, isLoading, isPlaceholderData } = useQuery({
  queryKey: ['search', searchTerm],
  queryFn: () => fetchSearchResults(searchTerm),
  placeholderData: keepPreviousData,   // ✨ 핵심 한 줄
});
```

이제 검색어를 바꿔도 리스트가 사라지지 않습니다. 이전 결과가 화면에 남아 있는 채로 뒤에서 새 요청이 나가고, 새 결과가 도착하면 스르륵 교체됩니다. 리스트 높이가 유지되니 푸터도 튀지 않습니다 — 레이아웃 이동이 사라집니다.

`isLoading`(=`isPending`)도 달라집니다. 보여줄 이전 데이터가 있으므로 `isLoading`은 `false`로 유지되고, 새 요청이 진행 중임은 `isFetching`이 `true`로 알려줍니다([4편](https://saver7942.blogspot.com/2026/07/tanstack-query-freshstaleinactive.html)의 두 플래그 구분이 여기서 실전으로 쓰입니다).

> v4에서는 `keepPreviousData: true`라는 별도 옵션이었지만, v5에서 `placeholderData: keepPreviousData`(함수를 넘기는 형태)로 통합됐습니다.

---

## 🏷️ 4. isPlaceholderData — 낡은 결과임을 표시

이전 데이터를 유지하면 한 가지 신경 쓸 점이 있습니다. 지금 화면의 리스트가 **현재 검색어의 결과가 아니라 직전 검색어의 결과**일 수 있다는 점입니다. `useQuery`가 반환하는 `isPlaceholderData`가 "지금 보이는 게 이전 데이터인가"를 알려줍니다.

```tsx
<ul style={{ opacity: isPlaceholderData ? 0.5 : 1, transition: 'opacity 0.2s' }}>
  {data?.map((item) => <li key={item.id}>{item.title}</li>)}
</ul>
```

`isPlaceholderData`가 `true`인 동안 리스트를 살짝 흐리게 처리하면, 사용자는 "결과가 갱신되는 중"임을 자연스럽게 인지합니다. 화면이 사라지는 단절 대신, 부드러운 전환이 됩니다.

`keepPreviousData`를 적용하면 세 상태 신호의 의미가 이렇게 정리됩니다.

| 신호 | keepPreviousData 적용 시 | 어디에 쓰나 |
| :---: | :---: | :---: |
| `isLoading`(`isPending`) | 캐시가 아예 없는 **최초 1회만** `true` | 첫 진입 전체 로딩 화면 |
| `isFetching` | 키가 바뀔 때마다 요청 중이면 `true` | "업데이트 중" 인디케이터 |
| `isPlaceholderData` | 지금 데이터가 이전 키의 **대역**이면 `true` | 흐림 처리 등 전환 표시 |

전환 중 스피너는 `isLoading`이 아니라 `isFetching`에 물려야 합니다. `keepPreviousData`에서는 `isLoading`이 최초 1회만 켜지므로, `isLoading`에 물리면 두 번째 검색부터는 "업데이트 중" 표시가 아예 안 뜹니다.

---

## ⏱️ 5. 디바운스 — 키 변경 자체를 줄인다

`keepPreviousData`가 깜빡임을 없애도, 글자마다 새 키 → 새 요청이 나가는 것은 그대로입니다. "안녕하세요"를 치면 요청이 여섯 번 나갑니다. 대부분은 사용자가 보지도 않을 중간 결과입니다.

디바운스로 "타이핑이 멈춘 뒤"에만 검색어를 확정합니다.

```tsx
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);   // 다음 입력이 오면 이전 타이머 취소
  }, [value, delay]);
  return debounced;
}

// 컴포넌트 안에서
const debouncedTerm = useDebounce(searchTerm, 300);

const { data } = useQuery({
  queryKey: ['search', debouncedTerm],   // 확정된 검색어만 키에
  queryFn: () => fetchSearchResults(debouncedTerm),
  placeholderData: keepPreviousData,
});
```

입력값(`searchTerm`)은 매 글자 바뀌지만, `queryKey`에 들어가는 `debouncedTerm`은 300ms 동안 추가 입력이 없을 때만 갱신됩니다. 그래서 빠르게 타이핑하는 동안에는 키가 바뀌지 않아 요청이 나가지 않습니다. 이것은 1편에서 본 "입력마다 요청" 문제를 검색에 맞게 푼 것입니다.

두 도구는 **역할이 다릅니다.** 디바운스는 **요청 수**를 줄이고, `keepPreviousData`는 요청이 나갈 때의 **깜빡임**을 없앱니다. 보통 둘을 함께 씁니다.

---

## ⚠️ 6. 주의사항

- **디바운스와 keepPreviousData는 대체재가 아닙니다** — 디바운스만 쓰면 확정된 검색 사이에 여전히 공백기가 생기고, `keepPreviousData`만 쓰면 글자마다 요청이 나갑니다. 둘은 함께여야 완성됩니다.

- **빈 결과 처리** — 검색 결과가 0건이면 `data`는 빈 배열입니다. `isPlaceholderData`가 `false`인데 배열이 비었을 때 "결과 없음"을 보여주고, `true`인 동안(이전 결과 유지 중)에는 섣불리 "없음"을 띄우지 않습니다.

- **`placeholderData`와 캐시는 다릅니다** — `keepPreviousData`로 보이는 이전 데이터는 화면 유지용 placeholder일 뿐, 새 키의 캐시로 저장되지 않습니다. 새 키의 실제 데이터가 도착하면 교체됩니다.

- **레이아웃 안정화는 CSS로도 보강** — 결과 영역에 `min-height`를 두면, 결과 개수가 달라져도 높이 변동을 줄여 레이아웃 이동을 추가로 억제할 수 있습니다.

- **디바운스 지연은 체감과 요청 수의 균형** — 너무 짧으면(100ms) 요청이 잦고, 너무 길면(800ms) 반응이 굼떠 보입니다. 300ms 안팎이 무난합니다.

---

## ✅ 7. 핵심 정리

- **깜빡임의 원인은 `queryKey` 변경입니다.** 검색어가 키에 들어가 매번 새 키가 되고, 새 키엔 캐시가 없어 `data`가 `undefined`, `isLoading`이 `true`가 되며 리스트가 사라집니다.

- **`placeholderData: keepPreviousData`가 전환 중 이전 결과를 유지합니다.** 리스트가 안 사라지니 레이아웃 이동(CLS)이 사라지고, `isLoading` 대신 `isFetching`으로 갱신 상태를 다룹니다(v5 형태).

- **`isPlaceholderData`로 "갱신 중"을 표시합니다.** 이전 결과를 살짝 흐리게 해 사용자에게 전환을 알립니다.

- **디바운스는 요청 수를, keepPreviousData는 깜빡임을 줄입니다.** 역할이 다른 두 도구를 함께 써야 매끄러운 검색 UX가 완성됩니다.

---

## 🔗 참고 자료

- 다음 편: [select 옵션 — 서버 데이터를 컴포넌트에 맞게 변환하고 리렌더 줄이기](https://saver7942.blogspot.com/2026/07/select.html)

- 이전 편: [프리페칭으로 로딩 없는 UX — 호버 prefetchQuery와 IntersectionObserver](https://saver7942.blogspot.com/2026/07/ux-prefetchquery-intersectionobserver.html)

- [TanStack Query 공식 문서 — Paginated / Lagged Queries (keepPreviousData)](https://tanstack.com/query/latest/docs/framework/react/guides/paginated-queries)

- [TanStack Query 공식 문서 — placeholderData](https://tanstack.com/query/latest/docs/framework/react/guides/placeholder-query-data)

- [web.dev — Cumulative Layout Shift (CLS)](https://web.dev/articles/cls)
