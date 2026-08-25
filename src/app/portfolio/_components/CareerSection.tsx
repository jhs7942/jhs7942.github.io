"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { careerTimeline, type CareerEntry, type CareerSubProject } from "../_data/career";

const careerEntries = careerTimeline.filter((entry) => entry.kind !== "EDUCATION");
const educationEntries = careerTimeline.filter((entry) => entry.kind === "EDUCATION");

type TimelineSectionProps = {
  id: "career" | "education";
  title: string;
  entries: CareerEntry[];
};

function TimelineSection({ id, title, entries }: TimelineSectionProps) {
  const [openProject, setOpenProject] = useState<CareerSubProject | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !openProject || dialog.open) return;
    dialog.showModal();
  }, [openProject]);

  useEffect(() => {
    if (!openProject) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      dialogRef.current?.close();
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [openProject]);

  function openLetter(project: CareerSubProject, button: HTMLButtonElement) {
    if (!project.letter) return;
    openerRef.current = button;
    setOpenProject(project);
  }

  function closeLetter() {
    dialogRef.current?.close();
  }

  function handleDialogClose() {
    setOpenProject(null);
    openerRef.current?.focus();
  }

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) closeLetter();
  }

  // 모든 항목을 요약 뒤에 상세 패널이 이어지는 한 방향 흐름으로 배치한다.
  return (
    <section id={id} data-cloud-section className="cloud-section">
      <div className="cloud-veilwrap">
        <div data-content className="cloud-content">
          <div className="cloud-sechead">
            <h2>{title}</h2>
          </div>

          {entries.map((entry, i) => {
            const isLast = i === entries.length - 1;
            const card = (
              <div className={`cloud-tl-inner${entry.tint ? " tint" : ""}`}>
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
                        {entry.subProjects?.map((project) => (
                          <article
                            key={project.title}
                            className={`cloud-skillitem${project.letter ? " is-letter" : ""}`}
                          >
                            <button
                              type="button"
                              className={`cloud-career-project-button${project.image ? " has-photo" : ""}`}
                              disabled={!project.letter}
                              aria-haspopup={project.letter ? "dialog" : undefined}
                              aria-label={project.letter ? `${project.title} 회고 편지 열기` : undefined}
                              onClick={(event) => openLetter(project, event.currentTarget)}
                            >
                              <span className="cloud-career-project-copy">
                                <span className="cloud-skillitem-name">
                                  {project.title}
                                  <span className="cloud-tl-subwhen">{project.when}</span>
                                </span>
                                <span className="cloud-tl-subdesc-list">
                                  {project.desc.map((line) => (
                                    <span key={line}>{line}</span>
                                  ))}
                                </span>
                                {project.letter && <span className="cloud-career-open-hint">회고 편지 열기</span>}
                              </span>
                              {project.image && (
                                <span
                                  className={`cloud-career-project-photo${project.image.orientation === "portrait" ? " is-portrait" : ""}`}
                                  aria-hidden="true"
                                >
                                  <span className="cloud-career-photo-tape" />
                                  <Image
                                    src={project.image.src}
                                    alt=""
                                    width={project.image.width}
                                    height={project.image.height}
                                    sizes={project.image.orientation === "portrait" ? "230px" : "(max-width: 1100px) calc(100vw - 96px), 34vw"}
                                  />
                                  <span className="cloud-career-photo-caption">{project.image.caption}</span>
                                  <span className="cloud-career-photo-mark">FIELD VIEW</span>
                                </span>
                              )}
                            </button>
                            {project.link && (
                              <a
                                className="cloud-skillitem-src cloud-live-link"
                                href={project.link.href}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {project.link.label}
                              </a>
                            )}
                          </article>
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

      <dialog
        ref={dialogRef}
        className="cloud-career-dialog"
        aria-labelledby="career-letter-title"
        aria-describedby="career-letter-lead"
        onClose={handleDialogClose}
        onCancel={(event) => {
          event.preventDefault();
          closeLetter();
        }}
        onClick={handleBackdropClick}
      >
        {openProject?.letter && (
          <div className="cloud-career-letter">
            <div className="cloud-career-letter-edge" aria-hidden="true" />
            <header className="cloud-career-letter-header">
              <div>
                <p className="cloud-career-letter-kicker">PROJECT NOTE · {openProject.when || "MAINTENANCE"}</p>
                <h3 id="career-letter-title">{openProject.title}</h3>
              </div>
              <div className="cloud-career-postmark" aria-hidden="true">
                <span>회고</span>
                <small>다시 쓰는 기록</small>
              </div>
            </header>

            <div className="cloud-career-letter-scroll">
              <p id="career-letter-lead" className="cloud-career-letter-lead">
                {openProject.letter.lead}
              </p>
              <div className="cloud-career-letter-sections">
                {openProject.letter.sections.map((section) => (
                  <section key={section.label} className="cloud-career-letter-section">
                    <p>{section.label}</p>
                    <div>
                      <h4>{section.title}</h4>
                      <p>{section.body}</p>
                    </div>
                  </section>
                ))}
              </div>
              <p className="cloud-career-letter-signoff">그때의 선택을 기록하고, 다음 선택을 더 나아지게 합니다.</p>
            </div>

            <button
              type="button"
              className="cloud-career-letter-close"
              onClick={closeLetter}
              aria-label="프로젝트 회고 편지 닫기"
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
        )}
      </dialog>
    </section>
  );
}

export function CareerSection() {
  return <TimelineSection id="career" title="경력" entries={careerEntries} />;
}

export function EducationSection() {
  return <TimelineSection id="education" title="교육" entries={educationEntries} />;
}
