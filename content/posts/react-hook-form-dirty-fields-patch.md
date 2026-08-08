---
title: React Hook Form dirtyFields로 변경된 값만 PATCH하기 (getDirtyValues 유틸리티)
slug: react-hook-form-dirty-fields-patch
description: >-
  수정 페이지에서 50개 필드 중 이름 하나만 고쳤는데 50개를 통째로 서버에 보내는 건 낭비입니다. React Hook Form의
  `dirtyFields`는 `defaultValues`를 기준으로 실제 변경된 필드만 기록합니다. 이 장부와 전체 값을 대조하는
  `getDirtyValues` 재귀 유틸리티로 변경분만 추려 가벼운 PATCH 요청을 만드는 실무 패턴을 정리합니다. 중첩 객체와 배열
  필드를 어떻게 처리하는지가 핵심입니다.
published_at: '2026-07-20T16:55:25-07:00'
labels:
  - AI 작성
  - 학습 정리
  - React
  - TypeScript
  - React Hook Form
source: 사용자 학습 노트 (React 폼 — RHF dirtyFields/PATCH 최적화)
legacy_url: 'https://saver7942.blogspot.com/2026/07/react-hook-form-dirtyfields-patch.html'
draft: false
series: react-hook-form
part: 5
---

지난 글에서 [다단계 폼의 데이터를 지키는 법](/posts/react-hook-form-multi-step/)을 다뤘습니다. 이번엔 그렇게 채운 폼을 **서버로 보낼 때**의 이야기입니다. 수정 페이지에서 필드가 50개인데 사용자가 이름 하나만 고쳤다면, 50개를 전부 보내는 것은 네트워크와 서버 양쪽에 불필요한 부담입니다. React Hook Form은 무엇이 실제로 바뀌었는지 이미 알고 있습니다. `dirtyFields`를 활용해 변경분만 골라 보내는 패턴을 정리합니다. 폼 관리 시리즈 세 번째 글입니다.

---

## 📦 1. 전체가 아니라 변경분만 — PUT과 PATCH

수정 페이지의 제출 방식은 크게 둘로 나뉩니다.

- **PUT** — 리소스 전체를 덮어씁니다. 바뀐 필드가 하나여도 전체를 보냅니다.

- **PATCH** — 바뀐 부분만 보냅니다. 본문에 없는 필드는 "변경 없음"으로 취급됩니다.

식당에서 콜라만 사이다로 바꾸고 싶을 때 "콜라만 사이다로 바꿔 주세요"라고 하지, 상을 처음부터 다시 차려 달라고 하지 않는 것과 같습니다. 변경분만 보내는 편이 서버의 일을 줄입니다.

부담을 줄이는 것 외에 **데이터 무결성** 측면의 이유도 있습니다. 전체를 덮어쓰면 바뀌지 않은 필드까지 서버가 다시 처리합니다. 예를 들어 이름만 고쳤는데 비밀번호 필드까지 페이로드에 실려 오면, 서버가 이미 해시된 비밀번호를 한 번 더 해싱하는 식의 부작용이 생길 수 있습니다. 최악의 경우 이중 해싱으로 로그인이 막힙니다. 변경분만 보내면 이런 위험이 줄고, 서버도 "무엇을 바꿔야 하는지" 명확히 인지합니다.

문제는 프런트엔드에서 "무엇이 바뀌었는지"를 어떻게 아느냐입니다. 여기서 `dirtyFields`가 등장합니다.

---

## 🔍 2. dirtyFields — 무엇이 바뀌었는지 아는 상태

React Hook Form은 사용자가 어떤 필드를 건드렸고 그 값이 초기값과 달라졌는지를 실시간으로 추적합니다. 그 결과가 `formState.dirtyFields`입니다.

- **dirty의 의미** — 초기값(`defaultValues`)과 달라진 필드를 "dirty(변경됨)"로 표시합니다.

- **작동 조건** — `useForm`에 `defaultValues`가 기준점으로 설정돼 있어야 합니다. 기준이 없으면 무엇이 달라졌는지 판단할 수 없습니다.

- **형태** — 값 자체가 아니라, 변경된 필드를 `true`로 기록하는 객체입니다.

여기서 원본 강의 자료와 실제 동작이 갈리는 지점이 하나 있습니다. **`dirtyFields`에는 변경된 키만 담깁니다.** 변경되지 않은 필드는 `false`로 남는 것이 아니라 키 자체가 존재하지 않습니다.

```tsx
// defaultValues: { name: 'Gemini', age: 20 }
// name만 'Gemini AI'로 수정한 뒤 dirtyFields:
{
  name: true,   // 변경됨
  // age는 아예 없음 — 'false'로 남지 않는다
}
```

