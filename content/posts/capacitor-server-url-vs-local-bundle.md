---
title: Capacitor 앱 배포 전략 — server.url vs 로컬 번들
slug: capacitor-server-url-vs-local-bundle
description: 'Capacitor의 두 가지 웹 콘텐츠 제공 방식(로컬 번들, server.url)을 비교하고, 프로젝트 상황별 선택 기준을 정리한다.'
published_at: '2026-04-08T08:27:31-07:00'
labels:
  - AI 작성
  - 학습 정리
  - Capacitor
source: >-
  C:/Users/jhs/OneDrive/바탕
  화면/개발/how_many/.claude/study/2026-04-08/capacitor-server-url-vs-local-bundle.md
legacy_url: 'https://saver7942.blogspot.com/2026/04/capacitor-serverurl-vs.html'
draft: false
---

## 📦 1. 두 가지 방식이란?
- **로컬 번들** (기본값) — `webDir`에 지정된 정적 빌드 결과물을 APK 안에 포함하는 방식

- **server.url** (원격 로드) — 앱이 외부 URL을 WebView에 직접 로드하는 방식. 로컬 에셋 불필요

> **환경**: Capacitor 8, Next.js 16

## ⚖️ 2. 방식 비교
| 항목 | 로컬 번들 | server.url (원격) |
| :---: | :---: | :---: |
| 배포 속도 | 느림 (빌드→싱크→APK) | 빠름 (git push면 끝) |
| 웹/앱 일관성 | 버전 불일치 가능 | 항상 동일 |
| 오프라인 | UI 로딩 가능 | 불가 |
| 초기 로딩 속도 | 빠름 (로컬) | 네트워크 의존 |
| 앱 스토어 심사 | 유리 | 리젝 가능성 있음 |
| 개발 편의성 | 낮음 | 높음 |

## 🛠️ 3. 설정 코드

### 로컬 번들 (기본)
```ts
// capacitor.config.ts
const config: CapacitorConfig = {
  webDir: 'out',
  server: {
    androidScheme: 'https',
  },
};
```
- 빌드 플로우: `next build` → `npx cap sync` → Android Studio 빌드

### server.url (원격)
```ts
// capacitor.config.ts
const config: CapacitorConfig = {
  webDir: 'out',
  server: {
    androidScheme: 'https',
    url: 'https://how-many-mauve.vercel.app',
  },
};
```
- 배포 플로우: `git push` → Vercel 자동 배포 → 앱에 즉시 반영

### 개발 시 라이브 리로드 (선택)
```bash
npx cap run android --livereload --external
```

## 🔍 4. 선택 기준 — "앱이 오프라인에서 의미가 있는가?"
- 네트워크 필수 앱(Supabase Realtime, 외부 API 등)이면 오프라인 지원이 무의미 → **server.url 유리**

- 오프라인에서도 핵심 기능이 동작해야 하면 → **로컬 번들 필수**

## ⚠️ 5. 주의사항
- **앱 스토어 출시 시에는 로컬 번들로 전환** — Google Play, App Store 모두 순수 웹뷰 앱(웹사이트 래퍼)을 리젝하는 정책이 있습니다

- **server.url 사용 시 빌드 동기화를 잊기 쉬움** — 로컬 번들로 전환할 때 `npm run build:android`를 잊지 말 것

- **환경 분기 패턴**:
  ```ts
  const isDev = process.env.NODE_ENV === 'development';
  server: {
    androidScheme: 'https',
    ...(isDev && { url: 'https://how-many-mauve.vercel.app' }),
  }
  ```
- **Capacitor 플러그인은 양쪽 모두 동작** — 네이티브 플러그인(Haptics, Share, Clipboard 등)은 WebView-네이티브 브릿지를 통해 통신하므로 웹 콘텐츠 소스와 무관

- **CORS 주의** — 원격 URL 로드 시 `androidScheme: 'https'`와 Vercel 도메인 간 CORS 이슈 발생 가능

## ✅ 6. 핵심 정리
- 오프라인이 의미 없는 앱이면 개발 단계에서 **server.url**이 압도적으로 편리합니다

- 앱 스토어 출시 전에는 반드시 **로컬 번들로 전환**해야 리젝을 피할 수 있습니다

- `server.url` ↔ 로컬 번들 전환 시 **빌드 동기화**를 잊는 것이 가장 흔한 실수입니다

- Capacitor 네이티브 플러그인은 어느 방식에서든 정상 동작합니다

> **참고**: [Capacitor 공식 문서 - Server Configuration](https://capacitorjs.com/docs/config#server)
