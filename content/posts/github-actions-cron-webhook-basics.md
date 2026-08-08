---
title: GitHub Actions cron 스케줄링 정리 (1/2) — UTC 고정과 지연 특성
slug: github-actions-cron-webhook-basics
description: >-
  GitHub Actions schedule 트리거의 UTC 고정 특성과 혼잡 슬롯 지연 문제, KST 변환 설계, off-peak 예약으로
  지연을 줄인 실측 결과를 정리합니다.
published_at: '2026-04-24T18:58:02-07:00'
labels:
  - AI 작성
  - 학습 정리
  - GitHub Actions
  - CI/CD
source: >-
  C:/Users/jhs02/Desktop/개발/mattermost_bot/.claude/study/2026-04-24/github-actions-cron-webhook-basics.md
series: webhook
part: 1
legacy_url: >-
  https://saver7942.blogspot.com/2026/04/github-actions-cron-mattermost-webhook.html
draft: false
---

매주 월요일 09:00 KST 알림을 목표로 cron을 예약했는데, 실제 도착은 **12:25**였습니다. 설정 실수가 아닙니다. GitHub Actions `schedule` 트리거의 구조적 지연 특성 때문입니다.

왜 3시간 25분이 늦었을까요? 어떻게 예약해야 목표 시각 ±5분 안에 도착할까요? 이 두 질문에 답하기 위해 GitHub Actions cron의 동작 원리와 예약 설계를 정리합니다.

## 📦 1. GitHub Actions란?

**GitHub Actions** — GitHub 리포지토리에서 "조건 충족 시 자동으로 작업을 실행"하는 CI/CD 자동화 서비스입니다.

| 용어 | 설명 |
| :---: | :---: |
| **Workflow** | `.github/workflows/*.yml` 파일 1개 = 워크플로우 1개 |
| **Event (Trigger)** | 워크플로우를 실행시키는 계기. `push`, `schedule`, `workflow_dispatch` 등 |
| **Job** | 워크플로우 안의 작업 단위. 독립된 **Runner(가상 머신)**에서 실행 |
| **Step** | Job 안의 순차 실행 커맨드 1개. 쉘 명령 또는 외부 Action 호출 |
| **Action** | 재사용 가능한 Step 단위. `actions/checkout@v4` 형태 |
| **Runner** | Job을 실행하는 가상 머신. `ubuntu-latest` 등 |
| **Secret** | 민감값(토큰, URL). 리포지토리 Settings에 암호화 저장 |

#### 전체 동작 흐름

용어가 실제로 연결되는 순서는 다음과 같습니다.

```text
Event 발생 (push / schedule 시각 도래 / 수동 버튼)
        │
        ▼
Workflow 매칭 (.github/workflows/*.yml의 on: 조건)
        │
        ▼
Runner 부팅 (ubuntu-latest 가상 머신)
        │
        ▼
Job 실행 ── Step 1: checkout → Step 2: 환경 구성 → Step 3: 스크립트 실행
        │
        ▼
결과 보고 (성공/실패 + 로그)
```

이후 섹션의 지연 문제는 첫 단계 **"schedule 시각 도래 → Workflow 매칭"** 사이에서 발생합니다.

#### 트리거 3종

- `push` / `pull_request` — 코드 변경에 반응. CI(테스트·빌드)에 사용.

- `schedule` — 시간에 맞춰 실행. 알림 봇·정기 리포트에 사용.

- `workflow_dispatch` — 웹 UI "Run workflow" 버튼으로 수동 실행. 디버깅·긴급 발송용.

#### YAML 최소 골격

```yaml
name: Weekly Dev-Event Notify

on:
  schedule:
    - cron: "50 23 * * 0"   # 정기 실행
  workflow_dispatch: {}      # 수동 실행

jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: python -m src.main
```

## ⏰ 2. cron 표현식

**POSIX cron** 표준을 따르는 5필드 문법입니다. GitHub Actions도 동일한 문법을 사용합니다.

```text
 ┌───────────── 분    (0 - 59)
 │ ┌─────────── 시    (0 - 23)
 │ │ ┌───────── 일    (1 - 31)
 │ │ │ ┌─────── 월    (1 - 12)
 │ │ │ │ ┌───── 요일  (0 - 6, 0 = 일요일)
 │ │ │ │ │
 *  *  *  *  *
```

