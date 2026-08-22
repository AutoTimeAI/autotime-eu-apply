"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  companionDashboardStateSchema,
  type CompanionDashboardState,
} from "shared";
import {
  getHomeNextAction,
  getProfileGuidanceLevel,
  type HomeNextActionContext,
} from "../lib/capability-readiness";
import {
  createProgressiveOnboardingState,
  loadProgressiveOnboarding,
  saveProgressiveOnboarding,
  type ProgressiveOnboardingState,
} from "../lib/progressive-onboarding-storage";
import { loadLaneSelection } from "../lib/role-pathways-storage";
import { loadJobWorkflow } from "../lib/job-workflow-storage";
import { loadInterviewWorkflow } from "../lib/interview-storage";
import {
  getInterviewHomeSignals,
  type InterviewWorkflowState,
} from "../lib/interview-workflow";
import type { JobWorkflowState } from "../lib/job-application-workflow";
import {
  profileProtocolReadinessEvent,
  useProfileProtocolReadiness,
} from "./ProfileProtocolLock";
import {
  markOnboardingComplete,
} from "./OnboardingWizard";
import {
  ProductPageHeader,
  ProductSectionHeader,
  ProductStatusBadge,
} from "./product-ui";
import { useDashboardPlan } from "./UserNav";

const dashboardStorageKey = "autotime-v2-companion-dashboard";

type HomeViewState = "ready" | "loading" | "unavailable";

export type HomeTestFixture = {
  activeApplicationCount?: number;
  context: HomeNextActionContext;
  profileScore?: number;
  savedJobCount?: number;
  showOnboarding?: boolean;
  taskDetail?: string;
  taskTitle?: string;
  viewState?: HomeViewState;
};

declare global {
  interface Window {
    __AUTOTIME_HOME_TEST_FIXTURE__?: HomeTestFixture;
  }
}

