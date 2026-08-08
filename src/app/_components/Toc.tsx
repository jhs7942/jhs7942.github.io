import type { TocEntry } from "@/lib/markdown/render";

/**
 * 목차.
 *
 * 앵커는 헤딩에 id를 붙인 플러그인과 같은 트리에서 나온 값이라 어긋날 수 없다.
 * 예전에는 목차를 손으로 적고 앵커를 추측했는데, 발행 파이프라인의 slugify가
 * 한국어를 버려서 예측이 거의 빗나갔다 (CLAUDE.md "목차 앵커 규칙").
 *
 * ## 섹션이 5개 미만이면 목차를 만들지 않는다 — 원래의 작성 규칙 그대로다.
 */
export function Toc({ entries }: { entries: TocEntry[] }) {
  const top = entries.filter((e) => e.depth === 2 && e.text !== "SUMMARY");
  if (top.length < 5) return null;

  return (
    <nav
      aria-label="목차"
      className="my-8 border-[1.5px] border-border-soft bg-surface px-5 py-4"
      style={{ borderRadius: "var(--radius-hand)" }}
    >
      <p className="mb-3 font-label text-[11px] tracking-widest text-label">목차</p>
      <ol className="space-y-2">
        {top.map((entry, i) => (
          <li key={entry.id} className="flex gap-3 text-sm">
            <span className="shrink-0 font-bold text-accent tabular-nums">{i + 1}</span>
            <a href={`#${entry.id}`} className="hover:text-accent hover:underline">
              {/* 헤딩 텍스트에 이미 "1." 같은 순번이 붙어 있으면 중복을 걷어낸다. */}
              {entry.text.replace(/^\d+\.\s*/, "")}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
