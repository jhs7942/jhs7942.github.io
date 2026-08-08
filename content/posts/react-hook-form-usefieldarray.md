---
title: 'React Hook Form useFieldArray: 동적 리스트 폼을 field.id로 안전하게 관리하기'
slug: react-hook-form-usefieldarray
description: >-
  경력 사항처럼 개수가 변하는 동적 리스트 폼을 `useState`로 만들면 인덱스 계산과 `key` 버그로 값이 어긋나고 포커스가 튑니다.
  React Hook Form의 `useFieldArray`는 추가·삭제·순서 변경을 메서드 하나로 처리하고, 각 항목에 고유
  `field.id`를 부여해 인덱스를 `key`로 쓸 때의 버그를 없앱니다. 배열 폼 설계부터 조작 메서드, `field.id` 활용까지
  정리합니다.
published_at: '2026-07-10T00:37:43-07:00'
labels:
  - AI 작성
  - 학습 정리
  - React
  - TypeScript
  - React Hook Form
source: 사용자 학습 노트 (React 폼 — RHF useFieldArray/동적 리스트)
legacy_url: >-
  https://saver7942.blogspot.com/2026/07/react-hook-form-usefieldarray-fieldid.html
draft: false
series: react-hook-form
part: 1
---

상태 관리(Zustand) 다음은 폼 관리입니다. 개수가 고정된 폼은 단순하지만, 경력·주소처럼 사용자가 항목을 추가·삭제하는 **동적 리스트 폼**은 까다롭습니다. `useState`로 배열을 직접 관리하면 삭제 시 인덱스가 밀리며 엉뚱한 칸의 값이 사라지거나 포커스가 튀곤 합니다. React Hook Form(RHF)의 **`useFieldArray`**는 이 문제를 배열 조작 메서드와 고유 `field.id`로 해결합니다. (이 글은 RHF의 `useForm`·`register` 기본을 안다고 가정합니다.) 앞선 [상태 관리 시리즈](/posts/react-zustand-declarative-recap/)에 이어, 여기서부터는 폼을 다룹니다.

---

## 📦 1. 왜 useFieldArray인가

동적 리스트를 `useState`로 관리하면, 추가·삭제할 때마다 배열을 복사하고 인덱스를 직접 계산해야 합니다. 특히 리스트의 `key`로 인덱스를 쓰면, 중간 항목을 삭제할 때 React가 항목을 잘못 매칭해 값이 어긋나거나 입력 중이던 포커스가 풀립니다.

`useFieldArray`는 이 문제를 해결합니다.

- **데이터 무결성** — RHF 내부 저장소와 UI를 동기화해 "지웠는데 남는" 현상을 없앱니다.

- **고유 `field.id`** — 각 항목에 안정적인 id를 부여해, 인덱스를 `key`로 쓸 때의 버그를 차단합니다.

- **조작 메서드** — 추가·삭제뿐 아니라 순서 변경(`move`)·중간 삽입(`insert`)을 메서드 하나로 처리합니다.

---

## 🏗️ 2. 폼 설계: interface와 defaultValues

동적 리스트는 대개 객체 배열입니다. 먼저 그 구조를 `interface`로 선언합니다.

```tsx
interface CareerForm {
  careers: { company: string; period: string }[]; // 객체 배열
}
```

이 타입 덕분에 나중에 `careers.0.company` 같은 경로를 쓸 때 타입 추론의 보호를 받습니다.

배열 필드를 다룰 때는 `useForm`의 **`defaultValues`를 반드시 설정**합니다. 초기 구조가 있어야 RHF가 배열 형태를 안정적으로 인지합니다.

```tsx
const { register, control, handleSubmit } = useForm<CareerForm>({
  defaultValues: {
    careers: [{ company: '', period: '' }], // 빈 칸 하나로 시작
  },
});
```

- 빈 리스트로 시작하려면 `careers: []`로 둬도 되지만, 입력칸 하나를 미리 두면 사용자 경험이 낫습니다.

- `control`은 `useFieldArray`가 RHF 엔진과 소통하는 통로입니다.

---

## 🛠️ 3. useFieldArray로 배열 조작

`control`과 배열 필드명 `name`을 넘기면, 실시간 데이터 `fields`와 조작 메서드를 돌려줍니다.

```tsx
const { fields, append, remove, move, insert } = useFieldArray({
  control,
  name: 'careers',
});
```

`fields`는 RHF 내부 저장소를 구독하는 스냅샷입니다. 아래 메서드로 저장소를 바꾸면, 그 변화가 `fields`에 반영되어 화면이 갱신됩니다.

| 메서드 | 동작 |
| :---: | :---: |
| `append(obj)` | 맨 뒤에 추가 (가장 흔함) |
| `prepend(obj)` | 맨 앞에 추가 (최신순에 유용) |
| `remove(index)` | 삭제 — 연결된 에러·상태도 함께 정리 |
| `move(from, to)` | 순서 변경 — `id`·포커스 유지 |
| `insert(index, obj)` | 특정 위치에 삽입 |
| `replace(arr)` | 전체를 새 배열로 교체 |

