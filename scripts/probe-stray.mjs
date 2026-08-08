import { readFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
const dir = String.raw`C:\Users\사용자\Desktop\프로젝트\blog\published`;
for (const f of [
  "2026-04-04-supabase-vote-system-four-bugs.md",
  "2026-04-25-github-actions-cron-webhook-basics.md",
  "2026-04-20-ai-quiz-data-layer-static-json-supabase-fail-silent.md",
]) {
  const { content } = matter(readFileSync(join(dir, f), "utf8"));
  console.log("=".repeat(72));
  console.log(f);
  console.log("=".repeat(72));
  console.log(content.slice(0, 700));
  console.log();
}
