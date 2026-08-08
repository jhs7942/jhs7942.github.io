---
title: 세션 로그인과 비밀번호 암호화 (2/3) — bcrypt로 안전한 로그인
slug: express-session-login-bcrypt
description: >-
  세션으로 로그인 상태를 유지하는 실제 흐름과, 비밀번호를 안전하게 저장하는 암호화를 정리합니다. 로그인 폼 제출부터 세션 저장·로그아웃까지의
  흐름을 다루고, 비밀번호를 평문으로 저장하면 안 되는 이유와 Salt·Hash·단방향 암호화 개념, 그리고 bcrypt의
  `hash`·`compare`로 회원가입과 로그인을 구현합니다. Express 인증 시리즈 2편입니다.
published_at: '2026-07-06T07:19:17-07:00'
labels:
  - AI 작성
  - 학습 정리
  - Express
  - 인증
  - 보안
source: 'NCS-ExpressJS-Part1 32_cookies 학습 자료 (Session_Login, PasswordEncryption)'
series: express-auth
part: 2
legacy_url: 'https://saver7942.blogspot.com/2026/07/23-bcrypt.html'
draft: false
---

1편에서 세션이 서버에 상태를 저장한다는 것을 봤습니다. 이번 편은 그 세션으로 **실제 로그인 시스템**을 만들고, 여기서 반드시 짚어야 할 **비밀번호 저장 문제**를 다룹니다. 비밀번호를 그대로 저장하면, 서버가 한 번 뚫리는 순간 모든 사용자의 비밀번호가 통째로 새어 나갑니다.

## 🔑 1. 세션 기반 로그인 흐름

세션 로그인은 네 단계로 돕니다. 로그인 폼 제출 → 세션에 사용자 저장 → 보호된 페이지에서 세션 확인 → 로그아웃으로 세션 파기입니다.

```js
const express = require("express");
const session = require("express-session");
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: "secret-key-1234",
    resave: false,
    saveUninitialized: true,
    cookie: { httpOnly: true, maxAge: 1000 * 60 * 10 },
  })
);

// 로그인 폼
app.get("/login", (req, res) => {
  res.send(`
    <form method="POST" action="/login">
      <input name="username" placeholder="이름 입력" />
      <button type="submit">로그인</button>
    </form>
  `);
});

// 로그인 처리 → 세션에 사용자 저장
app.post("/login", (req, res) => {
  req.session.user = req.body.username;
  res.send(`로그인 성공! <a href="/profile">프로필 보기</a>`);
});

// 보호된 페이지 → 세션 확인
app.get("/profile", (req, res) => {
  if (req.session.user) {
    res.send(`${req.session.user}님, 환영합니다! <a href="/logout">로그아웃</a>`);
  } else {
    res.send("로그인되지 않았습니다. <a href='/login'>로그인</a>");
  }
});

// 로그아웃 → 세션 파기
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.send("로그아웃 되었습니다. <a href='/login'>다시 로그인</a>");
  });
});
```

- 로그인 시 `req.session.user`에 사용자를 저장하면, 이후 요청은 세션 ID로 그 사용자를 알아봅니다.

- `/profile`은 `req.session.user` 존재 여부로 로그인 상태를 판별합니다.

- 로그아웃은 `req.session.destroy()`로 세션을 지워 `connect.sid`를 무효화합니다.

<details>
<summary>로그인 흐름 보기</summary>
<pre><code>POST /login  (body: username=Tom)
  → req.session.user = "Tom" 저장, Set-Cookie: connect.sid=...

GET /profile (Cookie: connect.sid=... 자동 전송)
  → 세션에서 user 조회 → "Tom님, 환영합니다!"

GET /logout
  → req.session.destroy() → 세션 삭제 → 이후 /profile은 로그인 요구</code></pre>
</details>

## 🧂 2. 비밀번호는 왜 암호화하는가 — Salt와 Hash

위 예제는 이름만 다뤘지만, 실제 로그인에는 비밀번호가 있습니다. 이때 비밀번호를 **평문 그대로 저장하면 안 됩니다.** 데이터베이스가 유출되면 모든 비밀번호가 그대로 노출되기 때문입니다.

그래서 비밀번호는 **되돌릴 수 없는 형태로 변형**해 저장합니다. 여기에 두 개념이 등장합니다.

- **Hash(해시)** — 비밀번호를 알고리즘으로 고유한 문자열로 바꿉니다. 음식을 갈아버리면 원재료로 되돌릴 수 없듯, 해시된 값은 원래 비밀번호로 **복원할 수 없습니다(단방향)**. 로그인 시에는 입력값을 같은 방식으로 해시해 **비교**합니다.

