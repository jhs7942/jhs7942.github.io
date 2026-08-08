---
title: 'React Hook Form 다단계 폼: 언마운트돼도 데이터 지키기 (FormProvider·shouldUnregister)'
slug: react-hook-form-multi-step
description: >-
  다단계(위저드) 폼은 단계를 넘길 때 이전 단계의 입력이 언마운트됩니다. 그 데이터가 함께 사라지면 곤란합니다. RHF는
  `shouldUnregister`로 언마운트된 필드의 값 유지 여부를 정하고(v7 기본값은 유지),
  `FormProvider`·`useFormContext`로 하나의 폼 엔진을 모든 단계가 공유하며, 구조화된 `defaultValues`로
  전체 데이터 자리를 예약합니다. 수동 백업 없이 폼 엔진 하나로 다단계 데이터를 관리하는 패턴을 정리합니다.
published_at: '2026-07-12T19:59:07-07:00'
labels:
  - AI 작성
  - 학습 정리
  - React
  - TypeScript
  - React Hook Form
source: 사용자 학습 노트 (React 폼 — RHF 다단계 폼/shouldUnregister/FormProvider)
legacy_url: >-
  https://saver7942.blogspot.com/2026/07/react-hook-form-formprovidershouldunreg.html
draft: false
---

여러 단계로 나뉜 위저드 폼에서 "다음" 버튼을 누르면 이전 단계의 입력들이 화면에서 사라집니다. 이때 입력했던 값까지 사라지면, 뒤로 돌아왔을 때 빈 칸만 남습니다. React Hook Form으로 다단계 폼을 만들 때 데이터를 지키는 패턴을 정리합니다. [이전 글(useFieldArray)](https://saver7942.blogspot.com/2026/07/react-hook-form-usefieldarray-fieldid.html)에 이어 폼 관리 두 번째 글입니다.

#### 목차

1. [다단계 폼에서 데이터가 사라진다](#1)

2. [원인: 언마운트와 unregister](#2-unregister)

3. [shouldUnregister로 유지 여부 제어](#3-shouldunregister)

4. [FormProvider와 useFormContext](#4-formprovider-useformcontext)

5. [주의사항](#5)

6. [핵심 정리](#6)

---

## 📦 1. 다단계 폼에서 데이터가 사라진다

조건부 렌더링으로 단계를 전환하는 다단계 폼입니다.

```tsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';

export function DataLossForm() {
  const [step, setStep] = useState(1);
  const { register, handleSubmit } = useForm();

  return (
    <form onSubmit={handleSubmit((d) => console.log(d))}>
      {step === 1 && <input {...register('email')} placeholder="이메일" />}
      {step === 2 && <input {...register('nickname')} placeholder="닉네임" />}

      {step === 1 && <button type="button" onClick={() => setStep(2)}>다음</button>}
      {step === 2 && <button type="button" onClick={() => setStep(1)}>이전</button>}
    </form>
  );
}
```

`step`이 2가 되는 순간, React는 Step 1의 `input`을 DOM에서 제거합니다. 설정에 따라, 다시 Step 1로 돌아왔을 때 `email` 값이 비어 있을 수 있습니다. 왜 그럴까요?

---

## 🔍 2. 원인: 언마운트와 unregister

원인은 두 가지가 겹칩니다.

- **언마운트(unmount)** — 조건부 렌더링에서 사라진 컴포넌트를 React가 DOM에서 완전히 제거합니다.

- **자동 unregister** — RHF가 언마운트된 필드를 관리 대상에서 빼면서 그 값을 삭제합니다.

**여기서 버전을 반드시 확인해야 합니다.** 이 삭제 동작은 RHF 버전에 따라 기본값이 다릅니다.

- **RHF v6** — 언마운트 시 값을 삭제하는 것이 기본이었습니다. 다단계 폼에서 데이터가 사라지는 문제가 여기서 생겼습니다.

- **RHF v7+** — **`shouldUnregister: false`가 기본값**으로 바뀌었습니다. 즉 언마운트돼도 값이 유지되어, 다단계 폼 데이터가 기본적으로 보존됩니다.

정리하면, 최신 RHF(v7+)에서는 이 데이터 유실이 기본적으로 일어나지 않습니다. 데이터가 사라진다면 `shouldUnregister: true`로 설정돼 있거나 구버전일 가능성이 큽니다.

---

## 🛠️ 3. shouldUnregister로 유지 여부 제어

버전 기본값에 의존하기보다, 의도를 코드로 명시하는 편이 안전합니다. `useForm`에서 직접 설정합니다.

```tsx
const methods = useForm({
  shouldUnregister: false, // 언마운트돼도 값 유지 (v7 기본값과 동일, 의도를 명시)
  defaultValues: {
    step1: { email: '', name: '' },
    step2: { address: '', phone: '' },
    step3: { agreement: false },
  },
});
```

- `shouldUnregister: false` — 입력이 화면에서 사라져도 폼 엔진이 값을 유지합니다. 반대로 `true`면 언마운트 시 값을 제거해, 조건부 필드를 폼에서 빼고 싶을 때 씁니다.

- 구조화된 `defaultValues` — 아직 렌더되지 않은 단계(`step2`, `step3`)의 자리까지 미리 잡아 두면, 데이터 경로와 초기화가 안정적입니다.

---

## 🏗️ 4. FormProvider와 useFormContext

다단계 폼에서는 각 단계 컴포넌트가 **하나의 폼 엔진을 공유**해야 합니다. `register`를 부모에서 자식으로 계속 내려주면 prop drilling이 됩니다. `FormProvider`로 엔진을 하위 트리에 공급하고, 각 단계는 `useFormContext`로 꺼내 씁니다.

```tsx
// 부모: src/components/MultiStepForm.tsx
import { useForm, FormProvider } from 'react-hook-form';

export function MultiStepForm() {
  const methods = useForm({
    shouldUnregister: false,
    defaultValues: { step1: { email: '', name: '' }, /* ... */ },
  });

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit((data) => console.log(data))}>
        <CurrentStep />
      </form>
    </FormProvider>
  );
}
```

```tsx
// 자식: src/components/steps/Step1.tsx
import { useFormContext } from 'react-hook-form';

export function Step1() {
  const { register, formState: { errors } } = useFormContext();

  return (
    <div>
      <input {...register('step1.email', { required: '이메일은 필수입니다.' })} />
      {errors.step1?.email && <p>{String(errors.step1.email.message)}</p>}
    </div>
  );
}
```

- `FormProvider {...methods}` — `useForm`이 돌려준 도구 전체를 하위 트리에 공급합니다.

- `useFormContext()` — 자식이 `register`를 props로 받지 않고 엔진에 직접 접속합니다. 부모는 흐름만, 자식은 자기 UI만 맡습니다.

- `register('step1.email')` — 중첩 경로로 자기 자리에 등록합니다. 에러도 `errors.step1?.email`처럼 경로를 따라 접근합니다.

---

## ⚠️ 5. 주의사항

- **`shouldUnregister` 기본값은 버전마다 다릅니다.** RHF v7+는 `false`(유지)가 기본입니다. 대상 버전을 확인하고, 헷갈린다면 명시적으로 설정합니다.

- **`shouldUnregister: false`면 언마운트된 필드도 제출 데이터에 포함됩니다.** 조건부로 나타났다 사라지는 필드를 제출에서 빼고 싶다면 `true`가 맞습니다. 의도에 맞게 고릅니다.

- **수동 백업은 대개 불필요합니다.** 폼 데이터는 폼 엔진(`useForm`)이 단일 저장소로 관리합니다. 별도 전역 상태(Zustand 등)로 이중 백업하면 두 저장소가 어긋나는 버그 위험이 생깁니다.

- **`defaultValues`로 전체 구조를 잡아 둡니다.** 단계별 중첩 구조를 미리 선언하면 경로 타입 추론과 초기화가 안정적입니다.

---

## ✅ 6. 핵심 정리

- **다단계 폼 = 엔진 하나 공유** — `FormProvider`로 하나의 `useForm` 엔진을 모든 단계에 공급하고, `useFormContext`로 접속합니다. prop drilling이 사라집니다.

- **언마운트와 데이터** — 언마운트된 필드의 값 유지 여부는 `shouldUnregister`가 정합니다. RHF v7+ 기본은 유지(`false`)라, 다단계 데이터가 기본 보존됩니다.

- **구조 예약** — 구조화된 `defaultValues`로 아직 렌더 안 된 단계의 자리까지 확보합니다.

- **단일 저장소** — 폼 엔진이 곧 SSOT입니다. 제출 시 한 번도 동시에 화면에 없던 단계들의 데이터가 하나로 병합됩니다.

```json
{
  "step1": { "email": "user@example.com", "name": "홍길동" },
  "step2": { "address": "서울시 강남구", "phone": "010-1234-5678" },
  "step3": { "agreement": true }
}
```

| 방식 | 다단계 데이터 관리 |
| :---: | :---: |
| 수동 백업 (Zustand 등) | 단계마다 저장·복구 배선 + 이중 관리 위험 |
| `FormProvider` + `shouldUnregister` | 폼 엔진 단일 저장소가 자동 보존 |

---

## 🔗 참고 자료

- [React Hook Form 공식 문서 — useFormContext](https://react-hook-form.com/docs/useformcontext)

- [React Hook Form 공식 문서 — useForm의 shouldUnregister](https://react-hook-form.com/docs/useform#shouldUnregister)

<p style="margin:24px 0 2px;padding:13px 18px;border:1.5px solid #C8443C;border-radius:14px 15px 13px 15px;background:rgba(200,68,60,0.06);text-align:center;font-size:14.5px;line-height:1.7;color:#2F3A39">🧩 <b>React Hook Form 폼 관리 시리즈</b> &nbsp;·&nbsp; <a style="color:#C8443C;font-weight:700;text-decoration:none" href="https://saver7942.blogspot.com/2026/07/react-hook-form.html">전체 정리 · 목차 보기 →</a></p>
