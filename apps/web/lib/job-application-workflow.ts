import { detectATS } from "./ats-detector.ts";

export type EvidenceState = "confirmed" | "partial" | "missing" | "conflicting";
export type JobDecision =
  | "Apply"
  | "Consider"
  | "Skip"
  | "Insufficient information";
export type JobAnalysisState = "Not analysed" | "Analysed";
export type ApplicationWorkspaceStatus =
  | "Preparing"
  | "Needs review"
  | "Ready"
  | "Applied"
  | "Interview"
  | "Offer"
  | "Rejected"
  | "Withdrawn";

export type SourcedValue = {
  state: "extracted" | "user-confirmed" | "missing" | "conflicting";
  value: string;
  sourceText?: string;
};

export type RequirementEvidence = {
  evidence: string[];
  requirement: string;
  sourceText: string;
  state: EvidenceState;
};

export type JobAnalysisResult = {
  capability: RequirementEvidence[];
  confidence: "Low" | "Medium" | "High";
  coverage: number;
  createdAt: string;
  criticalRisk: string;
  decision: JobDecision;
  id: string;
  nextAction: string;
  positiveEvidence: string;
  reason: string;
  unknowns: string[];
  version: number;
};

export type JobRecord = {
  atsPlatform?: string;
  analysisHistory: JobAnalysisResult[];
  analysisState: JobAnalysisState;
  applicationId?: string;
  capturedAt: string;
  description: string;
  employer: SourcedValue;
  facts: {
    contract: SourcedValue;
    country: SourcedValue;
    education: SourcedValue;
    employmentType: SourcedValue;
    experience: SourcedValue;
    language: SourcedValue;
    location: SourcedValue;
    salary: SourcedValue;
    sponsorship: SourcedValue;
    workArrangement: SourcedValue;
    workAuthorisation: SourcedValue;
  };
  id: string;
  lane: string;
  skipReason?: string;
  source:
    | "Pasted vacancy"
    | "Browser extension"
    | "Saved job"
    | "Development fixture";
  sourceUrl: string;
  title: SourcedValue;
  updatedAt: string;
};

export type ScreeningAnswer = {
  consequential: boolean;
  confirmed: boolean;
  evidenceIds: string[];
  id: string;
  proposed: string;
  question: string;
  userValue: string;
};

export type ApplicationWorkspace = {
  appliedAt?: string;
  applicationChannel?: string;
  checklist: boolean[];
  consequentialAnswersReviewed: boolean;
  coverLetter?: string;
  coverLetterRequested: boolean;
  createdAt: string;
  documentVersions: string[];
  evidenceConfirmed: boolean;
  followUpDate?: string;
  id: string;
  jobId: string;
  referenceNumber?: string;
  screeningAnswers: ScreeningAnswer[];
  selectedCvVersion: string;
  status: ApplicationWorkspaceStatus;
  submissionConfirmed: boolean;
  unsupportedClaims: string[];
  updatedAt: string;
};

export type JobWorkflowState = {
  applications: ApplicationWorkspace[];
  jobs: JobRecord[];
  schemaVersion: 1;
};

const unknown = (): SourcedValue => ({ state: "missing", value: "" });
const sourced = (value: string, sourceText: string): SourcedValue =>
  value ? { state: "extracted", value, sourceText } : unknown();
const firstMatch = (text: string, expression: RegExp) =>
  text.match(expression)?.[0]?.trim() ?? "";
const lineAfter = (text: string, label: RegExp) =>
  text
    .split(/\r?\n/)
    .find((line) => label.test(line))
    ?.replace(label, "")
    .trim() ?? "";

