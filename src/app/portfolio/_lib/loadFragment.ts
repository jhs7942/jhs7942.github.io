import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * content/pages/portfolio/*.html 조각을 읽어온다.
 *
 * 손으로 옮기면 깨지기 쉬운 SVG 다이어그램 · 표 기반 지표는 JSX로 재작성하지 않고
 * 신뢰할 수 있는 저장소 파일(HTML)로 남겨, 컴포넌트는 배치와 데이터 소스만 결정하게
 * 한다. 컴포넌트 쪽에서 dangerouslySetInnerHTML 로 그대로 삽입한다.
 */
export function loadPortfolioFragment(name: string): string {
  return readFileSync(path.join(process.cwd(), "content", "pages", "portfolio", `${name}.html`), "utf8");
}
