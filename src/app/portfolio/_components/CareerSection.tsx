import { careerTimeline } from "../_data/career";
import { CloudVeils } from "./CloudVeils";

export function CareerSection() {
  return (
    <section id="career" data-cloud-section className="cloud-section">
      <div data-content className="cloud-content">
        <div className="cloud-sechead">
          <h2>경험</h2>
          <span className="cloud-sectag">CAREER &amp; EDUCATION</span>
        </div>

        {careerTimeline.map((entry, i) => {
          const isLeft = i % 2 === 0;
          const isLast = i === careerTimeline.length - 1;
          const card = (
            <div className={`cloud-tl-inner${entry.tint ? " tint" : ""}`}>
              <div className="cloud-tl-meta">
                <span className="cloud-tl-kind" style={{ background: entry.kindColor }}>
                  {entry.kind}
                </span>
                <span className="cloud-tl-when">{entry.when}</span>
              </div>
              <h3 className="cloud-tl-title">{entry.title}</h3>
              {entry.sub && (
                <p className="cloud-tl-sub" style={{ color: entry.subColor }}>
                  {entry.sub}
                </p>
              )}
              <p className="cloud-tl-desc">{entry.desc}</p>
              {entry.link && (
                <a className="cloud-tl-link" href={entry.link.href} target="_blank" rel="noopener">
                  {entry.link.label}
                </a>
              )}
            </div>
          );
          return (
            <div key={entry.title} className={`cloud-tl-row${isLeft ? " side-left" : ""}${isLast ? " last" : ""}`}>
              <div className="cloud-tl-card">{card}</div>
              <div className="cloud-tl-line">
                <span className="cloud-tl-dot" style={{ background: entry.kindColor }} />
              </div>
            </div>
          );
        })}
      </div>
      <CloudVeils
        left={[
          { right: 6, top: 10, width: 40 },
          { right: 14, top: 42, width: 48 },
          { right: 2, bottom: 4, width: 34 },
        ]}
        right={[
          { left: 5, top: 12, width: 44 },
          { left: 16, top: 44, width: 46 },
          { left: 3, bottom: 2, width: 32 },
        ]}
      />
    </section>
  );
}