export function extractJob(input: {
  description: string;
  employer?: string;
  sourceUrl?: string;
  title?: string;
  now?: string;
}): JobRecord {
  const description = input.description.trim();
  if (description.length < 80 || description.length > 50_000)
    throw new Error("Paste a vacancy between 80 and 50,000 characters.");
  const now = input.now ?? new Date().toISOString();
  const title =
    input.title?.trim() ||
    lineAfter(description, /^(role|job title|position)\s*:\s*/i);
  const employer =
    input.employer?.trim() ||
    lineAfter(description, /^(company|employer)\s*:\s*/i);
  const location = lineAfter(description, /^(location)\s*:\s*/i);
  const country = firstMatch(
    [location, description.slice(0, 1200)].join(" "),
    /\b(United Kingdom|UK|Ireland|Germany|Netherlands|France|Spain|Portugal|Belgium|Sweden|Denmark|Norway|Finland|Poland|Austria|Switzerland)\b/i,
  );
  const salary = firstMatch(
    description,
    /(?:£|€)\s?\d{2,3}(?:[,.]\d{3})?(?:\s?[-–]\s?(?:£|€)?\s?\d{2,3}(?:[,.]\d{3})?)?/i,
  );
  const sponsorshipText = firstMatch(
    description,
    /[^.\n]{0,90}\b(?:visa sponsorship|sponsorship)\b[^.\n]{0,120}/i,
  );
  const sponsorship = /\b(?:not stated|not specified|unclear|unknown)\b/i.test(
    sponsorshipText,
  )
    ? ""
    : sponsorshipText;
  const workAuth = firstMatch(
    description,
    /[^.\n]{0,90}\b(?:right to work|work authori[sz]ation)\b[^.\n]{0,120}/i,
  );
  const language = firstMatch(
    description,
    /\b(?:English|German|Dutch|French|Spanish)\b(?:\s+(?:required|essential|fluency|B2|C1|C2))?/i,
  );
  const arrangement = firstMatch(
    description,
    /\b(remote|hybrid|on[- ]site)\b/i,
  );
  const contract = firstMatch(
    description,
    /\b(permanent|fixed[- ]term|contract|freelance)\b/i,
  );
  const experience = firstMatch(
    description,
    /\b\d+\+?\s+years?(?:'| of)? experience\b/i,
  );
  const education = firstMatch(
    description,
    /[^.\n]{0,70}\b(?:degree|bachelor|master|certification)\b[^.\n]{0,100}/i,
  );
  const value = (raw: string) => sourced(raw, raw);
  return {
    atsPlatform: detectATS(input.sourceUrl ?? ""),
    analysisHistory: [],
    analysisState: "Not analysed",
    capturedAt: now,
    description,
    employer: sourced(employer, employer || ""),
    id: crypto.randomUUID(),
    lane: "",
    source: "Pasted vacancy",
    sourceUrl: input.sourceUrl?.trim() ?? "",
    title: sourced(title, title || ""),
    updatedAt: now,
    facts: {
      contract: value(contract),
      country: value(country),
      education: value(education),
      employmentType: value(contract),
      experience: value(experience),
      language: value(language),
      location: value(location),
      salary: value(salary),
      sponsorship: value(sponsorship),
      workArrangement: value(arrangement),
      workAuthorisation: value(workAuth),
    },
  };
}

const tokens = (value: string) =>
  new Set(value.toLowerCase().match(/[a-z][a-z0-9+#.-]{2,}/g) ?? []);
const yearsPattern = /(\d+)\+?\s*(?:years?|yrs?)\b/gi;
const allYearsMentioned = (value: string): number[] =>
  [...value.matchAll(yearsPattern)].map((match) => Number(match[1]));
const maxYearsMentioned = (value: string): number | null => {
  const years = allYearsMentioned(value);
  return years.length ? Math.max(...years) : null;
};
const requiredYears = (requirement: string): number | null => {
  const years = allYearsMentioned(requirement);
  return years.length ? years[0] : null;
};
const requirements = (description: string) =>
  description
    .split(/[.\n;•]/)
    .map((item) => item.trim())
    .filter(
      (item) =>
        item.length >= 18 &&
        /required|essential|experience|knowledge|proficien|must|responsib/i.test(
          item,
        ),
    )
    .slice(0, 12);

export function analyseJob(
  job: JobRecord,
  candidateEvidence: string,
  options: { careerLane?: string; sponsorshipRequired?: boolean } = {},
): JobAnalysisResult {
  const evidenceTokens = tokens(candidateEvidence);
  const mapped = requirements(job.description).map((requirement) => {
    const meaningful = [...tokens(requirement)].filter(
      (token) =>
        ![
          "and",
          "for",
          "from",
          "have",
          "must",
          "strong",
          "the",
          "with",
          "required",
          "essential",
          "experience",
          "knowledge",
          "responsible",
          "responsibilities",
        ].includes(token),
    );
    const matches = meaningful.filter((token) => evidenceTokens.has(token));
    const matchCoverage = meaningful.length
      ? matches.length / meaningful.length
      : 0;
    const neededYears = requiredYears(requirement);
    const candidateYears =
      neededYears !== null ? maxYearsMentioned(candidateEvidence) : null;
    const yearsSatisfied =
      neededYears !== null &&
      candidateYears !== null &&
      candidateYears >= neededYears;
    const evidence = matches.map((item) => `Confirmed evidence mentions ${item}`);
    if (yearsSatisfied) {
      evidence.unshift(
        `Confirmed evidence states ${candidateYears}+ years experience (requirement: ${neededYears}+ years)`,
      );
    }
    return {
      requirement,
      sourceText: requirement,
      evidence,
      state:
        yearsSatisfied || (matches.length >= 2 && matchCoverage >= 0.6)
          ? "confirmed"
          : matches.length >= 1
            ? "partial"
            : "missing",
    } satisfies RequirementEvidence;
  });
  const confirmed = mapped.filter((item) => item.state === "confirmed").length;
  const partial = mapped.filter((item) => item.state === "partial").length;
  const missing = mapped.filter((item) => item.state === "missing").length;
  const unknowns = [
    !job.facts.country.value && "Vacancy country",
    !job.facts.salary.value && "Salary",
    options.sponsorshipRequired &&
      !job.facts.sponsorship.value &&
      "Vacancy-specific sponsorship wording",
    !job.title.value && "Role title",
    !job.employer.value && "Employer",
  ].filter(Boolean) as string[];
  const explicitNoSponsorship =
    /(?:cannot|unable to|no)\s+(?:offer|provide)?\s*(?:visa )?sponsorship/i.test(
      job.facts.sponsorship.value,
    );
  const incompatible = Boolean(
    options.sponsorshipRequired && explicitNoSponsorship,
  );
  const coverage = mapped.length
    ? Math.round(((confirmed + partial * 0.5) / mapped.length) * 100)
    : 0;
  const decision: JobDecision = incompatible
    ? "Skip"
    : mapped.length < 2 || !candidateEvidence.trim()
      ? "Insufficient information"
      : unknowns.length >= 2
        ? "Consider"
        : coverage >= 58 && missing <= confirmed
          ? "Apply"
          : coverage >= 28
            ? "Consider"
            : "Skip";
  const reason =
    decision === "Apply"
      ? "Confirmed evidence supports most material requirements; review remaining gaps before applying."
      : decision === "Consider"
        ? "The role may be viable, but material evidence or vacancy facts need resolution."
        : decision === "Skip"
          ? incompatible
            ? "The vacancy wording conflicts with the stated sponsorship requirement."
            : "Too many material requirements lack confirmed support."
          : "There is not enough structured vacancy and candidate evidence for a reliable decision.";
  return {
    capability: mapped,
    confidence:
      unknowns.length === 0 && mapped.length >= 4
        ? "High"
        : mapped.length >= 2
          ? "Medium"
          : "Low",
    coverage,
    createdAt: new Date().toISOString(),
    criticalRisk: incompatible
      ? "Vacancy wording indicates sponsorship is unavailable."
      : (mapped.find((item) => item.state === "missing")?.requirement ??
        unknowns[0] ??
        "No material blocker confirmed."),
    decision,
    id: crypto.randomUUID(),
    nextAction:
      decision === "Apply"
        ? "Prepare an evidence-backed application."
        : decision === "Consider"
          ? `Resolve: ${unknowns[0] ?? "the strongest evidence gap"}.`
          : decision === "Skip"
            ? "Record an optional reason and continue to another role."
            : "Add candidate evidence and missing vacancy facts.",
    positiveEvidence:
      mapped.find((item) => item.state === "confirmed")?.evidence[0] ??
      "No strong confirmed match yet.",
    reason,
    unknowns,
    version: job.analysisHistory.length + 1,
  };
}

export function createApplication(job: JobRecord): ApplicationWorkspace {
  if (!job.id) throw new Error("An owned job is required.");
  const now = new Date().toISOString();
  return {
    checklist: [true, false, false, false, false, false, false, false],
    consequentialAnswersReviewed: false,
    coverLetterRequested: false,
    createdAt: now,
    documentVersions: [],
    evidenceConfirmed: false,
    id: crypto.randomUUID(),
    jobId: job.id,
    screeningAnswers: [],
    selectedCvVersion: "Confirmed profile",
    status: "Preparing",
    submissionConfirmed: false,
    unsupportedClaims: [],
    updatedAt: now,
  };
}

export function getApplicationReadiness(
  application: ApplicationWorkspace,
  job: JobRecord,
) {
  const blockers = [
    !job.title.value && "Confirm the role title",
    !job.employer.value && "Confirm the employer",
    !application.evidenceConfirmed && "Confirm supporting evidence",
    !application.consequentialAnswersReviewed && "Review consequential answers",
    application.unsupportedClaims.length > 0 && "Remove unsupported claims",
  ].filter(Boolean) as string[];
  return { blockers, ready: blockers.length === 0 };
}

export function getApplicationReviewQueue(state: JobWorkflowState) {
  return state.applications.flatMap((application) => {
    const job = state.jobs.find((item) => item.id === application.jobId);
    if (!job || application.status !== "Ready") return [];
    if (job.analysisHistory.at(-1)?.decision !== "Apply") return [];
    return getApplicationReadiness(application, job).ready
      ? [{ application, job }]
      : [];
  });
}

export function transitionApplication(
  application: ApplicationWorkspace,
  next: ApplicationWorkspaceStatus,
  job: JobRecord,
  confirm = false,
): ApplicationWorkspace {
  const order: ApplicationWorkspaceStatus[] = [
    "Preparing",
    "Needs review",
    "Ready",
    "Applied",
  ];
  if (["Interview", "Offer", "Rejected", "Withdrawn"].includes(next)) {
    const allowed: Partial<
      Record<ApplicationWorkspaceStatus, ApplicationWorkspaceStatus[]>
    > = {
      Applied: ["Interview", "Rejected", "Withdrawn"],
      Interview: ["Offer", "Rejected", "Withdrawn"],
      Offer: ["Withdrawn"],
    };
    if (!allowed[application.status]?.includes(next))
      throw new Error("Invalid application status transition.");
    return {
      ...application,
      status: next,
      updatedAt: new Date().toISOString(),
    };
  }
  if (next === "Ready" && !getApplicationReadiness(application, job).ready)
    throw new Error("Resolve every readiness blocker before marking Ready.");
  if (next === "Applied" && (application.status !== "Ready" || !confirm))
    throw new Error("Confirm a Ready application before marking it applied.");
  if (Math.abs(order.indexOf(next) - order.indexOf(application.status)) > 1)
    throw new Error("Invalid application status transition.");
  return {
    ...application,
    status: next,
    submissionConfirmed: next === "Applied",
    appliedAt:
      next === "Applied" ? new Date().toISOString() : application.appliedAt,
    updatedAt: new Date().toISOString(),
  };
}

export function applyInterviewOutcome(
  application: ApplicationWorkspace,
  outcome: "progressed" | "offer" | "rejected" | "withdrawn" | "no_response",
) {
  if (application.status !== "Interview")
    throw new Error(
      "Only an Interview application can record an interview outcome.",
    );
  if (outcome === "progressed" || outcome === "no_response")
    return { ...application, updatedAt: new Date().toISOString() };
  const status: ApplicationWorkspaceStatus =
    outcome === "offer"
      ? "Offer"
      : outcome === "rejected"
        ? "Rejected"
        : "Withdrawn";
  return { ...application, status, updatedAt: new Date().toISOString() };
}

export function isRestrictedJobUrl(value: string) {
  return /https?:\/\/(?:[^/]+\.)?(linkedin|indeed)\./i.test(value);
}
export function duplicateJob(
  jobs: JobRecord[],
  candidate: Pick<JobRecord, "sourceUrl" | "title" | "employer">,
) {
  const url = candidate.sourceUrl.toLowerCase().replace(/\/$/, "");
  return jobs.find(
    (job) =>
      (url && job.sourceUrl.toLowerCase().replace(/\/$/, "") === url) ||
      (job.title.value.toLowerCase() === candidate.title.value.toLowerCase() &&
        job.employer.value.toLowerCase() ===
          candidate.employer.value.toLowerCase()),
  );
}
