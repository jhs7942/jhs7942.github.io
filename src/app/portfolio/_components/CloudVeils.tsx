import { CloudPuff } from "./CloudPuff";

export type CloudBlob = {
  width: number;
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
};

/** CloudPuff.tsx 의 viewBox(120 x 80) 비율 — width%에 곱해 올바른 padding-bottom%을 만든다 */
const PUFF_RATIO = 80 / 120;

/**
 * 섹션을 가리고 있다가 스크롤에 맞춰 좌우로 갈라지는 구름 베일.
 *
 * 뼈대(둥근 사각형 + 여러 구름 뭉치)는 모든 섹션이 같고 구름의 위치·크기만
 * 섹션마다 다르다 — CloudMotion.tsx 가 [data-veil] 을 찾아 transform/opacity 를
 * 매 프레임 갱신하므로, 이 컴포넌트는 정적 마크업만 그린다.
 */
export function CloudVeils({ left, right }: { left: CloudBlob[]; right: CloudBlob[] }) {
  return (
    <>
      <div data-veil="l" className="cloud-veil l">
        <div className="cloud-veil-base" />
        {left.map((b, i) => (
          <div
            key={i}
            className="cloud-veil-blob"
            style={{
              top: b.top !== undefined ? `${b.top}%` : undefined,
              bottom: b.bottom !== undefined ? `${b.bottom}%` : undefined,
              left: b.left !== undefined ? `${b.left}%` : undefined,
              right: b.right !== undefined ? `${b.right}%` : undefined,
              width: `${b.width}%`,
              paddingBottom: `${b.width * PUFF_RATIO}%`,
            }}
          >
            <CloudPuff />
          </div>
        ))}
      </div>
      <div data-veil="r" className="cloud-veil r">
        <div className="cloud-veil-base" />
        {right.map((b, i) => (
          <div
            key={i}
            className="cloud-veil-blob"
            style={{
              top: b.top !== undefined ? `${b.top}%` : undefined,
              bottom: b.bottom !== undefined ? `${b.bottom}%` : undefined,
              left: b.left !== undefined ? `${b.left}%` : undefined,
              right: b.right !== undefined ? `${b.right}%` : undefined,
              width: `${b.width}%`,
              paddingBottom: `${b.width * PUFF_RATIO}%`,
            }}
          >
            <CloudPuff />
          </div>
        ))}
      </div>
    </>
  );
}
