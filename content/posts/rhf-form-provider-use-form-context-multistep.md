---
title: 'React Hook Form 다단계 폼: FormProvider·useFormContext와 shouldUnregister'
slug: rhf-form-provider-use-form-context-multistep
description: >-
  React Hook Form의 `FormProvider`와 `useFormContext`를 사용하면 다단계 폼에서 Prop Drilling
  없이 폼 상태를 공유할 수 있습니다. 부모 컴포넌트에서 `useForm`으로 단일 엔진을 생성하고 `FormProvider`로 감싸면, 하위
  단계 컴포넌트는 `useFormContext`로 `register`·`errors` 등 도구에 바로 접근합니다.
  `shouldUnregister: false` 옵션과 `defaultValues`의 선언적 구조 설계가 합쳐지면, 화면에서 사라진 단계의
  입력값도 폼 내부 저장소에서 유지되어 최종 제출 시 모든 단계 데이터를 한 번에 수집할 수 있습니다.
published_at: '2026-07-13T06:51:07-07:00'
labels:
  - AI 작성
  - 학습 정리
  - React
source: >-
  C:/Users/jhs02/AppData/Local/Temp/claude/C--Users-jhs02-Desktop-blog/fe27660a-d234-405a-bb90-f7629ae1dff8/scratchpad/rhf-multistep-material.md
legacy_url: >-
  https://saver7942.blogspot.com/2026/07/react-hook-form-formprovideruseformcont.html
draft: false
series: react-hook-form
part: 4
---

다단계 폼(마법사 UI)을 구현할 때 흔히 맞닥뜨리는 문제가 있습니다. 1단계에서 이메일을 입력하고 2단계로 이동하면, 1단계 컴포넌트가 DOM에서 사라지면서 입력값도 함께 사라집니다. 최종 제출 시 모든 단계의 데이터를 하나로 모으려면 어떻게 해야 할까요?

React Hook Form은 이 문제를 **FormProvider + useFormContext + shouldUnregister** 조합으로 해결합니다.

## 📦 1. FormProvider와 useFormContext

React Hook Form이 제공하는 Context API 기반 도구입니다. 다단계 폼에서 부모의 폼 엔진을 자식 컴포넌트들이 공유할 때 사용합니다.

### FormProvider

- 역할: `useForm`에서 생성된 도구(`register`, `handleSubmit` 등)를 자식 컴포넌트에 전달합니다.

- 원리: 내부적으로 `Context.Provider`를 사용해 하위 트리의 모든 컴포넌트가 부모 폼 상태를 참조할 수 있습니다.

### useFormContext

- 역할: 부모가 제공한 Context에서 폼 도구를 꺼내 쓰는 훅입니다.

- **Prop Drilling 해결**: 부모 → 자식 → 손자로 `register`를 단계마다 넘기면 중간 컴포넌트에 불필요한 props가 생깁니다. `useFormContext`를 쓰면 중간 컴포넌트를 건너뛰고 부모 엔진에 직접 접근합니다.

| | FormProvider | useFormContext |
| :---: | :---: | :---: |
| **위치** | 부모 (Context 공급) | 자식 (Context 수신) |
| **역할** | useForm 도구를 하위 트리에 적재 | Context에서 폼 도구를 꺼냄 |
| **전제 조건** | `useForm` 호출 후 사용 | `FormProvider` 하위에서만 동작 |

## 🏗️ 2. 메인 엔진 설정과 defaultValues 설계

부모 컴포넌트에서 단일 폼 엔진을 생성하고 `FormProvider`로 감쌉니다. 각 단계의 데이터 자리를 `defaultValues`로 미리 확보하는 것이 핵심입니다.

```tsx
// src/components/MultiStepForm.tsx
import { useForm, FormProvider } from "react-hook-form";

export default function MultiStepForm() {
  const methods = useForm({
    shouldUnregister: false, // 언마운트 시 데이터 삭제 방지
    mode: "onChange",        // 실시간 검증
    defaultValues: {
      // 각 단계 데이터가 들어갈 구조를 미리 정의
      step1: { email: "", name: "" },
      step2: { address: "", phone: "" },
      step3: { agreement: false }
    }
  });

  return (
    // FormProvider: 하위 모든 단계가 이 엔진을 공유
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(data => console.log("최종 데이터:", data))}>
        <CurrentStepComponent />
      </form>
    </FormProvider>
  );
}
```

- **`shouldUnregister: false`** — 입력 컴포넌트가 DOM에서 제거돼도 폼 내부 저장소의 값을 유지합니다. 기본값은 `true`(언마운트 시 값 제거)이므로 다단계 폼에서는 반드시 명시해야 합니다.

- **`defaultValues`의 선언적 구조** — 화면에 아직 표시되지 않은 2·3단계 데이터 자리까지 미리 확보해, 각 단계 컴포넌트가 자신의 경로(`step1.email` 등)에 안정적으로 등록할 수 있습니다.

- **`<FormProvider {...methods}>`** — `useForm`이 반환한 `methods`를 전개 연산자로 넘겨 `register`·`control`·`errors` 등 모든 도구가 `useFormContext`로 접근 가능해집니다.

## 🛠️ 3. 하위 단계에서 데이터 접속

부모가 `FormProvider`로 감싸면, 자식 단계 컴포넌트는 `useFormContext`만으로 부모 엔진에 접근합니다. `register`를 props로 받을 필요가 없습니다.

