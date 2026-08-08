import type { Metadata } from "next";
import Link from "next/link";
import { getLabels, labelFromSlug, getPostsByLabel, labelSlug } from "@/lib/content/labels";
import { PostGrid, type CardPost } from "@/app/_components/PostGrid";
import { absoluteUrl } from "@/lib/site";

export function generateStaticParams() {
  return getLabels().map(({ slug }) => ({ slug }));
}

/**
 * Next는 비ASCII 동적 파라미터를 퍼센트 인코딩해서 넘긴다.
 * "서버-상태-관리" 는 "%EC%84%9C%EB%B2%84-..." 로 도착하므로 디코딩해야 조회된다.
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

  const posts: CardPost[] = getPostsByLabel(label).map((p) => ({
    slug: p.slug,
    title: p.title,
    description: p.description,
    labels: [...p.labels],
    labelHrefs: p.labels.map((l) => `/labels/${labelSlug(l)}/`),
  }));

  return (
    <section className="relative border-t-[1.5px] border-line-soft bg-cream px-7 pt-14 pb-21">
      <div className="mx-auto mb-6 max-w-[1120px]">
        <Link href="/labels/" className="text-[13.5px] text-ink opacity-70 no-underline hover:text-accent">
          ← 전체 라벨
        </Link>
      </div>
      <PostGrid posts={posts} heading={label} />
    </section>
  );
}
