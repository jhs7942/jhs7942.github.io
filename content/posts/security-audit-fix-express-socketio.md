---
title: 코드 리뷰가 터뜨린 보안 경보 — Express + Socket.IO 앱에서 발견한 CRITICAL 6건 처리기
slug: security-audit-fix-express-socketio
description: >-
  Express + Socket.IO 앱 코드 리뷰에서 CRITICAL 6건, HIGH 5건의 보안 취약점을 발견하고 일괄 수정한 과정을
  정리합니다. JWT 인증 누락, Race Condition, 암호화 키 폴백 등.
published_at: '2026-04-04T06:21:35-07:00'
labels:
  - AI 작성
  - 프로젝트
  - 텔레파시
  - 보안
  - 트러블슈팅
  - Claude Code
  - Node.js
  - Socket.IO
source: >-
  C:/Users/jhs/OneDrive/바탕
  화면/개발/telepathy/.claude/fix/2026-04-04/security-audit-fix.md
legacy_url: >-
  https://saver7942.blogspot.com/2026/04/express-socketio-critical-6_0374203151.html
draft: false
---

## 📦 배경지식

**JWT(JSON Web Token)** — 서버가 서명한 토큰으로, 클라이언트가 요청마다 제출해 신원을 증명합니다. 서버는 서명을 검증해 위변조 여부를 확인합니다.

**Socket.IO 미들웨어** — HTTP 요청의 Express 미들웨어처럼, 소켓 연결 수립 시점에 전역으로 실행되는 함수입니다. `io.use(fn)`으로 등록하면 모든 소켓에 일괄 적용됩니다.

**TOCTOU(Time of Check to Time of Use)** — 값을 읽는 시점과 사용하는 시점 사이에 다른 요청이 끼어드는 Race Condition 패턴입니다. 이전 포스트에서 Supabase Realtime 기반 Race Condition을 다뤘는데, DB 차감 로직에서도 동일한 구조가 발생합니다.

**낙관적 잠금(Optimistic Locking)** — DB 행에 별도 잠금을 걸지 않고, UPDATE 조건에 "읽은 값과 같을 때만 반영"이라는 조건을 추가해 동시성 충돌을 감지하는 패턴입니다.

---

## 🐛 문제 상황

서비스 출시 전 코드 리뷰에서 다음 취약점이 발견되었습니다. 기능은 정상 동작 중이었으나 코드 리뷰 결과는 상당히 심각했습니다.

- **CRITICAL 6건**: 인증 없이 비밀번호 재설정 가능, 소켓 이벤트에 JWT 인증 없어 타인 ID로 매칭·채팅 위변조 가능, 확성기 차감 Race Condition, AES 암호화 키 폴백, flush.js null 체크 누락, .env.example 삭제

- **HIGH 5건**: 신고·피드백 API 인증 미적용 등

11개 파일에 걸친 문제였습니다. 항목별로 원인과 수정을 정리합니다.

---

## 🐛 에러 메시지

이 케이스는 런타임 에러가 아니라 코드 리뷰에서 발견된 보안 결함입니다. 실제 에러는 문제가 악용됐을 때 발생합니다. 잠재적으로 발생할 수 있는 에러는 다음과 같습니다.

```
TypeError: Cannot read properties of null (reading 'filter')
    at flushRound (flush.js:42:28)
```

위 에러는 flush.js에서 `queueData`가 null일 때 30초마다 반복 발생할 수 있는 문제로, 실제로 관찰 가능한 유일한 에러였습니다. 나머지는 조용히 악용될 수 있는 취약점이었습니다.

---

## 🧭 시행착오

별도의 시행착오는 없었습니다. 코드 리뷰 결과가 원인과 수정 방향을 명확히 짚어줬기 때문에, 각 항목을 순서대로 수정하는 방식으로 진행했습니다. 다만 수정 과정에서 의사결정이 필요했던 지점이 있었습니다.

**소켓 인증을 어디에 둘 것인가**: 각 소켓 이벤트 핸들러 안에서 JWT를 개별 검증하는 방식은 핸들러마다 인증 코드가 중복되고, 하나라도 빠뜨리면 우회 경로가 생깁니다. `io.use()`로 전역 미들웨어를 등록하면 소켓 연결 자체를 차단할 수 있어 더 근본적입니다.

**Race Condition 해결 방법 선택**: DB 트랜잭션, 비관적 잠금(SELECT FOR UPDATE), 낙관적 잠금 중 선택이 필요했습니다. Supabase는 SELECT FOR UPDATE를 직접 지원하지 않고, 트랜잭션은 RPC 함수를 별도로 작성해야 합니다. 낙관적 잠금은 UPDATE 조건 한 줄 추가로 구현할 수 있어 선택했습니다. 동시 요청이 폭발적으로 많은 서비스라면 RPC 트랜잭션이 더 안전하지만, 현재 규모에서는 낙관적 잠금으로 충분합니다.

---

## 🔍 원인 분석

### 1. 소켓 이벤트 인증 부재

`join_match`, `chatMessage`, `leaveRoom` 등 모든 소켓 이벤트가 클라이언트 payload에서 userId를 받아 그대로 DB에 저장했습니다. 서버 측 JWT 검증이 없어, 임의 userId를 payload에 담아 보내면 다른 사람인 척 매칭·채팅이 가능한 상태였습니다.

### 2. 인증 미들웨어 미사용 (신고·피드백 라우트)

`authMiddleware`가 이미 존재했지만, report와 feedback 라우트에 적용하지 않았습니다. reporterId와 userId를 클라이언트 body에서 받아 처리했습니다.

### 3. 비밀번호 재설정 무인증

