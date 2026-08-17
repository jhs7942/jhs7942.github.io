import { projects } from "./projects";

/**
 * 포트폴리오 페이지 덱의 순서 · 라벨.
 *
 * 이 배열의 순서가 곧 좌우 이동 순서이고, page.tsx 가 PortfolioDeck 에 넘기는
 * 섹션 children 의 순서와 반드시 1:1로 맞아야 한다(인덱스로 짝지어진다).
 * 첫 항목(top)은 브랜드 로고가 홈 역할을 하므로 내비게이션 목록에는 나오지
 * 않는다 — Nav.tsx 참고.
 *
 * 프로젝트는 하나가 페이지 하나를 차지한다 — projects 배열 길이만큼 장이
 * 자동으로 늘어난다(project.ts에 프로젝트를 추가·삭제하면 여기도 같이
 * 바뀐다). page.tsx의 projects.map(...)도 반드시 같은 순서로 맞춰야 한다.
 */

export type PortfolioPageMeta = {
  id: string;
  label: string;
};

export const portfolioPages: PortfolioPageMeta[] = [
  { id: "top", label: "홈" },
  { id: "about", label: "소개" },
  { id: "career", label: "경험" },
  { id: "skills", label: "스킬" },
  // { id: "ai-work", label: "AI" },
  ...projects.map((p) => ({ id: `project-${p.slug}`, label: p.title })),
];
