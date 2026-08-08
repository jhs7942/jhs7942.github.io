---
title: 익명 세션만으로 설계한 학습 서비스 — RLS 없이 괜찮은가?
slug: ai-quiz-auth-anonymous-rls-uuid
description: >-
  로그인 없이 UUID 기반 익명 세션으로 운영하는 ai_quiz의 인증·권한 구조를 5개 질문으로 짚는다. RLS 비활성화 위험,
  localStorage vs 쿠키 트레이드오프, UUID v4 강도, 로그인 도입 경로를 정리한다.
published_at: '2026-04-20T01:09:55-07:00'
labels:
  - AI 작성
  - 프로젝트
  - AI 퀴즈
  - 면접-대비
  - 인증
  - RLS
  - Supabase
  - UUID
source: >-
  /Users/jeonghyeonseung/개발/AI_quiz/.claude/study/2026-04-20/ai-quiz-auth-anonymous.md
tabs: 코드
legacy_url: 'https://saver7942.blogspot.com/2026/04/rls.html'
draft: false
---

## 📦 1. 배경

- **프로젝트**: ai_quiz (Vite 8, React 19, @supabase/supabase-js 2.x)

- **인증 구조**: 로그인 없음 + UUID 기반 익명 세션 + Supabase anon key + RLS 비활성화

- **학습 목적**: 각 선택의 근거와 제약을 면접 대비 수준으로 구조화하고, 확장 경로를 설계합니다

---

## ❓ 2. Q1. 익명 세션으로 설계한 이유

5가지 각도로 정리합니다.

| 각도 | 내용 |
| :---: | :---: |
| ① 서비스 목표 정렬 | 학습 도우미지 소셜·커뮤니티가 아님. 사용자 신원 식별 이득 낮음 |
| ② UX — 진입 장벽 제거 | "잠깐 풀어볼까" 성격에 로그인 장벽은 이탈률 증가 |
| ③ 개발 리소스 제약 | 이틀 스프린트에 NextAuth·OAuth·비밀번호 재설정·이메일 발송은 스코프 초과 |
| ④ 법적·보안 부담 최소화 | PII 미수집 → 개인정보처리방침 의무 완화, 유출 리스크 근본적으로 낮음 |
| ⑤ 유지관리 비용 0 | 비밀번호 재설정·OAuth 토큰 갱신·계정 분실 대응 전부 회피 |

**익명 세션으로 필요한 기능이 전부 되는가:**

- 오답노트 — localStorage

- 재방문 식별 — sessionId upsert

- 학습 분석 — quiz_sessions·quiz_answers에 user_id 연결

- 오류 신고 — feedback에 user_id 연결

- 퀴즈 풀이 — 정적 JSON

현재 요구 기능 전부 충족합니다.

**제약:**
- 다기기 동기화 불가

- 브라우저 데이터 초기화 = 모든 기록 리셋

- 방문자 집계 부정확 (여러 브라우저·시크릿 모드)

- 결제·구독 기능 불가

**로그인 도입 트리거**: 다기기 동기화·장기 학습 히스토리·소셜·프리미엄·이메일 리마인더 중 하나라도 필요해지는 순간입니다.

> **참고**: 현재 `users.session_id` 구조가 `auth_user_id` 추가 경로를 이미 열어두고 있습니다. YAGNI 원칙을 유지하면서도 확장 가능한 설계입니다.

---

## ⚖️ 3. Q2. localStorage vs 쿠키 — CSRF/XSS 트레이드오프

"localStorage는 세션이 오래 남아 보안 취약하고, 쿠키에 담아 브라우저 단 세션을 보관하는 것이 안정적"이라는 이해는 아래 3가지 측면에서 정정이 필요합니다.

1. **"오래 남는다 = 보안 취약" 아님** — 지속 시간은 UX·프라이버시 선택이지 취약성 기준이 아님. 쿠키도 Max-Age를 길게 잡으면 영구 지속

2. **"쿠키가 더 안전" 단정 불가** — 일반 쿠키는 XSS + CSRF 둘 다 취약. XSS 방어는 **httpOnly 쿠키만** 가능 (서버 `Set-Cookie` 필요)

