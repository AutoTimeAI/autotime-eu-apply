"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ProductEmptyState,
  ProductPageHeader,
  ProductStatusBadge,
  type ProductStatus,
} from "./product-ui";
import { useDashboardPlan } from "./UserNav";
import { ApplicationChecklist } from "./ApplicationChecklist";
import {
  analyseJob,
  createApplication,
  duplicateJob,
  extractJob,
  getApplicationReadiness,
  isRestrictedJobUrl,
  transitionApplication,
  type ApplicationWorkspace,
  type ApplicationWorkspaceStatus,
  type JobDecision,
  type JobRecord,
  type JobWorkflowState,
} from "../lib/job-application-workflow";
import {
  emptyJobWorkflowState,
  loadJobWorkflow,
  saveJobWorkflow,
} from "../lib/job-workflow-storage";
import { loadInterviewWorkflow } from "../lib/interview-storage";
import type { InterviewRecord } from "../lib/interview-workflow";

type View =
  | { kind: "jobs" }
  | { kind: "job"; id: string }
  | { kind: "applications" }
  | { kind: "application"; id: string };

function legacyEvidence(userId: string) {
  try {
    const value = JSON.parse(
      window.localStorage.getItem(
        `autotime-v2-companion-dashboard:${userId}`,
      ) ?? "null",
    ) as {
      profile?: {
        baseCvText?: string;
        experienceHighlights?: string;
        projectSummaries?: string;
        sponsorshipNeeded?: boolean;
      };
    } | null;
    return {
      text: [
        value?.profile?.experienceHighlights,
        value?.profile?.projectSummaries,
        value?.profile?.baseCvText,
      ]
        .filter(Boolean)
        .join("\n"),
      sponsorshipRequired: Boolean(value?.profile?.sponsorshipNeeded),
    };
  } catch {
    return { text: "", sponsorshipRequired: false };
  }
}

function decisionStatus(decision?: JobDecision): ProductStatus {
  return decision === "Apply"
    ? "apply"
    : decision === "Skip"
      ? "skip"
      : decision === "Consider"
        ? "consider"
        : "insufficient";
}
function evidenceStatus(value: string): ProductStatus {
  return value === "confirmed"
    ? "confirmed"
    : value === "partial"
      ? "inferred"
      : value === "conflicting"
        ? "conflicting"
        : "missing";
}
function currentAnalysis(job: JobRecord) {
  return job.analysisHistory.at(-1);
}
function formatDate(value?: string) {
  return value
    ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(
        new Date(value),
      )
    : "Not available";
}

function formatFactLabel(value: string) {
  return value
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (letter) => letter.toUpperCase());
}
export default function JobApplicationWorkspace({ view }: { view: View }) {
  const { userId } = useDashboardPlan();
  const router = useRouter();
  const [state, setState] = useState<JobWorkflowState>(emptyJobWorkflowState);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("");
  const [interviews, setInterviews] = useState<InterviewRecord[]>([]);
  const persist = (next: JobWorkflowState) => {
    setState(next);
    saveJobWorkflow(userId, next);
  };
  useEffect(() => {
    const loaded = loadJobWorkflow(userId);
    setState(loaded);
    setInterviews(loadInterviewWorkflow(userId).interviews);
    saveJobWorkflow(userId, loaded);
    setReady(true);
  }, [userId]);

  if (!ready)
    return (
      <main className="workflow-page">
        <p role="status">Loading your private workflow...</p>
      </main>
    );
  if (view.kind === "jobs")
    return (
      <JobsList
        state={state}
        onChange={persist}
        onOpen={(id) => router.push(`/dashboard/jobs/${id}`)}
        status={status}
        setStatus={setStatus}
      />
    );
  if (view.kind === "applications")
    return (
      <ApplicationsList
        state={state}
        onOpen={(id) => router.push(`/dashboard/applications/${id}`)}
      />
    );
  if (view.kind === "job") {
    const job = state.jobs.find((item) => item.id === view.id);
    if (!job) return <NotFound label="job" href="/dashboard/jobs" />;
    return (
      <JobDetail
        job={job}
        state={state}
        onChange={persist}
        onStatus={setStatus}
        status={status}
      />
    );
  }
  const application = state.applications.find((item) => item.id === view.id);
  const job =
    application && state.jobs.find((item) => item.id === application.jobId);
  if (!application || !job)
    return <NotFound label="application" href="/dashboard/applications" />;
  return (
    <ApplicationDetail
      application={application}
      interviews={interviews.filter(
        (item) => item.applicationId === application.id,
      )}
      job={job}
      state={state}
      onChange={persist}
      onStatus={setStatus}
      status={status}
    />
  );
}

