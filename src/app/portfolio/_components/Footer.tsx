import { Button } from "@/components/ui/button";
import { profile } from "../_data/profile";
import { CopyEmailButton } from "./CopyEmailButton";

/**
 * 이 페이지 전용 푸터. 사이트 공용 SiteFooter(sage 배경)는 /portfolio 에서
 * RouteChrome 이 숨긴다 — 구름 배경 위에 있는 이 페이지엔 어울리지 않는다.
 */
export function Footer() {
  return (
    <footer className="cloud-footer">
      <p className="cloud-footer-lead">배우고 만든 것을 빠짐없이 남기는 개발 기록.</p>
      <div className="cloud-footer-links">
        <CopyEmailButton email={profile.email} variant="hand-outline" size="hand" />
        <Button
          variant="hand-solid"
          size="hand"
          render={<a href={profile.blogUrl} target="_blank" rel="noopener" />}
        >
          BLOG
        </Button>
        <Button variant="hand-outline" size="hand" render={<a href="#top" />}>
          맨 위로 ↑
        </Button>
      </div>
      <p className="cloud-footer-copy">© 2026 JHS7942</p>
    </footer>
  );
}
