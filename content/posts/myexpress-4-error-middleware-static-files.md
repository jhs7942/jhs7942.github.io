---
title: Express 내부 구현하기 (4/6) — 에러 처리 미들웨어와 정적 파일 서빙
slug: myexpress-4-error-middleware-static-files
description: >-
  Express의 에러 처리 미들웨어(4인자 시그니처)와 정적 파일 서빙 미들웨어(팩토리 패턴)를 순수 Node.js로 직접 구현합니다.
  `next(err)` 전달 경로, `try/catch`로 동기 에러 포착, `fs.stat` + `createReadStream` +
  `pipe` 파이프라인, 확장자별 MIME 타입 결정까지 — Express의 `app.use(errorHandler)`와
  `express.static()`의 원형을 만들어 봅니다. "Express 내부 구현하기" 시리즈 4편입니다.
published_at: '2026-07-16T17:43:23-07:00'
labels:
  - AI 작성
  - 학습 정리
  - Node.js
  - Express
source: >-
  C:/Users/jhs02/AppData/Local/Temp/claude/C--Users-jhs02-Desktop-blog/fe27660a-d234-405a-bb90-f7629ae1dff8/scratchpad/myexpress/section1/08/index.js
series: myexpress
part: 4
legacy_url: 'https://saver7942.blogspot.com/2026/07/express-46.html'
draft: false
---

미들웨어 체인이 완성되었다고 해도, 한 가지 질문이 남습니다. 체인 중간에서 예외가 터지면 어떻게 될까요? 그리고 `express.static("public")`처럼 설정 한 줄로 정적 파일을 서빙하는 코드는 내부적으로 어떻게 동작할까요? 4편에서는 에러를 일반 응답과 분리된 별도 경로로 흘리는 에러 미들웨어와, 팩토리 패턴을 활용한 정적 파일 서빙 미들웨어를 직접 구현합니다.

<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:0 0 6px"><a style="text-decoration:none;font-size:13.5px;font-weight:500;padding:8px 14px;border-radius:11px 12px 10px 12px;border:1.5px solid #C8443C;background:#FBFBF7;color:#243130" href="https://saver7942.blogspot.com/2026/07/express-16-http.html">① 순수 http</a><span style="color:#93A97F">›</span><a style="text-decoration:none;font-size:13.5px;font-weight:500;padding:8px 14px;border-radius:11px 12px 10px 12px;border:1.5px solid #C8443C;background:#FBFBF7;color:#243130" href="https://saver7942.blogspot.com/2026/07/express-26.html">② 라우트 테이블</a><span style="color:#93A97F">›</span><a style="text-decoration:none;font-size:13.5px;font-weight:500;padding:8px 14px;border-radius:11px 12px 10px 12px;border:1.5px solid #C8443C;background:#FBFBF7;color:#243130" href="https://saver7942.blogspot.com/2026/07/express-36-next.html">③ 미들웨어 체인</a><span style="color:#93A97F">›</span><span style="font-size:13.5px;font-weight:500;padding:8px 14px;border-radius:11px 12px 10px 12px;border:1.5px solid #C8443C;background:#C8443C;color:#FBFBF7">④ 에러·정적 · 현재</span><span style="color:#93A97F">›</span><a style="text-decoration:none;font-size:13.5px;font-weight:500;padding:8px 14px;border-radius:11px 12px 10px 12px;border:1.5px solid #C8443C;background:#FBFBF7;color:#243130" href="https://saver7942.blogspot.com/2026/07/express-56-json.html">⑤ 파라미터·파서</a><span style="color:#93A97F">›</span><a style="text-decoration:none;font-size:13.5px;font-weight:500;padding:8px 14px;border-radius:11px 12px 10px 12px;border:1.5px solid #C8443C;background:#FBFBF7;color:#243130" href="https://saver7942.blogspot.com/2026/07/express-66-createrouter.html">⑥ 라우터 모듈화</a></div>

