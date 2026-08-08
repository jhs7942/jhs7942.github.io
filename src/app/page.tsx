import Link from "next/link";
import { getAllPosts } from "@/lib/content/posts";
import { getLabels } from "@/lib/content/labels";
import { PostList } from "./_components/PostList";
import { SITE } from "@/lib/site";

export default function Home() {
  const posts = getAllPosts();
  const labels = getLabels().slice(0, 12);

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16">
      <header className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight">{SITE.title}</h1>
        <p className="mt-2 text-muted">{SITE.description}</p>
      </header>

      <nav aria-label="라벨" className="mb-10 flex flex-wrap gap-2">
        {labels.map(({ label, slug, count }) => (
          <Link
            key={slug}
            href={`/labels/${slug}/`}
            className="rounded-full border border-border px-3 py-1 text-xs text-muted hover:border-accent hover:text-accent"
          >
            {label} <span className="tabular-nums opacity-60">{count}</span>
          </Link>
        ))}
      </nav>

      <p className="mb-2 text-xs text-muted tabular-nums">글 {posts.length}편</p>
      <PostList posts={posts} />
    </main>
  );
}
