---
title: Express 내부 구현하기 (5/6) — 동적 파라미터와 JSON 바디 파서
slug: myexpress-5-dynamic-params-json-parser
description: >-
  `app.get('/users/:id')`와 `express.json()`의 원형을 직접 구현합니다. 경로 패턴을 슬래시 단위 조각으로
  분해해 저장하고, 요청 URL과 조각별로 비교해 `:id` 자리를 `params` 객체로 추출하는 동적 라우터를 만듭니다. 이어서 HTTP
  본문이 스트림으로 전달된다는 원리에서 출발해, 청크를 누적하고 `JSON.parse`로 변환해 `req.body`를 완성하는 JSON 바디
  파서 미들웨어를 구현합니다. Factory 패턴으로 만들어 `express.json()`과 동일한 인터페이스를 갖습니다. "Express
  내부 구현하기" 시리즈 5편입니다.
published_at: '2026-07-16T17:43:26-07:00'
labels:
  - AI 작성
  - 학습 정리
  - Node.js
  - Express
source: >-
  C:/Users/jhs02/AppData/Local/Temp/claude/C--Users-jhs02-Desktop-blog/fe27660a-d234-405a-bb90-f7629ae1dff8/scratchpad/myexpress/section1/10/index.js
series: myexpress
part: 5
legacy_url: 'https://saver7942.blogspot.com/2026/07/express-56-json.html'
draft: false
---

Express의 `app.get("/users/:id", handler)`는 URL에서 숫자를 꺼내 `req.params.id`로 제공하고, `express.json()`은 POST 요청의 JSON 본문을 `req.body`에 담아 줍니다. 이 두 기능이 내부에서 어떻게 동작하는지, 순수 Node.js 코드로 직접 구현해 봅니다.

## 🔍 1. 배경

앞의 네 편에서는 `http` 모듈 위에 라우터 테이블, 미들웨어 체인, 응답 헬퍼를 단계적으로 구축했습니다. 라우터 테이블에 등록된 경로는 `/users`, `/products`처럼 고정 문자열이었습니다.

5편에서는 두 가지를 추가합니다.

- **동적 경로 파라미터** — `/users/:id`처럼 자리 표시자(`:id`)를 포함한 경로를 등록하고, 요청 URL에서 실제 값을 추출해 `params` 객체로 핸들러에 전달합니다.

- **JSON 바디 파서** — POST 요청의 본문은 자동으로 제공되지 않습니다. HTTP 본문은 스트림으로 전달되므로 청크를 누적한 뒤 파싱해야 `req.body`를 얻을 수 있습니다.

## 🏗️ 2. addRoute — 경로 패턴을 조각으로 저장하기

Express는 `/users/:id` 경로를 등록할 때 경로 전체를 문자열로 저장하지 않습니다. 나중에 요청 URL과 비교하기 편하도록 슬래시 기준으로 **조각(parts)** 단위로 분해해 저장합니다.

```js
// 동적 라우트 정보를 저장할 배열
// 각 라우트는 method, parts, paramNames, handler 형태로 저장됩니다.
const routes = [];

// pathPattern을 "/users/:id" 형태로 받아 내부적으로 조각 단위로 분해합니다.
function addRoute(method, pathPattern, handler) {
  const parts = pathPattern.split("/").filter(Boolean); // ['users', ':id']
  const paramNames = parts
    .filter((p) => p.startsWith(":"))
    .map((p) => p.slice(1)); // ['id']
  routes.push({ method, parts, paramNames, handler }); // 구조화된 라우트 정보 저장
}
```

- `split("/").filter(Boolean)` — 슬래시로 나누고, 맨 앞 슬래시가 만드는 빈 문자열을 제거합니다. `"/users/:id"` → `['users', ':id']`

- `filter(p => p.startsWith(":"))` — `:` 로 시작하는 조각만 추려 파라미터 이름 목록을 만듭니다.

