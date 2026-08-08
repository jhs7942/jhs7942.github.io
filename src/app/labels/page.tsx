import type { Metadata } from "next";
import Link from "next/link";
import { getLabels } from "@/lib/content/labels";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "라벨",
  description: "라벨별 글 모음",
  alternates: { canonical: absoluteUrl("/labels/") },
};

export default function LabelsPage() {
  const labels = getLabels();

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-14">
      <h1 className="font-display text-2xl tracking-tight text-heading">라벨</h1>
      <p className="mt-1 font-label text-xs tracking-widest text-label">
        {labels.length} LABELS
      </p>

      <ul className="mt-8 flex flex-wrap gap-2">
        {labels.map(({ label, slug, count }) => (
          <li key={slug}>
            <Link
              href={`/labels/${slug}/`}
              className="inline-block border-[1.5px] border-border-soft bg-surface px-3 py-1.5 text-sm hover:border-accent hover:text-accent"
              style={{ borderRadius: "var(--radius-hand-sm)" }}
            >
              {label}{" "}
              <span className="font-label text-xs text-label tabular-nums">{count}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
