---
title: Google Play Console MCP로 Android 앱 자동 빌드·배포 설정
slug: google-play-console-mcp-auto-deploy
description: >-
  Capacitor 기반 Android 앱을 Claude Code MCP 서버로 자동화하는 방법. AAB 빌드부터 Internal 업로드,
  Production staged rollout까지 전체 플로우 정리.
published_at: '2026-04-19T08:13:52-07:00'
labels:
  - AI 작성
  - 학습 정리
  - Android
  - Claude Code
source: >-
  /Users/jeonghyeonseung/개발/how_many/.claude/study/2026-04-16/google-play-console-mcp-auto-deploy.md
draft: false
---

## 📦 1. 배경

- Capacitor 기반 Android 앱을 Play Console에 배포할 때 AAB 빌드 → Play Console UI 업로드를 매번 수동으로 반복하는 비효율 존재

- Claude Code 세션에서 한 번의 명령으로 빌드부터 업로드까지 자동화하고, Internal → Production 단계적 롤아웃까지 제어하는 것이 목표

---

## 🔍 2. 핵심 개념

### MCP(Model Context Protocol) 서버

- **MCP(Model Context Protocol)** — Claude Code가 외부 도구·API를 직접 호출할 수 있게 해주는 프로토콜

- `.mcp.json`에 서버를 등록하면 Claude가 해당 도구를 세션 내에서 사용할 수 있습니다

### Google Play Console MCP 서버 비교

| MCP 서버 | AAB 업로드 | 릴리즈 관리 | 특징 |
| :---: | :---: | :---: | :---: |
| **AgiMaulana/GooglePlayConsoleMcp** | O | 전체 트랙 관리 | Python, 가장 완성도 높음 |
| BlocktopusLtd/mcp-google-play | X | 리스팅·리뷰 관리 | npm, 업로드 불가 |
| dmitry-kotorov/google-play-console-mcp | X | 리스팅 전용 | 현지화 특화 |

`AgiMaulana/GooglePlayConsoleMcp` 선택. `upload_artifact` 도구가 APK/AAB 자동 감지 + 트랙 릴리즈 생성을 원자적으로 처리합니다.

### Google Play 트랙 구조

| 트랙 | 심사 | 전파 시간 | 용도 |
| :---: | :---: | :---: | :---: |
| **Internal testing** | 사실상 없음 | 수 분 | 스모크 테스트 (최대 100명) |
| Closed testing (α) | 있음 | 수 시간~1일 | 비공개 그룹 테스트 |
| Open testing (β) | 있음 | 1~3일 | 공개 베타 |
| **Production** | 있음 | 1~7일 | 정식 배포 |

> **참고**: 1인 개발에서 Closed/Open testing은 오버스펙입니다. Internal에서 충분히 검증 후 Production staged rollout이 실질적 안전망이 됩니다.

### Android Studio 없이 CLI 빌드 가능 여부

**가능합니다.** 필요한 것은 JDK + Android SDK + Gradle wrapper뿐. Android Studio GUI는 불필요합니다.

```bash
npm run build:android   # Next.js static export + cap sync
cd android && JAVA_HOME=/Applications/Android\ Studio.app/Contents/jbr/Contents/Home \
  ./gradlew bundleRelease
```

- `JAVA_HOME`이 Android Studio 내장 JBR을 가리키지만, Studio 앱을 실행하는 것이 아니라 JDK만 참조합니다

---

## 🛠️ 3. 실제 적용

### 3-1. MCP 서버 등록 (`.mcp.json`)

```json
{
  "mcpServers": {
    "google-play-console": {
      "command": "uvx",
      "args": ["google-play-mcp"],
      "env": {
        "GOOGLE_APPLICATION_CREDENTIALS": "/Users/jeonghyeonseung/.config/gcloud/howmany-play-sa.json"
      }
    }
  }
}
```

- `uvx`로 실행 — 가상환경 자동 격리

- 환경변수는 `${HOME}` 확장이 미보장이므로 **절대경로** 사용

### 3-2. GCP 서비스 계정 발급 절차

1. Google Cloud Console → 프로젝트 생성/선택

2. API 라이브러리 → Google Play Android Developer API 활성화

3. API 라이브러리 → Google Play Developer Reporting API 활성화

4. IAM → 서비스 계정 → 새 서비스 계정 생성

5. 서비스 계정 → 키 → 새 키 만들기 → JSON 선택 → 다운로드

### 3-3. Play Console 권한 부여

- "API 액세스" 메뉴가 최신 Play Console에서 사라짐

- 대안: **사용자 및 권한** → **신규 사용자 초대** → 서비스 계정 이메일 입력

