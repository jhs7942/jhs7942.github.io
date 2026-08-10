/**
 * 스킬.
 *
 * "무엇을 다루는지" 나열이 아니라 "그 기술로 어떤 판단을 했는지"가 보이도록,
 * 근거가 있는 기술은 detailed 카드(설명 + 출처)로, 아직 근거를 못 채운 기술은
 * tags 로만 나열한다. 없는 근거를 지어내지 않는다 — seungyn.com 스킬 섹션을
 * 참고해 정한 방향(2026-08-10 대화). 2026-08-11 에 텔레파시·AI Quiz 원본 자료
 * (portfolio-v2.md, quizStore 학습 PR)에서 추가로 캐냈다.
 *
 * B안(스크롤 전체 노출형) 채택 — 탭 전환 없이 카테고리 소제목만으로 구분해
 * 쭉 이어 읽는다. 프로젝트 아코디언에서 이미 정한 "클릭 최소화" 원칙과 결을
 * 맞췄다.
 */

export type SkillDetail = {
  name: string;
  /** 강조는 <b>·<code> 만 허용 — skills.ts 안에서만 편집하는 신뢰 가능한 콘텐츠라
   *  SkillsSection 에서 dangerouslySetInnerHTML 로 그대로 렌더링한다. */
  descHtml: string;
  source: string;
};

export type SkillCategory = {
  title: string;
  detailed?: SkillDetail[];
  tags: string[];
};

