import { HydrationCheck } from "./_components/HydrationCheck";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-full max-w-2xl flex-col justify-center gap-8 px-6 py-24">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">jhs7942</h1>
        <p className="mt-2 text-neutral-500">기술 블로그 이전 작업 중입니다.</p>
      </div>

      {/* 배포 스모크 테스트 — 세 줄이 모두 통과해야 다음 단계로 간다. */}
      <div className="space-y-3 rounded-lg border border-neutral-200 p-5 dark:border-neutral-800">
        <p className="font-mono text-sm">
          <span className="text-neutral-500">HTML 렌더 </span>
          <span className="text-emerald-500">확인됨</span>
        </p>

        <p className="font-mono text-sm">
          <span className="text-neutral-500">Tailwind CSS </span>
          {/* 이 점이 깜빡이면 _next/static/css 가 로드된 것이다. */}
          <span className="inline-block size-2 animate-pulse rounded-full bg-emerald-500 align-middle" />
        </p>

        <HydrationCheck />
      </div>
    </main>
  );
}
