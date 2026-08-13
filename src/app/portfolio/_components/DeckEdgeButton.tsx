/**
 * 화면 좌우 끝에 뜨는 원형 이동 버튼 — 바깥 테두리를 따라 1초짜리 진행 링이
 * 채워지고, 다 채워지면 자동으로 페이지가 넘어간다.
 *
 * 순수 표시용이라 타이머를 갖지 않는다. 실제 대기 · 이동은 DeckEdge.tsx 가,
 * 첫 방문 안내용 시연은 DeckOnboarding.tsx 가 각각 armNonce 만 넘겨서 쓴다.
 *
 * armNonce 는 "몇 번째 무장인지"를 뜻한다 — 0이면 비무장(버튼만 흐리게),
 * 1 이상이면 무장 상태다. 값이 바뀔 때마다 진행 링 <circle> 이 remount 돼
 * CSS 애니메이션이 처음부터 다시 돈다(같은 값이면 재시작되지 않는다).
 */
export function DeckEdgeButton({ side, armNonce }: { side: "left" | "right"; armNonce: number }) {
  const armed = armNonce > 0;

  return (
    <span className={`cloud-edge-btn${armed ? " armed" : ""}`}>
      <svg className="cloud-edge-ring" viewBox="0 0 60 60" aria-hidden focusable="false">
        <circle className="cloud-edge-ring-track" cx="30" cy="30" r="26" />
        {armed && <circle key={armNonce} className="cloud-edge-ring-fill" cx="30" cy="30" r="26" />}
      </svg>
      <svg className="cloud-edge-arrow" viewBox="0 0 24 24" aria-hidden focusable="false">
        <path d={side === "left" ? "M15 5 L8 12 L15 19" : "M9 5 L16 12 L9 19"} />
      </svg>
    </span>
  );
}
