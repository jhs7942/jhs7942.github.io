"use client";

import { usePathname } from "next/navigation";

/**
 * /portfolio 에서는 사이트 공용 헤더 · 푸터를 숨긴다.
 *
 * "구름" 테마는 전면 그라디언트 히어로 위에 자체 떠다니는 Nav를 쓰고
 * (portfolio/_components/Nav.tsx), 페이지 맨 아래도 전용 Footer를 쓴다
 * (portfolio/_components/Footer.tsx) — sage 배경의 공용 SiteFooter나
 * 반투명 민트 SiteHeader가 같이 뜨면 두 헤더 · 두 푸터가 겹친다.
 *
 * layout.tsx(서버 컴포넌트)는 usePathname을 쓸 수 없어, 이 판단만 클라이언트
 * 컴포넌트로 떼어 SiteHeader/SiteFooter를 감싼다.
 */
export function RouteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/portfolio")) return null;
  return <>{children}</>;
}
