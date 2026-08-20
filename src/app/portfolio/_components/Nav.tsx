"use client";

import type { PortfolioPageMeta } from "../_data/pages";

/**
 * 포트폴리오 왼쪽에 고정되는 사이드 내비게이션.
 *
 * 이 페이지는 사이트 공용 헤더(SiteHeader)를 쓰지 않는다 — 전면 그라디언트
 * 히어로 위에 얹히는 이 nav 자체가 /portfolio 전용 헤더 역할을 한다
 * (RouteChrome.tsx 가 SiteHeader/SiteFooter를 이 라우트에서 숨긴다).
 *
 * 페이지 덱으로 바뀌면서 앵커 링크(#about)가 아니라 덱의 인덱스를 직접
 * 바꾸는 버튼이 됐다 — 현재 위치 표시도 스크롤 감지가 아니라 덱이 넘겨주는
 * activeIndex 를 그대로 쓴다(PortfolioDeck.tsx 참고).
 */
export function Nav({
  pages,
  activeIndex,
  onSelect,
}: {
  pages: PortfolioPageMeta[];
  activeIndex: number;
  onSelect: (index: number) => void;
}) {
  const sectionPages = pages.slice(1).filter((page) => !page.id.startsWith("project-"));
  const projectPages = pages.slice(1).filter((page) => page.id.startsWith("project-"));

  return (
    <nav className="cloud-nav">
      <button type="button" className="cloud-nav-link" onClick={() => onSelect(0)}>
        인사
      </button>
      <span className="cloud-nav-divider" />
      <div className="cloud-nav-links">
        {sectionPages.map((page) => {
          const pageIndex = pages.findIndex((item) => item.id === page.id);
          const active = pageIndex === activeIndex;
          return (
            <button
              key={page.id}
              type="button"
              onClick={() => onSelect(pageIndex)}
              data-active={active}
              aria-current={active ? "page" : undefined}
              className="cloud-nav-link"
            >
              {page.label}
            </button>
          );
        })}
        {projectPages.length > 0 && (
          <div className="cloud-nav-projects">
            {projectPages.map((page) => {
              const pageIndex = pages.findIndex((item) => item.id === page.id);
              const active = pageIndex === activeIndex;
              return (
                <button
                  key={page.id}
                  type="button"
                  onClick={() => onSelect(pageIndex)}
                  data-active={active}
                  aria-current={active ? "page" : undefined}
                  className="cloud-nav-link cloud-nav-project-link"
                >
                  {page.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </nav>
  );
}
