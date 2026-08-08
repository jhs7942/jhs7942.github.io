---
title: Vite SPA에서 Next.js를 거부한 이유 — 라우팅·메타데이터·초기 로딩 트레이드오프
slug: vite-spa-vs-nextjs-routing-rendering-tradeoffs
description: >-
  ai_quiz 프로젝트를 Vite CSR SPA로 구성한 기술 근거 5가지와, 동적 라우트 부재·OG 이미지·초기 로딩 최적화에 대한
  트레이드오프를 면접 수준으로 정리한다.
published_at: '2026-04-20T00:38:12-07:00'
labels:
  - AI 작성
  - 프로젝트
  - AI 퀴즈
  - Vite
  - React Router
  - SPA
  - SSR
  - 면접-대비
source: >-
  /Users/jeonghyeonseung/개발/AI_quiz/.claude/study/2026-04-20/ai-quiz-routing-rendering.md
tabs: 코드
legacy_url: 'https://saver7942.blogspot.com/2026/04/vite-spa-nextjs.html'
draft: false
---

## 📦 1. 배경

- 관련 프로젝트: ai_quiz / 기술·버전: Vite 8, React 19, React Router 7, TypeScript 5.9

- 상태관리(노트 1)·데이터 레이어(노트 2) 학습 후 페이지 경계에서 두 층이 어떻게 엮이는지 확인합니다.

- 학습 목적: 라우팅·렌더링 구조를 면접 수준의 기술 언어로 설명할 수 있도록 정리

---

## ❓ 2. Q1 — Vite + React 선택 이유 (Next.js 불채택)

**Next.js의 장점은 "서버에서 HTML 사전 생성(SSR/SSG) + API 라우트·서버 액션 통합"입니다.** 이 프로젝트에서 그 장점이 필요 없는 5가지 근거는 아래와 같습니다.

| 각도 | 판단 |
| :---: | :---: |
| SEO 요구사항 약함 | 퀴즈 결과는 개인 콘텐츠라 검색 노출 가치 없음<br>정보성 페이지는 정적 메타태그로 충분 |
| 데이터가 이미 정적 JSON | SSG가 해결하는 "빌드 타임 HTML 사전 생성"이 불필요 |
| 인증·서버 로직 없음 | SSR 서버 세션 검증 불필요 (익명 세션 기반) |
| Vite HMR 속도 | 모듈 단위 ESM HMR로 압도적 |
| 배포 단순성 | 순수 정적 파일 → Vercel·Netlify·S3 어디든 무료 호스팅 |

**추가 이득**: Zustand + SSR의 hydration mismatch 함정을 회피합니다. SSR에서는 `create` 대신 `createStore` + Provider 패턴이 필요한데, CSR 전용이면 복잡도를 우회합니다.

**트레이드오프 (잃은 것)**:

- 동적 OG 이미지 어려움

- 페이지별 메타데이터 없음 (전 페이지 동일)

- 초기 FCP 지연 (CSR 특성)

- 정적 페이지 prerender는 `scripts/prerender.mjs`로 부분 보완 중

**꼬리 질문 대비**:

- Next.js로 다시 짜면? → 동적 OG / `generateMetadata` / Server Components. 단 Zustand Provider 래핑, `session.ts` 전면 재작성이 필요합니다

- Vite 약점? → 이미지·폰트·경로 기반 코드 스플리팅 자동화가 Next.js보다 약합니다

---

## ⚖️ 3. Q2 — 동적 라우트 부재 · Zustand로 상태 전달 트레이드오프

**장점 4가지**:

1. **라우터 설정 간결** — `App.tsx`가 25줄입니다. 동적 라우트면 파라미터 유효성 검증이 필요합니다

2. **상태 소유 단일화** — URL + 스토어 이중 관리 시 동기화 책임 발생을 회피합니다

3. **Deep Link 방어 불필요** — `/quiz/invalid-id` 검증 로직 없이 홈 리다이렉트 한 줄로 끝납니다

4. **프라이버시 기본값** — URL·서버 로그·Referrer에 세션 ID가 노출되지 않습니다

**단점 5가지**:

1. URL 공유가 불가능합니다

2. 뒤로 가기/앞으로 가기가 불일치합니다