그래서 뒤에서 만들 유틸리티는 `Object.keys(dirtyFields)`, 즉 **변경 후보 명단만** 순회하면 됩니다. 하나 더, 값을 초기값으로 되돌리면 RHF는 그 키를 `dirtyFields`에서 제거합니다. "건드렸다"가 아니라 "실제로 달라졌다"만 잡히므로, 되돌린 필드가 요청에 끼는 일은 없습니다.

---

## 🛠️ 3. getDirtyValues — 변경분만 추리는 재귀 유틸리티

`dirtyFields`는 "어디가 바뀌었는지"만 알려줄 뿐, 실제 값은 담고 있지 않습니다. 변경 여부(`dirtyFields`)와 전체 값(`getValues` 또는 제출 데이터)을 대조해 실제 변경값을 뽑아내는 함수가 필요합니다.

주소(`city`, `zip`)처럼 객체 안에 객체가 있는 중첩 구조까지 훑으려면 재귀가 필요합니다.

```typescript
import type { FieldValues } from 'react-hook-form';

/**
 * dirtyFields와 전체 값을 대조해, 변경된 값만 추려 반환한다.
 * 배열은 몇 번째가 바뀌었는지 부분 표기가 불가능하므로, 하나라도 바뀌면 통째로 담는다.
 */
export function getDirtyValues<T extends FieldValues>(
  dirtyFields: object,
  values: T,
): Partial<T> {
  const result: Record<string, unknown> = {};

  for (const key of Object.keys(dirtyFields)) {
    const dirty = (dirtyFields as Record<string, unknown>)[key];

    if (dirty === true || Array.isArray(dirty)) {
      // 단일 필드 변경, 또는 배열(부분 표기 불가 → 전체 전송)
      result[key] = values[key];
    } else if (typeof dirty === 'object' && dirty !== null) {
      // 중첩 객체 → 재귀로 파고들어 변경분만 추린다
      const child = getDirtyValues(dirty, values[key] as FieldValues);
      if (Object.keys(child).length > 0) result[key] = child;
    }
  }

  return result as Partial<T>;
}
```

핵심 분기는 세 갈래입니다.

- **`dirty === true`** — 단일 필드가 바뀐 경우. `values`에서 실제 값을 꺼내 담습니다.

- **`Array.isArray(dirty)`** — 배열 필드. 이 처리가 원본 강의 자료와 결정적으로 다른 부분입니다(아래 설명).

- **중첩 객체** — 자기 자신을 다시 호출해 안쪽을 파고들고, 변경분이 실제로 있을 때만 결과에 담습니다.

### 배열을 왜 통째로 보내는가

원본 강의 자료의 유틸리티는 배열을 `!Array.isArray(currentField)` 조건으로 **제외**합니다. 그런데 이렇게 하면 배열 필드는 단일 값도 아니고 재귀 대상도 아니게 되어, **변경돼도 결과에서 조용히 누락됩니다.** 바로 이전 글에서 다룬 [useFieldArray](/posts/react-hook-form-usefieldarray/) 같은 동적 리스트를 쓰는 폼이라면, 항목을 고쳐도 서버로 전송되지 않는 버그가 됩니다.

배열은 "3번째 원소의 이 필드만 바뀜"을 부분적으로 표기할 마땅한 방법이 없습니다. 인덱스가 밀리거나 순서가 바뀌면 부분 표기가 오히려 위험합니다. 그래서 **하나라도 dirty면 배열 전체를 담아** 서버가 통으로 교체하도록 하는 편이 안전합니다. 위 코드가 `Array.isArray(dirty)`를 단일 필드와 같은 갈래로 묶어 `values[key]` 전체를 담는 이유입니다.

<details>
<summary>중첩 구조에서 실제로 뭐가 추려지나</summary>
<pre><code>// defaultValues (서버에서 받아온 초기값)
{ name: '홍길동', age: 30, address: { city: '서울', zip: '06000' } }

// 사용자가 name과 address.city만 수정

// dirtyFields
{ name: true, address: { city: true } }

// getDirtyValues(dirtyFields, values) 결과 = PATCH 본문
{ name: '이몽룡', address: { city: '부산' } }
// age, address.zip은 빠짐 — 바뀐 값만 남는다</code></pre>
</details>

---

## 🏗️ 4. 수정 페이지에 적용 — isDirty 가드에서 PATCH까지

유틸리티를 실제 제출 로직에 연결합니다. 세 관문을 차례로 거칩니다.

