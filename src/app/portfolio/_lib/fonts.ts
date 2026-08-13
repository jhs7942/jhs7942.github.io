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
  display: "swap",
  preload: false,
});
