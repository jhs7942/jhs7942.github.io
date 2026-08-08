/**
 * 사이트 전역 설정.
 *
 * IMPORTANT: 절대 URL은 반드시 여기서만 만든다. canonical·OG·sitemap·RSS가
 * 전부 SITE.url에서 파생되므로, 나중에 커스텀 도메인을 붙일 때
 * 이 한 줄과 public/CNAME 파일만 바꾸면 전환이 끝난다.
 * 컴포넌트나 메타데이터에 "https://jhs7942.github.io"를 직접 적지 않는다.
 */
export const SITE = {
  url: "https://jhs7942.github.io",
  title: "jhs7942",
  description: "제약을 좁혀 도달을 만드는 프론트엔드 개발자의 기술 블로그",
  author: "jhs7942",
  locale: "ko_KR",
} as const;

/** 사이트 루트 기준 경로를 절대 URL로 바꾼다. */
export function absoluteUrl(path: string): string {
  return new URL(path, SITE.url).toString();
}
