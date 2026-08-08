"use client";

import { useEffect } from "react";

/**
 * 목차의 현재 위치 표시.
 *
 * 스크롤 이벤트로 매 프레임 getBoundingClientRect 를 부르면 강제 리플로가 난다.
 * IntersectionObserver 는 브라우저가 교차 판정을 대신 해주므로 그럴 일이 없다.
 *
 * rootMargin 으로 판정선을 화면 위쪽 88px 에 두었다. 그냥 뷰포트 전체를 쓰면
 * 섹션이 여러 개 동시에 걸려서 현재 항목이 계속 흔들린다.
 *
 * 상태는 DOM 의 data-active 로만 바꾼다. 리액트 상태로 들고 있으면 스크롤할 때마다
 * 목차 전체가 리렌더된다 -- 색 하나 바꾸자고 치를 비용이 아니다.
 */
export function TocScrollSpy({ ids }: { ids: string[] }) {
  useEffect(() => {
    if (ids.length === 0) return;

    const items = new Map<string, HTMLElement>();
    for (const id of ids) {
      const item = document.querySelector<HTMLElement>(`[data-toc-for="${CSS.escape(id)}"]`);
      if (item) items.set(id, item);
    }

    const headings = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (headings.length === 0) return;

    const visible = new Set<string>();
    let current: string | null = null;

    const paint = () => {
      // 화면에 걸친 것 중 문서 순서상 가장 위를 현재로 본다.
      const next = ids.find((id) => visible.has(id)) ?? current;
      if (next === current) return;
      if (current) items.get(current)?.setAttribute("data-active", "false");
      if (next) items.get(next)?.setAttribute("data-active", "true");
      current = next;
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.id;
          if (entry.isIntersecting) visible.add(id);
          else visible.delete(id);
        }
        paint();
      },
      { rootMargin: "-88px 0px -70% 0px", threshold: 0 },
    );

    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [ids]);

  return null;
}
