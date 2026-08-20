import type { Metadata } from "next";
import { absoluteUrl, SITE } from "@/lib/site";
import "./portfolio/portfolio.css";
import { projects } from "./portfolio/_data/projects";
import { CloudCursorTrail } from "./portfolio/_components/CloudCursorTrail";
import { CloudDriftLayer } from "./portfolio/_components/CloudDriftLayer";
import { PortfolioDeck } from "./portfolio/_components/PortfolioDeck";
import { Hero } from "./portfolio/_components/Hero";
import { AboutSection } from "./portfolio/_components/AboutSection";
import { CareerSection, EducationSection } from "./portfolio/_components/CareerSection";
import { SkillsSection } from "./portfolio/_components/SkillsSection";
import { ProjectPage } from "./portfolio/_components/ProjectPage";
import { handFont } from "./portfolio/_lib/fonts";

export const metadata: Metadata = {
  title: { absolute: "정현승 | 웹 개발자 포트폴리오" },
  description:
    "공공·지자체 SI 프로젝트부터 개인 서비스까지, React·TypeScript를 중심으로 프론트엔드·백엔드·인프라를 경험한 웹 개발자 정현승의 포트폴리오입니다.",
  keywords: ["정현승", "웹 개발자", "프론트엔드 개발자", "React", "TypeScript", "SI", "포트폴리오"],
  alternates: { canonical: absoluteUrl("/") },
  openGraph: {
    type: "website",
    locale: SITE.locale,
    url: absoluteUrl("/"),
    siteName: SITE.title,
    title: "정현승 | 웹 개발자 포트폴리오",
    description:
      "공공·지자체 SI 프로젝트부터 개인 서비스까지, React·TypeScript를 중심으로 프론트엔드·백엔드·인프라를 경험한 웹 개발자 정현승의 포트폴리오입니다.",
    images: [{ url: absoluteUrl("/portfolio/og-portfolio.png"), width: 1200, height: 630, alt: "정현승 웹 개발자 포트폴리오 히어로 화면" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "정현승 | 웹 개발자 포트폴리오",
    description:
      "공공·지자체 SI 프로젝트부터 개인 서비스까지, React·TypeScript를 중심으로 프론트엔드·백엔드·인프라를 경험한 웹 개발자 정현승의 포트폴리오입니다.",
    images: ["/portfolio/og-portfolio.png"],
  },
};

export default function Home() {
  return (
    <div className={`cloud ${handFont.variable}`}>
      <CloudDriftLayer />
      <PortfolioDeck>
        <Hero />
        <AboutSection />
        <CareerSection />
        <EducationSection />
        <SkillsSection />
        {projects.map((project) => (
          <ProjectPage key={project.slug} project={project} />
        ))}
      </PortfolioDeck>
      <CloudCursorTrail />
    </div>
  );
}
