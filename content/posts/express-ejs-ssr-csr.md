---
title: 서버 렌더링과 EJS 템플릿 (4/6) — SSR·CSR·뷰 엔진·문법·파셜
slug: express-ejs-ssr-csr
description: >-
  화면을 서버에서 만들지(SSR), 브라우저에서 만들지(CSR)부터 시작해, Express의 템플릿 엔진 EJS로 서버 렌더링을 깔끔하게
  구현하는 과정을 정리합니다. `view engine` 설정과 `res.render`, EJS의 네 가지 문법(`<%= %>`·`<%-
  %>`·`<% %>`·`include`), 그리고 폼 입력을 받아 목록으로 렌더링하는 Todolist 실전 예제까지 다룹니다.
  Node.js/Express 시리즈 4편입니다.
published_at: '2026-07-05T04:18:37-07:00'
labels:
  - AI 작성
  - 학습 정리
  - Express
  - EJS
source: 'Node.js/Express 강의 실습 코드 (SSR/CSR 예제, 25~27 EJS zip 자료)'
series: express
part: 4
legacy_url: 'https://saver7942.blogspot.com/2026/07/ejs-46-ssrcsr.html'
draft: false
---

앞선 3편에서는 요청에서 데이터를 꺼내는 방법까지 다뤘습니다. 그런데 지금까지 응답은 대부분 `res.send("<h1>...</h1>")`처럼 문자열을 직접 이어 붙인 HTML이었습니다. 데이터가 많아지면 이 방식은 금방 지저분해집니다. 이번 편은 **화면을 누가 그리는가(SSR vs CSR)**라는 질문에서 출발해, 서버 렌더링을 도구로 정리해 주는 **템플릿 엔진 EJS**를 다룹니다.

<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:0 0 6px"><a style="text-decoration:none;font-size:13.5px;font-weight:500;padding:8px 14px;border-radius:11px 12px 10px 12px;border:1.5px solid #C8443C;background:#FBFBF7;color:#243130" href="https://saver7942.blogspot.com/2026/07/nodejs-http-13.html">① 순수 http</a><span style="color:#93A97F">›</span><a style="text-decoration:none;font-size:13.5px;font-weight:500;padding:8px 14px;border-radius:11px 12px 10px 12px;border:1.5px solid #C8443C;background:#FBFBF7;color:#243130" href="https://saver7942.blogspot.com/2026/07/express-23-http.html">② Express 기초</a><span style="color:#93A97F">›</span><a style="text-decoration:none;font-size:13.5px;font-weight:500;padding:8px 14px;border-radius:11px 12px 10px 12px;border:1.5px solid #C8443C;background:#FBFBF7;color:#243130" href="https://saver7942.blogspot.com/2026/07/express-33-bodyparamsquery.html">③ 요청 데이터</a><span style="color:#93A97F">›</span><span style="font-size:13.5px;font-weight:500;padding:8px 14px;border-radius:11px 12px 10px 12px;border:1.5px solid #C8443C;background:#C8443C;color:#FBFBF7">④ EJS · 현재</span><span style="color:#93A97F">›</span><a style="text-decoration:none;font-size:13.5px;font-weight:500;padding:8px 14px;border-radius:11px 12px 10px 12px;border:1.5px solid #C8443C;background:#FBFBF7;color:#243130" href="https://saver7942.blogspot.com/2026/07/express-56-sendjsonstatusredirectsendfi.html">⑤ 응답 메서드</a><span style="color:#93A97F">›</span><a style="text-decoration:none;font-size:13.5px;font-weight:500;padding:8px 14px;border-radius:11px 12px 10px 12px;border:1.5px solid #C8443C;background:#FBFBF7;color:#243130" href="https://saver7942.blogspot.com/2026/07/66-expressrouter.html">⑥ 라우터 분리</a></div>

