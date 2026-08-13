import type { Project } from "../_data/projects";
import { CloudCharacterDecor } from "./CloudCharacterDecor";
import { GitHubIcon } from "./GitHubIcon";

/**
 * 프로젝트 하나가 페이지(장) 하나를 통째로 차지한다 — 예전엔 ProjectsSection
 * 하나가 모든 프로젝트 카드를 세로로 나열한 목록이었지만, 덱으로 바뀌면서
 * 프로젝트 개수만큼 이 컴포넌트를 반복해 각각 독립된 장으로 만든다
 * (_data/pages.ts 가 projects 배열 길이만큼 장을 늘리고, page.tsx 가 그 순서에
 * 맞춰 이 컴포넌트를 하나씩 렌더링한다).
 */
export function ProjectPage({ project, index, total }: { project: Project; index: number; total: number }) {
  return (
    <section id={`project-${project.slug}`} data-cloud-section className="cloud-section">
      <div className="cloud-content">
        <div className="cloud-sechead">
          <h2>프로젝트</h2>
          <span className="cloud-sectag">
            PROJECTS · {index + 1}/{total}
          </span>
        </div>

        <div className="cloud-proj-list">
          <article className={`cloud-proj-card${project.minor ? " minor" : ""}`}>
            <CloudCharacterDecor characters={project.characters} />

            <div className="cloud-proj-inner">
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
                    {project.visitUrl && (
                      <a className="cloud-proj-link visit" href={project.visitUrl} target="_blank" rel="noopener">
                        배포 사이트 ↗
                      </a>
                    )}
                    {project.githubUrl && (
                      <a className="cloud-proj-link gh" href={project.githubUrl} target="_blank" rel="noopener">
                        <GitHubIcon className="cloud-proj-link-icon" />
                        GitHub
                      </a>
                    )}
                  </div>
                </div>

                {!project.minor && project.tags.length > 0 && (
                  <div className="cloud-ptag-row">
                    {project.tags.map((tag) => (
                      <span key={tag} className="cloud-ptag">
                        {tag}
                      </span>
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

                {project.newsUrl && (
                  <a className="cloud-proj-newslink" href={project.newsUrl} target="_blank" rel="noopener">
                    관련 뉴스 ↗
                  </a>
                )}
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
