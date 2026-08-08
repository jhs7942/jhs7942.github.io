---
title: Express 응답 메서드 총정리 (5/6) — send·json·status·redirect·sendFile
slug: express-response-methods
description: >-
  Express에서 클라이언트에게 응답을 돌려주는 여러 메서드를 한자리에 정리합니다. 범용 `res.send`와 명시적 `res.json`,
  상태 코드 `res.status`, 페이지 이동 `res.redirect`, 파일 전송
  `res.sendFile`·`res.download`, 그리고 `res.set`·`res.type`으로 Content-Type과
  Cache-Control 같은 헤더를 직접 다루는 법까지 다룹니다. Node.js/Express 시리즈 5편입니다.
published_at: '2026-07-05T04:18:54-07:00'
labels:
  - AI 작성
  - 학습 정리
  - Express
source: 'Node.js/Express 강의 실습 코드 (30 response-methods, 헤더 제어 예제)'
series: express
part: 5
legacy_url: >-
  https://saver7942.blogspot.com/2026/07/express-56-sendjsonstatusredirectsendfi.html
draft: false
---

응답은 지금까지 대부분 `res.send`로 처리했습니다. 하지만 상황에 따라 JSON을 명확히 보내거나, 상태 코드를 붙이거나, 다른 주소로 보내거나, 파일을 내려주거나, 캐시 정책을 지정해야 할 때가 있습니다. 이번 편은 `res`가 제공하는 응답 메서드들을 **언제 무엇을 쓰는지** 기준으로 정리합니다.

## 🧩 1. res.send · res.json — 데이터 응답

### `res.send` — 범용 응답

문자열·HTML·객체 등 다양한 데이터를 보낼 수 있는 만능 메서드입니다. 데이터 종류에 맞춰 **Content-Type을 자동으로** 설정합니다.

```js
app.get("/send", (req, res) => {
  res.send("Hello World");              // 문자열 → text/html
  // res.send("<h1>Hello World</h1>");  // HTML도 가능
  // res.send({ name: "hello", age: 15 }); // 객체 → JSON으로 자동 변환
});
```

### `res.json` — 명시적 JSON 응답

객체를 JSON으로 보낼 때 사용합니다. `res.send`도 객체를 JSON으로 바꿔 주지만, `res.json`은 **의도를 분명히** 드러내고 항상 `Content-Type: application/json`을 설정합니다.

```js
app.get("/json", (req, res) => {
  res.json({ name: "hello", age: 15 });
});
```

- API 응답이라면 `res.json`이 더 명확합니다.

<details style="margin:10px 0 4px">
<summary style="cursor:pointer;font-weight:700;color:#C8443C">실행 결과 보기</summary>
<pre><code>$ curl -i http://localhost:3000/json
# 응답 헤더에 Content-Type이 자동 설정됨
Content-Type: application/json; charset=utf-8
# 본문
{"name":"hello","age":15}</code></pre>
</details>

## 🔢 2. res.status — 상태 코드

HTTP 상태 코드를 명시적으로 지정합니다. 보통 `res.send`·`res.json`과 **체이닝**해서 씁니다.

```js
app.get("/unauthorized", (req, res) => {
  res.status(401).send("접근 권한이 없습니다."); // 401 Unauthorized
});

app.get("/not-found", (req, res) => {
  res.status(404).json({ error: "페이지를 찾을 수 없습니다." }); // 404 Not Found
});
```

- `res.status(코드)`는 응답 객체를 그대로 돌려주므로, 뒤에 `.send()`·`.json()`을 이어 붙일 수 있습니다.

- 상태 코드를 생략하면 기본값은 `200 OK`입니다.

## ↪️ 3. res.redirect — 페이지 이동

클라이언트를 다른 주소로 이동시킵니다. `301`(영구 이동)·`302`(임시 이동, 기본값) 상태 코드를 함께 지정할 수 있습니다.

```js
app.get("/old-page", (req, res) => {
  res.redirect(301, "/new-page"); // 영구 이동
});

app.get("/new-page", (req, res) => {
  res.send("이 페이지는 새로운 주소입니다.");
});
```

<details style="margin:10px 0 4px">
<summary style="cursor:pointer;font-weight:700;color:#C8443C">실행 결과 보기</summary>
<pre><code>$ curl -i http://localhost:3000/old-page
# 301 응답 + 이동할 주소 안내
HTTP/1.1 301 Moved Permanently
Location: /new-page
# 브라우저는 자동으로 /new-page 를 다시 요청 → "이 페이지는 새로운 주소입니다."</code></pre>
</details>

