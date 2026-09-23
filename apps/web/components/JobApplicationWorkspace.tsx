"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ProductEmptyState,
  ProductPageHeader,
  ProductStatusBadge,
  SyncStatusLine,
  type ProductStatus,
  type SyncStatusLineState,
} from "./product-ui";
import { useDashboardPlan } from "./UserNav";
import { ApplicationChecklist } from "./ApplicationChecklist";
import { Badge } from "./ui";
import {
  analyseJob,
  cloudApplicationToWorkspaceJob,
  createApplication,
  duplicateJob,
  extractJob,
  getApplicationReadiness,
  getApplicationReviewQueue,
  getGovernedSourcesForCountry,
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
import {
  buildApplicationKitRequest,
  type OnboardingProfileFields,
} from "../lib/application-kit-request";
import { assessCoreLoopTrace } from "../domains/core-loop/traceability";
import { trackCoreLoopIntegrityIssue, trackDecisionOverride } from "../lib/analytics";
import {
  emitMobilityLearningEvent,
  readLearningConsent,
  setLearningConsent,
  submitMobilityComprehension,
  type LearningConsentState,
} from "../lib/mobility-learning-client";
import type { ApplicationContentDraft, ApplicationRecord, MobilityProfile } from "shared";

type View =
  | { kind: "jobs" }
  | { kind: "job"; id: string }
  | { kind: "applications" }
  | { kind: "application"; id: string }
  | { kind: "pipeline" };

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
      // localStorage doesn't exist during SSR, so this E2E-only test
      // fixture can only be read client-side post-mount.
      // eslint-disable-next-line react-hooks/set-state-in-effect
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

  // assessCoreLoopTrace (packages/shared's sibling domain,
  // apps/web/domains/core-loop/traceability.ts) validates
  // captured -> decided -> preparing -> approved -> applied -> interview ->
  // outcome continuity without reading any CV, vacancy or generated-document
  // content - it was already correct and already tested
  // (scripts/core-loop-traceability.test.mjs) but had no caller anywhere in
  // the app. This is the first one: a real, always-on check against every
  // loaded job/application/interview set, reporting only enum issue codes
  // (never content) so a genuine inconsistency (e.g. an interview linked to
  // the wrong application) becomes visible instead of silently accumulating.
  // Deliberately observational, not blocking - this is the first time real
  // data has ever been checked against this function, so the safe first
  // move is to see what it finds, not to gate the UI on it.
  const reportedCoreLoopIssuesRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!ready) return;
    for (const job of state.jobs) {
      const application = state.applications.find(
        (item) => item.jobId === job.id,
      );
      if (!application) continue;
      const trace = assessCoreLoopTrace({
        job,
        application,
        interviews: interviews.filter(
          (item) => item.jobId === job.id,
        ),
      });
      if (trace.valid) continue;
      const key = `${application.id}:${trace.issueCodes.join(",")}`;
      if (reportedCoreLoopIssuesRef.current.has(key)) continue;
      reportedCoreLoopIssuesRef.current.add(key);
      trackCoreLoopIntegrityIssue({
        applicationId: application.id,
        issueCodes: trace.issueCodes,
        stage: trace.stage,
      });
    }
  }, [ready, state.jobs, state.applications, interviews]);

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
        sync={{ state: jobWorkflowSync.state, status: jobWorkflowSync.status }}
      />
    );
  if (view.kind === "applications")
    return (
      <ApplicationsList
        state={state}
        cloudOnly={cloudOnly}
        onOpen={(id) => router.push(`/dashboard/applications/${id}`)}
        sync={{ state: jobWorkflowSync.state, status: jobWorkflowSync.status }}
      />
    );
  if (view.kind === "pipeline")
    return (
      <PipelineBoard
        state={state}
        onChange={persist}
        onOpen={(id) => router.push(`/dashboard/applications/${id}`)}
        status={status}
        setStatus={setStatus}
        sync={{ state: jobWorkflowSync.state, status: jobWorkflowSync.status }}
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
        sync={{ state: jobWorkflowSync.state, status: jobWorkflowSync.status }}
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
      sync={{ state: jobWorkflowSync.state, status: jobWorkflowSync.status }}
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
  sync,
}: {
  state: JobWorkflowState;
  cloudOnlyJobs: JobRecord[];
  onChange: (value: JobWorkflowState) => void;
  onOpen: (id: string) => void;
  status: string;
  setStatus: (value: string) => void;
  sync: { state: SyncStatusLineState; status: string };
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
      <SyncStatusLine state={sync.state} status={sync.status} />
      <p><Link className="text-link" href="/dashboard/jobs/browse">Browse aggregated EU jobs</Link></p>
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
  sync,
}: {
  job: JobRecord;
  state: JobWorkflowState;
  onChange: (value: JobWorkflowState) => void;
  onStatus: (value: string) => void;
  status: string;
  sync: { state: SyncStatusLineState; status: string };
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
      mobilityProfile,
    });
    const nextJob = {
      ...job,
      analysisHistory: [...job.analysisHistory, result],
      analysisState: "Analysed" as const,
      updatedAt: result.createdAt,
    };
    // A linked application's evidenceConfirmed/consequentialAnswersReviewed
    // checkboxes are confirmations against *this specific* analysis - if a
    // reanalysis changes the evidence picture (new decision, new missing
    // evidence, new risk areas), those confirmations are stale, not just
    // out of date. Without this, the readiness gate would still treat them
    // as satisfied and let the candidate reach "Ready"/"Applied" without
    // ever having reviewed the new analysis. Never touches an application
    // that's already Applied or further along - only Preparing/Needs
    // review/Ready get walked back to Preparing to force re-review, since
    // those are the only statuses reachable before a real submission.
    const linkedApplication = state.applications.find(
      (item) => item.jobId === job.id,
    );
    const resettableStatuses: ApplicationWorkspaceStatus[] = [
      "Preparing",
      "Needs review",
      "Ready",
    ];
    const nextApplications =
      linkedApplication && resettableStatuses.includes(linkedApplication.status)
        ? state.applications.map((item) =>
            item.id === linkedApplication.id
              ? {
                  ...item,
                  status: "Preparing" as const,
                  evidenceConfirmed: false,
                  consequentialAnswersReviewed: false,
                  updatedAt: result.createdAt,
                }
              : item,
          )
        : state.applications;
    onChange({
      ...state,
      jobs: state.jobs.map((item) => (item.id === job.id ? nextJob : item)),
      applications: nextApplications,
    });
    setTab("analysis");
    onStatus(
      linkedApplication && resettableStatuses.includes(linkedApplication.status)
        ? `Analysis version ${result.version} saved. The linked application's evidence confirmation was reset - review it again before marking Ready.`
        : `Analysis version ${result.version} saved.`,
    );
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
  const prepareAnyway = () => {
    if (
      !window.confirm(
        "This role's viability decision is \"Consider\", not \"Apply\" - material evidence or vacancy facts still need resolution. Prepare an application anyway?",
      )
    ) {
      return;
    }
    trackDecisionOverride({ contentGate: "stretch", decision: analysis?.decision ?? "Consider" });
    prepare();
  };
  return (
    <main className="workflow-page phase-two-jobs phase-two-job-detail">
      <Link href="/dashboard/jobs" className="text-link phase-two-job-back">
        {"\u2190"} Jobs
      </Link>
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
      <SyncStatusLine state={sync.state} status={sync.status} />
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
              : analysis?.decision === "Consider"
                ? "The role may be viable, but material evidence or vacancy facts need resolution. You can prepare anyway if you've weighed the gap yourself."
                : "Record or resolve the viability decision before preparing application material."}
          </p>
          <button
            className="button-primary"
            disabled={analysis?.decision !== "Apply"}
            onClick={prepare}
          >
            Prepare application
          </button>
          {analysis?.decision === "Consider" ? (
            <button className="button-secondary" onClick={prepareAnyway}>
              Prepare anyway
            </button>
          ) : null}
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
    <button className="button-secondary" disabled={!applicationId} onClick={async () => { setStatus("Drafting outreach…"); const response = await fetch("/api/outreach", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jobId: applicationId, jobTitle: job.title.value, companyName: job.employer.value, jobDescription: job.description, recruiterName, recruiterRole, recruiterEmail, contactType, candidateSummary, candidateKeyStrengths: strengths.split(",").map((item) => item.trim()).filter(Boolean), channel }) }); const payload = await response.json(); setStatus(response.ok ? "Draft saved. Open Recruiter outreach to review and copy it." : payload.error || "Drafting failed."); }}>Draft outreach</button>
    {!applicationId ? <p className="notice-warning">Prepare an application first so outreach can be linked to the private application record.</p> : null}<p role="status">{status}</p>{status.startsWith("Draft saved") ? <Link className="text-link" href="/dashboard/follow-ups">Open recruiter outreach</Link> : null}
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
  const governedSources = useMemo(
    () => getGovernedSourcesForCountry(job.facts.country.value),
    [job.facts.country.value],
  );
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
      <section
        className="workflow-section phase-two-official-sources"
        aria-label="Official verification sources"
      >
        <header className="phase-two-section-heading">
          <div>
            <p className="product-eyebrow">Official verification</p>
            <h2>Governed sources</h2>
          </div>
        </header>
        <p>
          AutoTime does not authorise work-right, visa or sponsorship status.
          Verify current requirements directly with the sources below before
          relying on this recommendation.
        </p>
        <ul className="phase-two-source-list">
          {governedSources.map((source) => (
            <li key={source.url}>
              <a href={source.url} rel="noreferrer" target="_blank">
                <strong>{source.title}</strong>
                <span>{source.publisher}</span>
              </a>
              <small>
                {source.jurisdiction} - reviewed {source.reviewedAt} (rules{" "}
                {source.ruleVersion})
              </small>
            </li>
          ))}
        </ul>
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
                        : item ===
                            "Mobility pathway verification against the governed sources"
                          ? "Your cross-border mobility evidence is not yet strong enough to confirm this pathway - verify it against the sources below before investing more time."
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
              <Link href="/dashboard/international">View country facts</Link>
              <Link href="/dashboard/profile-evidence">Review profile evidence</Link>
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

