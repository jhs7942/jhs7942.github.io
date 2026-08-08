import GithubSlugger from "github-slugger";
import { toString } from "hast-util-to-string";
import { visit } from "unist-util-visit";

/**
 * 이모지·variation selector·ZWJ·이모지 수식 문자.
 *
 * \p{Extended_Pictographic} 만으로는 부족하다. 🖥️ 는 U+1F5A5 + U+FE0F 두 코드포인트인데,
 * 앞의 본체만 지우면 U+FE0F(눈에 보이지 않는 variation selector)가 id 선두에 남는다.
 * github-slugger는 이걸 그대로 통과시켜서 id="️-1-ssr과-csr" 같은 값이 나온다.
 */
const EMOJI = /[\p{Extended_Pictographic}\p{Emoji_Modifier}︎️‍⃣]/gu;

/** 헤딩 텍스트 → 앵커 슬러그. 목차 생성 쪽에서도 같은 함수를 써야 한다. */
export function headingText(node) {
  return toString(node).replace(EMOJI, "").trim();
}

/**
 * rehype-slug 대체 플러그인.
 *
 * 기본 rehype-slug와 다른 점은 슬러그를 만들기 전에 이모지를 걷어낸다는 것뿐이다.
 * 나머지(중복 시 -1 접미사 부여)는 github-slugger가 그대로 처리한다.
 *
 * slugger 인스턴스는 문서 하나당 새로 만든다. 재사용하면 이전 문서에서 본 슬러그를
 * 기억하고 있어서 두 번째 문서부터 -1, -2 가 붙는다.
 */
export function rehypeEmojiSafeSlug() {
  return (tree) => {
    const slugger = new GithubSlugger();

    visit(tree, "element", (node) => {
      if (!/^h[1-6]$/.test(node.tagName)) return;
      if (node.properties.id) return; // 본문에 직접 적어둔 id는 존중한다

      // "1. SSR과 CSR — 화면을" 처럼 em dash가 들어간 제목은 대시가 사라지면서
      // 앞뒤 공백이 각각 하이픈이 돼 "csr--화면을" 이 된다. 하나로 접는다.
      node.properties.id = slugger
        .slug(headingText(node))
        .replace(/-{2,}/g, "-")
        .replace(/^-+|-+$/g, "");
    });
  };
}
