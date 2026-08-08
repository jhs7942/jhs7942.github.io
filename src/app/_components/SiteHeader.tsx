import Link from "next/link";
import { SITE } from "@/lib/site";

/**
 * 상단 바.
 *
 * 원본 테마(theme/main-page-v2.html)의 로고 배지 + 텍스트 조합을 옮겼다.
 * 배지의 비대칭 라운드가 이 디자인의 서명이라 그대로 살린다.
 */
export function SiteHeader() {
  return (
    <header className="border-b border-border-soft">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-5 px-6 py-4">
        <Link href="/" className="flex items-center gap-3 text-heading">
          <span
            aria-hidden
            className="grid size-9 place-items-center border-[1.5px] border-border bg-surface font-display text-lg text-accent shadow-sm"
            style={{ borderRadius: "var(--radius-hand-sm)" }}
          >
            승
          </span>
          <span className="font-display text-xl tracking-tight">{SITE.title}</span>
        </Link>

        <nav className="flex items-center gap-5 text-sm">
          <Link href="/" className="hover:text-accent">
            글
          </Link>
          <Link href="/labels/" className="hover:text-accent">
            라벨
          </Link>
        </nav>
      </div>
    </header>
  );
}
