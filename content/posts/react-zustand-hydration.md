---
title: 'Zustand persist 하이드레이션: SSR 상태 복원과 깜빡임 다루기'
slug: react-zustand-hydration
description: >-
  `persist`가 새로고침 후 저장된 상태를 스토어에 되채우는 과정을 하이드레이션이라 합니다. 클라이언트 전용 앱에서는 대개 매끄럽지만,
  SSR(Next.js 등)에서는 서버가 기본값으로, 클라이언트가 복원값으로 렌더해 하이드레이션 불일치와 화면 깜빡임이 생깁니다.
  하이드레이션의 동작과 `skipHydration`·`rehydrate`·`hasHydrated`로 복원 시점을 제어하는 방법을 정리합니다.
published_at: '2026-07-09T23:45:17-07:00'
labels:
  - AI 작성
  - 학습 정리
  - React
  - TypeScript
  - Zustand
source: 사용자 학습 노트 (React 상태관리 — Zustand 하이드레이션/SSR)
legacy_url: 'https://saver7942.blogspot.com/2026/07/zustand-persist-ssr.html'
draft: false
series: zustand
part: 6
---

[이전 글](https://saver7942.blogspot.com/2026/07/zustand-persist-localstorage.html)에서 `persist`로 상태를 저장·복원하는 것을 봤습니다. 이 복원 과정을 **하이드레이션(hydration)**이라 합니다. 클라이언트에서만 도는 앱에서는 대개 문제없이 매끄럽지만, 서버 사이드 렌더링(SSR) 환경에서는 서버와 클라이언트의 초기 상태가 달라 문제가 생깁니다. 이 글은 하이드레이션의 동작과 SSR 대응을 정리합니다.

---

## 📦 1. 하이드레이션이란

`persist`는 새로고침 시, 컴포넌트가 마운트되기 전에 저장소에서 이전 상태를 읽어 스토어를 채웁니다. 이 "빈 스토어 → 저장된 값으로 복원"이 하이드레이션입니다.

```tsx
// src/store/useAuthStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthStore {
  isLoggedIn: boolean;
  username: string;
  login: (name: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      isLoggedIn: false,
      username: '',
      login: (name) => set({ isLoggedIn: true, username: name }),
      logout: () => set({ isLoggedIn: false, username: '' }),
    }),
    { name: 'user-auth-storage' },
  ),
);
```

`localStorage`는 동기적으로 읽히므로, 클라이언트 전용 앱에서는 첫 렌더 전에 복원이 끝나 사용자가 깜빡임 없이 이전 화면을 이어 봅니다. 문제는 서버가 개입하는 SSR입니다.

---

## 🔍 2. SSR에서의 하이드레이션 불일치

`localStorage`는 브라우저에만 있습니다. 그래서 SSR(Next.js 등)에서는 이런 어긋남이 생깁니다.

- **서버 렌더** — 저장소가 없으므로 스토어는 **기본값**(`isLoggedIn: false`)으로 HTML을 만듭니다.

- **클라이언트 하이드레이트** — 브라우저에서 `localStorage`의 **복원값**(`isLoggedIn: true`)으로 스토어를 채웁니다.

서버 HTML(기본값)과 클라이언트 첫 렌더(복원값)가 다르면, React가 **하이드레이션 불일치** 경고를 내고 화면이 기본값에서 복원값으로 순간 바뀝니다. 예를 들어 로그인 상태를 저장했다면, 서버는 "로그인" 버튼을 그렸다가 클라이언트에서 "로그아웃"으로 바뀌는 깜빡임이 나타납니다.

---

## 🛠️ 3. 하이드레이션 제어하기

해결의 핵심은 **복원이 끝나기 전에는 복원값에 의존하는 UI를 그리지 않는 것**입니다.

**방법 A — 복원 완료 후 렌더**

`persist.hasHydrated()`와 `onFinishHydration`으로 복원 여부를 추적해, 완료 전에는 대체 UI를 보여줍니다.

```tsx
import { useEffect, useState } from 'react';
import { useAuthStore } from './store/useAuthStore';

function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(useAuthStore.persist.hasHydrated());
    return useAuthStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);
  return hydrated;
}

export function AuthBadge() {
  const hydrated = useHydrated();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);

  if (!hydrated) return <span>확인 중…</span>; // 복원 전엔 복원값에 의존하지 않음
  return <span>{isLoggedIn ? '로그아웃' : '로그인'}</span>;
}
```

**방법 B — 자동 복원을 끄고 수동 실행**

`skipHydration`으로 자동 복원을 막고, 클라이언트에서 원하는 시점에 직접 복원합니다.

```tsx
// 스토어 옵션
{ name: 'user-auth-storage', skipHydration: true }

// 클라이언트(예: 최상위 마운트 후)에서 수동 복원
useAuthStore.persist.rehydrate();
```

---

## ⚠️ 4. 주의사항

- **persist는 복원값의 형태를 검증하지 않습니다.** 하이드레이션은 저장된 문자열을 되살릴 뿐, 그 모양이 현재 타입과 맞는지 보장하지 않습니다([이전 글](https://saver7942.blogspot.com/2026/07/zustand-persist-localstorage.html) 참고). 스키마가 바뀌면 `version`·`migrate`로 변환하고, 신뢰할 수 없는 값은 타입 가드로 검증합니다.

- **하이드레이션 전 상태는 기본값입니다.** 첫 렌더는 기본값 기준이라는 점을 감안해, 복원값에 의존하는 UI는 `hasHydrated` 이후에 그립니다.

- **초기 로드 지연을 고려합니다.** `localStorage` 접근은 동기이므로, 큰 상태를 복원하면 초기 렌더가 잠깐 늦어질 수 있습니다.

---

## ✅ 5. 핵심 정리

- **하이드레이션** — `persist`가 새로고침 후 저장된 상태를 스토어에 되채우는 복원 과정입니다. 클라이언트 전용 앱에서는 대개 매끄럽습니다.

- **SSR 불일치** — 서버는 기본값으로, 클라이언트는 복원값으로 렌더해 하이드레이션 경고와 깜빡임이 생깁니다.

- **제어** — `hasHydrated`로 복원 완료 후 렌더하거나, `skipHydration` + `rehydrate()`로 복원 시점을 직접 잡습니다.

- **형태 검증은 별개** — 하이드레이션은 복원만 할 뿐, 데이터 형태 보증은 `version`/`migrate`와 타입 가드의 몫입니다.

| 환경 | 하이드레이션 |
| :---: | :---: |
| CSR (브라우저 전용) | 마운트 전 자동 복원 — 대체로 매끄러움 |
| SSR (Next.js 등) | 서버=기본값, 클라=복원값 → 불일치·깜빡임 |
| 대응 | `hasHydrated` 게이트 또는 `skipHydration` + `rehydrate` |

---

## 🔗 참고 자료

- 이전 글: [Zustand persist로 상태 자동 저장하기](https://saver7942.blogspot.com/2026/07/zustand-persist-localstorage.html)

- [Zustand 공식 문서 — Hydration and asynchronous storages](https://zustand.docs.pmnd.rs/integrations/persisting-store-data#hydration-and-asynchronous-storages)