- `remove`는 값만 지우는 게 아니라 그 항목에 연결된 유효성 에러·`dirty` 상태까지 정리합니다.

- `move`는 인덱스를 재조정하면서도 각 항목의 `field.id`를 유지하므로, 순서가 바뀌어도 입력 포커스가 풀리지 않습니다.

---

## 🆔 4. field.id를 key로 — 인덱스 버그 차단

`fields`의 각 요소에는 우리가 정의하지 않은 `id` 속성이 들어 있습니다. 리스트를 그릴 때 `key`로 **인덱스가 아니라 이 `field.id`**를 씁니다.

```tsx
{fields.map((field, index) => (
  <div key={field.id}> {/* index가 아니라 field.id */}
    <input {...register(`careers.${index}.company`)} placeholder="회사명" />
  </div>
))}
```

인덱스를 `key`로 쓰면, 중간 항목 삭제 시 React가 "마지막 항목이 지워졌다"고 오해해 남은 입력들의 값·포커스가 꼬입니다. `field.id`는 항목이 생성될 때 발급되어 순서 변경·삭제에도 그 데이터를 끝까지 따라다니므로 이 문제가 사라집니다.

전체 예제입니다. `key`는 `field.id`, 입력 경로는 `index`로 안내합니다.

```tsx
import { useForm, useFieldArray, type SubmitHandler } from 'react-hook-form';

interface CareerForm {
  careers: { company: string; period: string }[];
}

export function SmartDynamicForm() {
  const { register, control, handleSubmit } = useForm<CareerForm>({
    defaultValues: { careers: [{ company: '', period: '' }] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'careers' });

  const onSubmit: SubmitHandler<CareerForm> = (data) => console.log(data);

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {fields.map((field, index) => (
        <div key={field.id}>
          <input {...register(`careers.${index}.company`)} placeholder="회사명" />
          <input {...register(`careers.${index}.period`)} placeholder="근무 기간" />
          <button type="button" onClick={() => remove(index)}>삭제</button>
        </div>
      ))}

      <button type="button" onClick={() => append({ company: '', period: '' })}>
        + 항목 추가
      </button>
      <button type="submit">전송</button>
    </form>
  );
}
```

<details>
<summary>전송하면 데이터에 field.id가 들어갈까?</summary>
<pre><code>// 추가·삭제·순서 변경 후 전송한 data:
{
  careers: [
    { company: "회사A", period: "2년" },
    { company: "회사B", period: "1년" }
  ]
}
// field.id는 RHF 내부용이라 폼 값에 포함되지 않는다 (서버 전송 시 자동 제외)</code></pre>
</details>

---

## ⚠️ 5. 주의사항

- **`key`에는 반드시 `field.id`를 씁니다.** 인덱스를 `key`로 쓰면 삭제·순서 변경에서 값·포커스가 꼬입니다. `field.id`는 항목 수명 동안 안정적입니다(단 `replace`·`reset`로 갈아끼우면 새 id가 발급됩니다).

- **배열 필드에는 `defaultValues`를 설정합니다.** 초기 구조가 없으면 첫 항목 추가나 렌더에서 문제가 생길 수 있습니다. 빈 리스트는 `careers: []`로 명시합니다.

- **경로 타입은 최신 RHF가 대체로 추론합니다.** 예전에는 `register` 경로 문자열 끝에 `as const`를 붙여 타입을 확정했는데, 최근 버전에서는 대개 없어도 `careers.0.company` 같은 경로 타입이 추론됩니다.

- **커스텀/제어 컴포넌트는 `Controller`를 씁니다.** 기본 `register`는 비제어(uncontrolled) 입력용입니다. 커스텀 셀렉트·데이트피커 등 제어 컴포넌트는 `Controller`로 연결합니다.

---

## ✅ 6. 핵심 정리

- **`useFieldArray`** — RHF에서 동적 배열 폼을 다루는 훅입니다. `control`과 `name`을 넘겨 `fields`와 조작 메서드를 받습니다.

- **조작 메서드** — `append`·`prepend`·`remove`·`move`·`insert`·`replace`로 추가·삭제·순서 변경·삽입·교체를 처리합니다.

- **`field.id`** — 각 항목의 고유 id입니다. `key`로 인덱스 대신 이 값을 써서, 삭제·순서 변경 시의 값·포커스 버그를 차단합니다.

- **`defaultValues` 필수** — 배열 필드는 초기 구조가 있어야 안정적으로 동작합니다.

| 요소 | 역할 |
| :---: | :---: |
| `fields` | 항목 스냅샷 (각 항목에 `field.id` 포함) |
| `append`·`remove`·`move`·`insert` | 추가·삭제·순서 변경·삽입 |
| `key={field.id}` | 인덱스 key 버그 차단 |
| `defaultValues` | 배열 초기 구조 |

---

## 🔗 참고 자료

- [React Hook Form 공식 문서 — useFieldArray](https://react-hook-form.com/docs/usefieldarray)

- 이전 섹션: [Zustand 선언적 상태 관리 총정리](/posts/react-zustand-declarative-recap/)
