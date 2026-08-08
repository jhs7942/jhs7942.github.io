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
    <ul className="divide-y divide-border">
      {posts.map((post) => (
        <li key={post.slug} className="py-6">
          <Link href={`/posts/${post.slug}/`} className="group block">
            <div className="flex items-baseline gap-3">
              <time dateTime={post.published_at} className="shrink-0 text-xs text-muted tabular-nums">
                {DATE.format(new Date(post.published_at))}
              </time>
              {post.series && (
                <span className="shrink-0 text-xs font-semibold text-accent">
                  {getSeriesTitle(post.series as SeriesKey)} {post.part}
                </span>
              )}
            </div>
            <h2 className="mt-1 font-semibold text-balance group-hover:text-accent">
              {post.title}
            </h2>
            <p className="mt-1 line-clamp-2 text-sm text-muted">{post.description}</p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
