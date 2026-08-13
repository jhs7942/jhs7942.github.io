"use client";

import { useState } from "react";
import { careerTimeline } from "../_data/career";
import { CloudVeils } from "./CloudVeils";

/** 카드 배경 구름 SVG — 소개 카드와 같은 path, 크기만 담는 컨테이너에 맞춰 늘어난다. */
function CloudShape({ fillId, tint }: { fillId: string; tint?: boolean }) {
  return (
    <svg className="cloud-tl-shape" viewBox="20 20 640 430" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={fillId} gradientUnits="userSpaceOnUse" x1="90" y1="40" x2="670" y2="400">
          {tint ? (
            <>
              <stop offset="0%" stopColor="#eef8f4" />
              <stop offset="100%" stopColor="#dcefe6" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="#fbfbf7" />
              <stop offset="100%" stopColor="#eaf6f3" />
            </>
          )}
        </linearGradient>
      </defs>
      <path
        d="M116 353C68 353 31 321 31 279C31 240 61 208 103 205C99 150 145 111 199 119C221 74 269 51 318 64C348 27 395 14 439 32C479 48 504 80 512 116C557 93 603 117 618 157C634 200 609 238 570 250C599 287 585 336 548 356C514 374 478 365 454 350C413 390 348 394 300 369C267 400 206 400 174 365C155 356 136 353 116 353Z"
        fill={`url(#${fillId})`}
        stroke="rgba(47, 58, 57, 0.34)"
        strokeWidth="3"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function CareerSection() {
  // 제타럭스시스템처럼 subProjects를 가진 카드만 토글 대상 — index로 열림 상태를 추적한다.
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="career" data-cloud-section className="cloud-section">
      <div className="cloud-veilwrap">
        <div data-content className="cloud-content">
          <div className="cloud-sechead">
            <h2>경험</h2>
            <span className="cloud-sectag">CAREER &amp; EDUCATION</span>
          </div>

          {careerTimeline.map((entry, i) => {
            const isLeft = i % 2 === 0;
            const isLast = i === careerTimeline.length - 1;
            const isOpen = openIndex === i;
            const fillId = `tlCloudFill-${i}`;
            const card = (
              <div className={`cloud-tl-inner${entry.tint ? " tint" : ""}`}>
                {/* 소개 카드와 똑같은 구름 path — 크기만 카드에 맞게 줄었다.
                    자세한 이유는 portfolio.css의 .cloud-tl-shape 주석 참고. */}
                <CloudShape fillId={fillId} tint={entry.tint} />
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
                  {entry.subProjects && (
                    <button
                      type="button"
                      className="cloud-tl-toggle"
                      onClick={() => setOpenIndex(isOpen ? null : i)}
                      aria-expanded={isOpen}
                    >
                      {isOpen ? "업무 접기 ▲" : "업무 보기 ▾"}
                    </button>
                  )}
                </div>
              </div>
            );
            return (
              <div key={entry.title}>
                <div className={`cloud-tl-row${isLeft ? " side-left" : ""}${isLast && !isOpen ? " last" : ""}`}>
                  <div className="cloud-tl-card">{card}</div>
                </div>
                {/* "업무 보기"를 누르면 하위 SI 프로젝트 3건이 카드 하나 안에 항목별로
                    나열된다 — 새로 만들지 않고 스킬 섹션의 카드(.cloud-skillpanel/
                    .cloud-skillitem)를 그대로 재사용했다. 트리거가 된 카드와 같은 쪽
                    (side-left 여부)에 붙여서 "이 카드에서 펼쳐졌다"는 연관성을 보여준다. */}
                {entry.subProjects && isOpen && (
                  <div className={`cloud-skillpanel cloud-tl-subpanel${isLeft ? " side-left" : ""}`}>
                    <div className="cloud-skillitems">
                      {entry.subProjects.map((sp) => (
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
                              <a className="cloud-skillitem-src" href={sp.link.href} target="_blank" rel="noopener">
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
      </div>
    </section>
  );
}
