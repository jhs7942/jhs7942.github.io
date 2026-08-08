---
title: Supabase 투표 시스템에서 만난 4가지 버그 — .single()부터 Realtime 타이밍까지
slug: supabase-vote-system-four-bugs
description: 'Supabase 기반 투표 시스템에서 발생한 조기 자동 마감, 화면 고착, 406 에러 4가지 버그의 원인과 해결 과정을 정리합니다.'
published_at: '2026-04-03T23:00:52-07:00'
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
  화면/개발/how_many/.claude/fix/2026-03-20/vote-status-redirect-bugs/error-log.md
legacy_url: 'https://saver7942.blogspot.com/2026/04/supabase-4-single-realtime.html'
draft: false
---

## 🐛 문제 상황

그룹 투표 기능을 구현한 후 테스트에서 4가지 버그가 동시에 발견되었습니다. 개별적으로는 작은 문제처럼 보이지만, 모두 투표 현황 페이지(`/group/vote-status`)에서 발생해 서로 얽혀 있었습니다.

1. 방장이 투표하면 참여자 투표 전인데도 즉시 마감됨

2. 투표 2/2 완료 후 "집계중..." 화면에서 멈춤 (간헐적)

3. 투표 현황 진입 시 `GET /participants 406` 에러

4. 투표 페이지에서 `GET /votes 406` 에러

---

## 🐛 버그 1: 방장 혼자 투표해도 자동 마감

### 에러 메시지

에러 메시지는 없었습니다. 방장이 투표 완료 버튼을 누르면 참여자의 투표를 기다리지 않고 바로 투표가 종료되는 현상이었습니다.

### 원인 분석

`useVoteStatus` 훅이 활성 참여자 수를 계산할 때, `last_seen` 타임스탬프를 기준으로 30초 이내 활동이 있는 사람만 카운트했습니다.

방장이 투표를 마치고 vote-status 페이지로 이동하는 시점에, 다른 참여자가 아직 투표 페이지에서 고민 중이면 `last_seen`이 30초를 넘기게 됩니다. 이 참여자가 inactive로 처리되면서 `totalCount`가 1이 되고, 방장 혼자 투표한 것만으로 `completedCount(1) >= totalCount(1)` 조건이 충족되어 `closeVoting()`이 실행되었습니다.

### 해결

`last_seen` 기반 필터를 제거하고, 전체 참여자 수를 그대로 사용하도록 변경했습니다.

```typescript
// 수정 전 — last_seen 30초 필터
const activeParticipants = participants?.filter(
  p => Date.now() - new Date(p.last_seen).getTime() < 30000
);
const totalCount = activeParticipants?.length ?? 0;

// 수정 후 — 전체 참여자 수 사용
const totalCount = participants?.length ?? 0;
```

이탈한 참여자가 있는 경우는 투표 타이머(`timeLeft <= 0`)가 안전망 역할을 합니다.

---

## 🐛 버그 2: "집계중..." 화면에서 결과로 넘어가지 않음

### 에러 메시지

에러 메시지는 없었습니다. 투표가 완료되어 "집계중..." 표시가 나오지만 결과 화면으로 전환되지 않는 현상이었습니다.

### 원인 분석

이 버그는 두 단계에 걸쳐 발생했습니다.

**1차**: `closeVoting()` 내부에서 `router.push`를 제거하고, `results` 테이블 INSERT를 Realtime으로 감지해 redirect하도록 변경했습니다. 그런데 `results` 테이블에 Supabase Realtime이 활성화되지 않아 INSERT 이벤트가 전달되지 않았습니다.

**2차**: `results` 대신 `rooms` 테이블의 상태 변경을 감지하도록 수정한 후에도 간헐적으로 발생했습니다. `closeVoting()` → `saveResult()` → `updateRoomStatus('finished')` 순서로 실행되는데, Realtime 채널이 완전히 연결되기 전에 UPDATE가 발생하면 이벤트를 놓기는 — 이전 포스트에서 다룬 Race Condition과 동일한 문제입니다.

