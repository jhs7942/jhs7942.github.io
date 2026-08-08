---
title: React Hook Form reset·values로 비동기 서버 데이터 안전하게 채우기 (reset vs resetField)
slug: react-hook-form-reset-values-async
description: >-
  수정 페이지의 함정은 제출이 아니라 시작점에 있습니다. 서버 데이터가 비동기로 늦게 도착하면 `useForm`의
  `defaultValues`는 이미 굳어 버려 빈 폼만 남습니다. 데이터가 도착한 시점에 `reset`으로 기준점째 교체하는 정석 패턴,
  필드 하나만 되돌리는 `resetField`, v7.45+의 선언적 `values` 속성, 그리고 사용자가 수정 중인 값을 지키는
  `keepDirtyValues` 옵션까지 정리합니다.
published_at: '2026-07-20T17:03:04-07:00'
labels:
  - AI 작성
  - 학습 정리
  - React
  - TypeScript
  - React Hook Form
source: 사용자 학습 노트 (React 폼 — RHF reset/resetField/values·비동기 로딩)
legacy_url: >-
  https://saver7942.blogspot.com/2026/07/react-hook-form-resetvalues-reset-vs.html
draft: false
---

지난 글에서 [dirtyFields로 변경분만 PATCH하는 법](https://saver7942.blogspot.com/2026/07/react-hook-form-dirtyfields-patch.html)을 다뤘습니다. 그 모든 것의 전제는 "기준점(`defaultValues`)이 올바르게 잡혀 있다"였습니다. 그런데 수정 페이지에서 서버 데이터가 비동기로 늦게 도착하면, 이 기준점부터 어긋납니다. 데이터를 불러왔는데 입력창이 비어 있는 버그가 대표적입니다. 폼에 데이터를 안전하게 채워 넣는 시작점을 `reset`·`resetField`·`values`로 정리합니다. 폼 관리 시리즈 네 번째 글입니다.

#### 목차

1. [defaultValues에 서버 데이터를 직접 넣으면 안 되는 이유](#1-defaultvalues)

2. [reset — 비동기 로딩의 정석 패턴](#2-reset)

3. [reset vs resetField — 전체 교체와 부분 교체](#3-reset-vs-resetfield)

4. [values 속성 — 선언적 동기화 (v7.45+)](#4-values-v745)

5. [reset 옵션으로 세밀하게 제어하기](#5-reset)

6. [주의사항](#6)

7. [핵심 정리](#7)

---

## 📦 1. defaultValues에 서버 데이터를 직접 넣으면 안 되는 이유

가장 흔한 실수는 `useForm`의 `defaultValues`에 비동기 데이터를 그대로 넣는 것입니다.

```tsx
const { data } = useQuery({ queryKey: ['user'], queryFn: fetchUser });

// 안티패턴: 마운트 순간 data는 대개 undefined
const { register } = useForm({
  defaultValues: data, // data가 나중에 도착해도 폼은 갱신되지 않는다
});
```

이 코드가 실패하는 이유는 폼 엔진의 초기화 시점에 있습니다.

- **마운트 시점 고착** — React Hook Form은 컴포넌트가 마운트될 때 `defaultValues`를 딱 한 번 읽어 기준점으로 굳힙니다.

- **비동기 지연** — 서버 데이터는 네트워크를 타고 오므로, 첫 렌더 시점의 `data`는 대개 아직 `undefined`입니다.

- **반영 실패** — 나중에 `data`가 도착해 값이 바뀌어도, 이미 초기화가 끝난 엔진은 새 값을 다시 읽지 않습니다. 결국 데이터를 불러왔는데도 빈 입력창만 남습니다.

핵심은 "폼에 값을 넣는 일"과 "폼을 초기화하는 일"을 분리하는 것입니다. 초기화는 마운트 때 한 번, 값 주입은 데이터가 도착한 시점에. 그 값 주입을 담당하는 것이 `reset`입니다.

---

## 🛠️ 2. reset — 비동기 로딩의 정석 패턴

`reset`은 입력창의 글자를 지우는 도구가 아니라, 폼 엔진의 **기준점(초기 상태) 자체를 통째로 갈아 끼우는** 명령입니다. 서버 데이터로 `reset`을 호출하면 값이 채워지는 동시에 `isDirty`·`touchedFields` 같은 상태가 깨끗하게 초기화됩니다. "방금 서버에서 온 수정 안 된 상태"라고 선언하는 셈입니다.

`useEffect`와 결합한 정석 패턴입니다.

```tsx
import { useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';

interface UserProfile {
  name: string;
  email: string;
}

export function UserProfileForm({ userId }: { userId: string }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { isDirty },
  } = useForm<UserProfile>(); // 초기엔 비어 있음

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/users/${userId}`);
      const userData: UserProfile = await res.json();
      reset(userData); // 데이터 도착 시점에 기준점째 교체
    };
    load();
  }, [userId, reset]); // userId가 바뀌면 다시 불러와 리셋

  const onSubmit: SubmitHandler<UserProfile> = (data) => console.log(data);

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('name')} placeholder="이름" />
      <input {...register('email')} placeholder="이메일" />
      {/* reset 직후 isDirty=false → 실제 수정 전까지 비활성화 */}
      <button type="submit" disabled={!isDirty}>저장</button>
    </form>
  );
}
```

- **`reset(userData)`** — 값을 채우면서 기준점을 그 데이터로 교체하고, 수정 흔적(`isDirty`)을 `false`로 되돌립니다.

- **의존성 `[userId, reset]`** — `userId`가 바뀌면 `useEffect`가 다시 돌아, 페이지 전환 시에도 폼이 항상 최신 사용자를 바라봅니다. `reset`은 RHF가 안정적으로 메모이즈하므로 의존성에 넣어도 무한 루프가 없습니다.

- **`disabled={!isDirty}`** — `reset`으로 깨끗해진 덕에, 사용자가 한 글자라도 고치기 전까지 저장 버튼이 비활성화됩니다. 불필요한 요청을 원천 차단하는 UX입니다.

---

## 🔍 3. reset vs resetField — 전체 교체와 부분 교체

`reset`은 폼 **전체**를 다룹니다. 인자로 넘긴 데이터가 새 기준점이 되고, **넘기지 않은 필드는 비워집니다(`undefined`).** 그래서 일부 필드만 되돌리려는 목적에는 맞지 않습니다. 이때는 `resetField`로 필드 하나만 집어냅니다.

```tsx
// 전체 교체 — 모든 필드 + 기준점 교체, isDirty=false
reset(userData);

// 부분 교체 — 지정한 필드만, 나머지는 그대로 둔다
resetField('email');                              // email을 기준값으로 되돌림
resetField('email', { defaultValue: 'new@x.com' }); // 새 기준값을 지정하며 되돌림
```

- **`reset(values)`** — 폼 전체의 값·기준점·상태를 교체합니다. 서버에서 새 데이터를 통째로 받아 채울 때.

- **`resetField(name)`** — 다른 필드는 건드리지 않고 한 필드만 초기화합니다. "이 칸만 되돌리기" 버튼이나, 특정 필드만 서버 값으로 되돌릴 때.

방 전체를 새 손님 기준으로 다시 정돈하는 것이 `reset`, 수건 하나만 교체하는 것이 `resetField`라고 보면 구분이 쉽습니다.

---

## 🚀 4. values 속성 — 선언적 동기화 (v7.45+)

React Hook Form v7.45 이상에서는 `useEffect`+`reset`을 직접 쓰지 않고, `useForm`의 `values` 속성으로 같은 일을 선언적으로 처리할 수 있습니다.

```tsx
const { data } = useQuery({ queryKey: ['user', userId], queryFn: fetchUser });

const { register } = useForm<UserProfile>({
  values: data, // data가 바뀔 때마다 내부적으로 reset이 자동 실행된다
  resetOptions: { keepDirtyValues: true }, // 사용자가 수정 중인 값은 보존
});
```

- **간결함** — `useEffect`와 `reset` 배선을 손으로 짤 필요가 없습니다.

- **자동 동기화** — 외부 `data`가 바뀌면 폼이 자동으로 따라갑니다. 서버 값이 실시간으로 변하는 화면에 잘 맞습니다.

다만 `values`는 외부 데이터가 바뀔 때마다 폼을 다시 채우므로, **사용자가 수정 중이던 값이 덮어써질 수 있습니다.** 원본 강의 자료는 여기서 "옵션 설정을 추가로 고려하라"고만 하는데, 그 옵션의 정체는 `resetOptions: { keepDirtyValues: true }`입니다. 이 한 줄이면 자동 동기화를 받으면서도 사용자가 손댄 필드는 지켜집니다.

---

## ⚙️ 5. reset 옵션으로 세밀하게 제어하기

`reset`은 두 번째 인자로 옵션 객체를 받아 "무엇을 유지할지"를 고를 수 있습니다. `values`와 함께 쓸 때는 위처럼 `resetOptions`로 전달합니다.

```tsx
reset(userData, { keepDirtyValues: true, keepErrors: true });
```

| 옵션 | 효과 |
| :---: | :---: |
| `keepDirtyValues` | 사용자가 수정 중인 값은 덮어쓰지 않음 (`values`·자동저장에 필수) |
| `keepErrors` | 이전 유효성 검사 에러 메시지를 화면에 유지 |
| `keepDefaultValues` | 값(UI)은 바꾸되 기준점은 유지 → `isDirty`가 `true`로 남음 |
| `keepIsSubmitted` | 제출 여부(`isSubmitted`) 상태를 그대로 유지 |

`keepDefaultValues`가 특히 헷갈리기 쉽습니다. 값은 새로 주입하되 기준점은 옛것을 유지하므로, 주입한 값과 기준점이 달라 **`isDirty`가 `true`로 남습니다.** "새 값을 채웠지만 아직 저장 안 된 변경으로 취급"하고 싶을 때 씁니다.

---

## ⚠️ 6. 주의사항

- **`values`는 수정 중인 값을 덮어쓸 수 있습니다.** 사용자가 입력 중인 폼에 `values`를 쓴다면 `resetOptions: { keepDirtyValues: true }`를 함께 걸어야 합니다.

- **`reset`에 넘기지 않은 필드는 비워집니다.** 일부만 되돌리려다 `reset`을 쓰면 나머지가 `undefined`가 됩니다. 부분 초기화는 `resetField`입니다.

- **`reset`은 렌더 도중 직접 호출하지 않습니다.** `useEffect`나 이벤트 핸들러 안에서 호출합니다. 렌더 함수 본문에서 부르면 렌더 중 상태 변경으로 경고·무한 루프가 납니다.

- **`defaultValues`와 `values`를 함께 주면 `values`가 기준으로 동작합니다.** `defaultValues`는 최초 마운트 표시용, 이후 동기화는 `values`가 담당합니다. 역할을 섞지 않습니다.

- **의존성 배열에 `reset`을 넣어도 안전합니다.** RHF가 함수를 안정적으로 유지하므로, `[userId, reset]`이 불필요한 재실행을 만들지 않습니다.

---

## ✅ 7. 핵심 정리

- **defaultValues는 마운트 때 한 번 굳습니다.** 비동기 서버 데이터를 여기 직접 넣으면 첫 렌더의 `undefined`가 박혀 빈 폼이 됩니다.

- **reset이 기준점을 교체합니다.** 데이터가 도착한 시점에 `reset(data)`로 값·기준점·상태를 한 번에 새로 잡습니다. `isDirty`도 `false`로 초기화됩니다.

- **resetField는 필드 하나만.** 전체 교체는 `reset`, 부분 교체는 `resetField`로 구분합니다.

- **values는 선언적 동기화(v7.45+).** `useEffect`+`reset`을 대체하되, 수정 중 값 보존은 `keepDirtyValues`가 책임집니다.

- **옵션으로 유지 범위를 고릅니다.** `keepDirtyValues`·`keepErrors`·`keepDefaultValues`·`keepIsSubmitted`로 무엇을 남길지 정합니다.

| 상황 | 도구 |
| :---: | :---: |
| 서버 데이터로 폼 전체 채우기 | `reset(data)` (`useEffect` 안) |
| 필드 하나만 되돌리기 | `resetField(name)` |
| 외부 데이터 자동 동기화 | `values` 속성 (v7.45+) |
| 수정 중 값 보존 | `keepDirtyValues` |

---

## 🔗 참고 자료

- [React Hook Form 공식 문서 — reset](https://react-hook-form.com/docs/useform/reset)

- [React Hook Form 공식 문서 — resetField](https://react-hook-form.com/docs/useform/resetfield)

- [React Hook Form 공식 문서 — useForm의 values·resetOptions](https://react-hook-form.com/docs/useform)

<p style="margin:24px 0 2px;padding:13px 18px;border:1.5px solid #C8443C;border-radius:14px 15px 13px 15px;background:rgba(200,68,60,0.06);text-align:center;font-size:14.5px;line-height:1.7;color:#2F3A39">🧩 <b>React Hook Form 폼 관리 시리즈</b> &nbsp;·&nbsp; <a style="color:#C8443C;font-weight:700;text-decoration:none" href="https://saver7942.blogspot.com/2026/07/react-hook-form.html">전체 정리 · 목차 보기 →</a></p>
