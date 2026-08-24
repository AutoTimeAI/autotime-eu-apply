/**
 * Encodes, per product capability (analysing a job, preparing an
 * application, assessing mobility, etc.), exactly which pieces of user
 * evidence/preferences/context are required vs. merely recommended before
 * that capability can be used - and derives the single "what should this
 * user do next on Home" recommendation from that same readiness state.
 * Centralizing this here means every surface that gates a feature or
 * explains why it's unavailable reads from one deterministic rule set
 * instead of each screen inventing its own readiness logic.
 */
export type ProductCapability =
  | "view_dashboard"
  | "discover_pathways"
  | "analyse_job"
  | "assess_mobility"
  | "prepare_application"
  | "use_autofill"
  | "approve_application_answers"
  | "manage_tracking"
  | "prepare_interview"
  | "view_insights";

export type ReadinessState =
  | "ready"
  | "ready_with_limitations"
  | "needs_information";

export type ReadinessRequirement = {
  id: string;
  label: string;
  reason: string;
};

export type ReadinessAction = {
  href: string;
  label: string;
  returnTo?: string;
};

export type CapabilityReadiness = {
  capability: ProductCapability;
  state: ReadinessState;
  requiredMissing: ReadinessRequirement[];
  recommendedMissing: ReadinessRequirement[];
  confirmedEvidenceCount: number;
  explanation: string;
  nextAction?: ReadinessAction;
};

export type CapabilityReadinessInput = {
  authenticated: boolean;
  evidence?: {
    cv?: boolean;
    education?: boolean;
    experience?: boolean;
    projects?: boolean;
    confirmedSkills?: boolean;
    supportingEvidenceConfirmed?: boolean;
  };
  preferences?: {
    basicWorkPreferences?: boolean;
    careerLane?: boolean;
    codingPreference?: boolean;
    languageInformation?: boolean;
    salaryPreference?: boolean;
    targetCountry?: boolean;
    vacancyCountry?: boolean;
    workAuthorisationStructured?: boolean;
  };
  job?: {
    description?: boolean;
    selected?: boolean;
    analysed?: boolean;
  };
  application?: {
    generatedAnswerAvailable?: boolean;
    evidenceUseConfirmed?: boolean;
    explicitReview?: boolean;
  };
  autofill?: {
    requiredFields?: string[];
    verifiedFields?: string[];
  };
};

const requirement = (
  id: string,
  label: string,
  reason: string,
): ReadinessRequirement => ({ id, label, reason });

function countEvidence(input: CapabilityReadinessInput) {
  return [
    input.evidence?.cv,
    input.evidence?.education,
    input.evidence?.experience,
    input.evidence?.projects,
    input.evidence?.confirmedSkills,
    input.evidence?.supportingEvidenceConfirmed,
  ].filter(Boolean).length;
}

function result(
  capability: ProductCapability,
  input: CapabilityReadinessInput,
  requiredMissing: ReadinessRequirement[],
  recommendedMissing: ReadinessRequirement[],
  explanation: string,
  nextAction?: ReadinessAction,
): CapabilityReadiness {
  return {
    capability,
    state:
      requiredMissing.length > 0
        ? "needs_information"
        : recommendedMissing.length > 0
          ? "ready_with_limitations"
          : "ready",
    requiredMissing,
    recommendedMissing,
    confirmedEvidenceCount: countEvidence(input),
    explanation,
    ...(requiredMissing.length > 0 && nextAction ? { nextAction } : {}),
  };
}

/**
 * Evaluates whether `capability` is usable given the user's current
 * `input` (evidence, preferences, job/application/autofill context).
 * Returns "needs_information" if any required item is missing,
 * "ready_with_limitations" if only recommended (non-blocking) items are
 * missing, or "ready" otherwise - along with the specific missing
 * requirements, an explanation string, and (only when something required is
 * missing) a suggested next action carrying `returnTo` so the user can come
 * back to where they started. Each capability has its own hard-coded
 * required/recommended rule set; capabilities not explicitly matched by an
 * earlier branch fall through to the "approve_application_answers" rules at
 * the end of the function.
 */
