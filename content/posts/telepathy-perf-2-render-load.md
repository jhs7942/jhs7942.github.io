---
title: '라이브러리 3개를 도입하려다, 재보고 2개만 넣었습니다 (2/2) — 렌더링·로드 편'
slug: telepathy-perf-2-render-load
description: >-
  텔레파시(React 19 + Vite SPA)의 렌더링·로드 성능 before 측정 기록입니다. React DevTools Profiler로
  Context 연쇄 리렌더가 0건임을 확인해 Zustand 도입을 취소했습니다. Lighthouse에서는 서버 압축률 0%가 진짜 원인임을
  발견해 우선순위가 통째로 바뀌었습니다. 측정으로 기각된 가설 3개, 취소된 라이브러리 1개, 계획에 없던 최우선 과제 1개가 나온 과정을
  담았습니다.
published_at: '2026-07-20T06:27:37-07:00'
labels:
  - AI 작성
  - 프로젝트
  - 텔레파시
  - 성능 최적화
  - React
source: 'C:/Users/jhs02/Downloads/blog-perf-2-render-load.md'
series: telepathy-perf
part: 2
legacy_url: 'https://saver7942.blogspot.com/2026/07/3-2-22.html'
draft: false
---

> 2편 시리즈입니다. [① 네트워크 편](https://saver7942.blogspot.com/2026/07/3-2-12.html) · **② 렌더링·로드 편(이 글)**

텔레파시는 15초마다 열리는 라운드에서 같은 단어를 고른 두 사람을 실시간으로 이어주는 매칭 서비스입니다. React 19 + Vite SPA, Express + Supabase 구성으로 만들었습니다.

[1편](https://saver7942.blogspot.com/2026/07/3-2-12.html)에서는 Network 탭으로 중복 요청·연타·폴링 세 가지를 재고 TanStack Query 도입을 확정했습니다.

이번 편은 남은 두 가지입니다. **React DevTools Profiler**로 리렌더를 재고(1·2장), **Lighthouse**로 로드를 잽니다(3장). 여기서 도입 예정이던 라이브러리 하나가 취소되고, 계획에 없던 1순위가 새로 생깁니다.

측정 조건은 1편과 같습니다(프로덕션 빌드 / 시크릿 창 / Fast 4G + CPU 4x / 3회 중앙값). 단, **Profiler는 프로덕션 빌드에서 동작하지 않아 1·2장만 dev 서버에서 측정했습니다.** 리렌더 횟수는 dev와 prod가 동일하므로 측정값은 유효하고, 시간 값만 참고용으로 봤습니다.

---

<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:0 0 6px"><a style="text-decoration:none;font-size:13.5px;font-weight:500;padding:8px 14px;border-radius:11px 12px 10px 12px;border:1.5px solid #C8443C;background:#FBFBF7;color:#243130" href="https://saver7942.blogspot.com/2026/07/3-2-12.html">① 네트워크 편</a><span style="color:#93A97F">›</span><span style="font-size:13.5px;font-weight:500;padding:8px 14px;border-radius:11px 12px 10px 12px;border:1.5px solid #C8443C;background:#C8443C;color:#FBFBF7">② 렌더링·로드 편 · 현재</span></div>

## 글자당 리렌더 1.0회 — 예상대로였지만, 예상과 달랐던 지점

모든 폼이 **제어 컴포넌트**(controlled component)입니다. `useState` + `onChange`로 관리하는 방식으로, 사용자가 글자를 입력할 때마다 state가 바뀌고 리렌더가 발생합니다. 12글자를 입력하면 **commit**(React가 DOM에 변경을 적용하며 화면을 다시 그린 횟수) 12회, 정확히 1:1이었습니다. 여기까진 예상대로였습니다.

예상과 달랐던 건 폼 크기의 영향이었습니다. 상태 5개짜리 폼과 9개짜리 폼이 **똑같이 글자당 1.0회**였습니다. 리렌더 횟수와 비용을 좌우하는 건 상태 개수가 아니라 **컴포넌트 트리 크기**였습니다.

정직하게 기록할 부분이 있습니다. 1 commit당 렌더 비용은 1.6~3.8 ms로, 60fps 예산(16.7 ms) 안에 넉넉히 들어옵니다. **현재 타이핑은 느리지 않습니다.** React Hook Form의 가치는 "느린 걸 고친다"가 아니라 "폼이 커져도 리렌더가 늘지 않는 구조"입니다. 치료가 아니라 예방이고, 그렇게 기록해야 과장이 없습니다.

---

## 교과서의 위험이 이 앱에는 없었습니다

이번 측정의 원래 주인공이었습니다. **Context Provider** 4개가 전부 이 패턴입니다.

```tsx
<WordSessionContext.Provider value={{ ...session, setProfile, startSession }}>
```

`useMemo` 없는 인라인 객체입니다. 교과서적으로는 위험 신호입니다. 렌더마다 새 객체가 만들어지면 내용이 같아도 `Object.is`가 실패해 해당 Context를 구독하는 모든 consumer 컴포넌트가 리렌더됩니다. 이 문제가 실재하면 **Zustand**(React Context 외부에서 상태를 전역으로 관리하는 라이브러리 — Provider 없이 컴포넌트가 직접 스토어를 구독하므로 위 문제를 우회합니다)를 도입할 계획이었습니다. 측정 전에 기준을 정해뒀습니다. **"유의미한 낭비가 없으면 도입하지 않는다."**

측정 결과, 단어를 클릭할 때 발생한 모든 commit의 원인("What caused this update?")이 해당 페이지 컴포넌트였습니다. **Provider가 원인인 commit: 0건. 다른 consumer 리렌더: 0건.**

이유는 단순했습니다. **React의 리렌더는 아래로만 전파됩니다.** 페이지 컴포넌트의 상태가 변경되면 그 아래 자식들이 리렌더되지만, 위에 있는 Provider는 건드리지 않습니다. Provider가 리렌더되지 않으면 value 객체도 새로 만들어지지 않습니다. `useMemo` 누락은 사실이지만, **Provider 자신이 자주 리렌더될 때만** 발현되는 문제입니다. 이 앱의 Provider는 매칭 시작·종료 시점에만 바뀝니다.

그래서 **Zustand는 도입하지 않았습니다.** "측정해보니 문제가 없어서 안 넣었다"도 결론입니다.

대신 다른 게 잡혔습니다. **무조작 10초에 commit 26회.** 우선순위가 `Normal` — 사용자 입력이 아니라 타이머입니다. 추적해보니 1초 주기 `setInterval` 두 개가 **같은 상태를 중복 갱신**하고 있었습니다. 1편 3장의 폴링과 같은 뿌리입니다. 네트워크로는 분당 59요청, 렌더링으로는 분당 약 156회입니다. 폴링 구조를 수정하면 둘이 함께 해결됩니다.

---

## 66점, 그리고 진짜 범인

마지막으로 종합 점검이었습니다. 여기서 함정 두 개를 먼저 밟았습니다.

**함정 ①: Lighthouse는 스로틀을 자기가 겁니다.** 측정 내내 켜두었던 DevTools의 Fast 4G를 꺼야 조건이 통제됩니다. 이 설정은 Chrome을 재시작해도 유지되므로(sticky) 모르고 지나치기 쉽습니다. 실제 적용 조건은 리포트 푸터에 찍힙니다. `Moto G Power / Slow 4G throttling`.

**함정 ②: 완주 못 한 리포트의 진단은 믿으면 안 됩니다.** 폴링이 도는 메인 화면에서 "The page loaded too slowly to finish" 경고와 함께 `main-thread work 20.3 s` 같은 숫자가 나왔습니다. 폴링 없는 페이지에서 다시 재니 그 항목들이 **통째로 사라졌습니다.** 20.3초는 로드 비용이 아니라 Lighthouse가 네트워크 유휴를 기다린 시간의 누적치였습니다. 부수 소득으로, "폴링 때문에 표준 측정 도구가 완주를 못 한다"는 1편 3장의 훌륭한 보강 증거가 되었습니다.

함정을 피하고 나온 결과는 이렇습니다.

| 지표 | 값 | |
| :---: | :---: | :---: |
| 점수 | **66** | |
| **FCP** (첫 픽셀이 화면에 나타나기까지) | 5.2 s | 🔴 |
| **LCP** (가장 큰 요소가 그려지기까지) | 5.6 s | 🔴 |
| **TBT** (FCP 이후 메인 스레드가 막힌 시간) | 100 ms | 🟢 |
| **CLS** (레이아웃이 밀린 정도) | 0 | 🟢 |

여기서 관찰 세 개입니다.

**① 어느 페이지를 재도 66점이었습니다.** 입력창 2개짜리 로그인 화면과 타이머·소켓·폴링이 도는 메인 화면의 점수가 같았습니다. 결론은 하나입니다. **비용은 화면이 아니라 공통 번들에 있습니다.** 실제로 로그인 화면에서 미사용 JS가 67%였습니다. **코드 스플리팅**(React.lazy 등으로 JS를 라우트·기능 단위로 분리해 필요한 시점에만 내려받는 기법)이 0곳이라, 로그인 화면 하나를 보는 데 앱 전체를 내려받습니다.

**② FCP 5.2초 → LCP 5.6초, 차이가 0.4초뿐입니다.** 첫 픽셀만 뜨면 나머지는 바로 그려집니다. 렌더링 자체는 빠릅니다. 문제는 오로지 "5초 동안의 빈 화면"입니다.

**③ TBT 초록색은 좋은 신호가 아니었습니다.** 처음엔 "번들이 크니 TBT가 나쁠 것"이라 예상했는데 기각됐습니다. TBT는 **FCP 이후**의 메인 스레드 블로킹만 셉니다. 그런데 CSR(Client-Side Rendering) 앱은 JS 실행이 끝나야 첫 픽셀이 나옵니다. 즉, 번들 비용이 전부 FCP **앞**에 있어서 TBT의 측정 창에 잡히지 않습니다. **번들 청구서는 TBT가 아니라 FCP 5.2초로 날아온 것이었습니다.** 지표 하나만 보면 정반대로 읽힙니다.

그럼 5.2초의 정체는 무엇일까요. 콘솔 한 줄로 확인했습니다.

```js
performance.getEntriesByType('resource')
  .map(r => ({ url: r.name, transfer: r.transferSize, decoded: r.decodedBodySize }))
```

| 리소스 | transfer | decoded | 압축률 |
| :---: | :---: | :---: | :---: |
| 우리 JS | 486,137 | 485,837 | **0%** |
| 우리 CSS | 85,538 | 85,238 | **0%** |
| Google Fonts CSS | 27,212 | 123,492 | 78% |

**서버가 압축(gzip)을 전혀 하지 않고 있었습니다.** 같은 페이지에서 Google Fonts CSS는 78% 압축돼 왔는데, 우리 파일만 원본 그대로였습니다. 측정 환경은 CDN 없이 Express가 빌드 산출물을 직접 서빙하는 구성인데, `compression` 미들웨어가 없었습니다.

여기서 중요한 오해 하나를 짚어둡니다. Vite가 빌드 로그에 보여주는 "gzip 152 kB"는 **압축하면 이렇다는 예상치**입니다. 실제로 파일을 압축해서 내려보내는 것은 서버의 몫입니다. 빌드 도구가 예상치를 보여준다고 해서 서버가 자동으로 압축하지는 않습니다.

계산하면, 렌더 경로 585 KiB → 압축 시 192 KiB. Slow 4G에서 다운로드 3.3초 → 1.1초. **미들웨어 한 줄로 2.2초.** 계획에 있던 어떤 라이브러리보다 컸고, 우선순위가 통째로 뒤집혔습니다.

---

## 성적표

측정 근거를 모아 최종 결정표를 만들었습니다.

| 계획 | 측정 근거 | 결정 |
| :---: | :---: | :---: |
| TanStack Query | 중복 8건 · 연타 낭비 83% · 폴링 59req/분 | ✅ 도입 |
| React Hook Form | 글자당 리렌더 1.0회 (예방 목적 명시) | ✅ 도입 |
| Zustand | Context 연쇄 리렌더 **0건** | ❌ **취소** |
| (계획에 없음) | 압축률 0% | 🆕 **최우선** |

가설 채점표도 남깁니다. 6개 측정에서 **기각이 3개** 나왔습니다.

| 가설 | 결과 |
| :---: | :---: |
| Context 인라인 value → 연쇄 리렌더 | ❌ 기각 (Provider가 리렌더 안 됨) |
| 백그라운드 탭에서도 폴링 계속 | ❌ 기각 (브라우저가 이미 차단) |
| 큰 번들 → TBT 악화 | ❌ 기각 (비용이 FCP 앞에 있음) |
| 연타 시 응답 역전으로 상태 불일치 | ⚠️ 미재현 (안전 결론은 아님) |
| 화면 전환마다 재요청 | ✅ 확인 |
| 클릭 수 = 요청 수 | ✅ 확인 |

측정 없이 진행했다면 Zustand를 넣고, 백그라운드 폴링 옵션을 만지고, 번들과 무관한 TBT를 쫓았을 것입니다. **셋 다 헛수고였습니다.**

---

## 핵심 정리

before 측정은 이제 있습니다. 다음은 개선을 하나 적용할 때마다 같은 조건으로 재측정하는 차례입니다.

- 리렌더 횟수를 좌우하는 건 상태 개수가 아니라 **컴포넌트 트리 크기**입니다.

- **React의 리렌더는 아래로만 전파됩니다.** `useMemo` 없는 인라인 value의 위험은 Provider 자신이 자주 리렌더될 때만 발현됩니다. Provider가 리렌더되지 않는 구조라면 연쇄 리렌더는 일어나지 않습니다.

- **CSR 앱에서 TBT 초록색이 번들이 가볍다는 뜻은 아닙니다.** 번들 비용은 FCP 앞에서 소비되고, TBT는 FCP 이후만 측정합니다.

- Lighthouse를 돌릴 때는 DevTools 네트워크 스로틀을 끄고, 완주한 리포트 결과만 신뢰합니다. 폴링 등 지속 요청이 있는 페이지에서는 완주 자체가 안 될 수 있습니다.

- Vite 빌드 로그의 gzip 수치는 예상치입니다. **실제 압축은 서버 몫**이며, `compression` 미들웨어가 없으면 압축률은 0%입니다.

- "측정해보니 문제가 없어서 안 넣었다"도 결론입니다. 도구의 가치를 말하려면 도입 전 숫자가 필요하고, 그 숫자가 괜찮다는 결론도 측정 없이는 낼 수 없습니다.

<div style="display:flex;gap:12px;flex-wrap:wrap;margin:6px 0 0"><a style="display:inline-flex;align-items:center;gap:10px;text-decoration:none;padding:12px 18px;border-radius:12px 13px 11px 13px;border:1.5px solid #C8443C;background:#FBFBF7;color:#243130;font-size:14px;font-weight:500;box-shadow:0 6px 14px -8px rgba(47,58,57,0.4)" href="https://saver7942.blogspot.com/2026/07/3-2-12.html"><span style="color:#C8443C;font-size:16px">←</span><span><span style="font-size:11.5px;color:#93A97F;display:block">이전 편</span>네트워크 편 (1/2)</span></a></div>