#### 특수 기호

| 기호 | 의미 | 예시 |
| :---: | :---: | :---: |
| `*` | 모든 값 | `* * * * *` = 매분 |
| `,` | 리스트 | `0 9,18 * * *` = 매일 09:00 / 18:00 |
| `-` | 범위 | `0 9 * * 1-5` = 월~금 09:00 |
| `/` | 간격 | `*/15 * * * *` = 15분마다 |

#### 실전 표현식 예시 (모두 UTC 기준)

| 표현식 | 해석 |
| :---: | :---: |
| `0 0 * * *` | 매일 00:00 UTC |
| `0 0 * * 1` | 매주 월요일 00:00 UTC |
| `50 23 * * 0` | 매주 일요일 23:50 UTC |
| `0 0 24 4 *` | 매년 4월 24일 00:00 UTC |
| `*/5 * * * *` | 5분마다 (GitHub Actions 최소 허용 간격) |

> **참고**: **일(DOM)과 요일(DOW)을 동시에 지정**하면 `OR` 관계가 됩니다. `0 9 1 * 1` = "매월 1일 OR 매주 월요일 09:00".

## 🌏 3. 타임존 변환 (KST ↔ UTC)

**KST = UTC + 9시간.** GitHub Actions cron은 `CRON_TZ=` 같은 타임존 지정 문법을 지원하지 않으며 **항상 UTC 고정**입니다.

```text
KST 09:00  →  UTC 00:00
KST 08:50  →  UTC 23:50 (전날)
KST 00:30  →  UTC 15:30 (전날)
```

#### "전날로 넘어가는" 함정

KST 00:00~08:59는 UTC 기준 **전날 15:00~23:59**로 매핑되어 cron 요일 필드도 하루 앞당겨집니다.

| 목표 KST | UTC 예약 시각 | cron DOW 필드 |
| :---: | :---: | :---: |
| 월 09:00 | 일 23:50 (버퍼 포함) | `0` (Sun) |
| 월~금 09:00 | 일~목 23:50 | `0-4` (Sun~Thu) |
| 화 14:00 | 화 05:00 (같은 날) | `2` (Tue) |

#### cron 요일 인덱스

| 숫자 | 요일 |
| :---: | :---: |
| 0 | 일요일 (Sunday) |
| 1 | 월요일 (Monday) |
| 2 | 화요일 (Tuesday) |
| 3 | 수요일 |
| 4 | 목요일 |
| 5 | 금요일 |
| 6 | 토요일 |

## 🔍 4. GitHub Actions cron의 지연 특성

GitHub 공식 문서에 명시된 구조적 제약입니다.

> *"The schedule event can be delayed during periods of high loads of GitHub Actions workflow runs. High load times include the start of every hour."*
> — GitHub Docs: Events that trigger workflows

- `schedule`은 **정확한 시각 보장이 없습니다.**

- 혼잡 시 수 분~수 시간 지연 발생.

- **가장 붐비는 슬롯**: `분 0` + `시 0 UTC` 조합.
  - 분 0 → 모든 hourly cron 집중 지점
  - 시 0 UTC → 전 세계 "하루 시작" 기준

#### 실측 비교

| 설정 | 목표 KST | 실제 도착 KST | 지연 |
| :---: | :---: | :---: | :---: |
| `0 0 24 4 *` (혼잡 슬롯) | 09:00 | **12:25** | **+3h 25m** |
| `50 23 * * 0-4` (off-peak) | 09:00 | 09:00~09:05 | +10~15m |

#### 지연 최소화 3원칙

1. **분 0을 피합니다** — `50`, `37`, `13` 같은 임의값을 사용합니다.

2. **시 0 UTC를 피합니다** — `23`, `01` 같은 인접값을 사용합니다.

3. **목표 시각보다 10~15분 일찍 예약합니다** — 평균 지연을 버퍼로 흡수합니다.

## 🛠️ 5. 실제 적용 — off-peak 예약 설계

위 3원칙을 적용해 "매주 월요일 09:00 KST 도착"을 이렇게 예약합니다.

```yaml
# 스케줄 설계:
#   목표: 매주 월요일 09:00 KST 근처 도착
#   예약: 일요일 23:50 UTC (= 월요일 08:50 KST)
#   근거: 분 0 / 시 0 UTC 혼잡 슬롯 회피 → 지연 10~15분으로 안정화
on:
  schedule:
    - cron: "50 23 * * 0"
  workflow_dispatch: {}
```

