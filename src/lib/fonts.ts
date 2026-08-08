import { Noto_Sans_KR } from "next/font/google";

/**
 * 라이브 테마(theme/custom-theme.xml)가 쓰는 폰트는 Noto Sans KR 하나다.
 * 제목·본문·라벨을 굵기로만 구분한다.
 *
 * preload: false 가 핵심이다. 한글 폰트는 unicode-range 로 수십 개 청크로
 * 쪼개져 있는데, next/font 는 어떤 글자를 쓸지 알 수 없으니 preload 를 켜면
 * 전부 받아둔다(실측 218파일·1,890KB). 끄면 브라우저가 필요한 청크만 가져간다.
 */
export const notoSansKR = Noto_Sans_KR({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  preload: false,
});
