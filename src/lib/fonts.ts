import { Jua, Gothic_A1, DotGothic16 } from "next/font/google";

/**
 * 기존 테마(theme/main-page-v2.html)가 쓰던 조합을 그대로 가져온다.
 *
 * next/font/google 은 빌드 시점에 폰트를 내려받아 _next/static/media 로 자체 호스팅한다.
 * Google Fonts를 런타임에 부르지 않으므로 외부 요청이 사라지고, 렌더 차단도 없다.
 * (예전 blogger-custom.css 는 @import 로 매 방문마다 fonts.googleapis.com 을 탔다.)
 */

/**
 * preload: false 가 핵심이다.
 *
 * 한글 폰트는 unicode-range 로 수십 개 청크로 쪼개져 있는데, next/font 는 어떤 글자를
 * 쓸지 알 수 없으니 preload 를 켜면 전부 받아둔다. 실측으로 폰트 파일 218개 ·
 * 1,890 KB · preload 태그 190개가 나왔고 페이지 전송량의 89%였다.
 *
 * preload 를 끄면 브라우저가 @font-face 의 unicode-range 를 보고 실제로 필요한
 * 청크만 가져간다. 대신 폰트가 조금 늦게 적용되므로 display: "swap" 으로 본문이
 * 먼저 보이게 한다 — 빈 화면보다 시스템 폰트로 읽히는 편이 낫다.
 */

/** 제목 — 둥근 손글씨 느낌. 이 디자인의 인상을 결정한다. */
export const jua = Jua({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  preload: false,
});

/** 본문 — 한글 가독성용. 500은 쓰는 곳이 없어 400/700만 받는다. */
export const gothicA1 = Gothic_A1({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  preload: false,
});

/** 작은 라벨 — 픽셀체. 날짜·시리즈명처럼 짧은 메타 정보에만 쓴다. */
export const dotGothic = DotGothic16({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-label",
  display: "swap",
  preload: false,
});
