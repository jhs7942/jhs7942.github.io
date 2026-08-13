import Link from "next/link";

type NavItem = { href: string; label: string };

/**
 * 사이트 공용 헤더 nav.
 *
 * 예전엔 /portfolio 에서 이 nav를 5개 섹션 앵커로 바꿔치기했지만, "구름" 테마부터
 * 포트폴리오는 자체 Nav(Nav.tsx)를 쓰고 공용 헤더 자체를 숨긴다(RouteChrome.tsx).
 * 그래서 이 컴포넌트는 이제 어느 라우트에서든 같은 nav만 그린다.
 */
export function HeaderNav({ items }: { items: NavItem[] }) {
  return (
    <>
      {items.map((item) => (
        <Link key={item.href} href={item.href} className="nav-link whitespace-nowrap text-[15.5px] font-medium text-ink no-underline">
          {item.label}
        </Link>
      ))}
    </>
  );
}
