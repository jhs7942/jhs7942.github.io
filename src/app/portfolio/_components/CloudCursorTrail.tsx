"use client";

import { useEffect, useRef } from "react";

/** 이동 경로가 안개처럼 사라지는 데 걸리는 시간 — portfolio.css와 맞춘다. */
const TRAIL_LIFETIME_MS = 1100;
/** 클릭 구름이 사라질 때까지 걸리는 시간 */
const CLICK_DONUT_LIFETIME_MS = 2200;

/**
 * 마우스 포인터의 이전·현재 좌표를 옅은 CSS 그라데이션 구간으로 연결하는
 * 커서 트레일. 둥근 구간들이 겹치며 하나의 부드러운 안개 리본처럼 보인다.
 *
 * 매 이벤트마다 React를 거치면 비용이 크므로 React 상태 대신 순수 DOM 조작으로
 * 구현한다 — 이 컴포넌트는 오버레이
 * 컨테이너 하나만 그리고, 그 안의 구름들은 직접 넣고 뺀다.
 */
export function CloudCursorTrail() {
  const layerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const reduceQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointerQuery = window.matchMedia("(pointer: fine)");
    if (reduceQuery.matches) return;

    const layer = layerRef.current;
    if (!layer) return;

    let lastX = 0;
    let lastY = 0;
    let hasLast = false;
    const pendingTimeouts = new Set<number>();

    function spawnTrailSegment(
      fromX: number,
      fromY: number,
      toX: number,
      toY: number,
    ) {
      const dx = toX - fromX;
      const dy = toY - fromY;
      const distance = Math.hypot(dx, dy);
      const width = distance + 18;
      const height = 17 + Math.random() * 4;
      const segment = document.createElement("div");
      segment.className = "cloud-trail-segment";
      segment.style.left = `${(fromX + toX) / 2}px`;
      segment.style.top = `${(fromY + toY) / 2}px`;
      segment.style.width = `${width}px`;
      segment.style.height = `${height}px`;
      segment.style.marginLeft = `${-width / 2}px`;
      segment.style.marginTop = `${-height / 2}px`;
      segment.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
      layer!.appendChild(segment);

      const timeoutId = window.setTimeout(() => {
        segment.remove();
        pendingTimeouts.delete(timeoutId);
      }, TRAIL_LIFETIME_MS);
      pendingTimeouts.add(timeoutId);
    }

    function spawnClickDonut(x: number, y: number) {
      const size = 46 + Math.random() * 10;
      const donut = document.createElement("div");
      donut.className = "cloud-click-donut";
      donut.style.left = `${x}px`;
      donut.style.top = `${y}px`;
      donut.style.width = `${size}px`;
      donut.style.height = `${size}px`;
      donut.style.marginLeft = `${-size / 2}px`;
      donut.style.marginTop = `${-size / 2}px`;
      layer!.appendChild(donut);

      const timeoutId = window.setTimeout(() => {
        donut.remove();
        pendingTimeouts.delete(timeoutId);
      }, CLICK_DONUT_LIFETIME_MS);
      pendingTimeouts.add(timeoutId);
    }

    function onPointerMove(e: PointerEvent) {
      if (e.pointerType !== "mouse" || reduceQuery.matches) return;

      if (!hasLast) {
        lastX = e.clientX;
        lastY = e.clientY;
        hasLast = true;
        return;
      }

      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      const distance = Math.hypot(dx, dy);
      if (distance < 2) return;

      spawnTrailSegment(lastX, lastY, e.clientX, e.clientY);
      lastX = e.clientX;
      lastY = e.clientY;
    }

    function resetTrail() {
      hasLast = false;
    }

    if (finePointerQuery.matches) {
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      document.documentElement.addEventListener("pointerleave", resetTrail);
    }
    function onClick(event: MouseEvent) {
      spawnClickDonut(event.clientX, event.clientY);
    }
    window.addEventListener("click", onClick);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      document.documentElement.removeEventListener("pointerleave", resetTrail);
      window.removeEventListener("click", onClick);
      pendingTimeouts.forEach((id) => window.clearTimeout(id));
      layer.replaceChildren();
    };
  }, []);

  return <div ref={layerRef} className="cloud-trail-layer" aria-hidden />;
}