- `map(p => p.slice(1))` — `:` 를 제거해 순수 이름만 남깁니다. `':id'` → `'id'`

- `routes.push(...)` — `{ method, parts, paramNames, handler }` 형태로 저장합니다.

| 입력 | 처리 | 결과 |
| :---: | :---: | :---: |
| `"/users/:id"` | `split("/").filter(Boolean)` | `parts: ['users', ':id']` |
| `parts` 전체 | `:` 시작 필터링 + `:` 제거 | `paramNames: ['id']` |

## 🛠️ 3. matchRoute — URL 매칭과 파라미터 추출

요청이 들어오면 `matchRoute`가 등록된 라우트 배열을 순회하며 URL을 비교합니다. 조각 수 또는 메서드가 다르면 즉시 건너뜁니다. 조각별 비교에서 `:` 로 시작하는 조각은 파라미터 값으로 수집합니다.

```js
// 클라이언트 요청 URL과 등록된 라우트들을 비교하여 일치 여부 확인 및 파라미터 추출
function matchRoute(method, url) {
  const urlParts = url.split("/").filter(Boolean); // 요청 URL → ['users', '123']

  for (const route of routes) {
    if (route.method !== method || route.parts.length !== urlParts.length)
      continue;

    const params = {};
    let matched = true;

    for (let i = 0; i < route.parts.length; i++) {
      const routePart = route.parts[i];
      const urlPart = urlParts[i];

      if (routePart.startsWith(":")) {
        const paramName = routePart.slice(1); // ':id' → 'id'
        params[paramName] = urlPart; // params['id'] = '123'
      } else if (routePart !== urlPart) {
        matched = false;
        break;
      }
    }

    if (matched) return { handler: route.handler, params }; // 매칭 성공 시 핸들러 및 파라미터 반환
  }

  return null; // 어떤 라우트와도 일치하지 않을 경우
}
```

매칭 흐름을 순서대로 정리하면 다음과 같습니다.

1. 요청 URL을 같은 방식으로 분해합니다. `GET /users/123` → `urlParts: ['users', '123']`

2. 라우트 배열을 순회하며 **메서드**와 **조각 수**를 먼저 검사합니다. 하나라도 다르면 `continue`로 다음 라우트로 넘어갑니다.

3. 조각별 비교를 수행합니다. `:id`처럼 `:` 로 시작하면 `params[paramName] = urlPart`로 수집합니다. 고정 문자열이면 정확히 일치해야 합니다.

4. 모든 조각을 통과하면 `{ handler, params }`를 반환합니다.

서버와 연결한 전체 코드와 동작을 확인합니다.

```js
const http = require("http");

// 추출된 파라미터 객체(params)를 통해 동적으로 응답을 생성합니다.
function handleUserDetail(req, res, params) {
  const userId = params.id;
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ message: `User Detail for ID: ${userId}` }));
}

// /users/:id 경로로 들어온 GET 요청을 handleUserDetail 함수와 연결
addRoute("GET", "/users/:id", handleUserDetail);

const server = http.createServer((req, res) => {
  const { method, url } = req;
  console.log(`[Request] ${method} ${url}`);

  const match = matchRoute(method, url); // URL 분석 및 라우트 탐색

  if (match) {
    match.handler(req, res, match.params); // 일치 시 핸들러 호출
  } else {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("404 Not Found"); // 라우트가 없을 경우
  }
});

server.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});
```

<details>
<summary>실행 결과 보기</summary>
<pre><code>$ curl http://localhost:3000/users/123
{"message":"User Detail for ID: 123"}

# GET /users — 조각 수(1) ≠ route.parts.length(2) → 매칭 실패
$ curl http://localhost:3000/users
404 Not Found

# GET /products/123 — 첫 조각 'products' ≠ 'users' → 매칭 실패
$ curl http://localhost:3000/products/123
404 Not Found</code></pre>
</details>

