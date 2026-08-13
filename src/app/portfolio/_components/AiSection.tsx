import { loadPortfolioFragment } from "../_lib/loadFragment";
import { CloudVeils } from "./CloudVeils";

const AI_SUBSECTIONS = ["ai-flow", "ai-record"];

/**
 * id="ai-work" — "ai"만 쓰면 window.ai(Chrome 내장 AI API)와 충돌해 하이드레이션이
 * 깨진다. Nav.tsx의 NAV_ITEMS와 반드시 같은 id를 써야 앵커 이동이 맞는다.
 */
export function AiSection() {
  return (
    <section id="ai-work" data-cloud-section className="cloud-section">
      <div className="cloud-veilwrap">
        <div data-content className="cloud-content">
          <div className="cloud-sechead">
            <h2>AI</h2>
            <span className="cloud-sectag">AI</span>
          </div>
          {AI_SUBSECTIONS.map((name) => (
            <div key={name} dangerouslySetInnerHTML={{ __html: loadPortfolioFragment(name) }} />
          ))}
        </div>
        <CloudVeils
          left={[
            { right: 6, top: 8, width: 42 },
            { right: 15, top: 40, width: 50 },
            { right: 2, bottom: 2, width: 36 },
          ]}
          right={[
            { left: 5, top: 16, width: 45 },
            { left: 17, top: 48, width: 48 },
            { left: 3, bottom: 0, width: 34 },
          ]}
        />
      </div>
    </section>
  );
}
