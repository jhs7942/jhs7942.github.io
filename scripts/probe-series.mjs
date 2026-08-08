import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
const dir = String.raw`C:\Users\사용자\Desktop\프로젝트\blog\published`;
const files = readdirSync(dir).filter(f => f.endsWith(".md") && !f.startsWith("_"));

console.log("=== 시리즈 표기 (n/m) 보유 19편 ===");
const rows = [];
for (const f of files) {
  const { data } = matter(readFileSync(join(dir, f), "utf8"));
  const s = String(data.title ?? "").match(/\((\d+)\s*\/\s*(\d+)\)/);
  if (!s) continue;
  rows.push({ slug: f.replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/\.md$/, ""), part: +s[1], total: +s[2] });
}
rows.sort((a,b) => a.slug.localeCompare(b.slug));
for (const r of rows) console.log(`  ${String(r.part)}/${r.total}  ${r.slug}`);

console.log("\n=== 스테퍼 HTML은 있는데 (n/m) 표기 없는 글 ===");
for (const f of files) {
  const raw = readFileSync(join(dir, f), "utf8");
  const { data } = matter(raw);
  const hasStepper = /border-radius:999px|display:flex;align-items:center;gap:8px/.test(raw);
  const hasMark = /\(\d+\s*\/\s*\d+\)/.test(String(data.title ?? ""));
  if (hasStepper && !hasMark) console.log(`  ${f}\n      "${data.title}"`);
}

console.log("\n=== SUMMARY 추출 실패 2편의 본문 앞부분 ===");
for (const f of ["2026-04-20-ai-quiz-data-layer-static-json-supabase-fail-silent.md", "2026-07-20-telepathy-perf-2-render-load.md"]) {
  const { content } = matter(readFileSync(join(dir, f), "utf8"));
  console.log(`\n--- ${f}`);
  console.log(content.slice(0, 260).split("\n").map(l => "   " + l).join("\n"));
}
