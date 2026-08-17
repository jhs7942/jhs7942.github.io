type CloudShapeProps = {
  fillId: string;
};

/** 경험 섹션에서 사용하는 구름 SVG. 히어로 인사말도 같은 실루엣을 공유한다. */
export function CloudShape({ fillId }: CloudShapeProps) {
  return (
    <svg
      className="cloud-tl-shape"
      viewBox="20 20 640 430"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={fillId} gradientUnits="userSpaceOnUse" x1="90" y1="40" x2="670" y2="400">
          <stop offset="0%" stopColor="var(--surface-cloud)" />
          <stop offset="100%" stopColor="var(--surface-cloud)" />
        </linearGradient>
      </defs>
      <path
        d="M116 353C68 353 31 321 31 279C31 240 61 208 103 205C99 150 145 111 199 119C221 74 269 51 318 64C348 27 395 14 439 32C479 48 504 80 512 116C557 93 603 117 618 157C634 200 609 238 570 250C599 287 585 336 548 356C514 374 478 365 454 350C413 390 348 394 300 369C267 400 206 400 174 365C155 356 136 353 116 353Z"
        fill={`url(#${fillId})`}
        stroke="var(--cloud-border)"
        strokeWidth="3"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
