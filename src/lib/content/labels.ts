import GithubSlugger from "github-slugger";
import { getAllPosts, type PostDoc } from "./posts";

/**
 * 라벨 ↔ URL 슬러그 매핑.
 *
 * 라벨에 공백과 한글이 섞여 있어("AI 작성", "서버 상태 관리") 그대로 경로에 넣으면
 * static export가 만드는 디렉터리 이름이 지저분해지고 인코딩 사고가 나기 쉽다.
 * 슬러그를 한 번 만들어 양방향으로 쓴다.
 *
 * 정렬된 순서로 슬러그를 뽑기 때문에 결과가 결정론적이다 — 글이 늘어도
 * 기존 라벨의 URL이 바뀌지 않는다(같은 슬러그로 충돌하지 않는 한).
 */
function build() {
  const slugger = new GithubSlugger();
  const toSlug = new Map<string, string>();
  const toLabel = new Map<string, string>();

  const labels = new Set<string>();
  for (const post of getAllPosts()) for (const label of post.labels) labels.add(label);

  for (const label of [...labels].sort()) {
    const slug = slugger.slug(label);
    toSlug.set(label, slug);
    toLabel.set(slug, label);
  }
  return { toSlug, toLabel };
}

let cached: ReturnType<typeof build> | null = null;
const maps = () => (cached ??= build());

export function labelSlug(label: string): string {
  const slug = maps().toSlug.get(label);
  if (!slug) throw new Error(`알 수 없는 라벨: ${label}`);
  return slug;
}

export function labelFromSlug(slug: string): string | undefined {
  return maps().toLabel.get(slug);
}

export type LabelSummary = { label: string; slug: string; count: number };

/** 글 수 내림차순, 동수면 이름순. */
export function getLabels(): LabelSummary[] {
  const counts = new Map<string, number>();
  for (const post of getAllPosts()) {
    for (const label of post.labels) counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts]
    .map(([label, count]) => ({ label, slug: labelSlug(label), count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export function getPostsByLabel(label: string): PostDoc[] {
  return getAllPosts().filter((p) => p.labels.includes(label));
}
