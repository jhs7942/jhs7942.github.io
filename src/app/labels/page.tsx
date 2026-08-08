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
    <section className="relative border-t-[1.5px] border-line-soft bg-cream px-7 pt-14 pb-21">
      <div className="mx-auto max-w-[1120px]">
        <h1 className="m-0 text-[34px] tracking-[-0.5px] text-ink-strong">라벨</h1>
        <p className="mt-1 text-[13.5px] text-ink opacity-70">{labels.length}개</p>

        <ul className="mt-8 flex flex-wrap gap-2">
          {labels.map(({ label, slug, count }) => (
            <li key={slug}>
              <Link href={`/labels/${slug}/`} className="card-badge">
                {label} <span className="tabular-nums opacity-60">{count}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
