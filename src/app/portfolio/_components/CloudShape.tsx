type CloudShapeProps = {
  fillId: string;
};

const cloudSilhouette =
  "M92 355C52 355 24 329 24 293C24 258 49 230 84 224C76 181 105 145 147 140C155 100 194 74 237 82C264 42 315 25 359 48C396 15 455 25 479 73C525 59 570 84 585 126C627 130 656 163 656 202C656 233 637 259 609 272C635 307 621 348 587 366C557 382 522 378 494 361C455 395 402 404 353 386C308 412 252 405 216 374C176 391 126 382 92 355Z";

/** 참고 이미지의 적운처럼 여러 덩어리와 청록 음영을 겹친 공용 구름 SVG. */
export function CloudShape({ fillId }: CloudShapeProps) {
  const clipId = `${fillId}-clip`;
  const shadeId = `${fillId}-shade`;

  return (
    <svg
      className="cloud-tl-shape"
      viewBox="0 0 680 430"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={fillId} gradientUnits="userSpaceOnUse" x1="226" y1="48" x2="430" y2="392">
          <stop
            offset="0%"
            stopColor="color-mix(in srgb, var(--surface-cloud) 76%, #fff1bf)"
          />
          <stop offset="52%" stopColor="var(--surface-cloud)" />
          <stop
            offset="100%"
            stopColor="color-mix(in srgb, var(--surface-cloud) 72%, #a7cbd2)"
          />
        </linearGradient>
        <linearGradient id={shadeId} gradientUnits="userSpaceOnUse" x1="72" y1="196" x2="466" y2="390">
          <stop offset="0%" stopColor="#c8dde0" stopOpacity="0.38" />
          <stop offset="100%" stopColor="#6e9eae" stopOpacity="0.72" />
        </linearGradient>
        <clipPath id={clipId}>
          <path d={cloudSilhouette} />
        </clipPath>
      </defs>
      <path
        d={cloudSilhouette}
        fill={`url(#${fillId})`}
        stroke="var(--cloud-border)"
        strokeWidth="2.2"
        vectorEffect="non-scaling-stroke"
      />
      <g clipPath={`url(#${clipId})`}>
        <path
          d="M20 296C68 277 103 286 127 311C160 279 210 281 238 315C277 286 329 294 350 328C390 296 447 301 470 335C513 310 568 316 612 345L624 438H8Z"
          fill={`url(#${shadeId})`}
          opacity="0.72"
        />
        <path
          d="M42 238C61 214 86 210 104 222C124 190 158 179 184 194C204 168 244 164 267 188C224 187 205 211 205 238C172 220 142 235 134 266C112 244 79 246 57 269Z"
          fill="#8eb7c2"
          opacity="0.34"
        />
        <path
          d="M110 162C129 144 151 143 168 151C181 119 211 100 244 104C272 68 322 56 357 75C321 77 295 98 287 128C250 114 217 132 207 165C174 149 143 157 122 181Z"
          fill="#fff7d6"
          opacity="0.42"
        />
        <path
          d="M375 69C408 42 459 51 476 89C513 72 554 94 565 130C530 112 495 126 485 156C464 128 424 122 397 143C397 111 389 89 375 69Z"
          fill="#fff8da"
          opacity="0.34"
        />
      </g>
      <g
        fill="none"
        stroke="color-mix(in srgb, var(--cloud-border) 78%, #3f7180)"
        strokeWidth="1.25"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        opacity="0.56"
      >
        <path d="M84 224C112 217 134 229 143 251" />
        <path d="M147 140C183 133 209 150 217 179" />
        <path d="M237 82C273 78 302 96 311 126" />
        <path d="M359 48C392 55 414 77 421 105" />
        <path d="M479 73C504 84 519 104 521 127" />
        <path d="M585 126C607 142 616 165 610 186" />
        <path d="M216 374C247 355 282 357 306 376" />
        <path d="M353 386C391 362 439 362 469 379" />
      </g>
    </svg>
  );
}
