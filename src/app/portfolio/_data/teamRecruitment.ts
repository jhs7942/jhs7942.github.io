export type TeamEvidence = {
  label: string;
  title: string;
  summary: string;
  details: string[];
  link?: {
    label: string;
    href: string;
  };
};

export const teamRecruitment = {
  title: "프론트엔드를 맡겠습니다",
  lead: "싸피 프로젝트, 아이디어를 실제 서비스로 끝까지 완성할 팀을 찾습니다.",
  meta: "SSAFY 15기 · 서울 캠퍼스 · 프론트엔드",
  paragraphs: [
    "사용자 화면을 빠르게 구현하는 데서 멈추지 않고, 팀의 일정과 서비스 완성도까지 함께 챙깁니다.",
    "문제가 생기면 노트북을 들고 바로 움직이고, 맡은 기능은 약속한 날까지 결과로 보여드리겠습니다.",
  ],
};

export const teamEvidence: TeamEvidence[] = [
  {
    label: "역할",
    title: "프론트엔드를 책임집니다",
    summary: "React와 TypeScript를 중심으로 사용자가 직접 만나는 화면을 맡겠습니다.",
    details: [
      "화면 구현뿐 아니라 API 연동, 상태 관리, 배포까지 웹 서비스의 전체 흐름을 경험했습니다.",
      "사용성·반응형·접근성·성능을 함께 살피며 팀의 결과물을 서비스답게 다듬습니다.",
    ],
  },
  {
    label: "태도",
    title: "필요한 순간에 먼저 움직입니다",
    summary: "열정은 말보다 행동으로 보여주는 편입니다.",
    details: [
      "문제를 발견하면 미루지 않고 노트북을 들고 가 현장에서 바로 해결합니다.",
      "내 역할의 경계를 따지기보다, 팀이 막힌 지점을 먼저 찾아 함께 뚫습니다.",
    ],
  },
  {
    label: "AI 원칙",
    title: "판단은 직접, 반복은 AI와",
    summary: "AI에게 결정을 맡기지 않고 제 생각을 검증하고 실행하는 도구로 사용합니다.",
    details: [
      "Claude와 나눈 대화도 숨기지 않고 공유해 어떤 질문과 판단으로 결과를 만들었는지 보여드립니다.",
      "생성된 답을 그대로 채택하지 않고 코드·문서·실행 결과를 교차 확인합니다.",
    ],
  },
  {
    label: "자동화",
    title: "팀의 기록 비용을 줄입니다",
    summary: "반복 업무는 스킬과 MCP로 연결해 팀의 개발 시간을 확보합니다.",
    details: [
      "Git 히스토리와 Jira를 MCP로 연결해 TIL을 만드는 스킬을 제작했습니다.",
      "커밋 내역을 읽어 변경 이유와 검증 내용을 정리하는 MR 작성 스킬을 만들었습니다.",
    ],
  },
  {
    label: "추진력",
    title: "아이디어를 4시간 안에 배포했습니다",
    summary: "시험 준비를 돕는 AI Quiz를 기획부터 배포까지 4시간 안에 완성했습니다.",
    details: [
      "혼자서 React·TypeScript·Supabase 기반 서비스를 구현하고 실제 사용자 826명을 확보했습니다.",
      "사용자 피드백의 약 90%를 반영해 재시도 정답률을 67%에서 75%로 개선했습니다.",
    ],
    link: {
      label: "AI Quiz 직접 보기",
      href: "https://ai-quiz-xi-livid.vercel.app/",
    },
  },
  {
    label: "경험",
    title: "팀의 개발 기반까지 챙깁니다",
    summary: "여러 프로젝트에서 쌓은 경험으로 개발 속도와 안정성을 함께 높이겠습니다.",
    details: [
      "스쿼시 머지 중심의 Git 관리와 Turborepo 기반 모노레포 구축 경험이 있습니다.",
      "프론트엔드 최적화, CI 구축, 서비스 AI 연동까지 제품 완성에 필요한 영역을 다뤘습니다.",
      "일정을 작은 단위로 나누고 먼저 위험을 드러내 납기일을 지킵니다.",
    ],
  },
];
