import type { Metadata } from "next";
import { absoluteUrl, SITE } from "@/lib/site";
import "./portfolio/portfolio.css";
import { projects } from "./portfolio/_data/projects";
import { CloudCursorTrail } from "./portfolio/_components/CloudCursorTrail";
import { CloudDriftLayer } from "./portfolio/_components/CloudDriftLayer";
import { PortfolioDeck } from "./portfolio/_components/PortfolioDeck";
import { Hero } from "./portfolio/_components/Hero";
import { AboutSection } from "./portfolio/_components/AboutSection";
import { CareerSection } from "./portfolio/_components/CareerSection";
import { SkillsSection } from "./portfolio/_components/SkillsSection";
import { ProjectPage } from "./portfolio/_components/ProjectPage";
import {
  TeamEvidenceSection,
  TeamRecruitmentIntro,
} from "./portfolio/_components/TeamRecruitmentSection";
import { handFont, noteFont } from "./portfolio/_lib/fonts";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: { absolute: "정현승 | 싸피 프로젝트 프론트엔드 팀원" },
  description:
    "SSAFY 프로젝트에서 프론트엔드를 맡아 아이디어를 서비스로 완성할 팀을 찾습니다. React·TypeScript 실무 경험과 추진력, 협업 자동화 역량을 소개합니다.",
  keywords: ["정현승", "SSAFY", "싸피", "프로젝트 팀원", "프론트엔드 개발자", "React", "TypeScript"],
  alternates: { canonical: absoluteUrl("/") },
  openGraph: {
    type: "website",
    locale: SITE.locale,
    url: absoluteUrl("/"),
    siteName: SITE.title,
    title: "정현승 | 싸피 프로젝트 프론트엔드 팀원",
    description:
      "SSAFY 프로젝트에서 프론트엔드를 맡아 아이디어를 서비스로 완성할 팀을 찾습니다.",
    images: [{ url: absoluteUrl("/portfolio/og-portfolio.png"), width: 1200, height: 630, alt: "정현승 웹 개발자 포트폴리오 히어로 화면" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "정현승 | 싸피 프로젝트 프론트엔드 팀원",
    description:
      "SSAFY 프로젝트에서 프론트엔드를 맡아 아이디어를 서비스로 완성할 팀을 찾습니다.",
    images: ["/portfolio/og-portfolio.png"],
  },
};

export default function Home() {
  return (
    <div className={cn("cloud", handFont.variable, noteFont.variable)}>
      <CloudDriftLayer />
      <PortfolioDeck>
        <Hero />
        <AboutSection />
        <TeamRecruitmentIntro />
        <TeamEvidenceSection />
        <CareerSection />
        <SkillsSection />
        {projects.map((project) => (
          <ProjectPage key={project.slug} project={project} />
        ))}
      </PortfolioDeck>
      <CloudCursorTrail />
    </div>
  );
}
