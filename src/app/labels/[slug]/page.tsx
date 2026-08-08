import type { Metadata } from "next";
import Link from "next/link";
import { getLabels, labelFromSlug, getPostsByLabel } from "@/lib/content/labels";
import { PostList } from "@/app/_components/PostList";
import { absoluteUrl } from "@/lib/site";

export function generateStaticParams() {
  return getLabels().map(({ slug }) => ({ slug }));
}

/**
 * Next는 비ASCII 동적 파라미터를 퍼센트 인코딩해서 넘긴다.
 * "서버-상태-관리" 는 "%EC%84%9C%EB%B2%84-..." 로 도착하므로 디코딩해야 조회된다.
 * ASCII 슬러그에는 아무 영향이 없다.
 *
 * 모든 slug는 generateStaticParams가 준 값이다. 조회에 실패하면 없는 페이지가
 * 아니라 우리 코드의 버그이므로 notFound()가 아니라 예외로 빌드를 세운다 —
 * 이 인코딩 문제가 처음엔 404 페이지를 조용히 생성하는 것으로 나타났다.
 */
function resolveLabel(slug: string): string {
  const label = labelFromSlug(decodeURIComponent(slug));
  if (!label) throw new Error(`라벨 슬러그를 해석할 수 없다: ${slug}`);
  return label;
}

export async function generateMetadata({ params }: PageProps<"/labels/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const label = resolveLabel(slug);
  return {
    title: label,
    description: `${label} 라벨이 붙은 글 목록`,
    alternates: { canonical: absoluteUrl(`/labels/${slug}/`) },
  };
}

export default async function LabelPage({ params }: PageProps<"/labels/[slug]">) {
  const { slug } = await params;
  const label = resolveLabel(slug);
  const posts = getPostsByLabel(label);

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-14">
      <header className="mb-8">
        <Link href="/labels/" className="font-label text-[11px] tracking-widest text-label hover:text-accent">
          ← ALL LABELS
        </Link>
        <h1 className="mt-3 font-display text-2xl tracking-tight text-heading">{label}</h1>
        <p className="mt-1 font-label text-xs tracking-widest text-label tabular-nums">
          {posts.length} POSTS
        </p>
      </header>

      <PostList posts={posts} />
    </main>
  );
}
