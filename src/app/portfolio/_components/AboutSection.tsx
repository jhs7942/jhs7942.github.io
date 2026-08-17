import { about, profile } from "../_data/profile";
import { CloudVeils } from "./CloudVeils";
import { CopyEmailButton } from "./CopyEmailButton";
import { GitHubIcon } from "./GitHubIcon";

export function AboutSection() {
  return (
    <section id="about" data-cloud-section className="cloud-section">
      <div className="cloud-veilwrap">
        <div data-content className="cloud-content">
          <div className="cloud-sechead">
            <h2>소개</h2>
            <span className="cloud-sectag">ABOUT</span>
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
              <span className="cloud-about-cloud" aria-hidden="true" />
              <span
                className="cloud-about-cloud cloud-about-cloud--top"
                aria-hidden="true"
              />
              <span
                className="cloud-about-cloud cloud-about-cloud--left"
                aria-hidden="true"
              />
              <div className="cloud-about-text">
                <h3 className="cloud-about-name">{profile.name}</h3>
                <p className="cloud-about-lead">{profile.tagline}</p>
                <p className="cloud-about-sub">{profile.role}</p>
                {about.paragraphs.map((p, i) => (
                  <p key={i} className="cloud-about-p">
                    {p}
                  </p>
                ))}
                <div className="cloud-about-actions">
                  <a
                    className="cloud-btn dark"
                    href={profile.githubUrl}
                    target="_blank"
                    rel="noopener"
                  >
                    <GitHubIcon className="cloud-btn-icon" />
                    GitHub
                  </a>
                  <CopyEmailButton
                    email={profile.email}
                    className="cloud-btn ghost"
                  />
                </div>
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
