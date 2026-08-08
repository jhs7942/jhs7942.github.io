/**
 * 본문에 손으로 박혀 있는 "크롬"(시리즈 스테퍼·이전/다음·목차)을 걷어낸다.
 *
 *   npx tsx scripts/strip-chrome.mjs           # 드라이런
 *   npx tsx scripts/strip-chrome.mjs --write   # 실제로 덮어쓴다
 *
 * 이것들은 Blogger에 컴포넌트가 없어서 매 글마다 인라인 스타일로 재작성한 것이다.
 * 정적 사이트는 빌드 시점에 모든 글의 URL과 헤딩을 알기 때문에 frontmatter의
 * series/part와 헤딩 트리에서 다시 생성할 수 있다. 남겨두면 링크가 blogspot을
 * 가리키고 목차 앵커는 새 heading id와 어긋난다.
 *
 * 본문(산문·표·코드·인용·details)은 건드리지 않는다. 코드 펜스 안도 절대 손대지 않는다.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";

const DIR = join(import.meta.dirname, "..", "content", "posts");
const WRITE = process.argv.includes("--write");

/** 한 줄짜리 크롬 블록들. 전부 Blogger 발행 파이프라인이 만든 고정 마크업이다. */
const LINE_PATTERNS = [
  { name: "스테퍼", re: /^<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:0 0 6px"/ },
  // 첫 편/마지막 편은 한쪽 버튼만 있어 justify-content가 달라진다(3종).
  { name: "이전/다음", re: /^<div style="display:flex;gap:12px;flex-wrap:wrap;margin:6px 0 0/ },
  { name: "목차(HTML)", re: /^<div style="margin:14px 0 0">.*>목차<\/div>/ },
  { name: "시리즈 인용구", re: /^>\s*\*\*시리즈(\s*(이전|다음)\s*편)?\*\*\s*:/ },
  // 학습 시리즈 상단 배너(🧩 … 전체 정리 · 목차 보기 →). 소속은 assign-series.mjs가
  // 이미 frontmatter의 series/part로 옮겼으므로 여기서 지워도 정보가 사라지지 않는다.
  { name: "시리즈 배너", re: /^<p style="margin:24px 0 2px;padding:13px 18px;border:1\.5px solid #C8443C/ },
];

/** ``` 펜스 안인지 추적한다. 코드 예제 속 <div>·목차 문자열을 지우면 안 된다. */
function stripChrome(rawContent) {
  // 원본이 CRLF다. 정규화하지 않으면 아래 빈 줄 정리(\n{3,})가 하나도 매치되지 않는다.
  const content = rawContent.replace(/\r\n/g, "\n");
  const lines = content.split("\n");
  const out = [];
  const hits = {};
  let inFence = false;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (/^(```|~~~)/.test(trimmed)) {
      inFence = !inFence;
      out.push(line);
      i++;
      continue;
    }
    if (inFence) {
      out.push(line);
      i++;
      continue;
    }

    const matched = LINE_PATTERNS.find((p) => p.re.test(trimmed));
    if (matched) {
      hits[matched.name] = (hits[matched.name] ?? 0) + 1;
      i++;
      continue;
    }

    // 마크다운 목차: "#### 목차" 헤딩 + 뒤따르는 앵커 링크 목록을 통째로 걷어낸다.
    if (/^#{2,4}\s*목차\s*$/.test(trimmed)) {
      let j = i + 1;
      let consumedAnchor = false;
      while (j < lines.length) {
        const t = lines[j].trim();
        if (t === "") { j++; continue; }
        if (/^(\d+\.|[-*])\s*\[[^\]]*\]\(#[^)]*\)/.test(t)) { consumedAnchor = true; j++; continue; }
        break;
      }
      if (consumedAnchor) {
        hits["목차(마크다운)"] = (hits["목차(마크다운)"] ?? 0) + 1;
        i = j;
        continue;
      }
    }

    out.push(line);
    i++;
  }

  // 크롬을 빼면서 생긴 연속 빈 줄과 고아 구분선을 정리한다.
  let body = out.join("\n").replace(/\n{3,}/g, "\n\n");
  body = body.replace(/^\s*(?:---\s*\n\s*)+/, "");
  body = body.replace(/\n\s*---\s*$/, "");
  return { body: body.trim(), hits };
}

const files = readdirSync(DIR).filter((f) => f.endsWith(".md"));
const totals = {};
let changedFiles = 0;
let blogspotBefore = 0;
let blogspotAfter = 0;

for (const file of files) {
  const raw = readFileSync(join(DIR, file), "utf8");
  const { data, content } = matter(raw);
  const { body, hits } = stripChrome(content);

  blogspotBefore += (content.match(/saver7942\.blogspot\.com/g) ?? []).length;
  blogspotAfter += (body.match(/saver7942\.blogspot\.com/g) ?? []).length;

  for (const [k, v] of Object.entries(hits)) totals[k] = (totals[k] ?? 0) + v;

  // 크롬이 없어도 줄바꿈 정규화·빈 줄 정리로 본문이 달라질 수 있다.
  // 결과가 같으면 건드리지 않아 재실행이 안전하다(멱등).
  const next = matter.stringify("\n" + body + "\n", data);
  if (next === raw) continue;
  changedFiles++;
  if (WRITE) writeFileSync(join(DIR, file), next, "utf8");
}

console.log(`대상 ${files.length}편 — 변경 ${changedFiles}편\n`);
console.log("제거한 크롬:");
for (const [k, v] of Object.entries(totals).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k.padEnd(16)} ${v}`);
}
console.log(`\nblogspot 링크  ${blogspotBefore} → ${blogspotAfter}  (${blogspotBefore - blogspotAfter}개 소멸)`);

// 놓친 생성 마크업이 없는지 되짚는다. 인라인 스타일 + blogspot 링크가 한 줄에
// 같이 있으면 손으로 쓴 문장이 아니라 파이프라인이 만든 크롬일 가능성이 높다.
const leftover = [];
for (const file of files) {
  const { content } = matter(readFileSync(join(DIR, file), "utf8"));
  const { body } = stripChrome(content);
  let inFence = false;
  for (const line of body.split("\n")) {
    const t = line.trim();
    if (/^(```|~~~)/.test(t)) { inFence = !inFence; continue; }
    if (inFence) continue;
    if (/style="[^"]*"/.test(t) && /blogspot\.com/.test(t)) leftover.push(`${file}: ${t.slice(0, 90)}`);
  }
}
console.log(`\n남은 "인라인 스타일 + blogspot 링크" 줄: ${leftover.length}개`);
leftover.slice(0, 8).forEach((l) => console.log("  " + l));
console.log(WRITE ? "\n덮어썼습니다." : "\n드라이런 — 파일을 쓰지 않았습니다. 실제 반영은 --write");
