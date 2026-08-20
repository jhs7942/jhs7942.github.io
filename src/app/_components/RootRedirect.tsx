"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** 정적 내보내기 환경에서 이전 주소와 404를 루트 포트폴리오로 보낸다. */
export function RootRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/");
  }, [router]);

  return null;
}
