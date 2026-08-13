/** 화면 전체에 고정된 채 천천히 좌우로 떠다니는 옅은 구름 3장 — 순수 장식. */
export function CloudDriftLayer() {
  return (
    <div className="cloud-drift-layer" aria-hidden>
      <div
        className="cloud-drift a"
        style={{
          left: "-10%",
          top: "12%",
          width: "46vw",
          height: "16vh",
          background:
            "radial-gradient(closest-side, rgba(251,251,247,.55), transparent), radial-gradient(closest-side at 30% 40%, rgba(251,251,247,.5), transparent)",
        }}
      />
      <div
        className="cloud-drift b"
        style={{
          right: "-8%",
          top: "46%",
          width: "38vw",
          height: "13vh",
          background: "radial-gradient(closest-side, rgba(251,251,247,.42), transparent)",
        }}
      />
      <div
        className="cloud-drift c"
        style={{
          left: "20%",
          bottom: "6%",
          width: "52vw",
          height: "15vh",
          background: "radial-gradient(closest-side, rgba(251,251,247,.35), transparent)",
        }}
      />
    </div>
  );
}
