---
title: Express 요청 데이터 다루기 (3/6) — body·params·query·정적 파일
slug: express-request-data-params-query-static
description: >-
  Express에서 클라이언트 요청으로부터 데이터를 꺼내는 세 가지 경로(본문·경로 파라미터·쿼리 스트링)와 정적 파일 제공을 정리합니다.
  `express.json()`·`express.urlencoded()` 본문 파싱, `req.params`와 `app.param()`
  전처리, `req.query` 자동 파싱, 그리고 1편에서 손수 구현한 정적 파일 서빙을 `express.static()` 한 줄로 대체하는
  과정을 다룹니다. Node.js 웹 서버 기초 3부작의 3편입니다.
published_at: '2026-07-04T22:06:48-07:00'
labels:
  - AI 작성
  - 학습 정리
  - Express
source: 'Node.js/Express 기초 강의 실습 코드 (C:/Users/jhs02/Downloads/ 및 강의 zip 자료)'
series: express
part: 3
legacy_url: 'https://saver7942.blogspot.com/2026/07/express-33-bodyparamsquery.html'
draft: false
---

[1편](/posts/nodejs-http-module-server-basics/)에서 순수 http를, [2편](/posts/express-routing-middleware-basics/)에서 Express 라우팅과 미들웨어를 다뤘습니다. 마지막 편은 요청에서 **데이터를 꺼내는 방법**과 **정적 파일 제공**을 정리합니다. 클라이언트가 데이터를 실어 보내는 통로는 크게 본문(body)·경로 파라미터(params)·쿼리 스트링(query) 세 가지입니다.

## 📨 1. 본문 파싱 — express.json(), express.urlencoded()

HTTP 요청의 본문(body)을 읽으려면 파싱 미들웨어를 먼저 등록해야 합니다.

### JSON 본문 — `express.json()`

```js
app.use(express.json());

app.post("/api/users", (req, res) => {
  console.log(req.body); // { name: "Alice", email: "alice@example.com" }

  const newUser = req.body;
  res.status(201).json({
    message: "User created successfully",
    user: newUser,
  });
});
```

- `express.json()`을 `app.use()`로 등록하면 `Content-Type: application/json` 요청의 본문을 자동으로 파싱해 `req.body`에 저장합니다.

<details style="margin:10px 0 4px">
<summary style="cursor:pointer;font-weight:700;color:#C8443C">실행 결과 보기</summary>
<pre><code>$ curl -X POST http://localhost:3000/api/users \
    -H "Content-Type: application/json" \
    -d '{"name":"Alice","email":"alice@example.com"}'
# 응답 (201 Created)
{"message":"User created successfully","user":{"name":"Alice","email":"alice@example.com"}}
# 서버 콘솔
{ name: 'Alice', email: 'alice@example.com' }</code></pre>
</details>

### 폼 데이터 — `express.urlencoded()`

```js
app.use(express.urlencoded({ extended: true }));

app.post("/login", (req, res) => {
  console.log(req.body); // { username: 'Alice', password: '1234' }
  res.send("Data received");
});
```

- HTML `<form>` 제출 시 기본 인코딩 방식인 `application/x-www-form-urlencoded` 형식의 본문을 파싱합니다.

- `extended: true` — 배열이나 중첩 객체까지 파싱할 수 있어 권장 설정입니다.

<details style="margin:10px 0 4px">
<summary style="cursor:pointer;font-weight:700;color:#C8443C">실행 결과 보기</summary>
<pre><code>$ curl -X POST http://localhost:3000/login \
    -d "username=Alice&password=1234"
# 응답
Data received
# 서버 콘솔
{ username: 'Alice', password: '1234' }</code></pre>
</details>

| 미들웨어 | 처리 Content-Type | 사용 상황 |
| :---: | :---: | :---: |
| `express.json()` | `application/json` | API 요청, fetch/axios로 전송 |
| `express.urlencoded({ extended: true })` | `application/x-www-form-urlencoded` | HTML 폼 제출 |

## 🧭 2. 경로 파라미터 — req.params, app.param()

### `req.params` — 경로 파라미터

URL 경로에서 동적 값을 추출합니다. `:파라미터명` 형태로 선언하면 `req.params`에 자동으로 저장됩니다.

```js
// 단일 파라미터: /users/123
app.get("/users/:id", (req, res) => {
  console.log(req.params); // { id: "123" }
  res.send(`User ID: ${req.params.id}`);
});

// 다중 파라미터: /users/42/books/777
app.get("/users/:userId/books/:bookId", (req, res) => {
  const userId = req.params.userId;
  const bookId = req.params.bookId;
  res.send({ userId, bookId });
});
```

- 파라미터 값은 항상 **문자열**로 전달됩니다.

- 다중 파라미터는 경로에 여러 개를 선언하면 각각 `req.params`에 키-값으로 저장됩니다.

### `app.param()` — 파라미터 전처리 미들웨어

특정 파라미터가 포함된 라우트가 실행되기 전에 자동으로 실행되는 전처리 미들웨어입니다.

```js
app.param("userId", (req, res, next, id) => {
  const user = getUserById(id);

  if (!user) {
    return res.status(404).send("User not found");
  }

  req.user = user; // 조회한 정보를 req에 저장
  next();
});

app.get("/users/:userId", (req, res) => {
  res.send(req.user); // 이미 조회된 상태
});

app.get("/blogs/:userId", (req, res) => {
  res.send({
    message: `${req.user.name}님의 블로그입니다.`,
    user: req.user,
  });
});
```

