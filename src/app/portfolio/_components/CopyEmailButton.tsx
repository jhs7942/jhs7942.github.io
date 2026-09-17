"use client";

import { useRef } from "react";
import type { VariantProps } from "class-variance-authority";
import { Button, buttonVariants } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

/**
 * 이메일 복사 버튼.
 *
 * 원본(portfolio.html)은 바닐라 스크립트로 클립보드 API → execCommand → 수동 선택
 * 순서로 폴백했다. 같은 폴백을 그대로 유지한다.
 *
 * 알림은 직접 만들던 .cloud-toast <div> 대신 shadcn 토스트 매니저에 넘긴다 —
 * 레이아웃의 <Toaster> 가 aria-live·스택·스와이프 해제까지 맡는다.
 */
export function CopyEmailButton({
  email,
  variant = "hand-ghost",
  size = "hand",
}: { email: string } & VariantProps<typeof buttonVariants>) {
  const labelRef = useRef<HTMLSpanElement>(null);

  function say(message: string, warn = false) {
    toast.add({ title: message, type: warn ? "warning" : "success", timeout: 1900 });
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
        // 선택 불가 환경 — 안내만 남긴다
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
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      aria-label={`${email} 복사`}
      title="클릭하면 주소가 복사됩니다"
      render={<a href={`mailto:${email}`} />}
    >
      <span ref={labelRef}>{email}</span>
    </Button>
  );
}
