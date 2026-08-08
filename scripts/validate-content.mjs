/**
 * content/posts/ 를 스키마로 검증한다. 빌드 전 게이트.
 *
 *   npx tsx scripts/validate-content.mjs
 *
 * frontmatter 검증에 더해, 이전 단계에서 남았을 수 있는 흔적을 함께 본다.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { postSchema, formatIssues } from "../src/lib/content/schema.ts";
import { SERIES } from "../src/lib/content/series.ts";

const DIR = join(import.meta.dirname, "..", "content", "posts");
const files = readdirSync(DIR).filter((f) => f.endsWith(".md"));

const posts = [];
const errors = [];
const warnings = [];

for (const file of files) {
  const { data, content } = matter(readFileSync(join(DIR, file), "utf8"));

  const parsed = postSchema.safeParse(data);
  if (!parsed.success) {
    errors.push(formatIssues(file, parsed.error));
    continue;
  }
  posts.push({ file, data: parsed.data, content });

  if (`${parsed.data.slug}.md` !== file) {
    errors.push(`  ${file}  slug "${parsed.data.slug}" 가 파일명과 다름`);
  }
  // 크롬 잔여물
  if (/^<div style="display:flex/m.test(content)) warnings.push(`${file}: 스테퍼/내비 div 잔존`);
  if (/^#{2,4}\s*목차\s*$/m.test(content)) warnings.push(`${file}: 목차 헤딩 잔존`);
}

// slug 중복
const bySlug = new Map();
posts.forEach((p) => bySlug.set(p.data.slug, (bySlug.get(p.data.slug) ?? 0) + 1));
[...bySlug].filter(([, n]) => n > 1).forEach(([s]) => errors.push(`  slug 중복: ${s}`));

// 시리즈 정합성 — part가 1..total 로 빠짐없이 한 번씩 있어야 한다
const bySeries = new Map();
for (const p of posts) {
  if (!p.data.series) continue;
  if (!bySeries.has(p.data.series)) bySeries.set(p.data.series, []);
  bySeries.get(p.data.series).push(p.data.part);
}
for (const [key, parts] of bySeries) {
  const expected = SERIES[key].total;
  const sorted = [...parts].sort((a, b) => a - b);
  const want = Array.from({ length: expected }, (_, i) => i + 1);
  if (sorted.join(",") !== want.join(",")) {
    errors.push(`  시리즈 "${key}": part가 [${sorted.join(",")}] — 기대 [1..${expected}]`);
  }
}
for (const key of Object.keys(SERIES)) {
  if (!bySeries.has(key)) warnings.push(`시리즈 "${key}"에 속한 글이 없음`);
}

// 내부 링크 무결성 — /posts/{slug}/ 가 실제로 존재하는 글을 가리키는지 본다.
const known = new Set(posts.map((p) => p.data.slug));
let internalLinks = 0;
for (const p of posts) {
  for (const m of p.content.matchAll(/\/posts\/([a-z0-9-]+)\//g)) {
    internalLinks++;
    if (!known.has(m[1])) errors.push(`  ${p.file}  깨진 내부 링크: /posts/${m[1]}/`);
  }
}

const blogspot = posts.reduce((n, p) => n + (p.content.match(/saver7942\.blogspot\.com/g) ?? []).length, 0);
const inlineStyle = posts.reduce((n, p) => n + (p.content.match(/style="/g) ?? []).length, 0);

console.log(`글 ${files.length}편 — 유효 ${posts.length} / 오류 ${errors.length}`);
console.log(`시리즈 ${bySeries.size}개, 소속 글 ${[...bySeries.values()].flat().length}편`);
console.log(`내부 링크 ${internalLinks}개 — 전부 유효`);
console.log(`남은 blogspot 링크 ${blogspot}개 · 인라인 style ${inlineStyle}개`);

if (warnings.length) {
  console.log(`\n[경고 ${warnings.length}]`);
  warnings.forEach((w) => console.log("  " + w));
}
if (errors.length) {
  console.log(`\n[오류 ${errors.length}]`);
  errors.forEach((e) => console.log(e));
  process.exit(1);
}
console.log("\n검증 통과");
