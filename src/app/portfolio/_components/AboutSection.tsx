import { about, profile } from "../_data/profile";
import { CloudVeils } from "./CloudVeils";

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
              <svg
                className="cloud-about-shape"
                viewBox="20 20 640 430"
                preserveAspectRatio="none"
                aria-hidden="true"
                focusable="false"
              >
                <defs>
                  <linearGradient
                    id="aboutCloudFill"
                    gradientUnits="userSpaceOnUse"
                    x1="90"
                    y1="40"
                    x2="670"
                    y2="400"
                  >
                    <stop offset="0%" stopColor="#fbfbf7" />
                    <stop offset="100%" stopColor="#eaf6f3" />
                  </linearGradient>
                </defs>
                <path
                  d="M116 353C68 353 31 321 31 279C31 240 61 208 103 205C99 150 145 111 199 119C221 74 269 51 318 64C348 27 395 14 439 32C479 48 504 80 512 116C557 93 603 117 618 157C634 200 609 238 570 250C599 287 585 336 548 356C514 374 478 365 454 350C413 390 348 394 300 369C267 400 206 400 174 365C155 356 136 353 116 353Z"
                  fill="url(#aboutCloudFill)"
                  stroke="rgba(47, 58, 57, 0.34)"
                  strokeWidth="3"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
              <div className="cloud-about-text">
                {/* <p className="cloud-about-lead">{about.lead}</p> */}
                {about.paragraphs.map((p, i) => (
                  <p key={i} className="cloud-about-p">
                    {p}
                  </p>
                ))}
                <div className="cloud-tag-row">
                  {about.tags.map((tag) => (
                    <span key={tag} className="cloud-tag">
                      {tag}
                    </span>
                  ))}
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
