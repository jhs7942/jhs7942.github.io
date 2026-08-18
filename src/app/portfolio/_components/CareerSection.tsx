"use client";

import { careerTimeline, type CareerEntry } from "../_data/career";
import { CloudShape } from "./CloudShape";

const careerEntries = careerTimeline.filter((entry) => entry.kind !== "EDUCATION");
const educationEntries = careerTimeline.filter((entry) => entry.kind === "EDUCATION");

type TimelineSectionProps = {
  id: "career" | "education";
  title: string;
  entries: CareerEntry[];
};

function TimelineSection({ id, title, entries }: TimelineSectionProps) {
  // 모든 항목을 구름 요약 뒤에 가로형 상세 패널이 이어지는 한 방향 흐름으로 배치한다.
  return (
    <section id={id} data-cloud-section className="cloud-section">
      <div className="cloud-veilwrap">
        <div data-content className="cloud-content">
          <div className="cloud-sechead">
            <h2>{title}</h2>
          </div>

          {entries.map((entry, i) => {
            const isLast = i === entries.length - 1;
            const fillId = `${id}-tlCloudFill-${i}`;
            const card = (
              <div
                className={`cloud-tl-inner${entry.tint ? " tint" : ""}`}
              >
                {/* 소개 카드와 똑같은 구름 path — 크기만 카드에 맞게 줄었다.
                    자세한 이유는 portfolio.css의 .cloud-tl-shape 주석 참고. */}
                <CloudShape fillId={fillId} />
                <div className="cloud-tl-body">
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
              </div>
            );
            return (
              <div key={entry.title}>
                <div className={`cloud-tl-row${isLast ? " last" : ""}`}>
                  <div className="cloud-tl-card">{card}</div>
                  {(entry.details || entry.subProjects) && (
                    <div
                      className={`cloud-skillpanel cloud-tl-subpanel${entry.kind === "EDUCATION" ? " education" : ""}`}
                    >
                      <div className="cloud-skillitems">
                        {entry.kind === "EDUCATION" && entry.details && (
                          <div className="cloud-skillitem">
                            <div className="cloud-skillitem-body">
                              <p className="cloud-skillitem-name">교육 상세</p>
                              <ul className="cloud-tl-subdesc-list">
                                {entry.details.map((line) => (
                                  <li key={line}>{line}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}
                        {entry.subProjects?.map((sp) => (
                          <div key={sp.title} className="cloud-skillitem">
                            <div className="cloud-skillitem-body">
                              <p className="cloud-skillitem-name">
                                {sp.title}
                                <span className="cloud-tl-subwhen">{sp.when}</span>
                              </p>
                              <ul className="cloud-tl-subdesc-list">
                                {sp.desc.map((line) => (
                                  <li key={line}>{line}</li>
                                ))}
                              </ul>
                              {sp.link && (
                                <a
                                  className="cloud-skillitem-src cloud-live-link"
                                  href={sp.link.href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  {sp.link.label}
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function CareerSection() {
  return <TimelineSection id="career" title="경력" entries={careerEntries} />;
}

export function EducationSection() {
  return <TimelineSection id="education" title="교육" entries={educationEntries} />;
}
