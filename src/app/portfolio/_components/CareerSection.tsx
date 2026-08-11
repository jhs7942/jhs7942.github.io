import { loadPortfolioFragment } from "../_lib/loadFragment";

export function CareerSection() {
  return (
    <div className="ab-section" id="career">
      <div className="ab-sechead">
        <h2>SI 경력</h2>
        <span className="ab-sectag">2022 – 2024</span>
      </div>
      <div dangerouslySetInnerHTML={{ __html: loadPortfolioFragment("career") }} />
    </div>
  );
}
