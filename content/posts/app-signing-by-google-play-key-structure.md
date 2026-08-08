---
title: App Signing by Google Play — 키 구조와 분실 리스크 완전 정리
slug: app-signing-by-google-play-key-structure
description: >-
  Google Play 앱 서명 서비스의 동작 원리, 업로드 키와 앱 서명 키 차이, 시나리오별 분실 리스크를 정리한다. 2021년 이후 신규
  앱 필수 적용 기준.
published_at: '2026-04-24T18:57:54-07:00'
labels:
  - AI 작성
  - 학습 정리
  - Android
source: >-
  C:/Users/jhs02/Desktop/개발/how_many/.claude/study/2026-04-18/app-signing-by-google-play.md
legacy_url: 'https://saver7942.blogspot.com/2026/04/app-signing-by-google-play.html'
draft: false
---

## 📦 1. 배경

- **Linear HM-15** 이슈("[Infra] 릴리즈 키스토어 백업") 처리 중 "키스토어를 Linear에 올리면 안 되나?" 논의가 발생했습니다

- 키 유출·분실 리스크를 정확히 판단하려면 현재 서명 구조 파악이 선행 조건입니다

- 2021년 8월 이후 신규 앱은 **App Signing by Google Play** 필수 → 서비스 동작 원리와 키 종류별 역할 정리가 필요합니다

---

## 🔍 2. 핵심 개념

### App Signing by Google Play란

Google이 앱의 최종 서명 키(**앱 서명 키**)를 대신 보관·사용해주는 서비스입니다.

- 개발자는 AAB를 **업로드 키**로 서명해서 Play Console에 업로드합니다

- Google이 AAB를 검증한 뒤 Google 보관 중인 **앱 서명 키**로 재서명하여 사용자에게 배포합니다

- 도입: 2017년 / 의무화: 2021년 8월 (신규 앱부터 필수)

- 내부 저장소: **Google Cloud KMS** (HSM 기반 하드웨어 보안)

### 동작 구조 비교

```text
[전통 방식 - 2021년 이전]
개발자 키스토어 → APK 직접 서명 → Play Store 업로드 → 사용자 설치
      ↑
  분실하면 끝 (업데이트 불가, 앱 재등록만 가능)

[App Signing by Google Play]
업로드 키 (개발자 보관)         앱 서명 키 (Google Cloud KMS)
         │                              │
         ▼                              ▼
   AAB 서명 → Play Console 업로드 → Google이 재서명 → 사용자 설치
                                         │
                                     Split APKs 동적 생성
                                     (화면 밀도·ABI·언어별)
```

### 두 가지 키의 역할

| **키 종류** | **보관 주체** | **역할** | **분실 시 대응** |
| :---: | :---: | :---: | :---: |
| 업로드 키 (upload key) | 개발자 | Play Console에 AAB 올릴 때 인증 | Google 지원팀 리셋 요청 → **복구 가능** |
| 앱 서명 키 (app signing key) | Google Cloud KMS | 사용자 기기 설치 시 검증하는 최종 서명 | Google이 영구 보관 → 개발자가 분실할 일 없음 |

> **참고**: 업로드 키는 "이 AAB를 Play Console이 받을 자격이 있는가"를 증명하고, 앱 서명 키는 "사용자 기기에 설치될 APK가 진짜인가"를 증명합니다. 두 키는 서로 다른 키입니다.

### 도입 배경

1. **키 분실 방지** — 2010년대 소규모 개발자들이 키스토어 분실로 앱 업데이트 영구 불가 사태를 반복했습니다. 앱 재등록 시 기존 리뷰·다운로드 수·순위가 모두 초기화됩니다.

2. **AAB 최적화** — Google이 서명 권한을 가져야 기기별 Split APK를 동적으로 생성·재서명할 수 있습니다. 사용자는 자기 기기에 필요한 리소스만 다운받아 설치 용량이 줄어듭니다.

3. **보안 강화** — 개발자 노트북보다 Google Cloud KMS + HSM이 안전합니다. 내부자 접근도 제한됩니다.

---

## 🧭 3. 앱 등록 시나리오별 비교

| **시나리오** | **업로드 키** | **앱 서명 키** | **로컬 keystore 의미** | **분실 리스크** |
| :---: | :---: | :---: | :---: | :---: |
| **A. Google에 원본 키 업로드** | Google이 관리 | Google 보관 | 업로드 키 = 앱 서명 키 (동일) | 낮음 |
| **B. 별도 업로드 키 생성** | 개발자 보관 | Google 보관 | 업로드 키 (앱 서명 키는 Google에) | 매우 낮음 |
| **C. App Signing 비활성화 (구형)** | — | 개발자 보관 | 앱 서명 키 그 자체 | 매우 높음 (분실 = 업데이트 영구 불가) |

> **참고**: 2021년 8월 이후 신규 앱은 C 시나리오를 선택할 수 없습니다.

---

## 🛠️ 4. 실제 적용 — 몇명이니 프로젝트 확인 결과

### 시나리오 확인 방법

Play Console → `몇명이니` 앱 → **설정** → **앱 서명** 메뉴:

- **"Play 앱 서명 사용 중"** 표시 있음 → A 또는 B

- SHA-1 지문이 **1개** → A (업로드 키 = 앱 서명 키)

- SHA-1 지문이 **2개** (업로드 키 + 앱 서명 키 각각) → B (권장 구조)

### 확인 결과: B 시나리오 확정 (2026-04-18)

Play Console 앱 서명 페이지: `https://play.google.com/console/u/0/developers/7962901105868160912/app/4974062925009946290/keymanagement`

