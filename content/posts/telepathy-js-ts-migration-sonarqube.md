---
title: 보안 등급은 올랐는데 보안은 후퇴했다 — 텔레파시 백엔드 JS→TS 마이그레이션 측정기
slug: telepathy-js-ts-migration-sonarqube
description: >-
  텔레파시 백엔드를 JavaScript에서 TypeScript로 옮긴 뒤 "그래서 뭐가 좋아졌는가"를 정적 분석으로 측정했습니다. 타입
  커버리지는 0%에서 75.6%로 올랐지만, SonarQube 보안 등급 D→C는 실제 개선이 아니라 탐지 회피였습니다. 등급을 올려준 그
  변경이 오히려 3개월 전 고쳤던 하드코딩 키 결함을 되살렸고, 이를 발견해 수정했습니다. 등급표가 아니라 진짜 이슈를 찾아낸 측정 과정을
  정리합니다.
published_at: '2026-07-20T19:31:43-07:00'
labels:
  - AI 작성
  - 프로젝트
  - 텔레파시
  - TypeScript
  - 보안
  - 코드 품질
source: 'C:/Users/SSAFY/Desktop/프로젝트/telepathy-app/sonarqube-migration-blog.md'
legacy_url: 'https://saver7942.blogspot.com/2026/07/jsts.html'
draft: false
---

텔레파시 백엔드를 별도 브랜치에서 JavaScript에서 TypeScript로 마이그레이션했습니다. 작업을 끝내면 질문이 하나 남습니다. **"그래서, 뭐가 얼마나 좋아졌는가?"** "코드가 깔끔해졌다"는 자평은 근거가 없습니다. 그래서 두 브랜치를 정적 분석으로 나란히 측정했습니다. 결과 자체보다, 측정하면서 드러난 **등급의 함정**이 더 값진 소득이었습니다.

#### 목차