## 📁 4. res.sendFile · res.download — 파일 응답

### `res.sendFile` — 파일을 화면에 표시

이미지나 HTML 파일 자체를 응답으로 보냅니다. 경로는 **절대 경로**여야 하므로 `path.join`과 함께 씁니다.

```js
app.get("/file", (req, res) => {
  const filePath = path.join(__dirname, "public", "hello.png");
  res.sendFile(filePath); // 브라우저에 이미지가 그대로 표시됨
});
```

### `res.download` — 파일을 다운로드로

같은 파일이라도 브라우저가 **다운로드 창**을 띄우도록 응답합니다.

```js
app.get("/download-file", (req, res) => {
  const filePath = path.join(__dirname, "public", "hello.png");
  res.download(filePath); // 다운로드 형태로 전송
});
```

| 메서드 | 동작 | 쓰임 |
| :---: | :---: | :---: |
| `res.sendFile` | 파일을 화면에 표시 | 이미지 보기, 정적 HTML |
| `res.download` | 파일 다운로드 유도 | 첨부파일, 문서 내려받기 |

## 🏷️ 5. 헤더 제어 — res.set · res.type

응답 헤더를 직접 지정해야 할 때 `res.set`(임의 헤더)과 `res.type`(Content-Type 축약)을 씁니다.

### `res.set` — Content-Type · Cache-Control

```js
// Content-Type 직접 지정
app.get("/json", (req, res) => {
  res.set("Content-Type", "application/json");
  res.send(JSON.stringify({ message: "Hello, World!" }));
});

// 캐시 금지
app.get("/no-cache", (req, res) => {
  res.set("Cache-Control", "no-cache"); // 매번 서버에서 새로 받음
  res.send("This response is not cached.");
});

// 1시간 캐시 허용
app.get("/cache", (req, res) => {
  res.set("Cache-Control", "max-age=3600"); // 1시간 동안 브라우저에 저장
  res.send("This response is cached for 1 hour.");
});
```

### `res.type` — Content-Type 축약

```js
app.get("/text", (req, res) => {
  res.type("text"); // Content-Type: text/plain
  res.send("이건 일반 텍스트입니다.");
});

app.get("/html", (req, res) => {
  res.type("html"); // Content-Type: text/html
  res.send("<h1>HTML 페이지입니다</h1>");
});
```

- `Cache-Control: no-cache`는 매 요청마다 서버 확인, `max-age=3600`은 1시간 동안 브라우저 캐시를 재사용합니다.

- `res.type("html")`은 `res.set("Content-Type", "text/html")`의 축약형입니다.

## ⚠️ 6. 주의사항

- **응답은 한 번만 보냅니다.** `res.send` 뒤에 또 `res.send`나 `res.json`을 호출하면 `Cannot set headers after they are sent` 오류가 납니다. 한 요청에 응답 메서드는 한 번입니다.

- **헤더는 본문 전송 전에 설정합니다.** `res.set`·`res.status`·`res.type`은 모두 `res.send` **이전**에 호출해야 적용됩니다.

- **`res.sendFile`·`res.download`는 절대 경로가 필요합니다.** 상대 경로를 넘기면 오류가 나므로 `path.join(__dirname, ...)`으로 절대 경로를 만듭니다.

- **`res.json`과 `res.send({})`의 차이는 명확성입니다.** 결과는 비슷하지만, API라면 의도가 분명한 `res.json`을 쓰는 편이 읽기 좋습니다.

## ✅ 7. 핵심 정리

- **데이터 응답** — `res.send`는 만능(자동 Content-Type), `res.json`은 명시적 JSON. API에는 `res.json`이 분명합니다.

- **상태·이동** — `res.status(코드).send(...)`로 상태 코드를 붙이고, `res.redirect(301/302, 경로)`로 다른 주소로 보냅니다.

- **파일 응답** — 화면 표시는 `res.sendFile`, 다운로드 유도는 `res.download`. 둘 다 절대 경로가 필요합니다.

- **헤더 제어** — `res.set`으로 Content-Type·Cache-Control을 지정하고, `res.type`은 Content-Type 축약형입니다. 헤더는 본문 전송 전에 설정합니다.
