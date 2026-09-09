import type { CountryPack, InternationalAssessment } from "shared";
import { InternationalEvidenceGrid } from "./InternationalEvidenceGrid";
import { allCountries } from "./model";

export function CountryWorkspace({
  assessment,
  jobText,
  pack,
  selectedCountry,
  onCountryChange,
  onJobTextChange,
  stamp4Covered,
  stamp4CheckState,
  onCheckStamp4,
}: {
  assessment: InternationalAssessment;
  jobText: string;
  pack: CountryPack;
  selectedCountry: string;
  onCountryChange: (country: string) => void;
  onJobTextChange: (text: string) => void;
  stamp4Covered: boolean;
  stamp4CheckState: "idle" | "loading" | "error";
  onCheckStamp4: () => void;
}) {
  return (
    <div className="international-content">
      <section className="international-heading country-workspace-heading">
        <div>
          <p className="eyebrow">
            {pack.supportLevel === "full"
              ? "Full pathway intelligence"
              : "Limited coverage — verification required"}
          </p>
          <h2>{selectedCountry}</h2>
          <p>{pack.limitations[0]}</p>
        </div>
        <label>
          Hiring country
          <select
            value={selectedCountry}
            onChange={(event) => onCountryChange(event.target.value)}
          >
            {allCountries.map((country) => (
              <option key={country}>{country}</option>
            ))}
          </select>
        </label>
      </section>
      <InternationalEvidenceGrid
        groups={[
          {
            title: "Possible pathways",
            items:
              pack.pathways.length > 0
                ? pack.pathways
                : ["No pathway calculation is provided in explorer mode."],
          },
          { title: "Required evidence", items: pack.requiredEvidence },
          { title: "Ask the recruiter", items: pack.recruiterQuestions },
        ]}
      />
      <section className="job-evidence-check">
        <div>
          <p className="eyebrow">Vacancy evidence check</p>
          <h2>Check the wording, not a legal probability</h2>
        </div>
        <label>
          Paste relevant vacancy wording
          <textarea
            rows={6}
            value={jobText}
            onChange={(event) => onJobTextChange(event.target.value)}
            placeholder="Include sponsorship, work-right, salary, contract, location and language wording."
          />
        </label>
        {stamp4Covered ? (
          <div className="stamp4-check">
            <button
              type="button"
              onClick={onCheckStamp4}
              disabled={!jobText.trim() || stamp4CheckState === "loading"}
            >
              {stamp4CheckState === "loading"
                ? "Checking official thresholds…"
                : "Check official thresholds"}
            </button>
            {stamp4CheckState === "error" ? (
              <span className="stamp4-check-error">
                Could not reach the official-threshold check. The evidence
                below still reflects the wording you pasted.
              </span>
            ) : assessment.stamp4Verified ? (
              <span className="stamp4-check-verified">
                ✓ Verified against official statutory thresholds
              </span>
            ) : (
              <span className="stamp4-check-hint">
                Based on vacancy wording only — run a check for a
                threshold-verified result.
              </span>
            )}
          </div>
        ) : null}
        <div
          className={`decision-callout ${
            assessment.confirmedBlockers.length ? "blocked" : ""
          }`}
        >
          <strong>{assessment.decision}</strong>
          <span>{assessment.nextAction}</span>
        </div>
        <details>
          <summary>Evidence ledger</summary>
          <InternationalEvidenceGrid
            groups={[
              { title: "Used", items: assessment.evidenceUsed },
              { title: "Missing", items: assessment.missingEvidence },
              { title: "Blockers", items: assessment.confirmedBlockers },
            ]}
          />
        </details>
      </section>
    </div>
  );
}
