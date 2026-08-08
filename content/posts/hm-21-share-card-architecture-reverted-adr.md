---
title: HM-21 결과 공유 카드 — 이미지 생성 라이브러리 및 공유 API 채택 (번복된 ADR)
slug: hm-21-share-card-architecture-reverted-adr
description: >-
  html-to-image + Share Sheet 조합을 채택했으나 카카오톡 썸네일 요구사항 불일치로 당일 번복된 설계 결정. 스코프 정의
  실패가 어떻게 아키텍처 선택을 무효화하는지 기록한다.
published_at: '2026-04-19T08:15:48-07:00'
labels:
  - AI 작성
  - 프로젝트
  - 몇명이서
  - 아키텍처
  - 설계 결정
source: >-
  /Users/jeonghyeonseung/개발/how_many/.claude/study/adr/2026-04-18/hm-21-share-card-architecture.md
legacy_url: 'https://saver7942.blogspot.com/'
draft: false
---

## 📦 1. 배경

- **Linear HM-21**: "결과 공유 카드 이미지화 (SNS 바이럴)" — 결과 화면을 PNG로 생성해 카톡·인스타에 공유

- 기획자 코멘트로 스코프가 **클라이언트 1단계 카드 생성**으로 축소됨. 서버사이드 OG는 HM-21-2로 이연

- 기술 스택: React 19.2 + Next.js 16.1 + Capacitor 8, 1단계 Web + Android 대상

### 제약 조건

| 영역 | 제약 |
| :---: | :---: |
| 번들 크기 | +50KB gzip 이내 (NF2) |
| 생성 시간 | 중급 Android에서 1,000ms 이내 (NF1) |
| 플랫폼 | 1단계 Web + Android. iOS는 후속 |
| 저장소 | Android 15 Scoped Storage (targetSdkVersion=36) |
| CSS 요구 | linear-gradient 배경, system emoji 렌더 필요 |
| 기존 의존 | `@capacitor/share` 이미 설치 |

결정이 필요한 두 가지:
1. **이미지 생성 라이브러리**: DOM → PNG 변환 방식

2. **저장·공유 API**: 생성된 PNG를 사용자가 공유하는 경로

---

## 🧭 2. 검토한 대안

### 결정 1 — 이미지 생성 라이브러리

| 대안 | 장점 | 단점 |
| :---: | :---: | :---: |
| **html-to-image** ✅ | gzip ~30KB. SVG foreignObject 방식으로 현대 CSS 지원. React 19 호환 확인 | Canvas tainted 대비 `crossOrigin` 설정 필요 (로컬 이모지만 사용하므로 영향 없음) |
| html2canvas | 문서·레퍼런스 풍부. 구형 브라우저 호환 | gzip ~45KB로 번들 목표 근접. gradient·backdrop-filter 일부 미지원. Android system emoji 깨짐 보고 |
| dom-to-image-more | html-to-image와 유사한 접근 | 최근 커밋 간격 길고 React 19 호환 미확인 |
| 서버사이드 Satori + OG | 완벽한 렌더 제어. 카카오톡 미리보기 지원 | 서버 인프라 필요. 1단계 스코프 초과 |

### 결정 2 — 저장·공유 API

| 대안 | Web 경로 | Android 경로 | 장점 | 단점 |
| :---: | :---: | :---: | :---: | :---: |
| **Share Sheet 통합** ✅ | `navigator.share({files})` | `Filesystem(Cache)` + `Share.share({files})` | 단일 API. 사용자 선택 범위 최대. Scoped Storage 권한 불필요 | `navigator.share` 파일 지원이 브라우저별 상이 (fallback 필요) |
| 직접 다운로드만 | `<a download>` | `Filesystem.writeFile(Documents)` | 구현 단순 | Android 15 Scoped Storage 권한 플로우 필요 |
| MediaStore 직접 통합 | — | 커스텀 네이티브 플러그인 | 갤러리 표시 완벽 | 네이티브 플러그인 개발·유지보수 비용 |

---

## ✅ 3. 최종 결정과 근거

**선택**: html-to-image + Share Sheet 통합

### 결정 1: `html-to-image` 채택

- 번들 ~30KB — NF2(50KB) 대비 여유 20KB 확보

- SVG foreignObject 방식이 linear-gradient·system emoji를 Canvas 에뮬레이션보다 정확히 렌더

- React 19 환경 실사용 사례 확인

- `useShareImage` 훅 내부에서 `await import('html-to-image')` 동적 로드 → 초기 번들 영향 없음

### 결정 2: Share Sheet 통합 채택

- `@capacitor/share` 이미 설치되어 있어 추가 의존 없음

- Android: `Filesystem.writeFile(Directory.Cache)` → `Share.share({files:[uri]})` → 임시 파일 삭제 → Scoped Storage 우회

- Web: `navigator.canShare` 체크 후 분기, 미지원 시 `<a download>` fallback

- 기존 "링크 복사" 버튼을 Share Sheet에 흡수해 UX 마찰 최소화

---

## ⚖️ 4. 트레이드오프

### 포기한 것