3. **이 프로젝트는 localStorage가 맞음** — 이유는 아래 표에서 확인

**저장 방식별 비교:**

| 저장 방식 | CSRF | XSS | 자동 전송 | 서버 구성 필요 |
| :---: | :---: | :---: | :---: | :---: |
| localStorage | 안전 | 취약 | 없음 | 없음 |
| 일반 쿠키 | 취약 | 취약 | 있음 | 선택 |
| httpOnly 쿠키 | 취약 (SameSite 완화) | 안전 | 있음 | 서버 필수 |

**공격 시나리오:**
- **CSRF**: 자동 전송되는 쿠키가 있으면 공격자가 사용자 권한 사칭 가능. localStorage는 JS 수동 부착이라 CSRF 방어됨

- **XSS**: JS 접근 가능한 저장소는 털림. httpOnly만 안전

**이 프로젝트가 localStorage를 선택한 이유:**
1. sessionId는 **권한 토큰이 아니라 단순 식별자** — 탈취 실익 없음

2. 개인정보 없음 → XSS로 털려도 피해 제한적

3. 순수 프론트엔드 SPA → httpOnly 쿠키 설정 불가 (서버 인프라 없음)

4. CSRF 방어가 오히려 중요 — localStorage는 CSRF 안전

**httpOnly 쿠키는 권한 토큰용입니다**: JWT, refresh token, OAuth 토큰처럼 "탈취 시 공격자가 사용자가 되는" 토큰에만 적용합니다.

**로그인 도입 시 권장 구조:**
- 익명 식별자: localStorage 유지

- 인증 토큰: httpOnly 쿠키 (서버 `Set-Cookie`)

---

## 🔐 4. Q3. RLS 없는 anon key — 공격 가능성

**현재 상태:**
- RLS 전면 비활성화 (2026-04-04 supabase-rls-policy 에러 해결 당시 임시 비활성화 후 미복원)

- `VITE_SUPABASE_ANON_KEY`는 빌드 JS에 인라인 → 누구나 추출 가능

**공격 유형별 피해:**

| 공격 | 가능한 것 | 피해 규모 |
| :---: | :---: | :---: |
| SELECT | 다른 사용자 sessionId·점수·답변·feedback 조회 | 낮음 — PII 없음 |
| INSERT | `access_logs` 무한 insert, 가짜 세션 삽입, feedback 스팸 | 중간 — 무료 500MB 한도 소진 |
| UPDATE | `UPDATE quiz_sessions SET score_percent = 100` 전체 조작 | 중간 — 통계 신뢰도 붕괴 |
| DELETE | `DELETE FROM quiz_sessions` 전체 삭제 | **높음** — 백업 없으면 영구 손실 |

"데이터 가치 낮음"은 **SELECT 한정**입니다. DELETE·UPDATE는 여전히 심각합니다.

**"괜찮다" 판단이 깨지는 트리거:**
- 사용자 규모 확대 → 봇 크롤링 중 anon key 발견

- 민감 데이터 추가 (이메일·학교·소속)

- 결제 기능

- 백업 미비 장기화

**저비용 방어 3단계:**

| Level | 작업 | 소요 시간 |
| :---: | :---: | :---: |
| 1 | Supabase 자동 백업 활성화 | 5분 |
| 2 | **부분 RLS** — SELECT/INSERT 허용, UPDATE/DELETE 차단 | 30분, 앱 영향 0 |
| 3 | `SECURITY DEFINER` RPC로 쓰기 경로 제한 | 하루 |

**Level 2 적용 예시:**

```sql
ALTER TABLE quiz_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon select" ON quiz_sessions FOR SELECT USING (true);
CREATE POLICY "anon insert" ON quiz_sessions FOR INSERT WITH CHECK (true);
-- UPDATE/DELETE는 정책 없으면 거부됨
```

- 이 3줄로 앱 동작 변경 없이 UPDATE·DELETE를 차단합니다.

- 당시 "RLS 불필요" 판단은 복잡도 회피 선택이었지 영구 방침이 아닙니다. 최소 UPDATE/DELETE 차단은 필수입니다.

