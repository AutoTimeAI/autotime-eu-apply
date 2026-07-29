import { getInternationalCountryPack } from "shared";

const countries = ["Ireland", "Germany", "Netherlands", "Belgium"];

export function OfficialSourcesPanel() {
  const sources = countries
    .flatMap((country) => getInternationalCountryPack(country).sources)
    .filter(
      (source, index, items) =>
        items.findIndex((item) => item.url === source.url) === index,
    );

  return (
    <div className="international-content">
      <section className="international-heading">
        <div>
          <p className="eyebrow">Source governance</p>
          <h2>Official sources</h2>
          <p>
            Rules are versioned and reviewed without embedding volatile legal
            thresholds in UI code.
          </p>
        </div>
      </section>
      <div className="source-list">
        {sources.map((source) => (
          <article key={source.url}>
            <div>
              <strong>{source.title}</strong>
              <span>{source.publisher}</span>
            </div>
            <dl>
              <div>
                <dt>Jurisdiction</dt>
                <dd>{source.jurisdiction}</dd>
              </div>
              <div>
                <dt>Reviewed</dt>
                <dd>{source.reviewedAt}</dd>
              </div>
              <div>
                <dt>Rule version</dt>
                <dd>{source.ruleVersion}</dd>
              </div>
            </dl>
            <a href={source.url} rel="noreferrer" target="_blank">
              Open official source
            </a>
          </article>
        ))}
      </div>
    </div>
  );
}
