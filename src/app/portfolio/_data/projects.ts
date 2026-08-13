/**
 * 프로젝트 케이스 스터디 — "구름" 테마 handoff의 프로젝트 카드를 그대로 옮겼다.
 *
 * 이전 버전은 문제 → 해결 → 결과를 접이식 아코디언(details)에 담았는데, 이
 * 버전은 펼쳐볼 것 없이 트러블슈팅 카드를 바로 나열한다("클릭 최소화" 원칙을
 * 접기 자체를 없애는 쪽으로 더 밀어붙인 형태). 카드 위에 뜬 구름 캐릭터는
 * 순수 장식이라 CloudCharacterDecor.tsx 가 이 데이터로 그린다.
 */

export type CloudCharacterSpec = {
  /** float1(위→왼쪽 기울어짐) · float2(반대 위상) 중 하나 */
  variant: "float1" | "float2";
  durationS: number;
  top: number;
  /** left 또는 right 중 하나만 지정 */
  left?: number;
  right?: number;
  width: number;
  height: number;
  /** 몸통 그라디언트 — [중심색, 중간색 · 위치, 바깥색] */
  gradient: [string, string, string];
  stringHeight: number;
  stringTop: number;
  /** 꼬리 삼각형 — 좌우 테두리 두께, 아래(색 있는) 테두리 두께 */
  tailSide: number;
  tailHeight: number;
};

export type ProjectIssue = {
  title: string;
  descHtml: string;
};

export type ProjectStat = {
  label: string;
  value: string;
};

export type ProjectShot = {
  /** public/ 기준 경로 */
  src: string;
  alt: string;
};

export type Project = {
  slug: string;
  title: string;
  /** minor 카드는 배지 없이 태그만 제목 옆에 인라인으로 붙는다 */
  badge?: string;
  badgeColor?: string;
  visitUrl?: string;
  githubUrl?: string;
  newsUrl?: string;
  tags: string[];
  descHtml: string;
  stats?: ProjectStat[];
  characters: CloudCharacterSpec[];
  minor?: boolean;
  /** 카드 왼쪽에 넣는 실제 모바일 화면 스크린샷 */
  mobileShot?: ProjectShot;
};

export const projects: Project[] = [
  {
    slug: "aiquiz",
    title: "AI Quiz",
    badge: "2026.03 · 개발 1인 / 문제 제작 2인",
    badgeColor: "#C8443C",
    visitUrl: "https://ai-quiz-xi-livid.vercel.app/",
    githubUrl: "https://github.com/jhs7942/ai-quiz",
    mobileShot: { src: "/portfolio/aiquiz-mobile.jpg", alt: "AI Quiz 모바일 화면 — 인공지능 포함 관계를 묻는 객관식 문제" },
    tags: ["React 19", "TypeScript", "Zustand", "Tailwind CSS", "Vite", "Supabase / PostgreSQL", "Vercel"],
    descHtml:
      "같은 시험 범위를 1,000명이 각자 만드는 중복 낭비를 없애기 위해, 기획 · 배포까지 4시간을 기한으로 잡고 만든 시험 대비 퀴즈 서비스입니다. 서울 캠퍼스 기획이 전국으로 확산돼 문제 풀이 92,329회 · 세션 6,343건을 기록했습니다.",
    stats: [
      { label: "문제 풀이", value: "92,329회" },
      { label: "문제은행", value: "1,160문제" },
      { label: "피드백 반영", value: "약 90%" },
    ],
    characters: [
      {
        variant: "float1",
        durationS: 7,
        top: -96,
        left: 300,
        width: 66,
        height: 82,
        gradient: ["#FBFBF7", "#E0796F 30%", "#C8443C"],
        stringHeight: 44,
        stringTop: 90,
        tailSide: 6,
        tailHeight: 10,
      },
      {
        variant: "float2",
        durationS: 9,
        top: -64,
        left: 400,
        width: 44,
        height: 56,
        gradient: ["#FBFBF7", "#A6DDD8 32%", "#83CFC9"],
        stringHeight: 36,
        stringTop: 62,
        tailSide: 5,
        tailHeight: 8,
      },
    ],
  },
  {
    slug: "telepathy",
    title: "텔레파시",
    badge: "2026.07 ~ · 개발 단독 · 개발 중",
    badgeColor: "#35804C",
    visitUrl: "https://telepathy.my/",
    githubUrl: "https://github.com/MoonEunSeo/telepathy-app/tree/v3",
    newsUrl: "https://platum.kr/archives/272577",
    mobileShot: { src: "/portfolio/telepathy-mobile.jpg", alt: "텔레파시 모바일 화면 — 현재 접속자 수와 관심 단어 선택 화면" },
    tags: ["React 19", "TypeScript", "TanStack Query", "Express 5", "Socket.IO 4", "Zod", "Supabase / PostgreSQL", "Render"],
    descHtml:
      "15초의 한 턴 안에 같은 단어를 고른 사용자끼리 연결되는 관심 단어 기반 랜덤채팅 서비스입니다. 기획자가 AI 코딩 도구로 만들어 운영하던 코드베이스를 넘겨받아 TypeScript로 마이그레이션하며 개발을 단독으로 맡고 있습니다.",
    characters: [
      {
        variant: "float2",
        durationS: 8,
        top: -88,
        right: 44,
        width: 60,
        height: 76,
        gradient: ["#FBFBF7", "#B4C79E 32%", "#93A97F"],
        stringHeight: 40,
        stringTop: 84,
        tailSide: 6,
        tailHeight: 10,
      },
    ],
  },
];
