/** Models evidence-grounded interview preparation, readiness, stages, and outcomes. */
import type {
  ApplicationWorkspace,
  JobRecord,
  RequirementEvidence,
} from "./job-application-workflow";

export type InterviewStage =
  | "recruiter_screen"
  | "hiring_manager"
  | "technical"
  | "case_study"
  | "behavioural"
  | "panel"
  | "final"
  | "other";
export type InterviewFormat =
  | "phone"
  | "video"
  | "onsite"
  | "take_home"
  | "unknown";
export type InterviewStatus =
  | "scheduled"
  | "preparing"
  | "ready"
  | "completed"
  | "cancelled";
export type InterviewOutcome =
  | "awaiting"
  | "progressed"
  | "offer"
  | "rejected"
  | "withdrawn"
  | "cancelled"
  | "no_response";
export type InterviewQuestionCategory =
  | "motivation"
  | "experience"
  | "behavioural"
  | "technical"
  | "scenario"
  | "stakeholder"
  | "job_risk"
  | "employer_questions";
export type InterviewReadiness =
  | "Getting started"
  | "Needs attention"
  | "Good coverage"
  | "Ready for review";
export type InterviewSourceReference = {
  id: string;
  kind: "requirement" | "application" | "evidence" | "stage" | "gap";
  label: string;
  confirmed: boolean;
};
export type InterviewAnswer = {
  draft: string;
  userEdited: string;
  evidenceIds: string[];
  assumptions: string[];
  missingEvidence: string[];
  unsupportedClaims: string[];
  confirmed: boolean;
  status: "Not started" | "Drafted" | "Needs evidence" | "Reviewed" | "Ready";
  structure: "STAR-L" | "technical" | "direct";
  versions: Array<{ value: string; savedAt: string }>;
};
export type PracticeSession = {
  id: string;
  mode: "typed";
  startedAt: string;
  submittedAt: string;
  timeLimitSeconds: number;
  responseText: string;
};
export type InterviewQuestion = {
  id: string;
  category: InterviewQuestionCategory;
  question: string;
  reason: string;
  sourceReferences: InterviewSourceReference[];
  importance: "high" | "medium" | "low";
  evidenceStatus: "strong" | "partial" | "missing" | "not_required";
  answerDraft?: InterviewAnswer;
  userConfidence?: "not_started" | "low" | "medium" | "high";
  markedForPractice?: boolean;
  practiceSessions?: PracticeSession[];
  origin:
    | "deterministic"
    | "interview_bank"
    | "job_requirement"
    | "evidence_gap"
    | "ai";
  version: number;
  schemaVersion: "1";
};
export type InterviewOutcomeDetails = {
  questionsAsked: string[];
  difficultAreas: string[];
  notes: string;
  followUpAction: string;
  outcomeCheckDate?: string;
  employerConfirmedReason?: string;
  userInterpretation?: string;
  learningSignals: Array<
    | "technical_gap"
    | "unclear_evidence"
    | "salary_mismatch"
    | "sponsorship_issue"
    | "role_level_mismatch"
    | "story_weakness"
    | "unknown"
  >;
};
export type InterviewRecord = {
  id: string;
  userId: string;
  applicationId: string;
  jobId: string;
  stage: InterviewStage;
  customStage?: string;
  format: InterviewFormat;
  scheduledAt?: string;
  timezone?: string;
  durationMinutes?: number;
  locationOrMeetingNote?: string;
  participantNotes?: string;
  participants: Array<{ role: string }>;
  preparationNotes?: string;
  status: InterviewStatus;
  outcome: InterviewOutcome;
  questions: InterviewQuestion[];
  preparationVersion: number;
  preparationHistory: Array<{
    version: number;
    createdAt: string;
    questions: InterviewQuestion[];
  }>;
  finalReviewCompleted: boolean;
  outcomeDetails?: InterviewOutcomeDetails;
  createdAt: string;
  updatedAt: string;
  schemaVersion: "1";
};
export type InterviewWorkflowState = {
  interviews: InterviewRecord[];
  schemaVersion: 1;
};

