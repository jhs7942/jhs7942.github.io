---
title: JWT 토큰 인증 (3/3) — 서버 세션 없이 인증하기
slug: express-jwt-auth
description: >-
  세션은 서버가 상태를 들고 있어야 해서, 서버가 여러 대로 늘어나면 관리가 까다롭습니다. JWT(JSON Web Token)는 서버가 세션을
  저장하는 대신, 서명된 토큰을 클라이언트에 넘겨 인증을 관리하는 무상태(stateless) 방식입니다. 이번 글에서는 JWT의 세
  부분(헤더·페이로드·서명) 구조와 `jsonwebtoken`의 `sign`·`verify`로 토큰 기반 로그인을 구현하고, 세션 방식과
  비교합니다. Express 인증 시리즈 마지막 3편입니다.
published_at: '2026-07-06T07:19:20-07:00'
labels:
  - AI 작성
  - 학습 정리
  - Express
  - 인증
  - 보안
source: NCS-ExpressJS-Part1 32_cookies 학습 자료 (JWT)
series: express-auth
part: 3
legacy_url: 'https://saver7942.blogspot.com/2026/07/jwt-33.html'
draft: false
---

2편까지의 세션 방식은 잘 동작하지만, 상태를 **서버가** 들고 있다는 특성이 있습니다. 서버가 한 대일 땐 문제없지만, 트래픽이 늘어 서버를 여러 대로 확장하면 "이 세션이 어느 서버에 있지?"를 관리해야 합니다. 이번 마지막 편은 상태를 서버에 두지 않는 **JWT 토큰 인증**입니다.

## 🎫 1. JWT란 — 무상태 토큰 인증

JWT(JSON Web Token)는 **토큰 기반 인증** 방식입니다. 세션은 서버가 상태를 저장하지만, JWT는 서버가 상태를 저장하지 않고 **서명된 토큰을 클라이언트에 넘깁니다.**

- **세션 방식** — 로그인 시 서버가 세션을 만들고, 클라이언트에는 세션 ID만 준다. 상태는 서버에.

- **JWT 방식** — 로그인 시 서버가 토큰을 발급해 클라이언트에 준다. 클라이언트가 이 토큰을 저장하고 요청마다 보낸다. 상태는 토큰 안에.

서버가 상태를 들고 있지 않으므로 **서버 부담이 줄고**, 여러 서버가 같은 비밀 키만 공유하면 어느 서버든 토큰을 검증할 수 있어 **확장에 유리**합니다.

## 🧩 2. JWT의 구조 — 헤더·페이로드·서명

JWT 토큰은 점(`.`)으로 구분된 세 부분으로 이뤄집니다.

```text
xxxxx.yyyyy.zzzzz
헤더  .페이로드.서명
```

1. **헤더(Header)** — 서명 알고리즘과 타입. 예: `{"alg": "HS256", "typ": "JWT"}`

2. **페이로드(Payload)** — 담고 싶은 정보(사용자 ID 등). 예: `{"user_id": 123, "username": "JohnDoe"}`

3. **서명(Signature)** — 헤더와 페이로드를 **비밀 키로 서명**한 값. 토큰이 위조되지 않았는지 검증하는 데 씁니다.

| 부분 | 내용 | 인코딩·보호 |
| :---: | :---: | :---: |
| 헤더 | 알고리즘·타입 | Base64Url 인코딩 |
| 페이로드 | 사용자 정보 | Base64Url 인코딩 (암호화 아님) |
| 서명 | 위조 방지 | 비밀 키로 서명 |

여기서 중요한 점은 **페이로드는 암호화가 아니라 인코딩**이라는 것입니다. 누구나 디코딩해 내용을 볼 수 있으므로, 비밀번호 같은 민감 정보를 넣으면 안 됩니다. 서명은 "내용을 감추는" 것이 아니라 "**변조를 막는**" 장치입니다.

## 🛠️ 3. jsonwebtoken 실전 — 발급과 검증

`jwt.sign(페이로드, 비밀키, 옵션)`으로 발급하고, `jwt.verify(토큰, 비밀키)`로 검증합니다.

