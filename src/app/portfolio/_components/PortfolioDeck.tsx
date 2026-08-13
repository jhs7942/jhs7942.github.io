"use client";

import { Children, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { portfolioPages } from "../_data/pages";
import { DeckEdge } from "./DeckEdge";
import { DeckOnboarding } from "./DeckOnboarding";
import { DeckTransitionClouds } from "./DeckTransitionClouds";
import { Nav } from "./Nav";

/**
 * 포트폴리오를 위아래 스크롤 대신 섹션별 한 장짜리 페이지로 넘겨 보는 덱.
 *
 * 세로로 이어 붙이는 대신 전체 섹션을 가로로 늘어놓고, 현재 인덱스만큼
 * translateX 로 밀어서 한 장씩 보여준다. 페이지 넘김은 화면 좌우 끝에
 * 마우스를 1초 올려두거나(DeckEdge.tsx) 상단 내비게이션 · 좌우 방향키로 한다.
 *
 * children 은 portfolioPages 와 같은 순서여야 한다 — 인덱스로 짝지어 각 장의
 * id · 라벨을 붙인다(page.tsx 참고). 한 장에 다 안 들어가는 긴 섹션은 그 장
 * 안에서만 세로로 스크롤된다.
 */
export function PortfolioDeck({ githubUrl, children }: { githubUrl: string; children: ReactNode }) {
  const nodes = Children.toArray(children);
  const count = nodes.length;
  const [index, setIndex] = useState(0);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

  // 장이 넘어간 방향(다음=1 · 이전=-1)을 함께 넘어가는 구름 무리(DeckTransitionClouds)에
  // 전달한다. 최신 index를 읽기 위한 ref — goNext/goPrev/goTo가 stale closure 없이
  // "지금 몇 번째인지"를 알아야 하는데, 그렇다고 이 콜백들의 참조를 index가 바뀔
  // 때마다 새로 만들면 DeckEdge의 1초 타이머가 매번 리셋된다. ref는 렌더 중이
  // 아니라 커밋 후(effect)에만 갱신한다 — 렌더 중 ref 쓰기는 React 규칙 위반이다.
  const indexRef = useRef(0);
  useEffect(() => {
    indexRef.current = index;
  }, [index]);
  const [gust, setGust] = useState<{ key: number; direction: 1 | -1 }>({ key: 0, direction: 1 });

  // 셋 다 참조가 고정돼야 한다 — DeckEdge 의 1초 타이머가 매 렌더마다 리셋되면 안 된다.
  const goNext = useCallback(() => {
    if (indexRef.current >= count - 1) return;
    setGust((g) => ({ key: g.key + 1, direction: 1 }));
    setIndex((i) => Math.min(count - 1, i + 1));
  }, [count]);
  const goPrev = useCallback(() => {
    if (indexRef.current <= 0) return;
    setGust((g) => ({ key: g.key + 1, direction: -1 }));
    setIndex((i) => Math.max(0, i - 1));
  }, []);
  const goTo = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(count - 1, next));
      if (clamped === indexRef.current) return;
      setGust((g) => ({ key: g.key + 1, direction: clamped > indexRef.current ? 1 : -1 }));
      setIndex(clamped);
    },
    [count],
  );

  // 새 장에 도착하면 그 장은 늘 맨 위부터 보여준다(이전에 읽다 만 위치가 남지 않게).
  useEffect(() => {
    pageRefs.current[index]?.scrollTo({ top: 0 });
  }, [index]);

  // 덱은 화면에 고정돼 있으므로 문서 자체의 스크롤은 잠근다.
  useEffect(() => {
    const { documentElement: html, body } = document;
    html.classList.add("cloud-deck-lock");
    body.classList.add("cloud-deck-lock");
    return () => {
      html.classList.remove("cloud-deck-lock");
      body.classList.remove("cloud-deck-lock");
    };
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goNext, goPrev]);

  return (
    <>
      <Nav pages={portfolioPages} activeIndex={index} onSelect={goTo} githubUrl={githubUrl} />

      <div className="cloud-deck">
        <div className="cloud-deck-track" style={{ transform: `translate3d(${-index * 100}%, 0, 0)` }}>
          {nodes.map((node, i) => (
            <div
              key={portfolioPages[i]?.id ?? i}
              ref={(el) => {
                pageRefs.current[i] = el;
              }}
              className="cloud-page"
              // 보이지 않는 장은 탭 이동 · 스크린리더에서도 빠지게 한다.
              inert={i !== index ? true : undefined}
            >
              {node}
            </div>
          ))}
        </div>
      </div>

      <DeckEdge side="left" label="이전 페이지" disabled={index === 0} onTrigger={goPrev} />
      <DeckEdge side="right" label="다음 페이지" disabled={index === count - 1} onTrigger={goNext} />

      <DeckTransitionClouds gustKey={gust.key} direction={gust.direction} />
      <DeckOnboarding />
    </>
  );
}
