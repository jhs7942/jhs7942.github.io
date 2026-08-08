---
title: 쿠키와 세션 (1/3) — 상태 없는 HTTP에서 사용자 기억하기
slug: express-cookie-session
description: >-
  HTTP는 요청이 끝나면 사용자를 잊어버리는 무상태(stateless) 구조입니다. 그래서 로그인 상태를 유지하려면 별도의 장치가
  필요합니다. 이번 글에서는 브라우저에 정보를 저장하는 쿠키(cookie-parser)와, 서버에 정보를 저장하고 브라우저에는 세션 ID만
  들려 보내는 세션(express-session)을 정리하고, 둘의 차이를 비교합니다. Express 인증 시리즈 1편입니다.
published_at: '2026-07-06T07:19:14-07:00'
labels:
  - AI 작성
  - 학습 정리
  - Express
  - 인증
source: 'NCS-ExpressJS-Part1 32_cookies 학습 자료 (Cookie, Session)'
series: express-auth
part: 1
legacy_url: 'https://saver7942.blogspot.com/2026/07/13-http.html'
draft: false
---

로그인 한 번으로 여러 페이지를 오갈 수 있는 건 당연해 보이지만, HTTP 자체는 "방금 누가 요청했는지"를 기억하지 못합니다. 요청을 처리하고 나면 바로 잊어버리죠. 그렇다면 서버는 어떻게 사용자를 계속 알아볼까요? 이 시리즈는 그 답인 **인증(authentication)**을 다룹니다. 첫 편은 상태 유지의 두 기둥, **쿠키와 세션**입니다.

> 이 시리즈는 [Express 기초 6부작](/posts/express-router-split/)에서 이어집니다. 라우팅·미들웨어·요청 데이터가 익숙하다는 전제로 진행합니다.

## 🧠 1. 왜 상태 유지가 필요한가 — stateless HTTP

HTTP는 **무상태(stateless)** 프로토콜입니다. 서버는 한 요청을 처리하고 나면 그 요청을 누가 보냈는지 바로 잊습니다.

- 사용자가 로그인에 성공해도,

- 다음 요청에서 서버는 "이 사람이 방금 로그인한 그 사람인지" 알 수 없습니다.

- 아무 장치가 없으면 매 요청마다 다시 로그인해야 합니다.

그래서 요청 사이에 **사용자의 상태를 유지**할 방법이 필요합니다. 대표적인 두 가지가 쿠키와 세션입니다.

## 🍪 2. 쿠키 — 브라우저에 저장하는 기억

쿠키는 서버가 브라우저에 적어 보내는 작은 메모입니다. 브라우저는 이를 저장해 두었다가, 같은 사이트에 다시 요청할 때 **자동으로 함께 전송**합니다.

Express에서는 `cookie-parser` 미들웨어로 쿠키를 다룹니다.

```js
const express = require("express");
const cookieParser = require("cookie-parser");
const app = express();

// 요청의 쿠키를 읽어 req.cookies 객체에 담아 준다
app.use(cookieParser());

// [설정] res.cookie(이름, 값, 옵션)
app.get("/set-cookie", (req, res) => {
  res.cookie("name", "John Doe", {
    maxAge: 900000,  // 만료 시간 (15분)
    httpOnly: true,  // JS에서 접근 불가 (XSS 방어)
    secure: false,   // HTTPS에서만 전송 (개발 중이라 false)
    sameSite: "Lax", // 타 사이트 요청 제한 (CSRF 방어)
  });
  res.send("쿠키가 설정되었습니다 (name=John Doe)");
});

// [확인] req.cookies
app.get("/get-cookie", (req, res) => {
  const userName = req.cookies.name;
  res.send(userName ? `사용자 이름은 ${userName} 입니다.` : "쿠키가 없습니다.");
});

// [삭제] res.clearCookie(이름)
app.get("/clear-cookie", (req, res) => {
  res.clearCookie("name");
  res.send("name 쿠키가 삭제되었습니다.");
});
```

- `res.cookie`로 심고, `req.cookies`로 읽고, `res.clearCookie`로 지웁니다.

- 한 번 저장된 쿠키는 이후 같은 도메인 요청에 자동으로 실려 갑니다.

<details>
<summary>실행 결과 보기</summary>
<pre><code>$ curl http://localhost:3000/set-cookie
# 응답 헤더 — 서버가 브라우저에 쿠키를 심으라고 지시
Set-Cookie: name=John%20Doe; Max-Age=900; HttpOnly; SameSite=Lax

$ curl http://localhost:3000/get-cookie  (저장된 쿠키 자동 전송)
# 요청 헤더
Cookie: name=John%20Doe
# 응답
사용자 이름은 John Doe 입니다.</code></pre>
</details>

### 쿠키 보안 옵션

