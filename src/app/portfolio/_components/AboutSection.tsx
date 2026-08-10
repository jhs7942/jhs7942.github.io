import { about } from "../_data/profile";

export function AboutSection() {
  return (
    <div className="ab-section" id="about">
      <div className="ab-sechead">
        <h2>소개</h2>
        <span className="ab-sectag">ABOUT</span>
      </div>
      <div className="ab-main">
        <p className="ab-mlead" style={{ marginTop: 0 }}>
          {about}
        </p>
      </div>
    </div>
  );
}
