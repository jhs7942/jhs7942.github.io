import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // GitHub Pages는 정적 파일만 서빙한다. 서버가 없으므로 빌드 시점에
  // 모든 페이지를 HTML로 뽑아낸다. SSR·ISR·API Routes·미들웨어는 쓸 수 없다.
  output: "export",

  // 이미지 최적화는 런타임 서버가 하는 일이라 static export에서 동작하지 않는다.
  images: { unoptimized: true },

  // /posts/foo → out/posts/foo/index.html 로 뽑는다.
  // GitHub Pages가 디렉터리 요청에 index.html을 돌려주므로 새로고침 404가 안 난다.
  trailingSlash: true,
};

export default nextConfig;
