/**
 * 경험 타임라인 — SI 경력 표 + 메인 프로젝트를 시간순 하나의 흐름으로 합쳤다.
 * 이전 버전은 "SI 경력"(표)과 "메인 프로젝트"(카드)가 분리돼 있었는데,
 * "구름" 테마 handoff는 서비스 · 교육 · SI를 한 타임라인에서 최신순으로
 * 보여준다 — 실무 경력이 SI 2년으로 끝난 게 아니라 지금도 이어지고 있다는
 * 게 한눈에 보이도록.
 */

export type CareerKind = "SERVICE" | "EDUCATION" | "SI";

/** 제타럭스시스템 카드의 "업무 보기"를 눌렀을 때 옆으로 펼쳐지는 개별 SI 프로젝트.
 * desc는 글머리 기호 목록으로 보여주므로 문장 하나가 아니라 항목 배열이다. */
export type CareerSubProject = {
  when: string;
  title: string;
  desc: string[];
  link?: { label: string; href: string };
};

export type CareerEntry = {
  kind: CareerKind;
  kindColor: string;
  when: string;
  title: string;
  sub?: string;
  subColor?: string;
  desc: string;
  link?: { label: string; href: string };
  tint?: boolean;
  /** 있으면 카드에 "업무 보기" 버튼이 붙고, 눌렀을 때 이 목록이 구름 카드 여러 개로 펼쳐진다. */
  subProjects?: CareerSubProject[];
};

export const careerTimeline: CareerEntry[] = [
  {
    kind: "EDUCATION",
    kindColor: "#5E7449",
    when: "2026",
    title: "삼성 청년 SW 아카데미 15기",
    sub: "마이스터고 트랙 · 서울 캠퍼스",
    subColor: "#5E7449",
    desc: "Python · 알고리즘 · 웹 · AI/데이터 분석 과정을 이수했습니다.",
    tint: true,
  },
  {
    kind: "SI",
    kindColor: "#243130",
    when: "2022.03 – 2024.03",
    title: "제타럭스시스템",
    desc: "지자체 SI 프로젝트 3건에 참여해 웹개발의 전반을 경험했습니다.",
    subProjects: [
      {
        when: "2022.12 – 2023.08 · 8인",
        title: "경상북도 인구 · 산업 통합 플랫폼",
        desc: [
          "지도 모듈(OpenLayers) 전담 · 차트 모듈(ECharts) 일부 구현",
          "QGIS로 SHP 좌표계 변환(EPSG:4326 → 5186) 및 속성 가공",
        ],
      },
      {
        when: "2023.04 – 2023.12 · 2인",
        title: "공주 · 부여 스마트시티 챌린지",
        desc: [
          "주차 현황 집계 PostgreSQL 쿼리 설계 · 작성",
          "관리자 페이지 화면 · 테이블 신규 생성",
          "공주시청 · 부여군청 내부망 현장 배포(Tomcat WAR)",
        ],
        link: {
          label: "운영 중인 서비스 ↗",
          href: "https://gjsmart.gongju.go.kr/",
        },
      },
      {
        when: "2022.08 – 2023.07 · 3인",
        title: "태국 K-City 관제 플랫폼",
        desc: [
          "태국 묵다한 현지 서버 배포(Nginx 프록시 · 네트워크 설정)",
          "다수 카메라 · 드론 영상 패널 동시 표출과 이벤트 로그 관제 화면 구현",
        ],
      },
      {
        when: "",
        title: "유지관리 · 운영 사업 3건",
        desc: [
          "2023년 안전진단사업 관리시스템 유지관리 용역 (2023.08 ~ 2023.12)",
          "한국농어촌공사 간척농지 관리시스템 유지관리 용역 (2022.03 ~ 2023.12)",
          "과천 스마트시티 챌린지 – 스마트타운 챌린지 플랫폼 개발 (2022.05 ~ 2022.08)",
        ],
      },
    ],
  },
  {
    kind: "EDUCATION",
    kindColor: "#5E7449",
    when: "2021",
    title: "정보처리 산업기사 과정",
    subColor: "#5E7449",
    desc: "HTML/CSS/JavaScript, Java, JSP,  CS 기초를 이수했습니다.",
    tint: true,
  },
];
