---
title: Express 내부 구현하기 (1/6) — 순수 HTTP 서버와 수동 라우팅
slug: myexpress-1-http-server-manual-routing
description: >-
  Node.js 내장 `http` 모듈로 웹 서버를 직접 생성하고, `req.url`과 `req.method`를 조합해 수동 라우팅하는 과정을
  살펴봅니다. if-else 분기 방식이 라우트 수가 늘어날수록 어떻게 한계에 부딪히는지 확인하고, Express 스타일 라우터로 개선하는
  출발점을 만듭니다. "Express 내부 구현하기" 시리즈 1편입니다.
published_at: '2026-07-16T17:43:14-07:00'
labels:
  - AI 작성
  - 학습 정리
  - Node.js
  - Express
source: >-
  C:/Users/jhs02/AppData/Local/Temp/claude/C--Users-jhs02-Desktop-blog/fe27660a-d234-405a-bb90-f7629ae1dff8/scratchpad/myexpress/section1/02/index.js
series: myexpress
part: 1
legacy_url: 'https://saver7942.blogspot.com/2026/07/express-16-http.html'
draft: false
---

Express의 `app.get("/", handler)`는 한 줄이지만, 그 안에서 Node.js가 실제로 무엇을 하는지 알면 디버깅과 설계 판단이 훨씬 명확해집니다. 이 시리즈는 순수 `http` 모듈에서 출발해 Express와 유사한 구조를 단계적으로 직접 만들어 나갑니다.

## 🔍 1. Express 내부를 직접 구현하는 이유

Express는 Node.js 내장 **`http`** 모듈 위에 구축된 웹 프레임워크입니다. Express가 제공하는 라우팅, 미들웨어, 응답 헬퍼는 결국 `http.createServer` 콜백 안에서 동작합니다.

직접 구현해 보면 다음 질문들에 답할 수 있습니다.

- `app.get("/", handler)`는 내부적으로 무엇을 하는가?

- 미들웨어 체인은 어떻게 동작하는가?

- `res.json()`은 `res.end()`와 어떻게 다른가?

이 시리즈에서는 순수 `http` 모듈에서 출발해, 라우터 테이블 → 미들웨어 체인 → 응답 헬퍼 순서로 Express와 유사한 구조를 직접 만들어 나갑니다. 1편에서는 가장 기본적인 출발점인 서버 생성과 수동 라우팅을 다룹니다.

## 🏗️ 2. http.createServer로 기본 서버 만들기

**`http`** 모듈은 별도 설치 없이 사용할 수 있는 Node.js 내장 모듈입니다. `http.createServer()`에 콜백을 전달하면, 클라이언트 요청이 들어올 때마다 그 콜백이 실행됩니다.

```js
// Node.js의 기본 HTTP 모듈 불러오기
const http = require("http");

// HTTP 서버 생성 – 요청이 들어올 때마다 콜백 함수 실행
const server = http.createServer((req, res) => {
  // 클라이언트에게 보낼 응답 헤더 설정
  res.writeHead(200, { "Content-Type": "text/plain" });
  // 응답 본문 작성 및 연결 종료
  res.end("Hello from Node.js HTTP Server!");
});

// 서버 시작 – 포트 3000에서 요청을 대기
server.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});
```

핵심 API를 정리하면 다음과 같습니다.

| API | 역할 |
| :---: | :---: |
| `http.createServer(callback)` | 요청마다 `(req, res)` 콜백을 실행하는 서버 객체를 생성합니다. |
| `res.writeHead(statusCode, headers)` | HTTP 상태 코드와 응답 헤더(`Content-Type` 등)를 설정합니다. |
| `res.end(data)` | 응답 본문을 전송하고 연결을 종료합니다. |
| `server.listen(port, callback)` | 지정한 포트에서 수신을 시작하고, 준비되면 콜백을 한 번 실행합니다. |

> **참고**: `res.writeHead` 없이 `res.end`만 호출하면 기본 상태 코드 200이 설정됩니다. 단, 헤더를 명시하는 것이 명확한 HTTP 응답을 만드는 습관입니다.