export const skillCategories: SkillCategory[] = [
  {
    title: "프론트엔드",
    detailed: [
      {
        name: "TanStack Query",
        descHtml:
          "캐시 계층 없이 화면을 오갈 때마다 같은 데이터를 새로 받아오던 구조를, 캐시 가능한 4개 엔드포인트를 <b>공용 캐시로 옮겨 API 요청을 60% 줄였습니다.</b> 값이 바뀌는 시점(구매·로그인 등)에만 무효화하는 전략을 직접 설계했습니다.",
        source: "텔레파시 · 서버 데이터 캐시",
      },
      {
        name: "TypeScript",
        descHtml: "넘겨받은 JavaScript 코드베이스를 <b>TypeScript로 직접 마이그레이션</b>하며 백엔드·프론트엔드 전반의 타입 안정성을 확보했습니다.",
        source: "텔레파시 · JS → TS 마이그레이션",
      },
      {
        name: "Zustand",
        descHtml:
          "퀴즈 진행 상태를 persist 미들웨어 + sessionStorage로 관리해 <b>탭을 닫으면 초기화되도록 의도적으로 설계</b>했습니다. 다른 스토어의 액션 안에서는 훅이 아닌 <code>getState()</code>로 접근해 Hooks 규칙 제약 없이 상태를 공유했습니다.",
        source: "AI Quiz · quizStore 학습 PR",
      },
      {
        name: "Vite",
        descHtml: "PWA 도입을 시도했으나 <b>Vite 8과 PWA 플러그인의 peer dependency 충돌로 무산</b>되어, 반응형 웹으로 대체하는 판단을 내렸습니다.",
        source: "AI Quiz · Anti-scope 확정",
      },
      {
        name: "OpenLayers",
        descHtml: "경상북도 인구·산업 통합 플랫폼에서 <b>지도 모듈을 전담</b>해 구현했습니다.",
        source: "SI 경력 · 경상북도 인구·산업 통합 플랫폼",
      },
      {
        name: "ECharts",
        descHtml: "같은 프로젝트에서 <b>차트 모듈 일부를 구현</b>했습니다.",
        source: "SI 경력 · 경상북도 인구·산업 통합 플랫폼",
      },
    ],
    tags: ["React 19", "Tailwind CSS v4"],
  },
  {
    title: "백엔드",
    detailed: [
      {
        name: "Socket.IO 4",
        descHtml:
          "1초 간격 폴링을 <b>서버 emit 기반 push로 전환</b>해 분당 요청 59건을 사실상 0건으로 줄였습니다. 감시 타이머 1개로 라운드가 바뀔 때만 전체에 브로드캐스트하는 구조를 설계했습니다.",
        source: "텔레파시 · 실시간 라운드 구조",
      },
      {
        name: "Supabase / PostgreSQL",
        descHtml:
          "select→insert 순서 호출 방식이 동시 요청 시 일관성이 깨지는 문제를 겪은 뒤, 트랜잭션이 필요한 <b>7개 작업을 Postgres 함수(RPC)로 내려 원자성을 DB가 보장</b>하게 전환했습니다. 닉네임 이력 불일치 94건 → 0건. RLS는 4개 대안을 검토해 anon key·공개 데이터 맥락에 맞게 판단했습니다.",
        source: "텔레파시 · Supabase RPC 기반 트랜잭션 / AI Quiz · 가용성 설계",
      },
      {
        name: "Express 5",
        descHtml: "인증 · 요청 검증(zod) · 에러 핸들링을 <b>미들웨어 체인으로 구성</b>하고, CORS · compression을 적용했습니다.",
        source: "텔레파시 · Node.js 프로세스 아키텍처",
      },
      {
        name: "Zod",
        descHtml: "Express 미들웨어에서 <b>요청 바디를 zod 스키마로 검증</b>해 타입 안정성과 런타임 검증을 함께 확보했습니다.",
        source: "텔레파시 · Node.js 프로세스 아키텍처",
      },
      {
        name: "결제 · SMS 인증",
        descHtml:
          "<b>Solapi로 SMS 인증</b>을 구현하고, 은행 입금 웹훅을 수신해 결제를 검증하는 구조를 만들었습니다. 환불 계좌는 암호화해 저장합니다.",
        source: "텔레파시 · 결제 · 인증 연동",
      },
    ],
    tags: ["JWT"],
  },
  {
    title: "인프라 · 배포 · 툴",
    detailed: [
      {
        name: "Vercel",
        descHtml: "정적 JSON + Vercel 재배포 조합으로 <b>롤백 비용을 낮게 설계</b>해, 배포 후 문제가 생기면 빠르게 되돌릴 수 있는 구조를 만들었습니다.",
        source: "AI Quiz · 롤백 판단의 정량 근거",
      },
      {
        name: "Render",
        descHtml: "v3 브랜치에 push하면 <b>Render가 자동으로 빌드 · 배포</b>하는 파이프라인을 구성했습니다.",
        source: "텔레파시 · 배포 파이프라인",
      },
      {
        name: "Nginx",
        descHtml: "태국 묵다한 현지 서버에 <b>Nginx 프록시 · 네트워크 설정을 직접 구성</b>해 배포했습니다.",
        source: "SI 경력 · 태국 K-City 관제 플랫폼",
      },
      {
        name: "Tomcat",
        descHtml: "공주시청 · 부여군청 <b>내부망에 WAR 파일로 현장 배포</b>한 경험이 있습니다.",
        source: "SI 경력 · 공주·부여 스마트시티 챌린지",
      },
      {
        name: "QGIS",
        descHtml: "SHP 파일의 <b>좌표계를 EPSG:4326 → EPSG:5186으로 변환</b>하고 속성 데이터를 가공했습니다.",
        source: "SI 경력 · 경상북도 인구·산업 통합 플랫폼",
      },
    ],
    tags: [],
  },
  {
    title: "AI 협업",
    detailed: [
      {
        name: "Claude Code",
        descHtml:
          "AI Quiz는 <b>기획부터 배포까지 4시간</b>을 Claude Code로 진행했고, 이후 프로젝트마다 커스텀 커맨드 · 훅 · MCP로 기획 → 개발 → 리뷰 → 기록 파이프라인을 구성해 사용합니다.",
        source: "AI Quiz · 제약 안에서 기술을 고르기",
      },
    ],
    tags: [],
  },
];
