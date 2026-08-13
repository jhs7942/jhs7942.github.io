"use client";

import { useEffect } from "react";

/**
 * 스크롤에 맞춰 구름 베일을 가르고 콘텐츠를 드러내는 애니메이션.
 *
 * handoff 번들(Portfolio.dc.html)의 paint() 를 그대로 옮겼다 — 리액트 상태로
 * 관리하면 매 프레임 전체 섹션이 리렌더되므로, 원본처럼 DOM 스타일을 직접
 * 건드리는 명령형 루프를 그대로 썼다. 렌더링 자체는 CloudVeils.tsx 가 정적으로
 * 그려 둔 [data-veil]/[data-content] 를 찾아 transform·opacity·filter 만 갱신한다.
 *
 * 첫 섹션(히어로)은 스크롤 위치 대신 마운트 후 경과 시간으로 진행도를 계산해,
 * 페이지를 열자마자(스크롤 없이도) 베일이 갈라지며 시작한다.
 */
export function CloudMotion() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".cloud");
    if (!root) return;

    const reduceQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mountAt = Date.now();
    let alive = true;
    let ticking = false;

    function isReduced() {
      return reduceQuery.matches || document.visibilityState === "hidden";
    }

    function paint() {
      if (!root) return;
      const reduce = isReduced();
      const vh = window.innerHeight;
      const sections = root.querySelectorAll<HTMLElement>("[data-cloud-section]");

      sections.forEach((sec, i) => {
        const r = sec.getBoundingClientRect();
        let p: number;
        if (i === 0) {
          p = reduce ? 1 : Math.min(1, (Date.now() - mountAt) / 900);
        } else {
          p = (vh * 0.88 - r.top) / (vh * 0.58);
        }
        p = Math.max(0, Math.min(1, reduce ? 1 : p));
        const prev = Number(sec.dataset.p || 0);
        p = Math.max(prev, p);
        sec.dataset.p = String(p);

        const e = 1 - Math.pow(1 - p, 3);
        const travel = 108;
        const l = sec.querySelector<HTMLElement>('[data-veil="l"]');
        const rt = sec.querySelector<HTMLElement>('[data-veil="r"]');
        if (l) {
          l.style.transform = `translateX(${-travel * e}%)`;
          l.style.opacity = String(1 - e * 0.35);
        }
        if (rt) {
          rt.style.transform = `translateX(${travel * e}%)`;
          rt.style.opacity = String(1 - e * 0.35);
        }
        const c = sec.querySelector<HTMLElement>("[data-content]");
        if (c) {
          c.style.opacity = String(Math.min(1, e * 1.5));
          c.style.transform = `translateY(${(1 - e) * 22}px)`;
          c.style.filter = e > 0.92 ? "none" : `blur(${(1 - e) * 5}px)`;
        }
      });
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        paint();
      });
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("scroll", onScroll, { passive: true, capture: true });
    window.addEventListener("resize", onScroll);
    document.addEventListener("visibilitychange", onScroll);

    paint();
    const step = () => {
      if (!alive) return;
      try {
        paint();
      } catch {
        // 프레임 하나 실패해도 다음 프레임에서 계속 그린다
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    const tick = setInterval(() => {
      if (alive) paint();
    }, 250);

    return () => {
      alive = false;
      clearInterval(tick);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
      document.removeEventListener("visibilitychange", onScroll);
    };
  }, []);

  return null;
}