<div style="margin:14px 0 0"><div style="font-size:12px;font-weight:700;letter-spacing:1px;color:#93A97F;margin:0 0 10px">목차</div><div style="display:flex;flex-direction:column;gap:9px"><div style="display:flex;gap:10px;font-size:14.5px"><span style="color:#C8443C;font-weight:700;flex:none;width:16px">1</span><a style="text-decoration:none;color:#243130" href="#1-ssr-csr">SSR과 CSR — 화면을 누가 그리는가</a></div><div style="display:flex;gap:10px;font-size:14.5px"><span style="color:#C8443C;font-weight:700;flex:none;width:16px">2</span><a style="text-decoration:none;color:#243130" href="#2-ejs-view-engine-resrender">EJS 시작하기 — view engine과 res.render</a></div><div style="display:flex;gap:10px;font-size:14.5px"><span style="color:#C8443C;font-weight:700;flex:none;width:16px">3</span><a style="text-decoration:none;color:#243130" href="#3-ejs">EJS 문법 — 변수·조건·반복·파셜</a></div><div style="display:flex;gap:10px;font-size:14.5px"><span style="color:#C8443C;font-weight:700;flex:none;width:16px">4</span><a style="text-decoration:none;color:#243130" href="#4-ejs-todolist">EJS Todolist — 폼에서 목록까지</a></div><div style="display:flex;gap:10px;font-size:14.5px"><span style="color:#C8443C;font-weight:700;flex:none;width:16px">5</span><a style="text-decoration:none;color:#243130" href="#5">주의사항</a></div><div style="display:flex;gap:10px;font-size:14.5px"><span style="color:#C8443C;font-weight:700;flex:none;width:16px">6</span><a style="text-decoration:none;color:#243130" href="#6">핵심 정리</a></div></div></div>

## 🖥️ 1. SSR과 CSR — 화면을 누가 그리는가

같은 "과일 목록" 화면이라도, 완성된 HTML을 **서버가 만들어 보내는지** 아니면 빈 껍데기를 받아 **브라우저가 채우는지**에 따라 방식이 갈립니다.

### SSR — 서버가 완성된 HTML을 만들어 전송

```js
const http = require("http");

const server = http.createServer((req, res) => {
  // 데이터는 서버에서 준비 (실제로는 DB 조회 등)
  const data = [{ title: "Item 1" }, { title: "Item 2" }];

  // 서버가 데이터를 끼워 넣어 HTML 문자열을 완성
  const html = `
    <!DOCTYPE html>
    <html>
      <body>
        <h1>Server-Side Rendered Page</h1>
        ${data.map((item) => `<p>${item.title}</p>`).join("")}
      </body>
    </html>`;

  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(html); // 완성된 HTML을 그대로 전송
});

server.listen(3000);
```

- 브라우저가 받는 순간 이미 데이터가 채워진 HTML입니다.

<details style="margin:10px 0 4px">
<summary style="cursor:pointer;font-weight:700;color:#C8443C">실행 결과 보기</summary>
<pre><code>$ curl http://localhost:3000
# 브라우저가 받는 HTML — 데이터가 이미 들어 있음
&lt;h1&gt;Server-Side Rendered Page&lt;/h1&gt;
&lt;p&gt;Item 1&lt;/p&gt;
&lt;p&gt;Item 2&lt;/p&gt;</code></pre>
</details>

### CSR — 빈 껍데기를 받아 브라우저가 채움

```html
<div id="app">잠시만 기다려주세요...</div>

<script>
  // 실제로는 이 자리에 fetch()로 서버 API를 호출하는 코드가 들어갑니다
  const fakeData = [{ title: "사과" }, { title: "바나나" }, { title: "오렌지" }];

  function renderData(data) {
    const app = document.getElementById("app");
    app.innerHTML = ""; // "잠시만 기다려주세요..." 제거
    data.forEach((item) => {
      const p = document.createElement("p");
      p.textContent = item.title;
      app.appendChild(p);
    });
  }

  setTimeout(() => renderData(fakeData), 1000); // 1초 후 렌더
</script>
```

