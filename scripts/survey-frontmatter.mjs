import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
const dir = String.raw`C:\Users\사용자\Desktop\프로젝트\blog\published`;
const files = readdirSync(dir).filter(f => f.endsWith(".md") && !f.startsWith("_"));
const keys = new Map();
for (const f of files) {
  const { data } = matter(readFileSync(join(dir, f), "utf8"));
  for (const [k, v] of Object.entries(data)) {
    if (!keys.has(k)) keys.set(k, { n: 0, types: new Set(), sample: v });
    const e = keys.get(k); e.n++;
    e.types.add(Array.isArray(v) ? "array" : v === null ? "null" : typeof v);
  }
}
console.log(`총 ${files.length}편\n`);
console.log("키".padEnd(16) + "등장".padStart(5) + "  결측".padStart(5) + "  타입");
for (const [k, e] of [...keys].sort((a,b) => b[1].n - a[1].n)) {
  console.log(k.padEnd(16) + String(e.n).padStart(5) + String(files.length - e.n).padStart(7) + "  " + [...e.types].join("|"));
}
