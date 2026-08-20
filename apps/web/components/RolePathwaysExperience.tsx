"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ESCO_CACHE_VERSION,
  ROLE_PATHWAYS_SCHEMA_VERSION,
  competencyEvidenceSchema,
  laneSelectionSchema,
  rolePreferencesSchema,
  type CompetencyEvidence,
  type RolePreferences,
  type RoleRecommendation,
} from "shared";
import { useDashboardPlan } from "./UserNav";
import {
  loadLaneSelection,
  loadRolePathwaysProgress,
  saveLaneSelection,
  saveRolePathwaysProgress,
} from "../lib/role-pathways-storage";
import { loadMobilityProfile } from "../lib/international-mobility-storage";

type GenerateResponse = {
  data: {
    evidence: CompetencyEvidence[];
    ambiguous: string[];
    recommendations: RoleRecommendation[];
    metadata: { escoVersion: string; generatedAt: string; aiMode: string };
  } | null;
  error: string | null;
};
const defaults: RolePreferences = {
  countries: ["Ireland"],
  workStyle: "mixed",
  codingPreference: "some",
  stakeholderPreference: "some",
  workingModel: "flexible",
  salaryPreference: "",
  supportRequired: "unsure",
  languages: [{ language: "English", proficiency: "professional" }],
  areas: [],
};
const dashboardKey = (userId: string) =>
  `autotime-v2-companion-dashboard:${userId.trim()}`;
