import { CLOUD_PUFF_MARKUP, CLOUD_PUFF_VIEWBOX } from "../_lib/cloudPuffMarkup";

/**
 * 통통한 카툰 구름 한 덩이 — 참고 이미지처럼 여러 원이 겹친 뭉게구름
 * 실루엣에 흰색 표면 + 옅은 청록 그림자 두 톤을 겹쳐 입체감을 낸다.
 * 실제 모양은 cloudPuffMarkup.ts 에 한 군데만 정의돼 있다 — CloudCursorTrail.tsx
 * 도 같은 데이터를 쓴다.
 *
 * DeckTransitionClouds.tsx가 이 아이콘을 전환 구름 위치와 크기에 맞춰 채워 넣는다.
 */
export function CloudPuff() {
  return (
    <svg
      viewBox={CLOUD_PUFF_VIEWBOX}
      preserveAspectRatio="none"
      aria-hidden
      focusable="false"
      dangerouslySetInnerHTML={{ __html: CLOUD_PUFF_MARKUP }}
    />
  );
}
