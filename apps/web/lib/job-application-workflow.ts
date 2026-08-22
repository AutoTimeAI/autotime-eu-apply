import { detectATS } from "./ats-detector.ts";
import type { ApplicationRecord } from "shared";

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
    skills: SourcedValue;
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

const europeanTechHubCityCountries: Record<string, string> = {
  London: "United Kingdom", Manchester: "United Kingdom", Edinburgh: "United Kingdom",
  Bristol: "United Kingdom", Cambridge: "United Kingdom",
  Dublin: "Ireland", Cork: "Ireland", Belfast: "United Kingdom",
  Berlin: "Germany", Munich: "Germany", Hamburg: "Germany", Frankfurt: "Germany",
  Cologne: "Germany", Stuttgart: "Germany",
  Amsterdam: "Netherlands", Rotterdam: "Netherlands", Eindhoven: "Netherlands",
  Utrecht: "Netherlands", "The Hague": "Netherlands",
  Paris: "France", Lyon: "France", Toulouse: "France",
  Madrid: "Spain", Barcelona: "Spain", Valencia: "Spain",
  Lisbon: "Portugal", Porto: "Portugal",
  Brussels: "Belgium", Antwerp: "Belgium",
  Stockholm: "Sweden", Gothenburg: "Sweden", Malmo: "Sweden", Malmö: "Sweden",
  Copenhagen: "Denmark", Aarhus: "Denmark",
  Oslo: "Norway", Bergen: "Norway",
  Helsinki: "Finland", Espoo: "Finland",
  Warsaw: "Poland", Krakow: "Poland", Kraków: "Poland",
  Wroclaw: "Poland", Wrocław: "Poland",
  Vienna: "Austria", Graz: "Austria",
  Zurich: "Switzerland", Zürich: "Switzerland", Geneva: "Switzerland", Basel: "Switzerland",
  Milan: "Italy", Rome: "Italy", Turin: "Italy",
};
const europeanTechHubCities = Object.keys(europeanTechHubCityCountries);
const cityPattern = new RegExp(`\\b(${europeanTechHubCities.join("|")})\\b`, "i");
const findKnownCity = (text: string): string => {
  const match = firstMatch(text, cityPattern);
  const canonical = europeanTechHubCities.find(
    (city) => city.toLowerCase() === match.toLowerCase(),
  );
  return canonical ?? "";
};
const skillsTaxonomy = [
  "TypeScript", "JavaScript", "Python", "Java", "Kotlin", "Swift",
  "Ruby", "PHP", "Golang", "Rust", "C++", "C#", ".NET", "Scala",
  "Node.js", "React", "Vue", "Angular", "Next.js", "Django", "Flask",
  "Spring", "Spring Boot", "Rails",
  "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch", "Kafka",
  "RabbitMQ", "DynamoDB", "SQL",
  "AWS", "GCP", "Azure", "Kubernetes", "Docker", "Terraform", "Ansible",
  "Jenkins", "CI/CD", "GraphQL", "REST", "gRPC", "Microservices",
] as const;
// Custom (rather than \b) boundaries: several entries (".NET", "C++", "C#")
// start or end with a non-word character, which \b cannot bound correctly.
const skillsPattern = new RegExp(
  `(?<![A-Za-z0-9])(${skillsTaxonomy.map((skill) => skill.replace(/[.+#]/g, "\\$&")).join("|")})(?![A-Za-z0-9])`,
  "gi",
);
const extractSkills = (description: string): string => {
  const matches = new Set<string>();
  for (const match of description.matchAll(skillsPattern)) {
    const canonical = skillsTaxonomy.find(
      (skill) => skill.toLowerCase() === match[0].toLowerCase(),
    );
    if (canonical) matches.add(canonical);
  }
  return [...matches].join(", ");
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
  const labelledLocation = lineAfter(description, /^(location)\s*:\s*/i);
  const detectedCity = findKnownCity(description.slice(0, 1200));
  const location = labelledLocation || detectedCity;
  const country =
    firstMatch(
      [labelledLocation, description.slice(0, 1200)].join(" "),
      /\b(United Kingdom|UK|Ireland|Germany|Netherlands|France|Spain|Portugal|Belgium|Sweden|Denmark|Norway|Finland|Poland|Austria|Switzerland)\b/i,
    ) ||
    (detectedCity ? europeanTechHubCityCountries[detectedCity] : "") ||
    "";
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
    new RegExp(
      `\\b${yearsNumberAlternation}\\+?\\s*years?\\b[^.\\n]{0,40}?\\bexperience\\b`,
      "i",
    ),
  );
  const education = firstMatch(
    description,
    /[^.\n]{0,70}\b(?:degree|bachelor|master|certification)\b[^.\n]{0,100}/i,
  );
  const skills = extractSkills(description);
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
      skills: value(skills),
      sponsorship: value(sponsorship),
      workArrangement: value(arrangement),
      workAuthorisation: value(workAuth),
    },
  };
}

