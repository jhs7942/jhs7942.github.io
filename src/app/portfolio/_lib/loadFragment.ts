import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * content/pages/portfolio/*.html 조각을 읽어온다.
 *
 * AI 섹션은 손그림 SVG 파이프라인 다이어그램이 많아 JSX로 옮기면 깨지기
 * 쉽다 — 신뢰할 수 있는 저장소 파일(HTML)로 남겨, 컴포넌트는 배치만 결정하게
 * 한다. 컴포넌트 쪽에서 dangerouslySetInnerHTML 로 그대로 삽입한다.
 */
export function loadPortfolioFragment(name: string): string {
  return readFileSync(path.join(process.cwd(), "content", "pages", "portfolio", `${name}.html`), "utf8");
}
