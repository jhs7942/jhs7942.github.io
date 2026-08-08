---
title: Express 내부 구현하기 (3/6) — 미들웨어 체인과 next()
slug: myexpress-3-middleware-chain-next
description: >-
  Express의 `app.use(fn)`이 내부적으로 어떻게 동작하는지 미들웨어 체인을 직접 구현하며 알아봅니다.
  `(req,res,next)` 함수 배열과 `runMiddlewares` 재귀 구조, `req` 객체를 통한 데이터 전달, 응답 미들웨어가
  `next()`를 호출하지 않는 이유까지 다룹니다. 시리즈 3편.
published_at: '2026-07-16T17:43:20-07:00'
labels:
  - AI 작성
  - 학습 정리
  - Node.js
  - Express
source: >-
  C:/Users/jhs02/AppData/Local/Temp/claude/C--Users-jhs02-Desktop-blog/fe27660a-d234-405a-bb90-f7629ae1dff8/scratchpad/myexpress/section1/06/index.js
series: myexpress
part: 3
legacy_url: 'https://saver7942.blogspot.com/2026/07/express-36-next.html'
draft: false
---

`app.use(logger)`, `app.use(auth)`, `app.use(handler)` — Express로 서버를 작성하다 보면 `app.use`를 여러 번 호출하게 됩니다. 각 함수는 어떤 순서로, 어떻게 연결되어 실행될까요? 이번 편에서는 미들웨어 체인의 내부 구조를 순수 Node.js로 직접 구현하며 그 원리를 살펴봅니다.

## 📦 1. 미들웨어란 무엇인가

Express의 **미들웨어(middleware)**는 `(req, res, next)` 세 개의 매개변수를 받는 함수입니다. 미들웨어들은 배열 형태로 등록되어, 요청이 들어오면 등록된 순서대로 순차 실행됩니다.

| 매개변수 | 역할 |
| :---: | :---: |
| `req` | 클라이언트의 HTTP 요청 객체. 미들웨어 간 데이터 공유 통로로도 활용됩니다. |
| `res` | 서버의 HTTP 응답 객체. `res.writeHead`, `res.end` 등으로 응답을 생성합니다. |
| `next` | 다음 미들웨어를 호출하는 함수. 호출하지 않으면 체인이 그 자리에서 멈춥니다. |

실제 Express에서 `app.use(fn)`을 호출하면 `fn`이 이 배열에 추가됩니다. 요청이 들어올 때마다 배열을 처음부터 순회하며 각 함수를 실행하는 것이 미들웨어 체인의 전부입니다.

## 🏗️ 2. 미들웨어 배열 구성하기

세 개의 미들웨어를 배열로 정의합니다. 각 함수는 자신의 역할을 마친 뒤 `next()`를 호출해 다음 함수로 흐름을 넘깁니다.

```js
const middlewares = [
  // 미들웨어 1: 요청 수신 로그 및 로그 배열 초기화
  (req, res, next) => {
    console.log("[Middleware 1] 요청 수신");
    req.processLog = ["Request received"]; // 요청 처리 로그 배열 초기화
    next(); // 다음 미들웨어로 이동
  },

  // 미들웨어 2: 사용자 인증 처리 (모의)
  (req, res, next) => {
    console.log("[Middleware 2] 사용자 인증 로직");
    req.user = { id: 123, name: "Alice" }; // 사용자 정보 삽입
    req.processLog.push("User authenticated"); // 처리 로그에 인증 완료 기록
    next(); // 다음 미들웨어로 이동
  },

  // 미들웨어 3: 응답 전송
  (req, res, next) => {
    console.log("[Middleware 3] 응답 준비");
    res.writeHead(200, { "Content-Type": "application/json" });

    const responseBody = {
      message: "Hello from Enhanced Middleware Chain!",
      user: req.user,      // 미들웨어 2에서 삽입한 사용자 정보
      log: req.processLog, // 전체 미들웨어 처리 로그
    };

    res.end(JSON.stringify(responseBody, null, 2));
    // next() 호출 없음 → 응답을 종료하기 때문에 다음 단계로 이동하지 않음
  },
];
```

- 미들웨어 1, 2는 처리 후 `next()`를 호출해 체인을 이어갑니다.

- 미들웨어 3은 `res.end()`로 응답을 전송하고 `next()`를 호출하지 않습니다. 이유는 5절에서 설명합니다.

## 🔍 3. runMiddlewares — next()의 재귀 구조

미들웨어 배열을 순차 실행하는 `runMiddlewares` 함수를 구현합니다. 핵심은 `next` 함수 자체가 재귀적으로 동작한다는 점입니다.