- `:userId`가 포함된 라우트라면 어디서든 `app.param("userId", ...)` 핸들러가 먼저 실행됩니다.

- DB 조회나 유효성 검사 로직을 한 곳에 모아 **중복 없이 재사용**할 수 있습니다.

- 콜백의 네 번째 인자 `id`에 실제 파라미터 값이 전달됩니다.

<details style="margin:10px 0 4px">
<summary style="cursor:pointer;font-weight:700;color:#C8443C">실행 결과 보기</summary>
<pre><code>$ curl http://localhost:3000/users/1
# 존재하는 사용자 → app.param 통과 후 라우트 실행
{"id":1,"name":"Alice","role":"Admin"}
$ curl http://localhost:3000/users/999
# 존재하지 않는 사용자 → app.param에서 차단 (라우트 미실행)
User not found   (404)</code></pre>
</details>

## 🔎 3. 쿼리 스트링 — req.query

URL의 `?key=value` 형태의 쿼리 스트링은 `req.query`에 자동으로 파싱되어 저장됩니다.

```js
// /search?q=express
app.get("/search", (req, res) => {
  const searchQuery = req.query.q; // "express"

  const results = [
    "Express 기본",
    "Node.js 입문",
    "Express 라우팅",
    "React Express 연동",
  ].filter((item) => item.toLowerCase().includes(searchQuery?.toLowerCase()));

  res.send({ query: searchQuery, results });
});

// /example/info/a?keyword=express&category=tutorial&page=1
app.get("/example/info/a", (req, res) => {
  const { keyword, category, page } = req.query;
  res.send({ keyword, category, page });
});

// /example/info/b?tags=node&tags=express&tags=javascript
app.get("/example/info/b", (req, res) => {
  const tags = req.query.tags; // ['node', 'express', 'javascript']
  res.send({ tags });
});
```

- 단일 값: `req.query.q` → 문자열

- 복수 키: `req.query.keyword`, `req.query.category` 등 각각 독립된 키로 접근

- 같은 키 반복: `?tags=node&tags=express` → `req.query.tags`가 배열로 자동 변환

<details style="margin:10px 0 4px">
<summary style="cursor:pointer;font-weight:700;color:#C8443C">실행 결과 보기</summary>
<pre><code>$ curl "http://localhost:3000/example/info/b?tags=node&tags=express&tags=javascript"
# 같은 키가 반복되면 배열로 파싱됩니다
{"tags":["node","express","javascript"]}
# 서버 콘솔
{ tags: [ 'node', 'express', 'javascript' ] }</code></pre>
</details>

## 🗂️ 4. 정적 파일 — express.static()

1편에서 직접 구현했던 `serveStatic` 함수, `getContentType`, `fs.readFile`, `path.join`, 에러 처리를 `express.static()` 한 줄로 대체합니다.

```js
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.send("<h1>Homepage</h1>");
});
```

- `public` 디렉토리 안의 파일을 웹 루트로 직접 노출합니다.

- 예: `public/image.png` → `http://localhost:3000/image.png`

- MIME 타입 설정, 파일 없음 처리, 성능 최적화가 자동으로 적용됩니다.

| 항목 | 직접 구현 (`serveStatic`) | `express.static()` |
| :---: | :---: | :---: |
| 파일 경로 조합 | `path.join(root, req.url)` | 자동 |
| 비동기 파일 읽기 | `fs.readFile` + 콜백 | 자동 |
| MIME 타입 결정 | `getContentType(ext)` 직접 작성 | 자동 |
| 404 처리 | `err.code === "ENOENT"` 분기 | 자동 |
| 500 처리 | `else` 분기 직접 작성 | 자동 |

## ⚠️ 5. 주의사항

- **파싱 미들웨어는 라우트보다 먼저 등록합니다.** `app.use(express.json())`을 라우트 선언 뒤에 두면 해당 라우트의 `req.body`가 `undefined`가 됩니다.

- **`req.params` 값은 항상 문자열입니다.** `/users/42`의 `42`도 문자열 `"42"`로 들어오므로, 숫자 비교가 필요하면 `Number()` 변환을 거쳐야 합니다.

- **`extended: false`면 중첩 구조를 파싱하지 못합니다.** 폼 데이터에 배열·중첩 객체가 있다면 `extended: true`가 필요합니다.

- **`express.static`은 폴더 전체를 웹에 노출합니다.** `public` 디렉토리에 넣은 모든 파일이 URL로 직접 접근 가능하므로, 설정 파일 같은 민감 파일을 두면 안 됩니다.

## ✅ 6. 핵심 정리

- **본문 파싱 미들웨어** — JSON 요청에는 `express.json()`, HTML 폼 제출에는 `express.urlencoded({ extended: true })`를 라우트 핸들러보다 먼저 등록해야 `req.body`가 채워집니다.

- **경로 파라미터 전처리** — `app.param()`을 사용하면 특정 파라미터가 포함된 모든 라우트에서 DB 조회·유효성 검사를 중복 없이 재사용할 수 있습니다.

- **`req.query` 자동 파싱** — 쿼리 스트링은 별도 설정 없이 `req.query`로 접근할 수 있으며, 같은 키가 반복되면 배열로 자동 변환됩니다.

- **`express.static()`** — 1편에서 손수 구현한 정적 파일 서빙(경로 조합·비동기 읽기·MIME·에러 처리)을 한 줄로 대체합니다.
