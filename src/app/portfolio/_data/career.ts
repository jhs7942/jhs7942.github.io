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
  /** 경력·교육 내용을 이력서식으로 풀어 쓴 상세 설명. */
  details?: string[];
  link?: { label: string; href: string };
  tint?: boolean;
  /** 회사 구름 카드 반대편 상세 패널에 표시할 프로젝트 목록. */
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
    details: [
      "Python 프로그래밍: 기본 문법과 자료구조, 함수·모듈을 익히고 문제를 코드로 해결하는 기초 역량 강화",
      "알고리즘: 문제를 분석해 적절한 자료구조와 풀이 방식을 선택하고 시간·공간 복잡도를 고려해 구현하는 연습",
      "웹 개발: 사용자 화면부터 서버와 데이터 흐름까지 웹 서비스가 동작하는 전체 구조를 학습",
      "AI·데이터 분석: 데이터를 정리·탐색·시각화하고 분석 결과를 바탕으로 AI 모델을 이해하고 활용하는 과정 이수",
    ],
    tint: true,
  },
  {
    kind: "SI",
    kindColor: "#243130",
    when: "2022.03 – 2024.03",
    title: "제타럭스시스템",
    desc: "SI 프로젝트 3건·유지보수 3건에 참여해 웹개발의 전반을 담당했습니다.",
    subProjects: [
      {
        when: "2022.12 – 2023.08 · 8인",
        title: "경상북도 인구 · 산업 통합 플랫폼",
        desc: [
          "지도 시각화 모듈 전담: OpenLayers로 시·군·구 레이어와 인구 이동 화살표를 구현하고 지역 변경 시 전체 차트 일괄 갱신",
          "차트 기능 개발: ECharts 미지원 테이블·범례 연동 UI를 별도 컴포넌트로 구현하고 복수 검색 조건을 하나의 차트에 누적",
          "GIS 데이터 가공: QGIS로 SHP 좌표계를 EPSG:4326에서 EPSG:5186으로 변환하고 행정경계 속성 가공",
          "렌더링 최적화·협업: 예상 조회 데이터를 prefetch하고 백엔드 개발자와 API 응답 스펙 협의",
        ],
      },
      {
        when: "2023.04 – 2023.12 · 2인",
        title: "공주 · 부여 스마트시티 챌린지",
        desc: [
          "주차 관리 기능 풀스택 개발: 전자정부프레임워크·JDBC·PostgreSQL로 입출차 API와 현황·장기 주차 판별 쿼리 구현",
          "서비스·관리자 기능: 무료·유료 보관 결제 분기, KG이니시스 연동, 관리자 대시보드와 장애 집계 화면 개발",
          "프론트엔드·모바일 개발: jQuery·Chart.js·카카오맵 기반 화면과 Android·iOS 앱 빌드·스토어 배포",
          "서버 배포: 공주시청·부여군청 내부망에 Tomcat WAR 배포 후 운영 안정화",
        ],
        link: {
          label: "운영 중인 서비스",
          href: "https://gjsmart.gongju.go.kr/",
        },
      },
      {
        when: "2022.08 – 2023.07 · 3인",
        title: "태국 K-City 관제 플랫폼",
        desc: [
          "관제 화면 개발: React·TypeScript로 다수 CCTV·드론 영상 동시 표출과 이벤트 로그 UI 구현",
          "현지 인프라 구축: 태국 묵다한 서버에 프론트엔드를 배포하고 Nginx 리버스 프록시 구성",
          "네트워크 장애 해결: 프록시 로그로 현지 IP 대역 차단을 특정하고 허용 대역·업스트림을 재설정해 영상 송출 정상화",
          "백엔드 연동: 관제 화면에 필요한 PostgreSQL 조회 쿼리 작성",
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
    when: "2021.06 – 2021.11",
    title: "그린컴퓨터 아카데미",
    sub: "정보처리 산업기사 과정",
    subColor: "#5E7449",
    desc: "웹 개발과 정보처리 산업기사 관련 CS 과정을 5개월간 이수했습니다.",
    details: [
      "웹 개발 기초: HTML·CSS·JavaScript와 Java 기본 문법 학습",
      "서버 사이드 개발: Spring·JSP 기반 웹 애플리케이션 개발 실습",
      "전공 기초 이수: 정보처리 산업기사 취득에 필요한 컴퓨터과학 지식 학습",
      "개인 프로젝트: 네이버 금융의 환율·주가 정보를 크롤링 한 후 모니터링하는 웹사이트 기획 및 구현",
    ],
    tint: true,
  },
];
