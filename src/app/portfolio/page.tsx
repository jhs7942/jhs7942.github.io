import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/site";
import "./portfolio.css";
import { Hero } from "./_components/Hero";
import { AboutSection } from "./_components/AboutSection";
import { ProjectsSection } from "./_components/ProjectsSection";
import { AiSection } from "./_components/AiSection";
import { SkillsSection } from "./_components/SkillsSection";
import { CareerSection } from "./_components/CareerSection";

/**
 * 포트폴리오.
 *
 * 예전엔 Blogger 페이지 전체(스타일 블록 + 사진 base64 포함)를 통째로
 * content/pages/portfolio.html 에 두고 dangerouslySetInnerHTML 로 주입했다.
 * 이제는 섹션별 컴포넌트(_components)가 배치를 결정하고, 손으로 옮기면 깨지기
 * 쉬운 덩어리(SVG 다이어그램·표 기반 지표)만 content/pages/portfolio/*.html
 * 조각으로 남아 있다 — _lib/loadFragment.ts 주석 참고.
 */
export const metadata: Metadata = {
  title: "포트폴리오",
  description: "요구사항 협의부터 개발·납품·운영까지 담당해온 경력 2년 개발자입니다.",
  alternates: { canonical: absoluteUrl("/portfolio/") },
};

export default function PortfolioPage() {
  return (
    <section className="relative border-t-[1.5px] border-line-soft bg-cream px-7 pt-14 pb-21">
      <div className="mx-auto max-w-[1120px]">
        <div className="ab">
          <Hero />
          <AboutSection />
          <ProjectsSection />
          <AiSection />
          <SkillsSection />
          <CareerSection />
        </div>
      </div>
    </section>
  );
}
