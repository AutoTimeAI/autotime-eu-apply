"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  getProfileReadinessFromParts,
  profileProtocolReadinessEvent,
} from "./ProfileProtocolLock";
import {
  ProductPageHeader,
  ProductSectionHeader,
  ProductStatusBadge,
} from "./product-ui";
import { useDashboardPlan } from "./UserNav";

const dashboardStorageKey = "autotime-v2-companion-dashboard";

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
        new Date(`${application.followUpDate}T23:59:59`) <= new Date(),
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
}: {
  state: ProgressiveOnboardingState;
  onChange: (next: ProgressiveOnboardingState) => void;
  onComplete: (next: ProgressiveOnboardingState) => void;
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
            onClick={() => onChange({ ...state, currentStep: "target" })}
            type="button"
          >
            Continue
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

export default function HomeExperience() {
  const { userId } = useDashboardPlan();
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
  const statusRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const refresh = () => {
      const storedDashboard = readDashboardState(userId);
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
      const params = new URLSearchParams(window.location.search);
      setShowOnboarding(
        params.has("onboarding") ||
          (storedOnboarding.currentStep !== "complete" &&
            !storedContext.hasCareerEvidence &&
            !hasUrgentInterviewAction),
      );
    };
    refresh();
    window.addEventListener("autotime-interview-workflow-changed", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(
        "autotime-interview-workflow-changed",
        refresh,
      );
      window.removeEventListener("storage", refresh);
    };
  }, [userId]);

  const context = useMemo(
    () =>
      getContext(dashboardState, Boolean(lane), jobWorkflow, interviewWorkflow),
    [dashboardState, lane, jobWorkflow, interviewWorkflow],
  );
  const nextAction = getHomeNextAction(context);
  const profileScore = dashboardState
    ? getProfileReadinessFromParts(
        dashboardState.profile,
        dashboardState.reusableAnswers,
      )
    : 0;
  const confirmedAreas = [
    context.hasCareerEvidence ? "Career evidence" : null,
    context.hasCareerLane ? "Career direction" : null,
    context.hasTargetCountry ? "Target countries" : null,
  ].filter(Boolean) as string[];

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

  return (
    <div className="home-experience">
      <ProductPageHeader
        description="Move from confirmed evidence to better-targeted European applications."
        eyebrow="Home"
        title="Your next best action"
      />

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

      {showOnboarding && onboarding.currentStep !== "complete" ? (
        <div className="onboarding-shell">
          <OnboardingStep
            onChange={persist}
            onComplete={finishOnboarding}
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
            <ProductStatusBadge
              status={context.hasCareerEvidence ? "confirmed" : "missing"}
            >
              {context.hasCareerEvidence
                ? "Enough information to start"
                : "Getting started"}
            </ProductStatusBadge>
            <h2 id="next-action">{nextAction.title}</h2>
            <p>{nextAction.description}</p>
          </div>
          <a className="primary-button" href={nextAction.href}>
            {nextAction.label}
          </a>
          {!context.hasCareerEvidence ? (
            <a className="secondary-button" href="/dashboard/jobs">
              Analyse a real job instead
            </a>
          ) : null}
        </section>
      )}

      <section className="home-support-grid">
        <article className="progressive-profile-summary">
          <ProductSectionHeader
            description="A guidance indicator, not an access threshold or outcome promise."
            title="Evidence readiness"
          />
          <strong>{getProfileGuidanceLevel(profileScore)}</strong>
          <div
            aria-label={`Profile guidance: ${profileScore} percent`}
            className="profile-guidance-meter"
          >
            <span style={{ width: `${profileScore}%` }} />
          </div>
          {confirmedAreas.length ? (
            <p>Confirmed areas: {confirmedAreas.join(", ")}.</p>
          ) : (
            <p>No career evidence has been confirmed yet.</p>
          )}
          <p>
            Add evidence progressively when a pathway, vacancy or application
            needs it. Completion does not guarantee an employment outcome.
          </p>
          <a href="/dashboard/autofill-profile">
            Review evidence and preferences
          </a>
        </article>

        {context.hasCareerLane && lane ? (
          <article className="home-context-panel">
            <ProductSectionHeader title="Current career lane" />
            <strong>{lane.primary}</strong>
            <p>Selected from your saved Role Pathways result.</p>
            <a href="/dashboard/role-pathways">Review career direction</a>
          </article>
        ) : null}

        {context.hasTargetCountry && dashboardState ? (
          <article className="home-context-panel">
            <ProductSectionHeader title="Target-country context" />
            <strong>{dashboardState.profile.targetCountries}</strong>
            <p>Mobility conclusions remain governed by structured facts.</p>
            <a href="/dashboard/international">Review country information</a>
          </article>
        ) : null}

        {(dashboardState?.applications.length ?? 0) > 0 ? (
          <article className="home-context-panel">
            <ProductSectionHeader title="Application progress" />
            <strong>{dashboardState?.applications.length} tracked jobs</strong>
            <p>
              {
                dashboardState?.applications.filter((application) =>
                  ["Applied", "Interview", "Offer"].includes(
                    application.status,
                  ),
                ).length
              }{" "}
              have moved beyond preparation.
            </p>
            <a href="/dashboard/applications">View applications</a>
          </article>
        ) : null}
      </section>
    </div>
  );
}