```tsx
import { useForm, type SubmitHandler } from 'react-hook-form';
import { getDirtyValues } from './getDirtyValues';

interface ProfileForm {
  name: string;
  age: number;
  address: { city: string; zip: string };
}

export function EditProfile({ initialData }: { initialData: ProfileForm }) {
  const {
    register,
    handleSubmit,
    formState: { dirtyFields, isDirty },
  } = useForm<ProfileForm>({
    defaultValues: initialData, // 관문 0: 서버 초기값이 비교의 기준점
  });

  const onSubmit: SubmitHandler<ProfileForm> = async (values) => {
    // 관문 1: 바뀐 게 없으면 요청 자체를 보내지 않는다
    if (!isDirty) {
      alert('수정된 내용이 없습니다.');
      return;
    }

    // 관문 2: 변경분만 추린다
    const patch = getDirtyValues<ProfileForm>(dirtyFields, values);

    // 관문 3: 가벼워진 본문만 PATCH 전송
    await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch), // 예: { name: '이몽룡' } 만 전송
    });
  };

  return <form onSubmit={handleSubmit(onSubmit)}>{/* register... */}</form>;
}
```

동작 순서는 이렇습니다.

1. **기준 설정** — `defaultValues`에 서버 초기값을 넣는 순간, RHF가 비교 기준점을 잡습니다.

2. **변경 감시** — 사용자가 입력하면 `dirtyFields`에 해당 키가 `true`로 기록됩니다.

3. **무변경 차단** — 제출 시 `isDirty`가 `false`면(아무것도 안 바뀜) 통신을 막습니다.

4. **선별 전송** — `getDirtyValues`가 변경분만 추려 `patch`를 만들고, 그것만 서버로 보냅니다.

제출 콜백을 `SubmitHandler<ProfileForm>`으로 타이핑한 점에 주목합니다. `values`가 폼 타입으로 좁혀지므로, `patch`를 다룰 때 오타나 잘못된 경로를 컴파일 타임에 잡을 수 있습니다. 원본 자료의 `data: any`는 이 안전망을 스스로 걷어내는 셈이라 피합니다.

---

## ⚠️ 5. 주의사항

- **`defaultValues`가 없으면 `dirtyFields`도 `isDirty`도 무력합니다.** 기준점이 없으면 변경 여부를 판단할 수 없습니다. 초기값이 비동기로 늦게 도착한다면 `reset(serverData)`로 기준점을 다시 잡아 줍니다.

- **배열 필드는 통째로 전송됩니다.** `useFieldArray`로 만든 동적 리스트는 원소 하나만 고쳐도 배열 전체가 `patch`에 담깁니다. 서버가 그 필드를 통으로 교체하는 설계인지 확인해야 합니다. 이 동작은 버그가 아니라 배열의 한계에서 나온 의도된 선택입니다.

- **서버도 부분 수정을 이해해야 합니다.** PATCH 본문에 없는 필드를 "변경 없음"으로 취급하는 서버라야 합니다. 전체 덮어쓰기 방식의 서버라면 누락된 필드가 오히려 비워질 수 있습니다.

- **되돌린 값은 dirty가 아닙니다.** 값을 초기값과 같게 되돌리면 RHF가 해당 키를 `dirtyFields`에서 빼므로, 실수로 건드렸다 되돌린 필드는 요청에 끼지 않습니다.

- **제출 데이터에 `any`를 쓰지 않습니다.** `SubmitHandler<T>`로 콜백을 타이핑하면 `patch` 구성의 오류를 타입 검사가 잡아 줍니다.

---

## ✅ 6. 핵심 정리

- **PATCH는 변경분만** — 전체 덮어쓰기(PUT) 대신 바뀐 필드만 보내 네트워크·서버 부담과 의도치 않은 부작용(이중 해싱 등)을 줄입니다.

- **`dirtyFields`** — `defaultValues`를 기준으로 변경된 필드만 `true`로 담는 객체입니다. 변경 안 된 키는 아예 없고, 되돌린 값은 자동으로 빠집니다.

- **`getDirtyValues`** — `dirtyFields`를 순회하며 변경분만 추리는 재귀 유틸리티입니다. 중첩 객체는 파고들고, 배열은 통째로 담습니다.

- **`isDirty` 가드** — 아무것도 안 바뀌었으면 요청 자체를 보내지 않습니다.

- **타입 안전** — `SubmitHandler<T>`로 제출 데이터를 타이핑해, `patch` 구성의 오류를 컴파일 타임에 막습니다.

| 요소 | 역할 |
| :---: | :---: |
| `defaultValues` | 변경 판단의 기준점 |
| `dirtyFields` | 변경된 키만 `true` |
| `getDirtyValues` | 변경분 추출 (중첩 재귀·배열 전체) |
| `isDirty` | 무변경 시 요청 차단 |

---

## 🔗 참고 자료

- [React Hook Form 공식 문서 — formState (dirtyFields·isDirty)](https://react-hook-form.com/docs/useform/formstate)

- [React Hook Form 공식 문서 — reset](https://react-hook-form.com/docs/useform/reset)