function LineageIcon({ kind }: { kind: "vacancy" | "evidence" | "rules" | "decision" }) {
  const paths = {
    vacancy: <><path d="M7 3h7l3 3v15H7z" /><path d="M14 3v4h4M10 11h5M10 15h5" /></>,
    evidence: <><path d="M9 3h6l1 3h3v15H5V6h3z" /><path d="m9 14 2 2 4-5" /></>,
    rules: <><path d="M4 6h16M7 6l1-3h8l1 3M6 6l-2 6h4L6 6Zm12 0-2 6h4l-2-6ZM12 6v14M8 20h8" /></>,
    decision: <><circle cx="12" cy="12" r="9" /><path d="m8.5 12 2.3 2.3 4.8-5" /></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24">{paths[kind]}</svg>;
}

type DecisionLineageLedger = {
  decision: Record<string, unknown>;
  ruleBundle: Record<string, unknown> | null;
  readinessSnapshot: Record<string, unknown> | null;
  employerVerification: Record<string, unknown> | null;
  evidenceLinks: Record<string, unknown>[];
  claims: Record<string, unknown>[];
  sourceSpans: Record<string, unknown>[];
  sourceVersions: Record<string, unknown>[];
  sourceDocuments: Record<string, unknown>[];
  candidateEvidence: Record<string, unknown>[];
  expertSignoffs: Record<string, unknown>[];
  corrections: Record<string, unknown>[];
  correctionReviews: Record<string, unknown>[];
  replays: Record<string, unknown>[];
};

function replayRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function DecisionReplayHistory({ replays }: { replays: Record<string, unknown>[] }) {
  if (!replays.length) return null;
  return (
    <section className="decision-replay-history" aria-label="Decision replay history">
      <span className="decision-lineage-current-label">Recorded policy comparisons</span>
      {replays.slice(0, 3).map((replay, index) => {
        const diff = replayRecord(replay.diff);
        const original = replayRecord(diff.original);
        const replayed = replayRecord(diff.replayed);
        const isComparison = replay.mode === "successor_comparison";
        const equivalent = replay.equivalent === true;
        return (
          <article key={String(replay.id ?? index)}>
            <div>
              <span>{isComparison ? "Approved policy comparison" : "Historical reproducibility"}</span>
              <strong>{equivalent ? "No decision change" : "Decision or matched rule changed"}</strong>
              <small>Completed {formatDate(String(replay.completed_at ?? replay.recorded_at ?? ""))}</small>
            </div>
            <dl>
              <div><dt>Policy</dt><dd>v{String(original.version ?? "—")} → v{String(replayed.version ?? original.version ?? "—")}</dd></div>
              <div><dt>Result</dt><dd>{String(original.actualState ?? "Unknown").replaceAll("_", " ")} → {String(replayed.actualState ?? "Unknown").replaceAll("_", " ")}</dd></div>
              <div><dt>Matched rule</dt><dd>{String(original.matchedRuleId ?? "None")} → {String(replayed.matchedRuleId ?? "None")}</dd></div>
            </dl>
          </article>
        );
      })}
    </section>
  );
}

function DecisionCorrectionHistory({ corrections, reviews }: { corrections: Record<string, unknown>[]; reviews: Record<string, unknown>[] }) {
  if (!corrections.length) return null;
  return (
    <section className="decision-correction-history" aria-label="Decision correction history">
      <span className="decision-lineage-current-label">Disagreement history</span>
      {corrections.slice(0, 3).map((correction, index) => {
        const review = reviews.find((item) => item.correction_id === correction.id);
        const evidence = Array.isArray(review?.evidence_references) ? review.evidence_references : [];
        const reasons = Array.isArray(review?.reason_codes) ? review.reason_codes.map(String) : [];
        return (
          <article key={String(correction.id ?? index)}>
            <div>
              <span>{String(correction.target_type ?? "decision").replaceAll("_", " ")}</span>
              <strong>{String(review?.decision ?? correction.state ?? "submitted").replaceAll("_", " ")}</strong>
              <small>Submitted {formatDate(String(correction.submitted_at ?? ""))}</small>
            </div>
            <div>
              <p>{String(review?.resolution_notes ?? correction.reason ?? "Awaiting governed review.")}</p>
              <small>{reasons.length ? reasons.join(" · ").replaceAll("_", " ") : "Review pending"} · {evidence.length} evidence reference{evidence.length === 1 ? "" : "s"}</small>
              {review?.successor_decision_id ? <small>Corrected by successor decision {String(review.successor_decision_id).slice(0, 8).toUpperCase()}</small> : null}
            </div>
          </article>
        );
      })}
    </section>
  );
}

function DecisionLineage({
  analysis,
  application,
  interviews,
  job,
  learningConsent,
}: {
  analysis: ReturnType<typeof currentAnalysis>;
  application: ApplicationWorkspace;
  interviews: InterviewRecord[];
  job: JobRecord;
  learningConsent: LearningConsentState | null;
}) {
  const sources = getGovernedSourcesForCountry(job.facts.country.value);
  const [ledger, setLedger] = useState<DecisionLineageLedger | null>(null);
  const [ledgerState, setLedgerState] = useState<"idle" | "loading" | "loaded" | "unavailable">("idle");
  const [ledgerRefresh, setLedgerRefresh] = useState(0);
  const [correctionTarget, setCorrectionTarget] = useState("output");
  const [correctionReason, setCorrectionReason] = useState("");
  const [lineageAction, setLineageAction] = useState<"idle" | "correction" | "original-replay" | "successor-replay">("idle");
  const [lineageActionStatus, setLineageActionStatus] = useState("");
  const [comprehensionReason, setComprehensionReason] = useState<"UNCLEAR_TERMINOLOGY" | "UNCLEAR_EVIDENCE" | "UNCLEAR_ACTION" | "OTHER">("UNCLEAR_ACTION");
  const [comprehensionStatus, setComprehensionStatus] = useState("");
  const [savingComprehension, setSavingComprehension] = useState(false);
  useEffect(() => {
    if (!application.mobilityDecisionId) {
      setLedger(null);
      setLedgerState("idle");
      return;
    }
    const controller = new AbortController();
    setLedgerState("loading");
    void fetch(`/api/mobility/decisions/${encodeURIComponent(application.mobilityDecisionId)}`, {
      cache: "no-store",
      signal: controller.signal,
    }).then(async (response) => {
      const payload = await response.json() as { data: DecisionLineageLedger | null };
      if (!response.ok || !payload.data) throw new Error("Lineage unavailable");
      setLedger(payload.data);
      setLedgerState("loaded");
    }).catch((error) => {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setLedger(null);
      setLedgerState("unavailable");
    });
    return () => controller.abort();
  }, [application.mobilityDecisionId, ledgerRefresh]);
  const submitLineageAction = async (
    payload: Record<string, unknown>,
    action: "correction" | "original-replay" | "successor-replay",
  ) => {
    if (!application.mobilityDecisionId) return;
    setLineageAction(action);
    setLineageActionStatus(action === "correction"
      ? "Submitting correction…"
      : action === "original-replay"
        ? "Replaying recorded policy…"
        : "Comparing with the approved current policy…");
    try {
      const response = await fetch(`/api/mobility/decisions/${encodeURIComponent(application.mobilityDecisionId)}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json() as { data?: { correction?: { id?: string } }; error: string | null };
      if (!response.ok) throw new Error(result.error ?? "Action failed");
      if (action === "correction") {
        setCorrectionReason("");
        const correctionId = result.data?.correction?.id;
        if (learningConsent?.enabled && correctionId) {
          void emitMobilityLearningEvent({
            consentId: learningConsent.consentId,
            decisionId: application.mobilityDecisionId,
            applicationId: application.id,
            correctionId,
            eventType: "correction_submitted",
            evidenceClass: "user_reported",
          }).catch(() => setLineageActionStatus("Correction saved, but it was not added to consent-scoped learning."));
        }
      }
      setLineageActionStatus(action === "correction"
        ? "Correction submitted for review."
        : action === "original-replay"
          ? "Original-policy replay completed."
          : "Approved-policy comparison completed.");
      setLedgerRefresh((value) => value + 1);
    } catch (error) {
      setLineageActionStatus(error instanceof Error ? error.message : "The lineage action could not be saved.");
    } finally {
      setLineageAction("idle");
    }
  };
  const mappedEvidence = analysis?.capability.filter((item) => item.state !== "missing").length ?? 0;
  const evidenceTotal = analysis?.capability.length ?? 0;
  const decisionRecorded = Boolean(application.mobilityDecisionId);
  const recordComprehension = async (understood: boolean) => {
    if (!application.mobilityDecisionId || !learningConsent?.enabled) return;
    setSavingComprehension(true); setComprehensionStatus("");
    try {
      await submitMobilityComprehension({
        consentId: learningConsent.consentId, decisionId: application.mobilityDecisionId,
        understood, reasonCode: understood ? "CLEAR" : comprehensionReason,
      });
      setComprehensionStatus(understood ? "Clarity confirmed." : "Clarity issue recorded for review.");
    } catch (error) {
      setComprehensionStatus(error instanceof Error ? error.message : "Clarity response could not be saved.");
    } finally { setSavingComprehension(false); }
  };
  const latestOutcome = interviews.at(-1)?.status ?? application.status;
  const recordLabel = application.mobilityDecisionId
    ? application.mobilityDecisionId.slice(0, 8).toUpperCase()
    : null;

  return (
    <section className="decision-lineage" aria-labelledby="decision-lineage-heading">
      <header className="decision-lineage-hero">
        <div className="decision-lineage-heading">
          <span className="decision-lineage-mark" aria-hidden="true">
            <LineageIcon kind="decision" />
          </span>
          <div>
            <p className="product-eyebrow">Decision intelligence</p>
            <h2 id="decision-lineage-heading">Why this recommendation exists</h2>
            <p>Follow the evidence from the captured vacancy to the current outcome.</p>
          </div>
        </div>
        <div className={`decision-lineage-record ${decisionRecorded ? "recorded" : "local"}`}>
          <span>{decisionRecorded ? "Immutable record" : "Local snapshot"}</span>
          <strong>{recordLabel ? `#${recordLabel}` : "Not recorded yet"}</strong>
          <small>
            {ledgerState === "loading"
              ? "Verifying the stored lineage…"
              : ledgerState === "loaded"
                ? "Stored lineage verified for this account."
                : ledgerState === "unavailable"
                  ? "Record exists, but its lineage could not be loaded."
                  : decisionRecorded
              ? "A server decision record was created with the application kit."
              : "Generate the application kit to create a governed server record."}
          </small>
        </div>
      </header>

      <ol className="decision-lineage-chain" aria-label="Decision evidence chain">
        <li>
          <span className="decision-lineage-node"><LineageIcon kind="vacancy" /></span>
          <div><small>01 · Input</small><strong>Vacancy captured</strong><span>{job.source}</span></div>
        </li>
        <li>
          <span className="decision-lineage-node"><LineageIcon kind="evidence" /></span>
          <div><small>02 · Match</small><strong>{mappedEvidence}/{evidenceTotal} mapped</strong><span>Candidate evidence</span></div>
        </li>
        <li>
          <span className="decision-lineage-node"><LineageIcon kind="rules" /></span>
          <div><small>03 · Verify</small><strong>{sources.length} official source{sources.length === 1 ? "" : "s"}</strong><span>{job.facts.country.value || "European guidance"}</span></div>
        </li>
        <li className="is-current">
          <span className="decision-lineage-node"><LineageIcon kind="decision" /></span>
          <div><small>04 · Decision</small><strong>{analysis?.decision ?? "Not analysed"}</strong><span>{analysis ? `${analysis.confidence} confidence · v${analysis.version}` : "Evidence pending"}</span></div>
        </li>
      </ol>

      <div className="decision-lineage-details">
        <div className="decision-lineage-explanation">
          <span className="decision-lineage-kicker">Decision rationale</span>
          <h3>{analysis?.reason ?? "Analyse the vacancy to produce an evidence-backed recommendation."}</h3>
          <dl>
            <div><dt>Strongest signal</dt><dd>{analysis?.positiveEvidence ?? "No supporting signal recorded."}</dd></div>
            <div><dt>Key risk</dt><dd>{analysis?.criticalRisk ?? "Not assessed."}</dd></div>
            <div><dt>Next verification</dt><dd>{analysis?.nextAction ?? "Complete vacancy analysis."}</dd></div>
          </dl>
        </div>
        <aside className="decision-lineage-outcome">
          <span className="decision-lineage-kicker">Learning loop</span>
          <strong>{latestOutcome.replaceAll("_", " ")}</strong>
          <p>{interviews.length ? `${interviews.length} linked interview event${interviews.length === 1 ? "" : "s"}.` : "No interview outcome recorded yet."}</p>
          <span className={`decision-lineage-consent ${decisionRecorded ? "active" : ""}`}>
            {decisionRecorded ? "Decision can be linked to outcomes" : "Outcome linkage awaits a decision record"}
          </span>
        </aside>
      </div>

      {decisionRecorded ? (
        <section className="decision-comprehension" aria-labelledby="decision-comprehension-title">
          <div><span className="decision-lineage-kicker">Comprehension evidence</span><h3 id="decision-comprehension-title">Is the recommendation and next action clear?</h3></div>
          {learningConsent?.enabled ? <div className="decision-comprehension-controls">
            <button className="button-secondary" disabled={savingComprehension} onClick={() => void recordComprehension(true)} type="button">Yes, clear</button>
            <select aria-label="Reason the recommendation is unclear" disabled={savingComprehension} value={comprehensionReason} onChange={(event) => setComprehensionReason(event.target.value as typeof comprehensionReason)}><option value="UNCLEAR_ACTION">Next action is unclear</option><option value="UNCLEAR_EVIDENCE">Evidence is unclear</option><option value="UNCLEAR_TERMINOLOGY">Terminology is unclear</option><option value="OTHER">Another clarity issue</option></select>
            <button className="button-secondary" disabled={savingComprehension} onClick={() => void recordComprehension(false)} type="button">Not yet clear</button>
          </div> : <p>Enable private learning contribution to provide consent-scoped clarity evidence.</p>}
          {comprehensionStatus ? <p role="status">{comprehensionStatus}</p> : null}
        </section>
      ) : null}

      {decisionRecorded ? (
        <details className="decision-lineage-actions">
          <summary>
            <span>Correct or replay this decision</span>
            <small>History remains unchanged and auditable</small>
          </summary>
          <div className="decision-lineage-action-grid">
            <form onSubmit={(event) => {
              event.preventDefault();
              void submitLineageAction({ action: "submit_correction", targetType: correctionTarget, targetId: application.mobilityDecisionId, reason: correctionReason }, "correction");
            }}>
              <span className="decision-lineage-kicker">Report a disagreement</span>
              <h3>What appears incorrect?</h3>
              <label>Area<select value={correctionTarget} onChange={(event) => setCorrectionTarget(event.target.value)}><option value="output">Recommendation</option><option value="candidate_evidence">Candidate evidence</option><option value="vacancy">Vacancy information</option><option value="employer">Employer verification</option><option value="claim">Mobility claim</option><option value="source">Official source</option><option value="rule">Decision rule</option></select></label>
              <label>Reason<textarea value={correctionReason} onChange={(event) => setCorrectionReason(event.target.value)} minLength={10} maxLength={2000} required placeholder="Explain what is wrong and what evidence should be checked." /></label>
              <button className="button-secondary" disabled={lineageAction !== "idle" || correctionReason.trim().length < 10} type="submit">{lineageAction === "correction" ? "Submitting…" : "Submit correction"}</button>
            </form>
            <section>
              <span className="decision-lineage-kicker">Reproducibility</span>
              <h3>Replay the original decision</h3>
              <p>Re-run the recorded policy facts against the exact historical rule bundle. This does not replace the original result.</p>
              <button className="button-secondary" disabled={lineageAction !== "idle"} onClick={() => void submitLineageAction({ action: "request_replay", mode: "original_versions" }, "original-replay")} type="button">{lineageAction === "original-replay" ? "Replaying…" : "Replay original policy"}</button>
              <button className="button-secondary" disabled={lineageAction !== "idle"} onClick={() => void submitLineageAction({ action: "request_replay", mode: "successor_comparison" }, "successor-replay")} type="button">{lineageAction === "successor-replay" ? "Comparing…" : "Compare approved current policy"}</button>
              <small>Original replay verifies deterministic execution. Current-policy comparison runs the same recorded facts only against an audited, active successor bundle. Hashed CV and profile evidence remain private and are not reconstructed.</small>
            </section>
          </div>
          {lineageActionStatus ? <p className="decision-lineage-action-status" role="status">{lineageActionStatus}</p> : null}
        </details>
      ) : null}

      <details className="decision-lineage-sources">
        <summary>
          <span>Inspect official source provenance</span>
          <small>{sources.length ? `Reviewed sources for ${job.facts.country.value || "Europe"}` : "No governed source available"}</small>
        </summary>
        <div>
          {ledgerState === "loaded" && ledger ? (
            <section className="decision-ledger-summary" aria-label="Stored decision lineage">
              <div><span>Rule bundle</span><strong>v{String(ledger.ruleBundle?.version ?? "—")}</strong><small>{String(ledger.ruleBundle?.state ?? "Unknown state")}</small></div>
              <div><span>Evidence links</span><strong>{ledger.evidenceLinks.length}</strong><small>{ledger.claims.length} versioned claim{ledger.claims.length === 1 ? "" : "s"}</small></div>
              <div><span>Employer check</span><strong>{String(ledger.employerVerification?.state ?? "Not applicable").replaceAll("_", " ")}</strong><small>{ledger.employerVerification ? String((ledger.employerVerification.reason_codes as string[] | undefined)?.join(", ") ?? "Verification recorded") : "No employer verification required"}</small></div>
              <div><span>Expert sign-off</span><strong>{ledger.expertSignoffs.length ? String(ledger.expertSignoffs[0]?.decision ?? "Recorded") : "None"}</strong><small>{ledger.expertSignoffs.length ? `Review by ${formatDate(String(ledger.expertSignoffs[0]?.review_by ?? ""))}` : "No sign-off linked"}</small></div>
              <div><span>Corrections / replays</span><strong>{ledger.corrections.length} / {ledger.replays.length}</strong><small>Append-only history</small></div>
            </section>
          ) : ledgerState === "loading" ? (
            <p className="decision-ledger-state" role="status">Loading the stored source and decision versions…</p>
          ) : ledgerState === "unavailable" ? (
            <p className="decision-ledger-state warning" role="status">The saved record could not be verified right now. Current guidance remains visible below, but it is not a substitute for the historical ledger.</p>
          ) : null}
          {ledgerState === "loaded" && ledger ? <DecisionCorrectionHistory corrections={ledger.corrections} reviews={ledger.correctionReviews} /> : null}
          {ledgerState === "loaded" && ledger ? <DecisionReplayHistory replays={ledger.replays} /> : null}
          {ledger?.sourceVersions.map((version) => {
            const document = ledger.sourceDocuments.find((item) => item.id === version.source_document_id);
            const linkedSpans = ledger.sourceSpans.filter((item) => item.source_version_id === version.id);
            return (
              <article className="decision-ledger-source" key={String(version.id)}>
                <div><span>{String(document?.publisher ?? "Official source")}</span><strong>{String(document?.jurisdiction ?? job.facts.country.value)} · source version {String(version.version)}</strong></div>
                <dl><div><dt>Retrieved</dt><dd>{formatDate(String(version.retrieved_at))}</dd></div><div><dt>Linked passages</dt><dd>{linkedSpans.length}</dd></div></dl>
                {document?.canonical_url ? <a href={String(document.canonical_url)} rel="noreferrer" target="_blank">Open recorded source ↗</a> : null}
              </article>
            );
          })}
          {ledgerState === "loaded" && ledger?.sourceVersions.length === 0 ? <p className="decision-ledger-state warning">This decision is stored, but it has no claim-to-source evidence links. Treat its provenance as incomplete.</p> : null}
          <p className="decision-lineage-current-label">Current governed guidance</p>
          {sources.map((source) => (
            <article key={`${source.url}-${source.ruleVersion}`}>
              <div><span>{source.publisher}</span><strong>{source.title}</strong></div>
              <dl>
                <div><dt>Rule version</dt><dd>{source.ruleVersion}</dd></div>
                <div><dt>Last reviewed</dt><dd>{formatDate(source.reviewedAt)}</dd></div>
              </dl>
              <a href={source.url} rel="noreferrer" target="_blank" aria-label={`Open official source: ${source.title}`}>Open source ↗</a>
            </article>
          ))}
          {!sources.length ? <p>AutoTime is not presenting an official-source claim for this country.</p> : null}
          <p className="decision-lineage-freshness">Current sources may be newer than the stored decision. AutoTime keeps the two views separate so a later rule update cannot silently rewrite what supported the original recommendation.</p>
        </div>
      </details>
    </section>
  );
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
  sync,
}: {
  state: JobWorkflowState;
  cloudOnly: { application: ApplicationWorkspace; job: JobRecord }[];
  onOpen: (id: string) => void;
  sync: { state: SyncStatusLineState; status: string };
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
    <main className="workflow-page phase-three-applications phase-three-pipeline applications-redesign">
      <ProductPageHeader
        eyebrow="Applications"
        title="Your application pipeline"
        description="See what needs attention and move each application forward."
      />
      <SyncStatusLine state={sync.state} status={sync.status} />
      <div className="workflow-actions">
        <Link className="button-secondary" href="/dashboard/cv-tailor">Tailor CV</Link>
        <Link className="button-secondary" href="/dashboard/follow-ups">Recruiter outreach</Link>
        <Link className="button-secondary" href="/dashboard/pipeline">Pipeline board</Link>
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
                  <Badge tone={blocked ? "danger" : readiness.ready ? "good" : "warn"}>
                    <b aria-hidden="true">
                      {blocked ? "×" : readiness.ready ? "✓" : "!"}
                    </b>{" "}
                    {blocked
                      ? "Unsupported claim"
                      : readiness.ready
                        ? "Checks complete"
                        : `${readiness.blockers.length} check${readiness.blockers.length === 1 ? "" : "s"} open`}
                  </Badge>
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
            <Link className="button-primary" href="/dashboard/jobs">
              Review jobs
            </Link>
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

const PIPELINE_COLUMNS: ApplicationWorkspaceStatus[] = [
  "Preparing",
  "Needs review",
  "Ready",
  "Applied",
  "Interview",
  "Offer",
  "Rejected",
  "Withdrawn",
];

function PipelineBoard({
  state,
  onChange,
  onOpen,
  status,
  setStatus,
  sync,
}: {
  state: JobWorkflowState;
  onChange: (value: JobWorkflowState) => void;
  onOpen: (id: string) => void;
  status: string;
  setStatus: (value: string) => void;
  sync: { state: SyncStatusLineState; status: string };
}) {
  const [selectedId, setSelectedId] = useState<string | null>(
    state.applications[0]?.id ?? null,
  );
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const selected = state.applications.find((item) => item.id === selectedId);
  const selectedJob =
    selected && state.jobs.find((item) => item.id === selected.jobId);

  const moveApplication = (
    applicationId: string,
    next: ApplicationWorkspaceStatus,
  ) => {
    const application = state.applications.find(
      (item) => item.id === applicationId,
    );
    const job = application && state.jobs.find((item) => item.id === application.jobId);
    if (!application || !job) return;
    if (application.status === next) return;
    const confirmed =
      next === "Applied"
        ? window.confirm(
            "Confirm that you submitted this application outside AutoTime.",
          )
        : true;
    if (next === "Applied" && !confirmed) return;
    try {
      const changed = transitionApplication(application, next, job, confirmed);
      onChange({
        ...state,
        applications: state.applications.map((item) =>
          item.id === changed.id ? changed : item,
        ),
      });
      setStatus(`Application marked ${next}.`);
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Status could not be changed.",
      );
    }
  };

  return (
    <main className="workflow-page phase-three-applications pipeline-board-page">
      <ProductPageHeader
        eyebrow="Applications"
        title="Pipeline board"
        description="Drag a company to move it forward. AutoTime still enforces the same readiness checks as the list view - a move that isn't allowed yet is rejected, not silently applied."
        action={
          <Link className="button-secondary" href="/dashboard/applications">
            List view
          </Link>
        }
      />
      <SyncStatusLine state={sync.state} status={sync.status} />
      {status ? (
        <p className="status info" role="status">
          {status}
        </p>
      ) : null}
      <div className="pipeline-board-layout">
        <div className="pipeline-board-scroll">
          <div className="pipeline-board">
            {PIPELINE_COLUMNS.map((column) => {
              const columnApplications = state.applications.filter(
                (item) => item.status === column,
              );
              return (
                <section className="pipeline-column" key={column}>
                  <header className="pipeline-column-head">
                    <h2>{column}</h2>
                    <span className="pipeline-column-count">
                      {columnApplications.length}
                    </span>
                  </header>
                  <div
                    className="pipeline-column-cards"
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      if (draggingId) moveApplication(draggingId, column);
                      setDraggingId(null);
                    }}
                  >
                    {columnApplications.map((application) => {
                      const job = state.jobs.find(
                        (item) => item.id === application.jobId,
                      );
                      const blocked = application.unsupportedClaims.length > 0;
                      return (
                        <article
                          className={
                            "pipeline-card" +
                            (application.id === selectedId ? " selected" : "")
                          }
                          draggable
                          key={application.id}
                          onClick={() => setSelectedId(application.id)}
                          onDragEnd={() => setDraggingId(null)}
                          onDragStart={() => setDraggingId(application.id)}
                        >
                          <div className="pipeline-card-top">
                            <div>
                              <p className="pipeline-card-co">
                                {job?.employer.value || "Employer unknown"}
                              </p>
                              <p className="pipeline-card-role">
                                {job?.title.value || "Application"}
                              </p>
                            </div>
                          </div>
                          {blocked ? (
                            <span className="pipeline-card-chip gap">
                              Unsupported claim
                            </span>
                          ) : null}
                          <div className="pipeline-card-foot">
                            <span>{formatDate(application.updatedAt)}</span>
                            <button
                              className="text-link pipeline-card-open"
                              onClick={(event) => {
                                event.stopPropagation();
                                onOpen(application.id);
                              }}
                              type="button"
                            >
                              Open
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </div>

        <aside className="pipeline-inspector" aria-label="Selected application">
          {selected && selectedJob ? (
            <>
              <h2>{selectedJob.title.value || "Application"}</h2>
              <p className="pipeline-inspector-sub">
                {selectedJob.employer.value || "Employer unknown"} ·{" "}
                {selectedJob.facts.location.value ||
                  selectedJob.facts.country.value ||
                  "Location unknown"}
              </p>
              <ProductStatusBadge status={applicationTone(selected.status)}>
                {selected.status}
              </ProductStatusBadge>
              <div className="pipeline-inspector-section">
                <h4>Next action</h4>
                <p>{applicationNextAction(selected, selectedJob)}</p>
              </div>
              <div className="pipeline-inspector-section">
                <h4>Readiness</h4>
                <p>
                  {getApplicationReadiness(selected, selectedJob).ready
                    ? "Every check has passed."
                    : getApplicationReadiness(selected, selectedJob).blockers.join(
                        ", ",
                      )}
                </p>
              </div>
              <button
                className="button-primary"
                onClick={() => onOpen(selected.id)}
                type="button"
              >
                Open full application →
              </button>
            </>
          ) : (
            <p className="pipeline-inspector-empty">
              Select a company on the board to see its details here.
            </p>
          )}
        </aside>
      </div>
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
  sync,
}: {
  application: ApplicationWorkspace;
  interviews: InterviewRecord[];
  job: JobRecord;
  state: JobWorkflowState;
  onChange: (value: JobWorkflowState) => void;
  onStatus: (value: string) => void;
  status: string;
  sync: { state: SyncStatusLineState; status: string };
}) {
  const { userId } = useDashboardPlan();
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
  const [kitDraft, setKitDraft] = useState<Omit<
    ApplicationContentDraft,
    "coverLetter"
  > | null>(null);
  const [isGeneratingKit, setIsGeneratingKit] = useState(false);
  const [learningConsent, setLearningConsentState] = useState(() =>
    typeof window === "undefined" ? null : readLearningConsent(localStorage, userId),
  );
  const [isSavingLearningConsent, setIsSavingLearningConsent] = useState(false);
  const toggleLearningConsent = async (enabled: boolean) => {
    setIsSavingLearningConsent(true);
    try {
      const saved = await setLearningConsent(localStorage, userId, enabled);
      setLearningConsentState(saved);
      onStatus(enabled ? "Private learning contribution enabled." : "Private learning contribution disabled.");
    } catch (error) {
      onStatus(error instanceof Error ? error.message : "Learning preference could not be saved.");
    } finally {
      setIsSavingLearningConsent(false);
    }
  };
  const generateKit = async () => {
    setIsGeneratingKit(true);
    onStatus("Generating application kit with AutoTime AI...");
    try {
      const onboardingResponse = await fetch("/api/profile/onboarding");
      const onboardingBody = (await onboardingResponse.json()) as {
        data: OnboardingProfileFields | null;
      };
      const mobilityProfile = loadMobilityProfile(localStorage, userId).profile;
      const response = await fetch("/api/ai/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          buildApplicationKitRequest({
            job,
            profile: onboardingBody.data ?? {},
            mobilityProfile,
          }),
        ),
      });
      const body = (await response.json()) as {
        data: { content?: ApplicationContentDraft; upgradeUrl?: string; decisionRecordId?: string } | null;
        error: string | null;
      };
      if (!response.ok || !body.data?.content) {
        onStatus(
          body.data?.upgradeUrl
            ? `${body.error ?? "Upgrade required"} to generate an AI kit.`
            : (body.error ?? "AI kit generation is unavailable right now."),
        );
        return;
      }
      const { coverLetter, ...rest } = body.data.content;
      update({ coverLetter, coverLetterRequested: true, ...(body.data.decisionRecordId && { mobilityDecisionId: body.data.decisionRecordId }) });
      if (body.data.decisionRecordId && learningConsent?.enabled) {
        void emitMobilityLearningEvent({ consentId: learningConsent.consentId, decisionId: body.data.decisionRecordId, applicationId: application.id, eventType: "decision_viewed", evidenceClass: "observed" }).catch(() => onStatus("Application kit generated; learning event could not be recorded."));
      }
      setKitDraft(rest);
      onStatus("Application kit generated with AutoTime AI.");
    } catch {
      onStatus("Application kit could not be generated. Try again shortly.");
    } finally {
      setIsGeneratingKit(false);
    }
  };
  const copyKitField = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      onStatus(`${label} copied.`);
    } catch {
      onStatus(`Could not copy ${label.toLowerCase()}.`);
    }
  };
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
  const confirmApplied = () => {
    if (!window.confirm("Confirm that you submitted this application outside AutoTime.")) return;
    setStatus("Applied", true);
    if (learningConsent?.enabled && application.mobilityDecisionId) {
      void emitMobilityLearningEvent({ consentId: learningConsent.consentId, decisionId: application.mobilityDecisionId, applicationId: application.id, eventType: "applied", evidenceClass: "observed" }).catch(() => onStatus("Application marked Applied; learning event could not be recorded."));
    }
  };
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
      <Link
        href="/dashboard/applications"
        className="text-link phase-three-back-link"
      >
        ← Applications
      </Link>
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
      <SyncStatusLine state={sync.state} status={sync.status} />
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

      <DecisionLineage
        analysis={analysis}
        application={application}
        interviews={interviews}
        job={job}
        learningConsent={learningConsent}
      />

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

          <section className="phase-three-section phase-three-kit-generation">
            <header>
              <p className="product-eyebrow">Application kit</p>
              <h2>Draft with AutoTime AI</h2>
            </header>
            <p>
              Generates a cover letter, profile summary and answer drafts from
              your confirmed profile evidence and this vacancy - never
              invented claims. Review everything before using it; only the
              cover letter is saved to this application, the rest is shown
              here to copy.
            </p>
            <label className="phase-three-check-control">
              <input
                type="checkbox"
                checked={Boolean(learningConsent?.enabled)}
                disabled={isSavingLearningConsent}
                onChange={(event) => void toggleLearningConsent(event.target.checked)}
              />
              <span>
                <strong>Help improve cross-border decisions</strong>
                <small>
                  With your consent, link this decision to application actions and outcomes. You can withdraw consent here at any time.
                </small>
              </span>
            </label>
            <button
              className="button-secondary"
              disabled={isGeneratingKit}
              onClick={generateKit}
              type="button"
            >
              {isGeneratingKit
                ? "Generating kit"
                : "Generate application kit"}
            </button>
            {kitDraft ? (
              <div className="phase-three-kit-draft">
                {(
                  [
                    ["profileSummary", "Profile summary"],
                    ["motivationAnswer", "Motivation answer"],
                    ["strengthsAnswer", "Strengths answer"],
                    ["availabilityAnswer", "Availability answer"],
                  ] as const
                ).map(([key, label]) => (
                  <article key={key} className="phase-three-kit-field">
                    <header>
                      <strong>{label}</strong>
                      <button
                        className="button-secondary"
                        onClick={() => copyKitField(label, kitDraft[key])}
                        type="button"
                      >
                        Copy
                      </button>
                    </header>
                    <p>{kitDraft[key]}</p>
                  </article>
                ))}
                <p className="phase-three-kit-note">
                  The cover letter draft was saved below. These other drafts
                  are not saved - copy what you want to keep.
                </p>
              </div>
            ) : null}
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