function readDashboardState(userId: string): CompanionDashboardState | null {
  try {
    const parsed = companionDashboardStateSchema.safeParse(
      JSON.parse(
        window.localStorage.getItem(`${dashboardStorageKey}:${userId}`) ??
          "null",
      ),
    );
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function hasText(value: string | undefined) {
  return Boolean(value?.trim());
}

function getContext(
  state: CompanionDashboardState | null,
  hasCareerLane: boolean,
  workflow?: JobWorkflowState,
  interviews?: InterviewWorkflowState,
): HomeNextActionContext {
  const profile = state?.profile;
  const applications = state?.applications ?? [];
  const hasCareerEvidence = Boolean(
    hasText(profile?.baseCvText) ||
    hasText(profile?.experienceHighlights) ||
    hasText(profile?.projectSummaries),
  );
  const workflowJobs = workflow?.jobs ?? [];
  const workflowApplications = workflow?.applications ?? [];
  const hasSavedJob = applications.length > 0 || workflowJobs.length > 0;
  const hasUnanalysedJob =
    (hasText(state?.jobAnalysis?.jobDescription) &&
      !state?.jobAnalysis?.fitScore) ||
    workflowJobs.some((job) => job.analysisState === "Not analysed") ||
    applications.some(
      (application) =>
        application.status === "Saved" ||
        application.status === "Checking fit" ||
        application.fitScore === undefined,
    );
  const hasSuitableAnalysedJob =
    workflowJobs.some(
      (job) =>
        job.analysisHistory.at(-1)?.decision === "Apply" && !job.applicationId,
    ) ||
    applications.some(
      (application) =>
        typeof application.fitScore === "number" &&
        application.fitScore >= 60 &&
        !application.contentSnapshot &&
        application.status !== "Applied",
    );
  const hasReadyApplication =
    workflowApplications.some(
      (application) => application.status === "Ready",
    ) ||
    applications.some(
      (application) =>
        application.status === "Ready to apply" &&
        Boolean(application.contentSnapshot),
    );
  const interviewSignals = getInterviewHomeSignals(interviews);
  const hasFollowUpDue =
    workflowApplications.some(
      (application) =>
        application.status === "Applied" &&
        Boolean(application.followUpDate) &&
        // Anchor to the start of the due date, not the end - otherwise a
        // follow-up due "today" doesn't get flagged until 23:59:59 that
        // night, delaying the nudge by up to a full day. Matches the
        // start-of-day pattern DashboardExperience.tsx's getNextActionTiming
        // already uses for the same "is this due" question.
        new Date(`${application.followUpDate}T00:00:00`) <= new Date(),
    ) ||
    applications.some(
      (application) =>
        Boolean(application.nextAction?.trim() || application.nextActionDate) &&
        ["Applied", "Interview", "Offer"].includes(application.status),
    );

  return {
    hasCareerEvidence,
    hasCareerLane,
    hasTargetCountry: hasText(profile?.targetCountries),
    hasSavedJob,
    hasUnanalysedJob,
    hasSuitableAnalysedJob,
    hasConsiderJob: workflowJobs.some(
      (job) => job.analysisHistory.at(-1)?.decision === "Consider",
    ),
    hasApplicationNeedingReview: workflowApplications.some(
      (application) => application.status === "Needs review",
    ),
    hasReadyApplication,
    hasFollowUpDue,
    ...interviewSignals,
    hasInterview:
      applications.some((application) => application.status === "Interview") ||
      interviewSignals.hasInterview,
  };
}

function updateStoredTargets(
  userId: string,
  onboarding: ProgressiveOnboardingState,
) {
  const state = readDashboardState(userId);
  if (!state) return;
  const nextState = {
    ...state,
    profile: {
      ...state.profile,
      targetCountries:
        onboarding.targetCountries.trim() || state.profile.targetCountries,
      workRightDetails:
        onboarding.workAuthorisation.trim() || state.profile.workRightDetails,
    },
  };
  window.localStorage.setItem(
    `${dashboardStorageKey}:${userId}`,
    JSON.stringify(nextState),
  );
  window.dispatchEvent(new Event(profileProtocolReadinessEvent));
}

function OnboardingStep({
  state,
  onChange,
  onComplete,
  hasCvEvidence,
  onNeedsCvEvidence,
}: {
  state: ProgressiveOnboardingState;
  onChange: (next: ProgressiveOnboardingState) => void;
  onComplete: (next: ProgressiveOnboardingState) => void;
  hasCvEvidence: boolean;
  onNeedsCvEvidence: () => void;
}) {
  if (state.currentStep === "career") {
    return (
      <section className="onboarding-step" aria-labelledby="onboarding-career">
        <p className="product-eyebrow">Step 1 of 3</p>
        <h2 id="onboarding-career">Choose your career starting point</h2>
        <p>
          Use the quickest source of credible evidence. You can add detail
          later.
        </p>
        <fieldset className="onboarding-choice-grid">
          <legend className="sr-only">Career starting point</legend>
          {[
            ["cv", "Use my existing CV", "Reuse CV evidence already stored."],
            [
              "role",
              "Add a current or recent role",
              "Start with practical work evidence.",
            ],
            [
              "education_project",
              "Add education or a project",
              "Useful when professional experience is limited.",
            ],
          ].map(([value, label, help]) => (
            <label key={value}>
              <input
                checked={state.evidencePath === value}
                name="evidence-path"
                onChange={() =>
                  onChange({
                    ...state,
                    evidencePath:
                      value as ProgressiveOnboardingState["evidencePath"],
                  })
                }
                type="radio"
              />
              <span>
                <strong>{label}</strong>
                <small>{help}</small>
              </span>
            </label>
          ))}
        </fieldset>
        <div className="onboarding-actions">
          <button
            disabled={!state.evidencePath}
            onClick={() => {
              if (state.evidencePath === "cv" && !hasCvEvidence) {
                onNeedsCvEvidence();
                return;
              }
              onChange({ ...state, currentStep: "target" });
            }}
            type="button"
          >
            {state.evidencePath === "cv" && !hasCvEvidence
              ? "Add your CV"
              : "Continue"}
          </button>
          <a className="secondary-button" href="/dashboard/autofill-profile">
            Add evidence in Profile
          </a>
        </div>
      </section>
    );
  }

  if (state.currentStep === "target") {
    return (
      <section className="onboarding-step" aria-labelledby="onboarding-target">
        <p className="product-eyebrow">Step 2 of 3</p>
        <h2 id="onboarding-target">Add your target context</h2>
        <p>This is used for country-specific job and mobility conclusions.</p>
        <div className="onboarding-fields">
          <label>
            Target European countries
            <input
              onChange={(event) =>
                onChange({ ...state, targetCountries: event.target.value })
              }
              placeholder="For example, Germany, Ireland"
              value={state.targetCountries}
            />
            <small>You can enter more than one country.</small>
          </label>
          <label>
            Work-authorisation or sponsorship requirement
            <textarea
              onChange={(event) =>
                onChange({ ...state, workAuthorisation: event.target.value })
              }
              placeholder="For example, I require employer sponsorship"
              value={state.workAuthorisation}
            />
            <small>
              Required for governed mobility assessment; never inferred by AI.
            </small>
          </label>
        </div>
        <div className="onboarding-actions">
          <button
            disabled={
              !state.targetCountries.trim() || !state.workAuthorisation.trim()
            }
            onClick={() => onChange({ ...state, currentStep: "direction" })}
            type="button"
          >
            Continue
          </button>
          <button
            className="secondary-button"
            onClick={() => onChange({ ...state, currentStep: "career" })}
            type="button"
          >
            Back
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="onboarding-step" aria-labelledby="onboarding-direction">
      <p className="product-eyebrow">Step 3 of 3</p>
      <h2 id="onboarding-direction">What would be useful now?</h2>
      <p>Choose a real result. AutoTime will take you there after setup.</p>
      <div className="onboarding-direction-grid">
        <button
          className={state.direction === "pathways" ? "selected" : ""}
          onClick={() => onChange({ ...state, direction: "pathways" })}
          type="button"
        >
          <strong>Discover suitable roles</strong>
          <span>Compare evidence-backed career pathways.</span>
        </button>
        <button
          className={state.direction === "job_analysis" ? "selected" : ""}
          onClick={() => onChange({ ...state, direction: "job_analysis" })}
          type="button"
        >
          <strong>Analyse an existing vacancy</strong>
          <span>Paste a real job and assess it with your evidence.</span>
        </button>
      </div>
      <div className="onboarding-actions">
        <button
          disabled={!state.direction}
          onClick={() => onComplete({ ...state, currentStep: "complete" })}
          type="button"
        >
          Continue to result
        </button>
        <button
          className="secondary-button"
          onClick={() => onChange({ ...state, currentStep: "target" })}
          type="button"
        >
          Back
        </button>
      </div>
    </section>
  );
}

export default function HomeExperience({
  testMode = false,
}: {
  testMode?: boolean;
}) {
  const router = useRouter();
  const { userId } = useDashboardPlan();
  const { readinessScore: cloudAwareProfileScore } =
    useProfileProtocolReadiness(userId);
  const [testFixture, setTestFixture] = useState<HomeTestFixture>();
  const [dashboardState, setDashboardState] =
    useState<CompanionDashboardState | null>(null);
  const [onboarding, setOnboarding] = useState(() =>
    createProgressiveOnboardingState(userId),
  );
  const [lane, setLane] = useState<ReturnType<typeof loadLaneSelection>>(null);
  const [jobWorkflow, setJobWorkflow] = useState<JobWorkflowState>();
  const [interviewWorkflow, setInterviewWorkflow] =
    useState<InterviewWorkflowState>();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [status, setStatus] = useState("");
  const [onboardingGate, setOnboardingGate] = useState<"checking" | "ready">(
    "checking",
  );
  const statusRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (testMode) {
      setTestFixture(window.__AUTOTIME_HOME_TEST_FIXTURE__);
    }
  }, [testMode]);

  useEffect(() => {
    if (testFixture || (testMode && window.__AUTOTIME_HOME_TEST_FIXTURE__))
      return;
    let onboardingVerified = false;
    const refresh = async () => {
      const storedDashboard = readDashboardState(userId);

      if (!onboardingVerified) {
        let completedOnServer = false;
        try {
          const response = await fetch("/api/profile/onboarding", {
            cache: "no-store",
          });
          const payload = await response.json();
          completedOnServer = Boolean(
            response.ok && payload.data?.onboarding_completed_at,
          );
        } catch {
          completedOnServer = false;
        }

        if (completedOnServer) {
          markOnboardingComplete(userId);
          onboardingVerified = true;
        } else {
          router.replace("/dashboard/onboarding");
          return;
        }
      }

      const storedOnboarding = loadProgressiveOnboarding(
        window.localStorage,
        userId,
      );
      const storedLane = loadLaneSelection(window.localStorage, userId);
      const storedJobs = loadJobWorkflow(userId);
      const storedInterviews = loadInterviewWorkflow(userId);
      const storedContext = getContext(
        storedDashboard,
        Boolean(storedLane),
        storedJobs,
        storedInterviews,
      );
      const hasUrgentInterviewAction =
        storedContext.hasInterviewSoonIncomplete ||
        storedContext.hasInterviewAwaitingFinalReview ||
        storedContext.hasInterviewOutcomeAwaiting ||
        storedContext.hasProgressedInterviewWithoutNextStage;
      setDashboardState(storedDashboard);
      setOnboarding(storedOnboarding);
      setLane(storedLane);
      setJobWorkflow(storedJobs);
      setInterviewWorkflow(storedInterviews);
      setOnboardingGate("ready");
      const params = new URLSearchParams(window.location.search);
      setShowOnboarding(
        params.has("onboarding") ||
          (storedOnboarding.currentStep !== "complete" &&
            !storedContext.hasCareerEvidence &&
            !hasUrgentInterviewAction),
      );
    };
    void refresh();
    window.addEventListener("autotime-interview-workflow-changed", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(
        "autotime-interview-workflow-changed",
        refresh,
      );
      window.removeEventListener("storage", refresh);
    };
  }, [router, testFixture, userId]);

  const liveContext = useMemo(
    () =>
      getContext(dashboardState, Boolean(lane), jobWorkflow, interviewWorkflow),
    [dashboardState, lane, jobWorkflow, interviewWorkflow],
  );
  const context = testFixture?.context ?? liveContext;
  const nextAction = getHomeNextAction(context);
  const profileScore = testFixture?.profileScore ?? cloudAwareProfileScore;
  const confirmedAreas = [
    context.hasCareerEvidence ? "Career evidence" : null,
    context.hasCareerLane ? "Career direction" : null,
    context.hasTargetCountry ? "Target countries" : null,
  ].filter(Boolean) as string[];
  const savedJobCount =
    testFixture?.savedJobCount ??
    Math.max(
      dashboardState?.applications.length ?? 0,
      jobWorkflow?.jobs.length ?? 0,
    );
  const activeApplicationCount =
    testFixture?.activeApplicationCount ??
    Math.max(
      dashboardState?.applications.filter((application) =>
        ["Applied", "Interview", "Offer"].includes(application.status),
      ).length ?? 0,
      jobWorkflow?.applications.length ?? 0,
    );

  const relevantInterview = interviewWorkflow?.interviews
    .filter((interview) =>
      nextAction.id === "prepare_interview"
        ? interview.status !== "cancelled" &&
          (interview.status !== "completed" || interview.outcome === "awaiting")
        : false,
    )
    .slice()
    .sort((left, right) =>
      (left.scheduledAt ?? "9999").localeCompare(right.scheduledAt ?? "9999"),
    )[0];
  const relevantInterviewJob = jobWorkflow?.jobs.find(
    (job) => job.id === relevantInterview?.jobId,
  );
  const relevantApplication = jobWorkflow?.applications.find(
    (application) => application.status === "Needs review",
  );
  const relevantApplicationJob = jobWorkflow?.jobs.find(
    (job) => job.id === relevantApplication?.jobId,
  );
  const contextualInterviewTitle = relevantInterviewJob?.employer.value
    ? `Prepare for your ${relevantInterviewJob.employer.value} interview`
    : relevantInterviewJob?.title.value
      ? `Prepare for your ${relevantInterviewJob.title.value} interview`
      : undefined;
  const contextualInterviewDetail = relevantInterview?.scheduledAt
    ? `Interview ${new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(relevantInterview.scheduledAt))}.`
    : relevantInterview?.status === "completed"
      ? "Record the outcome while the conversation is fresh."
      : undefined;
  const contextualApplicationTitle = relevantApplicationJob?.title.value
    ? `Review your ${relevantApplicationJob.title.value} application`
    : undefined;
  const displayAction = {
    ...nextAction,
    title:
      testFixture?.taskTitle ??
      (nextAction.id === "prepare_interview"
        ? contextualInterviewTitle
        : nextAction.id === "review_application"
          ? contextualApplicationTitle
          : undefined) ??
      nextAction.title,
    description:
      testFixture?.taskDetail ??
      (nextAction.id === "prepare_interview"
        ? contextualInterviewDetail
        : relevantApplication?.status === "Needs review"
          ? "Review the remaining evidence and answers before applying."
          : undefined) ??
      nextAction.description,
  };

  const persist = (next: ProgressiveOnboardingState) => {
    const saved = saveProgressiveOnboarding(window.localStorage, userId, next);
    setOnboarding(saved);
    setStatus("Setup progress saved. You can complete it later.");
  };

  const finishOnboarding = (next: ProgressiveOnboardingState) => {
    const saved = saveProgressiveOnboarding(window.localStorage, userId, next);
    updateStoredTargets(userId, saved);
    setOnboarding(saved);
    setStatus("Setup saved. Opening your chosen result.");
    queueMicrotask(() => statusRef.current?.focus());
    window.location.assign(
      saved.direction === "pathways"
        ? "/dashboard/role-pathways"
        : "/dashboard/jobs",
    );
  };

  if (!testMode && onboardingGate === "checking") {
    return (
      <section className="home-onboarding-gate" role="status" aria-live="polite">
        <span className="home-onboarding-gate-mark" aria-hidden="true" />
        <strong>Checking your profile setup…</strong>
        <p>We’ll open your dashboard or resume the next required step.</p>
      </section>
    );
  }

  if (
    testFixture?.viewState === "loading" ||
    testFixture?.viewState === "unavailable"
  ) {
    const unavailable = testFixture.viewState === "unavailable";
    return (
      <main className="home-experience" data-next-action={nextAction.id}>
        <ProductPageHeader
          description="Focus on the task that needs attention now."
          eyebrow="Home"
          title="Your search"
        />
        <section
          className="home-system-state"
          aria-busy={!unavailable}
          aria-live="polite"
        >
          <p className="home-priority-label">
            {unavailable ? "Temporarily unavailable" : "Loading"}
          </p>
          <h2>
            {unavailable
              ? "Your search data is temporarily unavailable"
              : "Loading your next action"}
          </h2>
          <p>
            {unavailable
              ? "Your saved work has not been changed. You can retry now or continue to another part of your search."
              : "Your saved work and priorities are being checked."}
          </p>
          {unavailable ? (
            <button
              className="primary-button"
              onClick={() => window.location.reload()}
              type="button"
            >
              Try again
            </button>
          ) : (
            <button className="primary-button" disabled type="button">
              Loading your next action
            </button>
          )}
        </section>
      </main>
    );
  }

  return (
    <main className="home-experience" data-next-action={nextAction.id}>
      <ProductPageHeader
        description="Focus on the task that needs attention now."
        eyebrow="Home"
        title="Your search"
      />

      <details className="walkthrough-inline-panel">
        <summary>Product walkthrough</summary>
        <section aria-labelledby="home-walkthrough-title">
          <div className="walkthrough-copy">
            <p className="eyebrow">2-minute walkthrough</p>
            <h2 id="home-walkthrough-title">See how AutoTime works</h2>
            <p>
              A short, narrated tour of evidence-backed job checks, the
              application tracker and interview prep - watch any time.
            </p>
          </div>
          <video controls preload="metadata" src="/demo/autotime-walkthrough-2min-voiced.mp4">
            Your browser does not support the walkthrough video.
          </video>
        </section>
      </details>

      {status ? (
        <p
          className="status-banner"
          ref={statusRef}
          role="status"
          tabIndex={-1}
        >
          {status}
        </p>
      ) : null}

      {(testFixture?.showOnboarding ?? showOnboarding) &&
      onboarding.currentStep !== "complete" ? (
        <div className="onboarding-shell">
          <OnboardingStep
            hasCvEvidence={Boolean(
              dashboardState?.profile.baseCvText.trim(),
            )}
            onChange={persist}
            onComplete={finishOnboarding}
            onNeedsCvEvidence={() =>
              router.push("/dashboard/autofill-profile")
            }
            state={onboarding}
          />
          <button
            className="text-button"
            onClick={() => setShowOnboarding(false)}
            type="button"
          >
            Complete later
          </button>
        </div>
      ) : (
        <section
          className="next-best-action-card"
          aria-labelledby="next-action"
        >
          <div>
            <p className="home-priority-label">Next action</p>
            <h2 id="next-action">{displayAction.title}</h2>
            <p>{displayAction.description}</p>
          </div>
          <a className="primary-button" href={nextAction.href}>
            {nextAction.label}
          </a>
        </section>
      )}

      <section className="home-progress" aria-labelledby="search-progress">
        <div className="home-progress-heading">
          <div>
            <h2 id="search-progress">Current search</h2>
          </div>
          <a href="/dashboard/applications">View applications</a>
        </div>
        <dl className="home-facts">
          <div>
            <dt>Evidence</dt>
            <dd>{getProfileGuidanceLevel(profileScore)}</dd>
          </div>
          <div>
            <dt>Saved jobs</dt>
            <dd>{savedJobCount}</dd>
          </div>
          <div>
            <dt>Active applications</dt>
            <dd>{activeApplicationCount}</dd>
          </div>
        </dl>
        <details className="home-progress-details">
          <summary>What shapes these recommendations?</summary>
          <p>
            {confirmedAreas.length
              ? `Confirmed: ${confirmedAreas.join(", ")}.`
              : "No career evidence has been confirmed yet."}
          </p>
        </details>
      </section>
    </main>
  );
}
