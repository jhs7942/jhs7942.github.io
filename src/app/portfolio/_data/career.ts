/**
 * 경험 타임라인 — SI 경력 표 + 메인 프로젝트를 시간순 하나의 흐름으로 합쳤다.
 * 이전 버전은 "SI 경력"(표)과 "메인 프로젝트"(카드)가 분리돼 있었는데,
 * "구름" 테마 handoff는 서비스 · 교육 · SI를 한 타임라인에서 최신순으로
 * 보여준다 — 실무 경력이 SI 2년으로 끝난 게 아니라 지금도 이어지고 있다는
 * 게 한눈에 보이도록.
 */

export type CareerKind = "SERVICE" | "EDUCATION" | "SI";

export type CareerEntry = {
  kind: CareerKind;
  kindColor: string;
  when: string;
  title: string;
  /** 굵게 강조되는 부제 — SI 항목은 없다(생략) */
  sub?: string;
  subColor?: string;
  desc: string;
  link?: { label: string; href: string };
  /** 카드 배경을 살짝 다르게(교육 항목만 민트 틴트) */
  tint?: boolean;
};

export const careerTimeline: CareerEntry[] = [
  {
    kind: "SERVICE",
    kindColor: "#C8443C",
    when: "2026.07 ~ 현재",
    title: "텔레파시 · 개발 단독 담당",
    sub: "관심 단어 기반 랜덤채팅 서비스 · 기획 1인 / 개발 1인",
    subColor: "#5E7449",
    desc: "넘겨받은 JavaScript 코드베이스를 TypeScript로 마이그레이션하며 실시간 매칭 · 채팅, 결제 검증, SMS 인증 등 백엔드와 React 프론트엔드 전반을 직접 구현 · 개선하고 있습니다.",
  },
  {
    kind: "SERVICE",
    kindColor: "#C8443C",
    when: "2026.03",
    title: "AI Quiz · 기획 · 개발 · 운영",
    sub: "4시간 MVP + 약 2주 개선 · 개발 1인 / 문제 제작 2인",
    subColor: "#5E7449",
    desc: "시험 대비 퀴즈 서비스를 4시간 만에 배포하고 2주간 실사용 지표로 개선했습니다. 서울 1,000명 대상 기획이 전국 캠퍼스로 확산돼 문제 풀이 92,329회를 기록했습니다.",
  },
  {
    kind: "EDUCATION",
    kindColor: "#5E7449",
    when: "2026",
    title: "삼성 청년 SW 아카데미 15기",
    sub: "마이스터고 트랙 · 서울 캠퍼스",
    subColor: "#5E7449",
    desc: "AI 시험 12회 중 5회 과락 시 퇴소하는 구조 안에서, 동기들이 각자 퀴즈를 만들던 중복 낭비를 발견해 AI Quiz를 만들었습니다.",
    tint: true,
  },
  {
    kind: "SI",
    kindColor: "#243130",
    when: "2023.04 – 2023.12 · 2인",
    title: "공주 · 부여 스마트시티 챌린지",
    desc: "주차 현황 집계 PostgreSQL 쿼리 설계 · 작성, 관리자 페이지 화면 · 테이블 신규 생성, 공주시청 · 부여군청 내부망 현장 배포(Tomcat WAR).",
    link: { label: "운영 중인 서비스 ↗", href: "https://gjsmart.gongju.go.kr/" },
  },
  {
    kind: "SI",
    kindColor: "#243130",
    when: "2022.12 – 2023.08 · 8인",
    title: "경상북도 인구 · 산업 통합 플랫폼",
    desc: "지도 모듈(OpenLayers) 전담 · 차트 모듈(ECharts) 일부 구현, QGIS로 SHP 좌표계 변환(EPSG:4326 → 5186) 및 속성 가공.",
  },
  {
    kind: "SI",
    kindColor: "#243130",
    when: "2022.08 – 2023.07 · 3인",
    title: "태국 K-City 관제 플랫폼",
    desc: "태국 묵다한 현지 서버 배포(Nginx 프록시 · 네트워크 설정), 다수 카메라 · 드론 영상 패널 동시 표출과 이벤트 로그 관제 화면 구현.",
  },
];