```js
const express = require("express");
const jwt = require("jsonwebtoken");
const app = express();

app.use(express.urlencoded({ extended: true }));

const usersDB = [{ id: 1, username: "JohnDoe", password: "password123" }];
const secretKey = "secret-key-1234"; // 실제로는 환경 변수로 관리

// 로그인 → 토큰 발급
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const user = usersDB.find((u) => u.username === username && u.password === password);

  if (!user) return res.send("아이디나 비밀번호가 틀렸습니다.");

  // 페이로드 + 비밀키 + 만료시간 → 토큰 생성
  const token = jwt.sign(
    { user_id: user.id, username: user.username },
    secretKey,
    { expiresIn: "1h" }
  );
  res.json({ message: "로그인 성공", token });
});

// 보호된 페이지 → 토큰 검증
app.get("/profile", (req, res) => {
  const token = req.headers["authorization"]; // Authorization 헤더에서 토큰
  if (!token) return res.send("토큰이 없습니다.");

  jwt.verify(token, secretKey, (err, decoded) => {
    if (err) return res.send("토큰이 유효하지 않습니다.");
    res.json({ message: `${decoded.username}님, 환영합니다!` });
  });
});
```

- 로그인에 성공하면 `jwt.sign`으로 토큰을 만들어 클라이언트에 넘깁니다. `expiresIn`으로 만료 시간을 둡니다.

- 클라이언트는 이후 요청의 `Authorization` 헤더에 토큰을 실어 보냅니다.

- 서버는 `jwt.verify`로 서명을 검증합니다. 위조되었거나 만료되면 오류가 납니다.

<details style="margin:10px 0 4px">
<summary style="cursor:pointer;font-weight:700;color:#C8443C">실행 결과 보기</summary>
<pre><code>$ curl -X POST http://localhost:3000/login -d "username=JohnDoe&password=password123"
# 응답 — 토큰 발급
{"message":"로그인 성공","token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjox..."}

$ curl http://localhost:3000/profile -H "Authorization: eyJhbGci..."
# 서버가 서명 검증 후
{"message":"JohnDoe님, 환영합니다!"}</code></pre>
</details>

## ⚖️ 4. 세션 vs JWT

| 항목 | 세션 | JWT |
| :---: | :---: | :---: |
| 상태 저장 | 서버 | 토큰(클라이언트) |
| 서버 부담 | 세션 저장소 필요 | 없음(무상태) |
| 확장성 | 세션 공유 필요 | 비밀 키만 공유하면 됨 |
| 무효화 | 서버에서 즉시 삭제 | 만료 전까지 유효(즉시 폐기 어려움) |
| 전달 위치 | `connect.sid` 쿠키 | `Authorization` 헤더 등 |

JWT는 확장성에 강하지만, 발급한 토큰을 **만료 전에 강제로 무효화하기 어렵다**는 약점이 있습니다. 로그아웃 즉시 차단이 중요한 서비스는 세션을 쓰거나, 별도의 토큰 블랙리스트를 둡니다. 정답은 하나가 아니라 상황에 따른 선택입니다.

## ⚠️ 5. 주의사항

- **페이로드에 민감 정보를 넣지 않습니다.** 페이로드는 인코딩일 뿐 누구나 디코딩할 수 있습니다. 비밀번호·주민번호 같은 값은 담지 않습니다.

- **비밀 키는 반드시 안전하게 관리합니다.** 서명 키가 노출되면 누구나 유효한 토큰을 위조할 수 있습니다. 환경 변수로 분리하고 저장소에 올리지 않습니다.

- **만료 시간을 반드시 둡니다.** `expiresIn`이 없으면 탈취된 토큰이 영원히 유효합니다. 짧게 두고 필요 시 갱신(refresh) 구조를 씁니다.

- **토큰은 즉시 무효화가 어렵습니다.** 로그아웃해도 서버는 이미 나간 토큰을 만료 전까지 막지 못합니다. 강제 차단이 필요하면 블랙리스트나 세션 방식을 병행합니다.

## ✅ 6. 핵심 정리

- **JWT** — 서버가 세션을 저장하는 대신, 서명된 토큰을 클라이언트에 넘겨 인증을 관리하는 무상태 방식입니다.

- **구조** — 헤더·페이로드·서명 세 부분. 페이로드는 암호화가 아닌 인코딩이라 민감 정보를 담지 않고, 서명은 변조를 막습니다.

- **jsonwebtoken** — `jwt.sign(payload, secret, { expiresIn })`으로 발급, `jwt.verify(token, secret)`로 검증. 토큰은 `Authorization` 헤더로 전달합니다.

- **세션 vs JWT** — 세션은 즉시 무효화에, JWT는 확장성에 강합니다. 서비스 특성에 맞게 고릅니다.

이것으로 쿠키에서 시작해 세션·로그인·암호화·JWT까지 이어진 Express 인증 3부작을 마칩니다.
