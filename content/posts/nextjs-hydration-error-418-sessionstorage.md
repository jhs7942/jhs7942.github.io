---
title: 'Next.js Hydration Error #418 — sessionStorage가 만든 서버/클라이언트 불일치'
slug: nextjs-hydration-error-418-sessionstorage
description: >-
  Next.js App Router에서 sessionStorage를 컴포넌트 최상위에서 호출하면 발생하는 Hydration Error
  #418의 원인과 해결법을 정리합니다.
published_at: '2026-04-03T22:49:25-07:00'
labels:
  - AI 작성
  - 프로젝트
  - 몇명이서
  - 트러블슈팅
  - Claude Code
  - Next.js
source: >-
  C:/Users/jhs/OneDrive/바탕
  화면/개발/how_many/.claude/fix/2026-03-17/react-hydration-error/error-log.md
legacy_url: 'https://saver7942.blogspot.com/2026/04/nextjs-hydration-error-418.html'
draft: false
---

## 📦 배경지식

### Hydration이란
React의 서버 사이드 렌더링(SSR) 과정에서, 서버가 먼저 HTML을 생성하고 클라이언트가 이 HTML에 이벤트 핸들러를 "붙이는" 과정을 Hydration이라고 합니다. 이때 서버가 만든 HTML과 클라이언트가 만든 HTML이 다르면 React는 Hydration Error를 발생시킵니다.

### Next.js App Router와 SSR
Next.js App Router는 기본적으로 모든 컴포넌트를 서버에서 먼저 렌더링합니다. 서버 환경에서는 `window`, `sessionStorage`, `localStorage` 같은 브라우저 API가 존재하지 않기 때문에, 이런 API를 직접 호출하면 서버/클라이언트 간 렌더링 결과가 달라집니다.

### sessionStorage
브라우저 탭 단위로 데이터를 저장하는 Web Storage API입니다. 탭을 닫으면 데이터가 사라지며, 같은 도메인이라도 다른 탭과는 공유되지 않습니다.

## 🐛 문제 상황

그룹 방 참여 앱에서 닉네임 입력 페이지(`/group/nickname`)를 구현하는 상황입니다. 이 페이지에는 사용자가 참여한 방의 코드가 표시되어야 합니다. 방 코드는 이전 페이지에서 sessionStorage에 저장해둔 값을 읽어오는 구조입니다.

그런데 페이지에 진입하면 방 코드 영역이 깜빡이면서 "------"으로 표시되고, 브라우저 콘솔에 Hydration Error가 찍혔습니다.

## 🐛 에러 메시지

```
Hydration Error #418
There was an error while hydrating. Because the error happened outside of a Suspense boundary, the entire root will switch to client rendering.
```

## 🧭 시행착오

처음에는 방 코드 값이 제대로 저장되지 않는 문제로 접근했습니다. sessionStorage를 직접 확인하면 값은 정상적으로 들어 있었습니다.

다음으로 Hydration Error #418의 React 공식 문서를 확인했습니다. 서버 렌더링 결과와 클라이언트 렌더링 결과가 다를 때 발생하는 에러입니다. 문제의 코드를 다시 보면 원인이 드러납니다.

```tsx
// 문제 코드 — 컴포넌트 최상위에서 sessionStorage 접근
const roomCode = session.get<string>('roomCode') ?? '------';
```

이 코드가 서버에서 실행되면 sessionStorage가 없으므로 `null` → `"------"`이 됩니다. 클라이언트에서는 실제 값(예: `"SDLUVZ"`)을 읽습니다. HTML이 달라지므로 Hydration Error가 발생합니다.

## 🔍 원인 분석

`session.get()`은 내부적으로 `sessionStorage.getItem()`을 호출합니다. `typeof window === 'undefined'` 가드가 있어서 서버에서 크래시는 나지 않지만, 반환값이 `null`이 됩니다.

문제의 흐름:
1. **서버(SSR)**: `session.get('roomCode')` → `null` → fallback `"------"` 렌더

2. **클라이언트(Hydration)**: `session.get('roomCode')` → `"SDLUVZ"` 렌더

3. **HTML 불일치** → React Hydration Error #418

`typeof window` 가드는 서버에서의 런타임 에러만 막아줄 뿐, Hydration 불일치는 막아주지 못합니다.

## 🛠️ 해결

`roomCode`를 `useState + useEffect` 패턴으로 변경했습니다. 서버와 클라이언트 모두 초기값은 `"------"`으로 동일하게 렌더하고, 클라이언트 마운트 이후에만 sessionStorage에서 실제 값을 읽어옵니다.

```tsx
const [roomCode, setRoomCode] = useState('------');
useEffect(() => {
  setRoomCode(session.get<string>('roomCode') ?? '------');
}, []);
```

이렇게 하면:
1. **서버**: `"------"` 렌더

2. **클라이언트 초기 렌더**: `"------"` 렌더 (일치 → Hydration 성공)

3. **useEffect 실행 후**: `"SDLUVZ"`로 업데이트

## ✅ 핵심 정리

- **sessionStorage/localStorage 접근은 반드시 `useEffect` 내부에서** 수행해야 합니다. 컴포넌트 최상위 스코프에서 호출하면 Hydration Error가 발생합니다.

- `typeof window === 'undefined'` 가드는 **런타임 크래시만 방지**합니다. Hydration 불일치는 별개의 문제입니다.

- **패턴**: 브라우저 전용 값은 `useState(기본값)` + `useEffect(실제값 세팅)` 구조를 사용합니다. 서버와 클라이언트의 초기 렌더 결과를 일치시키는 것이 핵심입니다.

- Next.js App Router에서는 이 패턴이 자주 필요합니다. 사용자 세션, 테마 설정, 브라우저 크기 등 클라이언트에서만 알 수 있는 값은 모두 동일한 방식으로 처리해야 합니다.
