/**
 * 스킬 — "구름" 테마 handoff(Portfolio.dc.html)의 SKILLS 상수를 그대로 옮겼다.
 *
 * "이 프로젝트에서 이걸 했다"는 특정 사례 나열이 아니라, 그 기술을 어떻게
 * 이해하고 어떤 상황에 어떻게 적용할 수 있는지를 범용적인 문장으로 적는다
 * (프로젝트 단위 사례는 프로젝트 섹션에서 이미 다룬다).
 */

export type SkillItem = {
  name: string;
  descHtml: string;
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
        descHtml: "스키마 구조를 정의할 때 활용하고 있으며, 제네릭과 유틸리티 타입을 상황에 따라 적절히 활용합니다.",
      },
      {
        name: "JavaScript",
        descHtml: "클로저의 동작 원리를 이해하고 있으며, ES6 문법을 상황에 맞게 적용합니다.",
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
        descHtml: "서버 상태와 클라이언트 상태를 분리해서 다루고, 데이터가 바뀌는 시점에 맞춰 캐시 무효화 전략을 설계합니다.",
      },
      {
        name: "React 19",
        descHtml: "컴포넌트 단위로 상태와 렌더링 흐름을 설계하고, 커스텀 훅으로 로직을 재사용 가능한 단위로 분리합니다.",
      },
      {
        name: "Next.js",
        descHtml: "서버·클라이언트 렌더링의 차이를 이해하고, 페이지 특성에 맞춰 렌더링 전략과 라우팅 구조를 설계합니다.",
      },
      {
        name: "Zustand",
        descHtml: "전역 상태를 스토어 단위로 나누고, persist 같은 미들웨어를 상황에 맞게 조합해 사용합니다.",
      },
      {
        name: "Vite",
        descHtml: "개발 서버·번들링 설정을 이해하고 있으며, 플러그인 간 의존성 충돌 같은 문제가 생기면 원인을 파악해 대안을 판단합니다.",
      },
      {
        name: "OpenLayers",
        descHtml: "레이어·좌표계 개념을 이해하고 있으며, 지도 위에 원하는 데이터를 시각화할 수 있습니다.",
      },
      {
        name: "ECharts",
        descHtml: "데이터 구조에 맞는 차트 타입을 고르고, 옵션을 조합해 원하는 형태로 시각화합니다.",
      },
      {
        name: "Tailwind CSS v4",
        descHtml: "유틸리티 클래스로 반응형 레이아웃을 구성하고, 디자인 토큰을 커스텀해 일관된 스타일을 유지합니다.",
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
        descHtml: "실시간 이벤트 흐름을 설계하고, 룸·네임스페이스 단위로 브로드캐스트 범위를 제어합니다.",
      },
      {
        name: "Express 5",
        descHtml: "미들웨어 체인으로 인증·검증·에러 처리를 구성하고, 라우팅 구조를 도메인 단위로 나눕니다.",
      },
      {
        name: "Zod",
        descHtml: "요청 스키마를 정의해 런타임 검증과 타입 추론을 함께 확보합니다.",
      },
      {
        name: "JWT · 인증",
        descHtml: "토큰 기반 인증 흐름을 이해하고 있으며, 쿠키·헤더 등 상황에 맞는 저장·전달 방식을 판단합니다.",
      },
      {
        name: "결제 · SMS 인증",
        descHtml: "외부 API 연동 시 웹훅으로 처리 상태를 검증하는 구조를 설계하고, 민감 정보는 암호화해서 다룹니다.",
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
        descHtml: "쿼리를 직접 설계하고, 경쟁 상태가 생길 수 있는 로직은 트랜잭션과 제약 조건으로 안전하게 처리합니다.",
      },
      {
        name: "Supabase",
        descHtml: "원자성이 필요한 로직은 RPC로 DB에 내려서 처리하고, RLS 같은 접근 제어 정책을 상황에 맞게 판단합니다.",
      },
      {
        name: "데이터 가용성 설계",
        descHtml: "핵심 기능과 부가 기능의 의존성을 구분해서, 일부가 실패해도 서비스 전체가 멈추지 않도록 설계합니다.",
      },
      {
        name: "QGIS · 공간 데이터",
        descHtml: "좌표계 변환과 공간 데이터 가공 방식을 이해하고 있습니다.",
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
        descHtml: "정적 배포와 롤백 비용을 함께 고려해 배포 전략을 설계합니다.",
      },
      {
        name: "Render",
        descHtml: "브랜치 push에 맞춰 자동으로 빌드·배포되는 파이프라인을 구성합니다.",
      },
      {
        name: "Docker",
        descHtml: "컨테이너 기반 실행 환경을 구성하고, 개발·배포 환경의 차이를 줄일 수 있도록 이미지와 설정을 관리합니다.",
      },
      {
        name: "Nginx",
        descHtml: "리버스 프록시와 기본적인 네트워크 설정을 이해하고 구성할 수 있습니다.",
      },
      {
        name: "Tomcat",
        descHtml: "WAR 파일 배포 방식과 내부망 환경의 서버 운영 방식을 이해하고 있습니다.",
      },
    ],
  },
  {
    id: "ai",
    name: "AI",
    en: "AI WORKFLOW",
    items: [
      {
        name: "Claude Code",
        descHtml: "커스텀 커맨드·훅·MCP를 조합해 기획부터 개발·리뷰까지 이어지는 파이프라인을 구성합니다.",
      },
      {
        name: "AI 기록",
        descHtml: "작업 과정과 판단 근거를 기록으로 남겨, 이후에도 왜 그렇게 결정했는지 되짚을 수 있게 관리합니다.",
      },
      {
        name: "Linear 연동",
        descHtml: "이슈 등록부터 구현·리뷰까지 흐름을 도구로 연결해, 협업 세팅을 프로젝트 초반 기본값으로 삼습니다.",
      },
    ],
  },
];
