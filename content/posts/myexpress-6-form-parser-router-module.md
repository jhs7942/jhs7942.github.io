---
title: Express 내부 구현하기 (6/6) — 폼 파서와 createRouter 모듈화
slug: myexpress-6-form-parser-router-module
description: >-
  HTML 폼을 제출하면 브라우저는 `application/x-www-form-urlencoded` 형식으로 데이터를 보냅니다. 이 편에서는
  그 인코딩 방식을 직접 파싱하는 미들웨어(`urlEncodedParser`)를 만들고, `express.Router()`의 원형인
  `createRouter` 팩토리 함수로 라우트를 파일별로 분리합니다. "Express 내부 구현하기" 시리즈의 마지막 6편입니다.
published_at: '2026-07-16T17:45:57-07:00'
labels:
  - AI 작성
  - 학습 정리
  - Node.js
  - Express
source: >-
  C:/Users/jhs02/AppData/Local/Temp/claude/C--Users-jhs02-Desktop-blog/fe27660a-d234-405a-bb90-f7629ae1dff8/scratchpad/myexpress/section1/12/index.js
series: myexpress
part: 6
legacy_url: 'https://saver7942.blogspot.com/2026/07/express-66-createrouter.html'
draft: false
---

HTML 폼의 `<input>` 값들이 `username=Alice&age=30` 꼴로 서버에 도착하는 것은 알지만, 서버가 그 문자열을 어떻게 자바스크립트 객체로 변환하는지는 `express.urlencoded()` 한 줄 뒤에 가려져 있습니다. 라우트가 여러 파일로 분리되는 과정도 마찬가지입니다. 이번 편에서는 두 가지를 직접 구현하며 그 안쪽을 확인합니다.

## 📦 1. application/x-www-form-urlencoded 인코딩 원리

HTML `<form method="POST">`를 제출하면 브라우저는 입력값을 **`application/x-www-form-urlencoded`** 형식으로 인코딩합니다. 요청 헤더에 `Content-Type: application/x-www-form-urlencoded`가 설정되고, 본문(body)에 다음과 같은 문자열이 전달됩니다.

```text
username=Alice&age=30
```

- 각 필드는 `key=value` 쌍으로 표현합니다.

- 여러 필드는 `&`로 연결합니다.

- 공백, 한글, 특수문자는 퍼센트 인코딩(`%ED%99%8D` 등)으로 변환됩니다.

JSON 바디(`application/json`)와 달리 이 형식은 중첩 객체를 표현하지 못하지만, HTML 폼의 기본 인코딩 방식이므로 서버는 반드시 처리할 수 있어야 합니다.

| 인코딩 방식 | Content-Type | 본문 형태 | 중첩 객체 |
| :---: | :---: | :---: | :---: |
| 폼 기본값 | `application/x-www-form-urlencoded` | `key=value&key2=value2` | 불가 |
| JSON | `application/json` | `{"key":"value"}` | 가능 |
| 파일 업로드 | `multipart/form-data` | 멀티파트 바운더리 | 불가 |

> **참고**: `enctype="multipart/form-data"`는 파일 업로드 시 사용하는 별개의 인코딩입니다. 이 편에서는 `application/x-www-form-urlencoded`만 다룹니다.

## 🛠️ 2. urlEncodedParser 미들웨어 구현

### 청크 누적과 파싱

HTTP 요청 본문은 스트림으로 도착합니다. `req.on('data')`로 조각(chunk)을 누적하고, `req.on('end')`에서 완성된 문자열을 파싱합니다.

```js
function urlEncodedParser(req, res, next) {
  const contentType = req.headers["content-type"];

  // POST 메서드이면서 Content-Type이 폼 데이터인 경우만 처리
  if (
    req.method === "POST" &&
    contentType === "application/x-www-form-urlencoded"
  ) {
    let body = "";

    // 조각 데이터(chunk)를 계속 body에 누적
    req.on("data", (chunk) => {
      body += chunk;
    });

    // 모든 데이터 수신 완료 시 파싱 후 req.body에 저장
    req.on("end", () => {
      req.body = parseUrlEncoded(body);
      next();
    });

    // 데이터 수신 중 오류 발생 시 에러 응답 처리
    req.on("error", (err) => {
      console.error("[Request Error] 데이터 수신 중 오류 발생:", err.message);
      res.writeHead(400, { "Content-Type": "text/plain" });
      res.end("Error while receiving data");
    });
  } else {
    // 조건에 해당하지 않으면 다음 미들웨어로 이동
    next();
  }
}
```

