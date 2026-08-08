---
title: 'useEffect 데이터 페칭이 무너지는 세 지점: 경쟁 상태·중복 요청·보일러플레이트'
slug: react-useeffect-fetching-pitfalls
description: >-
  `useEffect`에서 `fetch`하고 결과를 `useState`에 담는 가장 흔한 데이터 페칭 코드가 무너지는 세 지점을 실습 랩으로
  재현합니다. 늦게 도착한 응답이 최신 화면을 덮는 경쟁 상태, 같은 데이터를 컴포넌트 수만큼 요청하는 중복 호출, 로딩·에러·취소를 매번
  손으로 다시 쓰는 보일러플레이트입니다. 손으로 막는 최선인 `AbortController`에도 남는 구멍까지 확인합니다.
published_at: '2026-07-23T19:36:50-07:00'
labels:
  - AI 작성
  - 학습 정리
  - React
  - TypeScript
  - 서버 상태 관리
source: 사용자 학습 노트 (서버 상태 관리 — useEffect 페칭의 문제점 / Fetch Disaster Lab)
legacy_url: 'https://saver7942.blogspot.com/2026/07/useeffect.html'
draft: false
---

검색창에 '사과'를 치고 곧바로 '포도'로 바꿔 친 순간, 화면에 포도 결과가 떴다가 2초 뒤 사과 결과로 되돌아갑니다. 사용자는 아무것도 누르지 않았는데 화면이 과거로 돌아갑니다.

`useEffect` 안에서 `fetch`하고 결과를 `useState`에 담는, 가장 먼저 떠올리게 되는 데이터 페칭 코드가 만들어내는 '유령 데이터' 버그입니다. 이 글은 그 코드가 무너지는 세 지점을 실제로 재현하는 실습 랩을 만들고, 각 문제의 원인을 코드 수준에서 확인합니다. 앞선 [폼 관리(React Hook Form) 시리즈](https://saver7942.blogspot.com/2026/07/react-hook-form.html)가 클라이언트 상태를 다뤘다면, 여기서부터는 서버 상태입니다.

---

## 🧪 1. 실습 환경 — 재앙을 재현하는 랩

문제를 말로만 듣는 것과 화면에서 보는 것은 다릅니다. 재현 가능한 실습 프로젝트부터 만듭니다.

```bash
npm create vite@latest fetch-disaster-lab -- --template react-ts
cd fetch-disaster-lab
npm install
npm run dev
```

실제 API(`jsonplaceholder`)를 호출하되, 응답 시점을 인위적으로 어긋나게 만드는 모킹 레이어를 둡니다.

```tsx
// src/api/mockApi.ts
export interface Post {
  id: number;
  title: string;
  body: string;
}

export interface User {
  name: string;
  email: string;
}

// ID 1번만 3초 지연시켜, 나중에 요청한 응답보다 늦게 도착하게 만듭니다.
export const fetchPostById = async (id: number | string): Promise<Post> => {
  const delay = id === 1 || id === '1' ? 3000 : 500;

  const response = await fetch(`https://jsonplaceholder.typicode.com/posts/${id}`);
  const data = await response.json();

  return new Promise((resolve) => {
    setTimeout(() => resolve(data), delay);
  });
};

export const fetchUser = async (): Promise<User> => {
  console.log('📡 [Network Log] 유저 정보 요청');
  const response = await fetch('https://jsonplaceholder.typicode.com/users/1');
  return response.json();
};
```

- **`id === 1 || id === '1'`** — 버튼은 숫자를, `<input>`은 문자열을 넘기기 때문에 둘 다 받습니다.

- **지연은 응답 이후에 걸립니다** — 요청 자체는 즉시 나가고 `resolve`만 늦춥니다. 실서비스에서 네트워크 상황이 하던 역할을 결정론적으로 재현하기 위한 장치입니다.

- **`fetchUser`의 로그** — 중복 요청 횟수를 눈으로 세기 위한 계측입니다.

---

## 🏎️ 2. 재앙 하나 — 경쟁 상태(Race Condition)

```tsx
// src/components/RaceCondition.tsx
import { useState, useEffect } from 'react';
import { fetchPostById } from '../api/mockApi';
import type { Post } from '../api/mockApi';