const tokens = (value: string) =>
  new Set(value.toLowerCase().match(/[a-z][a-z0-9+#.-]{2,}/g) ?? []);
// Vacancies and CVs sometimes spell out small numbers ("five years of
// backend experience") instead of using digits - matched here so years-of-
// experience requirements aren't silently missed just because of phrasing.
const spelledYearNumbers: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
};
const yearsNumberAlternation = `(?:\\d+|${Object.keys(spelledYearNumbers).join("|")})`;
const yearsPattern = new RegExp(
  `(${yearsNumberAlternation})\\+?\\s*(?:years?|yrs?)\\b`,
  "gi",
);
const allYearsMentioned = (value: string): number[] =>
  [...value.matchAll(yearsPattern)].map((match) => {
    const raw = match[1].toLowerCase();
    return /^\d+$/.test(raw) ? Number(raw) : spelledYearNumbers[raw];
  });
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
  // Tracked in parallel with `mapped` (rather than added to the returned
  // RequirementEvidence shape, which is a public wire type) so a single
  // requirement confirmed via an explicit years-of-experience match can be
  // told apart from one confirmed via generic keyword overlap - see the
  // decision logic below.
  const yearsSatisfiedFlags: boolean[] = [];
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
    yearsSatisfiedFlags.push(yearsSatisfied);
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
  // A single extracted requirement is normally too thin a signal to trust -
  // matching just one requirement via generic keyword overlap is easy to get
  // by chance. An explicit years-of-experience match is a much stronger,
  // harder-to-game signal, so it's allowed to stand on its own.
  const singleRequirementStrongMatch =
    mapped.length === 1 &&
    mapped[0].state === "confirmed" &&
    yearsSatisfiedFlags[0];
  const decision: JobDecision = incompatible
    ? "Skip"
    : !candidateEvidence.trim() ||
        (mapped.length < 2 && !singleRequirementStrongMatch)
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

// Normalizes a job/application URL the same way apps/web/app/api/sync/dashboard/route.ts
// does server-side, so client-side dedup against cloud records agrees with the server's
// own identity rule for an application.
export function normalizeJobUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    parsed.hash = "";
    parsed.hostname = parsed.hostname.toLowerCase();
    parsed.pathname = parsed.pathname.replace(/\/+$/, "");
    return parsed.toString().replace(/\/$/, "").toLowerCase();
  } catch {
    return rawUrl.trim().toLowerCase().replace(/\/$/, "");
  }
}

const cloudToLocalStatus: Record<
  ApplicationRecord["status"],
  ApplicationWorkspaceStatus
> = {
  Saved: "Preparing",
  "Checking fit": "Preparing",
  "Ready to apply": "Ready",
  Applied: "Applied",
  Interview: "Interview",
  Offer: "Offer",
  Rejected: "Rejected",
  Archived: "Withdrawn",
};

// Converts a cloud `applications` row (from GET /api/sync/dashboard) into a
// read-only-in-practice local job/application pair, so it can be displayed
// alongside browser-local jobs on the Jobs/Applications pages. This is a
// display bridge only: none of the local-only concepts these pages otherwise
// support (extracted facts, analysis history, screening answers, checklist,
// etc.) exist in the cloud row, so those fields are intentionally left empty
// rather than fabricated. Callers should not feed the result back through
// saveJobWorkflow/persist - it is not a real local record.
export function cloudApplicationToWorkspaceJob(record: ApplicationRecord): {
  application: ApplicationWorkspace;
  job: JobRecord;
} {
  const timestamp = record.updatedAt ?? record.createdAt;
  const job: JobRecord = {
    analysisHistory: [],
    analysisState: "Not analysed",
    atsPlatform: record.atsPlatform,
    capturedAt: record.createdAt,
    description: "",
    employer: sourced(record.company ?? "", record.company ?? ""),
    facts: {
      contract: unknown(),
      country: unknown(),
      education: unknown(),
      employmentType: unknown(),
      experience: unknown(),
      language: unknown(),
      location: unknown(),
      salary: unknown(),
      skills: unknown(),
      sponsorship: unknown(),
      workArrangement: unknown(),
      workAuthorisation: unknown(),
    },
    id: record.id,
    lane: "",
    source: "Saved job",
    sourceUrl: record.url,
    title: sourced(record.title, record.title),
    updatedAt: timestamp,
  };
  const application: ApplicationWorkspace = {
    checklist: [true, false, false, false, false, false, false, false],
    consequentialAnswersReviewed: false,
    coverLetterRequested: false,
    createdAt: record.createdAt,
    documentVersions: [],
    evidenceConfirmed: false,
    followUpDate: record.nextActionDate,
    id: record.id,
    jobId: record.id,
    screeningAnswers: [],
    selectedCvVersion: "Confirmed profile",
    status: cloudToLocalStatus[record.status] ?? "Preparing",
    submissionConfirmed: false,
    unsupportedClaims: [],
    updatedAt: timestamp,
  };
  return { application, job };
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
  if (next === "Ready" && application.status === "Applied")
    throw new Error("An applied application cannot be moved back to Ready.");
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