#### cron 표현식 분해

```text
50 23 * * 0
│  │  │ │ └─ 요일: 일요일 (UTC)
│  │  │ └─── 월:   매월
│  │  └───── 일:   매일
│  └──────── 시:   23시 UTC
└─────────── 분:   50분
```

= 일요일 23:50 UTC = 월요일 08:50 KST → 평균 +10~15분 지연 반영 → **월요일 09:00~09:05 KST** 수신.

#### 적용 결과 (Before / After)

| 구분 | cron 예약 | 목표 KST | 실제 도착 KST | 지연 |
| :---: | :---: | :---: | :---: | :---: |
| **Before** | `0 0 24 4 *` (혼잡 슬롯) | 09:00 | 12:25 | +3h 25m |
| **After** | `50 23 * * 0` (off-peak + 버퍼) | 09:00 | 09:00~09:05 | 목표 시각 내 흡수 |

코드 변경 없이 **예약 슬롯만 옮겨서** 지연을 3시간대에서 목표 범위 안으로 줄였습니다.

## ⚠️ 6. 주의사항

#### cron 함정

| 실수 | 결과 | 올바른 대응 |
| :---: | :---: | :---: |
| `0 0 * * *` (UTC 자정 정각) | 3시간+ 지연 | `50 23 * * *` 또는 `13 0 * * *` 같은 off-peak로 |
| `0 9 * * 1` (KST로 착각) | UTC 09:00 = KST 18:00에 실행 | UTC-9 변환 필수 |
| 분을 10, 20, 30 등 "예쁜 수"로 | 몰리는 슬롯 | 37, 53 같은 임의값 권장 |

- **`CRON_TZ=` 미지원**: GitHub Actions는 타임존 지정 문법을 지원하지 않습니다.

- **스케줄러는 default branch만 참조**: 다른 브랜치에서 cron을 수정해도 반영되지 않습니다.

- **60일 비활성 시 자동 정지**: default branch에 60일간 push가 없으면 schedule 워크플로우가 비활성화됩니다.

- **최소 실행 간격 5분**: `*/1 * * * *`은 무시되고 5분 간격으로 조정됩니다.

#### GitHub Actions 일반 함정

- **Secret 대소문자 구분**: `MATTERMOST_WEBHOOK_URL` ≠ `mattermost_webhook_url`.

- **`workflow_dispatch`는 default branch에서만**: 다른 브랜치에서 추가한 수동 실행 버튼은 UI에 표시되지 않을 수 있습니다.

- **PR에서 secret 접근 제한**: fork에서 온 PR은 보안상 secret 접근이 제한됩니다. 정식 배포는 항상 base 리포의 default branch에서 진행합니다.

- **`ubuntu-latest`는 주기적으로 버전이 바뀝니다**: 재현성이 중요하면 `ubuntu-24.04` 같은 고정 버전을 권장합니다.

## ✅ 7. 핵심 정리

- **GitHub Actions cron은 UTC 고정**입니다. `CRON_TZ=`를 지원하지 않으므로 KST - 9h 변환은 직접 계산해야 합니다.

- **혼잡 슬롯(`분 0`, `시 0 UTC`)을 피하면 지연이 3시간+에서 10~15분 수준으로 줄어듭니다.** 목표 시각보다 10~15분 이른 예약으로 버퍼를 확보합니다.

- **일(DOM) + 요일(DOW) 동시 지정은 OR 관계**가 됩니다. 의도치 않은 이중 실행이 발생할 수 있습니다.

- **리포지토리 60일 비활성 시 schedule이 자동 정지**됩니다. 장기 운영 서비스는 별도 확인이 필요합니다.

## 🔗 참고 자료

#### GitHub Actions 공식

- [Workflow syntax](https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions)

- [Events that trigger workflows (schedule 섹션)](https://docs.github.com/en/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows#schedule)

- [Using secrets in GitHub Actions](https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions)

#### cron 문법

- [crontab.guru](https://crontab.guru/) — cron 표현식 실시간 해석 도구.

- [Wikipedia: Cron](https://en.wikipedia.org/wiki/Cron)
