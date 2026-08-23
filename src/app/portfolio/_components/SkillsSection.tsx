"use client";

import { useEffect, useRef, useState } from "react";
import { skillCategories } from "../_data/skills";
import { SkillIconBadge } from "./SkillIconBadge";

export function SkillsSection() {
  const [activeId, setActiveId] = useState(skillCategories[0].id);
  const sectionRef = useRef<HTMLElement | null>(null);
  const categoryRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const active =
    skillCategories.find((c) => c.id === activeId) ?? skillCategories[0];

  const selectCategory = (index: number) => {
    const normalizedIndex =
      (index + skillCategories.length) % skillCategories.length;
    setActiveId(skillCategories[normalizedIndex].id);
    categoryRefs.current[normalizedIndex]?.focus();
  };

  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;

      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, [contenteditable='true']")) return;

      const page = sectionRef.current?.closest<HTMLElement>(".cloud-page");
      if (!page || page.hasAttribute("inert")) return;

      const activeIndex = skillCategories.findIndex((category) => category.id === activeId);
      event.preventDefault();
      selectCategory(activeIndex + (event.key === "ArrowDown" ? 1 : -1));
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeId]);

  return (
    <section ref={sectionRef} id="skills" data-cloud-section className="cloud-section">
      <div className="cloud-veilwrap">
        <div data-content className="cloud-content">
          <div className="cloud-sechead">
            <h2>스킬</h2>
          </div>
          <div className="cloud-skillwrap">
            <div
              className="cloud-cat-list"
              role="tablist"
              aria-label="스킬 카테고리"
              aria-orientation="vertical"
            >
              {skillCategories.map((cat, index) => (
                <button
                  key={cat.id}
                  ref={(element) => {
                    categoryRefs.current[index] = element;
                  }}
                  id={`skill-tab-${cat.id}`}
                  type="button"
                  onClick={() => setActiveId(cat.id)}
                  className={`cloud-cat-btn${cat.id === activeId ? " active" : ""}`}
                  role="tab"
                  aria-selected={cat.id === activeId}
                  aria-controls={`skill-panel-${cat.id}`}
                  tabIndex={cat.id === activeId ? 0 : -1}
                >
                  <span className="cloud-cat-name">{cat.name}</span>
                  <span className="cloud-cat-en">{cat.en}</span>
                </button>
              ))}
            </div>
            {/* key로 카테고리 전환마다 remount시켜 skillIn 애니메이션이 매번 다시 재생되게 한다 */}
            <div
              key={active.id}
              id={`skill-panel-${active.id}`}
              className="cloud-skillpanel"
              role="tabpanel"
              aria-labelledby={`skill-tab-${active.id}`}
            >
              <h3 className="cloud-skillpanel-name">{active.name}</h3>
              <div className="cloud-skillitems">
                {active.items.map((item) => (
                  <article key={item.name} className="cloud-skillitem cloud-letter-card">
                    <SkillIconBadge name={item.name} />
                    <div className="cloud-skillitem-body cloud-letter-sheet">
                      {/* <span className="cloud-letter-label">
                        NOTE · {String(index + 1).padStart(2, "0")}
                      </span> */}
                      <h4 className="cloud-skillitem-name">{item.name}</h4>
                      <p
                        className="cloud-skillitem-desc"
                        dangerouslySetInnerHTML={{ __html: item.descHtml }}
                      />
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
