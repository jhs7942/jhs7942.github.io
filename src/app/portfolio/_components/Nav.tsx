import { TocScrollSpy } from "@/app/_components/TocScrollSpy";

const NAV_ITEMS = [
  { id: "about", label: "소개" },
  { id: "career", label: "경험" },
  { id: "skills", label: "스킬" },
  { id: "ai-work", label: "AI" },
  { id: "projects", label: "프로젝트" },
];

/**
 * 화면 중앙 상단에 뜬 알약 모양 내비게이션.
 *
 * 이 페이지는 사이트 공용 헤더(SiteHeader)를 쓰지 않는다 — 전면 그라디언트
 * 히어로 위에 얹히는 이 nav 자체가 /portfolio 전용 헤더 역할을 한다
 * (RouteChrome.tsx 가 SiteHeader/SiteFooter를 이 라우트에서 숨긴다).
 */
export function Nav({ githubUrl }: { githubUrl: string }) {
  return (
    <nav className="cloud-nav">
      <a href="#top" className="cloud-nav-brand">
        jhs7942
      </a>
      <span className="cloud-nav-divider" />
      {NAV_ITEMS.map((item) => (
        <a key={item.id} href={`#${item.id}`} data-toc-for={item.id} data-active="false" className="cloud-nav-link">
          {item.label}
        </a>
      ))}
      <a href={githubUrl} target="_blank" rel="noopener" className="cloud-nav-cta">
        GitHub ↗
      </a>
      <TocScrollSpy ids={NAV_ITEMS.map((item) => item.id)} />
    </nav>
  );
}
