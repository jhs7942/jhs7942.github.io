/**
 * mdast / hast 트리를 눈으로 확인하는 학습·디버깅용 스크립트.
 *
 * 사용: node scripts/dump-tree.mjs <마크다운 경로>
 */
import { readFileSync } from "node:fs";
import matter from "gray-matter";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import { rehypeEmojiSafeSlug } from "../src/lib/markdown/emoji-safe-slug.ts";
import { visit } from "unist-util-visit";
import { toString } from "hast-util-to-string";

const file = process.argv[2];
if (!file) {
  console.error("사용: node scripts/dump-tree.mjs <마크다운 경로>");
  process.exit(1);
}

const raw = readFileSync(file, "utf8");
const { data, content } = matter(raw);

// ── ① frontmatter는 파이프라인 밖에서 분리된다 ──────────────────
console.log("=".repeat(70));
console.log("① gray-matter — frontmatter 분리");
console.log("=".repeat(70));
console.log("data:", JSON.stringify(data, null, 2).slice(0, 300));
console.log(`content: ${content.length.toLocaleString()}자\n`);

// ── ② mdast ────────────────────────────────────────────────────
const mdastProcessor = unified().use(remarkParse).use(remarkGfm);
const mdast = mdastProcessor.parse(content);
mdastProcessor.runSync(mdast);

const mdastTypes = new Map();
visit(mdast, (node) => {
  mdastTypes.set(node.type, (mdastTypes.get(node.type) ?? 0) + 1);
});

console.log("=".repeat(70));
console.log("② mdast — 마크다운 구문 트리");
console.log("=".repeat(70));
console.log("노드 종류별 개수:");
for (const [type, n] of [...mdastTypes].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(4)}  ${type}`);
}

// raw HTML이 어떻게 들어갔는지 — 파싱되지 않고 문자열로 남는다
const htmlNodes = [];
// 주의: 화살표 함수를 중괄호 없이 쓰면 push()의 반환값(배열 길이)이
// visit의 "다음 방문 인덱스"로 해석돼 같은 노드를 반복 방문한다.
visit(mdast, "html", (node) => {
  htmlNodes.push(node.value);
});
console.log(`\nhtml 노드(파싱 안 된 raw HTML 덩어리): ${htmlNodes.length}개`);
console.log("첫 3개:");
htmlNodes.slice(0, 3).forEach((v) => {
  console.log(`  ${JSON.stringify(v.slice(0, 90))}${v.length > 90 ? "…" : ""}`);
});

// heading 하나를 통째로 떠서 구조를 본다
const firstHeading = mdast.children.find(
  (n) => n.type === "heading" && n.depth === 2,
);
console.log("\n첫 ## heading 노드 원형:");
console.log(JSON.stringify(firstHeading, null, 2));

// ── ③ hast ─────────────────────────────────────────────────────
const hastProcessor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeRaw)
  .use(rehypeSlug)
  .use(rehypeStringify, { allowDangerousHtml: true });

const hast = hastProcessor.runSync(hastProcessor.parse(content));

const tagCounts = new Map();
visit(hast, "element", (node) => {
  tagCounts.set(node.tagName, (tagCounts.get(node.tagName) ?? 0) + 1);
});

console.log("\n" + "=".repeat(70));
console.log("③ hast — HTML 구문 트리 (rehype-raw + rehype-slug 통과 후)");
console.log("=".repeat(70));
console.log("태그별 개수:");
for (const [tag, n] of [...tagCounts].sort((a, b) => b[1] - a[1]).slice(0, 18)) {
  console.log(`  ${String(n).padStart(4)}  <${tag}>`);
}

let rawLeft = 0;
visit(hast, "raw", () => rawLeft++);
console.log(`\n남아 있는 raw 노드: ${rawLeft}개  (0이면 rehype-raw가 전부 트리로 편입시킨 것)`);

const sameHeading = hast.children.find(
  (n) => n.type === "element" && n.tagName === "h2",
);
console.log("\n같은 heading의 hast 노드 (children 생략):");
console.log(
  JSON.stringify(
    { ...sameHeading, children: `[${sameHeading.children.length} nodes]` },
    null,
    2,
  ),
);

// ── ④ 앵커 비교 ────────────────────────────────────────────────
console.log("\n" + "=".repeat(70));
console.log("④ heading id — rehype-slug(GitHub 방식) 결과");
console.log("=".repeat(70));
visit(hast, "element", (node) => {
  if (/^h2$/.test(node.tagName)) {
    console.log(`  "${toString(node)}"`);
    console.log(`      → id="${node.properties.id}"`);
  }
});

// 현재 글이 가리키는 앵커 — 목차는 raw HTML(<a href="#...">)로 들어 있어서
// 마크다운 링크 문법만 찾으면 하나도 안 잡힌다. 둘 다 훑는다.
const tocAnchors = [
  ...[...content.matchAll(/\]\(#([^)]+)\)/g)].map((m) => m[1]),
  ...[...content.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]),
];
console.log("\n현재 본문이 가리키는 앵커 (Python-Markdown toc가 만든 것):");
console.log(tocAnchors.length ? `  ${tocAnchors.map((a) => `#${a}`).join("  ")}` : "  (없음)");

// ── ⑤ 이모지 섹션 마커 vs github-slugger ────────────────────────
console.log("\n" + "=".repeat(70));
console.log("⑤ 생성된 id의 선두 문자 점검");
console.log("=".repeat(70));
const report = (tree, label) => {
  console.log(`\n[${label}]`);
  visit(tree, "element", (node) => {
    if (node.tagName !== "h2") return;
    const id = String(node.properties.id ?? "");
    const clean = /^[a-z0-9가-힣]/.test(id);
    console.log(`  ${clean ? "OK " : "BAD"}  id="${id}"`);
  });
};

report(hast, "rehype-slug (기본)");

// 커스텀 슬러그로 다시 렌더해 비교한다
const fixed = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeRaw)
  .use(rehypeEmojiSafeSlug)
  .use(rehypeStringify, { allowDangerousHtml: true });

report(fixed.runSync(fixed.parse(content)), "rehypeEmojiSafeSlug (커스텀)");
