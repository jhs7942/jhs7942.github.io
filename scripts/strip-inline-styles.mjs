/**
 * 본문에 남은 인라인 style 속성을 제거한다.
 *
 *   npx tsx scripts/strip-inline-styles.mjs           # 드라이런
 *   npx tsx scripts/strip-inline-styles.mjs --write
 *
 * 대상은 접이식 실행 결과 블록의 <details>/<summary> 뿐이다(각 68개, 고유 값 2종).
 * 마크업 자체는 표준 HTML이라 그대로 두고 모양만 CSS로 옮긴다 —— 태그를 남겨두면
 * 나중에 다른 정적 사이트 생성기로 옮겨도 그대로 동작한다.
 *
 * Blogger가 인라인 스타일을 강요한 이유는 외부 CSS 제어가 불안정해서였다
 * (blogger_client.py 의 _inject_inline_styles 주석). 그 전제가 사라졌다.
 *
 * 코드 펜스 안은 건드리지 않는다. 예제로 적힌 <details style="…"> 이 있을 수 있다.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";

const DIR = join(import.meta.dirname, "..", "content", "posts");
const WRITE = process.argv.includes("--write");

/** 이 태그들에서만 style 속성을 떼어낸다. 예상 밖 태그는 보고하고 남긴다. */
const TARGETS = new Set(["details", "summary"]);

const files = readdirSync(DIR).filter((f) => f.endsWith(".md"));
let removed = 0;
let changedFiles = 0;
const skipped = new Map();

for (const file of files) {
  const raw = readFileSync(join(DIR, file), "utf8");
  const { data, content } = matter(raw);
  let inFence = false;
  let touched = false;

  const next = content
    .split("\n")
    .map((line) => {
      const t = line.trim();
      if (/^(```|~~~)/.test(t)) {
        inFence = !inFence;
        return line;
      }
      if (inFence) return line;

      return line.replace(/<([a-z]+)([^>]*?)\s+style="([^"]*)"/g, (whole, tag, before, value) => {
        if (!TARGETS.has(tag)) {
          skipped.set(`<${tag}> ${value}`, (skipped.get(`<${tag}> ${value}`) ?? 0) + 1);
          return whole;
        }
        removed++;
        touched = true;
        return `<${tag}${before}`;
      });
    })
    .join("\n");

  if (!touched) continue;
  changedFiles++;
  if (WRITE) writeFileSync(join(DIR, file), matter.stringify("\n" + next.trim() + "\n", data), "utf8");
}

console.log(`style 속성 제거 ${removed}개 / ${changedFiles}편`);
if (skipped.size) {
  console.log("\n[대상 외 태그 — 남겨둠]");
  [...skipped].sort((a, b) => b[1] - a[1]).forEach(([k, n]) => console.log(`  x${n}  ${k}`));
}
console.log(WRITE ? "\n반영했습니다." : "\n드라이런 — 파일을 쓰지 않았습니다. 실제 반영은 --write");
