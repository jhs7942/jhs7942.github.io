"use client";

import { useState } from "react";
import { skillCategories } from "../_data/skills";
import { CloudVeils } from "./CloudVeils";
import { SkillIconBadge } from "./SkillIconBadge";

export function SkillsSection() {
  const [activeId, setActiveId] = useState(skillCategories[0].id);
  const active = skillCategories.find((c) => c.id === activeId) ?? skillCategories[0];

  return (
    <section id="skills" data-cloud-section className="cloud-section">
      <div className="cloud-veilwrap">
        <div data-content className="cloud-content">
          <div className="cloud-sechead">
            <h2>스킬</h2>
            <span className="cloud-sectag">SKILLS</span>
          </div>
          <div className="cloud-skillwrap">
            <div className="cloud-cat-list">
              {skillCategories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveId(cat.id)}
                  className={`cloud-cat-btn${cat.id === activeId ? " active" : ""}`}
                >
                  <span className="cloud-cat-name">{cat.name}</span>
                  <span className="cloud-cat-en">{cat.en}</span>
                </button>
              ))}
            </div>
            {/* key로 카테고리 전환마다 remount시켜 skillIn 애니메이션이 매번 다시 재생되게 한다 */}
            <div key={active.id} className="cloud-skillpanel">
              <p className="cloud-skillpanel-en">{active.en}</p>
              <h3 className="cloud-skillpanel-name">{active.name}</h3>
              <div className="cloud-skillitems">
                {active.items.map((item) => (
                  <div key={item.name} className="cloud-skillitem">
                    <SkillIconBadge name={item.name} />
                    <div className="cloud-skillitem-body">
                      <p className="cloud-skillitem-name">{item.name}</p>
                      <p className="cloud-skillitem-desc" dangerouslySetInnerHTML={{ __html: item.descHtml }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <CloudVeils
          left={[
            { right: 6, top: 8, width: 42 },
            { right: 15, top: 40, width: 50 },
            { right: 2, bottom: 2, width: 36 },
          ]}
          right={[
            { left: 5, top: 16, width: 45 },
            { left: 17, top: 48, width: 48 },
            { left: 3, bottom: 0, width: 34 },
          ]}
        />
      </div>
    </section>
  );
}
