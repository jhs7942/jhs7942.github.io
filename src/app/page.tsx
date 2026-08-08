import Link from "next/link";
import { getAllPosts } from "@/lib/content/posts";
import { getLabels } from "@/lib/content/labels";
import { PostList } from "./_components/PostList";
import { SITE } from "@/lib/site";

export default function Home() {
  const posts = getAllPosts();
  const labels = getLabels().slice(0, 10);

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-14">
      <header className="mb-10 text-center">
        <h1 className="font-display text-3xl leading-snug tracking-tight text-balance text-heading">
          {SITE.description}
        </h1>
        <p className="mt-3 font-label text-xs tracking-widest text-label">
          {posts.length} POSTS
        </p>
      </header>

      <nav aria-label="라벨" className="mb-10 flex flex-wrap justify-center gap-2">
        {labels.map(({ label, slug }) => (
          <Link
            key={slug}
            href={`/labels/${slug}/`}
            className="border-[1.5px] border-border-soft bg-surface px-3 py-1 text-xs hover:border-accent hover:text-accent"
            style={{ borderRadius: "999px" }}
          >
            {label}
          </Link>
        ))}
        <Link
          href="/labels/"
          className="px-3 py-1 text-xs text-accent hover:underline"
        >
          전체 →
        </Link>
      </nav>

      <PostList posts={posts} />
    </main>
  );
}