- `req.method === "POST"`이고 `Content-Type`이 `application/x-www-form-urlencoded`인 경우에만 본문을 읽습니다.

- 그 외 모든 요청은 즉시 `next()`로 넘깁니다.

- 5편의 JSON 파서와 구조가 동일합니다. 청크 누적 → `end` 이벤트 → 파싱 → `req.body` 설정 → `next()`.

### parseUrlEncoded 함수

```js
function parseUrlEncoded(body) {
  return body.split("&").reduce((acc, pair) => {
    const [key, value] = pair.split("=");
    acc[decodeURIComponent(key)] = decodeURIComponent(value);
    return acc;
  }, {});
}
```

| 단계 | 입력 | 출력 |
| :---: | :---: | :---: |
| `body.split("&")` | `"username=Alice&age=30"` | `["username=Alice", "age=30"]` |
| `pair.split("=")` | `"username=Alice"` | `["username", "Alice"]` |
| `decodeURIComponent` | `"%ED%99%8D"` | `"홍"` (퍼센트 인코딩 복원) |

### /register 라우트로 검증

아래는 `urlEncodedParser`를 미들웨어 체인 앞에 등록하고, `/register` 라우트에서 파싱된 `req.body`를 JSON으로 응답하는 전체 예제입니다.

```js
const http = require("http");

// ... urlEncodedParser, parseUrlEncoded, runMiddlewares 정의 생략

const middlewares = [
  urlEncodedParser, // 폼 데이터 파서 미들웨어

  // 실제 비즈니스 로직 처리: /register 라우트
  (req, res, next) => {
    if (req.method === "POST" && req.url === "/register") {
      console.log("[Form Data]:", req.body);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          status: "Registration Complete",
          received: req.body,
        })
      );
    } else {
      next();
    }
  },

  // 등록되지 않은 라우트에 대한 404 처리
  (req, res, next) => {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("404 Not Found");
  },
];

const server = http.createServer((req, res) => {
  console.log(`[Request] Method: ${req.method}, URL: ${req.url}`);
  runMiddlewares(req, res, middlewares);
});

server.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});
```

아래 HTML 폼을 브라우저에서 열고 제출하면 결과를 확인할 수 있습니다.

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Register Form</title>
  </head>
  <body>
    <h1>회원가입 폼</h1>
    <form action="http://localhost:3000/register" method="POST">
      <label>이름: <input type="text" name="username" value="Alice" /></label>
      <br />
      <label>나이: <input type="text" name="age" value="30" /></label>
      <br />
      <button type="submit">등록하기</button>
    </form>
  </body>
</html>
```

<details style="margin:10px 0 4px">
<summary style="cursor:pointer;font-weight:700;color:#C8443C">실행 결과 보기</summary>
<pre><code># 서버 콘솔
[Request] Method: POST, URL: /register
[Form Data]: { username: 'Alice', age: '30' }

# 브라우저 응답
{
  "status": "Registration Complete",
  "received": {
    "username": "Alice",
    "age": "30"
  }
}</code></pre>
</details>

## 🔍 3. createRouter 팩토리 구현

라우트가 늘어나면 단일 파일에 모든 핸들러를 정의하기 어려워집니다. `express.Router()`처럼 **라우터를 독립 객체**로 만들어 파일로 분리하는 구조가 필요합니다. `createRouter` 팩토리 함수가 그 역할을 합니다.

```js
// createRouter.js
function createRouter() {
  // 등록된 라우트들을 저장하는 배열 (method, path, handler 객체의 목록)
  const routes = [];

  // 라우트 등록 메서드: GET, POST, PUT 등 HTTP 메서드별 경로와 핸들러를 저장
  function use(method, path, handler) {
    routes.push({ method, path, handler });
  }

  // 요청 처리 메서드: 등록된 라우트 중 현재 요청과 일치하는 핸들러를 찾아 실행
  function handle(req, res, next) {
    const matched = routes.find(
      (route) => route.method === req.method && req.url.startsWith(route.path)
    );
    if (matched) {
      return matched.handler(req, res, next);
    }
    next(); // 일치하는 핸들러가 없으면 다음 미들웨어로 넘김
  }

  // 외부로 use()와 handle()만 노출 – 각각 라우트 등록과 요청 처리 기능 담당
  return { use, handle };
}

