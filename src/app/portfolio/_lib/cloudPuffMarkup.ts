/**
 * CloudPuff 모양(세이지 그림자 + 크림 하이라이트 두 톤 뭉게구름)의 SVG 내부
 * 마크업을 문자열로 공유한다. CloudPuff.tsx(React, 구름 베일용)와
 * CloudCursorTrail.tsx(마우스 커서를 따라다니는 순수 DOM 구현, 매 프레임
 * React를 거치면 비용이 크다)가 같은 모양을 두 군데서 따로 유지하지 않도록
 * 한 군데에서만 정의한다.
 */
export const CLOUD_PUFF_VIEWBOX = "0 0 120 80";

export const CLOUD_PUFF_MARKUP = `
  <g fill="#dce8e1">
    <ellipse cx="59" cy="60" rx="54" ry="18" />
    <circle cx="28" cy="48" r="24" />
    <circle cx="44" cy="54" r="20" />
    <circle cx="58" cy="40" r="30" />
    <circle cx="90" cy="46" r="22" />
  </g>
  <g fill="#fbfbf7">
    <ellipse cx="59" cy="54" rx="51" ry="15" />
    <circle cx="28" cy="43" r="21" />
    <circle cx="44" cy="48" r="17" />
    <circle cx="58" cy="35" r="27" />
    <circle cx="90" cy="41" r="19" />
  </g>
`;
