/**
 * (n/m) 표기를 쓰지 않던 학습 시리즈의 소속을 frontmatter로 옮긴다.
 *
 *   npx tsx scripts/assign-series.mjs           # 드라이런
 *   npx tsx scripts/assign-series.mjs --write
 *
 * 소속 근거는 본문 상단 배너(<p style="margin:24px 0 2px …>🧩 <b>{시리즈명}</b>)와
 * 산문 속 이전/다음 링크였다. 배너는 곧 지울 것이므로 그 전에 옮겨야 한다.
 * part는 published_at 오름차순으로 매긴다 — 원본에 명시적 번호가 없다.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { SERIES } from "../src/lib/content/series.ts";

const DIR = join(import.meta.dirname, "..", "content", "posts");
const WRITE = process.argv.includes("--write");

/** 슬러그 패턴 → 시리즈 키. 이미 series가 있는 글은 건드리지 않는다. */
const RULES = [
  { key: "react-ts", test: (s) => /^react-ts-/.test(s) || s === "typescript-interface-import-type-react-props" },
  { key: "react-query", test: (s) => /^react-query-/.test(s) || s === "react-tanstack-query-server-state-sync" },
  { key: "react-hook-form", test: (s) => /^react-hook-form-/.test(s) || /^rhf-/.test(s) },
  { key: "zustand", test: (s) => /^react-zustand-/.test(s) || s === "react-usereducer-vs-zustand" },
  { key: "react-compiler", test: (s) => /^react-compiler-/.test(s) },
];

const files = readdirSync(DIR).filter((f) => f.endsWith(".md"));
const docs = files.map((file) => {
  const { data, content } = matter(readFileSync(join(DIR, file), "utf8"));
  return { file, data, content };
});

const groups = new Map();
for (const doc of docs) {
  if (doc.data.series) continue; // (n/m) 시리즈는 이미 배정됨
  const rule = RULES.find((r) => r.test(doc.data.slug));
  if (!rule) continue;
  if (!groups.has(rule.key)) groups.set(rule.key, []);
  groups.get(rule.key).push(doc);
}

let assigned = 0;
const problems = [];

for (const [key, members] of groups) {
  // 발행 순서가 읽는 순서와 항상 같지는 않다. 같은 날 몰아서 발행한 시리즈에서는
  // 마무리(recap) 글이 중간에 끼는데, 되짚기 글은 언제나 마지막이어야 한다.
  const isRecap = (d) => /-recap$/.test(d.data.slug);
  members.sort((a, b) => {
    if (isRecap(a) !== isRecap(b)) return isRecap(a) ? 1 : -1;
    return new Date(a.data.published_at) - new Date(b.data.published_at);
  });
  const declared = SERIES[key].total;
  if (members.length !== declared) {
    problems.push(`${key}: series.ts는 total ${declared}인데 실제 ${members.length}편`);
  }
  console.log(`\n■ ${SERIES[key].title}  (${key})  — ${members.length}편`);
  members.forEach((doc, i) => {
    doc.data.series = key;
    doc.data.part = i + 1;
    assigned++;
    console.log(`   ${String(i + 1).padStart(2)}. ${doc.data.published_at.slice(0, 10)}  ${doc.data.slug}`);
  });
}

console.log(`\n배정 ${assigned}편`);
if (problems.length) {
  console.log("\n[불일치]");
  problems.forEach((p) => console.log("  " + p));
}

if (!WRITE) {
  console.log("\n드라이런 — 파일을 쓰지 않았습니다. 실제 반영은 --write");
  process.exit(0);
}

for (const members of groups.values()) {
  for (const doc of members) {
    writeFileSync(join(DIR, doc.file), matter.stringify(doc.content, doc.data), "utf8");
  }
}
console.log("\n반영했습니다.");