- 필요 권한: 앱 정보 보기, 출시 관리, 프로덕션 출시

### 3-4. SA 키 유출 방지 (`.gitignore`)

```gitignore
# Google Cloud Service Account 키 (유출 방지)
*-sa.json
*service-account*.json
```

### 3-5. versionCode 관리 전략

| 방식 | 장점 | 단점 |
| :---: | :---: | :---: |
| git commit 수 기반 | 자동 | rebase·브랜치 전환 시 역행 가능 |
| 타임스탬프 기반 | 항상 증가 | 숫자 큼, 의미 불명 |
| **build.gradle 현재 값 +1** | 단순·안전·명시적 | 배포 시 파일 수정 필요 |

채택: **build.gradle 직접 수정** 방식. 배포 시 Claude가 Edit 도구로 versionCode +1 수정합니다.

### 3-6. 릴리즈 노트 생성 방식

| 방식 | 채택 |
| :---: | :---: |
| 커밋 메시지 자동 추출 | X (개발 용어 노출) |
| 수동 작성 | X (매번 수고) |
| **Claude 생성** | O (커밋 로그 → 한국어 사용자 친화 문구) |

배포 시 `git log` → Claude가 한국어 변환 → 사용자 확인 후 MCP 전달하는 방식으로 운용합니다.

### 3-7. 정기 배포 플로우

```text
1. Claude: build.gradle versionCode +1 수정
2. Claude: npm run build:android
3. Claude: ./gradlew bundleRelease
4. Claude: git log → 릴리즈 노트 생성 → 사용자 확인
5. Claude: MCP upload_artifact(track=internal)
6. 사용자: 기기 테스트
7. 사용자: "프로덕션 10%로 승격"
   → Claude: MCP promote_release(to=production, rollout=0.1)
8. 24~48시간 후 → Vitals 확인 → 50% → 100%
```

### 3-8. MCP 연동 테스트 결과

```text
mcp__google-play-console__list_tracks(package_name="com.howmany.app")
→ production: versionCode 7, completed 100%
→ internal: versionCode 1, completed 100%
```

---

## ⚠️ 4. 주의사항

- **SA JSON 키 발급 후 24~36시간** 경과 후 정상 동작할 수 있습니다 — Google 전파 지연

- **`.mcp.json`의 경로에 `${HOME}` 사용 금지** — Claude Code MCP 로더가 확장을 보장하지 않음. 절대경로 필수

- **Play Console "API 액세스" 메뉴 위치 변경** — 2025~2026 기준 설정 페이지에 없음. "사용자 및 권한"에서 서비스 계정 초대로 대체

- **versionCode는 단조 증가 필수** — Play Console은 이전 versionCode보다 낮은 값 거부. 수동 관리 시 현재 프로덕션 최신 값 확인 필요

- **첫 업로드는 수동 필수** — API는 이미 등록된 앱에만 업로드 가능. 패키지명 생성 + 첫 릴리즈는 Play Console UI에서 진행

- **프로덕션 rollout 중 문제 발견 시** — `halt_rollout` 호출. 버전 다운그레이드는 불가하므로 핫픽스 새 버전 빌드 필요

---

## ✅ 5. 핵심 정리

- Google Play Console MCP 서버 중 AAB 업로드까지 지원하는 것은 `AgiMaulana/GooglePlayConsoleMcp`뿐입니다

- `.mcp.json` 환경변수 경로는 반드시 절대경로로 작성합니다 (`${HOME}` 확장 미보장)

- 1인 개발 배포 전략은 Internal 검증 → Production staged rollout으로 충분합니다

- versionCode 관리는 build.gradle 직접 수정 방식이 단순하고 안전합니다

- SA 키 발급 직후 API 연동 오류가 발생하면 24~36시간 대기 후 재시도합니다

- 첫 번째 업로드(패키지명 등록)는 MCP가 아닌 Play Console UI에서 수동으로 진행해야 합니다

---

## 🔗 참고 자료

- [AgiMaulana/GooglePlayConsoleMcp (Glama)](https://glama.ai/mcp/servers/AgiMaulana/GooglePlayConsoleMcp)

- [BlocktopusLtd/mcp-google-play (GitHub)](https://github.com/BlocktopusLtd/mcp-google-play)

- [Google Play Developer API 자동화 가이드](https://guides.codepath.org/android/automating-publishing-to-the-play-store)

- [Fastlane upload_to_play_store](https://docs.fastlane.tools/actions/upload_to_play_store/)

- [BACKND Google Store 설정 가이드](https://docs.backnd.com/guide/console-guide/server-setting/store/googlestore/)
