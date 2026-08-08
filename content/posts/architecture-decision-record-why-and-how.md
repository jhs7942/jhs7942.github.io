---
title: ADR(Architecture Decision Record) — 설계 결정을 기록해야 하는 이유
slug: architecture-decision-record-why-and-how
description: >-
  ADR은 소프트웨어 설계의 중요한 기술적 결정과 그 근거를 1페이지짜리 문서로 남기는 관행이다. 무엇을, 왜, 어떤 형식으로 기록하는지
  정리한다.
published_at: '2026-04-24T18:58:00-07:00'
labels:
  - AI 작성
  - 학습 정리
  - 아키텍처
source: >-
  C:/Users/jhs02/Desktop/개발/how_many/.claude/study/2026-04-18/architecture-decision-record.md
legacy_url: 'https://saver7942.blogspot.com/2026/04/adrarchitecture-decision-record.html'
draft: false
---

## 📦 1. ADR이란

- **Architecture Decision Record**의 약자입니다.
- 소프트웨어 설계에서 내린 **중요한 기술적 결정과 그 근거**를 짧은 문서로 남기는 관행입니다.
- 2011년 Michael Nygard의 블로그 글 "Documenting Architecture Decisions"에서 대중화됐습니다.
- 핵심 가치: **결정 당시의 맥락을 박제**하는 것입니다.

## 🔍 2. 왜 필요한가

코드에는 결정의 결과만 남고, 왜 그렇게 결정했는지는 남지 않습니다. 기록이 없으면 다음 문제가 반복됩니다.

- 6개월 뒤 같은 논의를 처음부터 다시 시작합니다.

- 이미 기각된 대안을 모르고 다시 시도합니다.

- 결정 당시 있던 제약(버전·팀 상황·비용)이 바뀌었는데도 과거 결정을 맹목적으로 따릅니다.

- 새로 합류한 팀원이 "왜 이렇게 돼 있지?"를 끝없이 질문합니다.

## 🏗️ 3. 표준 구조 (Michael Nygard 포맷)

| 섹션 | 내용 |
| :---: | :---: |
| 제목 | 짧은 동사구 (예: "html-to-image 라이브러리 채택") |
| 상태 | `Proposed` / `Accepted` / `Deprecated` / `Superseded by ADR-XXX` |
| 맥락 | 왜 이 결정이 필요한가? 어떤 제약·요구가 있었나? |
| 결정 | 우리가 선택한 것 |
| 대안 | 고려했지만 기각한 선택지와 그 이유 |
| 결과 | 긍정·부정·향후 번복 조건 |

### 상태 전이

```text
Proposed   → 제안 단계, 논의 중
Accepted   → 승인됨, 현재 활성
Deprecated → 더 이상 권장 안 되지만 현재 코드에 잔존
Superseded → 새 ADR이 이 결정을 대체 (ADR-003 → ADR-007 링크)
```

- ADR은 **삭제하지 않습니다**.
- 결정을 바꿀 때는 기존 ADR의 상태를 `Superseded by ADR-NNN`으로 바꾸고, 새 ADR이 앞선 결정을 참조합니다.
- 역사를 지우지 않는 것이 ADR의 핵심입니다.

## 📋 4. 언제 기록하는가

| 기록 대상 | 기록 불필요 |
| :---: | :---: |
| 여러 후보 중 하나를 선택 | 유일한 선택지 (대안 없음) |
| 되돌리기 어려운 결정 (DB 스키마, 인증 방식) | 내일 쉽게 바꿀 수 있는 스타일 결정 |
| 논쟁이 있던 결정 | 명백한 best practice 적용 |
| 트레이드오프가 명시적 | "이게 표준이니까" 수준 |

> **참고**: "트레이드오프 테이블(대안 2개 이상 비교)이 등장했는가"가 가장 실용적인 트리거 기준입니다. 프로젝트 CLAUDE.md도 이 기준을 자동 감지 조건으로 삼습니다.

## 🎯 5. 실제 적용 예시 — HM-21

how_many 프로젝트의 결과 공유 카드 이미지화 작업(HM-21)에 대입한 예시입니다.

