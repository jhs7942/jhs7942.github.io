import { profile } from "../_data/profile";
import { CloudVeils } from "./CloudVeils";
import { CopyEmailButton } from "./CopyEmailButton";

export function Hero() {
  return (
    <header id="top" data-cloud-section className="cloud-section hero">
      <div data-content className="cloud-hero-content">
        <p className="cloud-eyebrow">PORTFOLIO · 2026</p>
        <h1 className="cloud-name">{profile.name}</h1>
        <p className="cloud-role">{profile.role}</p>
        <p className="cloud-rolesub">{profile.heroTagline}</p>
        <div className="cloud-cta-row">
          <a className="cloud-btn dark" href={profile.githubUrl} target="_blank" rel="noopener">
            GitHub
          </a>
          <CopyEmailButton email={profile.email} className="cloud-btn ghost" />
          <a className="cloud-btn ghost" href={profile.blogUrl} target="_blank" rel="noopener">
            BLOG
          </a>
        </div>
        <p className="cloud-scroll-hint">SCROLL ↓</p>
      </div>
      <CloudVeils
        left={[
          { right: 6, top: 6, width: 44 },
          { right: 14, top: 38, width: 52 },
          { right: 2, bottom: 4, width: 38 },
        ]}
        right={[
          { left: 6, top: 14, width: 46 },
          { left: 16, top: 46, width: 50 },
          { left: 3, bottom: 2, width: 36 },
        ]}
      />
    </header>
  );
}
