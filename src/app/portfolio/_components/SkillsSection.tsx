"use client";

import { useEffect, useRef, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

  // Base UI 탭은 탭 목록에 포커스가 있을 때만 화살표 키를 처리한다.
  // 이 페이지는 카드 어디에 있든 ↑↓ 로 카테고리를 넘길 수 있어야 해서
  // 창 전역 리스너를 그대로 유지한다.
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
            <h2>기술 스택</h2>
          </div>
          {/* 눈에 보이는 스타일은 전부 portfolio.css 의 .cloud-* 클래스가 쥐고 있다.
              (레이어 없는 CSS라 Tailwind 유틸보다 우선한다)
              여기 className 은 그 스타일과 충돌하는 유틸만 되돌린다. */}
          <Tabs
            value={activeId}
            onValueChange={(value) => setActiveId(value as string)}
            orientation="vertical"
            className="cloud-skillwrap"
          >
            <TabsList
              variant="line"
              className="cloud-cat-list"
              aria-label="기술 스택 카테고리"
            >
              {skillCategories.map((cat, index) => (
                <TabsTrigger
                  key={cat.id}
                  value={cat.id}
                  ref={(element) => {
                    categoryRefs.current[index] = element;
                  }}
                  // flex-1·h-[calc(100%-1px)] 은 손그림 카드 높이를 무너뜨리고,
                  // after: 인디케이터는 형광펜 효과와 겹친다.
                  className="cloud-cat-btn h-auto flex-none after:hidden"
                >
                  <span className="cloud-cat-name">{cat.name}</span>
                  <span className="cloud-cat-en">{cat.en}</span>
                </TabsTrigger>
              ))}
            </TabsList>
            {/* key로 카테고리 전환마다 remount시켜 skillIn 애니메이션이 매번 다시 재생되게 한다 */}
            <TabsContent
              key={active.id}
              value={active.id}
              className="cloud-skillpanel"
            >
              <h3 className="cloud-skillpanel-name">{active.name}</h3>
              <div className="cloud-skillitems">
                {active.items.map((item) => (
                  <article key={item.name} className="cloud-skillitem cloud-letter-card">
                    <SkillIconBadge name={item.name} />
                    <div className="cloud-skillitem-body cloud-letter-sheet">
                      <h4 className="cloud-skillitem-name">{item.name}</h4>
                      <p
                        className="cloud-skillitem-desc"
                        dangerouslySetInnerHTML={{ __html: item.descHtml }}
                      />
                    </div>
                  </article>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </section>
  );
}
