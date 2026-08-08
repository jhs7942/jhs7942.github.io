/**
 * 시리즈 레지스트리.
 *
 * 시리즈 소속은 슬러그 접두사로 추론할 수 없다. `nodejs-http-module-server-basics`가
 * Express 6부작의 1편이고, `express-cookie-session`은 Express가 아니라 인증 3부작의
 * 1편이다. 그래서 각 글의 frontmatter에 series 키를 명시하고, 표시 정보는 여기서 관리한다.
 *
 * 스테퍼·이전/다음 버튼은 이 레지스트리와 각 글의 part로 빌드 시점에 생성된다.
 * Blogger 시절의 finalize 패스(발행 후 URL 수집 → placeholder 치환)는 필요 없다.
 */
export const SERIES = {
  express: {
    title: "Express 기본",
    total: 6,
  },
  "express-auth": {
    title: "Express 인증",
    total: 3,
  },
  myexpress: {
    title: "HTTP 서버 밑바닥 구현",
    total: 6,
  },
  webhook: {
    title: "웹훅 자동화",
    total: 2,
  },
  "telepathy-perf": {
    title: "텔레파시 성능 측정",
    total: 2,
  },
} as const;

export type SeriesKey = keyof typeof SERIES;

export const SERIES_KEYS = Object.keys(SERIES) as SeriesKey[];

export function isSeriesKey(value: string): value is SeriesKey {
  return value in SERIES;
}
