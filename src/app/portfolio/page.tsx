import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/site";
import "./portfolio.css";
import { profile } from "./_data/profile";
import { CloudDriftLayer } from "./_components/CloudDriftLayer";
import { CloudMotion } from "./_components/CloudMotion";
import { Nav } from "./_components/Nav";
import { Hero } from "./_components/Hero";
import { AboutSection } from "./_components/AboutSection";
import { CareerSection } from "./_components/CareerSection";
import { SkillsSection } from "./_components/SkillsSection";
import { AiSection } from "./_components/AiSection";
import { ProjectsSection } from "./_components/ProjectsSection";

/**
 * 포트폴리오 — "구름" 테마.
 *
 * Claude Design(claude.ai/design)에서 만든 handoff 목업(Portfolio.dc.html)을
 * 이식했다. 배경 그라디언트 위에 구름 모양 베일이 스크롤에 맞춰 갈라지며
 * 섹션을 드러내는 게 이 테마의 핵심이다(CloudMotion.tsx). 사이트 공용
 * 헤더 · 푸터는 이 라우트에서 쓰지 않는다 — 전면 히어로 위에 뜨는 Nav가
 * 헤더 역할을 대신하고, 이 페이지 전용 Footer가 맨 아래에 있다
 * (RouteChrome.tsx 참고).
 *
 * 대부분의 섹션은 장식이 전부 CSS 도형이라 데이터 + JSX로 옮겼다(_data/*.ts
 * 참고). 예외는 AI 섹션 — 손그림 SVG 파이프라인 다이어그램이 많아 이전처럼
 * content/pages/portfolio/*.html 조각으로 남겨 뒀다(_lib/loadFragment.ts 참고).
 */
export const metadata: Metadata = {
  title: "포트폴리오",
  description: "요구사항 협의부터 개발·납품·운영까지 담당해온 경력 2년 개발자입니다.",
  alternates: { canonical: absoluteUrl("/portfolio/") },
};

export default function PortfolioPage() {
  return (
    <div className="cloud">
      <CloudDriftLayer />
      <Nav githubUrl={profile.githubUrl} />
      <Hero />
      <AboutSection />
      <CareerSection />
      <SkillsSection />
      <AiSection />
      <ProjectsSection />
      <CloudMotion />
    </div>
  );
}
