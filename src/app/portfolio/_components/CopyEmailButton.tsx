"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 이메일 복사 버튼 + 토스트.
 *
 * 원본(portfolio.html)은 바닐라 스크립트로 클립보드 API → execCommand → 수동 선택
 * 순서로 폴백했다. 같은 폴백을 리액트 상태로 옮겼다 — DOM을 직접 만들던 토스트 엘리먼트를
 * 컴포넌트 상태로 대체한 것 외에는 동작이 같다.
 */
export function CopyEmailButton({ email, className }: { email: string; className: string }) {
  const [toast, setToast] = useState<{ message: string; warn: boolean } | null>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function say(message: string, warn = false) {
    setToast({ message, warn });
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setToast(null), 1900);
  }

  function legacyCopy(value: string): boolean {
    const ta = document.createElement("textarea");
    ta.value = value;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-999px";
    document.body.appendChild(ta);
    ta.select();
    let done = false;
    try {
      done = document.execCommand("copy");
    } catch {
      done = false;
    }
    document.body.removeChild(ta);
    return done;
  }

  function manualSelect() {
    const label = labelRef.current;
    if (label) {
      try {
        const range = document.createRange();
        range.selectNodeContents(label);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      } catch {
        // 선택 불가 환경 — 토스트 안내만 남긴다
      }
    }
    say("복사가 막혔습니다. Ctrl+C를 눌러 주세요", true);
  }

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(email);
        say("메일 주소를 복사했습니다.");
        return;
      } catch {
        // 폴백으로 진행
      }
    }
    if (legacyCopy(email)) {
      say("메일 주소를 복사했습니다.");
    } else {
      manualSelect();
    }
  }

  return (
    <>
      <a
        className={className}
        href={`mailto:${email}`}
        aria-label={`${email} 복사`}
        title="클릭하면 주소가 복사됩니다"
        onClick={handleClick}
      >
        <span ref={labelRef}>{email}</span>
      </a>
      <div className={`cloud-toast${toast ? " show" : ""}${toast?.warn ? " warn" : ""}`} role="status" aria-live="polite">
        {toast?.message}
      </div>
    </>
  );
}
