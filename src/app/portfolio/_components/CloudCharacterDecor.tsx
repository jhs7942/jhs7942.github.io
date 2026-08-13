import type { CloudCharacterSpec } from "../_data/projects";

/**
 * 프로젝트 카드 위에 둥둥 뜨는 장식용 구름 캐릭터. 순수 CSS 도형(그라디언트 +
 * 테두리 삼각형 꼬리)이라 이미지 에셋이 없다 — handoff 마크업 그대로.
 */
export function CloudCharacterDecor({ characters }: { characters: CloudCharacterSpec[] }) {
  return (
    <>
      {characters.map((c, i) => {
        const [center, mid, outer] = c.gradient;
        return (
          <div
            key={i}
            className={`cloud-character${c.variant === "float2" ? " v2" : ""}`}
            style={{
              top: c.top,
              left: c.left,
              right: c.right,
              animationDuration: `${c.durationS}s`,
            }}
          >
            <div
              className="cloud-character-body"
              style={{
                width: c.width,
                height: c.height,
                background: `radial-gradient(circle at 32% 26%, ${center} 0%, ${mid}, ${outer} 82%)`,
              }}
            >
              {/* 풍선 매듭 꼬리 — 아래쪽 테두리만 색을 줘 위를 향한 삼각형을 만든다 */}
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  bottom: -(c.tailHeight - 2),
                  transform: "translateX(-50%)",
                  width: 0,
                  height: 0,
                  borderLeft: `${c.tailSide}px solid transparent`,
                  borderRight: `${c.tailSide}px solid transparent`,
                  borderBottom: `${c.tailHeight}px solid ${outer}`,
                }}
              />
            </div>
            <div className="cloud-character-string" style={{ top: c.stringTop, height: c.stringHeight }} />
          </div>
        );
      })}
    </>
  );
}