- **Salt(소금)** — 해시하기 전에 비밀번호에 덧붙이는 무작위 값입니다. 같은 비밀번호라도 Salt가 다르면 전혀 다른 해시가 나옵니다. 덕분에 미리 계산해 둔 해시 표로 원본을 역추적하는 공격을 막습니다.

| 개념 | 한 줄 요약 |
| :---: | :---: |
| Hash | 되돌릴 수 없는 단방향 변환 |
| Salt | 같은 비밀번호도 다르게 만드는 무작위 값 |
| 복호화 | 단방향 암호화에서는 불가능 — 비교로만 검증 |

이 Salt와 Hash를 알아서 처리해 주는 것이 `bcrypt` 라이브러리입니다.

## 🛠️ 3. bcrypt 실전 — 회원가입과 로그인

`bcrypt.hash(비밀번호, saltRounds)`로 회원가입 시 암호화하고, `bcrypt.compare(입력, 해시)`로 로그인 시 비교합니다. Salt는 bcrypt가 내부적으로 생성해 해시에 함께 담습니다.

```js
const express = require("express");
const session = require("express-session");
const bcrypt = require("bcrypt");
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: "secret-key-1234", resave: false, saveUninitialized: true }));

const usersDB = []; // 가상 데이터베이스

// 회원가입 → 비밀번호를 해시해서 저장
app.post("/signup", async (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10); // saltRounds = 10
  usersDB.push({ username, password: hashedPassword });
  res.send(`회원가입 성공! <a href="/login">로그인</a>`);
});

// 로그인 → 해시와 비교
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const user = usersDB.find((u) => u.username === username);

  if (!user) return res.send("아이디가 존재하지 않습니다.");

  const match = await bcrypt.compare(password, user.password);
  if (match) {
    req.session.user = username; // 일치 → 세션에 저장
    res.send(`로그인 성공! <a href="/profile">프로필 보기</a>`);
  } else {
    res.send("비밀번호가 틀렸습니다.");
  }
});
```

- 저장되는 것은 원본 비밀번호가 아니라 **해시값**입니다. `saltRounds`(여기선 10)는 해시 반복 강도로, 높을수록 안전하지만 느려집니다.

- 로그인은 `bcrypt.compare`로 **입력 비밀번호를 같은 방식으로 해시해 비교**합니다. 원본을 복원하지 않습니다.

- 비교에 성공하면 그때 `req.session.user`에 저장해 로그인 상태를 유지합니다.

<details>
<summary>저장 결과 보기</summary>
<pre><code># 회원가입 시 usersDB에 저장되는 값 (평문 아님)
{
  username: "tom",
  password: "$2b$10$N9qo8uLOickgx2ZMRZoMy...gv3s"  // bcrypt 해시 (Salt 포함)
}
# 같은 "1234"라도 가입할 때마다 해시값이 달라진다 (Salt 때문)</code></pre>
</details>

## ⚠️ 4. 주의사항

- **비밀번호는 절대 평문으로 저장하지 않습니다.** 반드시 `bcrypt.hash`로 해시해 저장하고, 로그인 시 `bcrypt.compare`로 비교합니다.

- **`bcrypt.hash`·`bcrypt.compare`는 비동기입니다.** `await`(또는 콜백)로 처리해야 하며, 라우트 핸들러를 `async`로 선언합니다.

- **해시는 복호화가 불가능합니다.** "비밀번호 찾기"는 원본을 알려줄 수 없으므로, 재설정(새 비밀번호로 다시 해시) 방식으로 만듭니다.

- **`saltRounds`는 균형이 필요합니다.** 너무 낮으면 보안이 약하고, 너무 높으면 로그인이 느려집니다. 보통 10~12를 씁니다.

## ✅ 5. 핵심 정리

- **세션 로그인** — 로그인 시 `req.session.user` 저장, 보호 페이지에서 세션 확인, 로그아웃은 `req.session.destroy()`.

- **평문 저장 금지** — 유출 시 전 사용자 비밀번호가 노출되므로, 되돌릴 수 없는 형태로 저장합니다.

- **Salt와 Hash** — Hash는 단방향 변환, Salt는 같은 비밀번호도 다르게 만드는 무작위 값입니다.

- **bcrypt** — 회원가입은 `bcrypt.hash(pw, 10)`, 로그인은 `bcrypt.compare(pw, hash)`. 검증 성공 후 세션에 저장해 로그인 상태를 유지합니다.
