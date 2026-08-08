---
title: Express 에러 처리와 404 페이지 — 에러 미들웨어 완전 정복
slug: express-error-handling-404
description: >-
  Express에서 에러가 발생했을 때 어떻게 에러 처리 미들웨어까지 도달하는지, 그리고 에러를 상황별로 다르게 처리하는 방법을 정리합니다.
  에러 미들웨어가 일반 미들웨어와 다른 핵심 — 인자 4개 시그니처 `(err, req, res, next)` — 부터 시작해, 오류를 넘기는
  5가지 경로, 단일/다중 에러 미들웨어 구성, 경로 스코프 핸들러, 그리고 404 catch-all 처리까지 실코드와 함께 다룹니다.
published_at: '2026-07-08T08:44:42-07:00'
labels:
  - AI 작성
  - 학습 정리
  - Express
source: 'C:/Users/jhs02/Downloads/errorHandling500-part1 (1).js'
legacy_url: 'https://saver7942.blogspot.com/2026/07/express-404.html'
draft: false
---

라우트 코드를 작성하다 보면 "에러가 발생하면 어디로 가는가?"라는 질문이 생깁니다. 동기 코드에서 `throw`한 오류, `setTimeout` 안의 오류, `async/await` 비동기 오류 — 각각 처리 방식이 다릅니다. 이 글은 Express의 에러 미들웨어가 어떻게 설계되었는지, 그리고 404와 500을 깔끔하게 분리하는 방법을 코드 중심으로 정리합니다.

---

## 📦 1. 에러 처리 미들웨어란?

Express의 미들웨어는 인자 수로 역할이 구분됩니다.

| 종류 | 시그니처 | 용도 |
| :---: | :---: | :---: |
| 일반 미들웨어 | `(req, res, next)` | 요청 처리, 라우팅 |
| **에러 처리 미들웨어** | **`(err, req, res, next)`** | 오류만 처리 |

**에러 처리 미들웨어**는 인자가 반드시 4개여야 합니다. 첫 번째 인자 `err`가 오류 객체를 받습니다. Express는 이 시그니처를 보고 에러 처리 전용 미들웨어임을 인식합니다. 인자를 3개로 줄이면 일반 미들웨어로 취급되어 오류가 전달되지 않습니다.

```js
// 에러 처리 미들웨어 — 인자 4개 필수
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Internal Server Error");
});
```

> **참고**: `next` 인자를 실제로 사용하지 않더라도 시그니처에 반드시 포함해야 합니다. Express가 인자 개수로 에러 핸들러 여부를 판단하기 때문입니다.

---

## 🛠️ 2. 오류를 에러 미들웨어로 넘기는 5가지 방법

오류가 에러 처리 미들웨어에 도달하는 경로는 코드 맥락에 따라 다섯 가지로 나뉩니다.

### 방법 1 — 동기 코드에서 직접 throw

```js
app.get("/", (req, res) => {
  throw new Error("Something went wrong!");
});
```

- 동기 코드 안의 `throw`는 Express가 자동으로 잡아 에러 미들웨어로 전달합니다.

- 별도 `try/catch`나 `next(err)` 호출 없이도 동작합니다.

### 방법 2 — next(err)로 명시적 전달

```js
app.get("/", (req, res, next) => {
  const err = new Error("Something went wrong!");
  next(err); // 에러 객체를 next에 전달
});
```

- `next()`에 인자를 넘기면 Express는 그 값을 에러로 간주하고 에러 처리 미들웨어로 이동합니다.

- 에러를 직접 제어하고 싶을 때 사용합니다.

### 방법 3 — 비동기 콜백(setTimeout) + try/catch + next

```js
app.get("/", (req, res, next) => {
  setTimeout(() => {
    try {
      throw new Error("Async error");
    } catch (err) {
      next(err); // 콜백 안에서는 반드시 next(err)로 전달
    }
  }, 1000);
});
```

- `setTimeout`, `fs.readFile` 같은 **콜백 기반 비동기** 코드 안의 오류는 Express가 자동으로 잡지 못합니다.

- 콜백 내부에서 `try/catch`로 잡은 뒤 `next(err)`로 직접 넘겨야 합니다.

### 방법 4 — async/await + try/catch + next

```js
app.get("/", async (req, res, next) => {
  try {
    await someAsyncOperation();
  } catch (err) {
    next(err); // await 오류도 next(err)로 전달
  }
});
```