1. [측정의 출발점](#1)

2. [진짜 성과는 타입 안전성이었다](#2)

3. [함정 ①: 보안 D→C는 착시였다](#3-1-dc)

4. [함정 ②: 3개월 전 고친 결함이 되살아났다](#4-2-3)

5. [함정 ③: 이슈 개수는 JS와 TS 사이에서 비교 불가](#5-3-js-ts)

6. [측정이 만든 후속 작업](#6)

7. [주의사항](#7)

8. [핵심 정리](#8)

---

## 📦 1. 측정의 출발점

측정 목적은 자랑이 아니라 검증입니다. "마이그레이션 전후로 무엇이 실제로 변했는가"를 숫자로 확인하는 것이 목표였습니다.

핵심은 **옛 코드와 새 코드를 동시에 디스크에 펼쳐두는 것**입니다. `git worktree`를 쓰면 현재 작업 브랜치를 건드리지 않고 옛 브랜치를 옆 폴더에 뽑을 수 있습니다.

```powershell
git worktree add ../telepathy-v2 origin/v2
```

- **비교 대상** — `origin/v2`(JS) ↔ `ts-migration`(현재 TS)

- **측정 범위** — 공정성을 위해 양쪽 모두 `server/src`만

- **도구** — 등급·취약점은 SonarQube(로컬), 타입 축은 `type-coverage`·`tsc`, 중복은 `jscpd`

정적 분석은 코드를 실행하지 않고 버그·취약점·코드 스멜·복잡도·중복을 잡아 A~E 등급으로 보여줍니다. 브랜치 두 개를 프로젝트 두 개로 등록해 나란히 스캔하면, 같은 잣대로 전후를 비교할 수 있습니다.

---

## 📊 2. 진짜 성과는 타입 안전성이었다

결론부터 적으면, 이번 마이그레이션의 성과는 **타입 안전성이라는 새 안전망**입니다. JS 시절에는 이 축이 아예 측정 대상이 아니었습니다.

| 지표 | v2 (JS) | 현재 (TS) | 판정 |
| :---: | :---: | :---: | :---: |
| 타입 커버리지 | 0% (측정 불가) | 75.6% | 신규 자산 |
| 명시적 `any` | 측정 불가 | 1건 | 규율 유지 |
| `@ts-ignore` | 측정 불가 | 0건 | 우회 없음 |
| strict 컴파일 | 존재 불가 | 에러 0 | 통과 |

식별자 4,847개 중 3,665개가 타입으로 검증됩니다. 남은 24%는 부주의가 아니라 **외부 라이브러리 경계**(jwt·socket·supabase)의 암묵적 `any`라, 다음 개선 대상이 어디인지도 함께 알려줍니다. `@ts-ignore`가 0건이라는 건 안전망을 우회한 흔적이 없다는 뜻입니다.

이어서 SonarQube 등급입니다.

| 지표 | v2 (JS) | 현재 (TS) | 비고 |
| :---: | :---: | :---: | :---: |
| Security | D (5) | C (4) | 등급은 올랐지만 (3장 참조) |
| Reliability | C (4) | C (8) | 등급 동일, 개수는 비교 주의 |
| Maintainability | A (17) | A (16) | 유지보수 등급 유지 |
| Duplications | 0.0% | 0.0% | 동일 |
| Coverage | 0% | 0% | 양쪽 테스트 없음 |
| Lines of Code | ~1.7k | ~2.0k | 타입 주석으로 +20% |

첫인상은 **"보안 D→C, 유지보수 A 유지. 마이그레이션 성공"**이었습니다. 여기서 글을 끝냈다면 편했을 것입니다.

---

## 🔐 3. 함정 ①: 보안 D→C는 착시였다

등급이 왜 올랐는지 확인하려면 등급 뒤의 **항목**을 열어봐야 합니다. API로 취약점 목록을 뽑았습니다.

```powershell
(Invoke-RestMethod "http://localhost:9000/api/issues/search?componentKeys=telepathy-v2&types=VULNERABILITY&ps=100" -Headers $H).issues
```

<details style="margin:10px 0 4px">
<summary style="cursor:pointer;font-weight:700;color:#C8443C">실행 결과 보기</summary>
<pre><code># v2를 D로 만든 범인은 딱 하나
rule:    javascript:S5542  (CRITICAL)
file:    server/src/routes/sp_payments.routes.js:19
message: "Use a secure mode and padding scheme."

# 현재(TS) 프로젝트에는 이 CRITICAL이 없음 → 등급 상승</code></pre>
</details>

결제 라우트의 암호화 코드였습니다. 그리고 현재(TS)에는 이 CRITICAL이 아예 없었습니다. 정말 고쳐진 것인지 양쪽 코드를 직접 열어봤습니다.

**v2 (JS) — 스캐너가 CRITICAL로 잡은 코드**

```javascript
const ALGORITHM = 'aes-256-cbc';
const ENCRYPT_KEY = process.env.ENCRYPT_KEY;

if (!ENCRYPT_KEY || ENCRYPT_KEY.length !== 64) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('ENCRYPT_KEY 환경변수가 설정되지 않았거나 유효하지 않습니다 (64자 hex 필요)');
  }
  console.warn('⚠️ ENCRYPT_KEY 미설정 — 개발 환경에서 임시 키를 사용합니다.');
}
const ACTIVE_KEY = (ENCRYPT_KEY && ENCRYPT_KEY.length === 64)
  ? ENCRYPT_KEY
  : crypto.randomBytes(32).toString('hex');

function encrypt(text) {
  const iv = crypto.randomBytes(16); // 매번 랜덤 IV
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ACTIVE_KEY, 'hex'), iv);
  // ...
  return iv.toString('hex') + ':' + encrypted;
}
```

**키 길이 검증 + 프로덕션 미설정 시 throw + 매번 랜덤 IV**를 갖춘, 꽤 제대로 된 구현입니다. 스캐너는 단지 "CBC 말고 GCM(인증 암호화)을 써라"며 CRITICAL을 매긴 것입니다.

**현재 (TS) — 스캐너가 아무것도 잡지 못한 코드**

```typescript
const secretKey = process.env.ACCOUNT_SECRET_KEY || 'telepathy-key'; // 하드코딩 폴백 키
const encryptedAccount = refund_account
  ? CryptoJS.AES.encrypt(refund_account, secretKey).toString()
  : null;
```

마이그레이션하면서 Node 내장 `crypto`를 `crypto-js` 라이브러리로 바꿨습니다. 그 결과는 이렇습니다.

- `CryptoJS.AES.encrypt(text, passphrase)`는 내부적으로 여전히 **CBC**를 쓰지만, 고수준 API라 스캐너가 패턴을 인식하지 못합니다. CRITICAL 소멸, 등급 상승.

- 반면 환경변수가 없으면 **소스에 박힌 `'telepathy-key'`로 폴백**합니다. 코드에 노출된 키로 **은행 계좌번호를 암호화**하는 셈입니다.

> 둘 다 실질은 인증 없는 CBC로 동일합니다. 마이그레이션은 그 문제를 고친 것이 아니라, 스캐너가 읽지 못하는 API로 바꿔 등급만 올린 것입니다. 게다가 하드코딩 폴백 키가 새로 생겼습니다.

`Security: C`라는 배지를 액면 그대로 믿고 "보안이 좋아졌다"고 적었다면, 코드를 열어본 사람에게 바로 반박당했을 것입니다.

---

## 🔁 4. 함정 ②: 3개월 전 고친 결함이 되살아났다

더 뼈아픈 지점은 따로 있었습니다. 이 하드코딩 폴백 키는 **처음 보는 결함이 아닙니다.**

3개월 전 [출시 전 보안 감사](https://saver7942.blogspot.com/2026/04/express-socketio-critical-6_0374203151.html)에서 CRITICAL 6건을 잡았는데, 그중 하나가 정확히 이것이었습니다.

```javascript
// 2026-04 — CRITICAL로 지적된 코드
const key = process.env.ENCRYPT_KEY || '0'.repeat(64);
```

당시 결론은 명확했습니다. **"환경변수 폴백으로 약한 기본값을 쓰면 안 된다. 없으면 서버 시작을 거부하는 편이 안전하다."** 그래서 키 길이 검증과 프로덕션 throw를 넣어 고쳤습니다. 3장에서 본 v2 코드가 바로 **그때 고친 결과물**입니다.

그런데 TS 마이그레이션이 암호화 구현을 `crypto-js`로 갈아끼우면서, **그 가드를 통째로 들어냈습니다.** 환경변수 이름만 `ENCRYPT_KEY`에서 `ACCOUNT_SECRET_KEY`로 바뀐 채, 폴백 상수는 `'0'.repeat(64)`에서 `'telepathy-key'`로 되살아났습니다.

| 시점 | 키 처리 | 상태 |
| :---: | :---: | :---: |
| 2026-04 (감사 전) | `ENCRYPT_KEY` 없으면 `'0'.repeat(64)`로 폴백 | CRITICAL 지적 |
| 2026-04 (감사 후) | 키 길이 검증 + 프로덕션 `throw` | 수정 완료 |
| 2026-07 (TS 전환 후) | `ACCOUNT_SECRET_KEY` 없으면 `'telepathy-key'`로 폴백 | **재발** |

게다가 `ACCOUNT_SECRET_KEY`는 `.env.example`에도, 환경변수 검증 코드에도 등장하지 않습니다. 이 변수의 존재를 아는 곳은 저 라우트 한 줄뿐이라, 실제로 설정돼 있지 않다면 폴백 키가 그대로 쓰입니다.

정리하면 이렇습니다. **한 번 고친 결함이 리팩토링으로 되살아났고, 스캐너는 그 후퇴에 오히려 더 좋은 등급을 줬습니다.** 회귀를 잡아야 할 도구가 회귀를 보상한 셈입니다. 등급만 봤다면 영영 몰랐을 일입니다.

---

## 🔍 5. 함정 ③: 이슈 개수는 JS와 TS 사이에서 비교 불가

Reliability가 v2는 4건, TS는 8건입니다. "TS가 버그 2배"라고 읽으면 틀립니다. **스캐너의 TypeScript 룰셋이 JavaScript 룰셋보다 촘촘**해서, 같은 코드도 TS 쪽을 더 많이 잡습니다. 비교 가능한 것은 개수가 아니라 **등급(letter)**이고, 등급은 양쪽 다 C로 동일했습니다.

남은 취약점 4건도 열어보니 성격이 갈렸습니다. 전부 `S2245`(`Math.random()` 사용 경고)였는데,

- **3건은 오탐** — 닉네임 생성, 로그 간격 지터. 보안 용도가 아니라 `Math.random()`으로 충분합니다.

- **1건은 진짜** — SMS 인증번호를 `Math.random()`으로 생성하고 있었습니다. 예측 가능한 난수로 인증번호를 만들면 안 되므로, `node:crypto`의 `randomInt`로 교체했습니다.

```typescript
// 수정 후 — 암호학적으로 안전한 난수로 6자리 인증번호 생성
import { randomInt } from 'node:crypto';

const generateCode = (): string => randomInt(100000, 1000000).toString();
```

**등급이 아니라 항목 하나하나를 열어봐야 진짜와 오탐이 갈립니다.** 4건이라는 숫자만으로는 이 구분이 불가능합니다.

---

## 🛠️ 6. 측정이 만든 후속 작업

측정의 산출물은 등급표가 아니라 **할 일 목록**이었습니다. 그리고 위험도가 높은 두 건은 측정 직후 바로 처리했습니다.

**결제 암호화 하드닝 (완료)** — 폴백 키를 제거하고, 모듈이 로드되는 시점에 키를 검증해 미달이면 서버 부팅 자체를 거부하도록 바꿨습니다.

```typescript
// 환경변수가 없으면 하드코딩 상수로 폴백하지 않는다.
// 소스에 박힌 키로 은행 계좌를 암호화하는 것은 사실상 무암호화다.
const MIN_ACCOUNT_KEY_LENGTH = 16;
const ACCOUNT_SECRET_KEY = process.env.ACCOUNT_SECRET_KEY;

if (!ACCOUNT_SECRET_KEY || ACCOUNT_SECRET_KEY.length < MIN_ACCOUNT_KEY_LENGTH) {
  throw new Error(
    `ACCOUNT_SECRET_KEY 환경변수가 설정되지 않았거나 너무 짧습니다(최소 ${MIN_ACCOUNT_KEY_LENGTH}자). ` +
      '환불 계좌 암호화 키이므로 서버를 시작하지 않습니다.',
  );
}
```

<details style="margin:10px 0 4px">
<summary style="cursor:pointer;font-weight:700;color:#C8443C">부팅 거부가 실제로 동작하는지 검증</summary>
<pre><code># 키를 바꿔가며 모듈 로드를 시도한 결과
[OK] 키 미설정              → 거부됨: ACCOUNT_SECRET_KEY 환경변수가 설정되지 않았거나 너무 짧습니다(최소 16자)...
[OK] 약한 키 'telepathy-key'(13자) → 거부됨: ACCOUNT_SECRET_KEY 환경변수가 설정되지 않았거나 너무 짧습니다(최소 16자)...
[OK] 정상 키(31자)          → 정상 로드됨</code></pre>
</details>

임계값을 32자로 잡지 않은 이유가 있습니다. 실제 운영 키가 31자였기 때문에, 기준을 32로 두면 **기존에 암호화된 계좌 데이터를 복호화할 수 없게** 됩니다. 약한 폴백값(13자)은 거르면서 운영 키는 통과하는 선으로 16자를 잡았습니다. 보안 기준을 올릴 때도 이미 저장된 데이터와의 호환을 함께 봐야 합니다.

같은 이유로 **AES-GCM 전환은 이번에 하지 않았습니다.** 알고리즘을 바꾸면 기존 암호문을 읽을 수 없으므로, 재암호화 마이그레이션을 설계한 뒤 별도로 진행할 일입니다.

**SMS 인증번호 (완료)** — 5장에서 확인한 유일한 진짜 취약점도 `randomInt`로 교체했습니다.

남은 항목은 이렇습니다.

| 우선순위 | 작업 | 근거 |
| :---: | :---: | :---: |
| 중간 | AES-GCM 전환 + 기존 데이터 재암호화 마이그레이션 | 인증 암호화 · 호환성 설계 필요 |
| 중간 | 반복되는 인증·응답 블록을 미들웨어로 추출 | 중복 8곳 동시 해소 |
| 중간 | 타입 커버리지 76% → 90%+ (외부 라이브러리 경계) | 남은 24%의 정체가 확인됨 |
| 최상 | CI에 `tsc --noEmit` + 커버리지 최소선 게이트 | **숫자가 다시 나빠질 수 없는 구조** |

마지막 항목이 특히 중요합니다. 4장의 재발은 "한 번 고쳤다"가 영구적이지 않다는 증거입니다. 사람의 기억이 아니라 **CI 게이트**가 지켜야 재발이 막힙니다. 이번에도 고친 사람이 3개월 전과 같은 사람인데 재발했습니다.

---

## ⚠️ 7. 주의사항

- **등급 상승이 곧 개선은 아닙니다.** 탐지 회피로도 등급은 오릅니다. 특히 CRITICAL·보안 항목은 반드시 코드를 열어 확인해야 합니다.

- **JS→TS는 성능 개선 작업이 아닙니다.** 타입은 컴파일 시 소거되므로, 이 측정의 가치는 "빨라짐"이 아니라 "안전성·유지보수성"에 있습니다.

- **중복률은 도구마다 다르게 나옵니다.** `jscpd`(최소 5줄) 기준 3.99%, SonarQube(최소 10줄) 기준 0.0%였습니다. 판정 기준 차이일 뿐 둘 다 정확합니다. LOC가 +20% 늘면서 구조가 유사한 블록이 늘어난 결과로, 유일하게 악화된 축입니다.

- **테스트 커버리지 0%는 양쪽 공통**이며 마이그레이션과 무관한 별도 과제입니다. 타입과 테스트가 짝을 이뤄야 안전망이 완성됩니다.

---

## ✅ 8. 핵심 정리

- **정직한 성과는 타입 안전성입니다.** 0% → 75.6%, `@ts-ignore` 0건, strict 컴파일 통과. "보안이 좋아졌다"가 아니라 이것이 사실에 맞는 문장입니다.

- **보안 등급 D→C는 착시였습니다.** 스캐너가 읽지 못하는 고수준 API로 바꿔 CRITICAL이 사라진 것이지, 암호화가 개선된 것이 아닙니다.

- **고친 결함은 되살아납니다.** 3개월 전 CRITICAL로 잡아 고친 폴백 키 패턴이 리팩토링으로 복귀했고, 스캐너는 그 후퇴에 더 좋은 등급을 줬습니다. 재발 방지는 사람이 아니라 CI 게이트의 몫입니다.

- **개수가 아니라 등급, 등급이 아니라 항목.** JS↔TS는 룰셋이 달라 개수 비교가 무의미하고, 등급은 항목을 열어봐야 의미가 확정됩니다. 취약점 4건 중 3건은 오탐이었습니다.

- **스캐너는 출발점이지 결론이 아닙니다.** 이번 측정의 가장 큰 수확은 등급표가 아니라, 등급이 오히려 가려버린 **결제 코드의 하드코딩 키**를 찾아 고친 것이었습니다.

정리하면 이번 마이그레이션의 정직한 성과는 "보안이 좋아졌다"가 아닙니다. **타입 안전성이라는 새 안전망을 확보했고, 그 과정에서 스캐너도 놓친 결제 암호화 이슈를 발견해 고쳤다**가 사실에 맞는 이야기입니다.

측정은 자랑하려고 하는 것이 아니라 **모르던 것을 알게 되려고** 하는 작업입니다. 이번에는 확실히 그랬습니다.

---

## 🔗 참고 자료

- 이전 글: [코드 리뷰가 터뜨린 보안 경보 — Express + Socket.IO 앱에서 발견한 CRITICAL 6건 처리기](https://saver7942.blogspot.com/2026/04/express-socketio-critical-6_0374203151.html)

- [SonarQube 규칙 S5542 — 안전한 암호화 모드와 패딩](https://rules.sonarsource.com/javascript/RSPEC-5542/)

- [SonarQube 규칙 S2245 — 의사난수 생성기 사용](https://rules.sonarsource.com/javascript/RSPEC-2245/)

- 측정 환경: SonarQube Community Build(로컬) · `type-coverage` · `jscpd` · `git worktree`로 v2 병렬 체크아웃 · 대상 `server/src` · 2026-07.