function savedCandidateText(userId: string) {
  try {
    const value = JSON.parse(
      localStorage.getItem(dashboardKey(userId)) ?? "null",
    ) as { profile?: Record<string, unknown> } | null;
    const profile = value?.profile;
    if (!profile) return "";
    return [
      profile.baseCvText,
      profile.experienceHighlights,
      profile.projectSummaries,
      profile.targetRoles,
    ]
      .filter((item) => typeof item === "string")
      .join("\n\n");
  } catch {
    return "";
  }
}
function recommendationGroup(item: RoleRecommendation) {
  if (item.transitionDistance === "direct match") return "Best fit";
  if (item.transitionDistance === "one-step adjacent") return "Adjacent";
  if (item.transitionDistance === "two-step transition") return "Alternative";
  return "Longer term";
}
function Score({ label, value }: { label: string; value: number }) {
  return (
    <div className="pathway-score">
      <span>{label}</span>
      <strong>{value}/100</strong>
      <div>
        <i style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
export function RolePathwaysExperience() {
  const { userId } = useDashboardPlan();
  const [stage, setStage] = useState(1);
  const [candidateText, setCandidateText] = useState("");
  const [preferences, setPreferences] = useState<RolePreferences>(defaults);
  const [evidence, setEvidence] = useState<CompetencyEvidence[]>([]);
  const [recommendations, setRecommendations] = useState<RoleRecommendation[]>(
    [],
  );
  const [selectedRole, setSelectedRole] = useState<RoleRecommendation | null>(
    null,
  );
  const [primary, setPrimary] = useState("");
  const [secondary, setSecondary] = useState<string[]>([]);
  const [explorer, setExplorer] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const activeStepRef = useRef<HTMLLIElement>(null);
  useEffect(() => {
    activeStepRef.current?.scrollIntoView({
      block: "nearest",
      inline: "center",
    });
  }, [stage]);
  useEffect(() => {
    setCandidateText(savedCandidateText(userId));
    const saved = loadLaneSelection(localStorage, userId);
    if (saved) {
      setPrimary(saved.primary);
      setSecondary(saved.secondary);
      setExplorer(saved.explorer ?? "");
    }
    // Extracted/confirmed evidence, recommendations, the selected role and
    // the current stage previously had no persistence at all, so leaving
    // and returning to this page always reset to Stage 1 with everything
    // empty - see issue #52. Only trust a saved snapshot from the same
    // ESCO catalogue version, matching loadLaneSelection's own guard.
    const progress = loadRolePathwaysProgress(localStorage, userId);
    if (progress && progress.catalogueVersion === ESCO_CACHE_VERSION) {
      setCandidateText(progress.candidateText);
      setStage(progress.stage);
      setEvidence(progress.evidence);
      setRecommendations(progress.recommendations as unknown as RoleRecommendation[]);
      setSelectedRole(
        progress.selectedRole as unknown as RoleRecommendation | null,
      );
    }
    setHydrated(true);
    const mobility = loadMobilityProfile(localStorage, userId).profile;
    const supportedCountries = mobility.targetCountries.filter(
      (country): country is RolePreferences["countries"][number] =>
        country === "Ireland" ||
        country === "Germany" ||
        country === "Netherlands",
    );
    setPreferences((current) => ({
      ...current,
      countries: supportedCountries.length
        ? supportedCountries
        : current.countries,
      supportRequired: mobility.sponsorshipRequired,
    }));
  }, [userId]);
  // Persists whenever any of the pieces that used to be lost on navigation
  // change, rather than at each individual mutation call site - fewer
  // places to remember to update, and it can't drift out of sync with a
  // handler that forgets to save. Gated on `hydrated` so this doesn't fire
  // with the pre-restore empty defaults before the mount effect above has
  // had a chance to load any existing progress.
  useEffect(() => {
    if (!hydrated || !userId) return;
    try {
      saveRolePathwaysProgress(localStorage, userId, {
        schemaVersion: ROLE_PATHWAYS_SCHEMA_VERSION,
        catalogueVersion: ESCO_CACHE_VERSION,
        userId,
        stage,
        candidateText,
        evidence,
        recommendations: recommendations as unknown as Record<
          string,
          unknown
        >[],
        selectedRole: selectedRole as unknown as Record<
          string,
          unknown
        > | null,
        savedAt: new Date().toISOString(),
      });
    } catch {
      // Best-effort persistence - a transient parse failure just means this
      // particular change isn't saved; the next mutation will retry.
    }
  }, [hydrated, userId, stage, candidateText, evidence, recommendations, selectedRole]);
  const generate = async () => {
    setBusy(true);
    setStatus("");
    try {
      const response = await fetch("/api/role-pathways/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateText,
          preferences,
          confirmedEvidence: evidence.filter((item) => item.confirmed),
          jobs: [],
        }),
      });
      const payload = (await response.json()) as GenerateResponse;
      if (!response.ok || !payload.data)
        throw new Error(payload.error ?? "Role discovery is unavailable.");
      setEvidence(
        payload.data.evidence.filter(
          (item, index, all) =>
            all.findIndex(
              (other) => other.competencyId === item.competencyId,
            ) === index,
        ),
      );
      setRecommendations(payload.data.recommendations);
      setStage(evidence.length ? 3 : 1);
      setStatus(
        `Generated with ${payload.data.metadata.escoVersion}. No score is a hiring probability.`,
      );
    } catch (error: unknown) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Role discovery failed safely.",
      );
    } finally {
      setBusy(false);
    }
  };
  const confirmEvidence = (index: number, confirmed: boolean) =>
    setEvidence((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, confirmed } : item,
      ),
    );
  const grouped = useMemo(() => {
    const filtered = recommendations.filter((item) =>
      `${item.occupation.preferredTitle} ${item.occupation.family}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    );
    return {
      best: filtered
        .filter((item) => recommendationGroup(item) === "Best fit")
        .slice(0, 5),
      adjacent: filtered
        .filter((item) => recommendationGroup(item) === "Adjacent")
        .slice(0, 5),
      alternative: filtered
        .filter((item) => recommendationGroup(item) === "Alternative")
        .slice(0, 3),
      longer: filtered
        .filter((item) => recommendationGroup(item) === "Longer term")
        .slice(0, 3),
    };
  }, [query, recommendations]);
  const save = () => {
    const selected = recommendations.find(
      (item) => item.occupation.id === primary,
    );
    if (
      !selected ||
      selected.transitionDistance === "unsupported by current evidence" ||
      selected.transitionDistance === "major retraining required"
    ) {
      setStatus(
        "Primary and secondary lanes require current evidence. Keep unsupported aspirations in Explorer.",
      );
      return;
    }
    try {
      const value = laneSelectionSchema.parse({
        schemaVersion: ROLE_PATHWAYS_SCHEMA_VERSION,
        catalogueVersion: ESCO_CACHE_VERSION,
        userId,
        primary,
        secondary,
        explorer: explorer || undefined,
        savedAt: new Date().toISOString(),
      });
      saveLaneSelection(localStorage, userId, value);
      setStatus(
        "Career lanes saved for this authenticated account in this browser.",
      );
    } catch {
      setStatus(
        "Choose one primary lane, up to two distinct secondary lanes, and an optional explorer.",
      );
    }
  };
  const cards = (items: RoleRecommendation[]) =>
    items.map((item) => (
      <button
        className="pathway-card"
        key={item.occupation.id}
        onClick={() => {
          setSelectedRole(item);
          setStage(4);
        }}
        type="button"
      >
        <span className="pathway-card-top">
          <span>
            <small>{item.occupation.family.replaceAll("-", " ")}</small>
            <strong>{item.occupation.preferredTitle}</strong>
          </span>
          <b>{item.capabilityScore}</b>
        </span>
        <span>
          {item.transitionDistance} · {item.countryMarketSignal}
        </span>
        <span>
          {item.missingEssentialCompetencies.length
            ? `${item.missingEssentialCompetencies.length} essential gaps`
            : "Essential competency coverage confirmed"}
        </span>
      </button>
    ));
  return (
    <main className="role-pathways-shell phase-six-career-direction">
      <header className="role-pathways-hero">
        <div>
          <p className="eyebrow">Europe-first career intelligence</p>
          <h1>Role Pathways</h1>
          <p>
            Discover credible technology lanes from confirmed evidence, ESCO
            occupations and country-specific vacancy observations.
          </p>
        </div>
        <span>
          ESCO cache
          <br />
          <strong>{ESCO_CACHE_VERSION}</strong>
        </span>
      </header>
      <ol className="pathway-steps" aria-label="Role Pathways stages">
        {[
          "Confirm evidence",
          "Set preferences",
          "Generate pathways",
          "Role detail",
          "Select lanes",
        ].map((label, index) => (
          <li
            className={
              stage === index + 1 ? "active" : stage > index + 1 ? "done" : ""
            }
            key={label}
            ref={stage === index + 1 ? activeStepRef : undefined}
          >
            <button
              disabled={
                (index + 1 >= 2 && !evidence.some((item) => item.confirmed)) ||
                (index + 1 >= 3 && !recommendations.length) ||
                (index + 1 >= 4 && !selectedRole)
              }
              type="button"
              onClick={() => setStage(index + 1)}
            >
              <b>{index + 1}</b>
              {label}
            </button>
          </li>
        ))}
      </ol>
      {stage === 1 ? (
        <section className="pathway-panel">
          <div className="pathway-heading">
            <div>
              <p className="eyebrow">Stage 1</p>
              <h2>Confirm the evidence base</h2>
              <p>
                Only confirmed evidence contributes to a recommendation.
                Education remains education—not professional experience.
              </p>
            </div>
          </div>
          <label>
            CV, project and experience evidence
            <textarea
              rows={9}
              value={candidateText}
              onChange={(event) => setCandidateText(event.target.value)}
              placeholder="Your saved profile appears here. Add only evidence you are comfortable sending for server-side extraction."
            />
          </label>
          {evidence.length ? (
            <div className="evidence-review">
              {evidence.map((item, index) => (
                <article key={item.competencyId}>
                  <div>
                    <strong>{item.label}</strong>
                    <small>
                      {item.strength} · {item.source}
                    </small>
                    <p>“{item.supportingText}”</p>
                  </div>
                  <label className="confirm-switch">
                    <input
                      checked={item.confirmed}
                      type="checkbox"
                      onChange={(event) =>
                        confirmEvidence(index, event.target.checked)
                      }
                    />{" "}
                    Confirm
                  </label>
                </article>
              ))}
            </div>
          ) : null}
          <div className="pathway-actions">
            <button
              disabled={busy || !candidateText.trim()}
              onClick={generate}
              type="button"
            >
              {busy
                ? "Extracting safely…"
                : evidence.length
                  ? "Recalculate from confirmed evidence"
                  : "Extract evidence"}
            </button>
            <button
              className="secondary-button"
              disabled={!evidence.some((item) => item.confirmed)}
              onClick={() => setStage(2)}
              type="button"
            >
              Preferences →
            </button>
          </div>
        </section>
      ) : null}
      {stage === 2 ? (
        <section className="pathway-panel">
          <div className="pathway-heading">
            <div>
              <p className="eyebrow">Stage 2</p>
              <h2>Set European market preferences</h2>
              <p>Preferences affect ordering, never capability.</p>
              <p>
                Target countries and support needs are pre-filled from your
                saved <a href="/dashboard/international">Countries</a>{" "}
                profile when available.
              </p>
            </div>
          </div>
          <fieldset>
            <legend>Target countries</legend>
            <div className="pathway-options">
              {["Ireland", "Germany", "Netherlands"].map((country) => (
                <label key={country}>
                  <input
                    checked={preferences.countries.includes(
                      country as RolePreferences["countries"][number],
                    )}
                    type="checkbox"
                    onChange={(event) =>
                      setPreferences((current) => ({
                        ...current,
                        countries: event.target.checked
                          ? ([
                              ...current.countries,
                              country,
                            ] as RolePreferences["countries"])
                          : current.countries.filter(
                              (item) => item !== country,
                            ),
                      }))
                    }
                  />
                  {country}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="pathway-form-grid">
            <label>
              Work style
              <select
                value={preferences.workStyle}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    workStyle: e.target.value as RolePreferences["workStyle"],
                  })
                }
              >
                {[
                  "mixed",
                  "building",
                  "analysing",
                  "testing",
                  "supporting",
                  "coordinating",
                ].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <label>
              Coding preference
              <select
                value={preferences.codingPreference}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    codingPreference: e.target
                      .value as RolePreferences["codingPreference"],
                  })
                }
              >
                {["high", "some", "low", "none"].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <label>
              Stakeholder interaction
              <select
                value={preferences.stakeholderPreference}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    stakeholderPreference: e.target
                      .value as RolePreferences["stakeholderPreference"],
                  })
                }
              >
                {["high", "some", "low"].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <label>
              Work arrangement
              <select
                value={preferences.workingModel}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    workingModel: e.target
                      .value as RolePreferences["workingModel"],
                  })
                }
              >
                {["flexible", "remote", "hybrid", "onsite"].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <label>
              Work-authorisation support
              <select
                value={preferences.supportRequired}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    supportRequired: e.target
                      .value as RolePreferences["supportRequired"],
                  })
                }
              >
                {["unsure", "yes", "no"].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <label>
              Salary preference
              <input
                value={preferences.salaryPreference}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    salaryPreference: e.target.value,
                  })
                }
                placeholder="Optional; include currency and period"
              />
            </label>
          </div>
          <label>
            Areas to explore
            <input
              value={preferences.areas.join(", ")}
              onChange={(e) =>
                setPreferences({
                  ...preferences,
                  areas: e.target.value
                    .split(",")
                    .map((x) => x.trim())
                    .filter(Boolean),
                })
              }
              placeholder="software engineering, FinTech, testing…"
            />
          </label>
          <div className="pathway-actions">
            <button
              disabled={
                !rolePreferencesSchema.safeParse(preferences).success || busy
              }
              onClick={async () => {
                await generate();
                setStage(3);
              }}
              type="button"
            >
              {busy ? "Generating…" : "Generate recommended pathways →"}
            </button>
          </div>
        </section>
      ) : null}
      {stage === 3 ? (
        <section className="pathway-panel">
          <div className="pathway-heading">
            <div>
              <p className="eyebrow">Stage 3</p>
              <h2>Evidence-led pathways for {preferences.countries[0]}</h2>
              <p>
                Market signals describe the observed dataset—not demand
                certainty or a chance of being hired.
              </p>
            </div>
            <input
              aria-label="Search ESCO technology occupations"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Explore more ESCO roles"
            />
          </div>
          {[
            ["Best-fit roles", grouped.best],
            ["Adjacent roles", grouped.adjacent],
            ["Alternative directions", grouped.alternative],
            ["Longer-term pathways", grouped.longer],
          ].map(([label, items]) => (
            <div className="pathway-group" key={label as string}>
              <h3>{label as string}</h3>
              <div className="pathway-card-grid">
                {cards(items as RoleRecommendation[])}
              </div>
            </div>
          ))}
        </section>
      ) : null}
      {stage === 4 && selectedRole ? (
        <section className="pathway-panel">
          <div className="pathway-detail-header">
            <div>
              <p className="eyebrow">
                {selectedRole.occupation.family.replaceAll("-", " ")}
              </p>
              <h2>{selectedRole.occupation.preferredTitle}</h2>
              <p>
                ESCO {selectedRole.occupation.id} ·{" "}
                {selectedRole.transitionDistance}
              </p>
            </div>
            <a
              href={selectedRole.occupation.sourceUrl}
              rel="noreferrer"
              target="_blank"
            >
              View ESCO source ↗
            </a>
          </div>
          <div className="pathway-score-grid">
            <Score label="Capability" value={selectedRole.capabilityScore} />
            <Score
              label="Market readiness"
              value={selectedRole.marketReadinessScore}
            />
            <Score
              label="Preference alignment"
              value={selectedRole.preferenceAlignment}
            />
          </div>
          <div className="pathway-detail-grid">
            <article>
              <h3>Confirmed evidence</h3>
              {selectedRole.supportingEvidence.length ? (
                <ul>
                  {selectedRole.supportingEvidence.map((x) => (
                    <li key={x.competencyId}>
                      {x.label}: {x.supportingText}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No confirmed essential evidence yet.</p>
              )}
            </article>
            <article>
              <h3>Essential gaps</h3>
              {selectedRole.missingEssentialCompetencies.length ? (
                <ul>
                  {selectedRole.missingEssentialCompetencies.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              ) : (
                <p>No essential gaps in the available taxonomy data.</p>
              )}
            </article>
            <article>
              <h3>{preferences.countries[0]} market coverage</h3>
              <p>
                <strong>{selectedRole.countryMarketSignal}</strong>
              </p>
              <p>
                {selectedRole.market.sampleSize} observed vacancies;{" "}
                {selectedRole.market.sourceCoverage.length || 0} sources.{" "}
                {selectedRole.market.freshness}.
              </p>
            </article>
            <article>
              <h3>Mobility</h3>
              <p>
                <strong>{selectedRole.mobilityStatus}</strong>
              </p>
              <p>
                Employer-register presence never proves vacancy sponsorship.
                Review governed International evidence per vacancy.
              </p>
            </article>
            <article>
              <h3>Facts, inferences, unknowns</h3>
              <p>
                <strong>Fact:</strong>{" "}
                {selectedRole.facts[0] ?? "No confirmed supporting fact."}
              </p>
              <p>
                <strong>Inference:</strong> {selectedRole.inferences[0]}
              </p>
              <p>
                <strong>Unknown:</strong> {selectedRole.unknowns[0]}
              </p>
            </article>
            <article>
              <h3>Corrective actions</h3>
              <ul>
                {selectedRole.correctiveActions.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </article>
          </div>
          <div className="pathway-actions">
            <button onClick={() => setStage(5)} type="button">
              Select career lanes →
            </button>
            <button
              className="secondary-button"
              onClick={() => setStage(3)}
              type="button"
            >
              Back to pathways
            </button>
          </div>
        </section>
      ) : null}
      {stage === 5 ? (
        <section className="pathway-panel">
          <div className="pathway-heading">
            <div>
              <p className="eyebrow">Stage 5</p>
              <h2>Choose the lanes that guide AutoTime</h2>
              <p>
                One primary, up to two secondary, and one explorer. Unsupported
                aspirations belong only in Explorer.
              </p>
            </div>
          </div>
          <div className="lane-grid">
            <label>
              Primary lane
              <select
                value={primary}
                onChange={(e) => setPrimary(e.target.value)}
              >
                <option value="">Choose…</option>
                {recommendations
                  .filter(
                    (x) =>
                      x.gatePassed &&
                      x.transitionDistance !==
                        "unsupported by current evidence",
                  )
                  .map((x) => (
                    <option key={x.occupation.id} value={x.occupation.id}>
                      {x.occupation.preferredTitle}
                    </option>
                  ))}
              </select>
            </label>
            <fieldset>
              <legend>Secondary lanes (up to two)</legend>
              {recommendations
                .filter((x) => x.gatePassed && x.occupation.id !== primary)
                .slice(0, 10)
                .map((x) => (
                  <label key={x.occupation.id}>
                    <input
                      checked={secondary.includes(x.occupation.id)}
                      disabled={
                        !secondary.includes(x.occupation.id) &&
                        secondary.length >= 2
                      }
                      type="checkbox"
                      onChange={(e) =>
                        setSecondary((current) =>
                          e.target.checked
                            ? [...current, x.occupation.id]
                            : current.filter((id) => id !== x.occupation.id),
                        )
                      }
                    />
                    {x.occupation.preferredTitle}
                  </label>
                ))}
            </fieldset>
            <label>
              Explorer lane
              <select
                value={explorer}
                onChange={(e) => setExplorer(e.target.value)}
              >
                <option value="">Optional…</option>
                {recommendations
                  .filter(
                    (x) =>
                      x.occupation.id !== primary &&
                      !secondary.includes(x.occupation.id),
                  )
                  .map((x) => (
                    <option key={x.occupation.id} value={x.occupation.id}>
                      {x.occupation.preferredTitle}
                      {!x.gatePassed ? " — substantial evidence gap" : ""}
                    </option>
                  ))}
              </select>
            </label>
          </div>
          <div className="pathway-actions">
            <button disabled={!primary} onClick={save} type="button">
              Save career lanes
            </button>
          </div>
        </section>
      ) : null}
      {status ? (
        <p className="status-banner" role="status">
          {status}
        </p>
      ) : null}
      <footer className="pathway-notice">
        <div>
          <strong>Refine your skills evidence</strong>
          <p>
            Answer a short ESCO questionnaire to improve your role matches.
          </p>
        </div>
        <a
          className="button-secondary"
          href="/dashboard/role-pathways/questionnaire"
        >
          Open skills questionnaire
        </a>
        <p className="pathway-notice-disclaimer">
          Role Pathways does not make legal, immigration, or hiring-probability
          decisions. Occupation taxonomy and market evidence refresh separately.
        </p>
      </footer>
    </main>
  );
}