- `async/await` 라우트에서 `await`가 reject하면 Express는 자동으로 잡지 못합니다(Express 4 기준).

- `try/catch`로 감싸고 `next(err)`로 에러를 넘깁니다.

> **참고**: Express 5부터는 `async` 라우트의 reject가 자동으로 에러 미들웨어로 전달됩니다. Express 4에서는 위처럼 명시적 처리가 필요합니다.

### 방법 5 — 조건부 next(err)

```js
app.use((req, res, next) => {
  if (someCondition) {
    next(); // 다음 일반 미들웨어로 이동
  } else {
    const error = new Error("Error message");
    next(error); // 에러 미들웨어로 이동
  }
});
```

- 조건에 따라 정상 흐름(`next()`)과 에러 흐름(`next(err)`)을 분기합니다.

- `next()`와 `next(err)`의 차이: 인자가 없으면 다음 일반 미들웨어로, 인자가 있으면 에러 처리 미들웨어로 이동합니다.

**5가지 방법 요약:**

| 상황 | 처리 방법 |
| :---: | :---: |
| 동기 코드 | `throw new Error(...)` — Express가 자동 포착 |
| 명시적 에러 생성 | `next(err)` 직접 호출 |
| 콜백 비동기 | `try/catch` + `next(err)` |
| async/await | `try/catch` + `next(err)` |
| 조건 분기 | 조건에 따라 `next()` vs `next(err)` |

---

## 🏗️ 3. 에러 미들웨어 배치와 순서

### 라우트 뒤에 배치해야 하는 이유

Express 미들웨어는 **등록 순서대로** 실행됩니다. 에러 처리 미들웨어는 반드시 모든 라우트와 일반 미들웨어 **뒤**에 배치해야 합니다.

```js
// 라우트 정의
app.get("/", (req, res) => { ... });
app.get("/users", (req, res) => { ... });

// 404 catch-all (일반 미들웨어)
app.use((req, res, next) => {
  res.status(404).render("404", { url: req.url });
});

// 에러 처리 미들웨어 — 반드시 가장 마지막에
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Internal Server Error");
});
```

### 라우트별 전용 에러 핸들러

에러 핸들러를 라우트 바로 뒤에 배치하면 해당 라우트 전용 핸들러로 동작합니다.

```js
app.get("/", (req, res) => {
  throw new Error("/");
});

// '/' 라우트 전용 에러 핸들러
app.use((err, req, res, next) => {
  console.error("General error:", err);
  res.status(500).send("[GET /] - Internal Server Error");
});

app.get("/users", (req, res) => {
  throw new Error("/users");
});

// '/users' 라우트 전용 에러 핸들러
app.use((err, req, res, next) => {
  console.error("General error:", err);
  res.status(500).send("[GET /users] - Internal Server Error");
});
```

- 라우트와 에러 핸들러를 쌍으로 묶어 각 라우트에 맞는 응답 메시지를 반환할 수 있습니다.

### 단일 vs 다중 에러 미들웨어

**단일 에러 미들웨어** — 모든 라우트의 오류를 하나가 처리:

```js
app.get("/", (req, res) => { throw new Error("Error occurred"); });
app.get("/users", (req, res) => { throw new Error("Error occurred"); });
app.get("/products", (req, res) => { throw new Error("Error occurred"); });

// 모든 오류가 여기로 집결
app.use((err, req, res, next) => {
  console.log("Executing error handling middleware");
  res.status(500).json({ error: "Internal Server Error" });
});
```

**다중 에러 미들웨어** — 오류 유형에 따라 별도 핸들러를 체인:

```js
// 첫 번째: 데이터베이스 오류 전담
app.use((err, req, res, next) => {
  if (err.type === "database") {
    console.error("Database error:", err);
    res.status(500).json({ error: "Database error occurred" });
  } else {
    next(err); // 처리 못 하면 다음 에러 핸들러로 전달
  }
});

// 두 번째: 나머지 모든 오류 처리
app.use((err, req, res, next) => {
  console.error("General error:", err);
  res.status(500).json({ error: "An error occurred" });
});
```

<details style="margin:10px 0 4px">
<summary style="cursor:pointer;font-weight:700;color:#C8443C">실행 결과 보기</summary>
<pre><code># err.type === "database"인 오류 발생 시
# 콘솔
Database error: Error: DB connection failed

# 응답 (HTTP 500)
{ "error": "Database error occurred" }

