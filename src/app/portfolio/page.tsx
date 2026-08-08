import { readFileSync } from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/site";

/**
 * 포트폴리오.
 *
 * 원본은 Blogger 페이지(/p/blog-page.html)로 발행하던 자체 완결형 HTML이다
 * (스타일 블록과 사진 base64 를 모두 안에 갖고 있다). 마크다운으로 옮기면
 * 레이아웃이 통째로 깨지므로 HTML 그대로 content/pages/portfolio.html 에 두고
 * 여기서 주입한다. 원본이 우리 저장소 파일이라 신뢰할 수 있는 입력이다.
 */
const html = readFileSync(
  path.join(process.cwd(), "content", "pages", "portfolio.html"),
  "utf8",
);

export const metadata: Metadata = {
  title: "포트폴리오",
  description: "요구사항 협의부터 개발·납품·운영까지 담당해온 경력 2년 개발자입니다.",
  alternates: { canonical: absoluteUrl("/portfolio/") },
};

export default function PortfolioPage() {
  return (
    <section className="relative border-t-[1.5px] border-line-soft bg-cream px-7 pt-14 pb-21">
      <div className="mx-auto max-w-[1120px]">
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </section>
  );
}