`/api/password/reset`이 username + 새 비밀번호만으로 비밀번호를 변경할 수 있었습니다. `/check-user`와 `/reset` 사이에 신원을 증명하는 단계가 없었습니다.

### 4. 확성기 차감 TOCTOU

```javascript
// 문제 패턴
const user = await SELECT megaphone_count FROM users WHERE id = userId;
if (user.megaphone_count <= 0) throw Error('수량 부족');
await UPDATE users SET megaphone_count = megaphone_count - 1 WHERE id = userId;
```

SELECT로 수량을 확인하고 UPDATE로 차감하는 사이에 동시 요청이 들어오면, 두 요청 모두 같은 수량을 읽어 차감 조건을 통과합니다.

### 5. 암호화 키 폴백

```javascript
// 문제 코드
const key = process.env.ENCRYPT_KEY || '0'.repeat(64);
```

`ENCRYPT_KEY` 환경변수를 설정하지 않으면 64자리 '0'으로 폴백됩니다. 이 값은 코드에 노출되어 있어 사실상 무암호화와 같습니다.

### 6. flush.js null 체크 누락

DB 쿼리 결과를 에러 체크 없이 바로 `.filter()`로 사용했습니다. queueError가 있거나 queueData가 null이면 30초마다 TypeError가 발생합니다.

---

## 🛠️ 해결

### Socket.IO 전역 JWT 미들웨어

모든 소켓 인증의 핵심 수정입니다. 소켓 연결 수립 시점에 쿠키에서 JWT를 검증하고, 검증된 userId를 `socket.userId`에 저장합니다. 이후 모든 이벤트 핸들러는 payload 대신 `socket.userId`를 사용합니다.

```javascript
// server/index.js
io.use((socket, next) => {
  const cookies = cookie.parse(socket.handshake.headers.cookie || "");
  const token = cookies.token;
  if (!token) return next(new Error("인증 필요"));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.user_id;
    socket.username = decoded.username;
    next();
  } catch {
    next(new Error("인증 실패"));
  }
});
```

### 소켓 이벤트 핸들러 수정

```javascript
// 수정 전 — 클라이언트 payload를 신뢰
socket.on('join_match', async (data) => {
  const { userId, username } = data; // 위변조 가능
  await saveMatchRecord(userId, username);
});

// 수정 후 — 서버가 검증한 값 사용
socket.on('join_match', async (data) => {
  const userId = socket.userId;       // 전역 미들웨어가 검증한 값
  const username = socket.username;
  await saveMatchRecord(userId, username);
});
```

chat.socket.js의 `joinRoom`에는 DB 조회로 해당 유저가 실제 해당 방의 참여자인지 추가 검증합니다.

### 낙관적 잠금으로 확성기 Race Condition 해결

```javascript
// 수정 후 — UPDATE 조건에 현재 수량 검증 추가
const { error } = await supabase
  .from('users')
  .update({ megaphone_count: user.megaphone_count - 1 })
  .eq('id', socket.userId)
  .eq('megaphone_count', user.megaphone_count); // 내가 읽은 값과 같을 때만 반영

if (error) {
  // 조건 불일치 = 동시 요청이 먼저 차감한 것
  socket.emit('megaphone_error', { message: '수량이 변경되었습니다. 다시 시도해 주세요.' });
  return;
}
```

### 비밀번호 재설정 토큰 도입

```javascript
// /check-user — 사용자 확인 후 단기 리셋 토큰 발급
const resetToken = jwt.sign(
  { username, purpose: 'password-reset' },
  process.env.JWT_SECRET,
  { expiresIn: '5m' }
);
res.json({ resetToken });

// /reset — 리셋 토큰 필수 검증
const decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
if (decoded.purpose !== 'password-reset' || decoded.username !== username) {
  return res.status(401).json({ message: '유효하지 않은 토큰' });
}
// 이후 비밀번호 변경 진행
```

### 암호화 키 폴백 제거

```javascript
// 수정 후 — 미설정 시 서버 시작 거부
const key = process.env.ENCRYPT_KEY;
if (!key || key.length !== 64) {
  throw new Error('ENCRYPT_KEY 환경변수가 설정되지 않았거나 길이가 올바르지 않습니다.');
}
```

### flush.js null 체크

```javascript
// 수정 후
const { data: queueData, error: queueError } = await supabase.from('queue').select('*');
if (queueError) {
  console.error('queue 조회 실패:', queueError);
  return;
}
if (!queueData || queueData.length === 0) return;

const filtered = queueData.filter(/* ... */);
```

---

## ✅ 핵심 정리

- **소켓 이벤트에서 클라이언트 payload의 userId를 절대 신뢰하지 않습니다.** `io.use()`로 전역 JWT 미들웨어를 등록하고, 검증된 `socket.userId`만 사용합니다.

- **새 API 라우트를 만들 때 `authMiddleware` 적용 여부를 체크리스트로 확인합니다.** 미들웨어가 있어도 라우트에 연결하지 않으면 없는 것과 같습니다.

- **DB 차감·증감 로직에는 낙관적 잠금 또는 원자적 연산을 사용합니다.** SELECT 후 UPDATE 패턴은 TOCTOU Race Condition에 취약합니다.

- **환경변수 폴백으로 약한 기본값을 사용하면 안 됩니다.** 환경변수가 없으면 서버 시작 자체를 거부하는 것이 더 안전합니다.

- **DB 쿼리 결과는 항상 error → null → empty 순으로 체크합니다.** null 체크 없이 메서드를 호출하면 주기적 TypeError의 원인이 됩니다.

- **기능이 동작한다는 것과 보안이 된다는 것은 별개입니다.** 출시 전 코드 리뷰는 기능 테스트가 잡지 못하는 구조적 결함을 발견합니다.
