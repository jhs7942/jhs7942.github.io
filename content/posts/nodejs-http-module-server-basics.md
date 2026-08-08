---
title: 순수 Node.js http 모듈로 웹 서버 만들기 (1/6) — 서버·라우팅·정적 파일
slug: nodejs-http-module-server-basics
description: >-
  Node.js에 내장된 `http` 모듈만으로 웹 서버를 생성하고, `req.url`을 직접 비교하는 수동 라우팅과 `fs`를 이용한 정적
  파일 서빙을 구현하는 과정을 정리합니다. 프레임워크 없이 직접 처리할 때 무엇을 신경 써야 하는지 짚어, 다음 편의 Express가 무엇을
  대신해 주는지 이해하는 토대를 만듭니다. Node.js 웹 서버 기초 3부작의 1편입니다.
published_at: '2026-07-04T22:06:42-07:00'
labels:
  - AI 작성
  - 학습 정리
  - Node.js
source: 'Node.js/Express 기초 강의 실습 코드 (C:/Users/jhs02/Downloads/ 및 강의 zip 자료)'
series: express
part: 1
legacy_url: 'https://saver7942.blogspot.com/2026/07/nodejs-http-13.html'
draft: false
---

Node.js로 웹 서버를 만드는 방법은 크게 두 단계로 나뉩니다. 먼저 내장 `http` 모듈만으로 서버를 직접 구성해 보고, 이후 Express가 그 과정을 어떻게 단순화하는지 살펴봅니다. 이 1편에서는 **프레임워크 없이 순수 `http` 모듈만** 사용합니다.

## 🏗️ 2. http 모듈 — 서버 생성과 응답

**`http`** 모듈은 Node.js에 기본 내장되어 있어 별도 설치 없이 바로 사용할 수 있습니다.

```js
const http = require("http");

const server = http.createServer((req, res) => {
  res.writeHead(200, { "content-type": "text/html" });
  res.write("<h1>Hello World</h1>");
  res.end();
});

server.listen(3000, () => {
  console.log("Listening on port 3000");
});
```

핵심 API는 다음과 같습니다.

| API | 역할 |
| :---: | :---: |
| `http.createServer(callback)` | 요청마다 콜백 `(req, res)`를 실행하는 서버 객체를 생성합니다. |
| `res.writeHead(statusCode, headers)` | HTTP 상태 코드와 응답 헤더(MIME 타입 등)를 설정합니다. |
| `res.write(data)` | 응답 본문 데이터를 클라이언트로 전송합니다. |
| `res.end()` | 응답을 완료합니다. 데이터를 인자로 전달하면 `write` + `end`를 한 번에 처리합니다. |

> **참고**: `server.listen(포트, 콜백)` — 지정한 포트에서 수신을 시작합니다. 콜백은 수신이 시작될 때 한 번 실행됩니다.

## 🔍 3. req.url로 직접 라우팅하기

http 모듈에는 라우팅 기능이 없습니다. `req.url` 값을 직접 비교하는 `if/else` 분기로 경로를 처리해야 합니다.

```js
const server = http.createServer((req, res) => {
  if (req.url === "/hello") {
    res.writeHead(200, { "content-type": "text/html" });
    res.write("<h1>Hello World!</h1>");
    res.end();
  } else {
    res.writeHead(404, { "content-type": "text/html" });
    res.write("<h1>Sorry, Page Not Found</h1>");
    res.end();
  }
});
```

- 경로가 `/hello`이면 200 응답을 반환합니다.

- 그 외 모든 경로는 404 상태 코드와 함께 오류 메시지를 반환합니다.

- 경로가 늘어날수록 `if/else` 체인이 길어지고 유지 보수가 어려워집니다. 이 한계를 2편의 Express 라우팅이 해소합니다.

## 🛠️ 4. 정적 파일을 손으로 서빙하기

HTML, 이미지 같은 정적 파일을 제공하려면 `fs` 모듈과 MIME 타입 처리를 직접 작성해야 합니다.

### 동기 방식 — `fs.readFileSync`

```js
const http = require("http");
const fs = require("fs");

const server = http.createServer((req, res) => {
  if (req.url === "/hello") {
    res.writeHead(200, { "Content-Type": "text/html" });
    const helloHTML = fs.readFileSync("hello.html", "utf-8");
    res.write(helloHTML);
    res.end();
  } else if (req.url === "/first.png") {
    res.writeHead(200, { "Content-Type": "image/png" });
    const image = fs.readFileSync("first.png");
    res.write(image);
    res.end();
  } else {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("404 Not Found");
  }
});
```

- 파일 종류마다 `else if` 분기와 MIME 타입 문자열을 직접 지정해야 합니다.

- `fs.readFileSync`는 파일을 읽는 동안 이벤트 루프를 차단하므로 실서비스에 적합하지 않습니다.

### 비동기 방식 — `serveStatic` 함수

파일 경로 조합, 비동기 읽기, MIME 타입 결정, 에러 처리를 `serveStatic` 함수로 분리하는 방식입니다.

```js
const http = require("http");
const fs = require("fs");
const path = require("path");

function serveStatic(rootDirectory, req, res) {
  const filePath = path.join(rootDirectory, req.url);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === "ENOENT") {
        res.writeHead(404, { "Content-Type": "text/html" });
        res.end("<h1>404 Not Found</h1>");
      } else {
        res.writeHead(500, { "Content-Type": "text/html" });
        res.end("<h1>500 Internal Server Error</h1>");
      }
    } else {
      const extname = path.extname(filePath);
      const contentType = getContentType(extname);
      res.writeHead(200, { "Content-Type": contentType });
      res.end(data);
    }
  });
}

function getContentType(ext) {
  switch (ext) {
    case ".html": return "text/html";
    case ".css":  return "text/css";
    case ".png":  return "image/png";
    default:      return "application/octet-stream";
  }
}

const server = http.createServer((req, res) => {
  if (req.url === "/") {
    const homepage = fs.readFileSync("./public/homepage.html", "utf-8");
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(homepage);
  } else if (req.url === "/hello") {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end("<h1>Hello Page!</h1>");
  } else {
    serveStatic("public", req, res);
  }
});

server.listen(3000, () => console.log("Listening on port 3000"));
```

직접 구현할 때 반드시 처리해야 하는 항목들입니다.

1. **`path.join(rootDirectory, req.url)`** — 운영체제별 경로 구분자 차이를 자동으로 처리합니다.

2. **`fs.readFile` 비동기 처리** — 콜백을 통해 에러와 성공을 분기합니다.

3. **`err.code === "ENOENT"`** — 파일 없음(404)과 그 외 서버 오류(500)를 구분합니다.

4. **`getContentType(ext)`** — `.html`, `.css`, `.png` 등 확장자마다 올바른 MIME 타입을 반환합니다.

이 다섯 가지 처리를 3편에서 `express.static()` 한 줄이 모두 대신하게 됩니다.

## ✅ 5. 핵심 정리

- **`http.createServer`** — Node.js 내장 모듈로 서버를 생성하며, `res.writeHead` / `res.write` / `res.end` 조합으로 응답합니다.

- **수동 라우팅의 한계** — `req.url` if/else 분기는 경로가 늘어날수록 유지 보수가 어려워집니다.

- **정적 파일 서빙 비용** — 순수 http 방식은 `fs` 읽기, MIME 타입 결정, 404/500 에러 처리를 모두 직접 구현해야 합니다. `fs.readFileSync`는 이벤트 루프를 차단하므로 비동기 `fs.readFile`가 필요합니다.

- 이 번거로움을 어떻게 줄이는지는 **2편 — Express 기초**에서 이어집니다.