- 서버가 보낸 최초 HTML에는 데이터가 없습니다. 자바스크립트가 실행되며 화면을 채웁니다.

<details style="margin:10px 0 4px">
<summary style="cursor:pointer;font-weight:700;color:#C8443C">실행 결과 보기</summary>
<pre><code># 처음 받은 HTML (JS 실행 전)
&lt;div id="app"&gt;잠시만 기다려주세요...&lt;/div&gt;
# 1초 뒤 (JS 실행 후 DOM)
&lt;div id="app"&gt;&lt;p&gt;사과&lt;/p&gt;&lt;p&gt;바나나&lt;/p&gt;&lt;p&gt;오렌지&lt;/p&gt;&lt;/div&gt;</code></pre>
</details>

| 항목 | SSR | CSR |
| :---: | :---: | :---: |
| 화면 생성 주체 | 서버 | 브라우저(JS) |
| 최초 응답 | 데이터가 채워진 HTML | 빈 껍데기 + JS |
| 첫 화면 속도 | 빠름 | JS 실행까지 대기 |
| 이후 상호작용 | 매 요청마다 서버 렌더 | 클라이언트에서 처리 |

이번 편에서 다루는 **EJS는 SSR을 깔끔하게 구현하는 도구**입니다. 위 SSR 예제의 지저분한 문자열 이어 붙이기를 템플릿 파일로 분리해 줍니다.

## 📦 2. EJS 시작하기 — view engine과 res.render

EJS(Embedded JavaScript)는 HTML 안에 자바스크립트를 끼워 넣어 동적으로 화면을 만드는 템플릿 엔진입니다. 사용에는 두 가지 설정이 필요합니다.

```js
const express = require("express");
const app = express();

// ① 템플릿 엔진을 EJS로 지정
app.set("view engine", "ejs");

// ② .ejs 파일들이 있는 폴더 지정 (기본값 "./views")
app.set("views", "./views");

app.get("/", (req, res) => {
  // views/index.ejs 를 렌더링하며 title 데이터를 전달
  res.render("index", { title: "Hello, EJS!" });
});

app.listen(3000);
```

`views/index.ejs`:

```html
<!DOCTYPE html>
<html>
  <head>
    <title><%= title %></title>
  </head>
  <body>
    <h1><%= title %></h1>
  </body>
</html>
```

- `res.render("index", { title })` — 첫 인자는 뷰 파일 이름(확장자 생략), 둘째 인자는 템플릿에 넘길 데이터 객체입니다.

- `res.render("index")`는 실제로 `./views/index.ejs`를 찾습니다.

- 뷰 안의 `<%= title %>` 자리에 전달한 `"Hello, EJS!"`가 들어갑니다.

<details style="margin:10px 0 4px">
<summary style="cursor:pointer;font-weight:700;color:#C8443C">실행 결과 보기</summary>
<pre><code>$ curl http://localhost:3000
# 렌더링되어 완성된 HTML
&lt;title&gt;Hello, EJS!&lt;/title&gt;
&lt;h1&gt;Hello, EJS!&lt;/h1&gt;</code></pre>
</details>

## 🛠️ 3. EJS 문법 — 변수·조건·반복·파셜

EJS 태그는 크게 네 가지입니다. 이 네 가지로 대부분의 화면을 구성할 수 있습니다.

| 태그 | 역할 | 비고 |
| :---: | :---: | :---: |
| `<%= 값 %>` | 값 출력 (이스케이프) | HTML 특수문자를 안전하게 변환 |
| `<%- 값 %>` | 값 출력 (원본 HTML) | 태그가 그대로 렌더됨 (XSS 주의) |
| `<% 코드 %>` | 자바스크립트 실행 | 출력 없음 (if·for 등) |
| `<%- include('경로') %>` | 파셜(조각) 삽입 | 공통 영역 재사용 |