export function evaluateCapabilityReadiness(
  capability: ProductCapability,
  input: CapabilityReadinessInput,
  returnTo?: string,
): CapabilityReadiness {
  const evidence = input.evidence ?? {};
  const preferences = input.preferences ?? {};
  const job = input.job ?? {};
  const application = input.application ?? {};
  const hasCandidateEvidence = Boolean(
    evidence.cv ||
    evidence.education ||
    evidence.experience ||
    evidence.projects,
  );
  const profileAction = {
    href: "/dashboard/autofill-profile",
    label: "Add the missing information",
    returnTo,
  };

  if (capability === "view_dashboard") {
    const missing = input.authenticated
      ? []
      : [
          requirement(
            "authentication",
            "Sign in",
            "Home is private to your account.",
          ),
        ];
    return result(
      capability,
      input,
      missing,
      [],
      input.authenticated
        ? "Enough information to open Home."
        : "Sign in to open your private workspace.",
      { href: "/login", label: "Sign in", returnTo },
    );
  }

  if (capability === "discover_pathways") {
    const required = [
      ...(!hasCandidateEvidence
        ? [
            requirement(
              "career_evidence",
              "One experience, education or project example",
              "Role suggestions need a credible starting point.",
            ),
          ]
        : []),
      ...(!preferences.basicWorkPreferences
        ? [
            requirement(
              "work_preferences",
              "Basic work preferences",
              "Preferences keep pathways relevant to the work you want.",
            ),
          ]
        : []),
    ];
    const recommended = [
      ...(!evidence.cv
        ? [requirement("cv", "CV", "A CV improves evidence coverage.")]
        : []),
      ...(!evidence.confirmedSkills
        ? [
            requirement(
              "confirmed_skills",
              "Confirmed skills",
              "Confirmed skills improve pathway comparisons.",
            ),
          ]
        : []),
      ...(!preferences.targetCountry
        ? [
            requirement(
              "target_country",
              "Target country",
              "Country context improves market relevance.",
            ),
          ]
        : []),
      ...(!preferences.codingPreference
        ? [
            requirement(
              "coding_preference",
              "Coding preference",
              "This helps distinguish specialist and adjacent roles.",
            ),
          ]
        : []),
      ...(!preferences.languageInformation
        ? [
            requirement(
              "languages",
              "Language information",
              "Language requirements vary by role and country.",
            ),
          ]
        : []),
    ];
    return result(
      capability,
      input,
      required,
      recommended,
      required.length
        ? "Add a credible starting point before comparing pathways."
        : recommended.length
          ? "Enough information to start. You can continue now; confirming more evidence will improve the result."
          : "Enough confirmed information for a detailed pathway comparison.",
      profileAction,
    );
  }

  if (capability === "analyse_job") {
    const required = [
      ...(!job.description
        ? [
            requirement(
              "job_description",
              "Job description",
              "Analysis must use the vacancy's actual requirements.",
            ),
          ]
        : []),
      ...(!hasCandidateEvidence
        ? [
            requirement(
              "career_evidence",
              "One experience example",
              "Add one experience example to analyse this job.",
            ),
          ]
        : []),
      ...(!(preferences.targetCountry || preferences.vacancyCountry)
        ? [
            requirement(
              "job_country",
              "Target or vacancy country",
              "Country context is needed for a relevant assessment.",
            ),
          ]
        : []),
    ];
    const recommended = [
      ...(!evidence.cv
        ? [
            requirement(
              "cv",
              "Confirmed CV",
              "A confirmed CV improves matching.",
            ),
          ]
        : []),
      ...(!preferences.salaryPreference
        ? [
            requirement(
              "salary",
              "Salary preference",
              "Salary suitability will remain unavailable without it.",
            ),
          ]
        : []),
      ...(!preferences.workAuthorisationStructured
        ? [
            requirement(
              "work_authorisation",
              "Work-authorisation requirement",
              "Mobility conclusions remain unavailable without structured facts.",
            ),
          ]
        : []),
      ...(!preferences.careerLane
        ? [
            requirement(
              "career_lane",
              "Career lane",
              "A selected lane improves role-direction context.",
            ),
          ]
        : []),
    ];
    return result(
      capability,
      input,
      required,
      recommended,
      required.length
        ? "Add the required vacancy and candidate context to start."
        : recommended.length
          ? "Enough information for limited analysis. Unconfirmed conclusions will be marked unavailable."
          : "Enough confirmed information for the full deterministic assessment.",
      profileAction,
    );
  }

  if (capability === "assess_mobility") {
    const required = [
      ...(!preferences.targetCountry
        ? [
            requirement(
              "target_country",
              "Target country",
              "Mobility rules are country-specific.",
            ),
          ]
        : []),
      ...(!preferences.workAuthorisationStructured
        ? [
            requirement(
              "work_authorisation",
              "Work-authorisation or sponsorship requirement",
              "Governed mobility assessment requires structured facts.",
            ),
          ]
        : []),
    ];
    return result(
      capability,
      input,
      required,
      [],
      required.length
        ? "Add the country and work-authorisation facts required for assessment."
        : "Enough governed information to assess mobility.",
      {
        href: "/dashboard/international",
        label: "Add mobility information",
        returnTo,
      },
    );
  }

  if (capability === "manage_tracking") {
    const required = job.selected
      ? []
      : [
          requirement(
            "selected_job",
            "Selected tracked job",
            "Tracker changes must be tied to an existing user-owned job.",
          ),
        ];
    return result(
      capability,
      input,
      required,
      [],
      required.length
        ? "Select the tracked job you want to update."
        : "The selected tracked job can be updated.",
      {
        href: "/dashboard/applications",
        label: "Select a tracked job",
        returnTo,
      },
    );
  }

  if (capability === "prepare_interview") {
    const required = [
      ...(!job.selected
        ? [
            requirement(
              "selected_job",
              "Selected interview job",
              "Interview preparation must stay linked to a real job.",
            ),
          ]
        : []),
      ...(!hasCandidateEvidence
        ? [
            requirement(
              "career_evidence",
              "Candidate evidence",
              "Interview suggestions must use real supporting evidence.",
            ),
          ]
        : []),
    ];
    return result(
      capability,
      input,
      required,
      [],
      required.length
        ? "Select a job and add supporting evidence before interview preparation."
        : "The selected job and candidate evidence are ready for interview preparation.",
      {
        href: "/dashboard/interview",
        label: "Add interview context",
        returnTo,
      },
    );
  }

  if (capability === "view_insights") {
    return result(
      capability,
      input,
      [],
      [],
      "Authenticated users can review their own saved outcome evidence.",
    );
  }

  if (capability === "prepare_application") {
    const required = [
      ...(!job.selected
        ? [
            requirement(
              "selected_job",
              "Selected job",
              "Application material must be tied to one vacancy.",
            ),
          ]
        : []),
      ...(!hasCandidateEvidence
        ? [
            requirement(
              "career_evidence",
              "Candidate evidence",
              "Application claims must come from saved evidence.",
            ),
          ]
        : []),
      ...(!application.evidenceUseConfirmed ||
      !evidence.supportingEvidenceConfirmed
        ? [
            requirement(
              "evidence_confirmation",
              "Explicit evidence confirmation",
              "Confirm the evidence used before material is prepared.",
            ),
          ]
        : []),
    ];
    const recommended = [
      ...(!preferences.careerLane
        ? [requirement("career_lane", "Career lane", "Adds direction context.")]
        : []),
      ...(!job.analysed
        ? [
            requirement(
              "job_analysis",
              "Job analysis",
              "Adds fit and risk context.",
            ),
          ]
        : []),
      ...(!preferences.targetCountry
        ? [
            requirement(
              "target_country",
              "Target-country information",
              "Adds market and mobility context.",
            ),
          ]
        : []),
    ];
    return result(
      capability,
      input,
      required,
      recommended,
      required.length
        ? "This information is required before AutoTime can prepare an application."
        : recommended.length
          ? "Application preparation can continue with clearly marked limitations."
          : "Application evidence and context are ready.",
      profileAction,
    );
  }

  if (capability === "use_autofill") {
    const requiredFields = input.autofill?.requiredFields ?? [];
    const verified = new Set(input.autofill?.verifiedFields ?? []);
    const missing = requiredFields
      .filter((field) => !verified.has(field))
      .map((field) =>
        requirement(
          `autofill_${field}`,
          `Verify ${field}`,
          "The specific form field must be verified before autofill.",
        ),
      );
    return result(
      capability,
      input,
      missing,
      [],
      missing.length
        ? "Verify the fields required by this form before using autofill."
        : "Every field requested by this form is verified.",
      profileAction,
    );
  }

  const required = [
    ...(!application.generatedAnswerAvailable
      ? [
          requirement(
            "generated_answer",
            "Generated answer",
            "There must be an answer to review.",
          ),
        ]
      : []),
    ...(!evidence.supportingEvidenceConfirmed
      ? [
          requirement(
            "supporting_evidence",
            "Supporting evidence",
            "Answers cannot introduce unsupported claims.",
          ),
        ]
      : []),
    ...(!application.explicitReview
      ? [
          requirement(
            "explicit_review",
            "Explicit user review",
            "You must review every answer before approval.",
          ),
        ]
      : []),
  ];
  return result(
    capability,
    input,
    required,
    [],
    required.length
      ? "Review the answer and its supporting evidence before approval."
      : "The answer has supporting evidence and explicit review.",
    {
      href: "/dashboard/application-answers",
      label: "Review application answer",
      returnTo,
    },
  );
}