> **참고**: `VITE_` 접두사 환경변수는 클라이언트 번들에 인라인됩니다. anon key를 환경변수로 숨기는 것은 효과 없습니다. 근본 해결은 RLS와 RPC입니다.

---

## 🔍 5. Q4. UUID v4 충돌·추측 확률

**UUID v4 구조:**
- 128비트 중 122비트가 랜덤 (버전 4 + variant 2비트 고정)

- 경우의 수: **2¹²² ≈ 5.3 × 10³⁶**

**충돌 확률 (Birthday Paradox):**
- N개 생성 시 충돌 확률 ≈ N² / (2 × 2¹²²)

- 50% 충돌에 N ≈ 2⁶¹ ≈ **2.3 × 10¹⁸개** 필요

- 세계 인구 80억 × 1인당 3억 개 UUID를 만들어야 50% 충돌 → 현실적으로 불가

**브루트포스 추측:**
- 1건 맞출 평균 시도: 2¹²¹ ≈ 2.6 × 10³⁶

- Supabase 초당 1,000 req 기준 평균 **10³³년** (우주 나이 × 10²²배)

- 실질적으로 불가능

**UUID 버전 비교:**

| 버전 | 기반 | 보안 권장 여부 |
| :---: | :---: | :---: |
| v1 | MAC 주소 + 타임스탬프 | 비권장 — 기기·시간 노출 |
| **v4** | 순수 랜덤 | 권장 — 현재 프로젝트 채택 |
| v7 | Unix 타임스탬프 + 랜덤 | 조건부 — 시간순 정렬 유리, 타이밍 공격 약간 취약 |

**진짜 위협은 UUID 강도가 아니라 다른 곳에 있다:**

| 위협 | 설명 |
| :---: | :---: |
| Math.random() UUID | CSPRNG가 아님, seed 예측 가능 → 보안 UUID 부적합 |
| URL 노출 | 서버 로그·Referrer 유출 (이 프로젝트 URL에는 없음) |
| XSS localStorage 탈취 | 1건이라도 털리면 끝 |
| **RLS 없음** | 추측할 필요 없이 `SELECT *`로 전체 획득 |

> UUID v4는 암호학적으로 튼튼하지만, RLS가 없으면 그 강도가 무의미합니다. 공격자는 sessionId를 추측할 필요 없이 `SELECT session_id FROM users`로 전부 가져옵니다. UUID의 강도는 **DB 권한 제어가 있을 때만 의미 있는 방어선**입니다.

---

## 🏗️ 6. Q5. 학습 진도 저장 기능 추가 시 구조 변경 경로

**원칙 3가지:**
1. 바닥부터 위로 — DB·RLS → Auth → 데이터 이전 → UI → 부가 기능

2. 기존 사용자 손실 없음 — 익명 사용자 데이터 승격 경로 필수

3. 부분 배포 가능 — 각 Phase 독립 배포·롤백 가능

**Phase 1: DB 스키마·RLS** (최우선)

```sql
ALTER TABLE users ADD COLUMN auth_user_id UUID REFERENCES auth.users(id);
CREATE INDEX idx_users_auth_user_id ON users(auth_user_id);

CREATE TABLE wrong_notes (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  question_id INTEGER,
  quiz_id TEXT,
  added_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE wrong_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users see own notes" ON wrong_notes
  FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );
```

**Phase 2: Supabase Auth 활성화**
- 이미 Supabase를 사용 중이라 추가 서비스 없이 확장 가능

- 익명 로그인 → 이후 OAuth "계정 업그레이드"

- `useAuth` 훅 신설 → `useSession` 수정

**Phase 3: 데이터 이전 전략** (가장 빠뜨리기 쉬운 단계)

```ts
const localNotes = JSON.parse(localStorage.getItem('ai-quiz-wrong-notes'))
if (localNotes?.state?.wrongNotes?.length > 0) {
  const confirmed = await confirm(`로컬 오답 N건을 계정에 저장할까요?`)
  if (confirmed) {
    await supabase.rpc('migrate_wrong_notes', { notes: localNotes.state.wrongNotes })
    localStorage.removeItem('ai-quiz-wrong-notes')
  }
}
```

