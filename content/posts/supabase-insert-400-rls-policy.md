---
title: Supabase INSERT 400 에러 — RLS 정책 누락이 만든 Silent Fail
slug: supabase-insert-400-rls-policy
description: >-
  Supabase quiz_sessions 테이블에 INSERT 시 HTTP 400 에러가 발생한 원인과 RLS 정책 설정으로 해결한 과정을
  정리합니다.
published_at: '2026-04-03T22:47:52-07:00'
labels:
  - AI 작성
  - 프로젝트
  - AI 퀴즈
  - 트러블슈팅
  - Claude Code
  - Supabase
source: >-
  C:/Users/jhs/OneDrive/바탕
  화면/개발/ai-quiz/.claude/fix/2026-03-24/quiz-sessions-insert-400/error-log.md
draft: false
---

## 📦 배경지식

### Supabase
Supabase는 오픈소스 Firebase 대안으로, PostgreSQL 기반의 백엔드 서비스입니다. 인증, 데이터베이스, 스토리지, Realtime 등을 제공하며, 프론트엔드에서 직접 DB에 접근할 수 있는 클라이언트 라이브러리를 제공합니다.

### RLS (Row Level Security)
PostgreSQL의 행 단위 접근 제어 기능입니다. 테이블에 RLS를 활성화하면, 명시적으로 정책(Policy)을 만들어주지 않는 한 **어떤 요청도 거부**됩니다. Supabase는 새 테이블 생성 시 기본으로 RLS가 활성화되어 있어, 정책을 깜빡하면 모든 요청이 조용히 실패합니다.

### anon 역할
Supabase 클라이언트가 인증 없이(비로그인 상태) API를 호출할 때 사용하는 PostgreSQL 역할입니다. 공개 접근이 필요한 테이블에는 이 역할에 대한 정책을 별도로 만들어줘야 합니다.

## 🐛 문제 상황

AI 퀴즈 앱에서 퀴즈 결과를 저장하는 기능을 구현하는 상황이었습니다. 사용자가 퀴즈를 다 풀고 결과 화면(`/result`)에 진입하면, `saveQuizSession()` 함수가 Supabase의 `quiz_sessions` 테이블에 풀이 기록을 INSERT하는 구조입니다.

그런데 결과 화면은 정상적으로 표시되는데, DB에는 데이터가 저장되지 않았습니다. 에러 처리가 silent fail로 되어 있어서 화면에서는 아무 이상이 없었고, 브라우저 콘솔을 열어서야 문제를 발견할 수 있었습니다.

## 🐛 에러 메시지

```
Failed to load resource: the server responded with a status of 400 ()
@ https://kksaaqssfgotnoichdma.supabase.co/rest/v1/quiz_sessions?select=id
```

## 🧭 시행착오

초기 접근은 INSERT 필드와 테이블 스키마 불일치 여부 확인이었습니다. `saveQuizSession()`이 전송하는 컬럼(`user_id`, `categories`, `selected_types`, `total_questions`, `correct_count`, `score_percent`, `started_at`, `settings`)을 하나씩 대조했지만, 스키마와 일치했습니다.

다음으로 Supabase 대시보드에서 테이블 설정을 확인했습니다. RLS가 활성화되어 있는데, 정책(Policy) 목록이 비어 있었습니다. RLS가 켜져 있으면서 정책이 없으면 — 모든 요청이 거부됩니다.

## 🔍 원인 분석

Supabase는 테이블 생성 시 RLS가 기본 활성화됩니다. 이 상태에서 별도의 정책을 만들지 않으면, `anon` 역할로 들어오는 모든 INSERT/SELECT/UPDATE/DELETE 요청이 거부됩니다.

문제는 에러 응답이 "권한 없음(403)"이 아니라 **HTTP 400**으로 온다는 점입니다. 400은 보통 "잘못된 요청"을 의미하기 때문에, RLS 정책 문제보다는 스키마 불일치나 데이터 형식 오류를 먼저 의심하게 됩니다.

## 🛠️ 해결

`quiz_sessions`와 `quiz_answers` 테이블에 `anon` 역할의 INSERT 정책을 추가했습니다.

```sql
-- quiz_sessions: anon INSERT 허용
CREATE POLICY "anon can insert quiz_sessions"
ON public.quiz_sessions
FOR INSERT
TO anon
WITH CHECK (true);

-- quiz_answers: anon INSERT 허용
CREATE POLICY "anon can insert quiz_answers"
ON public.quiz_answers
FOR INSERT
TO anon
WITH CHECK (true);
```

정책 추가 후 INSERT가 정상 작동하는 것을 확인했습니다.

## ✅ 핵심 정리

- Supabase에서 **새 테이블을 만들면 RLS가 기본 활성화**됩니다. 정책 없이는 어떤 요청도 통과하지 못합니다.

- RLS 정책 누락 시 에러가 403이 아닌 **HTTP 400**으로 올 수 있습니다. 400 에러가 나면 스키마뿐 아니라 RLS 정책도 확인해야 합니다.

- Silent fail 패턴은 디버깅을 어렵게 만듭니다. INSERT 실패 시 최소한 콘솔에 경고를 남기는 에러 핸들링을 추가하는 것이 좋습니다.

- 테이블 생성 체크리스트: **스키마 정의 → RLS 정책 설정 → 클라이언트 코드 작성** 순서를 지키면 이런 실수를 예방할 수 있습니다.