3. 새 탭에서 결과 페이지를 직접 열 수 없습니다

4. 세션별 분석 추적이 제한됩니다 (GA)

5. 복원이 `sessionStorage`에 묶입니다 → 탭 닫으면 끝납니다

**시나리오별 영향표**:

| 시나리오 | 결과 |
| :---: | :---: |
| 새로고침 F5 | ✅ `sessionStorage persist` 복원 |
| 탭 닫고 다시 열기 | ❌ 데이터 소실 |
| 친구에게 결과 URL 공유 | ❌ 정보 없음 |
| 새 탭에서 `/result` 열기 | ❌ 홈 리다이렉트 |
| GA 결과 페이지 체류 집계 | ✅ |
| GA 세션별 경로 추적 | ❌ |
| 여러 탭 독립 퀴즈 | ✅ (`sessionStorage` 탭별 독립) |

**확장 시 권장 하이브리드**: `/result?session=xxx` 쿼리스트링 + 스토어 병행. 원칙은 **"URL=진입점, 스토어=작업 상태"** — SPA에서 보편적 패턴입니다.

**꼬리 질문 대비**:

- 왜 애초에 쿼리스트링 안 썼나? → 공유가 핵심 요구사항이 아니었습니다. MVP 단순성 우선

- 뒤로 가기 불일치? → URL만 보고 상태 예측 불가 → QA·디버깅이 까다롭습니다

---

## 🖼️ 4. Q3 — 페이지별 OG 이미지 동적 분기 방법 (처음엔 답하지 못했던 질문)

**핵심 전제**: **SNS 크롤러(카톡/페이스북/트위터)는 JavaScript를 실행하지 않습니다.** 초기 HTML의 `<meta>`만 읽으므로, 클라이언트 DOM 수정은 크롤러에 보이지 않습니다.

**4가지 방법 비교**:

| 방법 | SNS 인식 | 동적 가능 | 비용 |
| :---: | :---: | :---: | :---: |
| **A. react-helmet-async** | ❌ | ✅ | 낮음 |
| **B. 빌드 타임 prerender** | 정적 경로만 ✅ | ❌ | 중 |
| **C. Edge Middleware 메타 치환** | ✅ | ✅ | 중 |
| **D. Next.js 전환 + `generateMetadata` + `opengraph-image.tsx`** | ✅ | ✅ | 높음 |

- **A**: 탭 제목·Google SEO 기본값 개선용입니다. OG 분기엔 부적합합니다.

- **B (현재 프로젝트 채택)**: `scripts/prerender.mjs`로 정적 페이지만 커버합니다. `/result`의 동적 점수 OG는 미구현입니다.

- **C**: Vercel Middleware로 `/result?session=xxx` 가로채 Supabase 조회 → `@vercel/og`로 이미지 생성 → HTML 메타 치환. **Vite SPA 유지하며 동적 OG 해결이 가능합니다**.

- **D**: 가장 정석적이나 전면 재설계 비용이 과도합니다.

**권장 확장 경로**: Q2 쿼리스트링 도입 → C (Edge Middleware + `@vercel/og`). Next.js 전면 전환보다 변경 비용이 훨씬 작습니다.

> **참고**: 카카오는 한 번 스크랩한 URL을 공격적으로 캐시합니다. 개발 중에는 카카오 Developers 공유 디버거에서 수동 새로고침이 필요합니다.

**꼬리 질문 대비**:

- `react-helmet-async` 쓸모? → 탭 제목·Google SEO에 유효합니다 (Google은 JS 실행·지연). SNS만 불가합니다

- Twitter Card? → `og:*` 폴백이 기본입니다. 필요 시 `twitter:*` 별도 지정

---

## 🧭 5. Q4 — 빈 store → 홈 리다이렉트 vs 404 (처음엔 답하지 못했던 질문)

**의미론 차이**:

| 패턴 | 의미 | 적합한 경로 유형 |
| :---: | :---: | :---: |
| 404 Not Found | "경로 자체가 존재하지 않음" | 리소스 경로 (`/post/999`) |
| 빈 store → 홈 리다이렉트 | "경로는 유효·상태만 없음" | 기능 경로 (`/quiz`) |