export type HomeNextActionId =
  | "add_career_evidence"
  | "discover_pathways"
  | "choose_target_countries"
  | "add_job"
  | "analyse_job"
  | "prepare_application"
  | "review_application"
  | "resolve_consider_job"
  | "submit_ready_application"
  | "review_follow_up"
  | "prepare_interview";

export type HomeNextActionContext = {
  hasCareerEvidence: boolean;
  hasCareerLane: boolean;
  hasTargetCountry: boolean;
  hasSavedJob: boolean;
  hasUnanalysedJob: boolean;
  hasSuitableAnalysedJob: boolean;
  hasConsiderJob?: boolean;
  hasApplicationNeedingReview?: boolean;
  hasReadyApplication: boolean;
  hasFollowUpDue: boolean;
  hasInterview: boolean;
  hasInterviewSoonIncomplete?: boolean;
  hasInterviewOutcomeAwaiting?: boolean;
  hasInterviewAwaitingFinalReview?: boolean;
  hasProgressedInterviewWithoutNextStage?: boolean;
};

export type HomeNextAction = {
  id: HomeNextActionId;
  title: string;
  description: string;
  href: string;
  label: string;
};

const homeActions: Record<HomeNextActionId, HomeNextAction> = {
  add_career_evidence: {
    id: "add_career_evidence",
    title: "Add your career starting point",
    description:
      "Use a CV, recent role, education or project to get useful guidance.",
    href: "/dashboard?onboarding=career",
    label: "Add career evidence",
  },
  discover_pathways: {
    id: "discover_pathways",
    title: "Discover your strongest role pathways",
    description:
      "Compare realistic directions using the evidence you have already added.",
    href: "/dashboard/role-pathways",
    label: "Discover role pathways",
  },
  choose_target_countries: {
    id: "choose_target_countries",
    title: "Choose your target countries",
    description:
      "Add country and work-authorisation context before assessing vacancies.",
    href: "/dashboard?onboarding=target",
    label: "Choose target countries",
  },
  add_job: {
    id: "add_job",
    title: "Add a real job",
    description: "Paste or capture a vacancy to start a grounded assessment.",
    href: "/dashboard/jobs",
    label: "Add a job",
  },
  analyse_job: {
    id: "analyse_job",
    title: "Analyse your saved job",
    description:
      "Review fit, evidence gaps and country limitations before applying.",
    href: "/dashboard/match-score",
    label: "Analyse job",
  },
  prepare_application: {
    id: "prepare_application",
    title: "Prepare an evidence-backed application",
    description: "Confirm the evidence to use before generating any material.",
    href: "/dashboard/applications",
    label: "Prepare application",
  },
  review_application: {
    id: "review_application",
    title: "Review your prepared application",
    description: "Check every claim and answer before you decide to apply.",
    href: "/dashboard/applications",
    label: "Review application",
  },
  resolve_consider_job: {
    id: "resolve_consider_job",
    title: "Resolve a job uncertainty",
    description:
      "Confirm the vacancy fact or evidence gap that keeps this job at Consider.",
    href: "/dashboard/jobs",
    label: "Review job unknowns",
  },
  submit_ready_application: {
    id: "submit_ready_application",
    title: "Confirm your ready application",
    description:
      "Review the final material, submit outside AutoTime, then record what you sent.",
    href: "/dashboard/applications",
    label: "Review ready application",
  },
  review_follow_up: {
    id: "review_follow_up",
    title: "Review your next follow-up",
    description: "A tracked application has an action waiting for attention.",
    href: "/dashboard/follow-ups",
    label: "Review follow-up",
  },
  prepare_interview: {
    id: "prepare_interview",
    title: "Prepare for your interview",
    description: "Use the selected job and confirmed evidence to practise.",
    href: "/dashboard/interviews",
    label: "Prepare for interview",
  },
};

