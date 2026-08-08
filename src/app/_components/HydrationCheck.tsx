"use client";

import { useEffect, useState } from "react";

/**
 * 배포 스모크 테스트용 클라이언트 아일랜드.
 *
 * 이 문구가 "확인됨"으로 바뀌면 _next/ 아래 JS 번들이 정상적으로 로드되고
 * 하이드레이션까지 끝났다는 뜻이다. GitHub Pages에서 Jekyll이 _next/를
 * 삼켜버리면 여기가 "대기 중"에서 멈춘다.
 */
export function HydrationCheck() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  return (
    <p className="font-mono text-sm">
      <span className="text-neutral-500">JS 번들 · 하이드레이션 </span>
      <span className={hydrated ? "text-emerald-500" : "text-amber-500"}>
        {hydrated ? "확인됨" : "대기 중"}
      </span>
    </p>
  );
}