const coverage: Record<InterviewStage, InterviewQuestionCategory[]> = {
  recruiter_screen: [
    "motivation",
    "experience",
    "stakeholder",
    "employer_questions",
  ],
  hiring_manager: [
    "motivation",
    "experience",
    "behavioural",
    "scenario",
    "job_risk",
    "employer_questions",
  ],
  technical: [
    "technical",
    "scenario",
    "experience",
    "job_risk",
    "employer_questions",
  ],
  case_study: [
    "scenario",
    "technical",
    "stakeholder",
    "job_risk",
    "employer_questions",
  ],
  behavioural: [
    "behavioural",
    "experience",
    "stakeholder",
    "scenario",
    "employer_questions",
  ],
  panel: [
    "behavioural",
    "technical",
    "stakeholder",
    "scenario",
    "employer_questions",
  ],
  final: [
    "motivation",
    "experience",
    "stakeholder",
    "job_risk",
    "employer_questions",
  ],
  other: ["motivation", "experience", "behavioural", "employer_questions"],
};
const stableId = (value: string) => {
  let hash = 2166136261;
  for (const char of value)
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return `iq-${(hash >>> 0).toString(36)}`;
};
const validTimeZone = (value: string) => {
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: value });
    return true;
  } catch {
    return false;
  }
};
const references = (
  requirement: RequirementEvidence | undefined,
  application: ApplicationWorkspace,
  stage: InterviewStage,
): InterviewSourceReference[] => [
  {
    id: `stage-${stage}`,
    kind: "stage",
    label: stage.replaceAll("_", " "),
    confirmed: true,
  },
  ...(requirement
    ? [
        {
          id: stableId(requirement.requirement),
          kind: "requirement" as const,
          label: requirement.requirement,
          confirmed: true,
        },
      ]
    : []),
  ...(requirement?.evidence ?? []).slice(0, 2).map((label, index) => ({
    id: `evidence-${index}-${stableId(label)}`,
    kind: "evidence" as const,
    label,
    confirmed: requirement?.state === "confirmed",
  })),
  ...(application.selectedCvVersion
    ? [
        {
          id: `cv-${stableId(application.selectedCvVersion)}`,
          kind: "application" as const,
          label: `CV version: ${application.selectedCvVersion}`,
          confirmed: application.evidenceConfirmed,
        },
      ]
    : []),
];

