import Link from "next/link";
import { getSeriesPosts, getSeriesTitle, type PostDoc } from "@/lib/content/posts";
import type { SeriesKey } from "@/lib/content/series";

/**
 * 시리즈 스테퍼 + 이전/다음.
 *
 * 예전에는 이 마크업을 글마다 손으로 썼고, 발행 시점엔 다른 편의 URL을 몰라
 * placeholder를 넣었다가 전 편 발행 후 finalize 패스로 치환해야 했다
 * (CLAUDE.md "시리즈 발행·연결 절차"). 빌드 시점에 모든 글의 경로를 알기 때문에
 * 그 절차가 통째로 필요 없다.
 */
export function SeriesNav({ post }: { post: PostDoc }) {
  if (!post.series || !post.part) return null;

  const key = post.series as SeriesKey;
  const siblings = getSeriesPosts(key);
  const prev = siblings.find((p) => p.part === post.part! - 1);
  const next = siblings.find((p) => p.part === post.part! + 1);

  return (
    <nav aria-label="시리즈 탐색" className="my-8 space-y-4">
      <p className="text-xs font-bold tracking-widest text-muted uppercase">
        {getSeriesTitle(key)}
      </p>

      <ol className="flex flex-wrap gap-2">
        {siblings.map((sibling) => {
          const current = sibling.slug === post.slug;
          return (
            <li key={sibling.slug}>
              {current ? (
                <span
                  aria-current="page"
                  title={sibling.title}
                  className="inline-block rounded-full bg-accent px-3 py-1 text-sm font-semibold text-white"
                >
                  {sibling.part}
                </span>
              ) : (
                <Link
                  href={`/posts/${sibling.slug}/`}
                  title={sibling.title}
                  className="inline-block rounded-full border border-accent px-3 py-1 text-sm font-semibold text-accent hover:bg-accent-tint"
                >
                  {sibling.part}
                </Link>
              )}
            </li>
          );
        })}
      </ol>

      {(prev || next) && (
        <div className="flex flex-wrap justify-between gap-3">
          {prev ? (
            <Link
              href={`/posts/${prev.slug}/`}
              className="max-w-[48%] rounded-xl border border-border px-4 py-3 text-sm hover:border-accent"
            >
              <span className="block text-xs text-muted">← 이전 편</span>
              <span className="line-clamp-2">{prev.title}</span>
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link
              href={`/posts/${next.slug}/`}
              className="max-w-[48%] rounded-xl border border-border px-4 py-3 text-right text-sm hover:border-accent"
            >
              <span className="block text-xs text-muted">다음 편 →</span>
              <span className="line-clamp-2">{next.title}</span>
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
