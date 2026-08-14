"use client";

import type { Project } from "../_data/projects";
import { GitHubIcon } from "./GitHubIcon";

const skillGroupRules = [
  { label: "프론트엔드", test: /React|TypeScript|Zustand|Tailwind|Vite|TanStack/i },
  { label: "백엔드", test: /Express|Socket|Zod/i },
  { label: "데이터베이스", test: /Supabase|PostgreSQL/i },
  { label: "인프라", test: /Vercel|Render/i },
] as const;

function groupProjectSkills(tags: string[]) {
  return skillGroupRules
    .map((group) => ({ ...group, tags: tags.filter((tag) => group.test.test(tag)) }))
    .filter((group) => group.tags.length > 0);
}

/**
 * 프로젝트 하나가 페이지(장) 하나를 통째로 차지한다 — 예전엔 ProjectsSection
 * 하나가 모든 프로젝트 카드를 세로로 나열한 목록이었지만, 덱으로 바뀌면서
 * 프로젝트 개수만큼 이 컴포넌트를 반복해 각각 독립된 장으로 만든다
 * (_data/pages.ts 가 projects 배열 길이만큼 장을 늘리고, page.tsx 가 그 순서에
 * 맞춰 이 컴포넌트를 하나씩 렌더링한다).
 */
export function ProjectPage({ project, index, total }: { project: Project; index: number; total: number }) {
  const skillGroups = groupProjectSkills(project.tags);
  const hasVisitUrl = Boolean(project.visitUrl);

  const openVisitSite = () => {
    if (project.visitUrl) {
      window.open(project.visitUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <section id={`project-${project.slug}`} data-cloud-section className="cloud-section">
      <div className="cloud-content">
        <div className="cloud-sechead">
          <h2>프로젝트</h2>
          <span className="cloud-sectag">
            PROJECTS · {index + 1}/{total}
          </span>
        </div>

        <div className="cloud-proj-layout">
          {project.mobileShot && (
            <div className="cloud-proj-shot">
              <div className="cloud-proj-phone">
                <span className="cloud-proj-phone-notch" aria-hidden />
                <span className="cloud-proj-phone-btn power" aria-hidden />
                <span className="cloud-proj-phone-btn vol-up" aria-hidden />
                <span className="cloud-proj-phone-btn vol-down" aria-hidden />
                <div className="cloud-proj-screen">
                  {/* eslint-disable-next-line @next/next/no-img-element -- 고정 표시폭이라 next/image 최적화 이득이 없다 */}
                  <img src={project.mobileShot.src} alt={project.mobileShot.alt} width={220} height={476} />
                </div>
              </div>
            </div>
          )}
          <div className="cloud-proj-list">
            <article
              className={`cloud-skillpanel cloud-proj-card${project.minor ? " minor" : ""}${hasVisitUrl ? " is-clickable" : ""}`}
              role={hasVisitUrl ? "link" : undefined}
              tabIndex={hasVisitUrl ? 0 : undefined}
              aria-label={hasVisitUrl ? `${project.title} 배포 사이트 열기` : undefined}
              onClick={hasVisitUrl ? openVisitSite : undefined}
              onKeyDown={
                hasVisitUrl
                  ? (event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openVisitSite();
                      }
                    }
                  : undefined
              }
            >
              <div className="cloud-proj-inner">
              <div className="cloud-proj-body">
                <div className="cloud-proj-top">
                  <h3 className="cloud-proj-title">{project.title}</h3>
                  {project.minor
                    ? project.tags.map((tag) => (
                        <span key={tag} className="cloud-ptag">
                          {tag}
                        </span>
                      ))
                    : project.badge && (
                        <span className="cloud-proj-badge" style={{ background: project.badgeColor }}>
                          {project.badge}
                        </span>
                      )}
                  <div className="cloud-proj-links">
                    {project.githubUrl && (
                      <a
                        className="cloud-proj-link gh"
                        href={project.githubUrl}
                        target="_blank"
                        rel="noopener"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <GitHubIcon className="cloud-proj-link-icon" />
                        상세보기
                      </a>
                    )}
                    {project.newsUrl && (
                      <a
                        className="cloud-proj-link news"
                        href={project.newsUrl}
                        target="_blank"
                        rel="noopener"
                        onClick={(event) => event.stopPropagation()}
                      >
                        관련 뉴스
                      </a>
                    )}
                  </div>
                </div>

                {!project.minor && skillGroups.length > 0 && (
                  <div className="cloud-proj-skillgroups">
                    {skillGroups.map((group) => (
                      <div key={group.label} className="cloud-proj-skillgroup">
                        <span className="cloud-proj-skillgroup-label">{group.label}</span>
                        <div className="cloud-ptag-row">
                          {group.tags.map((tag) => (
                            <span key={tag} className="cloud-ptag">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <p
                  className={`cloud-proj-desc${project.minor ? " minor" : ""}`}
                  dangerouslySetInnerHTML={{ __html: project.descHtml }}
                />

                {project.stats && (
                  <div className="cloud-stat-row">
                    {project.stats.map((s) => (
                      <span key={s.label} className="cloud-stat">
                        {s.label} <b>{s.value}</b>
                      </span>
                    ))}
                  </div>
                )}

              </div>
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
