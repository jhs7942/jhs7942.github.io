---
title: Supabase Realtime의 함정 — 참가자 화면이 전환되지 않는 이유
slug: supabase-realtime-race-condition-polling
description: >-
  Supabase Realtime 구독만으로 화면 전환을 처리했을 때 발생하는 Race Condition과, 폴링 병행으로 해결한 과정을
  정리합니다.
published_at: '2026-04-03T22:57:38-07:00'
labels:
  - AI 작성
  - 프로젝트
  - 몇명이서
  - 트러블슈팅
  - Claude Code
  - Next.js
  - Supabase
source: >-
  C:/Users/jhs/OneDrive/바탕
  화면/개발/how_many/.claude/fix/2026-03-20/participant-screen-not-transitioning/error-log.md
legacy_url: 'https://saver7942.blogspot.com/2026/04/supabase-realtime.html'
draft: false
---

## 📦 배경지식

### Supabase Realtime
Supabase가 제공하는 실시간 데이터 동기화 기능입니다. PostgreSQL의 변경 사항(INSERT, UPDATE, DELETE)을 WebSocket을 통해 클라이언트에 실시간으로 전달합니다. 채팅, 실시간 투표, 협업 도구 등에서 사용됩니다.

### Race Condition (타이밍 경쟁)
두 개 이상의 동작이 실행 순서에 따라 다른 결과를 내는 상황입니다. 예를 들어, A가 데이터를 쓰고 B가 구독을 시작하는 타이밍에 따라 B가 데이터를 받을 수도, 못 받을 수도 있습니다.

### 폴링 (Polling)
일정 간격으로 서버에 "새 데이터 있어?"라고 반복 요청하는 방식입니다. Realtime처럼 서버가 변경을 푸시하는 방식의 반대 개념입니다. 비효율적이지만 안정적입니다.

## 🐛 문제 상황

"몇 명이서?" 앱에는 그룹 방 기능이 있습니다. 방장이 게임 결과를 확정하면 모든 참가자의 화면이 자동으로 결과 페이지로 전환되어야 합니다.

그런데 두 가지 상황에서 참가자 화면이 전환되지 않았습니다:

1. **투표 룸**: 모든 인원이 투표를 완료해도 참가자 화면은 "다른 친구들의 투표를 기다리는 중..." 에서 멈춤

2. **랜덤 룸**: 방장이 돌림판 결과를 냈는데 참가자 화면은 "방장을 기다리는 중..." 에서 멈춤

방장 화면은 두 경우 모두 정상이었습니다.

## 🐛 에러 메시지

별도의 에러 메시지는 없었습니다. 참가자의 화면 전환이 일어나지 않는 기능 버그였습니다.

## 🧭 시행착오

먼저 Supabase Realtime 구독 설정의 오류 여부를 점검했습니다. `useRoomSubscription` 훅의 채널 설정, 테이블명, 필터 조건을 검토했지만 코드 자체에는 문제가 없었습니다.

다음으로 Supabase 대시보드에서 해당 테이블의 Realtime 활성화 여부를 확인했습니다. 투표 룸의 경우 `rooms` 테이블은 활성화되어 있었지만, Realtime 이벤트가 참가자에게 도달하지 않는 경우가 간헐적으로 발생했습니다.

랜덤 룸의 경우는 다른 양상이었습니다. `useRandomEvent` 훅이 Realtime **구독만** 하고 초기 데이터를 가져오지 않았습니다. 방장이 이벤트를 먼저 INSERT하고 참가자가 나중에 페이지에 진입하면, INSERT 이벤트는 이미 지나간 뒤라 구독으로 잡히지 않았습니다.

## 🔍 원인 분석

두 문제 모두 **Supabase Realtime에만 의존한 화면 전환 설계**가 근본 원인입니다.

### 투표 룸 — Realtime 이벤트 미수신
방장이 `updateRoomStatus(roomId, 'finished')`로 DB를 업데이트하면, 참가자의 `useRoomSubscription`이 이 UPDATE 이벤트를 감지해 결과 페이지로 이동해야 합니다. 그러나 Realtime 채널이 서버에 완전히 연결되기 전에 UPDATE가 발생하면, 이벤트를 놓칩니다. 네트워크 상태에 따라 간헐적으로 발생하는 전형적인 Race Condition입니다.

### 랜덤 룸 — 초기 fetch 누락
```typescript
// 문제 코드 — 구독만 있고 초기 fetch가 없음
useEffect(() => {
  const channel = supabase
    .channel(`random-${roomId}`)
    .on('postgres_changes', { event: 'INSERT', ... }, (payload) => {
      setEvent(payload.new);
    })
    .subscribe();
  return () => { channel.unsubscribe(); };
}, [roomId]);
```

이 코드는 구독 시작 **이후**의 INSERT만 감지합니다. 방장이 먼저 이벤트를 INSERT하고 참가자가 나중에 페이지에 진입하면, 이미 존재하는 데이터를 읽을 방법이 없습니다.

## 🛠️ 해결

### 투표 룸 — Realtime을 폴링으로 교체
참가자에 한해 2초 간격으로 방 상태를 직접 조회하는 폴링으로 교체했습니다.

```tsx
useEffect(() => {
  if (isHost || !roomId) return;
  const poll = setInterval(async () => {
    const r = await getRoomById(roomId);
    if (r?.status === 'finished') {
      clearInterval(poll);
      router.push('/group/result');
    }
  }, 2000);
  return () => clearInterval(poll);
}, [isHost, roomId, router]);
```

Realtime보다 최대 2초 느리지만, 이벤트를 놓치는 일이 없습니다.

### 랜덤 룸 — 초기 fetch 추가
구독 시작 전에 최신 이벤트를 한 번 가져오는 초기 fetch를 추가했습니다.

```typescript
useEffect(() => {
  // 초기 fetch — 이미 존재하는 이벤트가 있으면 바로 반영
  getLatestRandomEvent(roomId).then((existing) => {
    if (existing) setEvent(existing);
  });

  // Realtime 구독 — 이후 새 이벤트 감지
  const channel = supabase
    .channel(`random-${roomId}`)
    .on('postgres_changes', { event: 'INSERT', ... }, (payload) => {
      setEvent(payload.new);
    })
    .subscribe();
  return () => { channel.unsubscribe(); };
}, [roomId]);
```

## ✅ 핵심 정리

- **Supabase Realtime은 "베스트 에포트"입니다.** 네트워크 상태, 연결 타이밍에 따라 이벤트를 놓칠 수 있습니다. 화면 전환 같은 중요한 동작을 Realtime 단독으로 처리하면 안 됩니다.

- **Realtime 구독 훅에는 반드시 초기 fetch를 포함**해야 합니다. 구독 시작 전에 이미 존재하는 데이터를 놓치는 Race Condition을 방지합니다.

- **폴링은 비효율적이지만 안정적입니다.** 실시간성이 2~3초 정도 느려도 괜찮은 경우에는 폴링이 더 신뢰할 수 있는 선택입니다.

- 설계 패턴: **호스트는 직접 redirect, 참가자는 Realtime + 폴링 병행**. 호스트는 자기가 상태를 변경하는 주체이므로 redirect를 직접 호출하고, 참가자는 외부 이벤트에 의존하므로 이중 안전장치가 필요합니다.
