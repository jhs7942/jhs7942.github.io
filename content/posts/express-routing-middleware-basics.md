---
title: Express 기초 (2/6) — 라우팅·HTTP 메서드·미들웨어
slug: express-routing-middleware-basics
description: >-
  Express가 순수 `http` 모듈의 수동 라우팅·응답 처리를 어떻게 간결하게 만드는지 대비표로 정리하고, `app.get()` 등
  HTTP 메서드별 라우팅과 `app.all()`, 미들웨어의 핵심인 `app.use()`·`next()`·요청-응답 사이클, 그리고 미들웨어
  체인의 실행 순서를 살펴봅니다. Node.js 웹 서버 기초 3부작의 2편입니다.
published_at: '2026-07-04T22:06:45-07:00'
labels:
  - AI 작성
  - 학습 정리
  - Express
source: 'Node.js/Express 기초 강의 실습 코드 (C:/Users/jhs02/Downloads/ 및 강의 zip 자료)'
series: express
part: 2
legacy_url: 'https://saver7942.blogspot.com/2026/07/express-23-http.html'
draft: false
---

[1편](/posts/nodejs-http-module-server-basics/)에서는 순수 `http` 모듈로 라우팅과 정적 파일 서빙을 직접 구현했습니다. 이번 편은 그 번거로움을 **Express**가 어떻게 줄이는지, 그리고 Express의 핵심 개념인 **미들웨어**를 정리합니다.

## 📦 1. 순수 http에서 Express로

1편에서 직접 구현해야 했던 것들을 Express가 어떻게 처리하는지 비교합니다.

| 기능 | 순수 `http` | Express |
| :---: | :---: | :---: |
| 라우팅 | `req.url` if/else 분기 | `app.get()`, `app.post()` 등 메서드별 선언 |
| 정적 파일 | `fs.readFile` + MIME 타입 직접 설정 | `express.static("public")` 한 줄 |
| 응답 전송 | `writeHead` + `write` + `end` 조합 | `res.send()` 한 메서드로 자동 처리 |
| 본문 파싱 | 직접 스트림 처리 필요 | `express.json()`, `express.urlencoded()` |
| 경로 파라미터 | 문자열 파싱 직접 구현 | `:id` 선언 → `req.params.id` 자동 추출 |

Express를 시작하는 기본 형태입니다.

```js
const express = require("express");
const app = express();

app.listen(3000, () => {
  console.log("서버가 3000번 포트에서 실행 중입니다.");
});
```

- `express()` 호출로 `app` 인스턴스를 생성합니다.

- 이 `app` 객체로 라우팅, 미들웨어 설정, 서버 실행을 모두 처리합니다.

## 🔀 2. Express 라우팅과 HTTP 메서드

Express는 HTTP 메서드별로 라우팅 메서드를 제공합니다.

```js
app.get("/", (req, res) => {
  res.send("<h1>Homepage</h1>");
});

app.post("/submit-form", (req, res) => {
  res.send("<h1>Form Submitted</h1>");
});

app.put("/update-profile", (req, res) => {
  res.send("Profile updated.");
});

app.delete("/delete-account", (req, res) => {
  res.send("Account deleted.");
});

app.patch("/update-profile-info", (req, res) => {
  res.send("Profile info partially updated.");
});
```

각 메서드의 용도입니다.

| 메서드 | 용도 |
| :---: | :---: |
| `GET` | 데이터 조회 (홈페이지 접속, 게시글 목록 등) |
| `POST` | 데이터 생성·제출 (회원가입, 로그인, 폼 제출) |
| `PUT` | 기존 데이터 전체 교체 (프로필 전체 수정) |
| `DELETE` | 데이터 삭제 (계정 삭제, 게시글 삭제) |
| `PATCH` | 데이터 일부 수정 (이메일만 변경, 닉네임만 변경) |

### `app.all()` — 모든 메서드 한 번에 처리

특정 경로로 들어오는 모든 HTTP 메서드 요청을 하나의 핸들러로 처리합니다.

```js
app.all("/hello", (req, res, next) => {
  res.send("<h1>Hello World!</h1>");
});
```

