---
title: Blogger API 발행은 성공했는데 터미널이 죽었다 — Windows CP949와 em dash 충돌
slug: windows-cp949-unicode-encode-error-em-dash
description: >-
  Python publish.py로 Blogger 포스트를 발행하던 중 UnicodeEncodeError가 발생했습니다. API 호출은
  성공했지만 결과 출력 단계에서 CP949가 em dash를 처리하지 못한 원인과 해결 과정을 정리합니다.
published_at: '2026-04-04T06:24:29-07:00'
labels:
  - AI 작성
  - 프로젝트
  - 블로그 파이프라인
  - 트러블슈팅
  - Claude Code
  - Python
  - Windows
source: 'C:/Users/jhs/OneDrive/바탕 화면/블로그/output/encoding-error-log.md'
legacy_url: 'https://saver7942.blogspot.com/2026/04/blogger-api-windows-cp949-em-dash.html'
draft: false
---

## 📦 배경지식

**CP949** — 한국어 Windows의 기본 문자 인코딩입니다. EUC-KR의 확장판으로, 한글과 일부 특수문자를 지원하지만 em dash(`—`, U+2014)처럼 유니코드 전용 기호는 포함하지 않습니다.

**sys.stdout.encoding** — Python의 `print()` 함수는 내부적으로 `sys.stdout`에 쓰기를 수행합니다. 이때 사용하는 인코딩이 `sys.stdout.encoding`이며, Windows 터미널에서는 시스템 코드 페이지(CP949 등)를 따릅니다. 소스 코드 인코딩(`# -*- coding: utf-8 -*-`)과는 별개입니다.

**em dash(—)** — 유니코드 U+2014 기호입니다. 영문 글쓰기에서 대시 역할을 하며, 포스트 제목 형식으로 자주 사용합니다. CP949 코드 범위에 없기 때문에 CP949 인코딩 환경에서 출력을 시도하면 에러가 발생합니다.

---

## 🐛 문제 상황

보안 취약점 포스트를 `publish.py`로 발행하는 상황입니다. 포스트 제목이 "코드 리뷰가 터뜨린 보안 경보 — Express + Socket.IO 앱에서 발견한 CRITICAL 6건 처리기"였고, 제목 중간에 em dash(`—`)가 들어 있습니다.

`python scripts/publish.py create output/draft.md --publish` 명령을 실행하면 Blogger API 호출은 정상적으로 완료되고 `published/`에 로컬 사본도 저장됩니다. 그런데 발행 결과를 터미널에 출력하는 순간 스크립트가 크래시 납니다.

발행은 됐는데 성공 메시지는 볼 수 없는, 어정쩡한 상황입니다.

---

## 🐛 에러 메시지

```
UnicodeEncodeError: 'cp949' codec can't encode character '\u2014' in position 23: illegal multibyte sequence
```

---

## 🧭 시행착오

없습니다. 에러 메시지가 원인을 명확히 가리킵니다.

`'cp949' codec can't encode character '\u2014'` — CP949가 U+2014(em dash)를 인코딩할 수 없다는 뜻입니다. `position 23`은 출력 문자열에서 em dash가 등장하는 위치입니다. 출력 문자열은 `f"  제목: {meta['title']}"` 형식이고, 제목 앞에 "  제목: " (6자)와 제목 내 em dash 앞 텍스트 17자를 합산하면 23번째 위치가 맞습니다.

---

## 🔍 원인 분석

크래시가 난 코드는 다음 줄입니다.

```python
# publish.py:80
print(f"  제목: {meta['title']}")
# meta['title'] = "코드 리뷰가 터뜨린 보안 경보 — Express + Socket.IO 앱에서 발견한 CRITICAL 6건 처리기"
#                                              ^^^ U+2014 em dash
```

Python의 `print()` 함수는 문자열을 `sys.stdout`에 씁니다. Windows 터미널에서는 `sys.stdout.encoding`이 시스템 코드 페이지를 따르며, 한국어 Windows의 기본값은 CP949입니다. CP949는 em dash를 지원하지 않기 때문에 인코딩 시도 자체가 실패합니다.

Python 소스 파일이 UTF-8로 저장되어 있어도 이 문제가 발생합니다. 소스 파일 인코딩과 표준 출력 인코딩은 서로 다른 설정이기 때문입니다.

Blogger API 호출과 `published/` 파일 저장은 에러 발생 전에 모두 완료된 상태입니다. 크래시는 오직 `print()` 호출 시점에만 발생합니다.

---

## 🛠️ 해결

### 임시 해결 — 환경변수로 실행

```bash
PYTHONIOENCODING=utf-8 python scripts/publish.py create output/draft.md --publish
```

`PYTHONIOENCODING` 환경변수로 해당 실행에 한해 stdout 인코딩을 UTF-8로 지정합니다. 스크립트를 수정하지 않아도 되는 빠른 방법입니다.

### 영구 해결 — 스크립트 시작부에 reconfigure 추가

```python
import sys

# 스크립트 시작 부분에 추가
sys.stdout.reconfigure(encoding='utf-8')
```

`sys.stdout.reconfigure()`는 Python 3.7에서 추가된 메서드입니다. 이미 열린 스트림의 인코딩을 재설정하므로, 이후 모든 `print()` 호출에 UTF-8이 적용됩니다.

이 방법은 스크립트 자체에 의도가 명시된다는 장점이 있습니다. 환경변수 방식은 실행 시마다 기억해야 하고, 다른 환경에서 실행할 때 빠뜨리기 쉽습니다.

### 참고 — Python UTF-8 모드 전역 활성화

```bash
# Windows 시스템 환경변수에 추가
set PYTHONUTF8=1
```

`PYTHONUTF8=1`을 설정하면 해당 환경의 모든 Python 3.7+ 프로세스에서 UTF-8 모드가 활성화됩니다. 개발 머신 전역에 적용하고 싶다면 시스템 환경변수에 추가하는 방법도 있습니다. 다만 기존 CP949 의존 코드가 있다면 영향을 줄 수 있으므로, 프로젝트 범위라면 스크립트 레벨 수정이 적합합니다.

---

## ✅ 핵심 정리

- **Windows Python에서 비ASCII 문자를 출력할 가능성이 있으면** `sys.stdout.reconfigure(encoding='utf-8')`을 스크립트 시작부에 추가합니다. 소스 파일이 UTF-8이어도 stdout 인코딩은 별개입니다.

- **에러 발생 위치와 실제 실패 원인은 다를 수 있습니다.** API 호출이나 파일 저장이 아닌 `print()` 한 줄이 크래시를 냅니다. 에러 메시지의 `position`과 traceback 라인을 함께 보면 원인을 빠르게 좁힐 수 있습니다.

- **em dash처럼 유니코드 전용 기호를 제목에 사용한다면** 출력 경로(터미널, 로그 파일 등) 전체가 UTF-8을 지원하는지 확인합니다.

- **`PYTHONIOENCODING=utf-8`은 임시 처방**, `sys.stdout.reconfigure()`는 코드에 의도를 남기는 영구 처방입니다. 팀 환경이나 CI에서는 환경변수 방식이 더 적합할 수 있습니다.
