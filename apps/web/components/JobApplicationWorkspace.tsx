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
  cloudApplicationToWorkspaceJob,
  createApplication,
  duplicateJob,
  extractJob,
  getApplicationReadiness,
  getApplicationReviewQueue,
  isRestrictedJobUrl,
  normalizeJobUrl,
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
import { loadMobilityProfile, saveMobilityProfile } from "../lib/international-mobility-storage";
import { useJobWorkflowSync } from "../lib/useJobWorkflowSync";
import type { ApplicationRecord, MobilityProfile } from "shared";

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
  const [applicationSystemState, setApplicationSystemState] = useState<
    "loading" | "unavailable" | null
  >(null);
  const [cloudApplications, setCloudApplications] = useState<
    ApplicationRecord[]
  >([]);
  const applyLocal = (next: JobWorkflowState) => {
    setState(next);
    saveJobWorkflow(userId, next);
  };
  useEffect(() => {
    const fixtureAllowed =
      process.env.NEXT_PUBLIC_AUTOTIME_E2E_LOCAL_ONLY === "true" &&
      userId === "00000000-0000-4000-8000-000000000001";
    const fixture = fixtureAllowed
      ? window.localStorage.getItem(
          "autotime-phase-3-applications-system-state",
        )
      : null;
    if (
      (view.kind === "applications" || view.kind === "application") &&
      fixture === "loading"
    ) {
      setApplicationSystemState("loading");
      return;
    }
    if (
      (view.kind === "applications" || view.kind === "application") &&
      fixture === "unavailable"
    ) {
      setApplicationSystemState("unavailable");
      setReady(true);
      return;
    }
    const loaded = loadJobWorkflow(userId);
    setState(loaded);
    setInterviews(loadInterviewWorkflow(userId).interviews);
    saveJobWorkflow(userId, loaded);
    setReady(true);
  }, [userId, view.kind]);

  // Best-effort read-only bridge: surfaces applications that exist in the
  // cloud (seeded, created on another device, or by another surface of the
  // app) but aren't yet tracked in this browser's local workflow. Never
  // written back through persist/saveJobWorkflow - see
  // cloudApplicationToWorkspaceJob for why.
  useEffect(() => {
    let isActive = true;
    void fetch("/api/sync/dashboard", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (!isActive || !payload?.data?.dashboard?.applications) return;
        setCloudApplications(payload.data.dashboard.applications);
      })
      .catch(() => {
        // Cloud data is a display-only enhancement; failures here should
        // never block the local-only workflow these pages already support.
      });
    return () => {
      isActive = false;
    };
  }, [userId]);

  const localUrlKeys = useMemo(
    () => new Set(state.jobs.map((job) => normalizeJobUrl(job.sourceUrl))),
    [state.jobs],
  );
  const cloudOnly = useMemo(
    () =>
      cloudApplications
        .filter((record) => !localUrlKeys.has(normalizeJobUrl(record.url)))
        .map((record) => cloudApplicationToWorkspaceJob(record)),
    [cloudApplications, localUrlKeys],
  );
  const cloudOnlyJobs = useMemo(
    () => cloudOnly.map((item) => item.job),
    [cloudOnly],
  );

  // Real two-way sync (issue #29 phase 4a) - local storage stays the
  // source of truth for immediate UI, this mirrors it to the cloud in the
  // background so it survives across devices. Distinct from the read-only
  // cloudApplications bridge above (a display-only fallback for the
  // legacy applications table); this reads/writes the dedicated
  // job_workflow_* tables and merges results into real local state.
  const jobWorkflowSync = useJobWorkflowSync({
    enabled: ready,
    localJobs: state.jobs,
    localApplications: state.applications,
    onReconciled: (next) =>
      applyLocal({ ...state, jobs: next.jobs, applications: next.applications }),
    userId,
  });
  const persist = (next: JobWorkflowState) => {
    applyLocal(next);
    jobWorkflowSync.sync({ jobs: next.jobs, applications: next.applications });
  };

  if (!ready)
    return view.kind === "applications" || view.kind === "application" ? (
      <ApplicationsSystemState kind="loading" />
    ) : (
      <main className="workflow-page">
        <p role="status">Loading your private workflow...</p>
      </main>
    );
  if (applicationSystemState === "unavailable")
    return <ApplicationsSystemState kind="unavailable" />;
  if (view.kind === "jobs")
    return (
      <JobsList
        state={state}
        cloudOnlyJobs={cloudOnlyJobs}
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
        cloudOnly={cloudOnly}
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
  cloudOnlyJobs,
  onChange,
  onOpen,
  status,
  setStatus,
}: {
  state: JobWorkflowState;
  cloudOnlyJobs: JobRecord[];
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
      <p><a className="text-link" href="/dashboard/jobs/browse">Browse aggregated EU jobs</a></p>
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
      {cloudOnlyJobs.length ? (
        <section
          className="workflow-list phase-two-job-list workflow-cloud-bridge"
          aria-label="Jobs saved to your account"
        >
          <h2>Also saved to your account</h2>
          <p>
            These were saved from another device or surface of AutoTime and
            aren&apos;t yet tracked in this browser. Open the original
            posting to review it, or add it here to track it in this
            workflow.
          </p>
          {cloudOnlyJobs.map((job) => (
            <article className="workflow-list-row phase-two-job-row" key={job.id}>
              <div>
                <p className="product-eyebrow">Synced from your account</p>
                <h2>{job.title.value || "Untitled role"}</h2>
                <p>{job.employer.value || "Employer unknown"}</p>
              </div>
              {job.sourceUrl ? (
                <a
                  className="button-secondary"
                  href={job.sourceUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  View posting
                </a>
              ) : null}
            </article>
          ))}
        </section>
      ) : null}
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
  const [cloudEvidence, setCloudEvidence] = useState<ReturnType<typeof legacyEvidence> | null>(null);
  useEffect(() => {
    let active = true;
    void fetch("/api/profile/onboarding").then(async (response) => ({ response, payload: await response.json() })).then(({ response, payload }) => {
      if (!active || !response.ok || !payload.data) return;
      const profile = payload.data as { base_cv_text?: string | null; work_authorisation_category?: string | null; country_current?: string | null; countries_target?: string[] | null };
      const sponsorshipRequired = profile.work_authorisation_category === "sponsorship_required";
      setCloudEvidence({ text: profile.base_cv_text ?? "", sponsorshipRequired });
      const applicantPosition = profile.work_authorisation_category === "eu_eea_swiss_citizen" ? "eu-eea-swiss-citizen" : profile.work_authorisation_category === "existing_permission" ? "existing-country-permission" : sponsorshipRequired ? "sponsorship-required" : "unsure";
      const existingMobility = loadMobilityProfile(localStorage, userId);
      if (existingMobility.source !== "saved") {
        saveMobilityProfile(localStorage, userId, {
          schemaVersion: 1,
          currentCountry: profile.country_current ?? "",
          targetCountries: profile.countries_target?.length ? profile.countries_target : ["Ireland"],
          applicantPosition,
          sponsorshipRequired: sponsorshipRequired ? "yes" : profile.work_authorisation_category ? "no" : "unsure",
          relocationPreference: "depends",
        });
      }
    }).catch(() => undefined);
    return () => { active = false; };
  }, [userId]);
  const updateJob = (nextJob: JobRecord) =>
    onChange({
      ...state,
      jobs: state.jobs.map((item) => (item.id === job.id ? nextJob : item)),
    });
  const analyse = () => {
    const evidence = cloudEvidence ?? legacyEvidence(userId);
    const mobilityProfile = loadMobilityProfile(localStorage, userId).profile;
    const sponsorshipRequired =
      mobilityProfile.sponsorshipRequired === "unsure"
        ? evidence.sponsorshipRequired
        : mobilityProfile.sponsorshipRequired === "yes";
    const result = analyseJob(job, evidence.text, {
      careerLane: job.lane,
      sponsorshipRequired,
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
      <div className="workflow-actions"><a className="button-secondary" href={`/dashboard/cv-tailor?job_id=${encodeURIComponent(job.id)}`}>Tailor CV for this job</a></div>
      {tab === "overview" ? (
        <>
          <JobOverview job={job} updateJob={updateJob} />
          <RecruiterOutreachForm
            applicationId={state.applications.find((item) => item.jobId === job.id)?.id}
            job={job}
          />
        </>
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

function RecruiterOutreachForm({ applicationId, job }: { applicationId?: string; job: JobRecord }) {
  const [recruiterName, setRecruiterName] = useState("");
  const [recruiterRole, setRecruiterRole] = useState("Recruiter");
  const [recruiterEmail, setRecruiterEmail] = useState("");
  const [candidateSummary, setCandidateSummary] = useState("");
  const [strengths, setStrengths] = useState("");
  const [channel, setChannel] = useState<"email" | "linkedin_note" | "linkedin_inmail">("email");
  const [contactType, setContactType] = useState<"recruiter"|"hiring_manager"|"peer_target_role">("recruiter");
  const [status, setStatus] = useState("");
  return <section className="workflow-section" aria-labelledby="job-outreach-heading">
    <p className="product-eyebrow">Human-sent outreach</p><h2 id="job-outreach-heading">Draft recruiter outreach</h2>
    <p>Enter recruiter details manually. This form can accept approved lookup autofill later without changing stored data.</p>
    <div className="workflow-form-grid"><label>Contact type<select value={contactType} onChange={(e)=>setContactType(e.target.value as typeof contactType)}><option value="recruiter">Recruiter</option><option value="hiring_manager">Hiring manager</option><option value="peer_target_role">Peer in target role</option></select></label><label>Name<input value={recruiterName} onChange={(e) => setRecruiterName(e.target.value)} /></label><label>Role<input value={recruiterRole} onChange={(e) => setRecruiterRole(e.target.value)} /></label><label>Email <span>optional</span><input type="email" value={recruiterEmail} onChange={(e) => { setRecruiterEmail(e.target.value); if (e.target.value) setChannel("email"); }} /></label><label>Channel<select value={channel} onChange={(e) => setChannel(e.target.value as typeof channel)}><option value="email">Email</option><option value="linkedin_note">LinkedIn note</option><option value="linkedin_inmail">LinkedIn InMail</option></select></label><label className="full-span">Candidate summary<textarea value={candidateSummary} onChange={(e) => setCandidateSummary(e.target.value)} /></label><label className="full-span">Strongest matching evidence (comma separated)<input value={strengths} onChange={(e) => setStrengths(e.target.value)} /></label></div>
    {contactType==="peer_target_role"?<p className="notice-warning">Peer outreach is informational only: ask about the role or team, never for an application update or referral.</p>:null}
    <button className="button-primary" disabled={!applicationId} onClick={async () => { setStatus("Drafting outreach…"); const response = await fetch("/api/outreach", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jobId: applicationId, jobTitle: job.title.value, companyName: job.employer.value, jobDescription: job.description, recruiterName, recruiterRole, recruiterEmail, contactType, candidateSummary, candidateKeyStrengths: strengths.split(",").map((item) => item.trim()).filter(Boolean), channel }) }); const payload = await response.json(); setStatus(response.ok ? "Draft saved. Open Recruiter outreach to review and copy it." : payload.error || "Drafting failed."); }}>Draft outreach</button>
    {!applicationId ? <p className="notice-warning">Prepare an application first so outreach can be linked to the private application record.</p> : null}<p role="status">{status}</p>{status.startsWith("Draft saved") ? <a className="text-link" href="/dashboard/follow-ups">Open recruiter outreach</a> : null}
  </section>;
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
  const { userId } = useDashboardPlan();
  const [mobilitySponsorship, setMobilitySponsorship] =
    useState<MobilityProfile["sponsorshipRequired"]>("unsure");
  useEffect(() => {
    setMobilitySponsorship(
      loadMobilityProfile(localStorage, userId).profile.sponsorshipRequired,
    );
  }, [userId]);
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
            <p>
              <strong>Your saved mobility profile:</strong>{" "}
              {mobilitySponsorship === "unsure"
                ? "Sponsorship need not set"
                : mobilitySponsorship === "yes"
                  ? "Sponsorship required"
                  : "No sponsorship required"}
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

function applicationTone(status: ApplicationWorkspaceStatus): ProductStatus {
  if (["Ready", "Applied", "Offer"].includes(status)) return "confirmed";
  if (["Rejected", "Withdrawn"].includes(status)) return "conflicting";
  return "consider";
}

function applicationNextAction(
  application: ApplicationWorkspace,
  job: JobRecord | undefined,
) {
  if (!job) return "Review application";
  const readiness = getApplicationReadiness(application, job);
  if (application.status === "Preparing") return "Continue preparation";
  if (application.status === "Needs review")
    return readiness.ready ? "Mark ready" : readiness.blockers[0];
  if (application.status === "Ready") return "Confirm applied";
  if (application.status === "Applied") return "Review follow-up";
  if (application.status === "Rejected") return "Review outcome";
  return "Review application";
}

function ApplicationsSystemState({
  kind,
}: {
  kind: "loading" | "unavailable";
}) {
  return (
    <main className="workflow-page phase-three-applications">
      <ProductPageHeader
        eyebrow="Applications"
        title="Your application pipeline"
        description="Track preparation, readiness and submitted applications."
      />
      {kind === "loading" ? (
        <section className="phase-three-system-state" aria-busy="true">
          <span className="phase-three-loading-mark" aria-hidden="true" />
          <div>
            <h2>Loading applications</h2>
            <p role="status">Loading your private application workspace…</p>
          </div>
        </section>
      ) : (
        <section className="phase-three-system-state" role="alert">
          <span className="phase-three-state-icon warning" aria-hidden="true">
            !
          </span>
          <div>
            <h2>Applications are temporarily unavailable</h2>
            <p>Your saved work is unchanged. Try loading the pipeline again.</p>
            <button
              className="button-primary"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        </section>
      )}
    </main>
  );
}

function ApplicationsList({
  state,
  cloudOnly,
  onOpen,
}: {
  state: JobWorkflowState;
  cloudOnly: { application: ApplicationWorkspace; job: JobRecord }[];
  onOpen: (id: string) => void;
}) {
  const [filter, setFilter] = useState("all");
  const [selectedForReview, setSelectedForReview] = useState<string[]>([]);
  const reviewQueue = getApplicationReviewQueue(state);
  const stages: Array<"all" | ApplicationWorkspaceStatus> = [
    "all",
    "Preparing",
    "Needs review",
    "Ready",
    "Applied",
    "Interview",
    "Offer",
    "Rejected",
    "Withdrawn",
  ];
  const visible = state.applications.filter(
    (item) => filter === "all" || item.status === filter,
  );
  return (
    <main className="workflow-page phase-three-applications phase-three-pipeline">
      <ProductPageHeader
        eyebrow="Applications"
        title="Your application pipeline"
        description="See what needs attention and move each application forward."
      />
      <div className="workflow-actions">
        <a className="button-secondary" href="/dashboard/cv-tailor">Tailor CV</a>
        <a className="button-secondary" href="/dashboard/follow-ups">Recruiter outreach</a>
      </div>
      {reviewQueue.length ? (
        <section className="workflow-section" aria-labelledby="review-queue-title">
          <h2 id="review-queue-title">Ready for final review</h2>
          <p>Select up to 20 prepared applications. AutoTime opens them for individual review; it never submits or marks them Applied automatically.</p>
          <ul className="workflow-list">
            {reviewQueue.map(({ application, job }) => (
              <li className="workflow-list-row" key={application.id}>
                <label><input type="checkbox" checked={selectedForReview.includes(application.id)} disabled={!selectedForReview.includes(application.id) && selectedForReview.length >= 20} onChange={(event) => setSelectedForReview((current) => event.target.checked ? [...current, application.id] : current.filter((id) => id !== application.id))} /> {job.title.value} · {job.employer.value}</label>
                <button type="button" className="button-secondary" onClick={() => onOpen(application.id)}>Review application</button>
              </li>
            ))}
          </ul>
          <button type="button" className="button-primary" disabled={!selectedForReview.length} onClick={() => onOpen(selectedForReview[0])}>Open next selected ({selectedForReview.length})</button>
        </section>
      ) : null}
      <section
        className="phase-three-stage-filters"
        aria-label="Application stage filters"
      >
        <span>Stage</span>
        <div role="group" aria-label="Filter applications by stage">
          {stages.map((stage) => {
            const count =
              stage === "all"
                ? state.applications.length
                : state.applications.filter((item) => item.status === stage)
                    .length;
            if (stage !== "all" && count === 0) return null;
            return (
              <button
                aria-pressed={filter === stage}
                key={stage}
                onClick={() => setFilter(stage)}
              >
                {stage === "all" ? "All" : stage} <span>{count}</span>
              </button>
            );
          })}
        </div>
      </section>
      {visible.length ? (
        <section
          className="phase-three-application-list"
          aria-label="Applications"
        >
          {visible.map((application) => {
            const job = state.jobs.find(
              (item) => item.id === application.jobId,
            );
            const readiness = job
              ? getApplicationReadiness(application, job)
              : { blockers: ["Job details unavailable"], ready: false };
            const blocked = application.unsupportedClaims.length > 0;
            return (
              <article
                className="phase-three-application-row"
                key={application.id}
              >
                <div className="phase-three-application-context">
                  <p className="product-eyebrow">
                    {job?.employer.value || "Employer unknown"}
                  </p>
                  <h2>{job?.title.value || "Application"}</h2>
                  <p>
                    {job?.facts.location.value ||
                      job?.facts.country.value ||
                      "Location unknown"}
                  </p>
                </div>
                <div className="phase-three-application-state">
                  <ProductStatusBadge
                    status={applicationTone(application.status)}
                  >
                    {application.status}
                  </ProductStatusBadge>
                  <span
                    className={
                      blocked
                        ? "blocked"
                        : readiness.ready
                          ? "ready"
                          : "unknown"
                    }
                  >
                    <b aria-hidden="true">
                      {blocked ? "×" : readiness.ready ? "✓" : "!"}
                    </b>{" "}
                    {blocked
                      ? "Unsupported claim"
                      : readiness.ready
                        ? "Checks complete"
                        : `${readiness.blockers.length} check${readiness.blockers.length === 1 ? "" : "s"} open`}
                  </span>
                </div>
                <div className="phase-three-application-activity">
                  <span>Last activity</span>
                  <strong>{formatDate(application.updatedAt)}</strong>
                </div>
                <div className="phase-three-application-action">
                  <span>{applicationNextAction(application, job)}</span>
                  <button
                    className="button-secondary"
                    onClick={() => onOpen(application.id)}
                  >
                    Open application
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      ) : state.applications.length ? (
        <section className="phase-three-filter-empty">
          <h2>No applications at this stage</h2>
          <button className="button-secondary" onClick={() => setFilter("all")}>
            Show all applications
          </button>
        </section>
      ) : (
        <ProductEmptyState
          title="No applications yet"
          description="Choose an analysed job when you are ready to prepare an application."
          action={
            <a className="button-primary" href="/dashboard/jobs">
              Review jobs
            </a>
          }
        />
      )}
      {cloudOnly.length ? (
        <section
          className="phase-three-application-list workflow-cloud-bridge"
          aria-label="Applications saved to your account"
        >
          <h2>Also saved to your account</h2>
          <p>
            These were saved from another device or surface of AutoTime and
            aren&apos;t yet tracked in this browser&apos;s pipeline.
          </p>
          {cloudOnly.map(({ application, job }) => (
            <article className="phase-three-application-row" key={application.id}>
              <div className="phase-three-application-context">
                <p className="product-eyebrow">Synced from your account</p>
                <h2>{job.title.value || "Application"}</h2>
                <p>{job.employer.value || "Employer unknown"}</p>
              </div>
              <ProductStatusBadge status={applicationTone(application.status)}>
                {application.status}
              </ProductStatusBadge>
              {job.sourceUrl ? (
                <a
                  className="button-secondary"
                  href={job.sourceUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  View posting
                </a>
              ) : null}
            </article>
          ))}
        </section>
      ) : null}
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
  const analysis = currentAnalysis(job);
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
  const confirmApplied = () =>
    window.confirm(
      "Confirm that you submitted this application outside AutoTime.",
    ) && setStatus("Applied", true);
  const primaryAction =
    application.status === "Preparing" ? (
      <button
        className="button-primary"
        onClick={() => setStatus("Needs review")}
      >
        Start final review
      </button>
    ) : application.status === "Needs review" ? (
      <button
        className="button-primary"
        disabled={!readiness.ready}
        onClick={() => setStatus("Ready")}
      >
        Mark ready
      </button>
    ) : application.status === "Ready" ? (
      <button className="button-primary" onClick={confirmApplied}>
        Mark as applied
      </button>
    ) : application.status === "Applied" ? (
      <a
        className="button-primary"
        href={`/dashboard/interviews?applicationId=${application.id}`}
      >
        Add interview
      </a>
    ) : null;
  return (
    <main className="workflow-page phase-three-applications phase-three-application-detail">
      <a
        href="/dashboard/applications"
        className="text-link phase-three-back-link"
      >
        ← Applications
      </a>
      <ProductPageHeader
        eyebrow={job.employer.value || "Employer unknown"}
        title={job.title.value || "Application workspace"}
        description={
          job.facts.location.value ||
          job.facts.country.value ||
          "Location unknown"
        }
        action={primaryAction}
      />
      <section
        className="phase-three-readiness-summary"
        aria-labelledby="application-readiness-heading"
      >
        <div>
          <ProductStatusBadge status={applicationTone(application.status)}>
            {application.status}
          </ProductStatusBadge>
          <h2 id="application-readiness-heading">
            {readiness.ready
              ? "Required checks are complete"
              : `${readiness.blockers.length} readiness check${readiness.blockers.length === 1 ? "" : "s"} open`}
          </h2>
          <p>{applicationNextAction(application, job)}</p>
        </div>
        {readiness.ready ? (
          <span className="phase-three-readiness-state ready">
            <b aria-hidden="true">✓</b> Ready for the next step
          </span>
        ) : (
          <ul>
            {readiness.blockers.map((item) => (
              <li key={item}>
                <b aria-hidden="true">!</b> {item}
              </li>
            ))}
          </ul>
        )}
      </section>
      {status ? (
        <p className="phase-three-live-status" role="status">
          {status}
        </p>
      ) : null}

      <div className="phase-three-detail-grid">
        <div className="phase-three-detail-main">
          <ApplicationChecklist
            checklist={application.checklist}
            onChange={(checklist) => update({ checklist })}
          />

          <section className="phase-three-section phase-three-evidence-review">
            <header>
              <p className="product-eyebrow">Evidence and claims</p>
              <h2>Review application evidence</h2>
            </header>
            <label className="phase-three-check-control">
              <input
                type="checkbox"
                checked={application.evidenceConfirmed}
                onChange={(event) =>
                  update({ evidenceConfirmed: event.target.checked })
                }
              />
              <span>
                <strong>
                  I confirmed the selected evidence supports the application.
                </strong>
                <small>
                  I checked that selected evidence supports this application.
                </small>
              </span>
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
            <label
              className={
                application.unsupportedClaims.length
                  ? "phase-three-unsupported"
                  : ""
              }
            >
              Unsupported claims
              <textarea
                aria-label="Unsupported-claim review"
                value={application.unsupportedClaims.join("\n")}
                onChange={(event) =>
                  update({
                    unsupportedClaims: event.target.value
                      .split("\n")
                      .map((item) => item.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="Add one unsupported claim per line."
              />
              <small>
                {application.unsupportedClaims.length
                  ? "Blocked: remove or correct every unsupported claim."
                  : "No unsupported claims recorded."}
              </small>
            </label>
            {analysis?.capability.length ? (
              <details className="phase-three-disclosure">
                <summary>View evidence mappings</summary>
                <div>
                  {analysis.capability.map((item) => (
                    <article key={item.requirement}>
                      <strong>{item.requirement}</strong>
                      <span>{item.state}</span>
                      <p>
                        {item.evidence.join("; ") ||
                          "No confirmed supporting evidence."}
                      </p>
                      <small>Vacancy source: “{item.sourceText}”</small>
                    </article>
                  ))}
                </div>
              </details>
            ) : null}
          </section>

          <section className="phase-three-section">
            <header>
              <p className="product-eyebrow">Required review</p>
              <h2>Screening answers</h2>
            </header>
            <label className="phase-three-check-control">
              <input
                type="checkbox"
                checked={application.consequentialAnswersReviewed}
                onChange={(event) =>
                  update({ consequentialAnswersReviewed: event.target.checked })
                }
              />
              <span>
                <strong>I reviewed every consequential answer directly.</strong>
                <small>
                  I directly checked work-right, sponsorship, salary, legal,
                  health and demographic answers.
                </small>
              </span>
            </label>
          </section>

          <details className="phase-three-disclosure phase-three-supporting">
            <summary>Optional cover letter</summary>
            <div>
              <label className="phase-three-check-control">
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
                />
                <span>
                  <strong>Prepare a cover letter</strong>
                  <small>Use confirmed role facts and evidence only.</small>
                </span>
              </label>
              {application.coverLetterRequested ? (
                <textarea
                  value={application.coverLetter ?? ""}
                  onChange={(event) =>
                    update({ coverLetter: event.target.value })
                  }
                  placeholder="Draft only from confirmed role facts and evidence."
                />
              ) : null}
            </div>
          </details>
        </div>

        <aside className="phase-three-detail-aside">
          {application.status === "Applied" ? (
            <section className="phase-three-section phase-three-submission-record">
              <p className="product-eyebrow">Applied</p>
              <h2>Submission record</h2>
              <p>
                Applied {formatDate(application.appliedAt)}. Recorded by you.
                AutoTime did not submit externally.
              </p>
              <div className="phase-three-record-fields">
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
          {interviews.length ? (
            <section className="phase-three-section">
              <p className="product-eyebrow">Next stage</p>
              <h2>Linked interviews</h2>
              <ul className="phase-three-linked-list">
                {interviews.map((interview) => (
                  <li key={interview.id}>
                    <a href={`/dashboard/interviews/${interview.id}`}>
                      {interview.stage.replaceAll("_", " ")}
                    </a>
                    <span>
                      {interview.status} ·{" "}
                      {interview.scheduledAt
                        ? formatDate(interview.scheduledAt)
                        : "Date not set"}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <details className="phase-three-disclosure phase-three-supporting">
            <summary>Safety guidance</summary>
            <p>
              AI suggestions are drafts. Confirm evidence, claims and
              consequential answers yourself.
            </p>
          </details>
          <Activity job={job} application={application} />
        </aside>
      </div>
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