```tsx
// src/components/steps/Step1Component.tsx
import { useFormContext } from "react-hook-form";

function Step1Component() {
  // 부모 FormProvider가 제공하는 도구를 가져옴
  const { register, formState: { errors } } = useFormContext();

  return (
    <div>
      <h2>Step 1: 기본 정보</h2>
      {/* 부모 defaultValues 경로(step1.email)를 타겟팅 */}
      <input
        {...register("step1.email", { required: "이메일은 필수입니다." })}
        placeholder="이메일 주소"
      />
      {errors.step1?.email && <p>{errors.step1.email.message}</p>}
    </div>
  );
}
```

- **`useFormContext`** — `register`를 props로 받지 않아도 됩니다. 부모는 단계 흐름 제어, 자식은 자기 UI 렌더링만 담당하는 관심사 분리가 이뤄집니다.

- **경로 기반 등록(`step1.email`)** — 부모 저장소 내 자신의 데이터 위치를 지정합니다. 컴포넌트가 언마운트돼도 `shouldUnregister: false` 덕에 이 경로의 값은 유지됩니다.

- **`errors.step1?.email`** — 중첩 경로 구조에 맞춰 에러 상태도 객체 경로로 접근합니다. 이전 단계의 에러 상태 역시 보존됩니다.

## 📊 4. 시스템 검증: 데이터 영속성 확인

아래 흐름으로 `shouldUnregister: false`의 동작을 확인할 수 있습니다.

1. 1단계에서 이메일·이름을 입력하고 2단계로 이동합니다.

2. 개발자 도구에서 1단계 `<input>` 요소가 DOM에서 사라졌는지 확인합니다.

3. '이전' 버튼으로 1단계로 돌아오면, 인풋이 다시 렌더링되고 입력값이 그대로 채워집니다.

4. 모든 단계를 완료하고 제출하면 폼 엔진이 단계별 데이터를 병합해 콘솔에 출력합니다.

```tsx
// MultiStepForm.tsx — handleSubmit 콜백
methods.handleSubmit(data => console.log("최종 데이터:", data))
```

<details>
<summary>실행 결과 보기</summary>
<pre><code>// 콘솔 출력
최종 데이터: {
  "step1": { "email": "user@example.com", "name": "홍길동" },
  "step2": { "address": "서울시 강남구", "phone": "010-1234-5678" },
  "step3": { "agreement": true }
}</code></pre>
</details>

각 단계 컴포넌트가 동시에 화면에 존재한 적 없어도, 폼 엔진의 단일 저장소 안에서 데이터가 유지되기 때문에 최종 병합이 가능합니다.

## 🔍 5. 수동 백업 vs shouldUnregister 비교

`shouldUnregister: false` 이전에는 단계 이동 시 Zustand 등 외부 상태 관리 도구에 데이터를 수동 백업하는 방식이 일반적이었습니다.

| | 수동 백업 방식 | shouldUnregister: false |
| :---: | :---: | :---: |
| **코드 복잡도** | 단계 이동마다 저장 함수 호출 + 외부 상태 관리 | 옵션 설정 한 줄로 자동화 |
| **에러 상태 보존** | `errors`·`isDirty` 등 메타 정보 수동 백업 어려움 | 데이터·에러·메타 정보 모두 보존 |
| **데이터 무결성** | 외부 상태와 폼 엔진 데이터 불일치 위험 | 폼 엔진 단일 저장소(Single Source of Truth) |
| **개발자 개입** | 높음 — 저장·복원 로직 직접 구현 필요 | 낮음 — 옵션 설정만 필요 |

## ⚠️ 6. 주의사항

- **`shouldUnregister` 기본값은 `true`** — 기본 동작이 언마운트 시 값 제거이므로, 다단계 폼에서 값 유지가 필요하면 `useForm({ shouldUnregister: false })`를 명시해야 합니다. 누락 시 이전 단계 입력값이 제출 시 비어 있을 수 있습니다.

- **`defaultValues` 구조 선언 필수** — 각 단계의 경로(`step1.email` 등)를 `defaultValues`에 미리 선언하지 않으면, 언마운트 후 복원 시 데이터 경로가 확보되지 않아 값 관리가 예측하기 어려워집니다.

- **`useFormContext`는 `FormProvider` 하위에서만 동작** — `FormProvider` 밖에서 호출하면 `null`을 반환합니다. 컴포넌트 트리에서 `FormProvider`가 감싸고 있는지 반드시 확인하십시오.

## ✅ 7. 핵심 정리

- `FormProvider`는 `useForm`의 도구를 하위 트리에 전달하고, `useFormContext`는 자식 컴포넌트에서 이를 꺼내 씁니다. 두 API 조합이 다단계 폼의 Prop Drilling 문제를 해결합니다.

- `shouldUnregister: false`를 설정하면 컴포넌트가 언마운트돼도 폼 엔진 내부의 값·에러·메타 정보가 유지됩니다. 기본값(`true`)과 반대이므로 명시적으로 설정해야 합니다.

- `defaultValues`에 모든 단계의 경로를 미리 선언해 두면, 화면에 없는 단계의 데이터 자리가 확보되어 최종 제출 시 누락 없이 병합됩니다.

- 부모는 단계 흐름 제어, 자식은 자기 UI 렌더링만 담당하는 관심사 분리가 이뤄집니다.

- 수동 백업 방식 대비 코드 복잡도를 낮추고, 에러·메타 정보까지 폼 엔진 단일 저장소에서 일관되게 관리할 수 있습니다.

## 🔗 참고 자료

- [React Hook Form: useWatch vs getValues](/posts/rhf-usewatch-vs-getvalues/) — 이전 RHF 학습 정리: 구독(`useWatch`)과 스냅샷(`getValues`)의 차이와 리렌더링 전략
