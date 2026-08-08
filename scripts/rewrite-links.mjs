/**
 * 본문에 남은 blogspot 링크를 새 사이트 경로로 바꾼다.
 *
 *   npx tsx scripts/rewrite-links.mjs           # 드라이런
 *   npx tsx scripts/rewrite-links.mjs --write
 *
 * 각 글의 legacy_url 로 역매핑(옛 주소 -> slug)을 만든다. 매핑에 없는 주소는
 * 건드리지 않고 보고만 한다 — 삭제된 글이거나 라벨/아카이브 페이지일 수 있고,
 * 그런 건 사람이 판단해야 한다.
 *
 * 코드 펜스 안은 손대지 않는다. 예제로 적힌 URL을 바꾸면 글이 틀려진다.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";

const DIR = join(import.meta.dirname, "..", "content", "posts");
const WRITE = process.argv.includes("--write");

/** 비교용 정규화: 프로토콜·www·끝 슬래시를 없앤다. */
function normalize(url) {
  return url
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/+$/, "")
    .toLowerCase();
}

const files = readdirSync(DIR).filter((f) => f.endsWith(".md"));
const docs = files.map((file) => {
  const parsed = matter(readFileSync(join(DIR, file), "utf8"));
  return { file, data: parsed.data, content: parsed.content };
});

/**
 * 8편의 legacy_url이 글 주소가 아니라 블로그 루트("…blogspot.com")로 기록돼 있다.
 * 발행 기록이 URL을 못 잡은 경우다. 역매핑에 넣으면 본문의 루트 링크가 엉뚱한
 * 글로 치환되므로 배제하고, 틀린 값 자체도 지운다(없느니만 못한 값이다).
 */
function hasPostPath(url) {
  return /blogspot\.com\/.+/.test(normalize(url) + "/") && normalize(url) !== "saver7942.blogspot.com";
}

const legacyToSlug = new Map();
const bogusLegacy = [];
for (const d of docs) {
  if (!d.data.legacy_url) continue;
  if (!hasPostPath(d.data.legacy_url)) {
    bogusLegacy.push(d);
    continue;
  }
  const key = normalize(d.data.legacy_url);
  if (legacyToSlug.has(key)) {
    console.log(`[경고] legacy_url 중복: ${key} — ${legacyToSlug.get(key)} vs ${d.data.slug}`);
  }
  legacyToSlug.set(key, d.data.slug);
}
console.log(`역매핑 ${legacyToSlug.size}건 확보`);
console.log(`경로 없는 legacy_url ${bogusLegacy.length}건 — 매핑에서 배제하고 필드를 제거한다\n`);

const LINK = /https?:\/\/saver7942\.blogspot\.com[^\s"')\]]*/g;

const unmatched = new Map();
const withAnchor = [];
let replaced = 0;
let changedFiles = 0;

for (const doc of docs) {
  const lines = doc.content.split("\n");
  let inFence = false;
  let touched = false;

  const next = lines.map((line) => {
    const t = line.trim();
    if (/^(```|~~~)/.test(t)) {
      inFence = !inFence;
      return line;
    }
    if (inFence) return line;

    return line.replace(LINK, (url) => {
      // 앵커는 옛 slugify로 만들어진 값이라 새 heading id와 맞지 않는다.
      const [base, anchor] = url.split("#");
      const slug = legacyToSlug.get(normalize(base));
      if (!slug) {
        unmatched.set(url, (unmatched.get(url) ?? 0) + 1);
        return url;
      }
      if (anchor) withAnchor.push(`${doc.file}: #${anchor} (${slug})`);
      replaced++;
      touched = true;
      return `/posts/${slug}/`;
    });
  });

  const dropLegacy = bogusLegacy.includes(doc);
  if (dropLegacy) delete doc.data.legacy_url;
  if (!touched && !dropLegacy) continue;
  if (touched) changedFiles++;
  if (WRITE) {
    writeFileSync(join(DIR, doc.file), matter.stringify("\n" + next.join("\n").trim() + "\n", doc.data), "utf8");
  }
}

console.log(`치환 ${replaced}개 / ${changedFiles}편`);

if (withAnchor.length) {
  console.log(`\n[앵커가 붙은 링크 ${withAnchor.length}개 — 앵커는 옛 규칙이라 깨진다]`);
  withAnchor.slice(0, 10).forEach((w) => console.log("  " + w));
}

if (unmatched.size) {
  console.log(`\n[매핑 없음 ${[...unmatched.values()].reduce((a, b) => a + b, 0)}개 / ${unmatched.size}종]`);
  [...unmatched].sort((a, b) => b[1] - a[1]).forEach(([url, n]) => console.log(`  x${n}  ${url}`));
}

console.log(WRITE ? "\n반영했습니다." : "\n드라이런 — 파일을 쓰지 않았습니다. 실제 반영은 --write");
