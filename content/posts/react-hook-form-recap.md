---
title: 'React Hook Form 실무 총정리: 서버 에러 매핑·데이터 직렬화와 이벤트 중심 폼 설계'
slug: react-hook-form-recap
description: >-
  폼 관리 시리즈의 결산입니다. 클라이언트 검증을 통과해도 서버의 비즈니스 검증이라는 문턱이 남습니다. 서버가 돌려준 거절 사유를
  `setError`로 입력창에 매핑하고, 전송 직전 한 곳에서 서버 규격으로 데이터를 직렬화하는 Transformer 패턴을 정리합니다.
  그리고 useFieldArray부터 reset까지 이어진 네 편을 '이벤트 중심 폼 설계'라는 한 축으로 묶고, 시리즈 인덱스를 제공합니다.
published_at: '2026-07-20T17:11:20-07:00'
labels:
  - AI 작성
  - 학습 정리
  - React
  - TypeScript
  - React Hook Form
source: 사용자 학습 노트 (React 폼 — RHF 결산/setError·Transformer·이벤트 중심 설계)
legacy_url: 'https://saver7942.blogspot.com/2026/07/react-hook-form.html'
draft: false
---

폼 관리 시리즈에서 동적 리스트, 다단계 데이터 보존, 변경분 전송, 비동기 초기화를 다뤘습니다. 이 글은 그 흐름을 **이벤트 중심 폼 설계**라는 한 축으로 정리하는 결산입니다. 여기에 실무에서 마지막으로 마주치는 두 관문 — 서버가 돌려준 에러를 화면에 되돌리는 `setError`, 서버 규격에 맞춰 데이터를 깎는 Transformer — 를 더합니다. 앞선 [상태 관리(Zustand) 시리즈](https://saver7942.blogspot.com/2026/07/zustand-zustand.html)에 이은 폼 관리 정리입니다.

#### 목차

1. [이벤트 중심 폼 설계 — 시리즈가 관통한 원칙](#1)

2. [서버 에러를 입력창에 매핑 — setError](#2-seterror)

3. [데이터 정제 — 서버 규격으로 직렬화](#3)

4. [폼 관리 시리즈 인덱스](#4)

5. [핵심 정리](#5)

---

## 📌 1. 이벤트 중심 폼 설계 — 시리즈가 관통한 원칙

네 편을 관통한 한 가지 원칙은, 매 순간 모든 상태를 쥐고 흔드는 대신 **특정 이벤트가 발생한 시점에만 폼 엔진이 반응하도록** 두는 것입니다.

React Hook Form은 **비제어(uncontrolled) 컴포넌트** 기반입니다. 입력값을 매 키 입력마다 상태로 끌어올려 전체를 다시 그리지 않고, 각 입력이 자기 DOM 값을 들고 있다가 필요한 시점에만 폼 엔진과 동기화합니다. 그래서 필드가 수십·수백 개인 화면에서도, 한 칸에 타이핑할 때 폼 전체가 리렌더되지 않습니다.

시리즈의 네 편이 모두 이 원칙 위에 있습니다.

- **useFieldArray** — 배열도 추가·삭제라는 이벤트로 다루고, `field.id`로 항목을 안정적으로 추적합니다.

- **다단계 폼** — 단계를 넘겨 입력이 언마운트돼도, 폼 엔진이 단일 저장소로 데이터를 보존합니다.

- **dirtyFields** — 변경 이벤트가 일어난 필드만 추적해, 제출 시 변경분만 골라 보냅니다.

- **reset · values** — 서버 데이터가 도착한 그 시점에 기준점을 교체합니다.

폼 엔진을 단일 진실 공급원(SSOT)으로 두고, 상태는 이벤트 시점에만 갱신한다 — 이 관점이 나머지 모든 기법의 토대입니다.

---

## 🔧 2. 서버 에러를 입력창에 매핑 — setError

클라이언트 검증을 통과한 데이터도 서버의 비즈니스 검증에서 막힐 수 있습니다. "이미 가입된 이메일"처럼, 프런트엔드가 알 수 없는 규칙이 서버에 있기 때문입니다. 서버가 `400`과 함께 필드별 사유를 돌려주면, `setError`로 각 입력창 아래에 매핑합니다.

```tsx
import { useForm, type SubmitHandler } from 'react-hook-form';

interface LoginForm {
  email: string;
  password: string;
}

export function LoginFormView() {
  const { register, handleSubmit, setError } = useForm<LoginForm>();

  const onSubmit: SubmitHandler<LoginForm> = async (data) => {
    try {
      await loginApi(data);
    } catch (err) {
      // 서버 응답 예: { errors: { email: '이미 가입된 이메일입니다' } }
      const serverErrors = (err as ApiError).response?.data?.errors;
      if (!serverErrors) return;

      // [필드명, 메시지] 쌍을 순회하며 각 입력에 주입
      Object.entries(serverErrors).forEach(([field, message]) => {
        setError(field as keyof LoginForm, {
          type: 'server',
          message: message as string,
        });
      });
    }
  };

  return <form onSubmit={handleSubmit(onSubmit)}>{/* register... */}</form>;
}
```

- **`Object.entries(serverErrors)`** — `{ email: '...' }`를 `[['email', '...']]`로 바꿔, 에러가 몇 개든 반복문 한 번으로 처리합니다.

- **`field as keyof LoginForm`** — 서버가 준 필드명이 폼 타입의 키임을 좁혀, 오타를 컴파일 타임에 잡습니다.

- **`type: 'server'`** — 에러의 출처를 구분하는 라벨입니다. 클라이언트 형식 검증과 서버 비즈니스 검증을 나눠, 조건부 렌더링 등에 활용할 수 있습니다.

여기서 원본 강의 자료의 설명 하나를 바로잡습니다. "`type: 'server'` 설정 덕분에 사용자가 수정하면 에러가 지워진다"고 하는데, **자동 제거는 `type` 값 때문이 아닙니다.** 등록된(`register`) 필드는 사용자가 값을 고칠 때 RHF가 재검증하고(기본 `reValidateMode: 'onChange'`, 첫 제출 이후), 통과하면 그 에러를 지웁니다. `type`은 어디까지나 라벨일 뿐입니다. 서버 에러를 특정 시점까지 유지하거나 원하는 순간에 지우려면 `clearErrors`로 직접 제어하는 편이 확실합니다.

---

## 🔄 3. 데이터 정제 — 서버 규격으로 직렬화

폼 안에서 다루는 데이터와 서버가 원하는 규격은 다를 때가 많습니다. `<input>` 값은 기본이 문자열이고, 태그는 배열인데 서버는 숫자·문자열을 원하는 식입니다. 전송 **직전 한 곳**에서 서버 규격으로 변환(직렬화)합니다.

```tsx
interface FormInputs {
  title: string;
  price: string;   // input 값은 문자열
  tags: string[];
}

interface CreatePostDto {
  title: string;
  price: number;
  tags: string;
  updatedAt: string;
}

const onSubmit: SubmitHandler<FormInputs> = async (formData) => {
  const dto: CreatePostDto = {
    ...formData,
    price: Number(formData.price),        // 문자열 → 숫자
    tags: formData.tags.join(','),        // ['React','TS'] → 'React,TS'
    updatedAt: new Date().toISOString(),  // ISO 8601(UTC) 표준
  };
  await submitApi(dto);
};
```

<details style="margin:10px 0 4px">
<summary style="cursor:pointer;font-weight:700;color:#C8443C">변환 전후 데이터</summary>
<pre><code>// 폼 데이터 (FormInputs)
{ title: '첫 글', price: '15000', tags: ['React', 'TS'] }

// Transformer 통과 후 서버로 가는 dto (CreatePostDto)
{ title: '첫 글', price: 15000, tags: 'React,TS', updatedAt: '2026-07-21T09:00:00.000Z' }
// price: 문자열→숫자, tags: 배열→문자열, updatedAt: 표준 시각 추가</code></pre>
</details>

- **불변성 유지** — 원본 `formData`를 직접 고치지 않고 새 객체 `dto`를 만들어, 전송 도중의 부수 효과를 차단합니다.

- **UI 데이터와 API 데이터 분리** — 폼 안에서는 자유롭게 다루되, 밖으로 나갈 때 엄격한 규격을 갖춥니다. 서버는 별도 가공 없이 바로 저장할 수 있습니다.

숫자 하나라면 변환을 아예 입력 단계로 옮길 수도 있습니다. `register('price', { valueAsNumber: true })`로 등록하면 `price`가 처음부터 `number`로 들어옵니다. 그러면 배열→문자열·날짜 표준화처럼 `register`가 못 하는 변환만 Transformer에 남아 코드가 담백해집니다.

---

## 🗺️ 4. 폼 관리 시리즈 인덱스

폼 관리 파트에서 다룬 네 편입니다. 순서대로 읽으면 동적 폼 설계부터 서버 통신 최적화까지 이어집니다.

| 주제 | 다룬 내용 |
| :---: | :---: |
| [useFieldArray](https://saver7942.blogspot.com/2026/07/react-hook-form-usefieldarray-fieldid.html) | 동적 리스트 폼 · `field.id`로 인덱스 버그 차단 |
| [다단계 폼 · FormProvider](https://saver7942.blogspot.com/2026/07/react-hook-form-formprovidershouldunreg.html) | 언마운트 데이터 보존 · `shouldUnregister` |
| [dirtyFields](https://saver7942.blogspot.com/2026/07/react-hook-form-dirtyfields-patch.html) | 변경분만 PATCH · `getDirtyValues` 재귀 |
| [reset · values](https://saver7942.blogspot.com/2026/07/react-hook-form-resetvalues-reset-vs.html) | 비동기 서버 데이터 · `reset` vs `resetField` |

---

## ✅ 5. 핵심 정리

- **이벤트 중심 · 비제어 기반** — 폼 엔진을 SSOT로 두고 이벤트 시점에만 상태를 갱신합니다. 키 입력마다 전체를 다시 그리지 않아 복잡한 폼도 쾌적합니다.

- **setError** — 서버의 거절 사유를 입력창에 매핑합니다. `type`은 출처 라벨이고, 자동 제거는 등록 필드의 재검증이 담당합니다. 유지·제거를 확실히 하려면 `clearErrors`로 제어합니다.

- **Transformer** — 전송 직전 한 곳에서 서버 규격으로 직렬화합니다(숫자·배열·날짜). 원본을 훼손하지 않는 불변성 유지가 기본입니다.

- **시리즈 흐름** — 동적 배열 → 다단계 보존 → 변경분 전송 → 안전한 초기화 → 서버 정합. 폼 하나의 생애 주기가 이 순서로 완성됩니다.

폼 하나가 데이터를 받아 서버로 돌려보내기까지의 파이프라인으로 정리하면 이렇습니다.

| 단계 | 도구 |
| :---: | :---: |
| 입력 수집 | `register` · `useFieldArray` |
| 초기값 채움 | `reset` · `values` |
| 변경분 추출 | `dirtyFields` |
| 서버 규격 변환 | Transformer (직렬화) |
| 서버 에러 반영 | `setError` |

---

## 🔗 참고 자료

- 이전 섹션: [Zustand 선언적 상태 관리 총정리](https://saver7942.blogspot.com/2026/07/zustand-zustand.html)

- [React Hook Form 공식 문서 — setError](https://react-hook-form.com/docs/useform/seterror)

- [React Hook Form 공식 문서 — register의 valueAsNumber](https://react-hook-form.com/docs/useform/register)