### 변수 출력 — `<%= %>` vs `<%- %>`

```html
<!-- 이스케이프 출력: 태그가 문자로 표시됨 -->
<h1><%= title %></h1>

<!-- 원본 HTML 출력: 태그가 실제로 적용됨 -->
<div><%- noticeHtml %></div>
```

```js
// 서버에서 HTML을 포함한 문자열을 전달
const notice = "<strong>서버 점검 안내:</strong> 4월 12일 2시~4시";
res.render("pages/raw", { noticeHtml: notice });
```

- `<%= %>`는 `<strong>`을 `&lt;strong&gt;`으로 바꿔 **문자 그대로** 보여줍니다.

- `<%- %>`는 `<strong>`을 실제 **굵은 글씨로 렌더**합니다. 그만큼 사용자 입력에 쓰면 XSS 위험이 있습니다.

### 조건문·반복문 — `<% %>`

```html
<!-- 조건문: 출력이 없는 로직은 <% %> -->
<% if (user) { %>
  <p><%= user.name %>님, 반갑습니다!</p>
<% } else { %>
  <p>로그인 해주세요.</p>
<% } %>

<!-- 반복문: 배열을 순회하며 <li> 생성 -->
<ul>
  <% users.forEach(user => { %>
    <li><%= user.name %> - <%= user.age %>세</li>
  <% }); %>
</ul>
```

- `<% %>`는 값을 출력하지 않고 **자바스크립트 로직만** 실행합니다. 여는 `{`와 닫는 `}`를 각각 별도 태그로 감싸는 점에 주의합니다.

### 파셜 — `include`로 공통 영역 재사용

머리글·바닥글처럼 여러 페이지가 공유하는 조각을 파일로 분리해 삽입합니다.

```html
<!-- views/partials/header.ejs -->
<header>
  <h1>My 웹사이트</h1>
  <hr />
</header>
```

```html
<!-- 사용하는 쪽 -->
<%- include('../partials/header') %>
<p>이 페이지는 파셜을 포함한 예시입니다.</p>
```

- `include`는 파셜의 HTML을 **그 자리에 펼쳐 넣기** 때문에 `<%- %>`(원본 HTML 출력)로 씁니다.

## 📝 4. EJS Todolist — 폼에서 목록까지

지금까지의 조각을 하나로 합치면, 폼 입력을 받아 화면에 목록으로 뿌리는 서버가 됩니다. 3편의 `express.urlencoded()`(폼 파싱)와 `express.static()`(정적 파일)이 함께 쓰입니다.

```js
const path = require("path");
const express = require("express");
const app = express();

const todos = []; // 서버 메모리에 저장 (재시작 시 사라짐)

app.use(express.urlencoded({ extended: true })); // 폼 본문 파싱
app.use(express.static("public"));               // public의 CSS·JS 제공

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// 목록 화면 렌더
app.get("/", (req, res) => {
  res.render("index", { todos });
});

// 폼 제출 → 배열에 추가 → 다시 목록으로
app.post("/", (req, res) => {
  todos.push(req.body); // { text: "입력한 값" }
  res.redirect("/");
});

app.listen(3000);
```

`views/index.ejs`:

```html
<%- include("partials/head.ejs") %>
<body>
  <h1>Todolist</h1>

  <form action="/" method="post">
    <input type="text" name="text" />
    <input type="submit" />
  </form>

  <ul>
    <% for (todo of todos) { %>
      <li class="todo"><%= todo.text %></li>
    <% } %>
  </ul>
</body>
```

- 폼 제출(POST) → `todos.push(req.body)`로 배열에 추가 → `res.redirect("/")`로 다시 GET 요청 → 늘어난 목록이 렌더됩니다.

- `<input name="text">`의 값이 `req.body.text`로 들어오고, 뷰에서 `<%= todo.text %>`로 출력됩니다.

