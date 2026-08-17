import type { Metadata } from "next";
import { absoluteUrl, SITE } from "@/lib/site";
import "./portfolio.css";
import { profile } from "./_data/profile";
import { projects } from "./_data/projects";
import { CloudCursorTrail } from "./_components/CloudCursorTrail";
import { CloudDriftLayer } from "./_components/CloudDriftLayer";
import { CloudMotion } from "./_components/CloudMotion";
import { PortfolioDeck } from "./_components/PortfolioDeck";
import { Hero } from "./_components/Hero";
import { AboutSection } from "./_components/AboutSection";
import { CareerSection } from "./_components/CareerSection";
import { SkillsSection } from "./_components/SkillsSection";
import { AiSection } from "./_components/AiSection";
import { ProjectPage } from "./_components/ProjectPage";
import { handFont } from "./_lib/fonts";

/**
 * 포트폴리오 — "구름" 테마.
 *
 * Claude Design(claude.ai/design)에서 만든 handoff 목업(Portfolio.dc.html)을
 * 이식했다. 세로로 이어지는 문서가 아니라 섹션마다 한 장씩 넘겨 보는 덱이라,
 * 페이지 넘김 · 좌우 이동 버튼 · 첫 방문 안내는 모두 PortfolioDeck.tsx 가
 * 맡는다. 사이트 공용 헤더 · 푸터는 이 라우트에서 쓰지 않는다 — 전면 히어로
 * 위에 뜨는 Nav가 헤더 역할을 대신한다(RouteChrome.tsx 참고).
 *
 * 대부분의 섹션은 장식이 전부 CSS 도형이라 데이터 + JSX로 옮겼다(_data/*.ts
 * 참고). 예외는 AI 섹션 — 손그림 SVG 파이프라인 다이어그램이 많아 이전처럼
 * content/pages/portfolio/*.html 조각으로 남겨 뒀다(_lib/loadFragment.ts 참고).
 */
export const metadata: Metadata = {
  title: { absolute: "정현승 | 웹 개발자 포트폴리오" },
  description:
    "공공·지자체 SI 프로젝트부터 개인 서비스까지, React·TypeScript를 중심으로 프론트엔드·백엔드·인프라를 경험한 웹 개발자 정현승의 포트폴리오입니다.",
  keywords: [
    "정현승",
    "웹 개발자",
    "프론트엔드 개발자",
    "React",
    "TypeScript",
    "SI",
    "포트폴리오",
  ],
  alternates: { canonical: absoluteUrl("/portfolio/") },
  openGraph: {
    type: "website",
    locale: SITE.locale,
    url: absoluteUrl("/portfolio/"),
    siteName: SITE.title,
    title: "정현승 | 웹 개발자 포트폴리오",
    description:
      "공공·지자체 SI 프로젝트부터 개인 서비스까지, React·TypeScript를 중심으로 프론트엔드·백엔드·인프라를 경험한 웹 개발자 정현승의 포트폴리오입니다.",
    images: [
      {
        url: absoluteUrl("/portfolio/og-portfolio.png"),
        width: 1200,
        height: 630,
        alt: "정현승 웹 개발자 포트폴리오 히어로 화면",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "정현승 | 웹 개발자 포트폴리오",
    description:
      "공공·지자체 SI 프로젝트부터 개인 서비스까지, React·TypeScript를 중심으로 프론트엔드·백엔드·인프라를 경험한 웹 개발자 정현승의 포트폴리오입니다.",
    images: [absoluteUrl("/portfolio/og-portfolio.png")],
  },
};

export default function PortfolioPage() {
  return (
    <div className={`cloud ${handFont.variable}`}>
      <CloudDriftLayer />
      {/* 아래 섹션 순서는 _data/pages.ts 의 portfolioPages 와 반드시 같아야 한다 */}
      <PortfolioDeck>
        <Hero />
        <AboutSection />
        <CareerSection />
        <SkillsSection />
        {/* <AiSection /> */}
        {projects.map((project, i) => (
          <ProjectPage
            key={project.slug}
            project={project}
            index={i}
            total={projects.length}
          />
        ))}
      </PortfolioDeck>
      <CloudMotion />
      <CloudCursorTrail />
    </div>
  );
}