| **키 종류** | **SHA-1 지문** | **보관 주체** |
| :---: | :---: | :---: |
| 앱 서명 키 | `38:3C:46:46:21:5D:E0:2F:3E:36:AA:B7:42:FC:F1:7D:2A:E1:B6:19` | Google Cloud KMS |
| 업로드 키 (`howmany-release.keystore`) | `41:12:99:70:DC:37:EF:CC:E5:6A:E2:C7:FD:B4:89:18:B9:06:58:74` | 로컬 |

**리스크 평가:**

- 로컬 keystore **분실** → "업로드 키 재설정 요청"으로 복구 가능합니다 (2~3일 소요)

- 로컬 keystore **유출** → 업로드 키 재설정 시 유출본을 무력화합니다. 사용자 기기는 영향이 없습니다

- 앱 업데이트 영구 불가 사태는 **발생 불가능합니다**

**Linear HM-15 재평가**: B 시나리오 확정 후 High priority → Medium/Low 수준으로 하향 가능합니다.

### B 시나리오에서 업로드 키 분실 시 복구 절차

1. Play Console → 설정 → 앱 서명 → "업로드 키 재설정 요청"

2. `keytool`로 새 keystore 생성

3. 새 키의 PEM 공개키를 Google에 업로드

4. Google 승인 후 2~3일 내 전환 완료

5. 전환 후부터는 새 업로드 키로 AAB를 서명합니다

→ 앱 서명 키는 그대로 유지되므로 **사용자 기기에서는 아무 변화 없이 업데이트를 수신합니다**.

### 키스토어 파일 구조

```text
android/
  howmany-release.keystore    # 업로드 키 (B 시나리오 확정 — 2026-04-18)
                              # SHA-1: 41:12:99:70:...
  key.properties              # 키 비밀번호 (storePassword, keyAlias, keyPassword)
```

- `key.properties`는 `.gitignore`로 git 추적에서 제외합니다

- 둘 다 분실해도 업로드 키 재설정 요청으로 복구할 수 있습니다

### Capacitor AAB 빌드 체인

```bash
npm run build:android:prod         # Next.js 빌드 + Capacitor sync (prod URL)
cd android && ./gradlew bundleRelease
# → android/app/build/outputs/bundle/release/app-release.aab (업로드 키로 서명됨)
# → Play Console 업로드
# → Google이 앱 서명 키로 재서명
# → 사용자에게 Split APK 배포
```

### 키 백업 권장 방식

1. **1Password / Bitwarden** — keystore 파일 + key.properties를 "Secure Note"에 첨부합니다 (E2E 암호화 + 2FA)

2. **로컬 암호화 + 다중 클라우드** — `gpg -c howmany-release.keystore`로 암호화 후 iCloud + Google Drive 양쪽에 업로드합니다. 패스프레이즈는 1Password에 별도 저장합니다

3. **절대 금지** — Linear 이슈 첨부, Slack 메시지, 공유 Google Drive(멤버 권한), git 저장소

---

## ⚠️ 5. 주의사항

### 업로드 키와 앱 서명 키 혼동 금지

- "키스토어 잃어버리면 앱 업데이트 못 한다"는 오래된 정보입니다. 2021년 이후 신규 앱은 업로드 키 분실 ≠ 앱 서명 키 분실입니다.

- 디버그 빌드용 `debug.keystore`와 릴리즈용 `howmany-release.keystore`는 완전히 별개입니다. 디버그 키로 서명된 AAB는 Play Console에 업로드할 수 없습니다.

### App Signing 활성화는 되돌릴 수 없음

- 한번 App Signing by Google Play를 활성화하면 opt-out이 불가능합니다

- Google이 앱 서명 키를 보관하게 되고, 개발자는 다시는 원본 앱 서명 키를 직접 다룰 수 없습니다

### versionCode 규칙

- `applicationId`가 동일하면 versionCode는 모든 트랙 통합 전역 단조 증가가 필수입니다

- Play Console이 같은 앱의 모든 트랙에서 versionCode 유일성을 강제합니다

- App Signing과는 별개의 제약이지만 함께 알아둘 것입니다

### 오픈소스 프로젝트에서의 함정

- GitHub 공개 저장소에 `key.properties`를 실수로 커밋한 사례가 많습니다

- `key.properties`만 유출돼도 키스토어 탈취가 쉬워집니다 → `.gitignore` 확인 필수

---

## ✅ 6. 핵심 정리

- **업로드 키 ≠ 앱 서명 키**: 2021년 이후 신규 앱에서 두 키는 분리돼 있습니다. 로컬 keystore 분실·유출은 복구 가능한 사고입니다.

- **앱 업데이트 영구 불가 사태**: 2021년 이후 신규 앱에서는 발생 불가능한 구조입니다.

- **B 시나리오가 권장 구조**: 업로드 키 유출 시 앱 서명 키에 영향 없이 업로드 키만 교체할 수 있습니다.

- **키 백업은 암호화 후 오프사이트**: 1Password 또는 gpg 암호화 + 다중 클라우드. git/Linear/Slack은 절대 금지입니다.

- **App Signing 활성화는 비가역적**: 활성화 전 시나리오 검토가 필수이며, 이미 활성화된 경우 opt-out이 불가능합니다.

---

## 🔗 참고 자료

- [Android Developers — Use Play App Signing](https://developer.android.com/studio/publish/app-signing)

- [Google Play Console Help — App signing by Google Play](https://support.google.com/googleplay/android-developer/answer/9842756)

- [Android Developers — Sign your app](https://developer.android.com/studio/publish/app-signing#sign-apk)

- [Medium — Why Google Play App Signing is actually useful (Paul Ruiz, 2019)](https://proandroiddev.com/google-play-app-signing-bcbc75c5c81)
