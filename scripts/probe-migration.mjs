import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
const dir = String.raw`C:\Users\사용자\Desktop\프로젝트\blog\published`;
const files = readdirSync(dir).filter(f => f.endsWith(".md") && !f.startsWith("_"));

let hasSummary = 0, noSummary = [], seriesTitles = [], badName = [];
for (const f of files) {
  const { data, content } = matter(readFileSync(join(dir, f), "utf8"));
  // SUMMARY 추출 가능한가
  const m = content.match(/##\s*SUMMARY\s*\n([\s\S]*?)(?=\n---|\n## |$)/);
  if (m && m[1].trim()) hasSummary++; else noSummary.push(f);
  // 제목의 (n/m) 시리즈 표기
  const s = String(data.title ?? "").match(/\((\d+)\s*\/\s*(\d+)\)/);
  if (s) seriesTitles.push({ f, title: data.title, part: +s[1], total: +s[2] });
  // 파일명에서 slug 뽑기
  if (!/^\d{4}-\d{2}-\d{2}-[a-z0-9-]+\.md$/.test(f)) badName.push(f);
}
console.log(`총 ${files.length}편`);
console.log(`\n## SUMMARY 추출 가능: ${hasSummary}편 / 실패: ${noSummary.length}편`);
noSummary.slice(0, 10).forEach(f => console.log("   " + f));
console.log(`\n제목에 (n/m) 시리즈 표기: ${seriesTitles.length}편`);
const byTotal = {};
for (const s of seriesTitles) (byTotal[s.total] ??= []).push(s);
for (const [total, arr] of Object.entries(byTotal)) {
  console.log(`  ${total}부작: ${arr.length}편  ->  ${arr.map(a => a.part).sort((x,y)=>x-y).join(",")}`);
  console.log(`     예: ${arr[0].f}`);
}
console.log(`\n파일명 규칙 위반: ${badName.length}편`);
badName.forEach(f => console.log("   " + f));
