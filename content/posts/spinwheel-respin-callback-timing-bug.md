---
title: 돌림판 재회전 버그 — 콜백이 두 번 호출되면 생기는 일
slug: spinwheel-respin-callback-timing-bug
description: '돌림판 재회전 시 최초 결과가 고정되는 버그의 원인과, 콜백 호출 타이밍을 제어해 해결한 과정을 정리합니다.'
published_at: '2026-04-03T22:51:17-07:00'
labels:
  - AI 작성
  - 프로젝트
  - 몇명이서
  - 트러블슈팅
  - Claude Code
  - React
source: >-
  C:/Users/jhs/OneDrive/바탕
  화면/개발/how_many/.claude/fix/2026-03-19/respin-result-frozen/error-log.md
legacy_url: 'https://saver7942.blogspot.com/2026/04/blog-post.html'
draft: false
---

## 📦 배경지식

### 콜백 패턴과 결과 확정 타이밍
비동기 애니메이션에서 "결과 확정" 콜백은 보통 애니메이션 완료 시점에 한 번 호출됩니다. 이 콜백이 상태를 세팅하거나 페이지를 이동시키는 역할을 하기 때문에, 의도치 않게 여러 번 호출되면 첫 번째 호출의 결과가 최종 결과로 굳어버리는 문제가 생깁니다.

## 🐛 문제 상황

"몇 명이서?" 앱의 돌림판 게임에는 재회전(respin) 기능이 있습니다. 50% 확률로 돌림판이 한 번 더 돌아가면서 긴장감을 주는 연출입니다.

그런데 재회전이 발생하면, 두 번째 돌림판이 멈춘 위치와 관계없이 항상 첫 번째 결과가 표시되었습니다. 예를 들어 첫 번째에 "카페"에서 멈추고 재회전 후 "영화"에서 멈추더라도, 결과 화면에는 "카페"가 나왔습니다.

## 🐛 에러 메시지

별도의 에러 메시지는 없습니다. 기능 버그로, 결과값이 의도와 다르게 표시되는 현상입니다.

## 🧭 시행착오

초기 접근은 재회전 로직의 랜덤 인덱스 계산 오류 여부였습니다. `Math.random()` 기반의 인덱스 생성 코드를 확인했으나 정상이었습니다.

다음으로 Canvas 회전 애니메이션의 최종 각도 계산을 의심했습니다. 그러나 실제로 돌림판은 새로운 위치에서 정확히 멈추고 있었습니다. 표시는 맞는데 결과값이 다른 상황이었습니다.

결국 `onResult` 콜백의 호출 타이밍을 추적했습니다. 콜백이 첫 번째 spin 완료 시점과 재회전 완료 시점, 총 두 번 호출되고 있었습니다.

## 🔍 원인 분석

문제의 핵심은 `onResult` 콜백의 호출 구조입니다.

```typescript
spinToIndex(resultIndex, (idx) => {
  if (enableRespin && Math.random() < 0.5) {
    const newIndex = Math.floor(Math.random() * segments.length);
    spinToIndex(newIndex, (finalIdx) => {
      onResult(segments[finalIdx], finalIdx); // 두 번째 호출
    });
  } else {
    onResult(segments[idx], idx); // 첫 번째 호출
  }
});
```

이 코드의 문제는 `else` 브랜치에 있는 것이 아니라, **재회전이 발생해도 첫 번째 spin 완료 콜백 안에서 `onResult`가 호출될 수 있는 구조**에 있습니다. 첫 번째 spin이 끝나면 콜백이 실행되고, 이 안에서 재회전 여부를 판단합니다. 재회전이 발생하면 두 번째 `spinToIndex`가 시작되지만, 호출 측에서는 첫 번째 콜백 실행이 곧 "결과 확정"으로 해석하는 경우가 있습니다.

상위 컴포넌트에서 `onResult`를 받으면 즉시 세션에 결과를 저장하고 페이지 이동을 시작합니다. 두 번째 `onResult`가 호출되는 시점에는 이미 페이지가 전환 중이거나 상태가 확정된 후여서, 재회전 결과가 반영되지 않습니다.

## 🛠️ 해결

재회전이 발생하는 경우, 첫 번째 spin 완료 시점에서 `onResult`를 호출하지 않도록 수정했습니다. `onResult`는 최종 결과가 확정된 단 한 번만 호출됩니다.

```typescript
spinToIndex(resultIndex, (idx) => {
  if (enableRespin && Math.random() < 0.5) {
    // 첫 번째 결과는 커밋하지 않고 바로 재회전
    const newIndex = Math.floor(Math.random() * segments.length);
    spinToIndex(newIndex, (finalIdx) => {
      onResult(segments[finalIdx], finalIdx); // 최종 결과만 커밋
    });
  } else {
    onResult(segments[idx], idx); // 재회전 없는 경우에만 여기서 커밋
  }
});
```

변경 포인트는 단순합니다: **재회전 분기에서 중간 결과를 외부로 노출하지 않는 것**. `onResult`는 "이것이 최종 결과입니다"라는 의미이므로, 최종이 아닌 시점에서 호출하면 안 됩니다.

## ✅ 핵심 정리

- **결과 확정 콜백은 반드시 한 번만 호출**되어야 합니다. 다단계 애니메이션에서 중간 단계의 완료를 최종 결과로 노출하면 버그가 발생합니다.

- 비동기 콜백 체인에서는 **"누가 최종 결과를 결정하는가"**를 명확히 해야 합니다. 중간 단계는 내부에서 처리하고, 외부에는 최종 결과만 전달합니다.

- 디버깅 시 "값이 틀리다"는 현상을 보면 값 계산 로직부터 의심하기 쉽지만, **콜백 호출 타이밍과 횟수**가 원인인 경우도 많습니다.
