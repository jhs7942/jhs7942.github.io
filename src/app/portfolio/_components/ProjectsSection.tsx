import { loadPortfolioFragment } from "../_lib/loadFragment";

/**
 * 프로젝트 카드 3개(AI Quiz · 텔레파시 · ssadan).
 *
 * 각 카드는 손그림 표·before/after 표·인라인 SVG 다이어그램을 품고 있어 JSX로
 * 쪼개기보다 content/pages/portfolio/*.html 조각을 그대로 삽입하는 쪽을 택했다
 * (loadFragment.ts 주석 참고). 이 섹션은 카드를 어떤 순서로, 어떤 간격으로
 * 배치할지만 결정한다.
 */
const PROJECT_FRAGMENTS = ["aiquiz", "telepathy", "ssadan"];

export function ProjectsSection() {
  return (
    <div className="ab-section" id="projects">
      <div className="ab-sechead">
        <h2>메인 프로젝트</h2>
        <span className="ab-sectag">MAIN PROJECTS</span>
      </div>

      {/* 카드 간 간격은 각 조각의 루트 엘리먼트가 스스로 갖고 있다(telepathy는
          margin-top:22px 인라인 스타일 포함) — 여기서 추가로 감싸지 않는다. */}
      {PROJECT_FRAGMENTS.map((name) => (
        <div key={name} dangerouslySetInnerHTML={{ __html: loadPortfolioFragment(name) }} />
      ))}
    </div>
  );
}
