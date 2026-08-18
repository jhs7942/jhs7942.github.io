"use client";

import { useEffect, useRef } from "react";
import { CLOUD_PUFF_MARKUP, CLOUD_PUFF_VIEWBOX } from "../_lib/cloudPuffMarkup";

/** 이 거리(px)만큼 포인터가 움직여야 다음 구름을 하나 더 낳는다 — 작을수록 촘촘히 겹쳐 한 줄로 이어져 보인다 */
const SPAWN_DISTANCE = 9;
/** 나타났다 사라지는 데 걸리는 시간 — portfolio.css의 cloudTrailPuff 키프레임과 맞춰야 한다 */
const PUFF_LIFETIME_MS = 750;

/**
 * 마우스 포인터가 움직일 때마다 옅은 구름이 촘촘히 태어났다가 사라지는
 * 커서 트레일. 간격을 좁게 잡아 서로 겹치게 해서 낱개 뭉치가 아니라 한 줄로
 * 이어지는 연한 리본처럼 보이게 한다(정확한 연결선을 그리는 대신, 구름
 * 모양을 유지한 채 밀도로 "이어짐"을 표현하는 쪽을 택했다).
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
    if (reduceQuery.matches || !finePointerQuery.matches) return;

    const layer = layerRef.current;
    if (!layer) return;

    let lastX = 0;
    let lastY = 0;
    let hasLast = false;
    const pendingTimeouts = new Set<number>();

    function spawnPuff(x: number, y: number) {
      const size = 15 + Math.random() * 7;
      const height = size * (80 / 120);
      const puff = document.createElement("div");
      puff.className = "cloud-trail-puff";
      puff.style.left = `${x}px`;
      puff.style.top = `${y}px`;
      puff.style.width = `${size}px`;
      puff.style.height = `${height}px`;
      puff.style.marginLeft = `${-size / 2}px`;
      puff.style.marginTop = `${-height / 2}px`;
      puff.innerHTML = `<svg viewBox="${CLOUD_PUFF_VIEWBOX}" preserveAspectRatio="none">${CLOUD_PUFF_MARKUP}</svg>`;
      layer!.appendChild(puff);

      const timeoutId = window.setTimeout(() => {
        puff.remove();
        pendingTimeouts.delete(timeoutId);
      }, PUFF_LIFETIME_MS);
      pendingTimeouts.add(timeoutId);
    }

    function onPointerMove(e: PointerEvent) {
      if (e.pointerType !== "mouse" || reduceQuery.matches) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      if (hasLast && Math.hypot(dx, dy) < SPAWN_DISTANCE) return;
      lastX = e.clientX;
      lastY = e.clientY;
      hasLast = true;
      spawnPuff(e.clientX, e.clientY);
    }

    window.addEventListener("pointermove", onPointerMove, { passive: true });

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      pendingTimeouts.forEach((id) => window.clearTimeout(id));
      layer.replaceChildren();
    };
  }, []);

  return <div ref={layerRef} className="cloud-trail-layer" aria-hidden />;
}
