import Link from "next/link";
import { SITE } from "@/lib/site";
import { labelSlug } from "@/lib/content/labels";
import { HeaderNav } from "./HeaderNav";

/**
 * 손그림 테두리용 SVG 필터.
 *
 * feTurbulence 로 만든 노이즈를 feDisplacementMap 으로 테두리에 먹여 선을 흔든다.
 * 테두리를 별도 레이어(.wobble)로 겹치는 이유는, 필터를 요소 자체에 걸면 안의
 * 텍스트까지 같이 일그러지기 때문이다.
 */
export function RoughFilters() {
  return (
    <svg aria-hidden width="0" height="0" style={{ position: "absolute" }}>
      <defs>
        <filter id="rough">
          <feTurbulence type="fractalNoise" baseFrequency="0.014" numOctaves={2} seed={7} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={4} />
        </filter>
        <filter id="rough2">
          <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves={2} seed={3} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={3} />
        </filter>
      </defs>
    </svg>
  );
}

const NAV = [
  { href: `/labels/${labelSlug("학습 정리")}/`, label: "학습정리" },
  { href: `/labels/${labelSlug("프로젝트")}/`, label: "프로젝트" },
  { href: "/portfolio/", label: "포트폴리오" },
];

/**
 * NAV(라벨 slug 계산이 필요)는 서버에서 만들어 HeaderNav 에 넘긴다.
 * labelSlug 자체는 getAllPosts(node:fs) 를 물고 있어 클라이언트 번들에 들어가면
 * 빌드가 깨지므로, 계산은 이 서버 컴포넌트가 하고 HeaderNav 에는 계산된
 * 배열만 데이터로 내려준다. /portfolio 에서는 이 헤더 자체가 RouteChrome 에
 * 의해 렌더링되지 않는다(구름 테마 전용 Nav를 쓴다).
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-100 border-b-[1.5px] border-line bg-[rgba(131,207,201,0.92)] backdrop-blur-[6px]">
      <div className="mx-auto flex max-w-[1120px] items-center justify-between gap-5 px-7 py-4">
        <Link href="/" className="shrink-0 text-ink no-underline">
          <span className="text-[22px] tracking-[-0.5px] whitespace-nowrap">{SITE.title}</span>
        </Link>
        {/* min-w-0 이 없으면 flex 아이템이 줄어들지 않아 overflow-x가 먹지 않고,
            좁은 화면에서 한글 항목명이 글자 단위로 줄바꿈되는 문제(포트폴리오는
            5개라 특히 심함)가 생긴다. nav만 스크롤시키고 BLOG 배지는 항상 보이게 뺐다. */}
        <div className="flex min-w-0 items-center gap-4 sm:gap-[26px]">
          <nav className="nav-scroll flex min-w-0 items-center gap-4 overflow-x-auto sm:gap-[26px]">
            <HeaderNav items={NAV} />
          </nav>
          <span
            className="shrink-0 bg-accent px-[11px] py-1.5 text-[11px] tracking-[1px] text-cream"
            style={{ borderRadius: "9px 10px 8px 10px", boxShadow: "0 5px 12px -6px rgba(47,58,57,0.5)" }}
          >
            BLOG
          </span>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer id="about" className="relative bg-sage px-7 pt-16 pb-12 text-cream">
      <div className="mx-auto flex max-w-[1120px] flex-wrap items-start justify-between gap-10">
        <div className="max-w-[520px]">
          <p className="mb-4 text-[22px]">{SITE.title}</p>
          <p className="m-0 text-[15px] leading-[1.8] opacity-90">
            배우고 만든 것을 빠짐없이 남기는 개발 기록. 발행을 자동화해 놓치는 것 없이 쌓아 갑니다.
          </p>
        </div>
        <div>
          <p className="m-0 mb-3.5 text-[11px] tracking-[1.5px] opacity-70">둘러보기</p>
          <div className="flex flex-col gap-2.5">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="footer-link text-[15px] text-cream no-underline opacity-90">
                {item.label}
              </Link>
            ))}
            <a href="#top" className="footer-link text-[15px] text-cream no-underline opacity-90">
              맨 위로
            </a>
          </div>
        </div>
      </div>
      <div className="mx-auto mt-10 flex max-w-[1120px] flex-wrap justify-between gap-4 border-t-[1.5px] border-[rgba(251,251,247,0.28)] pt-[22px] text-[15px] font-bold opacity-85">
        <span>{SITE.title}</span>
      </div>
    </footer>
  );
}
