"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TocScrollSpy } from "./TocScrollSpy";

type NavItem = { href: string; label: string };

/**
 * 포트폴리오 페이지 전용 헤더 nav.
 *
 * 포트폴리오는 본문이 길어 자체 목차가 있었는데, 헤더 nav와 목차가 동시에
 * 떠 있으면 같은 역할을 하는 바가 두 줄로 겹친다. 그래서 /portfolio 에서는
 * 헤더 nav 자체를 이 5개 섹션 앵커로 바꾸고, 페이지 안의 목차는 없앴다.
 *
 * id 목록만 쓰므로(라벨 slug 계산 없음) 여기 하드코딩해도 안전하다.
 *
 * "ai"를 id로 쓰면 안 된다 — HTML의 named access on Window 스펙 때문에
 * id가 있는 엘리먼트는 자동으로 window[id]가 되는데, Chrome이 실험적
 * window.ai 내장 AI API를 이미 점유하고 있어 충돌하면서 하이드레이션이
 * 깨진다(콘솔에는 "Hydration failed" 로만 찍혀 원인 추적이 어려웠다).
 * "ai-work"처럼 접미사를 붙여 우회한다.
 */
const PORTFOLIO_NAV = [
  { id: "about", label: "소개" },
  { id: "projects", label: "프로젝트" },
  { id: "ai-work", label: "AI" },
  { id: "skills", label: "스킬" },
  { id: "career", label: "경력" },
];

/**
 * 기본 nav(학습정리/프로젝트/포트폴리오)는 labelSlug 로 라벨 slug를 계산해야 해서
 * 서버 컴포넌트(SiteHeader)가 만들어 props 로 내려준다. 이 컴포넌트를 통째로
 * "use client" 로 만들면 labelSlug 가 물고 있는 getAllPosts(node:fs 사용)까지
 * 클라이언트 번들에 딸려 들어가 빌드가 깨진다 — 그래서 경로 판단과 목차만
 * 클라이언트로 떼어냈다.
 */
export function HeaderNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const isPortfolio = pathname?.startsWith("/portfolio") ?? false;

  if (!isPortfolio) {
    return (
      <>
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="nav-link whitespace-nowrap text-[15.5px] font-medium text-ink no-underline"
          >
            {item.label}
          </Link>
        ))}
      </>
    );
  }

  return (
    <>
      {PORTFOLIO_NAV.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          data-toc-for={item.id}
          data-active="false"
          className="nav-link whitespace-nowrap text-[15.5px] font-medium text-ink no-underline"
        >
          {item.label}
        </a>
      ))}
      <TocScrollSpy ids={PORTFOLIO_NAV.map((item) => item.id)} />
    </>
  );
}