→ `/quiz`는 기능 경로라 404는 의미론적으로 거짓말입니다. 홈 리다이렉트가 맞습니다.

**UX 비교**:

- 홈 리다이렉트: 재진입 용이·좌절 낮음. 단 침묵의 이동이라 혼란 위험이 있습니다

- 404: 명시적이지만 막다른 길입니다

**현재 코드 버그 가능성**:

```tsx
// QuizPage.tsx:85-89
useEffect(() => {
  if (questions.length === 0) {
    navigate('/')  // ← { replace: true } 없음
  }
}, [questions.length, navigate])
```

- 홈에서 뒤로 가기 누르면 `/quiz` 복귀 → 빈 store → 다시 `/` 리다이렉트. **히스토리 오염 UX 버그입니다**.

**수정안**:

```tsx
useEffect(() => {
  if (questions.length === 0) {
    navigate('/', { replace: true })
    // 추가: toast("진행 중인 퀴즈가 없어 홈으로 이동합니다")
  }
}, [questions.length, navigate])
```

**권장 개선 우선순위**:

1. `{ replace: true }` 추가 — 1줄 수정

2. Toast 메시지 — "진행 중인 퀴즈 없음" 안내

3. sessionStorage 자동 복구 흐름 명시 (주석·훅 분리)

**SEO**: `/quiz`를 검색 노출할 필요가 없으므로 → 두 방식이 동등합니다.

**아키텍처**: SPA/CSR에서는 Navigate 가드가 자연스럽습니다.

**구분 가치**: `App.tsx`의 `<Navigate to="/" />`(경로 자체 없음)와 `QuizPage`의 `navigate('/')`(상태 없음)는 원인이 달라 로깅·분석에서 구분 가치가 있습니다.

**꼬리 질문 대비**:

- `/result/[id]` 같은 리소스 경로면? → 진짜 404가 맞습니다

- React Router v7 `loader`? → `throw redirect('/')`가 더 선언적이고, race condition을 감소시킵니다

---

## 📊 6. Q5 — CSR 초기 로딩 최적화 (처음엔 고려하지 않았던 부분)

**현재 자동으로 되고 있는 것**:

| 계층 | 기여 |
| :---: | :---: |
| Vite 기본값 | 번들 분할·tree shaking·minify·CSS 분리·asset 해싱 |
| `scripts/prerender.mjs` | 정적 페이지 HTML 빌드 타임 생성 → FCP 개선 |
| Tailwind JIT + purge | CSS 번들 작음 |
| CDN (Vercel) | 에지 캐시 |

**개선 여지 (투자 대비 효과 순)**:

**1. React.lazy + Suspense — 페이지별 코드 스플리팅 (최우선)**

```tsx
const QuizPage = lazy(() => import('./pages/QuizPage'))
const ReportPage = lazy(() => import('./pages/ReportPage'))  // recharts 무거움

<Route path="/quiz" element={
  <Suspense fallback={<Spinner />}>
    <QuizPage />
  </Suspense>
} />
```

- Recharts 같은 큰 의존성을 Report 페이지 진입 시점에만 로드합니다.

**2. 폰트·이미지·리소스 힌트**:

- 폰트 `font-display: swap` — FOIT를 제거합니다

- `<img loading="lazy">` — 뷰포트 밖을 지연 로드합니다

- `<link rel="preconnect" href="https://xxx.supabase.co">` — DB 연결 지연을 감소시킵니다

**3. vite-plugin-pwa (Service Worker)**:

- 재방문 시 정적 에셋 캐시 로드 → 거의 즉시 렌더됩니다

- 오프라인에서도 퀴즈 풀이가 가능합니다 (fail-silent 설계와 궁합)

- 주의: `registerType: 'autoUpdate'` + 버전 관리가 필수입니다. 잘못 설정하면 낡은 에셋이 영구 고착됩니다

**4. Lighthouse CI**:

```yaml
- uses: treosh/lighthouse-ci-action@v10
```

- PR마다 Core Web Vitals를 측정하고 회귀를 감지합니다

**Core Web Vitals 지표 정리**:

