import { SKILL_ICONS } from "../_data/skillIcons";

/** 스킬 이름으로 아이콘을 찾아 편지 카드의 손그림 우표로 그린다. */
export function SkillIconBadge({ name }: { name: string }) {
  const icon = SKILL_ICONS[name];
  if (!icon) return null;

  return (
    <span className="cloud-skillicon-ring" aria-hidden="true">
      <span className="cloud-skillicon-inner">
        <svg
          viewBox={icon.viewBox}
          style={{ color: icon.color }}
          xmlns="http://www.w3.org/2000/svg"
          dangerouslySetInnerHTML={{ __html: icon.inner }}
        />
      </span>
    </span>
  );
}
