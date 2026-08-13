import { projects } from "../_data/projects";
import { CloudCharacterDecor } from "./CloudCharacterDecor";
import { CloudVeils } from "./CloudVeils";
import { Footer } from "./Footer";

export function ProjectsSection() {
  return (
    <section id="projects" data-cloud-section className="cloud-section last">
      <div data-content className="cloud-content">
        <div className="cloud-sechead">
          <h2>프로젝트</h2>
          <span className="cloud-sectag">PROJECTS</span>
        </div>

        <div className="cloud-proj-list">
          {projects.map((project) => (
            <article key={project.slug} className={`cloud-proj-card${project.minor ? " minor" : ""}`}>
              <CloudCharacterDecor characters={project.characters} />

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
                      GitHub ↗
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
            </article>
          ))}
        </div>

        <Footer />
      </div>
      <CloudVeils
        left={[
          { right: 6, top: 6, width: 42 },
          { right: 14, top: 38, width: 50 },
          { right: 2, bottom: 4, width: 36 },
        ]}
        right={[
          { left: 5, top: 14, width: 44 },
          { left: 16, top: 46, width: 48 },
          { left: 3, bottom: 2, width: 34 },
        ]}
      />
    </section>
  );
}