## 🛠️ 3. req.url·method로 라우팅하기

기본 서버는 모든 요청에 같은 응답을 반환합니다. 실제 웹 서버는 경로(`url`)와 HTTP 메서드(`method`)에 따라 다른 응답을 돌려줘야 합니다. `req` 객체에서 두 값을 구조 분해 할당으로 꺼내고, `if-else` 분기로 처리합니다.

```js
const http = require("http");

const server = http.createServer((req, res) => {
  // 요청 객체에서 method(GET, POST 등)와 url(/, /about 등)을 구조 분해 할당
  const { url, method } = req;

  // 라우팅 처리: 요청 메서드와 URL 경로에 따라 다른 응답 반환
  if (method === "GET" && url === "/") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Welcome to Home Page");
  } else if (method === "GET" && url === "/about") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("About Us");
  } else {
    // 위 조건에 해당하지 않는 모든 요청에 대해 404 응답
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Page Not Found");
  }
});

server.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});
```

- `method === "GET" && url === "/"` — HTTP 메서드와 경로를 동시에 검사합니다. 같은 URL이라도 `GET /about`과 `POST /about`을 독립적으로 처리할 수 있습니다.

- `else` 블록 — 어떤 조건에도 매칭되지 않는 요청에 대해 404 상태 코드를 반환합니다.

<details>
<summary>실행 결과 보기</summary>
<pre><code>$ curl http://localhost:3000/
Welcome to Home Page

$ curl http://localhost:3000/about
About Us

$ curl http://localhost:3000/products
Page Not Found

$ curl -X POST http://localhost:3000/
Page Not Found</code></pre>
</details>

## ⚠️ 4. if-else 라우팅의 한계

라우트가 두세 개일 때는 문제가 없습니다. 그러나 실제 서비스 수준의 라우트를 추가하다 보면 다음과 같은 형태가 됩니다.

```js
if (method === 'GET' && url === '/') { ... }
else if (method === 'GET' && url === '/about') { ... }
else if (method === 'GET' && url === '/products') { ... }
else if (method === 'GET' && url === '/contact') { ... }
else if (method === 'POST' && url === '/products') { ... }
else if (method === 'PUT' && url === '/products/123') { ... }
else if (method === 'DELETE' && url === '/products/123') { ... }
else {
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Page Not Found');
}
```

이 방식에는 몇 가지 구조적 문제가 있습니다.

- **단일 콜백 비대화** — 모든 라우팅 로직이 `createServer`의 콜백 하나에 쌓입니다.

- **조건문 순차 탐색** — 요청마다 조건을 위에서 아래로 순서대로 검사합니다. 라우트가 늘어날수록 탐색 경로가 길어집니다.

- **동적 경로 처리 불가** — `/products/123`처럼 값이 변하는 경로를 처리하려면 별도 파싱 로직이 필요합니다.

Express는 이 문제를 **라우터 테이블** 방식으로 해결합니다. `app.get("/", handler)` 호출 시 `{method, path, handler}` 형태로 테이블에 등록하고, 요청이 들어오면 테이블에서 일치하는 항목을 찾아 핸들러를 실행합니다.

```js
// Express 스타일 — 라우트를 테이블에 등록
app.get("/", homeHandler);
app.get("/about", aboutHandler);
app.post("/products", createProductHandler);
app.post("/admin", adminHandler);
```

2편에서는 이 라우터 테이블 구조를 직접 구현합니다.

## ✅ 5. 핵심 정리

- **`http.createServer(callback)`** — 요청마다 `(req, res)` 콜백이 실행되며, `res.writeHead` + `res.end` 조합으로 응답을 완성합니다.

- **`req.url`과 `req.method`** — 두 값을 조합하면 경로와 HTTP 메서드를 함께 검사하는 라우팅이 가능합니다.

- **if-else 라우팅의 한계** — 라우트가 늘어날수록 단일 콜백이 비대해지고, 동적 경로 처리가 어렵습니다.

- **다음 편 예고** — 라우트를 테이블에 등록하고 탐색하는 방식으로 개선해 `app.get()` 스타일의 인터페이스를 직접 만듭니다.