> **참고**: `res.send(data)`는 전달하는 데이터 타입에 따라 `Content-Type`을 자동으로 설정합니다. 문자열이면 `text/html`, 객체·배열이면 `application/json`으로 응답합니다.

## 🔗 3. 미들웨어 — app.use(), next(), 요청-응답 사이클

**미들웨어(Middleware)**는 요청(Request)과 응답(Response) 사이에서 실행되는 함수입니다. `(req, res, next)` 세 인자를 받으며, 등록된 순서대로 실행됩니다.

### `app.use()`와 `next()`

```js
// 첫 번째 미들웨어
app.use((req, res, next) => {
  console.log("첫 번째 미들웨어");
  next(); // 다음 미들웨어로 제어를 넘깁니다
});

// 두 번째 미들웨어
app.use((req, res, next) => {
  console.log("두 번째 미들웨어");
  res.send("응답 완료"); // 여기서 응답이 끝납니다
});

// 이 라우트 핸들러는 실행되지 않습니다
app.get("/", (req, res) => {
  res.send("<h1>Homepage</h1>");
});
```

- `app.use()`는 경로 지정 없이 모든 요청에 미들웨어를 적용합니다.

- `next()`를 호출하면 다음 미들웨어로 제어가 넘어갑니다.

- `next()`를 호출하지 않으면 요청 처리가 그 지점에서 멈춥니다.

- `res.send()` 등으로 응답을 보내면 **요청-응답 사이클이 종료**되고 이후 미들웨어는 실행되지 않습니다.

### 미들웨어 체인 — 물류센터 비유

여러 미들웨어가 `next()`로 연결되어 순차적으로 실행되는 흐름입니다.

```js
app.use((req, res, next) => {
  console.log("[1단계]: 상품이 도착했습니다.");
  next();
});

app.use((req, res, next) => {
  console.log("[2단계]: 상품이 입고되었습니다.");
  next();
});

app.use((req, res, next) => {
  console.log("[3단계]: 재고 관리를 시작했습니다.");
  next();
});

app.use((req, res, next) => {
  console.log("[4단계]: 주문 처리되었습니다.");
  next();
});

app.use((req, res, next) => {
  console.log("[5단계]: 물류 배송이 시작되었습니다. 라우터로 이동합니다.");
  next();
});

app.get("/delivery", (req, res) => {
  res.send("<h1>물류 배송 시작</h1>");
});
```

<details style="margin:10px 0 4px">
<summary style="cursor:pointer;font-weight:700;color:#C8443C">실행 결과 보기</summary>
<pre><code>$ curl http://localhost:3000/delivery
# 서버 콘솔 (등록 순서대로 출력)
[1단계]: 상품이 도착했습니다.
[2단계]: 상품이 입고되었습니다.
[3단계]: 재고 관리를 시작했습니다.
[4단계]: 주문 처리되었습니다.
[5단계]: 물류 배송이 시작되었습니다. 라우터로 이동합니다.
# 브라우저 응답
물류 배송 시작</code></pre>
</details>

- 각 미들웨어는 물류센터의 처리 단계에 해당합니다.

- `next()`로 다음 단계로 넘어가고, 최종적으로 라우트 핸들러가 응답을 보냅니다.

- 미들웨어 실행 순서는 **등록 순서**와 동일합니다.

## ✅ 4. 핵심 정리

- **메서드별 라우팅** — Express는 `app.get()`, `app.post()`, `app.put()`, `app.delete()`, `app.patch()`로 HTTP 메서드마다 핸들러를 선언합니다. `app.all()`은 한 경로의 모든 메서드를 한 번에 처리합니다.

- **`res.send()` 자동 처리** — 전달 데이터 타입에 따라 `Content-Type`을 자동 설정합니다(문자열→`text/html`, 객체→`application/json`).

- **미들웨어 체인** — `app.use()`로 등록한 미들웨어는 등록 순서대로 실행됩니다. `next()`로 다음 단계로 넘기고, 응답을 보내면 사이클이 종료되어 이후 미들웨어·라우트는 실행되지 않습니다.

- 요청에서 데이터를 꺼내는 방법(body·params·query)과 `express.static()`은 **3편 — Express 요청 데이터**에서 이어집니다.
