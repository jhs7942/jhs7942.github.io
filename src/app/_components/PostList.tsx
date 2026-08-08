import Link from "next/link";
import type { PostDoc } from "@/lib/content/posts";
import { getSeriesTitle } from "@/lib/content/posts";
import type { SeriesKey } from "@/lib/content/series";

const DATE = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "Asia/Seoul",
});

export function PostList({ posts }: { posts: PostDoc[] }) {
  return (
    <ul className="space-y-4">
      {posts.map((post) => (
        <li key={post.slug}>
          <Link
            href={`/posts/${post.slug}/`}
            className="group block border-[1.5px] border-border-soft bg-surface p-5 transition-colors hover:border-accent"
            style={{ borderRadius: "var(--radius-hand)" }}
          >
            {/* 메타 줄은 픽셀체. 원본 테마가 카테고리·날짜에 쓰던 처리다. */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-label text-[10.5px] tracking-widest">
              <time dateTime={post.published_at} className="text-label">
                {DATE.format(new Date(post.published_at))}
              </time>
              {post.series && (
                <span className="text-accent">
                  {getSeriesTitle(post.series as SeriesKey)} #{post.part}
                </span>
              )}
            </div>

            <h2 className="mt-2 font-display text-lg leading-snug text-balance text-heading group-hover:text-accent">
              {post.title}
            </h2>
            <p className="mt-2 line-clamp-2 text-sm text-muted">{post.description}</p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