- 파셜(`head.ejs`)에서 `/styles.css`와 `/app.js`를 불러오는데, 이 파일들은 `public` 폴더에 있어 `express.static` 덕분에 URL로 바로 접근됩니다.

<details style="margin:10px 0 4px">
<summary style="cursor:pointer;font-weight:700;color:#C8443C">동작 흐름 보기</summary>
<pre><code># 1) "우유 사기" 입력 후 제출
POST /  (body: text=우유 사기)
# 2) 서버: todos = [{ text: "우유 사기" }] 저장 후 리다이렉트
302 → GET /
# 3) 렌더된 목록
&lt;ul&gt;&lt;li class="todo"&gt;우유 사기&lt;/li&gt;&lt;/ul&gt;</code></pre>
</details>

## ⚠️ 5. 주의사항

- **사용자 입력은 반드시 `<%= %>`로 출력합니다.** `<%- %>`는 HTML을 그대로 실행하므로, 신뢰할 수 없는 값에 쓰면 XSS 공격에 노출됩니다. 원본 HTML 출력은 서버가 만든 신뢰된 문자열에만 사용합니다.

- **`view engine`·`views` 설정은 라우트보다 먼저 합니다.** 설정 전에 `res.render`가 호출되면 뷰를 찾지 못합니다.

- **폼(POST) 처리에는 `express.urlencoded()`가 필요합니다.** 이 미들웨어가 없으면 `req.body`가 `undefined`가 되어 입력값을 읽을 수 없습니다.

- **SSR과 CSR은 우열이 아니라 선택입니다.** 첫 화면 속도·검색엔진 노출이 중요하면 SSR, 앱처럼 잦은 상호작용이 많으면 CSR이 유리합니다. 상황에 맞게 고릅니다.

## ✅ 6. 핵심 정리

- **SSR vs CSR** — 완성된 HTML을 서버가 만들어 보내면 SSR, 빈 껍데기를 받아 브라우저가 채우면 CSR입니다. EJS는 SSR을 깔끔하게 구현하는 도구입니다.

- **EJS 설정** — `app.set("view engine", "ejs")`와 `app.set("views", ...)` 두 줄 뒤, `res.render("뷰이름", 데이터)`로 데이터를 끼워 렌더링합니다.

- **네 가지 문법** — `<%= %>`(이스케이프 출력) · `<%- %>`(원본 HTML) · `<% %>`(조건·반복) · `include`(파셜 재사용).

- **Todolist 흐름** — 폼 POST → 배열에 저장 → 리다이렉트 → 목록 렌더. `express.urlencoded()`와 `express.static()`이 함께 맞물려 동작합니다.

<div style="display:flex;gap:12px;flex-wrap:wrap;margin:6px 0 0;justify-content:space-between"><a style="display:inline-flex;align-items:center;gap:10px;text-decoration:none;padding:12px 18px;border-radius:12px 13px 11px 13px;border:1.5px solid #C8443C;background:#FBFBF7;color:#243130;font-size:14px;font-weight:500;box-shadow:0 6px 14px -8px rgba(47,58,57,0.4)" href="https://saver7942.blogspot.com/2026/07/express-33-bodyparamsquery.html"><span style="color:#C8443C;font-size:16px">←</span><span><span style="font-size:11.5px;color:#93A97F;display:block">이전 편</span>Express 요청 데이터 (3편)</span></a><a style="display:inline-flex;align-items:center;gap:10px;text-decoration:none;padding:12px 18px;border-radius:12px 13px 11px 13px;border:1.5px solid #C8443C;background:#FBFBF7;color:#243130;font-size:14px;font-weight:500;box-shadow:0 6px 14px -8px rgba(47,58,57,0.4)" href="https://saver7942.blogspot.com/2026/07/express-56-sendjsonstatusredirectsendfi.html"><span><span style="font-size:11.5px;color:#93A97F;display:block;text-align:right">다음 편</span>Express 응답 메서드 (5편)</span><span style="color:#C8443C;font-size:16px">→</span></a></div>
