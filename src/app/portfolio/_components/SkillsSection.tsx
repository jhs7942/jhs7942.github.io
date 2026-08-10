import { skillCategories } from "../_data/skills";

export function SkillsSection() {
  return (
    <div className="ab-section" id="skills">
      <div className="ab-sechead">
        <h2>스킬</h2>
        <span className="ab-sectag">SKILLS</span>
      </div>
      <div className="ab-main">
        {skillCategories.map((category) => (
          <div key={category.title}>
            <p className="ab-subhead">{category.title}</p>

            {category.detailed && category.detailed.length > 0 && (
              <div className="ab-skills">
                {category.detailed.map((skill) => (
                  <div key={skill.name} className="ab-skill">
                    <p className="ab-skill-name">{skill.name}</p>
                    {/* descHtml은 <b> 강조만 포함하는 신뢰 가능한 내부 콘텐츠(skills.ts) */}
                    <p className="ab-skill-desc" dangerouslySetInnerHTML={{ __html: skill.descHtml }} />
                    <span className="ab-skill-src">{skill.source}</span>
                  </div>
                ))}
              </div>
            )}

            {category.tags.length > 0 && (
              <div className="ab-ptags">
                {category.tags.map((tag) => (
                  <span key={tag} className="ab-ptag">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
