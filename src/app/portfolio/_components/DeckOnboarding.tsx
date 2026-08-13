"use client";

import { useEffect, useState } from "react";
import { DeckEdgeButton } from "./DeckEdgeButton";

/** 안내를 이미 봤는지 기억하는 키 — 다시 보고 싶으면 브라우저 저장소에서 이 값을 지우면 된다 */
const SEEN_KEY = "portfolio-deck-guide-seen";

/**
 * 시연 단계. 각 단계의 지속 시간은 STEPS 에 있고, 합이 곧 전체 안내 길이다.
 * off  — 아무것도 안 그림(안내 종료 · 이미 본 방문자)
 * in   — 토스트가 올라오고 가상 커서가 화면 가운데에 나타남
 * move — 가상 커서가 오른쪽 끝으로 이동
 * dwell— 오른쪽 이동 버튼이 나타나 1초 링이 돎(실제 이동은 하지 않음)
 * out  — 토스트 · 커서가 사라짐
 */
type Phase = "off" | "in" | "move" | "dwell" | "out";

const STEPS: { phase: Phase; ms: number }[] = [
  { phase: "in", ms: 500 },
  { phase: "move", ms: 1200 },
  // 진행 링(1초) + 다 찼을 때 잠깐 머무는 여운
  { phase: "dwell", ms: 1400 },
  { phase: "out", ms: 600 },
];

/**
 * 첫 방문자에게 좌우 이동 방식을 알려주는 안내.
 *
 * 토스트로 조작법을 적어 주고, 동시에 가상 커서가 오른쪽 끝으로 움직여
 * 이동 버튼이 나타나고 링이 차오르는 과정을 그대로 재현한다. 시연일 뿐이라
 * 실제로 페이지를 넘기지는 않는다 — 사용자가 직접 해 보게 남겨 둔다.
 *
 * 사용자가 먼저 조작하면(클릭 · 키 입력) 즉시 접고, 본 적이 있거나
 * prefers-reduced-motion 이면 아예 시작하지 않는다.
 */
export function DeckOnboarding() {
  const [phase, setPhase] = useState<Phase>("off");

  useEffect(() => {
    let seen = false;
    try {
      seen = window.localStorage.getItem(SEEN_KEY) === "1";
    } catch {
      // 저장소를 못 쓰는 환경(사생활 보호 모드 등)이면 그냥 안내를 띄운다
    }
    if (seen) return;

    function markSeen() {
      try {
        window.localStorage.setItem(SEEN_KEY, "1");
      } catch {
        // 저장 실패는 무시 — 다음에 한 번 더 보일 뿐이다
      }
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      markSeen();
      return;
    }

    const timers: number[] = [];
    let elapsed = 0;
    for (const step of STEPS) {
      timers.push(window.setTimeout(() => setPhase(step.phase), elapsed));
      elapsed += step.ms;
    }
    timers.push(
      window.setTimeout(() => {
        setPhase("off");
        markSeen();
      }, elapsed),
    );

    // 사용자가 직접 움직이기 시작하면 안내는 그 자리에서 접는다.
    function skip() {
      timers.forEach((id) => window.clearTimeout(id));
      setPhase("off");
      markSeen();
    }
    window.addEventListener("pointerdown", skip);
    window.addEventListener("keydown", skip);

    return () => {
      timers.forEach((id) => window.clearTimeout(id));
      window.removeEventListener("pointerdown", skip);
      window.removeEventListener("keydown", skip);
    };
  }, []);

  if (phase === "off") return null;

  const atEdge = phase === "move" || phase === "dwell" || phase === "out";

  return (
    <div className="cloud-guide" aria-hidden>
      <p className={`cloud-guide-toast${phase === "out" ? " out" : ""}`}>
        화면 <b>왼쪽 · 오른쪽 끝</b>에 마우스를 올리면 페이지가 넘어갑니다.
        <span>1초를 기다리거나, 나타난 버튼을 바로 눌러도 됩니다.</span>
      </p>

      <span className={`cloud-guide-slot${phase === "out" ? " out" : ""}`}>
        <DeckEdgeButton side="right" armNonce={phase === "dwell" || phase === "out" ? 1 : 0} />
      </span>

      <svg
        className={`cloud-guide-ghost${atEdge ? " at-edge" : ""}${phase === "out" ? " out" : ""}`}
        viewBox="0 0 24 24"
        focusable="false"
      >
        <path d="M5 2 L5 21 L10 16.4 L13.2 23 L16.1 21.6 L13 15.3 L19.2 14.9 Z" />
      </svg>
    </div>
  );
}