| 옵션 | 역할 | 권장 |
| :---: | :---: | :---: |
| `httpOnly` | JS(`document.cookie`)에서 접근 차단 (XSS 방어) | 항상 true |
| `secure` | HTTPS 연결에서만 전송 | 운영 환경 필수 |
| `sameSite` | 타 사이트 자동 요청 차단 (CSRF 방어) | `Lax` 또는 `Strict` |
| `maxAge` / `expires` | 만료 시간 지정 | 항상 설정 |

## 🗄️ 3. 세션 — 서버에 저장하는 기억

쿠키는 데이터를 브라우저가 들고 있어, 사용자가 값을 열어보거나 위조할 수 있습니다. 로그인 정보 같은 민감한 데이터를 담기엔 취약합니다.

**세션**은 실제 데이터를 **서버가 보관**하고, 브라우저에는 그 데이터를 찾는 열쇠인 **세션 ID(`connect.sid`)만** 쿠키로 들려 보냅니다.

Express에서는 `express-session` 미들웨어를 씁니다.

```js
const express = require("express");
const session = require("express-session");
const app = express();

app.use(
  session({
    secret: "secret-key-1234", // 세션 ID 서명용 키 (공개 금지)
    resave: false,             // 요청마다 무조건 저장할지
    saveUninitialized: true,   // 빈 세션도 만들지
    cookie: { httpOnly: true, maxAge: 1000 * 60 * 10 }, // 10분
  })
);

app.get("/visit", (req, res) => {
  // 서버 쪽 세션 객체에 값을 저장 — 브라우저엔 ID만 전달된다
  req.session.count = (req.session.count || 0) + 1;
  res.send(`방문 횟수: ${req.session.count}`);
});
```

- 데이터(`count`)는 **서버 메모리**에 있고, 브라우저는 `connect.sid` 쿠키만 들고 다닙니다.

- 서버는 그 ID로 해당 사용자의 세션 데이터를 찾아냅니다.

<details>
<summary>실행 결과 보기</summary>
<pre><code># 첫 요청 — 서버가 세션 ID 쿠키를 발급
Set-Cookie: connect.sid=s%3A4FuY...zJm.Q7dN...; HttpOnly

# 다음 요청 — 브라우저가 세션 ID만 자동 전송 (데이터는 서버에 있음)
Cookie: connect.sid=s%3A4FuY...zJm.Q7dN...
# 응답
방문 횟수: 2</code></pre>
</details>

## ⚖️ 4. 쿠키 vs 세션

| 항목 | 쿠키 (Cookie) | 세션 (Session) |
| :---: | :---: | :---: |
| 저장 위치 | 브라우저 | 서버 |
| 브라우저가 들고 다니는 것 | 데이터 전체 | 세션 ID(`connect.sid`)만 |
| 민감 정보 저장 | 위험 (위조 가능) | 안전 |
| 서버 부담 | 없음 | 세션 저장소 필요 |
| 상태 유지 주체 | 사용자(브라우저) | 서버 |

정리하면, **쿠키는 브라우저가 기억하고 세션은 서버가 기억**합니다. 세션도 "세션 ID를 어디에 담아 보낼지"는 결국 쿠키를 쓰므로, 둘은 대립이 아니라 **함께 맞물려 동작**합니다.

## ⚠️ 5. 주의사항

- **쿠키에 민감 정보를 직접 담지 않습니다.** 쿠키 값은 사용자가 열어보고 바꿀 수 있으므로, 비밀번호·권한 같은 정보는 세션(서버)에 두고 쿠키에는 ID만 담습니다.

- **`httpOnly`는 사실상 필수입니다.** 이 옵션이 없으면 스크립트(`document.cookie`)로 쿠키를 읽을 수 있어 XSS에 노출됩니다.

- **`secret`은 절대 저장소에 올리지 않습니다.** 세션 ID 서명 키가 노출되면 세션을 위조할 수 있습니다. 환경 변수 등으로 분리합니다.

- **기본 세션 저장소는 서버 메모리입니다.** 서버를 재시작하면 세션이 사라지고, 여러 서버로 확장하면 공유되지 않습니다. 운영에서는 Redis 같은 외부 저장소를 함께 씁니다.

## ✅ 6. 핵심 정리

- **stateless HTTP** — 서버는 요청 사이에 사용자를 기억하지 못하므로, 상태 유지 장치가 필요합니다.

- **쿠키** — 브라우저가 저장·자동 전송. `cookie-parser`로 `res.cookie`·`req.cookies`·`res.clearCookie`를 다루고, `httpOnly`·`secure`·`sameSite`·`maxAge`로 보안을 챙깁니다.

- **세션** — 데이터는 서버에, 브라우저에는 `connect.sid`만. `express-session`의 `req.session`에 상태를 담습니다.

- **관계** — 쿠키는 브라우저가, 세션은 서버가 기억하며, 세션 ID 전달에는 쿠키가 쓰입니다.