| ADR 섹션 | 실제 내용 |
| :---: | :---: |
| 제목 | "공유 카드 이미지 생성 — html-to-image 채택" |
| 상태 | Accepted |
| 맥락 | 결과 화면 공유 카드 필요. 번들 +50KB 이내, React 19 호환, linear-gradient·system emoji 지원 필요 |
| 결정 | html-to-image (동적 import) + @capacitor/share Share Sheet 통합 |
| 대안 | html2canvas / dom-to-image-more / 서버사이드 Satori OG |
| 결과 | +30KB 번들, 이모지 OS별 차이 허용, 서버 OG 기능은 HM-21-2로 이연 |

## 🛠️ 6. ADR 도구

수동으로 마크다운을 작성하는 것이 기본입니다. 도구화된 사례도 있습니다.

- [adr-tools](https://github.com/npryce/adr-tools) — `adr new "제목"` 명령으로 템플릿 생성

- [Log4brains](https://github.com/thomvaill/log4brains) — ADR을 정적 사이트로 렌더

- Notion / Confluence / GitHub Issues 템플릿

## ⚠️ 7. 주의사항

- **결정 "중"에 쓴다**: 결정 완료 후 사후 정리용으로 쓰면 "왜 그랬는지" 기억이 흐려집니다. 논의 중 실시간으로 작성하면서 결정하는 것이 이상적입니다. 글을 쓰면서 논리 허점이 드러나는 효과도 큽니다.

- **기각 이유를 구체적으로 쓴다**: "html2canvas를 기각했다"만 쓰면 의미가 없습니다. "gzip 45KB로 번들 목표 초과, 일부 OS에서 이모지 렌더 깨짐"처럼 기각 근거를 구체적으로 남겨야 미래의 누군가가 당시 제약이 바뀌었는지 판단할 수 있습니다.

- **번호 충돌 회피**: 여러 사람이 동시에 ADR을 만들면 번호가 겹칩니다. 날짜+슬러그(`2026-04-18-share-card-library`) 방식으로 회피할 수 있습니다.

- **1페이지가 이상적**: 2페이지를 초과하면 ADR이 아니라 설계 문서로 성격이 바뀝니다. ADR의 가치는 "나중에 빠르게 훑어볼 수 있다"는 점이라, 길면 읽히지 않습니다.

- **너무 사소한 것은 ADR로 만들지 않는다**: "변수명을 camelCase로 한다" 수준은 스타일 가이드에 들어갑니다. 번복 시 영향 범위가 넓은 것만 ADR 대상입니다.

- **객관 제약을 기록한다**: "팀 A가 이 라이브러리를 좋아해서"는 안 됩니다. "팀 A는 번들 크기에 민감해서 더 가벼운 대안을 선호했다"처럼 객관 제약으로 재기술합니다.

## 🔗 8. 참고 자료

- [Documenting Architecture Decisions — Michael Nygard (2011)](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions) — ADR 포맷의 원전

- [adr.github.io](https://adr.github.io/) — 여러 ADR 포맷 비교 (Nygard / MADR / Y-Statement 등)

- [MADR (Markdown Any Decision Records)](https://adr.github.io/madr/) — Nygard 포맷의 확장판, 더 상세

- [ThoughtWorks Technology Radar — Lightweight ADRs](https://www.thoughtworks.com/radar/techniques/lightweight-architecture-decision-records)

## ✅ 9. 핵심 정리

- ADR은 **"왜 이 결정을 내렸는가"를 박제**하는 문서입니다. 코드에는 결과만 남기 때문에 별도로 기록해야 합니다.

- **트레이드오프 테이블이 등장했는가**가 ADR 작성 여부를 판단하는 가장 실용적인 기준입니다.

- 상태는 `Proposed → Accepted → Deprecated / Superseded`로 전이하며, **ADR은 삭제하지 않고 상태를 갱신**합니다.

- 기각한 대안의 이유가 ADR의 핵심입니다. 이유가 없으면 미래에 같은 논의를 반복하게 됩니다.

- **1페이지 이내**로 유지해야 나중에 실제로 읽힙니다.
