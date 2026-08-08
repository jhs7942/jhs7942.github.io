import GithubSlugger from "github-slugger";
import { toString } from "hast-util-to-string";
import { visit } from "unist-util-visit";
import type { Root, Element } from "hast";

/**
 * 이모지·variation selector·ZWJ·이모지 수식 문자.
 *
 * \p{Extended_Pictographic} 만으로는 부족하다. 🖥️ 는 U+1F5A5 + U+FE0F 두 코드포인트인데,
 * 앞의 본체만 지우면 U+FE0F(눈에 보이지 않는 variation selector)가 id 선두에 남는다.
 * github-slugger는 이걸 그대로 통과시켜서 id="️-1-ssr과-csr" 같은 값이 나온다.
 *
 * CLAUDE.md의 이모지 섹션 마커 규칙(## 📦 제목) 때문에 모든 ## 헤딩이 해당된다.
 */
const EMOJI = /[\p{Extended_Pictographic}\p{Emoji_Modifier}︎️‍⃣]/gu;

/** 헤딩 텍스트에서 이모지를 걷어낸다. 슬러그 생성과 목차 표시가 같은 값을 쓴다. */
export function headingText(node: Element): string {
  return toString(node).replace(EMOJI, "").trim();
}

/** 슬러그 규칙. 목차를 따로 만들 때도 반드시 이 함수를 거쳐야 앵커가 어긋나지 않는다. */
export function slugify(text: string, slugger: GithubSlugger): string {
  return slugger
    .slug(text)
    // "1. SSR과 CSR — 화면을" 처럼 em dash가 든 제목은 대시가 사라지면서
    // 앞뒤 공백이 각각 하이픈이 돼 "csr--화면을" 이 된다. 하나로 접는다.
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * rehype-slug 대체 플러그인.
 *
 * 다른 점은 슬러그를 만들기 전에 이모지를 걷어낸다는 것뿐이다.
 * 중복 헤딩에 -1 을 붙이는 처리는 github-slugger가 그대로 한다.
 *
 * slugger 인스턴스는 문서 하나당 새로 만든다. 재사용하면 이전 문서에서 본 슬러그를
 * 기억하고 있어서 두 번째 문서부터 -1, -2 가 붙는다.
 */
export function rehypeEmojiSafeSlug() {
  return (tree: Root) => {
    const slugger = new GithubSlugger();

    visit(tree, "element", (node: Element) => {
      if (!/^h[1-6]$/.test(node.tagName)) return;
      node.properties ??= {};
      if (node.properties.id) return; // 본문에 직접 적어둔 id는 존중한다

      node.properties.id = slugify(headingText(node), slugger);
    });
  };
}
