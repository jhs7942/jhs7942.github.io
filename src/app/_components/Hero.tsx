import { getAllPosts } from "@/lib/content/posts";

/**
 * 발행 잔디밭.
 *
 * Blogger 판은 /feeds/posts/summary 를 클라이언트에서 fetch 해 그렸다.
 * 정적 사이트는 빌드 시점에 모든 글의 published_at 을 알기 때문에 서버에서
 * 계산해 SVG 로 박아 넣는다 — 요청도, "불러오는 중…" 도 없다.
 */
function buildGrass() {
  const counts = new Map<string, number>();
  for (const post of getAllPosts()) {
    const key = post.published_at.slice(0, 10);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const dates = [...counts.keys()].sort();
  const last = dates.at(-1);
  // 기준일을 "오늘"로 잡으면 빌드할 때마다 그림이 흔들린다. 마지막 발행일로 고정한다.
  const end = last ? new Date(`${last}T00:00:00Z`) : new Date("2026-01-01T00:00:00Z");

  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 364);
  start.setUTCDate(start.getUTCDate() - start.getUTCDay());

  const weeks: Date[][] = [];
  const cur = new Date(start);
  while (cur <= end) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(new Date(cur));
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
    weeks.push(week);
  }

  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  return { weeks, counts, end, total, days: counts.size, last };
}

const EMPTY = "#E7E3D9";
const LEVELS = ["#F2CBBB", "#E79372", "#D85A30", "#B23E1E"];
const MUTED = "#9AA79E";
const MONTHS = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];
const DAY_LABEL = ["", "월", "", "수", "", "금", ""];

function color(n: number) {
  if (!n) return EMPTY;
  if (n <= 2) return LEVELS[0];
  if (n <= 4) return LEVELS[1];
  if (n <= 6) return LEVELS[2];
  return LEVELS[3];
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

function Grass() {
  const { weeks, counts, end, total, days, last } = buildGrass();
  const STEP = 13, LEFT = 20, TOP = 16;
  const width = LEFT + weeks.length * STEP;
  const height = TOP + 7 * STEP;

  let lastMonth = -1;
  const monthLabels: { x: number; text: string }[] = [];
  weeks.forEach((week, ci) => {
    const m = week[0].getUTCMonth();
    if (m !== lastMonth) {
      lastMonth = m;
      monthLabels.push({ x: LEFT + ci * STEP, text: MONTHS[m] });
    }
  });

  return (
    <>
      <p className="m-0 mb-1 text-xl leading-[1.5] font-bold text-ink-strong">꾸준히 쌓아가는 발행 기록</p>
      <p className="m-0 mb-[18px] text-[13.5px] text-ink opacity-72">
        총 {total}개 발행 · {days}일 기록{last ? ` · 최근 ${last.slice(5).replace("-", "/")}` : ""}
      </p>

      <div className="overflow-x-auto pb-1">
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="발행 기록 히트맵">
          {DAY_LABEL.map((d, r) =>
            d ? (
              <text key={r} x={0} y={TOP + r * STEP + 9} fontSize={9} fill={MUTED}>{d}</text>
            ) : null,
          )}
          {monthLabels.map((m) => (
            <text key={m.x} x={m.x} y={10} fontSize={9} fill={MUTED}>{m.text}</text>
          ))}
          {weeks.map((week, ci) =>
            week.map((d, ri) => {
              if (d > end) return null;
              const key = iso(d);
              const n = counts.get(key) ?? 0;
              return (
                <rect key={key} x={LEFT + ci * STEP} y={TOP + ri * STEP} width={11} height={11} rx={3} fill={color(n)}>
                  <title>{`${key} · ${n ? `${n}개` : "없음"}`}</title>
                </rect>
              );
            }),
          )}
        </svg>
      </div>

      <div className="mt-2.5 flex items-center justify-end gap-1.5 text-[11.5px] text-muted">
        적음
        {[EMPTY, ...LEVELS].map((c) => (
          <span key={c} className="inline-block size-[11px] rounded-[3px]" style={{ background: c }} />
        ))}
        많음
      </div>
    </>
  );
}

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden px-7 pt-22 pb-24">
      {/* 구름. 흐릿한 타원이 아주 느리게 떠다닌다. */}
      <div className="cloud drift-a pointer-events-none absolute top-[60px] -left-[60px] h-[150px] w-[420px] rounded-[50%] bg-mint-light opacity-80 blur-[26px]" />
      <div className="cloud drift-b pointer-events-none absolute top-[180px] -right-20 h-[180px] w-[500px] rounded-[50%] bg-mint-light opacity-65 blur-[30px]" />
      <div className="cloud drift-a pointer-events-none absolute top-[30px] right-[22%] h-[90px] w-[240px] rounded-[50%] bg-mint-pale opacity-70 blur-[20px]" />

      <div className="relative mx-auto max-w-[980px] text-center">
        <p className="m-0 mb-3.5 text-xl font-bold text-ink opacity-70">— 강의 · 프로젝트 · 회고 —</p>
        <p className="mx-auto mb-10 max-w-[560px] text-[17.5px] leading-[1.8] text-ink opacity-82">
          AI를 통해 자동으로 구조화해 기록으로 남깁니다.
        </p>

        <div className="floaty relative mx-auto max-w-[780px] text-left">
          <span
            className="absolute -top-[18px] left-[26px] z-2 border-[1.5px] border-line bg-accent px-4 py-[9px] text-sm tracking-[2px] text-cream"
            style={{ borderRadius: "9px 11px 8px 10px", boxShadow: "0 7px 16px -7px rgba(47,58,57,0.55)" }}
          >
            GARDEN
          </span>
          <div
            className="relative bg-cream px-[30px] pt-[34px] pb-6"
            style={{ borderRadius: "16px 18px 15px 17px", boxShadow: "0 30px 60px -26px rgba(47,58,57,0.5)" }}
          >
            <div
              className="pointer-events-none absolute inset-0 border-[1.6px] border-[rgba(47,58,57,0.55)]"
              style={{ borderRadius: "16px 18px 15px 17px", filter: "url(#rough)" }}
            />
            <Grass />
          </div>
        </div>
      </div>
    </section>
  );
}
