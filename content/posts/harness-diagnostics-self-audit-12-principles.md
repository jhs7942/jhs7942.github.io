---
title: Harness Engineering — Claude Code 전역 설정을 12원칙으로 진단하기
slug: harness-diagnostics-self-audit-12-principles
description: >-
  AI 에이전트 협업 환경(Harness)의 12원칙과 5등급 성숙도 프레임워크를 소개하고, self-audit으로 drift를 발견·수정한
  과정을 정리한다.
published_at: '2026-04-08T08:27:39-07:00'
labels:
  - AI 작성
  - 학습 정리
  - Claude Code
source: >-
  C:/Users/jhs/OneDrive/바탕
  화면/개발/telepathy/.claude/study/2026-04-05/harness-diagnostics-self-audit.md
legacy_url: 'https://saver7942.blogspot.com/2026/04/harness-engineering-claude-code-12.html'
draft: false
---

## 📦 1. Harness Engineering이란?
- **Harness** — AI 에이전트가 작업할 수 있는 **협업 환경 자체의 품질**을 의미합니다.

- 코드가 좋은 것과 "에이전트가 그 코드베이스에서 잘 일할 수 있는 것"은 다릅니다.

- 에이전트는 인간과 다르게 코드베이스를 소비합니다:

| 인간 | 에이전트 |
| :---: | :---: |
| 순차적으로 문서 읽기 | 검색·점프로 정보 소비 |
| 암묵적 규칙 학습 | 암묵적 규칙을 모름 |
| 팀원에게 질문 | 도구 피드백에 의존 |

## 🔍 2. 12원칙
| # | 원칙 | 핵심 질문 |
| :---: | :---: | :---: |
| P1 | Agent Entry Point | AGENTS.md/CLAUDE.md가 명확한 진입점인가? |
| P2 | Map, Not Manual | 문서가 지도(map)인가, 매뉴얼인가? |
| P3 | Invariant Enforcement | 실수를 도구가 자동으로 잡는가? |
| P4 | Convention Over Configuration | 암묵 규칙이 아닌 명시적 규칙이 있는가? |
| P5 | Progressive Disclosure | 정보가 필요할 때 찾을 수 있는가? |
| P6 | Layered Architecture | 의존성 방향이 명확한가? |
| P7 | Garbage Collection | stale 코드/문서를 주기적으로 정리하는가? |
| P8 | Observability | 에이전트가 작업 결과를 검증할 수 있는가? |
| P9 | Knowledge in Repo | 지식이 사람 머리가 아닌 레포에 있는가? |
| P10 | Reproducibility | 동일 입력이 동일 결과를 보장하는가? |
| P11 | Modularity | 변경 영향 범위가 예측 가능한가? |
| P12 | Self-Documentation | 코드 자체가 의도를 설명하는가? |

## 📊 3. 5등급 성숙도 프레임워크

### 4개 차원과 가중치
| 차원 | 가중치 | 포함 원칙 |
| :---: | :---: | :---: |
| A. Documentation & Navigation | 30% | P1, P2, P5, P12 |
| B. Enforcement & Consistency | 30% | P3, P4, P10 |
| C. Architecture & Knowledge | 20% | P6, P9, P11 |
| D. Operations & Maintenance | 20% | P7, P8 |

### 등급 기준
| 등급 | 점수 | 의미 |
| :---: | :---: | :---: |
| L1 None | 0-19 | 에이전트 협업 고려 없음 |
| L2 Basic | 20-39 | 최소한의 문서화 |
| L3 Structured | 40-59 | 체계적 구조, 부분 자동화 |
| L4 Optimized | 60-79 | 높은 자동화, 낮은 drift |
| L5 Autonomous | 80-100 | 에이전트 독립 작업 가능 |

## 🐛 4. Drift(표류)란?
- 문서와 실제 상태의 **불일치**를 의미합니다.

- 예: AGENTS.md에 "Skills 1개" 기재 → 실제로는 16개 존재

- Drift가 쌓이면 에이전트는 **잘못된 지도**를 보고 움직이게 됩니다.

## 🧭 5. Self-audit 실행 과정

### 5-1. 무결성 검증
```bash
cd ~/.claude && bash scripts/validate.sh
```
```text
[1/4] 경로 참조 무결성 검증...    OK
[2/4] 에이전트 frontmatter 검증...  OK
[3/4] 네이밍 컨벤션 검증...        OK
[4/4] 고아 문서 탐지...           OK
Errors: 0  Warnings: 0  PASS
```
- 통과했지만, **validate.sh가 검증하지 않는 영역**(skills/)이 있었습니다.