```js
function runMiddlewares(req, res, middlewares) {
  let idx = 0; // 현재 실행할 미들웨어 인덱스

  // next는 재귀적으로 호출되어 미들웨어를 순차 실행
  function next() {
    if (idx < middlewares.length) {
      const currentMiddleware = middlewares[idx++]; // 현재 미들웨어를 꺼내고 idx 증가
      currentMiddleware(req, res, next); // 미들웨어 실행 — next를 인자로 전달
    } else {
      // 모든 미들웨어 처리가 완료되었을 때
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

실행 흐름을 단계별로 정리하면 다음과 같습니다.

1. `runMiddlewares` 호출 → 내부 `next()` 최초 실행.

2. `idx=0` → `middlewares[0]`(로그 미들웨어) 실행, `idx`는 1로 증가.

3. 미들웨어 1 내부에서 `next()` 호출 → `idx=1` → `middlewares[1]`(인증 미들웨어) 실행.

4. 미들웨어 2 내부에서 `next()` 호출 → `idx=2` → `middlewares[2]`(응답 미들웨어) 실행.

5. 미들웨어 3은 `next()`를 호출하지 않음 → 체인 종료, `res.end()`로 응답 전송.

`next`는 `runMiddlewares` 내부에 정의된 함수이므로 **클로저(closure)**로 `idx`를 공유합니다. 미들웨어가 `next`를 인자로 받아 호출하면, 그 `next`가 `idx`를 올려 다음 미들웨어를 꺼내 실행하는 구조입니다.

<details>
<summary>실행 결과 보기</summary>
<pre><code>$ node index.js
Server running at http://localhost:3000

$ curl http://localhost:3000/
# 서버 콘솔
[Request] Method: GET, URL: /
[Middleware 1] 요청 수신
[Middleware 2] 사용자 인증 로직
[Middleware 3] 응답 준비

# HTTP 응답
{
  "message": "Hello from Enhanced Middleware Chain!",
  "user": {
    "id": 123,
    "name": "Alice"
  },
  "log": [
    "Request received",
    "User authenticated"
  ]
}</code></pre>
</details>

## 🛠️ 4. req 객체로 데이터 전달하기

미들웨어들은 `req` 객체를 공유합니다. 앞선 미들웨어가 `req`에 속성을 추가하면, 이후 미들웨어에서 그 값을 읽을 수 있습니다.

```js
// 미들웨어 1: 로그 배열 초기화
req.processLog = ["Request received"];

// 미들웨어 2: 사용자 정보 추가 및 로그 기록
req.user = { id: 123, name: "Alice" };
req.processLog.push("User authenticated");

// 미들웨어 3: 앞선 두 미들웨어가 추가한 값을 응답에 포함
const responseBody = {
  user: req.user,
  log: req.processLog,
};
```

이 패턴은 실제 Express에서도 동일하게 사용됩니다.

| 미들웨어 역할 | req에 추가하는 값 |
| :---: | :---: |
| JWT 인증 미들웨어 | `req.user` — 토큰에서 추출한 사용자 정보 |
| 요청 로거 | `req.startTime` — 요청 시작 시각 |
| 멀티파트 파서 | `req.file`, `req.files` — 업로드된 파일 |

> **참고**: `req` 객체는 각 HTTP 요청마다 새로 생성됩니다. 한 요청의 `req.user`가 다른 요청에 영향을 주지 않습니다.

## ⚠️ 5. 응답을 보내는 미들웨어는 next()를 호출하지 않는다

미들웨어 3은 `res.end()`로 응답을 전송한 뒤 `next()`를 호출하지 않습니다. `res.end()` 이후 체인이 멈추므로, 뒤에 미들웨어가 더 있더라도 실행되지 않습니다.

규칙을 정리하면 다음과 같습니다.

- **응답을 전송(`res.end`, `res.json` 등)한 미들웨어**는 `next()`를 호출하지 않습니다.

- **응답 없이 처리만 하는 미들웨어**(로깅, 인증, 파싱 등)는 반드시 `next()`를 호출해야 다음 단계로 넘어갑니다.

## ✅ 6. 핵심 정리

- **미들웨어 = `(req, res, next)` 함수의 배열** — `app.use(fn)` 호출 시 이 배열에 함수가 추가됩니다.

- **`next()`의 정체** — `runMiddlewares` 내부에서 인덱스를 클로저로 공유하며, 재귀 호출로 다음 미들웨어를 실행합니다.

- **`req`는 미들웨어 간 데이터 버스** — 앞선 미들웨어가 `req.user`처럼 속성을 추가하면 이후 미들웨어에서 참조할 수 있습니다.

- **응답 후 `next()` 불필요** — `res.end()`로 응답을 전송한 미들웨어는 `next()`를 호출하지 않습니다. 체인이 그 자리에서 종료됩니다.

4편에서는 에러 처리 미들웨어(`(err, req, res, next)` 4-인자 패턴)와 정적 파일 서빙을 직접 구현합니다.
