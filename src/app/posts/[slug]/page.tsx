import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllPosts, getPost } from "@/lib/content/posts";
import { labelSlug } from "@/lib/content/labels";
import { renderMarkdown } from "@/lib/markdown/render";
import { SITE, absoluteUrl } from "@/lib/site";
import { SeriesNav } from "@/app/_components/SeriesNav";
import { Toc } from "@/app/_components/Toc";

// static export는 빌드 시점에 경로를 전부 알아야 한다.
export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: PageProps<"/posts/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};

  const url = absoluteUrl(`/posts/${post.slug}/`);
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.description,
      url,
      siteName: SITE.title,
      locale: SITE.locale,
      publishedTime: post.published_at,
      tags: [...post.labels],
    },
  };
}

const DATE = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "Asia/Seoul",
});

export default async function PostPage({ params }: PageProps<"/posts/[slug]">) {
  const { slug } = await params;
  // 글 슬러그는 스키마상 ASCII뿐이라 지금은 인코딩 문제가 없지만,
  // 라벨 쪽에서 겪었듯 디코딩을 빠뜨리면 조용히 404가 생성된다. 맞춰둔다.
  const post = getPost(decodeURIComponent(slug));
  if (!post) notFound();

  const { html, toc } = await renderMarkdown(post.body);

  return (
    <article className="mx-auto w-full max-w-3xl px-6 py-14">
      <header className="mb-8">
        <p className="font-label text-[11px] tracking-widest text-label">
          <time dateTime={post.published_at}>{DATE.format(new Date(post.published_at))}</time>
        </p>
        <h1 className="mt-2 font-display text-3xl leading-snug tracking-tight text-balance text-heading">
          {post.title}
        </h1>
        <ul className="mt-4 flex flex-wrap gap-2">
          {post.labels.map((label) => (
            <li key={label}>
              <Link
                href={`/labels/${labelSlug(label)}/`}
                className="rounded-full border-[1.5px] border-border-soft px-3 py-1 text-xs text-muted hover:border-accent hover:text-accent"
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </header>

      <p className="border-l-[3px] border-accent bg-accent-tint px-4 py-3 text-sm leading-relaxed">
        {post.description}
      </p>

      <SeriesNav post={post} />
      <Toc entries={toc} />

      {/*
        렌더한 HTML을 그대로 넣는다. 원본이 우리 저장소의 마크다운이라
        신뢰할 수 있는 입력이고, rehype-raw가 통과시키는 태그도 우리가 쓴 것뿐이다.
      */}
      <div className="post-body" dangerouslySetInnerHTML={{ __html: html }} />

      <SeriesNav post={post} />
    </article>
  );
}