- 이 단계를 생략하면 기존 사용자는 "오답이 다 사라졌다"며 이탈합니다.

**Phase 4: UI**
- 로그인·회원가입 페이지

- 동기화 상태 인디케이터 (동기화됨 / 오프라인)

- `wrongNoteStore` 수정: 로그인 시 DB, 아니면 localStorage fallback

**Phase 5: 정책·안전장치**
- 세션 만료·refresh token 갱신

- 로그아웃 시 로컬 데이터 정책

- 계정 삭제 (GDPR 대응)

- 프리미엄 기능 연계

**역순으로 하면 안 되는 이유:**
- UI 먼저 → 로그인 폼 있는데 Auth 없어 에러

- Auth 먼저, DB 나중 → 저장할 테이블 없음

- 데이터 이전 스킵 → 기존 사용자 이탈

---

## 🛠️ 7. 실제 코드

**`src/lib/session.ts` — 현재 전체 (12줄)**

```ts
const SESSION_KEY = 'ai_quiz_session_id'

export function getSessionId(): string {
  let id = localStorage.getItem(SESSION_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(SESSION_KEY, id)
  }
  return id
}
```

- `crypto.randomUUID()`를 사용합니다. `Math.random()` 기반 UUID는 CSPRNG가 아니라 seed 예측이 가능하므로 사용하지 않습니다.

**`src/hooks/useSession.ts` — 모든 페이지 마운트 시 호출**

```ts
export function useSession(pagePath: string) {
  const [userId, setUserId] = useState<string | null>(null)
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    const sessionId = getSessionId()
    const userAgent = navigator.userAgent

    upsertUser(sessionId, userAgent).then((id) => {
      setUserId(id)
      logAccess(id, pagePath, userAgent)
    })
  }, [pagePath])

  return { userId }
}
```

- `initialized.current` 플래그로 중복 실행을 막습니다.

**`src/lib/supabase.ts` — 6줄 얇은 레이어**

```ts
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

---

## ✅ 8. 핵심 정리

- **"안전함"과 "공격 없음"은 다릅니다**: 현재 공격받지 않았다고 안전한 구조는 아님. DELETE·UPDATE 차단은 최소 방어선입니다.

- **익명 식별자 ≠ 권한 토큰**: sessionId는 식별자일 뿐 권한 부여 수단이 아님. httpOnly·JWT 만료 등의 보호는 식별자에는 과합니다.

- **UUID 강도의 전제 조건**: 암호학적 강도는 DB 권한 제어가 뒷받침해야 의미 있습니다. RLS 없으면 UUID 128비트도 `SELECT *` 한 번으로 우회됩니다.

- **anon key는 공개 키다**: `VITE_SUPABASE_ANON_KEY`는 빌드 JS에 인라인이라 기밀이 아님. 서비스 역할 키(`SUPABASE_SERVICE_ROLE_KEY`)는 서버에서만 사용합니다.

- **확장 설계는 바닥부터**: DB·RLS → Auth → 데이터 이전 → UI 순서입니다. 역순은 전부 깨집니다.

- **localStorage CSRF 안전, XSS 취약**: XSS 자체를 막는 것이 근본 방어입니다 (React 기본 escaping + CSP 헤더).

---

## 🔗 참고 자료

- [Supabase Auth 공식 문서](https://supabase.com/docs/guides/auth)

- [Supabase RLS 정책](https://supabase.com/docs/guides/auth/row-level-security)

- [Supabase Anonymous Sign-In](https://supabase.com/docs/guides/auth/auth-anonymous)

- [OWASP — HTML5 localStorage/SessionStorage](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html)

- [RFC 4122 — UUID 명세](https://datatracker.ietf.org/doc/html/rfc4122)

- [MDN — CSRF](https://developer.mozilla.org/en-US/docs/Web/Security/Types_of_attacks#cross-site_request_forgery_csrf)

- [MDN — crypto.randomUUID()](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID)
