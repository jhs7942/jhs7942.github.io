import { SKILL_ICONS } from "../_data/skillIcons";

/**
 * 스킬 이름으로 아이콘을 찾아 이중 원 뱃지로 그린다. 못 찾으면(아직 아이콘을
 * 못 채운 항목) 조용히 아무것도 안 그린다 — 깨진 자리표시자보다 낫다.
 */
export function SkillIconBadge({ name }: { name: string }) {
  const icon = SKILL_ICONS[name];
  if (!icon) return null;

  return (
    <span className="cloud-skillicon-ring" style={{ borderColor: `${icon.color}55` }}>
      <span className="cloud-skillicon-inner" style={{ background: `${icon.color}14`, borderColor: `${icon.color}55` }}>
        <svg viewBox={icon.viewBox} fill={icon.color} xmlns="http://www.w3.org/2000/svg" aria-hidden dangerouslySetInnerHTML={{ __html: icon.inner }} />
      </span>
    </span>
  );
}
