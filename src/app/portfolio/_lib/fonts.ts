import localFont from "next/font/local";

/**
 * 포트폴리오 전용 손글씨체(온글잎 손글씨체) — 본문에는 안 쓴다. 히어로 이름과
 * 각 섹션의 영문 포인트 태그(.cloud-eyebrow · .cloud-sectag)에만 강조용으로
 * 얹는다(portfolio.css 참고). 긴 본문에 손글씨체를 쓰면 가독성이 떨어져서
 * 사이트 기본 폰트(Noto Sans KR)는 그대로 둔다.
 */
export const handFont = localFont({
  src: "../_fonts/ongeulip-handwriting.ttf",
  variable: "--font-hand",
  // 첫 페인트 뒤 대체 폰트에서 손글씨체로 교체되며 제목 크기가 튀지 않도록
  // 포트폴리오 HTML에서 바로 선로딩하고, 준비된 글꼴만 화면에 그린다.
  display: "block",
  preload: true,
});

/** 스킬·교육 편지 카드의 설명에 쓰는 온글잎 보현체. */
export const noteFont = localFont({
  src: "../_fonts/ongeulip-bohyun.ttf",
  variable: "--font-note",
  display: "swap",
  // 크기가 큰 한글 폰트이고 첫 장에서는 쓰지 않으므로 초기 선로딩은 하지 않는다.
  preload: false,
});
