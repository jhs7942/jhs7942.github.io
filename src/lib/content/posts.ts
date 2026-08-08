import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { postSchema, type Post } from "./schema";
import { SERIES, type SeriesKey } from "./series";

const DIR = path.join(process.cwd(), "content", "posts");

export type PostDoc = Post & { body: string };

/**
 * 모든 글을 읽어 검증한다.
 *
 * static export라 이 함수는 빌드 시점에만 돈다. 검증 실패는 예외로 던져서
 * 빌드를 세운다 — 깨진 frontmatter가 조용히 배포되는 것보다 낫다.
 */
function load(): PostDoc[] {
  const docs: PostDoc[] = [];

  for (const file of readdirSync(DIR).filter((f) => f.endsWith(".md"))) {
    const { data, content } = matter(readFileSync(path.join(DIR, file), "utf8"));
    const parsed = postSchema.safeParse(data);

    if (!parsed.success) {
      const detail = parsed.error.issues
        .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
        .join(", ");
      throw new Error(`frontmatter 검증 실패 — content/posts/${file} [${detail}]`);
    }
    docs.push({ ...parsed.data, body: content });
  }

  return docs
    .filter((d) => !d.draft)
    .sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at));
}

// 빌드 중 여러 라우트가 같은 목록을 요청한다. 95편을 매번 다시 읽고 검증할 이유가 없다.
let cached: PostDoc[] | null = null;

export function getAllPosts(): PostDoc[] {
  return (cached ??= load());
}

export function getPost(slug: string): PostDoc | undefined {
  return getAllPosts().find((p) => p.slug === slug);
}

/** 같은 시리즈의 글을 part 순으로. 스테퍼와 이전/다음이 이걸 쓴다. */
export function getSeriesPosts(key: SeriesKey): PostDoc[] {
  return getAllPosts()
    .filter((p) => p.series === key)
    .sort((a, b) => (a.part ?? 0) - (b.part ?? 0));
}

export function getSeriesTitle(key: SeriesKey): string {
  return SERIES[key].title;
}

// 라벨 관련 조회는 labels.ts 에 있다. 슬러그 매핑과 같은 곳에 두어야
// 라벨 이름과 URL이 갈라지지 않는다.
