/**
 * published/*.md 의 Blogger 시절 frontmatter를 새 스키마로 변환한다.
 *
 *   npx tsx scripts/migrate-frontmatter.mjs            # 드라이런 — 검증만, 파일 안 씀
 *   npx tsx scripts/migrate-frontmatter.mjs --write    # content/posts/ 에 실제로 쓴다
 *
 * 원본 파일은 읽기만 한다. 산출물은 이 리포의 content/posts/ 에만 쓴다.
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { load as parseYaml } from "js-yaml";
import { postSchema, formatIssues } from "../src/lib/content/schema.ts";

const SRC = String.raw`C:\Users\사용자\Desktop\프로젝트\blog\published`;
const OUT = join(import.meta.dirname, "..", "content", "posts");
const WRITE = process.argv.includes("--write");

/** 슬러그 → 시리즈 키. 접두사로 추론하면 틀린다(아래 두 줄이 반례). */
const SERIES_OF = {
  "nodejs-http-module-server-basics": "express", // 이름은 nodejs지만 Express 6부작 1편
  "express-routing-middleware-basics": "express",
  "express-request-data-params-query-static": "express",
  "express-ejs-ssr-csr": "express",
  "express-response-methods": "express",
  "express-router-split": "express",
  "express-cookie-session": "express-auth", // 이름은 express지만 인증 3부작 1편
  "express-session-login-bcrypt": "express-auth",
  "express-jwt-auth": "express-auth",
  "myexpress-1-http-server-manual-routing": "myexpress",
  "myexpress-2-route-table-handler-map": "myexpress",
  "myexpress-3-middleware-chain-next": "myexpress",
  "myexpress-4-error-middleware-static-files": "myexpress",
  "myexpress-5-dynamic-params-json-parser": "myexpress",
  "myexpress-6-form-parser-router-module": "myexpress",
  "github-actions-cron-webhook-basics": "webhook",
  "mattermost-webhook-notification-bot": "webhook",
  "telepathy-perf-1-network": "telepathy-perf",
  "telepathy-perf-2-render-load": "telepathy-perf",
};

/**
 * 본문 맨 앞의 초안 frontmatter를 떼어낸다.
 *
 * 27편이 이걸 갖고 있다. 발행 기록(바깥)과 별개로 발행 전 초안의 메타데이터가
 * 본문에 남은 것인데, description·slug가 이미 작성돼 있어 버리면 안 된다.
 */
function takeInnerFrontmatter(content) {
  const m = content.match(/^\s*---\s*\n([\s\S]*?)\n---\s*\n/);
  if (!m) return { inner: null, body: content };
  let inner = null;
  try {
    inner = parseYaml(m[1]) ?? null;
  } catch {
    inner = null; // 파싱 실패 시 본문으로 취급해 남겨둔다
  }
  return inner ? { inner, body: content.slice(m[0].length) } : { inner: null, body: content };
}

/** SUMMARY를 뽑고 본문에서 제거한다. 세 가지 형식이 쓰였다. */
function takeSummary(content) {
  const forms = [
    /\n?##\s*SUMMARY\s*\n([\s\S]*?)(?=\n---|\n## |$)/, //  ## SUMMARY        93편
    /<!--\s*SUMMARY\s*([\s\S]*?)-->/, //                    <!--SUMMARY-->     1편
    /^\s*>\s*\*\*SUMMARY\*\*:?\s*([\s\S]*?)(?=\n\n)/m, //   > **SUMMARY**:     1편
  ];
  for (const re of forms) {
    const m = content.match(re);
    if (m && m[1].trim()) {
      return { summary: m[1].trim().replace(/\s+/g, " "), body: content.replace(m[0], "\n") };
    }
  }
  return { summary: null, body: content };
}

/** 본문 맨 앞에 남은 구분선·빈 줄을 정리한다. */
function tidy(body) {
  return body.replace(/^(?:\s*---\s*\n)+/, "").trim();
}

const files = readdirSync(SRC).filter((f) => f.endsWith(".md") && !f.startsWith("_"));
const ok = [];
const failed = [];
const warn = [];

for (const file of files) {
  const raw = readFileSync(join(SRC, file), "utf8");
  const { data, content } = matter(raw);
  const slug = file.replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/\.md$/, "");

  const { inner, body: afterInner } = takeInnerFrontmatter(content);
  if (inner?.slug && inner.slug !== slug) {
    warn.push(`${file}: 내부 slug "${inner.slug}" 가 파일명 "${slug}" 와 다름 — 파일명을 씀`);
  }

  const { summary, body } = takeSummary(afterInner);

  // 초안에 작성해둔 description이 있으면 그걸 쓴다. 없으면 SUMMARY를 승격한다.
  const description = inner?.description?.trim() || summary;
  if (!description) warn.push(`${file}: description 없음`);
  if (description && description.length > 300) {
    warn.push(`${file}: description ${description.length}자 — 관례(300자) 초과`);
  }

  const partMatch = String(data.title ?? "").match(/\((\d+)\s*\/\s*\d+\)/);
  const series = SERIES_OF[slug];

  const candidate = {
    title: data.title,
    slug,
    description: description ?? "",
    published_at: data.published_at,
    labels: data.labels,
    source: data.source ?? "",
    ...(data.tabs ? { tabs: data.tabs } : {}),
    ...(series ? { series, part: partMatch ? Number(partMatch[1]) : undefined } : {}),
    ...(data.url ? { legacy_url: data.url } : {}),
  };

  const result = postSchema.safeParse(candidate);
  if (!result.success) {
    failed.push({ file, error: result.error });
    continue;
  }
  ok.push({ data: result.data, body: tidy(body) });
}

console.log(`대상 ${files.length}편 — 통과 ${ok.length} / 실패 ${failed.length}\n`);

if (failed.length) {
  console.log("[검증 실패]");
  failed.forEach(({ file, error }) => console.log(formatIssues(file, error)));
  console.log();
}
if (warn.length) {
  console.log("[확인 필요]");
  warn.forEach((w) => console.log("  " + w));
  console.log();
}

const lens = ok.map((o) => o.data.description.length).sort((a, b) => b - a);
if (lens.length) {
  console.log(`description 길이  최대 ${lens[0]} / 중앙 ${lens[Math.floor(lens.length / 2)]} / 최소 ${lens.at(-1)}`);
}
const seriesCount = {};
ok.forEach((o) => o.data.series && (seriesCount[o.data.series] = (seriesCount[o.data.series] ?? 0) + 1));
console.log("시리즈 배정 ", JSON.stringify(seriesCount));
const bodyLens = ok.map((o) => o.body.length);
console.log(`본문 길이     최대 ${Math.max(...bodyLens).toLocaleString()} / 최소 ${Math.min(...bodyLens).toLocaleString()}`);

if (!WRITE) {
  console.log("\n드라이런 — 파일을 쓰지 않았습니다. 실제 변환은 --write");
  process.exit(failed.length ? 1 : 0);
}

mkdirSync(OUT, { recursive: true });
for (const { data, body } of ok) {
  writeFileSync(join(OUT, `${data.slug}.md`), matter.stringify("\n" + body + "\n", data), "utf8");
}
console.log(`\n${ok.length}편을 content/posts/ 에 썼습니다.`);
process.exit(failed.length ? 1 : 0);
