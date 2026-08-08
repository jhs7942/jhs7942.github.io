import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeStringify from "rehype-stringify";
import { visit } from "unist-util-visit";
import type { Root, Element } from "hast";
import { rehypeEmojiSafeSlug, headingText } from "./emoji-safe-slug";

export type TocEntry = { id: string; text: string; depth: 2 | 3 };

/**
 * 목차를 헤딩에서 수집한다.
 *
 * 예전에는 목차를 글마다 손으로 적었고, 앵커를 사람이 예측하다가 자주 틀렸다
 * (CLAUDE.md의 "목차 앵커 규칙" 참고). 이제는 id를 붙이는 플러그인과 목차를
 * 만드는 코드가 같은 트리를 보므로 어긋날 수가 없다.
 *
 * rehypeEmojiSafeSlug 뒤에 와야 한다 — 그 전에는 아직 id가 없다.
 */
function rehypeCollectToc(sink: TocEntry[]) {
  return (tree: Root) => {
    visit(tree, "element", (node: Element) => {
      if (node.tagName !== "h2" && node.tagName !== "h3") return;
      const id = node.properties?.id;
      if (typeof id !== "string") return;
      sink.push({
        id,
        text: headingText(node),
        depth: node.tagName === "h2" ? 2 : 3,
      });
    });
  };
}

export type RenderedPost = { html: string; toc: TocEntry[] };

export async function renderMarkdown(markdown: string): Promise<RenderedPost> {
  const toc: TocEntry[] = [];

  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    // allowDangerousHtml 없이는 본문에 직접 쓴 HTML(<details> 등)이 버려진다.
    .use(remarkRehype, { allowDangerousHtml: true })
    // 그 HTML을 문자열이 아니라 트리로 편입시킨다. 다른 rehype 플러그인보다 먼저 와야 한다.
    .use(rehypeRaw)
    .use(rehypeEmojiSafeSlug)
    .use(rehypeCollectToc, toc)
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(markdown);

  return { html: String(file), toc };
}
