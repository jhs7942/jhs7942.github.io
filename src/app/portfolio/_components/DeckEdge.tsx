"use client";

import { useEffect, useState } from "react";
import { DeckEdgeButton } from "./DeckEdgeButton";

/** 마우스를 올린 채 이만큼 기다리면 자동으로 넘어간다 — portfolio.css 의 cloudEdgeRing 길이와 맞춰야 한다 */
const DWELL_MS = 1500;

/**
 * 화면 좌우 끝의 이동 영역.
 *
 * 마우스를 올리면(=무장) 원형 버튼이 나타나 1초짜리 링이 돌고, 다 돌면 자동으로
 * 이동한다. 기다리지 않고 눌러도 즉시 이동한다. 마우스를 떼면 취소된다.
 * 이동 후에도 마우스가 그대로 얹혀 있으면 다시 무장해 1초마다 계속 넘어간다.
 *
 * 터치(coarse pointer)는 hover 가 없으므로 무장 자체를 하지 않는다 — 대신
 * portfolio.css 가 버튼을 항상 보이게 해서 탭 한 번으로 이동하게 만든다.
 *
 * 무장 여부를 따로 저장하지 않고 "마우스가 올라와 있는가 && 갈 곳이 있는가"로
 * 매번 계산한다. 끝 페이지에 닿아 비활성이 되면 그 순간 대기가 저절로 풀리고,
 * 남아 있던 무장 상태가 나중에 되살아나 엉뚱하게 넘어가는 일도 없다.
 *
 * onTrigger 는 참조가 고정돼야 한다(useCallback + 함수형 setState). 매 렌더마다
 * 새 함수가 들어오면 아래 타이머 이펙트가 재실행돼 1초가 영원히 리셋된다.
 */
export function DeckEdge({
  side,
  disabled,
  label,
  onTrigger,
}: {
  side: "left" | "right";
  disabled: boolean;
  label: string;
  onTrigger: () => void;
}) {
  const [hovering, setHovering] = useState(false);
  // 몇 번째 대기인지 — 값이 바뀔 때마다 타이머와 진행 링이 처음부터 다시 시작한다.
  const [cycle, setCycle] = useState(0);
  const armed = hovering && !disabled;

  useEffect(() => {
    if (!armed) return;
    const id = window.setTimeout(() => {
      onTrigger();
      // 마우스가 아직 얹혀 있다면 계속 넘어가도록 다음 대기를 건다.
      setCycle((c) => c + 1);
    }, DWELL_MS);
    return () => window.clearTimeout(id);
  }, [armed, cycle, onTrigger]);

  return (
    <button
      type="button"
      className={`cloud-edge ${side}`}
      aria-label={label}
      disabled={disabled}
      onPointerEnter={(e) => {
        if (e.pointerType !== "mouse") return;
        setHovering(true);
        setCycle((c) => c + 1);
      }}
      onPointerLeave={() => setHovering(false)}
      onClick={() => {
        onTrigger();
        setCycle((c) => c + 1);
      }}
    >
      <DeckEdgeButton side={side} armNonce={armed ? cycle + 1 : 0} />
    </button>
  );
}