module.exports = createRouter;
```

핵심 설계 포인트는 다음과 같습니다.

| 요소 | 역할 |
| :---: | :---: |
| `routes` 배열 | 클로저 안에 숨겨진 라우트 저장소. 외부에서 직접 접근 불가 |
| `use(method, path, handler)` | 라우트 등록. `routes`에 `{ method, path, handler }` 객체를 `push` |
| `handle(req, res, next)` | 요청과 일치하는 라우트를 찾아 핸들러 실행. 없으면 `next()` |

`routes` 배열이 클로저 내부에만 존재하므로, `createRouter()`를 여러 번 호출하면 각각 독립된 라우트 배열을 가집니다. `apiRouter`와 `adminRouter`가 서로의 라우트를 볼 수 없는 이유입니다.

## 🏗️ 4. 라우터를 파일로 분리하기

`createRouter`를 활용하면 관련 라우트를 파일 단위로 묶고, `server.js`는 조립만 담당하는 구조가 됩니다.

```text
my-express/
├── createRouter.js          // 라우터 공장 함수
├── server.js                // 서버 진입점
└── routes/
    ├── apiRouter.js         // 사용자 관련 API 라우트
    └── adminRouter.js       // 관리자 전용 API 라우트
```

**routes/apiRouter.js** — 사용자 CRUD 4개를 하나의 파일로 묶습니다.

```js
const createRouter = require("../createRouter");
const apiRouter = createRouter();

// GET /api/user - 사용자 정보 조회
apiRouter.use("GET", "/api/user", (req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("사용자 정보 조회 (GET /api/user)");
});

// POST /api/user - 사용자 생성
apiRouter.use("POST", "/api/user", (req, res) => {
  res.writeHead(201, { "Content-Type": "text/plain" });
  res.end("새로운 사용자 생성 (POST /api/user)");
});

// PUT /api/user/:id - 사용자 정보 수정
apiRouter.use("PUT", "/api/user/", (req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end(`사용자 정보 수정 (PUT ${req.url})`);
});

// DELETE /api/user/:id - 사용자 삭제
apiRouter.use("DELETE", "/api/user/", (req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end(`사용자 삭제 (DELETE ${req.url})`);
});

module.exports = apiRouter;
```

**routes/adminRouter.js** — 관리자 전용 라우트를 별도 파일로 격리합니다.

```js
const createRouter = require("../createRouter");
const adminRouter = createRouter();

// GET /admin/dashboard - 관리자 대시보드 조회
adminRouter.use("GET", "/admin/dashboard", (req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("관리자 대시보드 (GET /admin/dashboard)");
});

// POST /admin/dashboard - 대시보드 설정 저장
adminRouter.use("POST", "/admin/dashboard", (req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("대시보드 설정 저장 (POST /admin/dashboard)");
});

module.exports = adminRouter;
```

**server.js** — 라우터 인스턴스를 `require`하고 `.handle`을 미들웨어 배열에 삽입합니다.

```js
const http = require("http");
const apiRouter = require("./routes/apiRouter");
const adminRouter = require("./routes/adminRouter");

function runMiddlewares(req, res, middlewares) {
  let idx = 0;
  function next() {
    if (idx < middlewares.length) {
      const current = middlewares[idx++];
      current(req, res, next);
    }
  }
  next();
}

const middlewares = [
  // 요청 로그 미들웨어
  (req, res, next) => {
    console.log(`[Request] ${req.method} ${req.url}`);
    next();
  },
  // API 및 관리자 라우터 핸들러 등록
  apiRouter.handle,
  adminRouter.handle,
  // 일치하는 라우트가 없는 경우 404 처리
  (req, res, next) => {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("404 Not Found");
  },
];

const server = http.createServer((req, res) => {
  runMiddlewares(req, res, middlewares);
});