/**
 * Picks the single highest-priority action to surface on Home, evaluated
 * as a fixed priority cascade: outstanding interview attention items first
 * (soon/incomplete, awaiting final review, awaiting outcome, progressed
 * without a next stage), then the onboarding funnel (career evidence,
 * career lane, target country, first saved job), then job/application
 * follow-through (unanalysed job, a job needing a Consider-state decision,
 * an application needing review, preparing an application, a ready
 * application to submit, a due follow-up, any interview), finally falling
 * back to "add a job" if nothing else applies. Always returns exactly one
 * action - never null.
 */
export function getHomeNextAction(
  context: HomeNextActionContext,
): HomeNextAction {
  if (context.hasInterviewSoonIncomplete) return homeActions.prepare_interview;
  if (context.hasInterviewAwaitingFinalReview)
    return homeActions.prepare_interview;
  if (context.hasInterviewOutcomeAwaiting) return homeActions.prepare_interview;
  if (context.hasProgressedInterviewWithoutNextStage)
    return homeActions.prepare_interview;
  if (!context.hasCareerEvidence) return homeActions.add_career_evidence;
  if (!context.hasCareerLane) return homeActions.discover_pathways;
  if (!context.hasTargetCountry) return homeActions.choose_target_countries;
  if (!context.hasSavedJob) return homeActions.add_job;
  if (context.hasUnanalysedJob) return homeActions.analyse_job;
  if (context.hasConsiderJob) return homeActions.resolve_consider_job;
  if (context.hasApplicationNeedingReview)
    return homeActions.review_application;
  if (context.hasSuitableAnalysedJob) return homeActions.prepare_application;
  if (context.hasReadyApplication) return homeActions.submit_ready_application;
  if (context.hasFollowUpDue) return homeActions.review_follow_up;
  if (context.hasInterview) return homeActions.prepare_interview;
  return homeActions.add_job;
}

/**
 * Maps a numeric evidence-coverage score to a human-readable guidance
 * label: "Strong evidence coverage" (85+), "Good evidence coverage" (60+),
 * "Enough to explore" (25+), or "Getting started" otherwise.
 */
export function getProfileGuidanceLevel(score: number) {
  if (score >= 85) return "Strong evidence coverage";
  if (score >= 60) return "Good evidence coverage";
  if (score >= 25) return "Enough to explore";
  return "Getting started";
}
