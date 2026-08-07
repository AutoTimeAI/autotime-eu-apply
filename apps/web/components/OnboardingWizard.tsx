"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  companionDashboardStateSchema,
  type CandidateProfile,
  type CompanionDashboardState,
} from "shared";
import {
  getStoredProfileReadiness,
  profileProtocolReadinessEvent,
} from "./ProfileProtocolLock";
import { useDashboardPlan } from "./UserNav";

const dashboardStorageKey = "autotime-v2-companion-dashboard";
const onboardingCompleteKey = "autotime-v2-onboarding-complete";

const emptyProfile: CandidateProfile = {
  fullName: "",
  email: "",
  phone: "",
  linkedInUrl: "",
  githubUrl: "",
  portfolioUrl: "",
  currentCountry: "",
  currentCity: "",
  targetCountries: "",
  targetRoles: "",
  workRightDetails: "",
  sponsorshipNeeded: false,
  relocationWillingness: "depends",
  salaryExpectation: "",
  noticePeriod: "",
  baseCvText: "",
  projectSummaries: "",
  experienceHighlights: "",
};

const defaultState: CompanionDashboardState = {
  profile: emptyProfile,
  reusableAnswers: {
    sponsorshipAnswer: "",
    relocationAnswer: "",
    workAuthorisationAnswer: "",
    noticePeriodAnswer: "",
    salaryExpectationAnswer: "",
    motivationAnswer: "",
    strengthsAnswer: "",
    availabilityAnswer: "",
  },
  jobAnalysis: {
    jobTitle: "",
    company: "",
    jobUrl: "",
    location: "",
    workMode: "unknown",
    jobDescription: "",
    notes: "",
    skills: [],
    seniority: "",
    summary: "",
    gaps: [],
    fitScore: 0,
    positioningAngle: "",
    scoreFactors: [],
  },
  applications: [],
  interviewPrepPacks: [],
  evidenceRecords: [],
  outcomeRecords: [],
};

type RequiredField =
  | "fullName"
  | "currentCountry"
  | "targetCountries"
  | "targetRoles"
  | "workRightDetails"
  | "baseCvText";

type FieldStep = {
  field: RequiredField;
  title: string;
  description: string;
  placeholder: string;
  multiline?: boolean;
};

const steps: FieldStep[] = [
  {
    field: "fullName",
    title: "What is your full name?",
    description: "Used to personalise your dashboard and application material.",
    placeholder: "e.g., Priya Sharma",
  },
  {
    field: "currentCountry",
    title: "Where are you currently based?",
    description: "Your current country of residence.",
    placeholder: "e.g., India",
  },
  {
    field: "targetCountries",
    title: "Which countries are you targeting?",
    description: "You can list more than one European country.",
    placeholder: "e.g., Ireland, Germany, Netherlands",
  },
  {
    field: "targetRoles",
    title: "Which roles are you targeting?",
    description: "The job titles or role families you want to pursue.",
    placeholder: "e.g., Business Analyst, Application Support",
  },
  {
    field: "workRightDetails",
    title: "What is your work-authorisation situation?",
    description:
      "Required for governed mobility assessment; never inferred by AI.",
    placeholder: "e.g., I require employer sponsorship in the EU/UK",
    multiline: true,
  },
  {
    field: "baseCvText",
    title: "Add your CV or a summary of your experience",
    description:
      "This becomes the evidence base for role suggestions and job checks.",
    placeholder: "Paste your CV text or a short summary of your experience",
    multiline: true,
  },
];

function readState(userId: string): CompanionDashboardState {
  if (typeof window === "undefined") {
    return defaultState;
  }

  try {
    const parsed = companionDashboardStateSchema.safeParse(
      JSON.parse(
        window.localStorage.getItem(`${dashboardStorageKey}:${userId}`) ??
          "null",
      ),
    );
    return parsed.success ? parsed.data : defaultState;
  } catch {
    return defaultState;
  }
}

function saveField(
  userId: string,
  field: RequiredField,
  value: string,
): CompanionDashboardState {
  const current = readState(userId);
  const next: CompanionDashboardState = {
    ...current,
    profile: { ...current.profile, [field]: value },
  };

  window.localStorage.setItem(
    `${dashboardStorageKey}:${userId}`,
    JSON.stringify(next),
  );
  window.dispatchEvent(new Event(profileProtocolReadinessEvent));
  return next;
}

export function markOnboardingComplete(userId: string): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(`${onboardingCompleteKey}:${userId}`, "true");
}

export function hasCompletedOnboarding(userId: string): boolean {
  if (typeof window === "undefined") {
    return true;
  }
  return (
    window.localStorage.getItem(`${onboardingCompleteKey}:${userId}`) ===
    "true"
  );
}

export function OnboardingWizard() {
  const router = useRouter();
  const { userId } = useDashboardPlan();
  const [stepIndex, setStepIndex] = useState(0);
  const [values, setValues] = useState<Record<RequiredField, string>>({
    fullName: "",
    currentCountry: "",
    targetCountries: "",
    targetRoles: "",
    workRightDetails: "",
    baseCvText: "",
  });

  useEffect(() => {
    const state = readState(userId);
    setValues({
      fullName: state.profile.fullName,
      currentCountry: state.profile.currentCountry,
      targetCountries: state.profile.targetCountries,
      targetRoles: state.profile.targetRoles,
      workRightDetails: state.profile.workRightDetails,
      baseCvText: state.profile.baseCvText,
    });
  }, [userId]);

  const step = steps[stepIndex];
  const value = values[step.field];
  const isLastStep = stepIndex === steps.length - 1;

  const continueStep = () => {
    saveField(userId, step.field, value);

    if (!isLastStep) {
      setStepIndex((current) => current + 1);
      return;
    }

    const readiness = getStoredProfileReadiness(userId);
    if (readiness >= 90) {
      markOnboardingComplete(userId);
    }
    router.replace("/dashboard");
  };

  return (
    <main className="onboarding-wizard-shell">
      <div className="onboarding-wizard-progress" aria-hidden="true">
        <span style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }} />
      </div>
      <p className="eyebrow">
        Step {stepIndex + 1} of {steps.length}
      </p>
      <section
        aria-labelledby="onboarding-wizard-step-title"
        className="onboarding-step"
      >
        <h1 id="onboarding-wizard-step-title">{step.title}</h1>
        <p>{step.description}</p>
        {step.multiline ? (
          <textarea
            aria-label={step.title}
            autoFocus
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                [step.field]: event.target.value,
              }))
            }
            placeholder={step.placeholder}
            rows={8}
            value={value}
          />
        ) : (
          <input
            aria-label={step.title}
            autoFocus
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                [step.field]: event.target.value,
              }))
            }
            placeholder={step.placeholder}
            value={value}
          />
        )}
        <div className="onboarding-actions">
          <button
            disabled={!value.trim()}
            onClick={continueStep}
            type="button"
          >
            {isLastStep ? "Finish setup" : "Continue"}
          </button>
          {stepIndex > 0 ? (
            <button
              className="secondary-button"
              onClick={() => setStepIndex((current) => current - 1)}
              type="button"
            >
              Back
            </button>
          ) : null}
        </div>
      </section>
    </main>
  );
}
