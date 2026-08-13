import type { CSSProperties } from "react";
import { CloudPuff } from "./CloudPuff";

/**
 * 세로 위치(%) · 너비(px) · 시작 지연(ms) · 전체 재생 시간(ms)에 더해, 손으로
 * 흩어 놓은 회전(rot) · 상하 흔들림(bob) · 최고 속도에서 늘어나는 정도(stretch)
 * — 이 세 값이 CSS 쪽 keyframe(cloudGustNext/Prev)의 --gust-rot/--gust-bob/
 * --gust-stretch 커스텀 프로퍼티로 들어가 구름마다 다르게 흔들리며 지나가게
 * 만든다. 크고 가까운 구름일수록 duration을 짧게(=빠르게), 작고 먼 구름일수록
 * 길게 잡아 층이 지는 듯한 원근감을 준다.
 */
const GUST_LAYOUT: {
  top: number;
  width: number;
  delay: number;
  duration: number;
  rot: number;
  bob: number;
  stretch: number;
}[] = [
  { top: 14, width: 130, delay: 0, duration: 560, rot: 14, bob: -16, stretch: 1.45 },
  { top: 70, width: 92, delay: 60, duration: 640, rot: -10, bob: 20, stretch: 1.3 },
  { top: 40, width: 162, delay: 30, duration: 520, rot: 8, bob: -8, stretch: 1.55 },
  { top: 86, width: 76, delay: 110, duration: 700, rot: -16, bob: 12, stretch: 1.25 },
  { top: 4, width: 64, delay: 150, duration: 660, rot: 12, bob: -22, stretch: 1.2 },
  { top: 56, width: 100, delay: 80, duration: 600, rot: -8, bob: 6, stretch: 1.4 },
];

/**
 * 장이 넘어갈 때 이동 방향으로 함께 흘러가는 구름 무리.
 *
 * key(=gustKey)가 바뀔 때마다 전체가 remount 되어 CSS 애니메이션이 처음부터
 * 다시 재생된다 — 스킬 탭 전환의 skillIn 리마운트 트릭과 같은 방식이다.
 * gustKey === 0(최초 마운트)에는 아무것도 그리지 않는다 — 페이지를 열자마자
 * 구름이 훅 지나가면 안내(DeckOnboarding)와 겹쳐 산만하다.
 */
export function DeckTransitionClouds({ gustKey, direction }: { gustKey: number; direction: 1 | -1 }) {
  if (gustKey === 0) return null;

  return (
    <div key={gustKey} className={`cloud-gust-layer${direction === -1 ? " prev" : ""}`} aria-hidden>
      {GUST_LAYOUT.map((spec, i) => (
        <span
          key={i}
          className="cloud-gust-puff"
          style={
            {
              top: `${spec.top}%`,
              width: `${spec.width}px`,
              animationDelay: `${spec.delay}ms`,
              animationDuration: `${spec.duration}ms`,
              "--gust-rot": `${spec.rot}deg`,
              "--gust-bob": `${spec.bob}px`,
              "--gust-stretch": spec.stretch,
            } as CSSProperties
          }
        >
          <CloudPuff />
        </span>
      ))}
    </div>
  );
}
