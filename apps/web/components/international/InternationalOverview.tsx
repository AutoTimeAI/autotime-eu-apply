import type { CountryPack, InternationalAssessment } from "shared";
import { InternationalEvidenceGrid } from "./InternationalEvidenceGrid";
import { fullCountries, type InternationalSection } from "./model";

export function InternationalOverview({
  assessment,
  completeness,
  pack,
  selectedCountry,
  onCountryChange,
  onSectionChange,
}: {
  assessment: InternationalAssessment;
  completeness: number;
  pack: CountryPack;
  selectedCountry: string;
  onCountryChange: (country: string) => void;
  onSectionChange: (section: InternationalSection) => void;
}) {
  return (
    <div className="international-content">
      <section className="international-lead-panel">
        <div>
          <span className={`international-status ${assessment.pathwayStatus}`}>
            {assessment.pathwayStatus.replaceAll("-", " ")}
          </span>
          <h2>{assessment.decision}</h2>
          <p>{assessment.nextAction}</p>
        </div>
        <dl>
          <div>
            <dt>Profile completeness</dt>
            <dd>{completeness}%</dd>
          </div>
          <div>
            <dt>Selected country</dt>
            <dd>{selectedCountry}</dd>
          </div>
          <div>
            <dt>Coverage</dt>
            <dd>
              {pack.supportLevel === "full"
                ? "Full pathway intelligence"
                : "Limited — verify"}
            </dd>
          </div>
        </dl>
      </section>
      <section>
        <div className="international-heading">
          <div>
            <p className="eyebrow">Country support</p>
            <h2>Choose a hiring country</h2>
          </div>
        </div>
        <div className="country-choice-grid">
          {[...fullCountries, "Other Europe"].map((country) => {
            const value = country === "Other Europe" ? "Belgium" : country;
            return (
              <button
                className={
                  selectedCountry === value ||
                  (country === "Other Europe" &&
                    !fullCountries.includes(selectedCountry))
                    ? "selected"
                    : ""
                }
                key={country}
                onClick={() => {
                  onCountryChange(value);
                  onSectionChange("country");
                }}
                type="button"
              >
                <strong>{country}</strong>
                <span>
                  {country === "Other Europe"
                    ? "Explore and verify"
                    : "Full pathway intelligence"}
                </span>
              </button>
            );
          })}
        </div>
      </section>
      <InternationalEvidenceGrid
        groups={[
          {
            title: "Outstanding verification",
            items: assessment.missingEvidence.slice(0, 4),
          },
          {
            title: "What AutoTime cannot confirm",
            items: assessment.cannotConfirm,
          },
        ]}
      />
    </div>
  );
}
