---
title: WebView 하이브리드 앱의 즉시 배포 함정 — git push 한 번에 프로덕션이 바뀐다
slug: webview-hybrid-app-instant-deploy-trap
description: >-
  Capacitor + Next.js 하이브리드 앱은 server.url로 외부 웹을 로드하기 때문에 git push 한 번이 실사용자 화면을
  즉시 바꾼다. 일반 네이티브 앱과의 구조적 차이와 환경 분리 방향을 정리한다.
published_at: '2026-04-19T08:14:11-07:00'
labels:
  - AI 작성
  - 학습 정리
  - Android
source: >-
  /Users/jeonghyeonseung/개발/how_many/.claude/study/2026-04-17/dev-prod-env-separation-plan.md
legacy_url: 'https://saver7942.blogspot.com/'
draft: false
---

## 📦 1. 구조부터: 우리 앱은 "웹을 보여주는 껍데기"입니다

Capacitor로 빌드한 하이브리드 앱의 내부 구조는 다음과 같습니다.

```text
┌─────────────────────────────────────────┐
│  Android 앱 (com.howmany.app)           │
│  ┌───────────────────────────────────┐  │
│  │  WebView (크롬 엔진 같은 것)        │  │
│  │                                    │  │
│  │  https://how-many-mauve            │  │
│  │       .vercel.app 을 로드           │  │
│  │                                    │  │
│  │  (= 실제로 보이는 화면은            │  │
│  │     Next.js 웹사이트)              │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

- **Capacitor** — 웹사이트를 Android/iOS 앱으로 감싸주는 도구입니다. 위 그림의 "껍데기"를 만듭니다.

- **`capacitor.config.ts`의 `server.url`** — 껍데기가 실행될 때 WebView에 로드할 웹 주소입니다. 현재 `https://how-many-mauve.vercel.app`으로 고정되어 있습니다.

---

## 🏗️ 2. 일반 네이티브 앱과의 구조적 차이

앱 코드를 변경했을 때 사용자에게 반영되는 시점이 근본적으로 다릅니다.

| 변경 사항 | 일반 네이티브 앱 | WebView 하이브리드 앱 |
| :---: | :---: | :---: |
| 버튼 색 변경 | 앱 업데이트 필요 (Play 심사 1~3일) | `git push` → 1분 후 모든 기기에 반영 |
| 새 기능 추가 | 앱 업데이트 필요 | `git push` → 즉시 반영 |
| 앱 아이콘 변경 | 앱 업데이트 필요 | 앱 업데이트 필요 (껍데기 영역) |

- 네이티브 앱은 코드가 APK/AAB 안에 들어있으므로, 파일을 새로 배포해야만 사용자 화면이 바뀝니다.

- WebView 하이브리드는 화면을 외부 URL에서 가져오므로, **웹 배포 = 설치된 모든 앱에 즉시 영향**입니다.

이 즉시성이 편리함이자 함정입니다.

---

## 🐛 3. 왜 함정인가 — 내부 테스트 트랙 사고 시나리오

**현재 상태**: `capacitor.config.ts`의 `server.url`이 프로덕션 URL로 하드코딩되어 있습니다.

이 상태에서 다음 시나리오가 발생합니다.

1. 개발자가 미완성 기능을 `main` 브랜치에 `git push`합니다.

2. Vercel이 자동으로 프로덕션 URL에 새 버전을 배포합니다.

3. Play Console 내부 테스트 트랙에 올라간 앱도, **Play Store에서 이미 앱을 설치한 실사용자의 앱도** 같은 URL을 가리킵니다.

4. 결과: QA 중인 미완성 기능이 실사용자 화면에 즉시 노출됩니다.

> **핵심 오해**: "Play 내부 테스트 트랙 = 개발 환경"이 **아닙니다**. 내부 테스트 트랙은 "배포 채널"(누구에게 APK를 전달하는가)일 뿐입니다. APK 안의 `server.url`이 프로덕션을 가리키는 한, 내부 테스터도 실사용자도 같은 웹을 봅니다.

---

## 🛠️ 4. 해결 방향: 환경 분리

함정을 막으려면 세 가지 축을 분리합니다.

| 축 | 분리 방법 | 비용 |
| :---: | :---: | :---: |
| **웹 URL** | `develop` 브랜치 생성 → Vercel이 자동으로 별도 URL 발급 | 무료 (Hobby 플랜) |
| **Android 앱 패키지명** | Gradle Build Flavor로 `com.howmany.app.dev` 별도 빌드 | 무료 (설정 작업 필요) |
| **백엔드(DB)** | Supabase 프로젝트 분리 | 유료, 소규모 팀은 당분간 생략 가능 |

분리 후 목표 구조:

```text
GitHub
 ├─ main 브랜치      ──▶ Vercel prod  ──▶ com.howmany.app      (Play Store)
 └─ develop 브랜치   ──▶ Vercel dev   ──▶ com.howmany.app.dev  (App Distribution)
                                         ↑
                                       같은 폰에 2개 설치 가능
```

- 개발자가 `develop`에 푸시 → dev 앱만 반영되고, 프로덕션 앱은 그대로입니다

- `develop` → `main` 머지 시점에 실사용자에게 릴리즈합니다

빌드 타임 URL 주입 개념 예시 (현재는 기획 단계, 미확정):

```ts
// capacitor.config.ts — 개념 예시
const config = {
  appId: 'com.howmany.app',
  server: {
    url: process.env.FLAVOR === 'dev'
      ? 'https://how-many-dev.vercel.app'
      : 'https://how-many-mauve.vercel.app',
  },
};
```

```groovy
// android/app/build.gradle — 개념 예시
flavorDimensions "environment"
productFlavors {
    dev { applicationIdSuffix ".dev"; versionNameSuffix "-dev" }
    prod { }
}
```

---

## ✅ 5. 핵심 정리

- WebView 하이브리드 앱은 **웹 배포 주기와 앱 배포 주기가 분리**되어 있습니다. `git push`가 즉시 실사용자 화면을 바꿉니다.

- **Play 내부 테스트 트랙은 배포 채널**이지 환경이 아닙니다. `server.url`이 프로덕션을 가리키는 한 내부 테스터와 실사용자는 같은 웹을 봅니다.

- 환경 분리의 최소 단위는 **웹 URL 분리**입니다. Vercel 브랜치 배포로 비용 없이 시작할 수 있습니다.

- Android Build Flavor로 패키지명을 분리하면 한 기기에 dev/prod 앱을 동시에 설치해 비교할 수 있습니다.

- `applicationId`를 바꾸면 Android 입장에서는 완전히 다른 앱이 됩니다. Play Console에도 별개 앱으로 등록해야 합니다.

---

## 🔗 참고 자료

- [Capacitor 공식 config](https://capacitorjs.com/docs/config)

- [Android Build Variants](https://developer.android.com/build/build-variants)

- [Vercel Git 통합 (브랜치별 배포)](https://vercel.com/docs/git)

- [Firebase App Distribution](https://firebase.google.com/docs/app-distribution)
