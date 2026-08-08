---
title: 'Express 내부 구현하기 (2/6) — 라우트를 자료구조로: 배열과 핸들러 맵'
slug: myexpress-2-route-table-handler-map
description: >-
  1편에서 만든 if-else 라우팅은 라우트가 늘어날수록 콜백이 비대해집니다. 이 글에서는 라우트를 배열(`routes`)에 등록하고
  `Array.find`로 탐색하는 방법과, 메서드→URL 중첩 객체(`handlers`)로 O(1) 조회하는 핸들러 맵 방식을 차례로
  구현합니다. 두 방식의 트레이드오프를 비교하고, Express `app.get()` 등록 인터페이스의 원형이 어떤 구조인지 확인합니다.
  시리즈 2편입니다.
published_at: '2026-07-16T17:43:17-07:00'
labels:
  - AI 작성
  - 학습 정리
  - Node.js
  - Express
source: >-
  C:/Users/jhs02/AppData/Local/Temp/claude/C--Users-jhs02-Desktop-blog/fe27660a-d234-405a-bb90-f7629ae1dff8/scratchpad/myexpress/section1/04/index.js
series: myexpress
part: 2
legacy_url: 'https://saver7942.blogspot.com/2026/07/express-26.html'
draft: false
---

1편에서 확인한 if-else 라우팅의 핵심 문제는 **등록과 탐색이 한 덩어리**라는 점입니다. 라우트가 늘어날수록 `createServer` 콜백만 비대해지고, 라우팅 로직을 재사용하거나 분리하기 어렵습니다. 이 문제를 해결하는 열쇠는 라우팅 정보를 **자료구조**로 표현하는 것입니다. 등록과 탐색을 분리하면 `app.get("/", handler)` 스타일 인터페이스의 출발점이 됩니다.

<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:0 0 6px"><a style="text-decoration:none;font-size:13.5px;font-weight:500;padding:8px 14px;border-radius:11px 12px 10px 12px;border:1.5px solid #C8443C;background:#FBFBF7;color:#243130" href="https://saver7942.blogspot.com/2026/07/express-16-http.html">① 순수 http</a><span style="color:#93A97F">›</span><span style="font-size:13.5px;font-weight:500;padding:8px 14px;border-radius:11px 12px 10px 12px;border:1.5px solid #C8443C;background:#C8443C;color:#FBFBF7">② 라우트 테이블 · 현재</span><span style="color:#93A97F">›</span><a style="text-decoration:none;font-size:13.5px;font-weight:500;padding:8px 14px;border-radius:11px 12px 10px 12px;border:1.5px solid #C8443C;background:#FBFBF7;color:#243130" href="https://saver7942.blogspot.com/2026/07/express-36-next.html">③ 미들웨어 체인</a><span style="color:#93A97F">›</span><a style="text-decoration:none;font-size:13.5px;font-weight:500;padding:8px 14px;border-radius:11px 12px 10px 12px;border:1.5px solid #C8443C;background:#FBFBF7;color:#243130" href="https://saver7942.blogspot.com/2026/07/express-46.html">④ 에러·정적</a><span style="color:#93A97F">›</span><a style="text-decoration:none;font-size:13.5px;font-weight:500;padding:8px 14px;border-radius:11px 12px 10px 12px;border:1.5px solid #C8443C;background:#FBFBF7;color:#243130" href="https://saver7942.blogspot.com/2026/07/express-56-json.html">⑤ 파라미터·파서</a><span style="color:#93A97F">›</span><a style="text-decoration:none;font-size:13.5px;font-weight:500;padding:8px 14px;border-radius:11px 12px 10px 12px;border:1.5px solid #C8443C;background:#FBFBF7;color:#243130" href="https://saver7942.blogspot.com/2026/07/express-66-createrouter.html">⑥ 라우터 모듈화</a></div>

#### 목차

