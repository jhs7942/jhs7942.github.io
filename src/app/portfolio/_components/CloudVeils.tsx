export type CloudBlob = {
  width: number;
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
};

/**
 * 섹션을 가리고 있다가 스크롤에 맞춰 좌우로 갈라지는 구름 베일.
 *
 * 뼈대(둥근 사각형 + 3개 원)는 모든 섹션이 같고 원의 위치·크기만 섹션마다
 * 다르다 — CloudMotion.tsx 가 [data-veil] 을 찾아 transform/opacity 를 매 프레임
 * 갱신하므로, 이 컴포넌트는 정적 마크업만 그린다.
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
              paddingBottom: `${b.width}%`,
            }}
          />
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
              paddingBottom: `${b.width}%`,
            }}
          />
        ))}
      </div>
    </>
  );
}
