import { profile } from "../_data/profile";
import { teamEvidence, teamRecruitment } from "../_data/teamRecruitment";
import { GitHubIcon } from "./GitHubIcon";

export function TeamRecruitmentIntro() {
  return (
    <section id="team-intro" data-cloud-section className="cloud-section cloud-team-intro">
      <div className="cloud-veilwrap">
        <div data-content className="cloud-content">
          <div className="cloud-sechead">
            <h2>팀 찾기</h2>
          </div>
          <div className="cloud-about-layout">
            <div className="cloud-about-media">
              {/* eslint-disable-next-line @next/next/no-img-element -- 고정 표시폭이라 next/image 최적화 이득이 없다 */}
              <img
                className="cloud-about-photo"
                src={profile.photoSrc}
                alt={profile.photoAlt}
                width={260}
                height={312}
              />
            </div>
            <div className="cloud-about-card">
              <div className="cloud-about-text">
                <h3 className="cloud-about-name">{teamRecruitment.title}</h3>
                <p className="cloud-about-lead">{teamRecruitment.lead}</p>
                <p className="cloud-about-sub">{teamRecruitment.meta}</p>
                {teamRecruitment.paragraphs.map((paragraph) => (
                  <p key={paragraph} className="cloud-about-p">
                    {paragraph}
                  </p>
                ))}
                <div className="cloud-about-actions">
                  <a
                    className="cloud-btn dark"
                    href={profile.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <GitHubIcon className="cloud-btn-icon" />
                    GitHub에서 확인하기
                  </a>
                  <a
                    className="cloud-btn ghost"
                    href="https://ai-quiz-xi-livid.vercel.app/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    AI Quiz 보기
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function TeamEvidenceSection() {
  return (
    <section id="team-proof" data-cloud-section className="cloud-section cloud-team-proof">
      <div className="cloud-veilwrap">
        <div data-content className="cloud-content">
          <div className="cloud-sechead">
            <h2>함께할 이유</h2>
          </div>

          <div className="cloud-proof-board">
            <header className="cloud-proof-intro">
              <p className="cloud-proof-kicker">제가 합류하면</p>
              <h3>말보다 작업 기록으로 증명하겠습니다.</h3>
              <p>프론트엔드부터 협업 자동화까지, 팀이 완주하는 데 필요한 일을 찾아 움직입니다.</p>
            </header>

            <div className="cloud-proof-list">
              {teamEvidence.map((item) => (
                <article key={item.title} className="cloud-proof-item">
                  <div className="cloud-proof-heading">
                    <span className="cloud-proof-label">{item.label}</span>
                    <h4>{item.title}</h4>
                  </div>
                  <div className="cloud-proof-copy">
                    <p>{item.summary}</p>
                    <ul>
                      {item.details.map((detail) => (
                        <li key={detail}>{detail}</li>
                      ))}
                    </ul>
                    {item.link && (
                      <a href={item.link.href} target="_blank" rel="noopener noreferrer">
                        {item.link.label}
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