server.listen(3000, () => {
  console.log("Server is running at http://localhost:3000");
});
```

`apiRouter.handle`과 `adminRouter.handle`이 일반 미들웨어 함수처럼 배열에 들어갑니다. `server.js`는 라우트 내용을 전혀 알 필요 없이 조립만 담당합니다.

<details style="margin:10px 0 4px">
<summary style="cursor:pointer;font-weight:700;color:#C8443C">실행 결과 보기</summary>
<pre><code># GET /api/user
사용자 정보 조회 (GET /api/user)

# POST /api/user
새로운 사용자 생성 (POST /api/user)

# GET /admin/dashboard
관리자 대시보드 (GET /admin/dashboard)

# GET /unknown
404 Not Found</code></pre>
</details>

## ⚠️ 5. 주의사항

**`startsWith`로 인한 경로 오매칭**

현재 `handle` 함수는 `req.url.startsWith(route.path)`로 경로를 매칭합니다. `/api/user`에 등록한 핸들러가 `/api/user-settings` 요청도 잡을 수 있습니다.

```js
// /api/user 핸들러가 /api/user-settings 요청도 처리할 수 있음
route.method === req.method && req.url.startsWith(route.path)
```

실제 Express는 경로 파라미터(`:id`)와 정규식 기반 매칭을 사용합니다. 이 구현은 학습 목적의 단순화 버전입니다.

**`Content-Type` 헤더에 charset이 포함된 경우**

브라우저가 `application/x-www-form-urlencoded; charset=UTF-8`처럼 charset을 포함해 보낼 수 있습니다. 현재 구현은 `===` 비교이므로 이 경우 파서가 동작하지 않습니다. 실제 구현에서는 다음처럼 처리합니다.

```js
// 더 안전한 Content-Type 확인
contentType && contentType.startsWith("application/x-www-form-urlencoded")
```

**`+`로 인코딩된 공백 처리**

`application/x-www-form-urlencoded`에서는 공백이 `+` 또는 `%20`으로 인코딩됩니다. `decodeURIComponent`는 `%20`은 처리하지만 `+`는 그대로 둡니다.

```js
// 공백이 +로 인코딩된 경우
decodeURIComponent("hello+world") // "hello+world" (잘못된 결과)

// 올바른 처리
decodeURIComponent(value.replace(/\+/g, " ")) // "hello world"
```

실제 Express의 `qs` 라이브러리는 이 케이스를 모두 처리합니다.

## ✅ 6. 시리즈 전체 여정 정리

이 시리즈는 순수 `http` 모듈에서 출발해 Express와 유사한 구조를 단계별로 직접 만들었습니다.

| 편 | 주제 | 핵심 구현 |
| :---: | :---: | :---: |
| 1편 | 순수 HTTP 서버와 수동 라우팅 | `http.createServer`, `req.url`·`method` 기반 `if-else` 분기 |
| 2편 | 라우트 테이블 | 배열로 라우트를 저장하고 순회하는 `routeTable` |
| 3편 | 미들웨어 체인 | `next()`로 연결되는 `runMiddlewares` 함수 |
| 4편 | 에러 처리와 정적 파일 | 에러 핸들러 규약, `fs.readFile` 기반 정적 파일 응답 |
| 5편 | URL 파라미터와 JSON 파서 | `req.params` 추출, `req.on('data')` 청크 누적 + `JSON.parse` |
| 6편 | 폼 파서와 라우터 모듈화 | `urlEncodedParser`, `createRouter` 클로저 팩토리 |

각 단계에서 확인한 핵심 사실을 정리합니다.

- `express.urlencoded()`는 `Content-Type` 확인 → 청크 누적 → `&`·`=` 분리 → `decodeURIComponent` 순서로 동작합니다.

- `express.json()`과 구조가 동일하고, 파싱 함수만 다릅니다(`JSON.parse` vs `parseUrlEncoded`).

- `express.Router()`는 클로저로 `routes` 배열을 숨기고 `use`·`handle`만 노출하는 **팩토리 패턴**입니다.

- 라우터 인스턴스는 `handle` 메서드 하나로 미들웨어 배열에 삽입됩니다. `server.js`가 라우트 내용을 알 필요가 없어집니다.

- 미들웨어 체인의 `next()`는 제어 흐름 이동 수단입니다. 라우터의 `handle`도 이 인터페이스를 그대로 따르므로 라우터와 일반 미들웨어를 동일한 배열에 혼용할 수 있습니다.
