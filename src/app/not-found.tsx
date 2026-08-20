import { RootRedirect } from "./_components/RootRedirect";

/** 존재하지 않는 정적 경로도 루트 포트폴리오로 보낸다. */
export default function NotFound() {
  return <RootRedirect />;
}