## 📦 4. HTTP 본문은 스트림이다

`GET` 요청과 달리 `POST` 요청은 바디에 데이터를 담아 보냅니다. Node.js에서 이 데이터는 **스트림**으로 전달됩니다. 요청 본문 전체가 한 번에 도착하는 것이 아니라 여러 청크(chunk)로 나뉘어 들어옵니다.

`req` 객체는 `EventEmitter`를 상속하므로 이벤트로 청크를 수신합니다.

| 이벤트 | 발생 시점 | 처리 |
| :---: | :---: | :---: |
| `req.on('data', chunk => ...)` | 청크 수신마다 | `body += chunk`로 누적 |
| `req.on('end', () => ...)` | 본문 수신 완료 | `JSON.parse(body)` 후 `next()` |
| `req.on('error', err => ...)` | 네트워크 오류 | 400 응답 반환 |

Express의 `express.json()`이 이 이벤트 구독을 감춰 줍니다. 직접 구현해 보면 `req.body`가 어떻게 채워지는지 명확해집니다.

> **참고**: `req.body`는 Node.js `http` 모듈에 기본으로 없는 속성입니다. 바디 파서 미들웨어가 스트림을 읽고 파싱한 뒤 직접 `req.body = ...`로 주입합니다.

## 🛠️ 5. jsonParser 미들웨어 구현

`jsonParser()`는 **Factory 패턴**으로 구현됩니다. 함수를 호출하면 미들웨어 함수 `(req, res, next) => { ... }`가 반환됩니다. Express의 `express.json()`도 같은 패턴입니다.

```js
// JSON 파서 미들웨어 구현 (Factory 패턴)
function jsonParser() {
  return function (req, res, next) {
    const contentType = req.headers["content-type"] || "";

    // Content-Type이 application/json이 아니면 바로 다음 미들웨어로
    if (!contentType.includes("application/json")) {
      return next();
    }

    let body = "";

    // 데이터가 chunk 단위로 수신될 때마다 body 문자열에 누적
    req.on("data", (chunk) => {
      body += chunk;
    });

    // 모든 데이터 수신 완료 → JSON 파싱 시도
    req.on("end", () => {
      try {
        req.body = JSON.parse(body); // JSON 문자열 → 객체 변환
        next(); // 다음 미들웨어로 이동
      } catch (e) {
        // JSON 구문 오류 처리
        res.writeHead(400, { "Content-Type": "text/plain" });
        res.end("Invalid JSON Format");
      }
    });

    // 네트워크 오류 발생 시 처리
    req.on("error", (err) => {
      console.error("[Request Error] 데이터 수신 중 오류 발생:", err.message);
      res.writeHead(400, { "Content-Type": "text/plain" });
      res.end("Error while receiving data");
    });
  };
}
```

- Content-Type이 `application/json`이 아니면 `next()`로 즉시 통과시킵니다. 불필요한 스트림 구독을 방지합니다.

- `req.on('end')` 콜백 안에서 `next()`를 호출합니다. 본문이 모두 도착한 뒤에야 다음 미들웨어로 넘어가야 하기 때문입니다.

- `JSON.parse` 실패 시 400 응답으로 즉시 종료합니다. `next()`를 호출하지 않아 이후 미들웨어가 실행되지 않습니다.

미들웨어를 조합한 전체 흐름입니다.