function JobsList({
  state,
  onChange,
  onOpen,
  status,
  setStatus,
}: {
  state: JobWorkflowState;
  onChange: (value: JobWorkflowState) => void;
  onOpen: (id: string) => void;
  status: string;
  setStatus: (value: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState("");
  const [decision, setDecision] = useState("all");
  const [country, setCountry] = useState("all");
  const visible = useMemo(
    () =>
      state.jobs.filter((job) => {
        const analysis = currentAnalysis(job);
        const haystack = [
          job.title.value,
          job.employer.value,
          job.facts.country.value,
          job.facts.location.value,
          job.source,
        ]
          .join(" ")
          .toLowerCase();
        return (
          haystack.includes(query.toLowerCase()) &&
          (decision === "all" || analysis?.decision === decision) &&
          (country === "all" || job.facts.country.value === country)
        );
      }),
    [state.jobs, query, decision, country],
  );
  const countries = [
    ...new Set(
      state.jobs.map((job) => job.facts.country.value).filter(Boolean),
    ),
  ];
  return (
    <main className="workflow-page phase-two-jobs phase-two-jobs-list">
      <ProductPageHeader
        eyebrow="Jobs"
        title="Choose opportunities worth your time"
        description="Capture one real vacancy, check the evidence and decide before preparing an application."
        action={
          state.jobs.length && !adding ? (
            <button className="button-primary" onClick={() => setAdding(true)}>
              Add a job
            </button>
          ) : undefined
        }
      />
      {adding ? (
        <JobCapture
          state={state}
          onAdd={(job) => {
            onChange({ ...state, jobs: [job, ...state.jobs] });
            setAdding(false);
            setStatus("Job saved. Review the extracted facts before analysis.");
          }}
          onCancel={() => setAdding(false)}
        />
      ) : null}
      <p className="sr-only" aria-live="polite">
        {status}
      </p>
      {state.jobs.length ? (
        <>
          <section
            className="workflow-filters phase-two-job-filters"
            aria-label="Filter jobs"
          >
            <label>
              Search
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Role, employer or location"
              />
            </label>
            <label>
              Decision
              <select
                value={decision}
                onChange={(event) => setDecision(event.target.value)}
              >
                <option value="all">All decisions</option>
                {["Apply", "Consider", "Skip", "Insufficient information"].map(
                  (item) => (
                    <option key={item}>{item}</option>
                  ),
                )}
              </select>
            </label>
            <label>
              Country
              <select
                value={country}
                onChange={(event) => setCountry(event.target.value)}
              >
                <option value="all">All countries</option>
                {countries.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
          </section>
          <section
            className="workflow-list phase-two-job-list"
            aria-label="Saved jobs"
          >
            {visible.map((job) => {
              const analysis = currentAnalysis(job);
              return (
                <article
                  className="workflow-list-row phase-two-job-row"
                  key={job.id}
                >
                  <div>
                    <p className="product-eyebrow">
                      {job.source} - {formatDate(job.capturedAt)}
                    </p>
                    <h2>{job.title.value || "Untitled role"}</h2>
                    <p>
                      {job.employer.value || "Employer unknown"} -{" "}
                      {job.facts.location.value ||
                        job.facts.country.value ||
                        "Location unknown"}
                    </p>
                  </div>
                  <div className="workflow-status-stack">
                    <ProductStatusBadge
                      status={decisionStatus(analysis?.decision)}
                    >
                      {analysis?.decision ?? "Not analysed"}
                    </ProductStatusBadge>
                    <span>
                      {job.applicationId
                        ? "Application started"
                        : job.analysisState}
                    </span>
                  </div>
                  <button
                    className="button-secondary"
                    onClick={() => onOpen(job.id)}
                  >
                    {analysis ? analysis.nextAction : "Review and analyse"}
                  </button>
                </article>
              );
            })}
          </section>
        </>
      ) : (
        <ProductEmptyState
          title="Add your first vacancy"
          description="Jobs holds vacancies you want to assess. AutoTime maps facts and evidence, but never applies without your review."
          action={
            <button className="button-primary" onClick={() => setAdding(true)}>
              Add a job
            </button>
          }
        />
      )}
    </main>
  );
}

function JobCapture({
  state,
  onAdd,
  onCancel,
}: {
  state: JobWorkflowState;
  onAdd: (job: JobRecord) => void;
  onCancel: () => void;
}) {
  const [description, setDescription] = useState("");
  const [title, setTitle] = useState("");
  const [employer, setEmployer] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  return (
    <section className="workflow-editor" aria-labelledby="add-job-heading">
      <h2 id="add-job-heading">Add a job</h2>
      <p>
        Paste vacancy text. A URL is stored as metadata only; restricted
        platforms are never scraped.
      </p>
      <div className="workflow-form-grid">
        <label>
          Job title <span>optional</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
        <label>
          Employer <span>optional</span>
          <input
            value={employer}
            onChange={(event) => setEmployer(event.target.value)}
          />
        </label>
        <label className="full-span">
          Source URL <span>optional metadata</span>
          <input
            type="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
          />
        </label>
        <label className="full-span">
          Job description
          <textarea
            rows={12}
            maxLength={50000}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>
      </div>
      {url && isRestrictedJobUrl(url) ? (
        <p className="notice-warning">
          This URL will be saved as metadata. AutoTime will not fetch or scrape
          it.
        </p>
      ) : null}
      {error ? (
        <p className="notice-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="workflow-actions">
        <button
          className="button-primary"
          onClick={() => {
            try {
              const job = extractJob({
                description,
                employer,
                sourceUrl: url,
                title,
              });
              if (duplicateJob(state.jobs, job)) {
                setError("This vacancy appears to be saved already.");
                return;
              }
              onAdd(job);
            } catch (problem) {
              setError(
                problem instanceof Error
                  ? problem.message
                  : "The vacancy could not be saved.",
              );
            }
          }}
        >
          Save job
        </button>
        <button className="button-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </section>
  );
}

function JobDetail({
  job,
  state,
  onChange,
  onStatus,
  status,
}: {
  job: JobRecord;
  state: JobWorkflowState;
  onChange: (value: JobWorkflowState) => void;
  onStatus: (value: string) => void;
  status: string;
}) {
  const { userId } = useDashboardPlan();
  const [tab, setTab] = useState<
    "overview" | "analysis" | "application" | "activity"
  >("overview");
  const analysis = currentAnalysis(job);
  const updateJob = (nextJob: JobRecord) =>
    onChange({
      ...state,
      jobs: state.jobs.map((item) => (item.id === job.id ? nextJob : item)),
    });
  const analyse = () => {
    const evidence = legacyEvidence(userId);
    const result = analyseJob(job, evidence.text, {
      careerLane: job.lane,
      sponsorshipRequired: evidence.sponsorshipRequired,
    });
    updateJob({
      ...job,
      analysisHistory: [...job.analysisHistory, result],
      analysisState: "Analysed",
      updatedAt: result.createdAt,
    });
    setTab("analysis");
    onStatus(`Analysis version ${result.version} saved.`);
  };
  const prepare = () => {
    const existing = state.applications.find((item) => item.jobId === job.id);
    if (existing) {
      window.location.assign(`/dashboard/applications/${existing.id}`);
      return;
    }
    const application = createApplication(job);
    onChange({
      ...state,
      applications: [...state.applications, application],
      jobs: state.jobs.map((item) =>
        item.id === job.id ? { ...item, applicationId: application.id } : item,
      ),
    });
    window.location.assign(`/dashboard/applications/${application.id}`);
  };
  return (
    <main className="workflow-page phase-two-jobs phase-two-job-detail">
      <a href="/dashboard/jobs" className="text-link phase-two-job-back">
        {"\u2190"} Jobs
      </a>
      <ProductPageHeader
        eyebrow={job.source}
        title={job.title.value || "Untitled role"}
        description={`${job.employer.value || "Employer unknown"} - ${job.facts.location.value || job.facts.country.value || "Location unknown"}`}
        action={
          <button
            className="button-primary"
            onClick={analysis?.decision === "Apply" ? prepare : analyse}
          >
            {analysis?.decision === "Apply"
              ? "Prepare application"
              : analysis
                ? "Reanalyse job"
                : "Analyse job"}
          </button>
        }
      />
      <nav className="workflow-tabs" aria-label="Job sections" role="tablist">
        {["overview", "analysis", "application", "activity"].map((item) => (
          <button
            aria-current={tab === item ? "page" : undefined}
            aria-selected={tab === item}
            key={item}
            onClick={() => setTab(item as typeof tab)}
            role="tab"
          >
            {item[0].toUpperCase() + item.slice(1)}
          </button>
        ))}
      </nav>
      <p className="phase-two-job-status" aria-live="polite">
        {status}
      </p>
      {tab === "overview" ? (
        <JobOverview job={job} updateJob={updateJob} />
      ) : tab === "analysis" ? (
        <Analysis job={job} analyse={analyse} />
      ) : tab === "application" ? (
        <section className="workflow-section">
          <h2>Application</h2>
          <p>
            {analysis?.decision === "Apply"
              ? "The viability decision supports preparation. You will still review every claim before Ready."
              : "Record or resolve the viability decision before preparing application material."}
          </p>
          <button
            className="button-primary"
            disabled={analysis?.decision !== "Apply"}
            onClick={prepare}
          >
            Prepare application
          </button>
        </section>
      ) : (
        <Activity
          job={job}
          application={state.applications.find((item) => item.jobId === job.id)}
        />
      )}
    </main>
  );
}

function JobOverview({
  job,
  updateJob,
}: {
  job: JobRecord;
  updateJob: (job: JobRecord) => void;
}) {
  const facts = Object.entries(job.facts);
  const updateFact = (key: keyof JobRecord["facts"], value: string) =>
    updateJob({
      ...job,
      facts: {
        ...job.facts,
        [key]: {
          ...job.facts[key],
          state: value.trim() ? "user-confirmed" : "missing",
          value,
        },
      },
      updatedAt: new Date().toISOString(),
    });
  return (
    <>
      <section
        className="workflow-fact-grid phase-two-fact-grid"
        aria-label="Extracted job facts"
      >
        {facts.map(([key, fact]) => (
          <article key={key}>
            <span>{formatFactLabel(key)}</span>
            <input
              aria-label={`Confirm ${formatFactLabel(key)}`}
              value={fact.value}
              onChange={(event) =>
                updateFact(key as keyof JobRecord["facts"], event.target.value)
              }
              placeholder="Unknown"
            />
            <small>
              {fact.state}
              {fact.sourceText ? ` - "${fact.sourceText.slice(0, 120)}"` : ""}
            </small>
          </article>
        ))}
      </section>
      <details className="workflow-source phase-two-job-source">
        <summary>Captured job description</summary>
        <pre>{job.description}</pre>
      </details>
      <section className="workflow-section phase-two-career-lane">
        <h2>Career lane</h2>
        <label>
          Optional context
          <input
            value={job.lane}
            onChange={(event) =>
              updateJob({
                ...job,
                lane: event.target.value,
                updatedAt: new Date().toISOString(),
              })
            }
            placeholder="Selected Role Pathway lane"
          />
        </label>
        <p>
          Lane alignment provides context; it never creates capability evidence.
        </p>
      </section>
    </>
  );
}

function Analysis({ job, analyse }: { job: JobRecord; analyse: () => void }) {
  const result = currentAnalysis(job);
  if (!result)
    return (
      <ProductEmptyState
        title="Analyse this vacancy"
        description="AutoTime will compare actual requirements with confirmed profile evidence and keep unknowns visible."
        action={
          <button className="button-primary" onClick={analyse}>
            Analyse job
          </button>
        }
      />
    );
  return (
    <div className="workflow-analysis phase-two-analysis">
      <section
        className="workflow-recommendation phase-two-decision"
        aria-labelledby="job-decision-heading"
      >
        <div
          className="phase-two-decision-score"
          aria-label={`${result.capability.filter((item) => item.state !== "missing").length} of ${result.capability.length} requirements have supporting evidence`}
        >
          <strong>
            {
              result.capability.filter((item) => item.state !== "missing")
                .length
            }
            <small>/{result.capability.length}</small>
          </strong>
          <span>requirements</span>
        </div>
        <div className="phase-two-decision-copy">
          <p className="product-eyebrow">Recommendation</p>
          <ProductStatusBadge status={decisionStatus(result.decision)}>
            {result.decision}
          </ProductStatusBadge>
          <h2 id="job-decision-heading">{result.reason}</h2>
          <p>
            {result.confidence} confidence - analysis version {result.version}
          </p>
        </div>
        <dl className="phase-two-decision-facts">
          <div>
            <dt>Strongest evidence</dt>
            <dd>{result.positiveEvidence}</dd>
          </div>
          <div>
            <dt>Most important risk</dt>
            <dd>{result.criticalRisk}</dd>
          </div>
          <div>
            <dt>Next action</dt>
            <dd>{result.nextAction}</dd>
          </div>
        </dl>
      </section>
      <div className="phase-two-analysis-columns">
        <section className="workflow-section phase-two-evidence-section">
          <header className="phase-two-section-heading">
            <div>
              <p className="product-eyebrow">Evidence found</p>
              <h2>Why it fits</h2>
            </div>
            <span>{result.capability.length} requirements</span>
          </header>
          {result.capability.map((item) => (
            <details
              className="evidence-row phase-two-evidence-row"
              key={item.requirement}
            >
              <summary>
                <span
                  className={`phase-two-state-icon ${evidenceStatus(item.state)}`}
                  aria-hidden="true"
                >
                  {item.state === "confirmed"
                    ? "\u2713"
                    : item.state === "conflicting"
                      ? "\u00d7"
                      : "!"}
                </span>
                <strong>{item.requirement}</strong>
                <ProductStatusBadge status={evidenceStatus(item.state)}>
                  {item.state}
                </ProductStatusBadge>
              </summary>
              <div className="evidence-row-details">
                <p>
                  {item.evidence.join("; ") ||
                    "No confirmed supporting evidence."}
                </p>
                <small>Vacancy source: &quot;{item.sourceText}&quot;</small>
              </div>
            </details>
          ))}
        </section>
        <aside
          className="phase-two-unknowns"
          aria-labelledby="unknowns-heading"
        >
          <header>
            <p className="product-eyebrow">Before applying</p>
            <h2 id="unknowns-heading">Resolve the unknowns</h2>
            <p>Confirm details the vacancy or your evidence leaves open.</p>
          </header>
          {result.unknowns.length ? (
            <ul>
              {result.unknowns.map((item) => (
                <li key={item}>
                  <span aria-hidden="true">!</span>
                  <div>
                    <strong>{item}</strong>
                    <p>
                      {item === "Vacancy-specific sponsorship wording"
                        ? "Ask whether this role supports visa sponsorship."
                        : `Confirm ${item.toLowerCase()} before investing more time.`}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="phase-two-no-unknowns">
              <span aria-hidden="true">{"\u2713"}</span> No material unknown
              recorded.
            </p>
          )}
          <section className="phase-two-mobility-note">
            <h3>Country and mobility</h3>
            <p>
              <strong>Vacancy wording:</strong>{" "}
              {job.facts.sponsorship.value || "Unknown"}
            </p>
            <p>Mobility facts stay separate from capability scoring.</p>
            <nav aria-label="Related checks">
              <a href="/dashboard/international">View country facts</a>
              <a href="/dashboard/autofill-profile">Review profile evidence</a>
            </nav>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Activity({
  job,
  application,
}: {
  job: JobRecord;
  application?: ApplicationWorkspace;
}) {
  const events = [
    { label: "Job captured", at: job.capturedAt },
    ...job.analysisHistory.map((item) => ({
      label: `Analysis version ${item.version}: ${item.decision}`,
      at: item.createdAt,
    })),
    ...(application
      ? [{ label: "Application prepared", at: application.createdAt }]
      : []),
    ...(application?.appliedAt
      ? [{ label: "Marked applied", at: application.appliedAt }]
      : []),
  ];
  return (
    <section className="workflow-section">
      <h2>Activity</h2>
      <ol className="workflow-timeline">
        {events.map((event) => (
          <li key={`${event.label}-${event.at}`}>
            <strong>{event.label}</strong>
            <span>{formatDate(event.at)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function ApplicationsList({
  state,
  onOpen,
}: {
  state: JobWorkflowState;
  onOpen: (id: string) => void;
}) {
  const [filter, setFilter] = useState("all");
  const visible = state.applications.filter(
    (item) => filter === "all" || item.status === filter,
  );
  return (
    <main className="workflow-page">
      <ProductPageHeader
        eyebrow="Applications"
        title="Prepare, review and track"
        description="Every workspace stays tied to one selected job and its confirmed evidence."
      />
      <section className="workflow-filters">
        <label>
          Status
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          >
            <option value="all">All statuses</option>
            {[
              "Preparing",
              "Needs review",
              "Ready",
              "Applied",
              "Interview",
              "Offer",
              "Rejected",
              "Withdrawn",
            ].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
      </section>
      {visible.length ? (
        <section className="workflow-list">
          {visible.map((application) => {
            const job = state.jobs.find(
              (item) => item.id === application.jobId,
            );
            return (
              <article className="workflow-list-row" key={application.id}>
                <div>
                  <p className="eyebrow">{application.status}</p>
                  <h2>{job?.title.value || "Application"}</h2>
                  <p>
                    {job?.employer.value || "Employer unknown"} Â· Follow-up{" "}
                    {formatDate(application.followUpDate)}
                  </p>
                </div>
                <ProductStatusBadge
                  status={
                    application.status === "Ready" ||
                    application.status === "Applied"
                      ? "confirmed"
                      : "consider"
                  }
                >
                  {application.status}
                </ProductStatusBadge>
                <button
                  className="button-secondary"
                  onClick={() => onOpen(application.id)}
                >
                  Review application
                </button>
              </article>
            );
          })}
        </section>
      ) : (
        <ProductEmptyState
          title="No applications yet"
          description="Open an Apply job and choose Prepare application. AutoTime does not create speculative applications."
          action={
            <a className="button-primary" href="/dashboard/jobs">
              Review jobs
            </a>
          }
        />
      )}
    </main>
  );
}

function ApplicationDetail({
  application,
  interviews,
  job,
  state,
  onChange,
  onStatus,
  status,
}: {
  application: ApplicationWorkspace;
  interviews: InterviewRecord[];
  job: JobRecord;
  state: JobWorkflowState;
  onChange: (value: JobWorkflowState) => void;
  onStatus: (value: string) => void;
  status: string;
}) {
  const readiness = getApplicationReadiness(application, job);
  const update = (changes: Partial<ApplicationWorkspace>) =>
    onChange({
      ...state,
      applications: state.applications.map((item) =>
        item.id === application.id
          ? { ...item, ...changes, updatedAt: new Date().toISOString() }
          : item,
      ),
    });
  const setStatus = (next: ApplicationWorkspaceStatus, confirmed = false) => {
    try {
      const changed = transitionApplication(application, next, job, confirmed);
      update(changed);
      onStatus(`Application marked ${next}.`);
    } catch (error) {
      onStatus(
        error instanceof Error ? error.message : "Status could not be changed.",
      );
    }
  };
  return (
    <main className="workflow-page">
      <a href="/dashboard/applications" className="text-link">
        â† Applications
      </a>
      <ProductPageHeader
        eyebrow={application.status}
        title={job.title.value || "Application workspace"}
        description={`${job.employer.value || "Employer unknown"} Â· Evidence-backed preparation only`}
      />
      <p role="status">{status}</p>
      {interviews.length ? (
        <section className="workflow-section">
          <h2>Linked interviews</h2>
          <ul>
            {interviews.map((interview) => (
              <li key={interview.id}>
                <a href={`/dashboard/interviews/${interview.id}`}>
                  {interview.stage.replaceAll("_", " ")}
                </a>{" "}
                Ã‚Â· {interview.status} Ã‚Â·{" "}
                {interview.scheduledAt
                  ? formatDate(interview.scheduledAt)
                  : "Date not set"}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <ApplicationChecklist
        checklist={application.checklist}
        onChange={(checklist) => update({ checklist })}
      />
      <section className="workflow-section">
        <h2>Evidence and CV</h2>
        <label>
          <input
            type="checkbox"
            checked={application.evidenceConfirmed}
            onChange={(event) =>
              update({ evidenceConfirmed: event.target.checked })
            }
          />{" "}
          I confirmed the selected evidence supports the application.
        </label>
        <label>
          Selected CV/profile version
          <input
            value={application.selectedCvVersion}
            onChange={(event) =>
              update({ selectedCvVersion: event.target.value })
            }
          />
        </label>
        <p>
          Recommendations may reorder confirmed evidence, but must never invent
          employment, technologies, years, qualifications, metrics or
          immigration claims.
        </p>
        <label>
          Unsupported-claim review
          <textarea
            value={application.unsupportedClaims.join("\n")}
            onChange={(event) =>
              update({
                unsupportedClaims: event.target.value
                  .split("\n")
                  .map((item) => item.trim())
                  .filter(Boolean),
              })
            }
            placeholder="Add each unsupported claim on a new line; any entry blocks Ready."
          />
        </label>
      </section>
      <section className="workflow-section">
        <h2>Screening answers</h2>
        <p>
          Right-to-work, sponsorship, salary, legal, health and demographic
          questions require direct user input and explicit review.
        </p>
        <label>
          <input
            type="checkbox"
            checked={application.consequentialAnswersReviewed}
            onChange={(event) =>
              update({ consequentialAnswersReviewed: event.target.checked })
            }
          />{" "}
          I reviewed every consequential answer directly.
        </label>
      </section>
      <section className="workflow-section">
        <h2>Optional cover letter</h2>
        <label>
          <input
            type="checkbox"
            checked={application.coverLetterRequested}
            onChange={(event) =>
              update({
                coverLetterRequested: event.target.checked,
                coverLetter: event.target.checked
                  ? (application.coverLetter ?? "")
                  : undefined,
              })
            }
          />{" "}
          Prepare a cover letter for this job
        </label>
        {application.coverLetterRequested ? (
          <textarea
            value={application.coverLetter ?? ""}
            onChange={(event) => update({ coverLetter: event.target.value })}
            placeholder="Draft only from confirmed role facts and evidence."
          />
        ) : null}
      </section>
      <section className="workflow-section">
        <h2>Readiness</h2>
        {readiness.ready ? (
          <p className="notice-success">
            Required facts, evidence and consequential reviews are complete.
          </p>
        ) : (
          <ul>
            {readiness.blockers.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
        <div className="workflow-actions">
          {application.status === "Preparing" ? (
            <button
              className="button-primary"
              onClick={() => setStatus("Needs review")}
            >
              Start final review
            </button>
          ) : null}
          {application.status === "Needs review" ? (
            <button
              className="button-primary"
              disabled={!readiness.ready}
              onClick={() => setStatus("Ready")}
            >
              Mark ready
            </button>
          ) : null}
          {application.status === "Ready" ? (
            <button
              className="button-primary"
              onClick={() =>
                window.confirm(
                  "Confirm that you submitted this application outside AutoTime.",
                ) && setStatus("Applied", true)
              }
            >
              Mark as applied
            </button>
          ) : null}
        </div>
      </section>
      {application.status === "Applied" ? (
        <section className="workflow-section">
          <h2>Submission record</h2>
          <p>
            Applied {formatDate(application.appliedAt)}. AutoTime did not submit
            externally.
          </p>
          <a
            className="button-primary"
            href={`/dashboard/interviews?applicationId=${application.id}`}
          >
            Add interview
          </a>
          <div className="workflow-form-grid">
            <label>
              Channel
              <input
                value={application.applicationChannel ?? ""}
                onChange={(event) =>
                  update({ applicationChannel: event.target.value })
                }
              />
            </label>
            <label>
              Reference number
              <input
                value={application.referenceNumber ?? ""}
                onChange={(event) =>
                  update({ referenceNumber: event.target.value })
                }
              />
            </label>
            <label>
              Follow-up date
              <input
                type="date"
                value={application.followUpDate ?? ""}
                onChange={(event) =>
                  update({ followUpDate: event.target.value })
                }
              />
            </label>
            <label>
              Submitted document versions
              <input
                value={application.documentVersions.join(", ")}
                onChange={(event) =>
                  update({
                    documentVersions: event.target.value
                      .split(",")
                      .map((item) => item.trim())
                      .filter(Boolean),
                  })
                }
              />
            </label>
          </div>
        </section>
      ) : null}
    </main>
  );
}

function NotFound({ label, href }: { label: string; href: string }) {
  return (
    <main className="workflow-page">
      <ProductEmptyState
        title={`${label[0].toUpperCase() + label.slice(1)} not found`}
        description={`This ${label} is not present in your authenticated workspace.`}
        action={
          <a className="button-primary" href={href}>
            Return safely
          </a>
        }
      />
    </main>
  );
}
