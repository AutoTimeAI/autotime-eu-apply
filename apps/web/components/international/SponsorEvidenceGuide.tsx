import type { CountryPack } from "shared";

const levels = [
  "Employer appears on an official register",
  "Vacancy explicitly offers sponsorship",
  "Sponsorship is only a positive signal",
  "No evidence found",
];

export function SponsorEvidenceGuide({ pack }: { pack: CountryPack }) {
  return (
    <div className="international-content">
      <section className="international-heading">
        <div>
          <p className="eyebrow">Evidence, not a promise</p>
          <h2>Sponsor employers</h2>
          <p>
            AutoTime does not ship an unverified employer list. Use the official
            register where one exists, then verify sponsorship for the vacancy
            itself.
          </p>
        </div>
      </section>
      <section className="employer-evidence-levels">
        {levels.map((label, index) => (
          <article key={label}>
            <span>0{index + 1}</span>
            <h3>{label}</h3>
            <p>
              {index === 0
                ? "Entity-level evidence only; it does not apply automatically to every vacancy."
                : "Record the source, employing entity and checked date before relying on it."}
            </p>
          </article>
        ))}
      </section>
      {pack.sources
        .filter((source) => source.title.toLowerCase().includes("register"))
        .map((source) => (
          <a
            className="primary-link"
            href={source.url}
            key={source.url}
            rel="noreferrer"
            target="_blank"
          >
            Open official {source.title}
          </a>
        ))}
    </div>
  );
}