### 해결

호스트와 참가자를 분리하여 처리했습니다.

```typescript
// 호스트: closeVoting() 성공 후 직접 redirect
const closeVoting = async () => {
  await saveResult(roomId, result);
  await updateRoomStatus(roomId, 'finished');
  router.push('/group/result'); // 직접 이동
};

// 참가자: Realtime + 폴링 병행
useEffect(() => {
  if (isHost || !roomId) return;
  const poll = setInterval(async () => {
    const r = await getRoomById(roomId);
    if (r?.status === 'finished') {
      clearInterval(poll);
      router.push('/group/result');
    }
  }, 3000);
  return () => clearInterval(poll);
}, [isHost, roomId, router]);
```

---

## 🐛 버그 3: `GET /participants 406 (Not Acceptable)`

### 에러 메시지

```
GET https://xxx.supabase.co/rest/v1/participants?...&select=* 406 (Not Acceptable)
```

### 원인 분석

`getParticipant()`와 `joinRoom()`의 기존 참여자 체크에서 Supabase의 `.single()`을 사용했습니다.

```typescript
// 문제 코드
const { data } = await supabase
  .from('participants')
  .select('*')
  .eq('room_id', roomId)
  .eq('nickname', nickname)
  .single(); // 행이 없으면 406 에러
```

`.single()`은 **정확히 1개의 행**이 있어야 정상 동작합니다. 행이 0개이면 406 에러를 반환합니다. 아직 참여하지 않은 상태에서 이 함수가 호출되면 행이 없고, 406이 발생합니다.

### 해결

`.single()`을 `.maybeSingle()`로 교체했습니다. `.maybeSingle()`은 행이 없으면 `null`을 반환하고, 1개면 해당 행을, 2개 이상이면 에러를 발생시킵니다.

```typescript
// 수정 후
const { data } = await supabase
  .from('participants')
  .select('*')
  .eq('room_id', roomId)
  .eq('nickname', nickname)
  .maybeSingle(); // 행이 없으면 null 반환
```

---

## 🐛 버그 4: `GET /votes 406 (Not Acceptable)`

### 에러 메시지

```
GET https://xxx.supabase.co/rest/v1/votes?...&participant_id=eq.xxx 406 (Not Acceptable)
```

### 원인 분석

버그 3과 동일한 패턴입니다. `getMyVote()`에서 `.single()`을 사용하는데, 투표 전에 호출되면 행이 없어 406이 발생합니다.

### 해결

마찬가지로 `.maybeSingle()`로 교체했습니다.

```typescript
// 수정 후
const { data } = await supabase
  .from('votes')
  .select('*')
  .eq('participant_id', participantId)
  .eq('room_id', roomId)
  .maybeSingle();
```

---

## ✅ 핵심 정리

- **Supabase `.single()` vs `.maybeSingle()`**: 행이 없을 수 있는 조회에는 반드시 `.maybeSingle()`을 사용합니다. `.single()`은 행이 정확히 1개일 때만 사용합니다.

- **참여자 수 카운트에 `last_seen` 임계값을 사용하지 않습니다.** 네트워크 지연이나 페이지 전환 중에 inactive로 처리되면 투표가 조기 마감됩니다.

- **Realtime 단독 의존 금지**: 새 테이블의 Realtime 활성화 여부를 반드시 확인하고, 화면 전환 같은 중요 로직에는 폴링을 병행합니다.

- **호스트/참가자 분리 패턴**: 상태를 변경하는 주체(호스트)는 직접 redirect하고, 외부 이벤트에 의존하는 쪽(참가자)은 Realtime + 폴링 이중 안전장치를 둡니다.

- 여러 버그가 동시에 나타나면 하나씩 분리해서 해결하되, **공통 패턴**(이 경우 `.single()` 오용, Realtime 의존)을 먼저 파악하면 효율적입니다.
