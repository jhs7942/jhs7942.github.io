"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type CardPost = {
  slug: string;
  title: string;
  description: string;
  labels: string[];
  labelHrefs: string[];
};

/**
 * 3열 카드 그리드 + 검색.
 *
 * Blogger 판의 검색은 /search?q= 로 서버에 넘겼다. 정적 사이트에는 그 서버가 없으므로
 * 이미 렌더된 목록을 클라이언트에서 거른다. 95편 정도는 색인 없이 문자열 매칭으로 충분하다.
 */
export function PostGrid({ posts, heading = "최근 글" }: { posts: CardPost[]; heading?: string }) {
  const [query, setQuery] = useState("");

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return posts;
    return posts.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.labels.some((l) => l.toLowerCase().includes(q)),
    );
  }, [posts, query]);

  return (
    <div className="mx-auto max-w-[1120px]">
      <div className="mb-9 flex flex-wrap items-center justify-between gap-4">
        <h2 className="m-0 text-[34px] tracking-[-0.5px] text-ink-strong">{heading}</h2>
        <form role="search" onSubmit={(e) => e.preventDefault()} className="flex items-center">
          <input
            className="hdr-search w-[220px] max-sm:w-full"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="제목·내용 검색"
            aria-label="제목이나 내용으로 검색"
          />
        </form>
      </div>

      {shown.length === 0 ? (
        <p className="py-10 text-center text-ink opacity-70">
          &lsquo;{query}&rsquo; 와 맞는 글이 없습니다.
        </p>
      ) : (
        <div className="post-grid">
          {shown.map((post) => (
            <article key={post.slug} className="post-card reveal">
              <div className="card-wobble" />
              <div className="card-thumb">
                <span className="thumb-note">// thumbnail</span>
              </div>
              <div className="card-body">
                {post.labels.map((label, i) => (
                  <Link key={label} href={post.labelHrefs[i]} className="card-badge">
                    {label}
                  </Link>
                ))}
                <h3 className="card-title">
                  <Link href={`/posts/${post.slug}/`}>{post.title}</Link>
                </h3>
                <p className="card-snippet">{post.description}</p>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