1. [라우트 배열 등록과 find 탐색](#1-find)
2. [중첩 객체 핸들러 맵과 안전 접근](#2)
3. [두 방식 트레이드오프 비교](#3)
4. [주의사항](#4)
5. [핵심 정리](#5)

---

## 🏗️ 1. 라우트 배열 등록과 find 탐색

### 핸들러 함수를 별도로 분리한다

1편에서는 응답 로직이 `createServer` 콜백 내부에 인라인으로 작성되었습니다. 첫 번째 개선은 각 경로를 처리하는 로직을 **독립된 핸들러 함수**로 분리하는 것입니다.

```js
const http = require("http");

// 개별 요청 처리 핸들러 정의
const getHome = (req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("This is the Home Page");
};

const getAbout = (req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("This is the About Page");
};

const getContact = (req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("This is the Contact Page");
};
```

- 핸들러를 함수로 분리하면 라우팅 로직과 응답 로직이 명확하게 분리됩니다.

- Express에서 `const homeHandler = (req, res) => { ... }` 뒤에 `app.get("/", homeHandler)`로 등록하는 패턴과 같은 방향입니다.

### routes 배열에 등록하고 find로 탐색한다

```js
// 라우트 목록 정의 – 요청 메서드와 URL, 핸들러를 객체로 구성
const routes = [
  { method: "GET", url: "/", handler: getHome },
  { method: "GET", url: "/about", handler: getAbout },
  { method: "GET", url: "/contact", handler: getContact },
];

// 서버 생성 – 요청이 들어오면 라우팅 로직 실행
const server = http.createServer((req, res) => {
  const { url, method } = req;

  // 요청 메서드와 URL이 모두 일치하는 라우트를 찾아 처리
  const route = routes.find((r) => r.method === method && r.url === url);

  if (route) {
    route.handler(req, res); // 핸들러 함수 실행
  } else {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Page Not Found"); // 일치하는 경로가 없을 때 404 응답
  }
});

server.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});
```

<details style="margin:10px 0 4px">
<summary style="cursor:pointer;font-weight:700;color:#C8443C">실행 결과 보기</summary>
<pre><code>$ curl http://localhost:3000/
This is the Home Page

$ curl http://localhost:3000/about
This is the About Page

$ curl http://localhost:3000/unknown
Page Not Found</code></pre>
</details>

- `routes` 배열의 각 요소는 `{ method, url, handler }` 세 필드를 가진 객체입니다. 새 경로를 등록할 때는 이 배열에 객체를 추가하면 됩니다. 이것이 `app.get("/path", handler)` 등록의 원형입니다.

- `Array.find`는 조건을 만족하는 첫 번째 요소를 반환합니다. `method`와 `url` 두 조건을 동시에 검사하므로, 같은 URL이라도 `GET /contact`와 `POST /contact`를 독립적으로 처리할 수 있습니다.

- 일치하는 라우트가 없으면 `find`는 `undefined`를 반환하고, `else` 블록에서 404를 반환합니다.

---

## 🛠️ 2. 중첩 객체 핸들러 맵과 안전 접근

배열 방식은 매 요청마다 배열을 처음부터 순서대로 탐색합니다(O(n)). 두 번째 방법은 `{ [method]: { [url]: handler } }` 구조의 **중첩 객체**를 사용해 두 번의 키 조회로 핸들러에 도달합니다(O(1)).

```js
// 요청 경로별 핸들러 함수 정의
// 각각의 핸들러는 특정 URL과 메서드(GET, POST 등)에 응답하기 위한 함수입니다.

const getHomeHandler = (req, res) => {
  // 홈 페이지 응답
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("This is the Home Page");
};

const getAboutHandler = (req, res) => {
  // 어바웃 페이지 응답
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("This is the About Page");
};

const getContactHandler = (req, res) => {
  // 연락처 페이지 응답
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("This is the Contact Page");
};

const postSubmitHandler = (req, res) => {
  // 폼 제출에 대한 POST 응답
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Form Submitted Successfully");
};

// 메서드(GET, POST 등)와 URL 경로를 기준으로 핸들러를 분류한 구조
// 각 HTTP 메서드(GET, POST 등)는 또다시 URL별로 세부 라우트를 정의합니다.
// 이를 통해 if-else 없이 깔끔한 라우팅이 가능합니다.
const handlers = {
  GET: {
    "/": getHomeHandler,
    "/about": getAboutHandler,
    "/contact": getContactHandler,
  },
  POST: {
    "/submit": postSubmitHandler,
  },
};
```

```js
// HTTP 서버 생성 – 요청이 들어오면 콜백 함수 실행
const server = http.createServer((req, res) => {
  const { method, url } = req; // 요청의 메서드(GET, POST)와 URL 추출

  // 요청 정보를 로그로 출력하여 흐름을 추적
  console.log(`[Request] Method: ${method}, URL: ${url}`);

  // 요청된 메서드에 해당하는 핸들러 객체 조회 (예: handlers["GET"])
  const methodHandlers = handlers[method];

  // 요청된 URL에 해당하는 실제 핸들러 함수 조회
  // methodHandlers가 존재할 경우에만 접근 (안전한 조건부 접근 방식)
  const handler = methodHandlers && methodHandlers[url];

  if (handler) {
    // 해당 핸들러가 존재하면 실행하여 요청 처리
    handler(req, res);
  } else {
    // 없을 경우 404 상태 코드로 응답
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Page Not Found");
  }
});

// 포트 3000번에서 서버 실행 시작
server.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});
```

<details style="margin:10px 0 4px">
<summary style="cursor:pointer;font-weight:700;color:#C8443C">실행 결과 보기</summary>
<pre><code>$ curl http://localhost:3000/
# 콘솔: [Request] Method: GET, URL: /
This is the Home Page

$ curl -X POST http://localhost:3000/submit
# 콘솔: [Request] Method: POST, URL: /submit
Form Submitted Successfully

$ curl -X DELETE http://localhost:3000/submit
# 콘솔: [Request] Method: DELETE, URL: /submit
Page Not Found</code></pre>
</details>

### 핵심 포인트 — 안전한 조건부 접근

```js
const handler = methodHandlers && methodHandlers[url];
```

- `handlers["DELETE"]`처럼 정의되지 않은 메서드를 조회하면 `undefined`를 반환합니다.

- `undefined["/submit"]`은 `TypeError: Cannot read properties of undefined`를 발생시킵니다. `&&` 단락 평가를 사용하면 `methodHandlers`가 `undefined`(falsy)일 때 `methodHandlers[url]`을 아예 평가하지 않아 런타임 오류를 방지합니다.

- 현대 JavaScript에서는 **옵셔널 체이닝**(`handlers[method]?.[url]`)으로 동일하게 처리할 수 있습니다.

---

## 📊 3. 두 방식 트레이드오프 비교

| 항목 | 배열 (`routes.find`) | 핸들러 맵 (`handlers`) |
| :---: | :---: | :---: |
| 탐색 방식 | 순차 탐색 O(n) | 객체 키 조회 O(1) |
| 등록 순서 | 중요 (먼저 일치한 항목 우선) | 무관 |
| 동적 경로 | 확장 가능 (`/users/:id` 패턴 적용 여지) | 정확 일치만 가능 |
| 다중 메서드 처리 | 배열 요소 추가 | 중첩 객체에 key 추가 |
| Express 유사성 | `app.get()` 등록과 직접 대응 | 구조 참조용 |
| 가독성 | 등록 순서대로 파악 | 메서드별 그룹 한눈에 파악 |

두 방식 모두 **정확 일치** 기반이라는 공통점이 있습니다. `/users/123`처럼 값이 변하는 **동적 경로**를 처리하려면 추가 파싱 로직이 필요합니다. Express는 내부적으로 `path-to-regexp` 패턴으로 이 문제를 해결합니다.

> **참고**: 실제 Express 소스(`router/route.js`, `router/index.js`)는 배열 방식을 기반으로 하고, 여기에 정규식 패턴 매칭·매개변수 파싱·미들웨어 체인을 추가한 구조입니다.

---

## ⚠️ 4. 주의사항

- **배열 등록 순서**: `routes.find`는 첫 번째 일치 항목을 반환합니다. 같은 조건을 만족하는 라우트가 여러 개 있으면 먼저 등록된 것이 항상 우선됩니다. 의도치 않은 순서 충돌에 주의합니다.

- **정확 일치만 지원**: 두 방식 모두 `url === "/about"`처럼 완전 일치를 검사합니다. 쿼리 스트링(`/about?lang=ko`)이 포함된 요청은 매칭에 실패합니다. 실제 사용 시 `new URL(req.url, "http://localhost").pathname`으로 경로만 추출해야 합니다.

- **핸들러 맵의 undefined 접근**: `methodHandlers && methodHandlers[url]` 또는 `handlers[method]?.[url]`을 반드시 사용합니다. `handlers[method][url]`을 바로 쓰면 등록되지 않은 메서드 요청 시 `TypeError`가 발생합니다.

---

## ✅ 5. 핵심 정리

- **핸들러 분리** — 응답 로직을 독립 함수로 추출하면 라우팅 테이블과 응답 로직이 명확하게 분리됩니다. Express `app.get("/", handler)` 패턴의 기원입니다.

- **routes 배열 + find** — `{ method, url, handler }` 객체를 배열에 등록하고 `Array.find`로 탐색합니다. 순서가 중요하고 O(n)이지만, 동적 경로 패턴으로 확장할 여지가 있습니다.

- **handlers 중첩 객체** — `{ GET: { "/": fn }, POST: { "/submit": fn } }` 구조로 두 번의 키 조회(O(1))로 핸들러에 도달합니다. 메서드별 그룹이 명확하지만 동적 경로를 지원하지 않습니다.

- **안전한 접근** — 정의되지 않은 HTTP 메서드 접근 시 `TypeError`를 방지하려면 `&&` 단락 평가 또는 옵셔널 체이닝(`?.`)을 사용합니다.

- **쿼리 스트링 주의** — 두 방식 모두 `req.url` 전체를 문자열 비교하므로, 쿼리 스트링이 포함된 요청은 매칭에 실패합니다. 실제 사용 시 pathname만 추출해야 합니다.

3편에서는 `next()`를 매개로 핸들러를 체인으로 연결하는 미들웨어 구조를 직접 구현합니다.

<div style="display:flex;gap:12px;flex-wrap:wrap;margin:6px 0 0;justify-content:space-between"><a style="display:inline-flex;align-items:center;gap:10px;text-decoration:none;padding:12px 18px;border-radius:12px 13px 11px 13px;border:1.5px solid #C8443C;background:#FBFBF7;color:#243130;font-size:14px;font-weight:500;box-shadow:0 6px 14px -8px rgba(47,58,57,0.4)" href="https://saver7942.blogspot.com/2026/07/express-16-http.html"><span style="color:#C8443C;font-size:16px">←</span><span><span style="font-size:11.5px;color:#93A97F;display:block">이전 편</span>순수 HTTP 서버 (1편)</span></a><a style="display:inline-flex;align-items:center;gap:10px;text-decoration:none;padding:12px 18px;border-radius:12px 13px 11px 13px;border:1.5px solid #C8443C;background:#FBFBF7;color:#243130;font-size:14px;font-weight:500;box-shadow:0 6px 14px -8px rgba(47,58,57,0.4)" href="https://saver7942.blogspot.com/2026/07/express-36-next.html"><span><span style="font-size:11.5px;color:#93A97F;display:block;text-align:right">다음 편</span>미들웨어 체인 (3편)</span><span style="color:#C8443C;font-size:16px">→</span></a></div>