#### 목차

1. [에러 미들웨어: 4인자 시그니처의 의미](#1-4)
2. [next(err)와 try/catch — 에러 전달 흐름 구현](#2-nexterr-trycatch)
3. [조기 응답으로 체인 중단: /forbidden 패턴](#3-forbidden)
4. [정적 파일 서빙: 팩토리 패턴 설계](#4)
5. [파일 스트리밍과 MIME 타입 결정](#5-mime)
6. [주의사항](#6)
7. [핵심 정리](#7)

## 📦 1. 에러 미들웨어: 4인자 시그니처의 의미

Express를 포함해 대부분의 Node.js 웹 프레임워크에서 **에러 처리 미들웨어**는 일반 미들웨어와 인자 수로 구별됩니다. 일반 미들웨어가 `(req, res, next)`를 받는 반면, 에러 미들웨어는 첫 번째 인자로 `err`를 추가해 4개를 받습니다.

```js
// 에러 핸들링 미들웨어 정의 (err, req, res, next 형식)
const errorMiddleware = (err, req, res, next) => {
  console.error("[Error Middleware] 에러 발생:", err.message);
  res.writeHead(500, { "Content-Type": "text/plain" });
  res.end(`Internal Server Error: ${err.message}`);
};
```

| 인자 | 타입 | 역할 |
| :---: | :---: | :---: |
| `err` | `Error` | 전달된 에러 객체. `message`, `stack` 등의 속성을 가집니다. |
| `req` | `IncomingMessage` | HTTP 요청 객체. |
| `res` | `ServerResponse` | HTTP 응답 객체. |
| `next` | `Function` | 에러를 다음 에러 핸들러로 다시 위임할 때 사용합니다. |

> **참고**: Express는 인자 수를 기준으로 에러 미들웨어를 식별합니다. 함수 선언 시 `err`를 첫 번째 인자로 명시하지 않으면 Express가 일반 미들웨어로 취급하여 에러 전달이 동작하지 않습니다.

## 🔍 2. next(err)와 try/catch — 에러 전달 흐름 구현

에러를 에러 미들웨어까지 전달하려면 두 가지 경로를 처리해야 합니다.

- **동기 에러** — `throw`로 발생한 예외. `try/catch`로 포착한 뒤 `next(error)`를 호출해 전달합니다.

- **비동기 에러** — Promise 거부나 콜백 에러. `try/catch`가 잡지 못하므로, 미들웨어 안에서 직접 `next(err)`를 호출해야 합니다.

`runMiddlewares`는 두 경로를 모두 처리합니다.

```js
function runMiddlewares(req, res, middlewares, errorMiddleware) {
  let idx = 0; // 현재 실행 중인 미들웨어 인덱스

  // next는 각 미들웨어가 호출해야 하는 함수입니다.
  function next(err) {
    if (err) {
      // 에러가 발생하면 에러 핸들링 미들웨어로 전달
      return errorMiddleware(err, req, res, next);
    }

    if (idx < middlewares.length) {
      const currentMiddleware = middlewares[idx++];

      try {
        currentMiddleware(req, res, next); // 현재 미들웨어 실행
      } catch (error) {
        // 동기 미들웨어에서 에러 발생 시 안전하게 캐치
        next(error); // 다음 next(err)로 전달
      }
    } else {
      // 모든 미들웨어가 성공적으로 실행된 경우
      console.log("모든 미들웨어 처리가 완료되었습니다.");
    }
  }

  next(); // 실행 시작
}
```

핵심 흐름을 정리합니다.

1. `next(err)`가 호출되면 `if (err)` 분기에서 즉시 `errorMiddleware`로 위임합니다. 이후 일반 미들웨어는 실행되지 않습니다.

2. `try/catch`는 동기 에러를 포착하는 안전망입니다. 미들웨어 안에서 `throw`가 발생해도 서버가 멈추지 않고 에러 미들웨어로 흘러갑니다.

3. **비동기 에러**(`Promise.reject`, `setTimeout` 내 `throw` 등)는 `try/catch`가 잡지 못합니다. 비동기 미들웨어라면 `.catch(next)` 또는 `await` + `try/catch` 조합으로 직접 `next(err)`를 호출해야 합니다.

아래 Middleware 2가 `throw`를 발생시키는 흐름을 실행하면 동작을 확인할 수 있습니다.

```js
// Middleware 2: 의도적으로 에러 발생시키기
(req, res, next) => {
  console.log("[Middleware 2] 의도적인 에러 발생");
  throw new Error("Something went wrong in Middleware 2!");
  // 비동기라면: Promise.reject(new Error(...)).catch(next);
},
```

<details style="margin:10px 0 4px">
<summary style="cursor:pointer;font-weight:700;color:#C8443C">실행 결과 보기</summary>
<pre><code>$ curl http://localhost:3000/hello
Internal Server Error: Something went wrong in Middleware 2!

# 서버 콘솔
[Request] Method: GET, URL: /hello
[Middleware 1] 요청 수신
[Middleware 2] 의도적인 에러 발생
[Error Middleware] 에러 발생: Something went wrong in Middleware 2!</code></pre>
</details>

## 🛠️ 3. 조기 응답으로 체인 중단: /forbidden 패턴

에러 경로와는 별개로, 인증 실패나 권한 없음처럼 "에러"가 아닌 **조기 차단**이 필요한 경우도 있습니다. 이때는 `next()`를 호출하지 않고 응답을 완료해 체인을 멈춥니다.

```js
// Middleware 1: 요청 수신 및 특정 URL 차단 처리
(req, res, next) => {
  console.log("[Middleware 1] 요청 수신");

  // /forbidden 요청은 즉시 403 응답
  if (req.url === "/forbidden") {
    res.writeHead(403, { "Content-Type": "text/plain" });
    return res.end("Access Denied: You cannot access this resource.");
  }

  // 그 외에는 다음 미들웨어로
  next();
},
```

`return res.end()`는 두 가지 역할을 동시에 수행합니다.

- `res.end()` — 응답을 완료하고 클라이언트와의 연결을 닫습니다.

- `return` — 함수 실행을 종료해 이후 `next()` 호출을 방지합니다.

<details style="margin:10px 0 4px">
<summary style="cursor:pointer;font-weight:700;color:#C8443C">실행 결과 보기</summary>
<pre><code>$ curl http://localhost:3000/forbidden
Access Denied: You cannot access this resource.

# 서버 콘솔
[Request] Method: GET, URL: /forbidden
[Middleware 1] 요청 수신
# Middleware 2, 3은 실행되지 않음</code></pre>
</details>

> **참고**: Express의 인증 미들웨어(`passport`, `express-jwt` 등)도 이 패턴으로 동작합니다. 인증에 실패하면 `next()`를 호출하지 않고 401/403을 반환해 이후 라우트 핸들러가 실행되지 않도록 막습니다.

## 📦 4. 정적 파일 서빙: 팩토리 패턴 설계

정적 파일 서빙 미들웨어는 **팩토리 패턴**으로 설계합니다. 디렉터리 경로를 인자로 받아 미들웨어 함수를 반환하는 구조입니다. Express의 `express.static("public")`도 같은 방식입니다.

```js
// 정적 파일 제공 미들웨어 (Factory 패턴)
// 요청된 파일이 staticDir 내부에 존재하면 응답하고, 없으면 next()로 넘김
function staticMiddleware(staticDir) {
  return (req, res, next) => {
    const filePath = path.join(staticDir, req.url);

    fs.stat(filePath, (err, stats) => {
      if (!err && stats.isFile()) {
        const stream = fs.createReadStream(filePath); // 파일 스트림 생성
        res.writeHead(200, { "Content-Type": getContentType(filePath) }); // 적절한 Content-Type 설정
        stream.pipe(res); // 파일을 스트림으로 응답
      } else {
        next(); // 파일 없으면 다음 미들웨어로 넘김
      }
    });
  };
}
```

팩토리 패턴의 이점을 정리합니다.

- **설정 캡슐화** — `staticDir`는 반환된 미들웨어 함수 안에 클로저로 갇혀 있습니다. 외부에서 변경할 수 없고, 여러 디렉터리를 서빙하는 경우 `staticMiddleware("public")`과 `staticMiddleware("uploads")`를 독립적으로 사용할 수 있습니다.

- **인터페이스 통일** — 반환된 함수는 `(req, res, next)` 시그니처의 일반 미들웨어와 동일하여 기존 체인에 그대로 연결됩니다.

미들웨어 체인에 등록하면 다음과 같습니다.

```js
// 정적 파일이 위치한 디렉터리 지정
// 예: ./public/logo.png → 클라이언트 요청이 /logo.png일 때 응답됨
const staticDir = path.join(__dirname, "public");

// staticMiddleware는 정적 파일을 처리하고, 다음 미들웨어는 404 응답
const middlewares = [
  staticMiddleware(staticDir), // 정적 파일 제공 미들웨어
  (req, res, next) => {
    // 파일이 없을 경우 404 처리
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("404 Not Found: The requested resource does not exist.");
  },
];
```

`staticMiddleware`가 파일을 찾지 못하면 `next()`를 호출하고, 뒤따르는 404 미들웨어가 이를 처리합니다.

## 🔍 5. 파일 스트리밍과 MIME 타입 결정

정적 파일을 응답할 때는 두 단계가 필요합니다.

**1단계 — 파일 존재 확인: `fs.stat`**

`fs.stat(filePath, callback)`은 파일 메타데이터를 비동기로 조회합니다. `err`가 없고 `stats.isFile()`이 `true`이면 파일이 존재하고 디렉터리가 아닙니다.

**2단계 — 스트림으로 파일 전송: `createReadStream` + `pipe`**

파일을 메모리에 통째로 올리지 않고, `ReadableStream`으로 청크 단위로 읽어 `res`(`WritableStream`)에 연결합니다. `pipe`가 내부적으로 데이터 흐름과 종료(`end`) 신호를 관리합니다.

```js
const stream = fs.createReadStream(filePath); // 파일 스트림 생성
stream.pipe(res);                             // 파일을 스트림으로 응답
```

**MIME 타입 결정: `getContentType`**

브라우저가 파일을 올바르게 해석하려면 `Content-Type` 헤더에 MIME 타입을 지정해야 합니다. `path.extname`으로 확장자를 추출하고 `switch`로 매핑합니다.

```js
// 파일 확장자에 따른 Content-Type 결정 헬퍼 함수
function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".html":  return "text/html";
    case ".css":   return "text/css";
    case ".js":    return "application/javascript";
    case ".png":   return "image/png";
    case ".jpg":
    case ".jpeg":  return "image/jpeg";
    case ".gif":   return "image/gif";
    case ".svg":   return "image/svg+xml";
    default:       return "application/octet-stream"; // 알 수 없는 확장자는 일반 바이너리 처리
  }
}
```

| 확장자 | MIME 타입 | 용도 |
| :---: | :---: | :---: |
| `.html` | `text/html` | HTML 문서 |
| `.css` | `text/css` | 스타일시트 |
| `.js` | `application/javascript` | JavaScript 파일 |
| `.png` / `.jpg` | `image/png` / `image/jpeg` | 래스터 이미지 |
| `.svg` | `image/svg+xml` | 벡터 이미지 |
| 그 외 | `application/octet-stream` | 범용 바이너리 (다운로드 처리) |

<details style="margin:10px 0 4px">
<summary style="cursor:pointer;font-weight:700;color:#C8443C">실행 결과 보기</summary>
<pre><code># public/style.css 가 존재하는 경우
$ curl -I http://localhost:3000/style.css
HTTP/1.1 200 OK
Content-Type: text/css

# 서버 콘솔
[Request] GET /style.css
# staticMiddleware: 파일 발견 → CSS 스트리밍 응답

# public/unknown.txt 가 존재하지 않는 경우
$ curl http://localhost:3000/unknown.txt
404 Not Found: The requested resource does not exist.

# 서버 콘솔
[Request] GET /unknown.txt
# staticMiddleware: 파일 없음 → next() → 404 미들웨어 응답</code></pre>
</details>

## ⚠️ 6. 주의사항

- **비동기 에러는 `try/catch`가 잡지 못합니다.** `Promise.reject`나 `setTimeout` 내 `throw` 등 비동기 경로의 예외는 `runMiddlewares`의 `try/catch` 범위를 벗어납니다. 비동기 미들웨어라면 `.catch(next)` 또는 `await` + `try/catch` 조합으로 직접 `next(err)`를 호출해야 합니다.

- **에러 미들웨어의 인자는 정확히 4개여야 합니다.** 함수 선언 시 `err`를 첫 번째 인자로 명시하지 않으면 일반 미들웨어로 취급되어 에러 전달 경로가 동작하지 않습니다.

## ✅ 7. 핵심 정리

- **4인자 시그니처 `(err, req, res, next)`** — 에러 미들웨어를 일반 미들웨어와 구별하는 기준입니다. 인자 수가 달라야 에러 전달 경로가 분리됩니다.

- **`next(err)` 전달** — `next`에 값을 넘기면 일반 미들웨어를 건너뛰고 에러 미들웨어로 직행합니다. `try/catch`는 동기 에러를 이 경로로 안전하게 흘리는 안전망입니다.

- **조기 응답으로 체인 중단** — `return res.end()`는 응답 완료와 함수 종료를 동시에 처리합니다. 인증 미들웨어처럼 특정 조건에서 체인을 멈춰야 할 때 사용합니다.

- **팩토리 패턴** — `staticMiddleware(dir)` 처럼 설정을 인자로 받아 미들웨어 함수를 반환하면 설정이 클로저로 캡슐화됩니다. `express.static()`의 원형입니다.

- **`createReadStream` + `pipe`** — 파일을 메모리에 올리지 않고 스트림으로 전송합니다. 대용량 파일도 일정한 메모리로 처리할 수 있습니다.

다음 5편에서는 `/posts/:id`처럼 동적 URL 파라미터를 추출하는 라우터와, 요청 바디를 파싱하는 JSON 파서 미들웨어를 구현합니다.

<div style="display:flex;gap:12px;flex-wrap:wrap;margin:6px 0 0;justify-content:space-between"><a style="display:inline-flex;align-items:center;gap:10px;text-decoration:none;padding:12px 18px;border-radius:12px 13px 11px 13px;border:1.5px solid #C8443C;background:#FBFBF7;color:#243130;font-size:14px;font-weight:500;box-shadow:0 6px 14px -8px rgba(47,58,57,0.4)" href="https://saver7942.blogspot.com/2026/07/express-36-next.html"><span style="color:#C8443C;font-size:16px">←</span><span><span style="font-size:11.5px;color:#93A97F;display:block">이전 편</span>미들웨어 체인 (3편)</span></a><a style="display:inline-flex;align-items:center;gap:10px;text-decoration:none;padding:12px 18px;border-radius:12px 13px 11px 13px;border:1.5px solid #C8443C;background:#FBFBF7;color:#243130;font-size:14px;font-weight:500;box-shadow:0 6px 14px -8px rgba(47,58,57,0.4)" href="https://saver7942.blogspot.com/2026/07/express-56-json.html"><span><span style="font-size:11.5px;color:#93A97F;display:block;text-align:right">다음 편</span>동적 파라미터·JSON 파서 (5편)</span><span style="color:#C8443C;font-size:16px">→</span></a></div>
