import { loadPortfolioFragment } from "../_lib/loadFragment";

const AI_SUBSECTIONS = ["ai-flow", "ai-record"];

/**
 * id="ai-work" — "ai"만 쓰면 window.ai(Chrome 내장 AI API)와 충돌해 하이드레이션이
 * 깨진다. HeaderNav.tsx의 PORTFOLIO_NAV와 반드시 같은 id를 써야 앵커 이동이 맞는다.
 */
export function AiSection() {
  return (
    <div className="ab-section" id="ai-work">
      <div className="ab-sechead">
        <h2>AI</h2>
        <span className="ab-sectag">AI</span>
      </div>
      {AI_SUBSECTIONS.map((name) => (
        <div key={name} dangerouslySetInnerHTML={{ __html: loadPortfolioFragment(name) }} />
      ))}
    </div>
  );
}
