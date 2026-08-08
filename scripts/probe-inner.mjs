import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import yaml from "js-yaml";
const dir = String.raw`C:\Users\사용자\Desktop\프로젝트\blog\published`;
const files = readdirSync(dir).filter(f => f.endsWith(".md") && !f.startsWith("_"));

let inner = 0, innerDesc = 0, slugMismatch = [], noInner = [];
const summaryForms = { heading: 0, comment: 0, blockquote: 0, none: [] };

for (const f of files) {
  const { content } = matter(readFileSync(join(dir, f), "utf8"));
  const fileSlug = f.replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/\.md$/, "");
  const m = content.match(/^\s*---\s*\n([\s\S]*?)\n---\s*\n/);
  if (m) {
    inner++;
    let d = {};
    try { d = yaml.load(m[1]) ?? {}; } catch { d = {}; }
    if (d.description) innerDesc++;
    if (d.slug && d.slug !== fileSlug) slugMismatch.push(`${f}\n       inner="${d.slug}"  file="${fileSlug}"`);
  } else noInner.push(f);

  const body = m ? content.slice(m[0].length) : content;
  if (/\n?##\s*SUMMARY\s*\n/.test(body)) summaryForms.heading++;
  else if (/<!--\s*SUMMARY/.test(body)) summaryForms.comment++;
  else if (/>\s*\*\*SUMMARY\*\*/.test(body)) summaryForms.blockquote++;
  else summaryForms.none.push(f);
}
console.log(`총 ${files.length}편`);
console.log(`내부 frontmatter 보유: ${inner}편  (그중 description 보유 ${innerDesc}편)`);
console.log(`내부 frontmatter 없음: ${noInner.length}편`);
console.log(`\nslug 불일치: ${slugMismatch.length}건`);
slugMismatch.forEach(s => console.log("   " + s));
console.log(`\nSUMMARY 형식 분포:`);
console.log(`   ## SUMMARY        ${summaryForms.heading}편`);
console.log(`   <!--SUMMARY-->    ${summaryForms.comment}편`);
console.log(`   > **SUMMARY**:    ${summaryForms.blockquote}편`);
console.log(`   없음              ${summaryForms.none.length}편`);
summaryForms.none.forEach(f => console.log("      " + f));
