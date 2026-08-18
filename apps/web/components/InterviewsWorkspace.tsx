"use client";

import { useEffect, useMemo, useState } from "react";
import { useDashboardPlan } from "./UserNav";
import {
  ProductEmptyState,
  ProductPageHeader,
  ProductStatusBadge,
} from "./product-ui";
import {
  applyInterviewOutcome,
  transitionApplication,
  type JobWorkflowState,
} from "../lib/job-application-workflow";
import { loadJobWorkflow, saveJobWorkflow } from "../lib/job-workflow-storage";
import {
  completeInterviewFinalReview,
  createInterview,
  getInterviewReadiness,
  recordInterviewOutcome,
  refreshInterviewPreparation,
  saveInterviewAnswer,
  transitionInterview,
  type InterviewFormat,
  type InterviewOutcome,
  type InterviewRecord,
  type InterviewStage,
  type InterviewWorkflowState,
} from "../lib/interview-workflow";
import {
  emptyInterviewWorkflowState,
  findOwnedInterview,
  loadInterviewWorkflow,
  saveInterviewWorkflow,
} from "../lib/interview-storage";

type View = { kind: "list" } | { kind: "detail"; id: string };
const stageLabel = (value: string) =>
  value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
const formatDate = (value?: string, timezone?: string) =>
  value
    ? new Intl.DateTimeFormat("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: timezone,
      }).format(new Date(value))
    : "Date not set";

export default function InterviewsWorkspace({ view }: { view: View }) {
  const { userId } = useDashboardPlan();
  const [workflow, setWorkflow] = useState<JobWorkflowState>({
    jobs: [],
    applications: [],
    schemaVersion: 1,
  });
  const [state, setState] = useState<InterviewWorkflowState>(
    emptyInterviewWorkflowState,
  );
  const [status, setStatus] = useState("");
  useEffect(() => {
    setWorkflow(loadJobWorkflow(userId));
    setState(loadInterviewWorkflow(userId));
  }, [userId]);
  const persist = (next: InterviewWorkflowState) => {
    saveInterviewWorkflow(userId, next);
    setState(next);
  };
  const persistBoth = (
    next: InterviewWorkflowState,
    jobs: JobWorkflowState,
  ) => {
    saveInterviewWorkflow(userId, next);
    saveJobWorkflow(userId, jobs);
    setState(next);
    setWorkflow(jobs);
  };
  if (view.kind === "detail") {
    const interview = findOwnedInterview(state, userId, view.id);
    if (!interview)
      return (
        <main className="workflow-page">
          <ProductEmptyState
            title="Interview not found"
            description="This interview is not present in your authenticated workspace."
            action={
              <a className="button-primary" href="/dashboard/interviews">
                Return to interviews
              </a>
            }
          />
        </main>
      );
    return (
      <InterviewDetail
        interview={interview}
        workflow={workflow}
        status={status}
        onStatus={setStatus}
        onSave={(updated, applicationOutcome) => {
          const next = {
            ...state,
            interviews: state.interviews.map((item) =>
              item.id === updated.id ? updated : item,
            ),
          };
          if (!applicationOutcome) return persist(next);
          const application = workflow.applications.find(
            (item) => item.id === updated.applicationId,
          );
          if (!application)
            return setStatus("The linked application is unavailable.");
          const changed = applyInterviewOutcome(
            application,
            applicationOutcome,
          );
          persistBoth(next, {
            ...workflow,
            applications: workflow.applications.map((item) =>
              item.id === changed.id ? changed : item,
            ),
          });
        }}
      />
    );
  }
  return (
    <InterviewList
      state={state}
      workflow={workflow}
      userId={userId}
      status={status}
      onStatus={setStatus}
      onCreate={(record) => {
        const application = workflow.applications.find(
          (item) => item.id === record.applicationId,
        );
        if (!application) return;
        const linkedJob = workflow.jobs.find(
          (item) => item.id === application.jobId,
        );
        if (!linkedJob) return;
        const changed =
          application.status === "Applied"
            ? transitionApplication(application, "Interview", linkedJob)
            : application;
        persistBoth(
          { ...state, interviews: [...state.interviews, record] },
          {
            ...workflow,
            applications: workflow.applications.map((item) =>
              item.id === changed.id ? changed : item,
            ),
          },
        );
        window.location.assign(`/dashboard/interviews/${record.id}`);
      }}
    />
  );
}