| 지표 | 의미 | 개선 수단 |
| :---: | :---: | :---: |
| FCP | 첫 콘텐츠 출현 | prerender, critical CSS |
| LCP | 가장 큰 콘텐츠 | 이미지 preload, 폰트 최적화 |
| TTI | 인터랙션 가능 시점 | React.lazy (번들 감소) |
| INP | 클릭→갱신 반응 | React Profiler, memo |
| CLS | 레이아웃 튐 | `font-display: swap` + `size-adjust` |

**원칙: "측정 없이 최적화하지 않습니다."**

1. Lighthouse로 현재 점수를 측정합니다.

2. 가장 낮은 지표·병목을 찾습니다.

3. 그 지점만 개선합니다.

4. 다시 측정해 효과를 확인합니다.

**꼬리 질문 대비**:

- `React.lazy` 없으면 번들 그렇게 커지나? → Recharts 포함 시 수십 KB를 낭비합니다. 체감이 큽니다

- PWA 항상 좋나? → 아닙니다. 캐시 전략을 잘못 설계하면 낡은 에셋이 고착됩니다. `autoUpdate` + 버전 관리가 필수입니다

---

## 🛠️ 7. 실제 코드 참조

**`App.tsx` — 단순 SPA 라우터 (25줄)**:

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/quiz" element={<QuizPage />} />
        <Route path="/result" element={<ResultPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/report" element={<ReportPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
```

**`package.json` 빌드 스크립트**:

```json
"build": "tsc -b && vite build",
"build:full": "tsc -b && vite build && node scripts/prerender.mjs"
```

- `build:full`이 정적 페이지 prerender 포함 빌드입니다. `/about`·`/privacy` 등이 실제 HTML로 생성됩니다.

---

## ⚠️ 8. 주의사항

- **CSR + SNS 공유**: SNS 크롤러는 JS 미실행. 클라이언트 `<meta>` 변경은 공유 썸네일에 반영되지 않습니다. `react-helmet-async`는 SEO 기본값 개선용으로만 씁니다.

- **`navigate()` 기본값의 히스토리 오염**: 상태 가드로 리다이렉트할 때는 항상 `{ replace: true }`를 붙입니다.

- **Zustand + SSR**: hydration mismatch 함정이 있습니다. Next.js 전환 시 Provider 패턴이 필수입니다. CSR 전용이면 회피됩니다.

- **성능 최적화는 측정 기반**: Lighthouse·WebPageTest를 먼저 실행합니다.

- **prerender는 동적 콘텐츠 불가**: 사용자별 점수 같은 런타임 데이터는 Edge Middleware 또는 SSR이 필요합니다.

---

## 🔗 9. 참고 자료

- [Vite 공식 — 프로덕션 빌드](https://vite.dev/guide/build)

- [React Router v7 — lazy & Suspense](https://reactrouter.com/start/library/code-splitting)

- [Vercel — Edge Middleware](https://vercel.com/docs/functions/edge-middleware)

- [`@vercel/og` — 동적 OG 이미지](https://vercel.com/docs/functions/og-image-generation)

- [web.dev — Core Web Vitals](https://web.dev/articles/vitals)

- [Zustand SSR 가이드](https://zustand.docs.pmnd.rs/guides/nextjs)

---

## ✅ 10. 핵심 정리

- **Next.js 거부 근거**는 "서버 불필요 + 정적 데이터 + 배포 단순성 + CSR 친화 Zustand"입니다. "AI 토큰 절약"은 면접에선 "최소 의존성·1인 프로젝트 속도"로 표현합니다.

- **동적 라우트 부재**는 "URL 공유 불가·히스토리 불일치" 단점을 감수하고 "상태 소유 단일화·라우터 간결성"을 택한 의식적 트레이드오프입니다.

- **SNS OG 이미지**는 클라이언트 DOM 수정으로는 해결할 수 없습니다. Vite SPA를 유지하며 해결하려면 Edge Middleware + `@vercel/og`가 Next.js 전환보다 비용이 작습니다.

- **빈 store 리다이렉트**는 `{ replace: true }` 없이 쓰면 히스토리 오염 버그가 생깁니다. 기능 경로에는 홈 리다이렉트, 리소스 경로에는 404가 의미론적으로 맞습니다.

- **CSR 최적화 첫 번째 액션**은 `React.lazy + Suspense`입니다. 측정 없이 최적화하지 않습니다.