/** Generates sourced interview questions from the application and job evidence. */
export function generateInterviewQuestions(
  interview: Pick<InterviewRecord, "id" | "stage">,
  application: ApplicationWorkspace,
  job: JobRecord,
): InterviewQuestion[] {
  const requirements = job.analysisHistory.at(-1)?.capability ?? [];
  const role = job.title.value || "this role";
  const employer = job.employer.value || "the employer";
  const generated: InterviewQuestion[] = coverage[interview.stage].map(
    (category, index) => {
      const requirement =
        category === "job_risk"
          ? requirements.find((item) => item.state !== "confirmed")
          : requirements[index % Math.max(requirements.length, 1)];
      const evidenceStatus = !requirement
        ? "not_required"
        : requirement.state === "confirmed"
          ? "strong"
          : requirement.state === "partial"
            ? "partial"
            : "missing";
      const subject =
        requirement?.requirement || "the role's stated priorities";
      const questions: Record<InterviewQuestionCategory, string> = {
        motivation: `Why are you interested in ${role} at ${employer}, based on the vacancy?`,
        experience: `Which confirmed example best demonstrates ${subject}?`,
        behavioural: `Tell us about a situation where you demonstrated ${subject}.`,
        technical: `How would you explain and apply ${subject}, and what production evidence can you truthfully provide?`,
        scenario: `How would you approach a realistic scenario involving ${subject}?`,
        stakeholder: `How would you work with stakeholders while delivering ${subject}?`,
        job_risk: `The evidence for ${subject} is incomplete. How would you describe that gap honestly?`,
        employer_questions: `What would you ask ${employer} to clarify expectations for ${subject}?`,
      };
      return {
        id: stableId(`${interview.id}:${category}:${subject}`),
        category,
        question: questions[category],
        reason: requirement
          ? `Linked to “${requirement.requirement}”; current evidence is ${evidenceStatus}.`
          : `Selected for the ${interview.stage.replaceAll("_", " ")} stage.`,
        sourceReferences: references(requirement, application, interview.stage),
        importance:
          index < 3 || evidenceStatus === "missing" ? "high" : "medium",
        evidenceStatus,
        userConfidence: "not_started",
        origin:
          category === "job_risk"
            ? "evidence_gap"
            : requirement
              ? "job_requirement"
              : "deterministic",
        version: 1,
        schemaVersion: "1",
      };
    },
  );
  const seen = new Set<string>();
  return generated.filter((item) => {
    const key = item.question.toLowerCase().replace(/\W+/g, " ").trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Creates a new interview record linked to an owned application and job. */
export function createInterview(input: {
  userId: string;
  application: ApplicationWorkspace;
  job: JobRecord;
  stage: InterviewStage;
  format: InterviewFormat;
  scheduledAt?: string;
  timezone?: string;
  durationMinutes?: number;
  participantRoles?: string[];
  preparationNotes?: string;
  customStage?: string;
  locationOrMeetingNote?: string;
  participantNotes?: string;
  now?: string;
}): InterviewRecord {
  if (!input.userId.trim())
    throw new Error("Authenticated user ID is required.");
  if (!input.application.id || input.application.jobId !== input.job.id)
    throw new Error("Interview requires a linked owned application and job.");
  if (!["Applied", "Interview"].includes(input.application.status))
    throw new Error(
      "Only an Applied or Interview application can add an interview.",
    );
  if (input.scheduledAt && Number.isNaN(Date.parse(input.scheduledAt)))
    throw new Error("Enter a valid interview date and time.");
  if (input.timezone && !validTimeZone(input.timezone))
    throw new Error("Enter a valid IANA timezone.");
  if (
    input.durationMinutes !== undefined &&
    (!Number.isInteger(input.durationMinutes) ||
      input.durationMinutes < 10 ||
      input.durationMinutes > 480)
  )
    throw new Error("Duration must be between 10 and 480 minutes.");
  const now = input.now ?? new Date().toISOString();
  const record: InterviewRecord = {
    id: crypto.randomUUID(),
    userId: input.userId,
    applicationId: input.application.id,
    jobId: input.job.id,
    stage: input.stage,
    customStage:
      input.stage === "other"
        ? input.customStage?.trim().slice(0, 80) || undefined
        : undefined,
    format: input.format,
    scheduledAt: input.scheduledAt || undefined,
    timezone: input.timezone || undefined,
    durationMinutes: input.durationMinutes,
    locationOrMeetingNote: input.locationOrMeetingNote?.trim().slice(0, 300),
    participantNotes: input.participantNotes?.trim().slice(0, 300),
    participants: (input.participantRoles ?? [])
      .map((role) => ({ role: role.trim().slice(0, 80) }))
      .filter((item) => item.role),
    preparationNotes: input.preparationNotes?.trim().slice(0, 2000),
    status: input.scheduledAt ? "scheduled" : "preparing",
    outcome: "awaiting",
    questions: [],
    preparationVersion: 1,
    preparationHistory: [],
    finalReviewCompleted: false,
    createdAt: now,
    updatedAt: now,
    schemaVersion: "1",
  };
  return {
    ...record,
    questions: generateInterviewQuestions(record, input.application, input.job),
  };
}

/** Derives the interview signals used to prioritise the dashboard home action. */
export function getInterviewHomeSignals(
  state: InterviewWorkflowState | undefined,
  now = Date.now(),
) {
  const interviews = state?.interviews ?? [];
  const active = interviews.filter(
    (item) => !["completed", "cancelled"].includes(item.status),
  );
  return {
    hasInterview: active.length > 0,
    hasInterviewSoonIncomplete: active.some((item) => {
      if (!item.scheduledAt) return false;
      const hours =
        (new Date(item.scheduledAt).getTime() - now) / 3_600_000;
      return (
        hours >= 0 &&
        hours <= 72 &&
        getInterviewReadiness(item).label !== "Ready for review"
      );
    }),
    hasInterviewOutcomeAwaiting: interviews.some(
      (item) => item.status === "completed" && item.outcome === "awaiting",
    ),
    hasInterviewAwaitingFinalReview: active.some(
      (item) =>
        !item.finalReviewCompleted &&
        getInterviewReadiness(item).label === "Good coverage",
    ),
    hasProgressedInterviewWithoutNextStage: interviews.some(
      (item) =>
        item.outcome === "progressed" &&
        !interviews.some(
          (later) =>
            later.applicationId === item.applicationId &&
            later.createdAt > item.updatedAt,
        ),
    ),
  };
}

/** Calculates readiness and blockers from the interview's current preparation state. */
export function getInterviewReadiness(interview: InterviewRecord): {
  label: InterviewReadiness;
  blockers: string[];
  areas: Array<{ label: string; complete: boolean }>;
} {
  const high = interview.questions.filter((q) => q.importance === "high");
  const blockers = [
    high.some((q) => !q.answerDraft?.confirmed) &&
      "Confirm every high-priority answer",
    interview.questions.some(
      (q) => (q.answerDraft?.unsupportedClaims.length ?? 0) > 0,
    ) && "Resolve unsupported claims",
    high.some(
      (q) =>
        q.evidenceStatus === "missing" &&
        !q.answerDraft?.missingEvidence.length,
    ) && "Acknowledge missing evidence truthfully",
    !interview.questions.some(
      (q) => q.category === "employer_questions" && q.answerDraft?.confirmed,
    ) && "Review at least one question for the interviewer",
    !interview.finalReviewCompleted && "Complete the final preparation review",
  ].filter(Boolean) as string[];
  const addressed = high.filter(
    (q) => q.answerDraft?.confirmed && !q.answerDraft.unsupportedClaims.length,
  ).length;
  if (
    !interview.questions.some(
      (q) => q.answerDraft || q.userConfidence !== "not_started",
    )
  )
    return {
      label: "Getting started",
      blockers,
      areas: readinessAreas(interview),
    };
  if (!blockers.length && addressed === high.length)
    return {
      label: "Ready for review",
      blockers: [],
      areas: readinessAreas(interview),
    };
  return {
    label:
      addressed >= Math.ceil(high.length / 2)
        ? "Good coverage"
        : "Needs attention",
    blockers,
    areas: readinessAreas(interview),
  };
}

function readinessAreas(interview: InterviewRecord) {
  const complete = (categories: InterviewQuestionCategory[]) =>
    interview.questions
      .filter((item) => categories.includes(item.category))
      .every(
        (item) =>
          item.importance !== "high" ||
          Boolean(
            item.answerDraft?.confirmed &&
            !item.answerDraft.unsupportedClaims.length,
          ),
      );
  return [
    {
      label: "Role understanding",
      complete: complete(["motivation", "experience"]),
    },
    {
      label: "Essential technical coverage",
      complete: complete(["technical", "scenario", "job_risk"]),
    },
    {
      label: "Behavioural evidence",
      complete: complete(["behavioural", "stakeholder"]),
    },
    { label: "Domain preparation", complete: complete(["scenario"]) },
    {
      label: "Questions for interviewer",
      complete: interview.questions.some(
        (item) =>
          item.category === "employer_questions" && item.answerDraft?.confirmed,
      ),
    },
    {
      label: "Unresolved evidence warnings",
      complete: !interview.questions.some(
        (item) => item.answerDraft?.unsupportedClaims.length,
      ),
    },
  ];
}

/** Saves an evidence-aware answer and invalidates stale final review when needed. */
export function saveInterviewAnswer(
  interview: InterviewRecord,
  questionId: string,
  input: {
    value: string;
    evidenceIds: string[];
    missingEvidence?: string[];
    unsupportedClaims?: string[];
    confirmed: boolean;
    now?: string;
  },
): InterviewRecord {
  if (input.confirmed && input.unsupportedClaims?.length)
    throw new Error(
      "Resolve unsupported claims before confirming this answer.",
    );
  const now = input.now ?? new Date().toISOString();
  return {
    ...interview,
    finalReviewCompleted: false,
    status: "preparing",
    updatedAt: now,
    questions: interview.questions.map((q) =>
      q.id !== questionId
        ? q
        : {
            ...q,
            answerDraft: {
              draft: q.answerDraft?.draft ?? input.value,
              userEdited: input.value,
              evidenceIds: input.evidenceIds,
              assumptions: [],
              missingEvidence: input.missingEvidence ?? [],
              unsupportedClaims: input.unsupportedClaims ?? [],
              confirmed: input.confirmed,
              status: input.unsupportedClaims?.length
                ? "Needs evidence"
                : input.confirmed
                  ? "Ready"
                  : input.value.trim()
                    ? "Drafted"
                    : "Not started",
              structure:
                q.category === "behavioural" || q.category === "scenario"
                  ? "STAR-L"
                  : q.category === "technical"
                    ? "technical"
                    : "direct",
              versions: [
                ...(q.answerDraft?.versions ?? []),
                { value: input.value, savedAt: now },
              ],
            },
          },
    ),
  };
}

/** Applies a permitted interview-status transition. */
export function transitionInterview(
  interview: InterviewRecord,
  status: InterviewStatus,
): InterviewRecord {
  const allowed: Record<InterviewStatus, InterviewStatus[]> = {
    scheduled: ["preparing", "completed", "cancelled"],
    preparing: ["scheduled", "ready", "completed", "cancelled"],
    ready: ["preparing", "completed", "cancelled"],
    completed: [],
    cancelled: [],
  };
  if (!allowed[interview.status].includes(status))
    throw new Error("Invalid interview status transition.");
  if (
    status === "ready" &&
    getInterviewReadiness(interview).label !== "Ready for review"
  )
    throw new Error("Resolve preparation blockers before marking Ready.");
  return { ...interview, status, updatedAt: new Date().toISOString() };
}

/** Marks final preparation review complete after readiness validation. */
export function completeInterviewFinalReview(interview: InterviewRecord) {
  return {
    ...interview,
    finalReviewCompleted: true,
    updatedAt: new Date().toISOString(),
  };
}

/** Regenerates preparation while retaining an auditable preparation history. */
export function refreshInterviewPreparation(
  interview: InterviewRecord,
  application: ApplicationWorkspace,
  job: JobRecord,
) {
  const now = new Date().toISOString();
  const nextVersion = interview.preparationVersion + 1;
  const nextQuestions = generateInterviewQuestions(
    interview,
    application,
    job,
  ).map((item) => ({ ...item, version: nextVersion }));
  return {
    ...interview,
    preparationVersion: nextVersion,
    preparationHistory: [
      ...interview.preparationHistory,
      {
        version: interview.preparationVersion,
        createdAt: interview.updatedAt,
        questions: interview.questions,
      },
    ],
    questions: nextQuestions,
    finalReviewCompleted: false,
    status: "preparing" as const,
    updatedAt: now,
  };
}

/** Creates the next-stage interview after a progressed outcome. */
export function createNextInterviewStage(
  previous: InterviewRecord,
  application: ApplicationWorkspace,
  job: JobRecord,
  stage: InterviewStage,
) {
  if (previous.outcome !== "progressed")
    throw new Error("Only a progressed interview can create the next stage.");
  return createInterview({
    userId: previous.userId,
    application,
    job,
    stage,
    format: previous.format,
    timezone: previous.timezone,
  });
}

/** Records a terminal or progressed outcome with its supporting details. */
export function recordInterviewOutcome(
  interview: InterviewRecord,
  outcome: InterviewOutcome,
  details: InterviewOutcomeDetails,
): InterviewRecord {
  if (interview.status !== "completed")
    throw new Error(
      "Mark the interview completed before recording its outcome.",
    );
  if (outcome === "awaiting") throw new Error("Choose a recorded outcome.");
  return {
    ...interview,
    outcome,
    outcomeDetails: {
      ...details,
      notes: details.notes.slice(0, 2000),
      employerConfirmedReason: details.employerConfirmedReason?.slice(0, 500),
      userInterpretation: details.userInterpretation?.slice(0, 500),
    },
    updatedAt: new Date().toISOString(),
  };
}