```js
// 미들웨어 배열 구성
const middlewares = [
  jsonParser(), // 본문 JSON 처리 미들웨어

  // POST /users 요청 처리
  (req, res, next) => {
    if (req.method === "POST" && req.url === "/users") {
      res.writeHead(201, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          message: "User Created",
          data: req.body,
        })
      );
    } else {
      next(); // 조건이 맞지 않으면 다음 미들웨어로
    }
  },

  // 모든 라우트에 대해 404 처리
  (req, res, next) => {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("404 Not Found");
  },
];

// 미들웨어 실행 함수 정의
function runMiddlewares(req, res, middlewares) {
  let idx = 0;

  function next() {
    if (idx < middlewares.length) {
      const current = middlewares[idx++];
      current(req, res, next); // 현재 미들웨어 실행
    } else {
      console.log("모든 미들웨어 처리가 완료되었습니다.");
    }
  }

  next(); // 첫 번째 미들웨어부터 실행 시작
}

const server = http.createServer((req, res) => {
  console.log(`[Request] Method: ${req.method}, URL: ${req.url}`);
  runMiddlewares(req, res, middlewares);
});

server.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});
```

<details>
<summary>실행 결과 보기</summary>
<pre><code># 정상 요청 — JSON 본문 파싱 후 201 응답
$ curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice","age":30}'
HTTP/1.1 201 Created
{"message":"User Created","data":{"name":"Alice","age":30}}

# 잘못된 JSON — JSON.parse 실패 → 400
$ curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{invalid json}'
HTTP/1.1 400 Bad Request
Invalid JSON Format

# GET 요청 — jsonParser가 next() 통과 → POST 조건 불일치 → 404
$ curl http://localhost:3000/users
HTTP/1.1 404 Not Found
404 Not Found</code></pre>
</details>

## ⚠️ 6. 주의사항

- **`next()`의 위치가 중요합니다** — `jsonParser`에서 `next()`는 반드시 `req.on('end')` 콜백 안에서 호출해야 합니다. 이벤트 구독 코드 다음 줄에서 `next()`를 호출하면 본문이 아직 비어 있는 상태로 다음 미들웨어가 실행됩니다.

- **Content-Type 헤더 없이 POST를 보내면** — `jsonParser`가 `next()`로 통과시키므로 `req.body`가 `undefined`인 채로 다음 핸들러에 전달됩니다.

- **본문 크기 제한이 없습니다** — 이 구현에서는 청크를 무제한 누적합니다. Express의 `express.json()`은 기본 100 KB 제한이 있습니다. 실제 서비스라면 누적 크기를 검사하는 로직이 필요합니다.

- **동적 경로와 정적 경로의 충돌** — `/users/profile`과 `/users/:id`를 함께 등록하면 등록 순서에 따라 매칭 결과가 달라집니다. `/users/profile`을 먼저 등록해야 `GET /users/profile`이 `:id = "profile"`로 해석되지 않습니다.

## ✅ 7. 핵심 정리

- **동적 경로 등록** — 경로 패턴을 `split("/").filter(Boolean)`으로 조각내어 `parts`로 저장합니다. `:` 로 시작하는 조각이 파라미터 슬롯입니다.

- **매칭 흐름** — 요청 URL도 같은 방식으로 분해한 뒤, 메서드 → 조각 수 → 조각별 비교 순서로 검사합니다. `:` 조각은 `params` 객체로 수집하고, 고정 문자열은 정확히 일치해야 합니다.

- **HTTP 본문은 스트림** — `req.on('data')`로 청크를 누적하고, `req.on('end')`에서 완성된 문자열을 파싱합니다. 이것이 `req.body`가 만들어지는 과정입니다.

- **Factory 패턴** — `jsonParser()`처럼 "함수가 미들웨어를 반환하는" 구조는 Express 생태계 전반에서 사용되는 패턴입니다. `express.json()`, `cors()`, `morgan()` 모두 같은 방식으로 동작합니다.

- **파싱 실패는 즉시 400** — `JSON.parse` 예외가 발생하면 `next()`를 호출하지 않고 400 응답으로 체인을 중단합니다. 이후 미들웨어가 잘못된 상태를 처리하지 않도록 막아야 합니다.

다음 편(6편)에서는 폼 파서(`application/x-www-form-urlencoded` 본문 처리)와 `createRouter`를 이용한 라우터 모듈화를 다룹니다.
