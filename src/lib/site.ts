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
  title: "정현승 | 웹 개발자 포트폴리오",
  description:
    "React·TypeScript를 중심으로 프론트엔드부터 백엔드·인프라까지 경험한 웹 개발자 정현승의 포트폴리오와 기술 기록입니다.",
  author: "정현승",
  locale: "ko_KR",
} as const;

/** 사이트 루트 기준 경로를 절대 URL로 바꾼다. */
export function absoluteUrl(path: string): string {
  return new URL(path, SITE.url).toString();
}