### 5-2. 12원칙 평가 결과 — 83.3점 / L5
- 차원 점수: A=8.75, B=8.00, C=9.00, D=7.50

### 5-3. 발견된 Drift 4건
1. **AGENTS.md Skills 인벤토리 drift** — 문서에 1개, 실제 16개

2. **외부 설치 자산 경계 미문서화** — validate.sh 주석에만 언급

3. **validate.sh가 skills/ 미검증** — 4단계 검증이 agents/, templates/, docs/만 스캔

4. **stale 에이전트 감지 없음** — weekly-stats.py가 외부 에이전트까지 포함

### 5-4. 수정 내용

**Fix #1 — AGENTS.md에 외부 자산 경계 명시**
- 자체 관리 vs 외부 설치 자산을 **명시적으로 분리** 문서화

**Fix #2 — validate.sh에 Skills 검증 추가 (Allowlist 패턴)**
```bash
OWNED_SKILLS="harness-diagnostics"

is_owned_skill() {
    local name=$1
    for s in $OWNED_SKILLS; do
        [ "$name" = "$s" ] && return 0
    done
    return 1
}
```
- **Allowlist 기반 거버넌스** — 검증 대상을 명시적으로 나열하고, 외부 자산이 늘어나도 검증 로직은 변경 불필요

**Fix #3 — weekly-stats.py 외부 에이전트 제외**
```python
# Before: os.walk()로 전체 재귀 → 외부 에이전트 포함
# After: os.listdir()로 도메인 디렉토리 하위만 수집
for entry in os.listdir(agents_dir):
    domain_path = os.path.join(agents_dir, entry)
    if not os.path.isdir(domain_path):
        continue  # 루트 직하 *.md는 외부 에이전트 → 스킵
```

### 5-5. 수정 후 점수
| 원칙 | Before | After | 개선 사유 |
| :---: | :---: | :---: | :---: |
| P1 | 9 | **10** | 16개 skill 전체 인벤토리 동기화 |
| P3 | 7 | **8** | Skills 구조·인벤토리 자동 검증 |
| P7 | 7 | **8** | 장기 미사용 에이전트 자동 감지 |

- 종합: 83.3 → **85.5** (L5 상단 진입)

## ⚠️ 6. 주의사항
- **Self-audit의 긍정 편향 위험** — 자기가 만든 기준으로 자기를 평가하면 점수가 후해질 수 있습니다. 반증 기반 검증(`adversarial-verify.sh`)을 함께 실행할 것

- **L5 등급은 점수만으로 부족** — 행동 검증(`behavioral-verify.sh`) PASS가 필수 조건

- **외부 자산을 저장소에 두는 전략의 trade-off**:
  - 선택지 A(완전 분리): 거버넌스 경계 자연스럽지만 환경 재현 어려움
  - 선택지 B(함께 보관 + 경계 문서화): 환경 재현 쉽지만 allowlist 유지 필요
  - 원칙: "섞어두지만 경계는 명시한다"
- **커밋 시 민감 파일 경계** — `git add .` 대신 파일명을 명시해서 스테이징할 것. 실제로 `.credentials.json`이 untracked 상태에서 `git add .`를 하면 커밋될 수 있습니다.

- **Drift가 쌓이는 구조적 원인** — 자동 검증이 "있는 것"만으로 부족하고, **"무엇을 보지 않는지"** 까지 주기적으로 점검해야 합니다.

## ✅ 7. 핵심 정리
- **Harness**는 에이전트가 작업하는 협업 환경의 품질이며, 코드 품질과는 별개 차원입니다

- **12원칙 + 5등급 프레임워크**로 환경 품질을 정량 측정할 수 있습니다

- **Drift**는 불가피하게 쌓이므로, 자동 검증 범위를 주기적으로 점검해야 합니다

- **Allowlist 기반 거버넌스**로 자체 관리 자산과 외부 자산의 경계를 명확히 유지할 수 있습니다

- Self-audit은 유용하지만, **긍정 편향**을 인식하고 반증 검증을 병행해야 합니다

> **참고**: [OpenAI Harness Engineering 개념](https://cdn.openai.com/papers/practices-for-governing-agentic-ai-systems.pdf), [ADR-005: 자체 진단 skill 도입 근거](~/.claude/docs/adr/005-harness-diagnostics-skill.md)