# 일반 오류 발생 시
# 콘솔
General error: Error: Something went wrong

# 응답 (HTTP 500)
{ "error": "An error occurred" }</code></pre>
</details>

다중 에러 미들웨어에서 핵심은 `next(err)`입니다. 현재 에러 핸들러가 해당 오류를 처리하지 않을 경우 `next(err)`로 다음 에러 핸들러로 넘깁니다.

---

## 🔍 4. 오류 유형별 분기 처리

`err` 객체에 커스텀 프로퍼티(`err.type`, `err.status` 등)를 붙여 에러 핸들러 내부에서 분기합니다.

```js
// 라우트에서 err.type 설정 후 전달
app.get("/api/users", (req, res, next) => {
  const err = new Error("DB connection failed");
  err.type = "database"; // 커스텀 타입 지정
  next(err);
});

// 에러 핸들러에서 err.type으로 분기
app.use((err, req, res, next) => {
  if (err.type === "database") {
    res.status(500).json({ error: "Database error occurred" });
  } else {
    next(err); // 다음 에러 핸들러로 체인
  }
});
```

`err.status`를 이용한 HTTP 상태 코드 기반 분기도 같은 패턴입니다:

```js
app.get("/special-route", (req, res, next) => {
  const error = new Error("Error in special-route");
  error.status = 400; // HTTP 상태 코드를 오류 객체에 포함
  next(error);
});
```

---

## 🔐 5. 경로 스코프 에러 미들웨어

`app.use("/경로", ...)` 형태로 특정 경로에서 발생한 오류만 처리하는 에러 핸들러를 만들 수 있습니다.

```js
// '/special-route'에서 오류 발생
app.get("/special-route", (req, res, next) => {
  const error = new Error("Error in special-route");
  error.status = 400;
  next(error);
});

// 일반 라우트
app.get("/another-route", (req, res) => {
  res.send("This is another route, errors here are not handled by the special handler.");
});

// '/special-route' 전용 에러 핸들러
app.use("/special-route", (err, req, res, next) => {
  if (err.status === 400) {
    res.status(400).send(`Special error handler: ${err.message}`);
  } else {
    next(err); // 처리 못 하면 전역 핸들러로 전달
  }
});

// 전역 에러 핸들러 — 나머지 모든 오류
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send("An unexpected error occurred");
});
```

<details style="margin:10px 0 4px">
<summary style="cursor:pointer;font-weight:700;color:#C8443C">실행 결과 보기</summary>
<pre><code># GET /special-route 요청 시
# HTTP 400
Special error handler: Error in special-route

# GET /another-route 요청 시
# HTTP 200
This is another route, errors here are not handled by the special handler.</code></pre>
</details>

- `/another-route`에서 에러가 발생해도 `/special-route` 전용 핸들러는 개입하지 않습니다.

- 경로 스코프 에러 핸들러도 처리 못 한 오류는 `next(err)`로 전역 핸들러에 위임합니다.

---

## 📄 6. 404 페이지 처리

### catch-all 미들웨어

정의된 어떤 라우트에도 매칭되지 않는 요청은 그 다음에 오는 `app.use()`로 떨어집니다. 이를 이용해 **catch-all 404 핸들러**를 만듭니다.

```js
app.get("/", (req, res) => {
  res.send("[GET /] Homepage");
});

app.get("/users", (req, res) => {
  res.send("[GET /users] Userpage");
});

// 위 라우트에 매칭되지 않으면 여기로
app.use((req, res, next) => {
  res.status(404).render("404", { url: req.url });
});
```

- `res.status(404)`로 HTTP 상태 코드를 404로 지정하고, `.render("404", { url: req.url })`로 EJS 템플릿을 렌더링합니다.

- `req.url`을 템플릿에 넘겨 사용자가 어떤 주소에 접근했는지 보여줄 수 있습니다.

### 404.ejs 템플릿

```html
<!DOCTYPE html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <title>페이지를 찾을 수 없습니다</title>
  </head>
  <body>
    <h1>404: 페이지를 찾을 수 없습니다</h1>
    <p>죄송합니다만, 찾으려는 페이지가 존재하지 않습니다.</p>
    <p>다음과 같은 이유로 페이지를 찾을 수 없습니다:</p>
    <ul>
      <li>주소를 잘못 입력했습니다</li>
      <li>링크가 오래되었거나 사용할 수 없습니다</li>
    </ul>
    <p>접근하려고 시도한 주소: <strong><%= url %></strong></p>
    <p><a href="/">홈페이지로 돌아가기</a></p>
  </body>
</html>
```

