/**
 * 스킬 — "구름" 테마 handoff(Portfolio.dc.html)의 SKILLS 상수를 그대로 옮겼다.
 *
 * 이전 버전(태그+근거카드 혼합)과 달리 6개 카테고리 전부, 모든 항목에
 * 설명 + 출처를 채웠다. "무엇을 다루는지" 나열이 아니라 "그 기술로 어떤
 * 판단을 했는지"가 보이도록 하는 원칙은 그대로 유지한다.
 */

export type SkillItem = {
  name: string;
  /** 강조는 <b> 만 허용 — 이 파일 안에서만 편집하는 신뢰 가능한 콘텐츠라
   *  SkillsSection 에서 dangerouslySetInnerHTML 로 그대로 렌더링한다. */
  descHtml: string;
  source: string;
};

export type SkillCategory = {
  id: string;
  name: string;
  en: string;
  items: SkillItem[];
};

export const skillCategories: SkillCategory[] = [
  {
    id: "lang",
    name: "언어",
    en: "LANGUAGES",
    items: [
      {
        name: "TypeScript",
        descHtml: "넘겨받은 JavaScript 코드베이스를 <b>TypeScript로 직접 마이그레이션</b>하며 백엔드 · 프론트엔드 전반의 타입 안정성을 확보했습니다.",
        source: "텔레파시 · JS → TS 마이그레이션",
      },
      {
        name: "JavaScript",
        descHtml: "AI 코딩 도구로 작성돼 넘어온 JS 서비스 코드를 읽고 구조를 파악한 뒤, <b>도메인 단위로 나눠 점진 전환</b>했습니다.",
        source: "텔레파시 · 인수인계",
      },
      {
        name: "SQL",
        descHtml:
          "주차 현황을 집계하는 PostgreSQL 쿼리를 직접 설계 · 작성했고, 이후 트랜잭션이 필요한 작업을 <b>Postgres 함수(RPC)로 내렸습니다.</b>",
        source: "SI 경력 · 공주 · 부여 / 텔레파시 · RPC",
      },
    ],
  },
  {
    id: "front",
    name: "프론트엔드",
    en: "FRONTEND",
    items: [
      {
        name: "TanStack Query",
        descHtml:
          "캐시 계층 없이 화면을 오갈 때마다 같은 데이터를 새로 받아오던 구조를, 캐시 가능한 4개 엔드포인트를 공용 캐시로 옮겨 <b>API 요청을 60% 줄였습니다.</b> 값이 바뀌는 시점에만 무효화하는 전략을 직접 설계했습니다.",
        source: "텔레파시 · 서버 데이터 캐시",
      },
      {
        name: "React 19",
        descHtml: "매칭 · 채팅 · 마이페이지 등 서비스 화면 전반을 구현하고, <b>보호 라우트와 소켓 이벤트에 따른 캐시 갱신 흐름</b>을 설계했습니다.",
        source: "텔레파시 · 프론트엔드 전반",
      },
      {
        name: "Zustand",
        descHtml:
          "퀴즈 진행 상태를 persist + sessionStorage로 관리해 <b>탭을 닫으면 초기화되도록 의도적으로 설계</b>했습니다. 스토어 액션 안에서는 getState()로 접근해 Hooks 규칙 제약 없이 상태를 공유했습니다.",
        source: "AI Quiz · quizStore",
      },
      {
        name: "Vite",
        descHtml: "PWA 도입을 시도했으나 <b>Vite 8과 PWA 플러그인의 peer dependency 충돌로 무산</b>돼, 반응형 웹으로 대체하는 판단을 내렸습니다.",
        source: "AI Quiz · Anti-scope 확정",
      },
      {
        name: "OpenLayers",
        descHtml: "경상북도 인구 · 산업 통합 플랫폼에서 <b>지도 모듈을 전담</b>해 구현했습니다.",
        source: "SI 경력 · 경상북도 통합 플랫폼",
      },
      {
        name: "ECharts",
        descHtml: "같은 프로젝트에서 <b>차트 모듈 일부를 구현</b>했습니다.",
        source: "SI 경력 · 경상북도 통합 플랫폼",
      },
      {
        name: "Tailwind CSS v4",
        descHtml: "두 서비스의 화면을 유틸리티 기반으로 구성했고, 텔레파시 화면 디자인은 <b>Claude Design으로 직접 진행</b>했습니다.",
        source: "텔레파시 / AI Quiz",
      },
    ],
  },
  {
    id: "back",
    name: "백엔드",
    en: "BACKEND",
    items: [
      {
        name: "Socket.IO 4",
        descHtml:
          "1초 간격 폴링을 서버 emit 기반 push로 전환해 분당 요청 59건을 <b>사실상 0건으로 줄였습니다.</b> 감시 타이머 1개로 라운드가 바뀔 때만 전체에 브로드캐스트하는 구조를 설계했습니다.",
        source: "텔레파시 · 실시간 라운드 구조",
      },
      {
        name: "Express 5",
        descHtml: "인증 · 요청 검증(zod) · 에러 핸들링을 <b>미들웨어 체인으로 구성</b>하고 CORS · compression을 적용했습니다.",
        source: "텔레파시 · Node.js 프로세스",
      },
      {
        name: "Zod",
        descHtml: "Express 미들웨어에서 <b>요청 바디를 스키마로 검증</b>해 타입 안정성과 런타임 검증을 함께 확보했습니다.",
        source: "텔레파시 · 요청 검증",
      },
      {
        name: "JWT · 인증",
        descHtml: "쿠키 기반 JWT 검증을 REST와 소켓 양쪽에 적용해 <b>인증 경로를 하나로 맞췄습니다.</b>",
        source: "텔레파시 · 인증",
      },
      {
        name: "결제 · SMS 인증",
        descHtml:
          "Solapi로 SMS 인증을 구현하고, <b>은행 입금 웹훅을 수신해 결제를 검증</b>하는 구조를 만들었습니다. 환불 계좌는 암호화해 저장합니다.",
        source: "텔레파시 · 결제 · 인증 연동",
      },
    ],
  },
  {
    id: "db",
    name: "데이터베이스",
    en: "DATABASE",
    items: [
      {
        name: "PostgreSQL",
        descHtml:
          "주차 현황 집계 쿼리 설계부터 트랜잭션 함수 작성까지 담당했습니다. check-then-act 경쟁 상태를 없애기 위해 사전 조회 대신 <b>DB 제약 위반을 함수 내부에서 도메인 오류로 변환</b>했습니다.",
        source: "텔레파시 · RPC / SI 경력",
      },
      {
        name: "Supabase",
        descHtml:
          "트랜잭션이 필요한 7개 작업을 Postgres 함수로 내려 <b>원자성을 DB가 보장하게 전환</b>했습니다. 닉네임 이력 불일치 94건 → 0건. RLS는 4개 대안을 검토해 anon key · 공개 데이터 맥락에 맞게 판단했습니다.",
        source: "텔레파시 · RPC / AI Quiz · 가용성 설계",
      },
      {
        name: "데이터 가용성 설계",
        descHtml:
          "정적 JSON = 필수, DB = 선택으로 계층을 나누고 <b>모든 DB 호출을 silent fail로 처리</b>해, DB가 죽어도 서비스 핵심 기능은 멈추지 않게 했습니다.",
        source: "AI Quiz · 가용성 설계",
      },
      {
        name: "QGIS · 공간 데이터",
        descHtml: "SHP 파일의 <b>좌표계를 EPSG:4326 → EPSG:5186으로 변환</b>하고 속성 데이터를 가공했습니다.",
        source: "SI 경력 · 경상북도 통합 플랫폼",
      },
    ],
  },
  {
    id: "infra",
    name: "인프라 · 배포",
    en: "INFRA & DEPLOY",
    items: [
      {
        name: "Vercel",
        descHtml: "정적 JSON + 재배포 조합으로 <b>롤백 비용을 낮게 설계</b>해, 배포 후 문제가 생기면 빠르게 되돌릴 수 있는 구조를 만들었습니다.",
        source: "AI Quiz · 롤백 판단",
      },
      {
        name: "Render",
        descHtml: "v3 브랜치에 push하면 <b>자동으로 빌드 · 배포되는 파이프라인</b>을 구성했습니다.",
        source: "텔레파시 · 배포 파이프라인",
      },
      {
        name: "Nginx",
        descHtml: "태국 묵다한 현지 서버에 <b>프록시 · 네트워크 설정을 직접 구성</b>해 배포했습니다.",
        source: "SI 경력 · 태국 K-City 관제 플랫폼",
      },
      {
        name: "Tomcat",
        descHtml: "공주시청 · 부여군청 <b>내부망에 WAR 파일로 현장 배포</b>한 경험이 있습니다.",
        source: "SI 경력 · 공주 · 부여 스마트시티",
      },
    ],
  },
  {
    id: "ai",
    name: "AI 협업",
    en: "AI WORKFLOW",
    items: [
      {
        name: "Claude Code",
        descHtml:
          "AI Quiz는 기획부터 배포까지 4시간을 Claude Code로 진행했고, 이후 프로젝트마다 <b>커스텀 커맨드 · 훅 · MCP로 기획 → 개발 → 리뷰 → 기록 파이프라인</b>을 구성해 사용합니다.",
        source: "AI Quiz · 제약 안에서 기술 고르기",
      },
      {
        name: "AI 기록",
        descHtml: "프로젝트 단위로 프롬프트 · 도구 호출 · 파일 변경 · 실패까지 세션 전체를 남겨, <b>나중에 \"왜 그렇게 고쳤는지\"를 되짚을 수 있게</b> 했습니다.",
        source: "AI RECORD · 세션 리포트",
      },
      {
        name: "Linear 연동",
        descHtml: "커스텀 커맨드로 이슈 등록 → 구현 → 리뷰 → 재현 검증을 흐름으로 묶고, <b>협업 도구 세팅을 프로젝트 첫 30분의 기본값</b>으로 삼았습니다.",
        source: "리니어 플로우",
      },
    ],
  },
];