export default function RaceCondition() {
  const [postId, setPostId] = useState<number | null>(null);
  const [data, setData] = useState<Post | null>(null);

  useEffect(() => {
    if (!postId) return;

    // 이전 요청이 아직 처리 중이어도, 도착하면 무조건 덮어씁니다.
    fetchPostById(postId).then((res) => {
      console.log(`✅ 데이터 도착: 포스트 ${postId}`);
      setData(res);
    });
  }, [postId]);

  return (
    <div style={{ border: '2px solid red', padding: '1rem', margin: '1rem' }}>
      <h3>1. 경쟁 상태</h3>
      <button onClick={() => setPostId(1)}>1번 포스트 (느림 · 사과)</button>
      <button onClick={() => setPostId(2)}>2번 포스트 (빠름 · 포도)</button>
      <p>현재 요청 ID: <strong>{postId ?? '없음'}</strong></p>
      <p>화면 표시 제목: <mark>{data?.title ?? '데이터 없음'}</mark></p>
    </div>
  );
}
```

1번 버튼을 누른 직후 2번 버튼을 누르면 이렇게 됩니다.

<details style="margin:10px 0 4px">
<summary style="cursor:pointer;font-weight:700;color:#C8443C">실행 결과 보기</summary>
<pre><code>// 클릭 순서: 1번 → 2번 (0.1초 간격)
// 콘솔
✅ 데이터 도착: 포스트 2      (0.5초 후)
✅ 데이터 도착: 포스트 1      (3.0초 후)

// 화면 "현재 요청 ID"  : 2  (계속 2)
// 화면 "표시 제목"     : 2번 포스트 제목 → (2.5초 뒤) 1번 포스트 제목</code></pre>
</details>

요청 ID는 2인데 화면에는 1번 데이터가 떠 있습니다. **화면이 그리는 것은 "마지막으로 요청한 데이터"가 아니라 "마지막으로 도착한 데이터"이기 때문입니다.**

`postId`가 바뀌면 이펙트가 다시 실행되지만, 앞서 만들어진 `then` 콜백은 그대로 살아 있습니다. `useEffect`에는 이전 요청을 취소하거나 그 결과를 무시하는 장치가 없습니다. 응답이 도착한 순서대로 `setData`가 호출될 뿐입니다.

---

## 👯 3. 재앙 둘 — 같은 데이터를 두 번, 네 번

같은 사용자 정보를 두 컴포넌트가 각각 필요로 하는 흔한 화면입니다.

```tsx
// src/components/DuplicateRequest.tsx
import { useState, useEffect } from 'react';
import { fetchUser } from '../api/mockApi';
import type { User } from '../api/mockApi';

function ProfileIcon() {
  const [user, setUser] = useState<User>();
  useEffect(() => { fetchUser().then(setUser); }, []);
  return <span>👤 {user?.name}</span>;
}

function Sidebar() {
  const [user, setUser] = useState<User>();
  useEffect(() => { fetchUser().then(setUser); }, []); // 같은 데이터를 또 요청
  return <aside>📧 {user?.name}의 사이드바</aside>;
}

export default function DuplicateRequest() {
  return (
    <div style={{ border: '2px solid blue', padding: '1rem', margin: '1rem' }}>
      <h3>2. 중복 요청</h3>
      <ProfileIcon />
      <Sidebar />
    </div>
  );
}
```

<details style="margin:10px 0 4px">
<summary style="cursor:pointer;font-weight:700;color:#C8443C">실행 결과 보기 — 개발 모드 콘솔</summary>
<pre><code>📡 [Network Log] 유저 정보 요청
📡 [Network Log] 유저 정보 요청
📡 [Network Log] 유저 정보 요청
📡 [Network Log] 유저 정보 요청

// 컴포넌트 2개 × StrictMode 이중 실행 2회 = 4회
// 프로덕션 빌드(npm run build)에서는 2회</code></pre>
</details>

화면이 필요로 하는 데이터는 하나인데 요청은 컴포넌트 수만큼 나갑니다. 원인은 단순합니다. **데이터를 컴포넌트가 소유하기 때문입니다.** `useState`는 컴포넌트 안에 갇힌 저장소여서, `ProfileIcon`이 이미 받아 온 사용자 정보를 `Sidebar`는 알 방법이 없습니다. 두 컴포넌트 바깥에 공유 캐시가 없는 한, 같은 URL을 향한 요청은 계속 늘어납니다.

여기에 개발 모드의 `<StrictMode>`가 이펙트를 의도적으로 두 번 실행하므로 로그는 다시 두 배가 됩니다. 정리 함수가 제대로 붙어 있는지 검사하기 위한 React의 장치이며, 프로덕션 빌드에서는 실행되지 않습니다.

---

## 🌋 4. 재앙 셋 — 로직보다 많아지는 방어 코드

경쟁 상태를 알고 나면 방어 코드를 붙이게 됩니다. 로딩과 에러 처리까지 더한, 가장 성실하게 쓴 버전입니다.

```tsx
// src/components/BoilerplateHell.tsx
import { useState, useEffect } from 'react';
import { fetchPostById } from '../api/mockApi';
import type { Post } from '../api/mockApi';