function InterviewList({
  state,
  workflow,
  userId,
  status,
  onStatus,
  onCreate,
}: {
  state: InterviewWorkflowState;
  workflow: JobWorkflowState;
  userId: string;
  status: string;
  onStatus: (value: string) => void;
  onCreate: (record: InterviewRecord) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [applicationId, setApplicationId] = useState("");
  const [stage, setStage] = useState<InterviewStage>("recruiter_screen");
  const [format, setFormat] = useState<InterviewFormat>("video");
  const [scheduledAt, setScheduledAt] = useState("");
  const [timezone, setTimezone] = useState("Europe/London");
  const [duration, setDuration] = useState("60");
  const [participantRole, setParticipantRole] = useState("");
  const [preparationNotes, setPreparationNotes] = useState("");
  const [timingFilter, setTimingFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [outcomeFilter, setOutcomeFilter] = useState("all");
  const eligible = workflow.applications.filter((item) =>
    ["Applied", "Interview"].includes(item.status),
  );
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get(
      "applicationId",
    );
    if (requested && eligible.some((item) => item.id === requested)) {
      setApplicationId(requested);
      setAdding(true);
    }
  }, [eligible]);
  const countries = [
    ...new Set(
      workflow.jobs.map((item) => item.facts.country.value).filter(Boolean),
    ),
  ];
  const grouped = useMemo(
    () =>
      [...state.interviews]
        .filter(
          (item) =>
            timingFilter === "all" ||
            (timingFilter === "completed"
              ? ["completed", "cancelled"].includes(item.status)
              : !["completed", "cancelled"].includes(item.status)),
        )
        .filter((item) => stageFilter === "all" || item.stage === stageFilter)
        .filter(
          (item) => outcomeFilter === "all" || item.outcome === outcomeFilter,
        )
        .filter(
          (item) =>
            countryFilter === "all" ||
            workflow.jobs.find((job) => job.id === item.jobId)?.facts.country
              .value === countryFilter,
        )
        .sort((a, b) =>
          (a.scheduledAt ?? "9999").localeCompare(b.scheduledAt ?? "9999"),
        ),
    [
      state,
      timingFilter,
      stageFilter,
      outcomeFilter,
      countryFilter,
      workflow.jobs,
    ],
  );
  const submit = () => {
    try {
      const application = eligible.find((item) => item.id === applicationId);
      const job = workflow.jobs.find((item) => item.id === application?.jobId);
      if (!application || !job)
        throw new Error("Select an owned applied application.");
      onCreate(
        createInterview({
          userId,
          application,
          job,
          stage,
          format,
          scheduledAt: scheduledAt
            ? new Date(scheduledAt).toISOString()
            : undefined,
          timezone: scheduledAt ? timezone : undefined,
          durationMinutes: duration ? Number(duration) : undefined,
          participantRoles: participantRole ? [participantRole] : [],
          preparationNotes,
        }),
      );
    } catch (error) {
      onStatus(
        error instanceof Error
          ? error.message
          : "Interview could not be created.",
      );
    }
  };
  return (
    <main className="workflow-page phase-four-interviews phase-four-interview-list">
      <ProductPageHeader
        eyebrow="Interviews"
        title="Prepare from the application evidence"
        description="Record an interview, prepare truthful job-specific answers, practise weak areas and capture the outcome."
        action={
          <div className="workflow-actions phase-four-header-actions">
            {grouped.length && !adding ? (
              <button
                className="button-primary"
                onClick={() => setAdding(true)}
              >
                Add interview
              </button>
            ) : null}
            <a className="button-secondary" href="/dashboard/applications">
              Applications
            </a>
          </div>
        }
      />
      <p className="phase-four-live-status" role="status">
        {status}
      </p>
      <section
        className="workflow-filters phase-four-filters"
        aria-label="Interview filters"
      >
        <label>
          Timing
          <select
            value={timingFilter}
            onChange={(event) => setTimingFilter(event.target.value)}
          >
            <option value="all">All</option>
            <option value="upcoming">Upcoming and preparing</option>
            <option value="completed">Completed and cancelled</option>
          </select>
        </label>
        <label>
          Stage
          <select
            value={stageFilter}
            onChange={(event) => setStageFilter(event.target.value)}
          >
            <option value="all">All stages</option>
            {[
              "recruiter_screen",
              "hiring_manager",
              "technical",
              "case_study",
              "behavioural",
              "panel",
              "final",
              "other",
            ].map((item) => (
              <option key={item} value={item}>
                {stageLabel(item)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Country
          <select
            value={countryFilter}
            onChange={(event) => setCountryFilter(event.target.value)}
          >
            <option value="all">All countries</option>
            {countries.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label>
          Outcome
          <select
            value={outcomeFilter}
            onChange={(event) => setOutcomeFilter(event.target.value)}
          >
            <option value="all">All outcomes</option>
            {[
              "awaiting",
              "progressed",
              "offer",
              "rejected",
              "withdrawn",
              "no_response",
            ].map((item) => (
              <option key={item} value={item}>
                {stageLabel(item)}
              </option>
            ))}
          </select>
        </label>
      </section>
      {adding ? (
        <section
          className="workflow-section phase-four-section"
          aria-labelledby="add-interview"
        >
          <h2 id="add-interview">Add interview</h2>
          <p>
            Choose an Applied or Interview application. Leave the date blank to
            begin unscheduled preparation.
          </p>
          <div className="workflow-form-grid">
            <label>
              Application
              <select
                value={applicationId}
                onChange={(event) => setApplicationId(event.target.value)}
              >
                <option value="">Select application</option>
                {eligible.map((item) => {
                  const job = workflow.jobs.find(
                    (job) => job.id === item.jobId,
                  );
                  return (
                    <option key={item.id} value={item.id}>
                      {job?.title.value || "Application"} —{" "}
                      {job?.employer.value || "Employer unknown"}
                    </option>
                  );
                })}
              </select>
            </label>
            <label>
              Stage
              <select
                value={stage}
                onChange={(event) =>
                  setStage(event.target.value as InterviewStage)
                }
              >
                {[
                  "recruiter_screen",
                  "hiring_manager",
                  "technical",
                  "case_study",
                  "behavioural",
                  "panel",
                  "final",
                  "other",
                ].map((item) => (
                  <option key={item} value={item}>
                    {stageLabel(item)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Date and time
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(event) => setScheduledAt(event.target.value)}
              />
            </label>
            <label>
              Timezone
              <input
                value={timezone}
                onChange={(event) => setTimezone(event.target.value)}
              />
            </label>
            <label>
              Format
              <select
                value={format}
                onChange={(event) =>
                  setFormat(event.target.value as InterviewFormat)
                }
              >
                {["phone", "video", "onsite", "take_home", "unknown"].map(
                  (item) => (
                    <option key={item}>{item}</option>
                  ),
                )}
              </select>
            </label>
            <label>
              Approximate duration (minutes)
              <input
                type="number"
                min="10"
                max="480"
                value={duration}
                onChange={(event) => setDuration(event.target.value)}
              />
            </label>
            <label>
              Participant role (optional)
              <input
                value={participantRole}
                onChange={(event) => setParticipantRole(event.target.value)}
                placeholder="For example, engineering manager"
              />
            </label>
            <label>
              Preparation notes (optional)
              <textarea
                value={preparationNotes}
                onChange={(event) => setPreparationNotes(event.target.value)}
                placeholder="Do not store meeting passwords or access tokens."
              />
            </label>
          </div>
          <button className="button-primary" onClick={submit}>
            Create preparation record
          </button>
        </section>
      ) : null}
      {grouped.length ? (
        <section
          className="workflow-list phase-four-interview-items"
          aria-label="Interview records"
        >
          {grouped.map((interview) => {
            const job = workflow.jobs.find(
              (item) => item.id === interview.jobId,
            );
            const readiness = getInterviewReadiness(interview);
            return (
              <article
                className="workflow-list-row phase-four-interview-row"
                key={interview.id}
              >
                <div>
                  <p className="eyebrow">{stageLabel(interview.stage)}</p>
                  <h2>{job?.title.value || "Interview"}</h2>
                  <p>
                    {job?.employer.value || "Employer unknown"} ·{" "}
                    {job?.facts.country.value || "Country unknown"} ·{" "}
                    {formatDate(interview.scheduledAt, interview.timezone)}
                  </p>
                  <p>
                    <strong>Next action:</strong>{" "}
                    {interview.status === "completed" &&
                    interview.outcome === "awaiting"
                      ? "Record the outcome"
                      : readiness.blockers[0] || "Review preparation"}
                  </p>
                </div>
                <ProductStatusBadge
                  status={
                    readiness.label === "Ready for review"
                      ? "confirmed"
                      : "consider"
                  }
                >
                  {readiness.label}
                </ProductStatusBadge>
                <a
                  className="button-secondary"
                  href={`/dashboard/interviews/${interview.id}`}
                >
                  Open interview
                </a>
              </article>
            );
          })}
        </section>
      ) : (
        <ProductEmptyState
          title="No interviews recorded"
          description="Interviews connect to applications and use confirmed evidence. You can begin preparation before the date is known."
          action={
            <div className="workflow-actions">
              <button
                className="button-primary"
                onClick={() => setAdding(true)}
              >
                Add interview
              </button>
              <a className="button-secondary" href="/dashboard/applications">
                View applications
              </a>
            </div>
          }
        />
      )}
      <p className="workflow-storage-note phase-four-storage-note">
        Development storage: interview records are isolated to this signed-in
        user in this browser and are not durable cross-device production
        records.
      </p>
    </main>
  );
}

function InterviewDetail({
  interview,
  workflow,
  status,
  onStatus,
  onSave,
}: {
  interview: InterviewRecord;
  workflow: JobWorkflowState;
  status: string;
  onStatus: (value: string) => void;
  onSave: (
    value: InterviewRecord,
    outcome?: "progressed" | "offer" | "rejected" | "withdrawn" | "no_response",
  ) => void;
}) {
  const tabs = ["Overview", "Preparation", "Practice", "Outcome"] as const;
  const [tab, setTab] = useState<(typeof tabs)[number]>("Overview");
  const job = workflow.jobs.find((item) => item.id === interview.jobId);
  const application = workflow.applications.find(
    (item) => item.id === interview.applicationId,
  );
  const readiness = getInterviewReadiness(interview);
  const moveTab = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? tabs.length - 1
          : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) %
            tabs.length;
    setTab(tabs[next]);
    document.getElementById(`interview-tab-${next}`)?.focus();
  };
  if (!job || !application)
    return (
      <main className="workflow-page">
        <ProductEmptyState
          title="Linked application unavailable"
          description="AutoTime cannot prepare this interview without its owned job and application."
        />
      </main>
    );
  return (
    <main className="workflow-page phase-four-interviews phase-four-interview-detail">
      <a className="text-link phase-four-back-link" href="/dashboard/interviews">
        ← Interviews
      </a>
      <ProductPageHeader
        eyebrow={stageLabel(interview.stage)}
        title={job.title.value || "Interview"}
        description={`${job.employer.value || "Employer unknown"} · ${formatDate(interview.scheduledAt, interview.timezone)}`}
      />
      <p role="status" aria-live="polite">
        {status}
      </p>
      <div className="interview-summary-strip">
        <ProductStatusBadge
          status={
            readiness.label === "Ready for review" ? "confirmed" : "consider"
          }
        >
          {readiness.label}
        </ProductStatusBadge>
        <span>{interview.format.replaceAll("_", " ")}</span>
        <span>{job.facts.country.value || "Country unknown"}</span>
        <strong>
          {readiness.blockers[0] || "Preparation is ready for review"}
        </strong>
      </div>
      <div
        role="tablist"
        aria-label="Interview workspace"
        className="workflow-tabs phase-four-tabs"
      >
        {tabs.map((item, index) => (
          <button
            id={`interview-tab-${index}`}
            aria-controls="interview-panel"
            key={item}
            role="tab"
            aria-selected={tab === item}
            tabIndex={tab === item ? 0 : -1}
            onKeyDown={(event) => moveTab(event, index)}
            onClick={() => setTab(item)}
          >
            {item}
          </button>
        ))}
      </div>
      <section
        id="interview-panel"
        role="tabpanel"
        aria-labelledby={`interview-tab-${tabs.indexOf(tab)}`}
      >
        {tab === "Overview" ? (
          <InterviewOverview
            interview={interview}
            job={job}
            application={application}
            readiness={readiness}
            onSave={onSave}
            onStatus={onStatus}
          />
        ) : null}
        {tab === "Preparation" ? (
          <InterviewPreparation
            application={application}
            interview={interview}
            job={job}
            onSave={onSave}
            onStatus={onStatus}
          />
        ) : null}
        {tab === "Practice" ? (
          <InterviewPractice interview={interview} onSave={onSave} />
        ) : null}
        {tab === "Outcome" ? (
          <InterviewOutcomePanel
            interview={interview}
            onSave={onSave}
            onStatus={onStatus}
          />
        ) : null}
      </section>
    </main>
  );
}

function InterviewOverview({
  interview,
  job,
  application,
  readiness,
  onSave,
  onStatus,
}: any) {
  return (
    <div className="workflow-detail-grid phase-four-overview-grid">
      <section className="workflow-section phase-four-section">
        <h2>Interview facts</h2>
        <dl>
          <dt>Stage</dt>
          <dd>{stageLabel(interview.stage)}</dd>
          <dt>Format</dt>
          <dd>{interview.format}</dd>
          <dt>Date</dt>
          <dd>{formatDate(interview.scheduledAt, interview.timezone)}</dd>
          <dt>Linked CV</dt>
          <dd>{application.selectedCvVersion}</dd>
        </dl>
        <div className="workflow-actions">
          <a href={`/dashboard/jobs/${job.id}?tab=analysis`}>Job analysis</a>
          <a href={`/dashboard/applications/${application.id}`}>
            Application workspace
          </a>
          <a href="/dashboard/autofill-profile">Proof Library</a>
        </div>
      </section>
      <section className="workflow-section phase-four-section">
        <h2>Preparation readiness</h2>
        <p>{readiness.label}</p>
        {readiness.blockers.length ? (
          <ul>
            {readiness.blockers.map((item: string) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : (
          <p>
            High-priority questions are confirmed without unsupported claims.
          </p>
        )}
        <div className="workflow-actions">
          <ul className="interview-readiness-areas">
            {readiness.areas.map(
              (area: { label: string; complete: boolean }) => (
                <li key={area.label}>
                  {area.complete ? "Complete" : "Needs attention"}: {area.label}
                </li>
              ),
            )}
          </ul>
          {!interview.finalReviewCompleted ? (
            <button
              className="button-secondary"
              onClick={() => {
                onSave(completeInterviewFinalReview(interview));
                onStatus("Final preparation review completed.");
              }}
            >
              Complete final review
            </button>
          ) : null}
          {readiness.label === "Ready for review" &&
          interview.status !== "ready" ? (
            <button
              className="button-primary"
              onClick={() => {
                try {
                  onSave(transitionInterview(interview, "ready"));
                  onStatus("Interview marked ready.");
                } catch (error) {
                  onStatus(
                    error instanceof Error
                      ? error.message
                      : "Status could not be changed.",
                  );
                }
              }}
            >
              Mark ready
            </button>
          ) : null}
          <button
            className="button-secondary"
            onClick={() => {
              try {
                onSave(transitionInterview(interview, "completed"));
                onStatus("Interview marked completed.");
              } catch (error) {
                onStatus(
                  error instanceof Error
                    ? error.message
                    : "Status could not be changed.",
                );
              }
            }}
          >
            Mark completed
          </button>
        </div>
      </section>
    </div>
  );
}

function InterviewPreparation({
  application,
  interview,
  job,
  onSave,
  onStatus,
}: {
  application: JobWorkflowState["applications"][number];
  interview: InterviewRecord;
  job: JobWorkflowState["jobs"][number];
  onSave: (value: InterviewRecord) => void;
  onStatus: (value: string) => void;
}) {
  return (
    <div>
      <section className="workflow-section phase-four-section">
        <h2>High-priority preparation</h2>
        <p>
          Questions are selected deterministically from the interview stage, job
          requirements and evidence gaps. AI cannot change readiness.
        </p>
        <p>
          Preparation version {interview.preparationVersion}. Refreshing creates
          a new version and preserves the previous question plan.
        </p>
        <button
          className="button-secondary"
          onClick={() => {
            onSave(refreshInterviewPreparation(interview, application, job));
            onStatus("Preparation refreshed as a new version.");
          }}
        >
          Refresh preparation
        </button>
      </section>
      <div className="interview-question-list">
        {interview.questions.map((question) => (
          <PreparationQuestion
            interview={interview}
            key={question.id}
            onSave={onSave}
            onStatus={onStatus}
            question={question}
          />
        ))}
      </div>
    </div>
  );
}

function PreparationQuestion({
  interview,
  question,
  onSave,
  onStatus,
}: {
  interview: InterviewRecord;
  question: InterviewRecord["questions"][number];
  onSave: (value: InterviewRecord) => void;
  onStatus: (value: string) => void;
}) {
  const [expanded, setExpanded] = useState(question.importance === "high");
  return (
    <details
      open={expanded}
      onToggle={(event) => setExpanded(event.currentTarget.open)}
    >
      <summary aria-expanded={expanded}>
        <span>{question.question}</span>
        <ProductStatusBadge
          status={
            question.evidenceStatus === "strong"
              ? "confirmed"
              : question.evidenceStatus === "missing"
                ? "missing"
                : "consider"
          }
        >
          {question.importance} · {question.evidenceStatus}
        </ProductStatusBadge>
      </summary>
      <p>
        <strong>Why this matters:</strong> {question.reason}
      </p>
      <p>
        <strong>Answer structure:</strong>{" "}
        {question.category === "behavioural" ||
        question.category === "scenario"
          ? "Situation, Task, Action, Result and Learning"
          : question.category === "technical"
            ? "Context, Approach, Trade-offs, Implementation, Validation and Outcome"
            : "Direct evidence-backed response"}
      </p>
      <p>
        <strong>Answer status:</strong>{" "}
        {question.answerDraft?.status ?? "Not started"}
      </p>
      <ul>
        {question.sourceReferences.map((source) => (
          <li key={source.id}>
            {source.confirmed ? "Confirmed" : "Inferred"}: {source.label}
          </li>
        ))}
      </ul>
      <AnswerEditor
        interview={interview}
        questionId={question.id}
        onSave={(value) => {
          onSave(value);
          onStatus("Answer draft saved.");
        }}
      />
    </details>
  );
}

function AnswerEditor({
  interview,
  questionId,
  onSave,
}: {
  interview: InterviewRecord;
  questionId: string;
  onSave: (value: InterviewRecord) => void;
}) {
  const question = interview.questions.find((item) => item.id === questionId)!;
  const [answer, setAnswer] = useState(question.answerDraft?.userEdited ?? "");
  const [unsupported, setUnsupported] = useState(
    question.answerDraft?.unsupportedClaims.join("\n") ?? "",
  );
  const [missing, setMissing] = useState(
    question.answerDraft?.missingEvidence.join("\n") ??
      (question.evidenceStatus === "missing"
        ? "AutoTime has no confirmed production example for this requirement."
        : ""),
  );
  const evidenceIds = question.sourceReferences
    .filter((item) => item.confirmed)
    .map((item) => item.id);
  return (
    <div className="interview-answer-editor">
      <label>
        Your answer
        <textarea
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
          placeholder="Use a truthful example. Situation, task, action, result and reflection can help."
        />
      </label>
      <label>
        Missing evidence
        <textarea
          value={missing}
          onChange={(event) => setMissing(event.target.value)}
        />
      </label>
      <label>
        Unsupported claims
        <textarea
          value={unsupported}
          onChange={(event) => setUnsupported(event.target.value)}
          placeholder="Add any unsupported metric, employer, tool or outcome here."
        />
      </label>
      <p>
        <strong>Supporting evidence:</strong>{" "}
        {evidenceIds.length
          ? `${evidenceIds.length} confirmed source(s)`
          : "No confirmed evidence selected"}
      </p>
      <div className="workflow-actions">
        <button
          className="button-secondary"
          onClick={() =>
            onSave(
              saveInterviewAnswer(interview, questionId, {
                value: answer,
                evidenceIds,
                missingEvidence: missing.split("\n").filter(Boolean),
                unsupportedClaims: unsupported.split("\n").filter(Boolean),
                confirmed: false,
              }),
            )
          }
        >
          Save draft
        </button>
        <button
          className="button-secondary"
          disabled={!answer.trim() || Boolean(unsupported.trim())}
          onClick={() =>
            onSave(
              saveInterviewAnswer(interview, questionId, {
                value: answer,
                evidenceIds,
                missingEvidence: missing.split("\n").filter(Boolean),
                unsupportedClaims: [],
                confirmed: true,
              }),
            )
          }
        >
          Confirm answer
        </button>
        {question.answerDraft?.versions.length ? (
          <button
            className="text-button"
            onClick={() =>
              setAnswer(
                question.answerDraft!.versions.at(-2)?.value ??
                  question.answerDraft!.draft,
              )
            }
          >
            Reset previous version
          </button>
        ) : null}
      </div>
    </div>
  );
}

function InterviewPractice({
  interview,
  onSave,
}: {
  interview: InterviewRecord;
  onSave: (value: InterviewRecord) => void;
}) {
  const [index, setIndex] = useState(0);
  const [response, setResponse] = useState("");
  const [remaining, setRemaining] = useState(120);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const question = interview.questions[index];
  const timeLimit = question && ["technical", "scenario"].includes(question.category) ? 120 : 90;
  useEffect(() => {
    if (!startedAt || remaining <= 0) return;
    const timer = window.setInterval(() => setRemaining((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [startedAt, remaining]);
  useEffect(() => { setResponse(""); setStartedAt(null); setRemaining(timeLimit); }, [index, timeLimit]);
  if (!question)
    return (
      <ProductEmptyState
        title="No practice questions"
        description="Return to Preparation to generate deterministic question coverage."
      />
    );
  const update = (confidence: "low" | "medium" | "high") =>
    onSave({
      ...interview,
      questions: interview.questions.map((item) =>
        item.id === question.id
          ? {
              ...item,
              userConfidence: confidence,
              markedForPractice: confidence !== "high",
            }
          : item,
      ),
      updatedAt: new Date().toISOString(),
    });
  return (
    <section className="workflow-section interview-practice phase-four-section">
      <p className="eyebrow">
        Question {index + 1} of {interview.questions.length}
      </p>
      <h2>{question.question}</h2>
      <details>
        <summary>Reveal preparation notes</summary>
        <p>{question.reason}</p>
        <p>
          {question.answerDraft?.userEdited || "No answer draft saved yet."}
        </p>
      </details>
      <section className="workflow-editor" aria-label="Timed typed practice">
        <h3>Timed typed practice</h3>
        <p>{startedAt ? `${remaining} seconds remaining` : `${timeLimit} second practice window`}. This is practice only, not a score or hiring prediction.</p>
        <textarea aria-label="Practice response" value={response} disabled={!startedAt || remaining === 0} onChange={(event) => setResponse(event.target.value)} placeholder="Start the timer, then answer from confirmed evidence." />
        <div className="workflow-actions">
          {!startedAt ? <button type="button" className="button-primary" onClick={() => { setRemaining(timeLimit); setStartedAt(new Date().toISOString()); }}>Start practice</button> : <button type="button" className="button-primary" disabled={!response.trim()} onClick={() => {
            const submittedAt = new Date().toISOString();
            onSave({ ...interview, questions: interview.questions.map((item) => item.id === question.id ? { ...item, markedForPractice: true, practiceSessions: [...(item.practiceSessions ?? []), { id: crypto.randomUUID(), mode: "typed", startedAt, submittedAt, timeLimitSeconds: timeLimit, responseText: response.trim() }] } : item), updatedAt: submittedAt });
            setResponse(""); setStartedAt(null); setRemaining(timeLimit);
          }}>Save practice response</button>}
        </div>
        {question.practiceSessions?.length ? <p>{question.practiceSessions.length} saved practice {question.practiceSessions.length === 1 ? "session" : "sessions"} for this question.</p> : null}
      </section>
      <fieldset>
        <legend>How prepared do you feel?</legend>
        {(["low", "medium", "high"] as const).map((value) => (
          <label key={value}>
            <input
              type="radio"
              name="confidence"
              checked={question.userConfidence === value}
              onChange={() => update(value)}
            />{" "}
            {stageLabel(value)}
          </label>
        ))}
      </fieldset>
      <p>
        Confidence is a self-rating only and does not predict interview success.
      </p>
      <div className="workflow-actions">
        <button
          disabled={index === 0}
          onClick={() => setIndex((value) => value - 1)}
        >
          Previous
        </button>
        <button
          className="button-primary"
          disabled={index === interview.questions.length - 1}
          onClick={() => setIndex((value) => value + 1)}
        >
          Next question
        </button>
      </div>
    </section>
  );
}

function InterviewOutcomePanel({
  interview,
  onSave,
  onStatus,
}: {
  interview: InterviewRecord;
  onSave: (value: InterviewRecord, outcome?: any) => void;
  onStatus: (value: string) => void;
}) {
  const [outcome, setOutcome] = useState<InterviewOutcome>("progressed");
  const [employerReason, setEmployerReason] = useState("");
  const [interpretation, setInterpretation] = useState("");
  const [notes, setNotes] = useState("");
  return (
    <section className="workflow-section phase-four-section">
      <h2>Record outcome and next action</h2>
      {interview.status !== "completed" ? (
        <p>
          Mark the interview completed from Overview before recording an
          outcome.
        </p>
      ) : (
        <>
          <label>
            Outcome
            <select
              value={outcome}
              onChange={(event) =>
                setOutcome(event.target.value as InterviewOutcome)
              }
            >
              {[
                "progressed",
                "offer",
                "rejected",
                "withdrawn",
                "cancelled",
                "no_response",
              ].map((item) => (
                <option key={item} value={item}>
                  {stageLabel(item)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Employer-confirmed reason, if supplied
            <textarea
              value={employerReason}
              onChange={(event) => setEmployerReason(event.target.value)}
            />
          </label>
          <label>
            Your interpretation, kept separate
            <textarea
              value={interpretation}
              onChange={(event) => setInterpretation(event.target.value)}
            />
          </label>
          <label>
            Privacy-conscious notes
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </label>
          <button
            className="button-primary"
            onClick={() => {
              try {
                const updated = recordInterviewOutcome(interview, outcome, {
                  questionsAsked: [],
                  difficultAreas: [],
                  notes,
                  followUpAction:
                    outcome === "progressed"
                      ? "Add the next interview stage"
                      : "Review the outcome",
                  employerConfirmedReason: employerReason || undefined,
                  userInterpretation: interpretation || undefined,
                  learningSignals:
                    employerReason || interpretation
                      ? ["unknown"]
                      : ["unknown"],
                });
                onSave(updated, outcome);
                onStatus("Interview outcome recorded.");
              } catch (error) {
                onStatus(
                  error instanceof Error
                    ? error.message
                    : "Outcome could not be recorded.",
                );
              }
            }}
          >
            Save outcome
          </button>
          {interview.outcome === "progressed" ? (
            <a
              className="button-secondary"
              href={`/dashboard/interviews?applicationId=${interview.applicationId}`}
            >
              Add next interview stage
            </a>
          ) : null}
        </>
      )}
    </section>
  );
}
