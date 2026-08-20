/**
 * CloudPuff 모양(크림빛 상단 + 청록 음영의 카툰 적운)의 SVG 내부
 * 마크업을 문자열로 공유한다. CloudPuff.tsx(React, 구름 베일용)와
 * CloudCursorTrail.tsx(마우스 커서를 따라다니는 순수 DOM 구현, 매 프레임
 * React를 거치면 비용이 크다)가 같은 모양을 두 군데서 따로 유지하지 않도록
 * 한 군데에서만 정의한다.
 */
export const CLOUD_PUFF_VIEWBOX = "0 0 120 80";

export const CLOUD_PUFF_MARKUP = `
  <path
    d="M13 62C6 61 2 56 3 49C4 43 9 39 16 39C15 29 23 22 33 24C37 15 48 11 57 15C65 6 82 9 87 20C97 17 107 24 108 34C116 36 120 42 118 49C117 55 112 59 106 60C103 69 93 73 84 69C76 77 62 77 54 71C45 77 32 74 28 68C22 68 17 66 13 62Z"
    fill="color-mix(in srgb, var(--surface-cloud) 74%, #fff0bd)"
    stroke="color-mix(in srgb, var(--cloud-border) 76%, #477989)"
    stroke-width="1.2"
    vector-effect="non-scaling-stroke"
  />
  <path
    d="M4 50C14 45 23 48 28 56C36 49 48 51 53 60C62 53 75 54 81 62C91 56 104 58 112 65L109 80H5Z"
    fill="color-mix(in srgb, var(--surface-cloud) 54%, #79a9b7)"
    opacity="0.72"
  />
  <path
    d="M21 39C27 33 34 33 39 36C43 25 55 19 65 23C72 14 85 15 91 23C79 20 70 27 68 37C58 32 48 37 46 46C38 40 29 43 25 49Z"
    fill="#fff8d8"
    opacity="0.42"
  />
  <g fill="none" stroke="color-mix(in srgb, var(--cloud-border) 72%, #477989)" stroke-width="0.85" stroke-linecap="round" vector-effect="non-scaling-stroke" opacity="0.52">
    <path d="M16 39C23 38 28 42 30 47" />
    <path d="M33 24C41 23 47 27 49 33" />
    <path d="M57 15C66 15 72 20 74 27" />
    <path d="M87 20C94 22 98 27 98 34" />
  </g>
`;
