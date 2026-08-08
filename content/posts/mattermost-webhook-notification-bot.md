---
title: Mattermost Webhook 알림 봇 구축 (2/2) — 아키텍처와 최종 워크플로우
slug: mattermost-webhook-notification-bot
description: >-
  Mattermost Incoming Webhook 연동 방법, 알림 봇의 레이어 아키텍처, GitHub Actions 최종 워크플로우 구성과
  Webhook 보안 주의사항을 정리합니다.
published_at: '2026-07-03T21:05:04-07:00'
labels:
  - AI 작성
  - 학습 정리
  - GitHub Actions
  - CI/CD
source: >-
  C:/Users/jhs02/Desktop/개발/mattermost_bot/.claude/study/2026-04-24/github-actions-cron-webhook-basics.md
series: webhook
part: 2
legacy_url: 'https://saver7942.blogspot.com/2026/07/mattermost-webhook-22.html'
draft: false
---

[1편](https://saver7942.blogspot.com/2026/04/github-actions-cron-mattermost-webhook.html)에서 "언제 실행할지"(GitHub Actions cron 스케줄링과 지연 특성)를 정리했습니다. 이번 편은 "무엇을 실행할지" — 실행된 봇이 Mattermost로 알림을 보내기까지의 구조를 정리합니다.

> **시리즈**: ① [GitHub Actions cron 스케줄링](https://saver7942.blogspot.com/2026/04/github-actions-cron-mattermost-webhook.html) → **② Mattermost Webhook 알림 봇 구축 (이 글)**

#### 목차

1. [Mattermost Incoming Webhook](#1-mattermost-incoming-webhook)

2. [알림 봇 아키텍처](#2)

3. [최종 워크플로우](#3)

4. [주의사항](#4)

5. [핵심 정리](#5)

## 📨 1. Mattermost Incoming Webhook

**Webhook** — 이벤트 발생 시 서버가 지정된 URL로 HTTP 요청을 보내는 "역방향 API"입니다.

```text
일반 API:   Client ──GET /data──▶ Server
            Client ◀──JSON──      Server

Webhook:    Server ──POST /mywebhook──▶ Client  (이벤트 발생 시)
            Server ◀──200 OK────        Client
```

**Mattermost Incoming Webhook** — 외부 시스템이 Mattermost로 메시지를 밀어넣는 방식입니다.

#### 동작 흐름

1. Mattermost 관리 페이지에서 Incoming Webhook 생성 → 고유 URL 발급.

2. 해당 URL에 JSON 페이로드를 POST → 지정 채널에 메시지 등장.

#### curl 최소 예시

```bash
curl -X POST -H 'Content-Type: application/json' \
  -d '{"text": "Hello from bot!"}' \
  https://your.mattermost.com/hooks/abc123xyz
```

#### 페이로드 주요 필드

```json
{
  "text": "메시지 본문 (마크다운 지원)",
  "username": "봇 이름 (표시용)",
  "icon_emoji": ":robot_face:",
  "channel": "override-channel",
  "attachments": [
    {
      "color": "#36a64f",
      "title": "카드 제목",
      "text": "카드 본문",
      "fields": [
        {"title": "필드명", "value": "값", "short": true}
      ]
    }
  ]
}
```

- `text` — 단순 한 줄 메시지용.

- `attachments` — 색상 카드, 구조화된 정보 표현용.

#### 보안 규칙

- **Webhook URL = 인증 토큰 그 자체.** URL을 아는 사람은 누구나 해당 채널에 메시지를 쓸 수 있습니다.

- 코드 하드코딩·Git 커밋 절대 금지.

- GitHub Actions에서는 Secrets에 저장하고 `${{ secrets.MATTERMOST_WEBHOOK_URL }}`로 주입합니다.

## 🏗️ 2. 알림 봇 아키텍처

이 프로젝트(`dev-event-bot`)의 레이어 구성입니다.

```text
GitHub Actions (schedule: 50 23 * * 0)
        │ 트리거
        ▼
  Python 프로그램 (src/main.py)
        │
        ├─ 1. fetcher.py     ── HTTP GET ──▶ Dev-Event GitHub README
        │
        ├─ 2. parser.py      마크다운 → 이벤트 dict 리스트
        │
        ├─ 3. deduper        data/sent_events.json 비교 (중복 제거)
        │
        ├─ 4. formatter.py   이벤트 dict → Mattermost JSON 페이로드
        │
        └─ 5. sender.py      ── HTTP POST ──▶ Mattermost Incoming Webhook
```

#### 레이어별 장애 허용도

| 레이어 | 책임 | 실패 허용 |
| :---: | :---: | :---: |
| Scheduler | 실행 트리거 | 불가 (실행 자체 안 됨) |
| Fetcher | 원본 데이터 수집 | 재시도 또는 skip 가능 |
| Parser | 구조화 변환 | 불가 (뒤 단계 전체 막힘) |
| Deduper | 중복 제거 | 중복 전송 감수 가능 |
| Formatter | 메시지 포맷 | 불가 (메시지 깨짐) |
| Sender | HTTP 요청 | 재시도로 복구 가능 |

## 🛠️ 3. 최종 워크플로우

`.github/workflows/weekly-notify.yml` 전체 구성입니다. 스케줄(`50 23 * * 0`)이 이 시각인 이유는 [1편의 혼잡 슬롯 회피 설계](https://saver7942.blogspot.com/2026/04/github-actions-cron-mattermost-webhook.html)를 참고합니다.

```yaml
name: Weekly Dev-Event Notify

# 스케줄 설계:
#   목표: 매주 월요일 09:00 KST 근처 도착
#   예약: 일요일 23:50 UTC (= 월요일 08:50 KST)
#   근거: 분 0 / 시 0 UTC 혼잡 슬롯 회피 → 지연 10~15분으로 안정화 (1편 참고)
on:
  schedule:
    - cron: "50 23 * * 0"
  workflow_dispatch: {}

permissions:
  contents: read

jobs:
  notify:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - name: 체크아웃
        uses: actions/checkout@v4

      - name: uv 설치
        uses: astral-sh/setup-uv@v4
        with:
          enable-cache: true
          cache-dependency-glob: "pyproject.toml"

      - name: Python 설치
        run: uv python install 3.11

      - name: 의존성 설치
        run: uv sync --frozen || uv sync

      - name: 메인 채널 전송
        env:
          MATTERMOST_WEBHOOK_URL: ${{ secrets.MATTERMOST_WEBHOOK_URL }}
        run: uv run python -m src.main --weekly

      - name: 동아리방 채널 전송
        if: always()   # 앞 step 실패해도 독립 실행
        env:
          MATTERMOST_WEBHOOK_URL: ${{ secrets.CLUB_MATTERMOST_WEBHOOK_URL }}
        run: uv run python -m src.main --weekly
```

- `if: always()` — 앞 step이 실패해도 이 step은 실행됩니다. 한 채널의 webhook이 끊겨도 다른 채널은 알림을 받습니다.

## ⚠️ 4. 주의사항

#### Webhook 보안 함정

- **URL = 토큰**: 공개 리포 커밋, 블로그 스크린샷, 메신저 공유 모두 유출 사고.

- **유출 시 즉시 재발급**: 관리 페이지에서 webhook 삭제 후 재생성 → Secret 업데이트.

- **`.gitignore` 우선 등록**: 프로젝트 초기에 `.env`를 등록하여 실수로 커밋되지 않도록 합니다.

- **`secrets`는 로그에 마스킹되지만**, `echo $URL > file.txt` 같이 파일로 export하면 노출될 수 있습니다.

#### 중복 전송 방지 로직 주의

이 프로젝트는 `hashlib.sha256(title + url).hexdigest()[:16]`을 이벤트 ID로 사용합니다.

- URL에 추적 파라미터(`?utm_source=...`)가 붙으면 동일 이벤트가 다른 ID로 인식되어 중복 전송됩니다.

- 제목 오탈자 수정 시 새 ID가 생성되어 재전송될 수 있습니다.

- `sent_events.json` 손상 시 이력이 초기화되어 과거 이벤트가 재알림으로 옵니다.

## ✅ 5. 핵심 정리

- **Webhook URL은 인증 토큰**입니다. 반드시 GitHub Secrets에 저장하고 `${{ secrets.이름 }}`으로 주입합니다.

- **`if: always()`로 독립적인 step을 구성**하면 다중 채널 전송 시 한 채널 실패가 다른 채널에 영향을 주지 않습니다.

- **레이어별 장애 허용도를 구분**하면 재시도할 곳(Fetcher, Sender)과 즉시 실패해야 할 곳(Parser, Formatter)이 명확해집니다.

- **중복 방지 ID는 입력 정규화가 전제**입니다. URL 추적 파라미터·제목 수정이 ID를 바꿔 중복 전송을 일으킬 수 있습니다.

> **시리즈 이전 편**: [GitHub Actions cron 스케줄링 정리 (1/2) — UTC 고정과 지연 특성 ←](https://saver7942.blogspot.com/2026/04/github-actions-cron-mattermost-webhook.html)

## 🔗 참고 자료

#### Mattermost Webhook

- [Mattermost Incoming Webhooks 공식 문서](https://developers.mattermost.com/integrate/webhooks/incoming/)

- [Mattermost Message Attachments (카드 포맷)](https://developers.mattermost.com/integrate/reference/message-attachments/)

#### 레퍼런스 리포

- [hanlyang0522/ssadan — daily_notify.yml](https://github.com/hanlyang0522/ssadan/blob/main/.github/workflows/daily_notify.yml) — 평일 09:00 KST 안정 도착 패턴 (`50 23 * * 0-4`)

- [brave-people/Dev-Event](https://github.com/brave-people/Dev-Event) — 데이터 소스 원본