- **이모지 OS별 렌더 일관성**: Twemoji 강제 적용을 포기하고 system emoji 허용. Android(Noto Color) ↔ iOS(Apple Color) 이모지 모양이 기기마다 다르게 나올 수 있음. 카드 구조가 단순해 영향 미미하다고 판단

- **카카오톡 이미지 직접 첨부**: 카톡 feed template은 URL 기반이라 로컬 이미지 첨부 불가. 이미지 공유는 Share Sheet 경유로 우회

- **서버사이드 퍼포먼스·정합성**: Satori OG 대비 클라이언트 렌더는 기기 성능에 영향 받음. NF1(1,000ms) 초과 시 720×720 해상도 하향 대안 확보

- **갤러리 저장 직결**: Share Sheet에서 사용자가 "이미지 저장"을 선택해야 갤러리로 이동 — 추가 탭 1회

### 감수한 리스크

- `html-to-image` 동적 import 실패 시 공유 기능 전체 장애 → try/catch + 링크 공유 자동 fallback으로 완화

- Share Sheet 웹 실패 가능성 → `<a download>` fallback

- Canvas CORS tainting → 외부 이미지 사용 금지 정책으로 회피

### 번복 조건 (당시 기재)

다음 중 하나가 발생하면 재검토:
1. 실기기 생성 시간이 1,500ms 초과 지속 → Satori 기반 서버사이드 OG로 전환

2. 이모지 렌더 차이에 대한 사용자 불만이 누적 → Twemoji 강제 적용 ADR 신규 작성

3. `html-to-image` 유지보수 중단 → dom-to-image-more 또는 서버 렌더로 전환

---

## 📊 5. 예상 영향 (당시 기재)

### 긍정

- 번들 크기 여유로 추가 기능(예: 미리보기 모달) 수용 가능

- 공용 훅 `useShareImage` 설계로 Food/Group 확장 시 버튼 훅업만 추가하면 완료 (HM-21-F, HM-21-G 비용 최소화)

- 카톡 공유 → Share Sheet → 이미지 전송 경로가 사용자 실제 행동 패턴과 일치

### 부정

- 클라이언트 렌더 의존이라 저사양 기기 성능 영향

- 이모지 렌더 차이를 데이터로 확인하려면 실기기 테스트 필수

- 카톡 미리보기(URL 미리보기 카드) 개선은 HM-21-2 이후에나 가능

---

## 🔄 6. 번복 경위

**Superseded by `hm-21-og-image-satori.md` (2026-04-18)** — Accepted 된 당일 번복됨.

번복 이유:
- 사용자가 기대한 UX는 **"카카오 Feed 썸네일에 결과 카드 노출"**이었으나, html-to-image + Share Sheet 조합으로는 카톡이 요구하는 **서버 공개 URL**을 제공할 수 없어 달성 불가

- "카톡 미리보기는 HM-21-2 이후"로 이연한 것이 실제로는 **1단계 성공 기준 그 자체**였음

- 이모지 OS별 렌더 차이도 Twemoji 강제 적용으로 해결하는 방향으로 재결정

재설계된 선택:
- Next.js 16 내장 `next/og` (Satori) + Edge runtime + Supabase anon key + Pretendard + Twemoji

- 1200×630 가로형(Meta OG 표준)으로 비율 변경

---

## 🎯 7. 핵심 정리

- **스코프 축소가 요구사항을 제거하지 않는다**: "1단계 클라이언트 우선"이라는 기획 코멘트가 카카오 Feed 썸네일 요구사항을 이연시켰지만, 실제로는 그것이 핵심 성공 지표였습니다. 기술 선택 전에 "이 스코프로 성공 기준을 달성할 수 있는가"를 명시적으로 검증해야 합니다.

- **기술 기준을 모두 충족한 결정도 요구사항 불일치로 무효화된다**: html-to-image는 번들 크기·렌더 정확도·React 19 호환 모두 충족했으나, 카카오톡 서버 URL 미제공이라는 플랫폼 제약으로 선택 자체가 의미 없어졌습니다.

- **플랫폼 공유 제약은 사전 검증이 필요하다**: 카카오톡 Feed template이 URL 기반이라는 사실(로컬 이미지 첨부 불가)은 라이브러리 선택 이전에 확인해야 할 플랫폼 제약입니다.

- **Capacitor Share Sheet + Filesystem(Cache) 패턴은 Android Scoped Storage 우회에 유효하다**: Scoped Storage 권한 플로우 없이 공유가 가능하며, `@capacitor/share`가 이미 설치된 프로젝트라면 추가 의존 없이 적용할 수 있습니다.

- **동적 import 패턴은 이미지 생성 라이브러리의 초기 번들 비용을 제거한다**: `await import('html-to-image')` 방식으로 공유 액션 시점에만 로드하면 초기 번들에서 해당 라이브러리 비용을 분리할 수 있습니다.

---

## 🔗 참고 자료

- Linear 이슈: [HM-21](https://linear.app/wqeqw/issue/HM-21)

- 후속 ADR: `.claude/study/adr/2026-04-18/hm-21-og-image-satori.md`