- `<%= url %>`에 `req.url` 값이 바인딩되어 잘못 입력한 주소를 사용자에게 그대로 보여줍니다.

- EJS 뷰 엔진 설정은 `app.set("view engine", "ejs")`와 `app.set("views", path.join(__dirname, "views"))`가 필요합니다. (EJS 설정 자세한 내용은 [4편 참조](https://saver7942.blogspot.com/2026/07/ejs-46-ssrcsr.html))

<details style="margin:10px 0 4px">
<summary style="cursor:pointer;font-weight:700;color:#C8443C">실행 결과 보기</summary>
<pre><code># GET /nonexistent 요청 시
# HTTP 404
# 브라우저 렌더링:
# 404: 페이지를 찾을 수 없습니다
# 접근하려고 시도한 주소: /nonexistent</code></pre>
</details>

### 404와 500의 배치 순서

```js
app.get("/", ...);           // 라우트들
app.get("/users", ...);

app.use((req, res, next) => {   // ← 404 catch-all (일반 미들웨어)
  res.status(404).render("404", { url: req.url });
});

app.use((err, req, res, next) => {  // ← 500 에러 핸들러 (에러 미들웨어)
  console.error(err.stack);
  res.status(500).send("Internal Server Error");
});
```

404는 일반 미들웨어(`req, res, next` 3인자)이고, 500 에러 핸들러는 에러 미들웨어(`err, req, res, next` 4인자)입니다. 둘 다 모든 라우트 뒤에 배치하되, 404가 먼저 옵니다.

---

## ⚠️ 7. 주의사항

- **4인자 생략 금지**: 에러 미들웨어에서 `next`를 사용하지 않더라도 `(err, req, res, next)` 4개를 모두 선언해야 합니다. 3개로 줄이면 Express가 일반 미들웨어로 취급하여 오류가 전달되지 않습니다.

- **콜백/async 비동기는 자동 포착 안 됨**: `setTimeout`, `setInterval`, `fs.readFile` 콜백 안의 오류와 Express 4의 `async` 라우트 오류는 `next(err)` 없이는 에러 핸들러에 도달하지 않습니다.

- **next(err) 후 코드 실행 주의**: `next(err)`를 호출한 뒤에도 현재 함수의 나머지 코드는 계속 실행됩니다. `next(err)` 뒤에는 `return`을 붙이거나 else 분기를 활용해 의도하지 않은 코드 실행을 막습니다.

- **404 핸들러 위치**: 404 catch-all은 모든 라우트 **뒤**에 두어야 합니다. 앞에 두면 정상 라우트에도 404가 반환됩니다.

- **에러 핸들러에서 응답하지 않고 next(err)만 호출하면 무한 체인**: 마지막 에러 핸들러는 반드시 응답을 보내야 합니다. `next(err)`만 호출하면 처리할 핸들러가 없어 Express의 기본 에러 응답이 출력됩니다.

---

## ✅ 8. 핵심 정리

- **에러 미들웨어 시그니처**: `(err, req, res, next)` — 인자 4개, 반드시 정확히 4개.

- **배치 순서**: 라우트 → 404 catch-all(일반 미들웨어) → 500 에러 핸들러(에러 미들웨어) 순서로 등록.

- **5가지 오류 전달 경로**:
  1. 동기 코드 `throw` → Express 자동 포착
  2. `next(err)` 명시적 호출
  3. 콜백 비동기: `try/catch` + `next(err)`
  4. async/await: `try/catch` + `next(err)`
  5. 조건부 분기: `next()` vs `next(err)`

- **에러 체인**: 에러 핸들러가 처리 못 하는 오류는 `next(err)`로 다음 에러 핸들러에 위임. 마지막 핸들러는 반드시 응답 전송.

- **유형별 분기**: `err.type`, `err.status` 등 커스텀 프로퍼티로 오류를 분류하고, 에러 핸들러 내부에서 if/else로 처리.

- **경로 스코프**: `app.use("/경로", (err, req, res, next) => ...)` 형태로 특정 경로 전용 에러 핸들러 등록 가능.

- **404 처리**: 모든 라우트 뒤 `app.use((req, res, next) => res.status(404).render("404", { url: req.url }))`로 구현. EJS 템플릿에서 `<%= url %>`로 잘못된 경로를 표시.
