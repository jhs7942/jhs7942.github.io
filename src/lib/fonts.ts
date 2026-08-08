import { Jua, Gothic_A1, DotGothic16 } from "next/font/google";

/**
 * 기존 테마(theme/main-page-v2.html)가 쓰던 조합을 그대로 가져온다.
 *
 * next/font/google 은 빌드 시점에 폰트를 내려받아 _next/static/media 로 자체 호스팅한다.
 * Google Fonts를 런타임에 부르지 않으므로 외부 요청이 사라지고, 렌더 차단도 없다.
 * (예전 blogger-custom.css 는 @import 로 매 방문마다 fonts.googleapis.com 을 탔다.)
 */

/** 제목 — 둥근 손글씨 느낌. 이 디자인의 인상을 결정한다. */
export const jua = Jua({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

/** 본문 — 한글 가독성용. 긴 글을 읽는 곳이라 무게를 셋 다 쓴다. */
export const gothicA1 = Gothic_A1({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

/** 작은 라벨 — 픽셀체. 날짜·카테고리·시리즈명처럼 짧은 메타 정보에만 쓴다. */
export const dotGothic = DotGothic16({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-label",
  display: "swap",
});
