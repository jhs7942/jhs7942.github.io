import { getAllPosts } from "@/lib/content/posts";
import { labelSlug } from "@/lib/content/labels";
import { Hero } from "./_components/Hero";
import { PostGrid, type CardPost } from "./_components/PostGrid";

export default function Home() {
  const posts: CardPost[] = getAllPosts().map((p) => ({
    slug: p.slug,
    title: p.title,
    description: p.description,
    labels: [...p.labels],
    labelHrefs: p.labels.map((l) => `/labels/${labelSlug(l)}/`),
  }));

  return (
    <>
      <Hero />
      <section id="posts" className="relative border-t-[1.5px] border-line-soft bg-cream px-7 pt-18 pb-21">
        <PostGrid posts={posts} />
      </section>
    </>
  );
}
