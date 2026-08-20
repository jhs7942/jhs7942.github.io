/** 손그림 테두리용 SVG 필터. */
export function RoughFilters() {
  return (
    <svg aria-hidden width="0" height="0" style={{ position: "absolute" }}>
      <defs>
        <filter id="rough">
          <feTurbulence type="fractalNoise" baseFrequency="0.014" numOctaves={2} seed={7} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={4} />
        </filter>
        <filter id="rough2">
          <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves={2} seed={3} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={3} />
        </filter>
      </defs>
    </svg>
  );
}