export default function BoilerplateHell() {
  const [postId, setPostId] = useState<number | string>('');
  const [data, setData] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!postId) return;
    let isCancelled = false; // 경쟁 상태 방어용 수동 플래그

    setIsLoading(true);
    fetchPostById(postId)
      .then((res) => {
        if (!isCancelled) { setData(res); setError(null); }
      })
      .catch((err) => {
        if (!isCancelled) setError(err as Error);
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => { isCancelled = true; }; // 정리 함수로 결과 무시
  }, [postId]);

  return (
    <div style={{ border: '2px solid green', padding: '1rem', margin: '1rem' }}>
      <h3>3. 보일러플레이트</h3>
      <input type="number" onChange={(e) => setPostId(e.target.value)} placeholder="ID 입력" />
      {isLoading && <p>⌛ 로딩 중...</p>}
      {error && <p>에러: {error.message}</p>}
      <p>결과: {data?.title}</p>
    </div>
  );
}
```

동작은 합니다. 문제는 이 코드에서 실제로 데이터를 가져오는 부분이 얼마나 되는지입니다.

| 코드가 하는 일 | 차지하는 분량 |
| :---: | :---: |
| 실제 데이터 요청 | `fetchPostById(postId)` 한 줄 |
| 상태 보관 | `useState` 4개 |
| 경쟁 상태 방어 | 플래그 선언 · 정리 함수 · `if` 3개 |
| 로딩·에러 전환 | `then` · `catch` · `finally` 분기 |

데이터 하나를 가져올 때마다 이 구조를 통째로 다시 씁니다. 컴포넌트가 스무 개면 스무 번 복사되고, 그중 한 곳에서 `if (!isCancelled)` 하나를 빠뜨리면 그 화면에서만 유령 데이터가 나타납니다. **재앙 셋의 본질은 코드가 길다는 것이 아니라, 매번 손으로 다시 쓰기 때문에 매번 틀릴 수 있다는 것입니다.**

---

## 🧯 5. 손으로 막는 최선과 그 한계

`isCancelled` 플래그에는 한 가지 오해가 따라붙습니다. 이 플래그는 **응답을 무시할 뿐, 요청을 취소하지 않습니다.** 네트워크 요청은 끝까지 진행되고 서버도 그만큼 일합니다. 실제로 끊으려면 `AbortController`가 필요합니다.

```tsx
useEffect(() => {
  if (postId == null) return;
  const controller = new AbortController();

  setIsLoading(true);
  fetch(`https://jsonplaceholder.typicode.com/posts/${postId}`, {
    signal: controller.signal,
  })
    .then((res) => res.json())
    .then((res: Post) => { setData(res); setError(null); })
    .catch((err: Error) => {
      if (err.name === 'AbortError') return; // 취소는 에러가 아님
      setError(err);
    })
    .finally(() => {
      // 이 가드가 없으면 새 요청의 로딩 표시가 꺼집니다
      if (!controller.signal.aborted) setIsLoading(false);
    });

  return () => controller.abort();
}, [postId]);
```

마지막 `finally`의 가드가 핵심입니다. `postId`가 바뀌면 React는 **정리 함수를 먼저 실행하고 새 이펙트를 실행합니다.** 그래서 순서가 이렇게 됩니다.

<details style="margin:10px 0 4px">
<summary style="cursor:pointer;font-weight:700;color:#C8443C">가드가 없을 때의 실행 순서</summary>
<pre><code>1. 정리 함수: controller1.abort()      → 요청 1 중단(거부는 다음 마이크로태스크)
2. 새 이펙트: setIsLoading(true)       → 로딩 표시 켜짐
3. 마이크로태스크: 요청 1의 AbortError → catch에서 조기 반환
4. 이어지는 finally: setIsLoading(false) → 요청 2가 진행 중인데 로딩 표시가 꺼짐</code></pre>
</details>

취소된 요청의 뒷정리가 살아 있는 요청의 상태를 건드립니다. 요청 취소라는 정석적인 해법을 적용하고도, 그 부작용을 막을 가드를 한 번 더 넣어야 합니다. 손으로 쓰는 페칭이 계속 새는 이유가 여기 있습니다.

---

## ⚠️ 6. 주의사항

- **StrictMode 이중 실행** — 개발 모드에서 요청 횟수를 셀 때는 실제의 두 배로 찍힙니다. 중복 요청을 관찰할 때 이 숫자를 그대로 믿지 않습니다. 정확한 횟수는 프로덕션 빌드나 Network 탭에서 확인합니다.

- **경고가 사라졌다고 문제가 사라진 것은 아닙니다** — 언마운트된 컴포넌트에 `setState`를 호출할 때 뜨던 "메모리 누수" 경고는 오탐이 많아 React 18에서 제거됐습니다. 이제 호출은 조용히 무시됩니다. 콘솔이 깨끗해졌을 뿐, 늦게 도착한 응답이 버려지는 상황 자체는 그대로입니다.

- **`if (!postId) return`의 함정** — `0`도 빈 문자열도 거짓이라 ID가 `0`인 자원은 영영 요청되지 않습니다. `if (postId == null) return`처럼 존재 여부만 검사합니다.

- **입력마다 요청** — `<input>`의 `onChange`에 바로 상태를 물리면 키 입력 한 번에 요청 한 번이 나갑니다. 디바운스 없이 쓰면 재앙 둘이 훨씬 큰 규모로 재현됩니다.

- **`import type`** — Vite의 `react-ts` 템플릿은 `verbatimModuleSyntax`를 켜 둡니다. 타입만 가져올 때 `import type`을 쓰지 않으면 번들에 남지 않을 코드가 `import` 구문으로 살아남아 오류가 납니다.

---

## ✅ 7. 핵심 정리

| 증상 | 근본 원인 |
| :---: | :---: |
| 경쟁 상태 | 이펙트가 이전 요청을 취소도 무시도 하지 않음 |
| 중복 요청 | 데이터를 컴포넌트가 소유해 공유 캐시가 없음 |
| 보일러플레이트 | 로딩·에러·취소를 화면마다 손으로 다시 씀 |

- **화면은 마지막 요청이 아니라 마지막 응답을 그립니다.** 요청 순서와 도착 순서가 다를 수 있다는 사실이 경쟁 상태의 전부입니다.

- **`isCancelled`는 취소가 아닙니다.** 결과를 무시할 뿐이므로 네트워크 비용은 그대로 나갑니다. 실제 취소는 `AbortController`이고, 그때는 `finally`가 새 요청의 로딩을 끄지 않도록 가드가 필요합니다.

- **세 문제의 뿌리는 하나입니다.** 서버에 있는 데이터를 컴포넌트의 지역 상태로 복사해 두고 각자 관리하기 때문입니다. 소유자가 여럿이면 캐시도, 취소도, 순서 보장도 각자 구현해야 합니다.

- 그래서 다음 단계는 요청 취소·중복 제거·캐시를 기본으로 제공하는 서버 상태 전용 도구입니다. 위 코드를 직접 써 본 경험이 그 도구의 기본 동작을 읽는 기준이 됩니다. [다음 편](https://saver7942.blogspot.com/2026/07/tanstack-query.html)에서 같은 랩을 TanStack Query로 다시 씁니다.

---

## 🔗 참고 자료

- 다음 편: [TanStack Query 입문 — 데이터를 가져오는 대신 서버와 동기화하기](https://saver7942.blogspot.com/2026/07/tanstack-query.html)

- 이전 섹션: [React Hook Form 실무 총정리](https://saver7942.blogspot.com/2026/07/react-hook-form.html)

- [React 공식 문서 — 이펙트로 데이터 가져오기의 대안](https://react.dev/reference/react/useEffect#fetching-data-with-effects)

- [React 공식 문서 — StrictMode](https://react.dev/reference/react/StrictMode)

- [MDN — AbortController](https://developer.mozilla.org/ko/docs/Web/API/AbortController)
