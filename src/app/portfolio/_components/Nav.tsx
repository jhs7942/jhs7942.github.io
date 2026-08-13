"use client";

import type { PortfolioPageMeta } from "../_data/pages";
import { GitHubIcon } from "./GitHubIcon";

/**
 * 화면 중앙 상단에 뜬 알약 모양 내비게이션.
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
  githubUrl,
}: {
  pages: PortfolioPageMeta[];
  activeIndex: number;
  onSelect: (index: number) => void;
  githubUrl: string;
}) {
  return (
    <nav className="cloud-nav">
      <button type="button" className="cloud-nav-brand" onClick={() => onSelect(0)}>
        jhs7942
      </button>
      <span className="cloud-nav-divider" />
      {/* 0번(홈)은 위 브랜드 버튼이 대신하므로 목록에서는 뺀다 */}
      {pages.slice(1).map((page, i) => {
        const pageIndex = i + 1;
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
      <a href={githubUrl} target="_blank" rel="noopener" className="cloud-nav-cta">
        <GitHubIcon className="cloud-nav-cta-icon" />
        GitHub
      </a>
    </nav>
  );
}
