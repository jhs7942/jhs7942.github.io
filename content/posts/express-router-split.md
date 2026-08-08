---
title: 라우터 분리로 코드 구조화 (6/6) — express.Router()와 백화점 비유
slug: express-router-split
description: >-
  라우트가 늘어나며 비대해지는 `app.js`를 기능별 파일로 나누는 방법을 정리합니다. `express.Router()`로 "미니 앱"을
  만들어 라우트를 분리하고, `app.use("/경로", 라우터)`로 마운트하는 기본 구조부터, 백화점의 부서(의류·전자·식품)처럼 여러
  라우터로 확장하고 라우터 단위 미들웨어를 붙이는 방법까지 다룹니다. Node.js/Express 시리즈 마지막 6편입니다.
published_at: '2026-07-05T04:18:56-07:00'
labels:
  - AI 작성
  - 학습 정리
  - Express
source: >-
  Node.js/Express 강의 실습 코드 (28 router-split-basic, 29 advanced,
  department-store)
series: express
part: 6
legacy_url: 'https://saver7942.blogspot.com/2026/07/66-expressrouter.html'
draft: false
---

라우트가 몇 개일 때는 `app.js` 한 파일로 충분합니다. 하지만 사용자·상품·주문… 기능이 늘어나면 한 파일이 수백 줄로 불어나고, 어디에 무엇이 있는지 찾기 어려워집니다. 이번 마지막 편은 라우트를 **기능별 파일로 나누는** `express.Router()`를 다룹니다.

## 🧭 1. 왜 라우터를 나누는가

모든 라우트를 `app.js`에 몰아넣으면 파일이 길어지고, 관련 기능이 여기저기 흩어집니다. `express.Router()`는 관련 라우트를 **한 파일로 묶어** `app.js`에서 분리하게 해 줍니다.

- 기능 단위로 파일이 나뉘어 찾기 쉽습니다.

- `app.js`는 "어떤 경로를 어느 라우터에 맡길지"만 남아 간결해집니다.

- 라우터별로 공통 미들웨어를 따로 붙일 수 있습니다.

## 🧩 2. express.Router() 기본 — 분리와 마운트

`express.Router()`는 라우트와 미들웨어를 담을 수 있는 **미니 Express 앱**입니다. 별도 파일에서 라우트를 정의하고 `module.exports`로 내보냅니다.

```js
// routes/users.js
const express = require("express");
const router = express.Router(); // 미니 앱

// [GET] /users
router.get("/", (req, res) => {
  res.send("User list");
});

// [POST] /users
router.post("/", (req, res) => {
  res.send("Create a user");
});

// [GET] /users/:userId
router.get("/:userId", (req, res) => {
  res.send(`Get user with ID ${req.params.userId}`);
});

module.exports = router; // 외부에서 쓸 수 있게 내보내기
```

`app.js`에서는 이 라우터를 불러와 특정 경로에 **마운트**합니다.

```js
// app.js
const express = require("express");
const app = express();

const usersRouter = require("./routes/users");

// "/users"로 시작하는 요청을 usersRouter에게 위임
app.use("/users", usersRouter);

app.get("/", (req, res) => {
  res.send("Hello");
});

app.listen(3000, () => {
  console.log("Listening on port 3000");
});
```

- **마운트 경로가 접두어가 됩니다.** `app.use("/users", usersRouter)`로 연결하면, 라우터 안의 `router.get("/")`는 실제로 `/users`를, `router.get("/:userId")`는 `/users/123`을 처리합니다.

- 라우터 파일 안에서는 `/users`를 반복해 쓸 필요 없이 **상대 경로**만 적습니다.

<details>
<summary>실행 결과 보기</summary>
<pre><code>$ curl http://localhost:3000/users
User list
$ curl http://localhost:3000/users/123
Get user with ID 123</code></pre>
</details>

## 🏢 3. 부서별 라우터 — 백화점 구조로 확장

라우터가 하나일 때의 구조를 그대로 여러 개로 늘리면, 백화점의 **부서**처럼 기능별 라우터를 둘 수 있습니다. `app.js`는 요청을 알맞은 부서로 나눠 주는 **안내 데스크** 역할만 합니다.

```js
// app.js — 안내 데스크
const express = require("express");
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 부서별 라우터 불러오기
const indexRouter = require("./routes/index");         // 홈
const clothingRouter = require("./routes/clothing");   // 의류
const electronicsRouter = require("./routes/electronics"); // 전자제품
const foodRouter = require("./routes/food");           // 식품

// 경로별로 담당 부서에 위임
app.use("/", indexRouter);
app.use("/clothing", clothingRouter);
app.use("/electronics", electronicsRouter);
app.use("/food", foodRouter);

app.listen(3000, () => {
  console.log("Department store app listening at http://localhost:3000");
});
```

각 부서 라우터는 자기 경로에 대한 CRUD(GET·POST·PUT·DELETE)를 담당합니다.

```js
// routes/clothing.js — 의류 부서
const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.send("의류 부서: 옷 목록");
});
router.post("/add", (req, res) => {
  res.send("의류 부서: 새 옷 추가");
});
router.put("/update/:id", (req, res) => {
  res.send(`의류 부서: ID ${req.params.id}의 옷 정보 수정`);
});
router.delete("/delete/:id", (req, res) => {
  res.send(`의류 부서: ID ${req.params.id}의 옷 삭제`);
});

module.exports = router;
```

| 요청 | 담당 | 실제 경로 |
| :---: | :---: | :---: |
| `GET /clothing` | 의류 라우터 `get("/")` | 옷 목록 |
| `POST /clothing/add` | 의류 라우터 `post("/add")` | 옷 추가 |
| `PUT /clothing/update/:id` | 의류 라우터 `put("/update/:id")` | 옷 수정 |
| `DELETE /food/delete/:id` | 식품 라우터 `delete("/delete/:id")` | 식품 삭제 |

## 🔁 4. 라우터 단위 미들웨어 — router.use

라우터도 미니 앱이므로 `router.use()`로 **그 라우터에만** 적용되는 미들웨어를 붙일 수 있습니다. 부서에 들어오는 모든 요청 앞에서 공통 처리를 하는 셈입니다.

```js
// routes/food.js
const router = express.Router();

// 이 라우터로 오는 모든 요청 전에 실행
router.use((req, res, next) => {
  console.log("식품 부서 라우터입니다...");
  next(); // 다음 핸들러로 넘김
});

router.get("/", (req, res) => {
  res.send("식품 부서: 식품 목록");
});
```

- `router.use`의 미들웨어는 해당 라우터로 위임된 요청에만 실행됩니다. 다른 부서 요청에는 영향을 주지 않습니다.

- 인증 확인, 로깅처럼 "이 기능 영역 전체에 공통인 처리"를 모아 두기 좋습니다.

<details>
<summary>실행 결과 보기</summary>
<pre><code>$ curl http://localhost:3000/food
# 응답
식품 부서: 식품 목록
# 서버 콘솔 (router.use 미들웨어가 먼저 실행)
식품 부서 라우터입니다...</code></pre>
</details>

## ⚠️ 5. 주의사항

- **라우터 안의 경로는 마운트 경로를 뺀 나머지입니다.** `app.use("/clothing", clothingRouter)`라면 라우터에서는 `/`, `/add`처럼 접두어를 뺀 상대 경로를 적습니다. 여기에 `/clothing`을 또 붙이면 `/clothing/clothing`이 됩니다.

- **`module.exports = router`를 빠뜨리면 불러올 때 `undefined`가 됩니다.** 라우터 파일 끝에서 반드시 내보냅니다.

- **`router.use`는 등록 순서대로 실행됩니다.** 공통 미들웨어는 라우트 정의보다 위에 두어야 먼저 실행됩니다.

- **마운트 순서와 경로 겹침에 주의합니다.** `app.use("/", indexRouter)`처럼 넓은 경로를 먼저 두면 이후 라우터와 겹칠 수 있으므로, 구체적인 경로를 함께 고려해 배치합니다.

## ✅ 6. 핵심 정리

- **`express.Router()`는 미니 앱** — 라우트와 미들웨어를 담아 별도 파일로 분리하고, `module.exports = router`로 내보냅니다.

- **마운트로 접두어 지정** — `app.use("/users", usersRouter)`로 연결하면 마운트 경로가 접두어가 되고, 라우터 안에서는 상대 경로만 적습니다.

- **부서별 확장** — 기능마다 라우터 파일을 두고 `app.js`는 경로별 위임만 담당하면, 규모가 커져도 구조가 무너지지 않습니다.

- **라우터 단위 미들웨어** — `router.use`로 특정 기능 영역에만 공통 처리(로깅·인증 등)를 붙일 수 있습니다.

이것으로 순수 http부터 시작한 Node.js/Express 6부작을 마칩니다. 요청을 받고(①②③), 화면을 그리고(④), 응답을 돌려주고(⑤), 코드를 구조화하는(⑥) 흐름을 한 바퀴 돌았습니다.
