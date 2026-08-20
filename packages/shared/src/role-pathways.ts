import { z } from "zod";

export const ROLE_PATHWAYS_SCHEMA_VERSION = 1;
export const ESCO_CACHE_VERSION = "esco-fixture-2026.1";
export const evidenceStrengthSchema = z.enum([
  "professional",
  "production-project",
  "community",
  "portfolio",
  "education",
  "self-declared",
]);
export const competencyEvidenceSchema = z
  .object({
    competencyId: z.string().min(1),
    label: z.string().min(1),
    supportingText: z.string().min(1).max(800),
    source: z.enum(["profile", "cv", "project", "job", "user-confirmation"]),
    strength: evidenceStrengthSchema,
    confirmed: z.boolean(),
    recencyYears: z.number().min(0).max(50).optional(),
    durationMonths: z.number().int().min(0).max(600).optional(),
  })
  .strict();
export const rolePreferencesSchema = z
  .object({
    countries: z.array(z.enum(["Ireland", "Germany", "Netherlands"])).min(1),
    workStyle: z.enum([
      "building",
      "analysing",
      "testing",
      "supporting",
      "coordinating",
      "mixed",
    ]),
    codingPreference: z.enum(["high", "some", "low", "none"]),
    stakeholderPreference: z.enum(["high", "some", "low"]),
    workingModel: z.enum(["remote", "hybrid", "onsite", "flexible"]),
    salaryPreference: z.string().max(120).default(""),
    supportRequired: z.enum(["yes", "no", "unsure"]),
    languages: z
      .array(
        z.object({
          language: z.string().min(1),
          proficiency: z.string().min(1),
        }),
      )
      .max(12),
    areas: z.array(z.string().min(1)).max(12),
  })
  .strict();
const namedSkillSchema = z
  .object({ id: z.string(), label: z.string() })
  .strict();
export const escoOccupationSchema = z
  .object({
    id: z.string().min(1),
    uri: z.string().url(),
    preferredTitle: z.string().min(1),
    alternativeTitles: z.array(z.string()),
    description: z.string().min(1),
    essentialSkills: z.array(namedSkillSchema),
    optionalSkills: z.array(namedSkillSchema),
    broaderIds: z.array(z.string()),
    narrowerIds: z.array(z.string()),
    relatedIds: z.array(z.string()),
    supportedLanguage: z.string(),
    sourceUrl: z.string().url(),
    retrievedAt: z.string().datetime(),
    family: z.string(),
  })
  .strict();
const evidenceItemSchema = z
  .object({ text: z.string().min(1), sourceText: z.string().min(1) })
  .strict();
const jobCompetencySchema = z
  .object({
    competencyId: z.string(),
    label: z.string(),
    sourceText: z.string(),
  })
  .strict();
export const normalisedEuropeanJobSchema = z
  .object({
    id: z.string(),
    sourceType: z.string(),
    sourceUrl: z.string().url().optional(),
    sourceName: z.string(),
    title: z.string(),
    normalisedTitle: z.string().optional(),
    escoOccupationId: z.string().optional(),
    employer: z.string().optional(),
    country: z.string(),
    region: z.string().optional(),
    languageRequirements: z.array(z.string()),
    employmentType: z.string().optional(),
    workingModel: z.enum(["remote", "hybrid", "onsite", "unknown"]).optional(),
    salary: z
      .object({
        minimum: z.number().optional(),
        maximum: z.number().optional(),
        currency: z.string().optional(),
        period: z.string().optional(),
        disclosed: z.boolean(),
      })
      .strict()
      .optional(),
    responsibilities: z.array(evidenceItemSchema),
    essentialCompetencies: z.array(jobCompetencySchema),
    optionalCompetencies: z.array(jobCompetencySchema),
    experienceRequirements: z.array(evidenceItemSchema),
    educationRequirements: z.array(evidenceItemSchema),
    sponsorshipEvidence: z.array(evidenceItemSchema),
    workAuthorisationEvidence: z.array(evidenceItemSchema),
    extractedAt: z.string().datetime(),
    sourcePublishedAt: z.string().datetime().optional(),
    extractionModel: z.string().optional(),
    extractionVersion: z.string(),
    confidence: z.number().min(0).max(1),
  })
  .strict();

export type CompetencyEvidence = z.infer<typeof competencyEvidenceSchema>;
export type RolePreferences = z.infer<typeof rolePreferencesSchema>;
export type EscoOccupation = z.infer<typeof escoOccupationSchema>;
export type NormalisedEuropeanJob = z.infer<typeof normalisedEuropeanJobSchema>;
const skill = (id: string) => ({ id, label: id.replaceAll("-", " ") });
const sourceUrl = "https://esco.ec.europa.eu/en/classification/occupation_main";
const retrievedAt = "2026-07-01T00:00:00.000Z";
type FixtureRow = [string, string, string, string[], string[], string[]];
const fixtureRows: FixtureRow[] = [
  [
    "2512.1",
    "software developer",
    "software-engineering",
    ["programming", "software-design", "testing", "git"],
    ["api", "cloud"],
    ["2513.1", "2514.1"],
  ],
  [
    "2513.1",
    "web developer",
    "web-development",
    ["programming", "web-development", "testing"],
    ["api", "accessibility"],
    ["2512.1"],
  ],
  [
    "2514.1",
    "applications programmer",
    "integration",
    ["programming", "api", "software-design"],
    ["payments", "cloud"],
    ["2512.1"],
  ],
  [
    "2523.1",
    "computer network engineer",
    "cloud-infrastructure",
    ["networking", "cloud", "infrastructure"],
    ["automation", "security"],
    ["2522.1"],
  ],
  [
    "2522.1",
    "systems administrator",
    "technical-operations",
    ["systems-support", "infrastructure", "troubleshooting"],
    ["cloud", "networking"],
    ["2523.1", "2529.1"],
  ],
  [
    "2529.1",
    "ICT security specialist",
    "cybersecurity",
    ["security", "risk-controls", "incident-response"],
    ["networking", "cloud"],
    ["2522.1"],
  ],
  [
    "2511.1",
    "data analyst",
    "data-analytics",
    ["data-analysis", "sql", "statistics"],
    ["visualisation", "python"],
    ["2521.1"],
  ],
  [
    "2521.1",
    "database designer",
    "data-engineering",
    ["sql", "data-modelling", "data-pipelines"],
    ["cloud", "python"],
    ["2511.1"],
  ],
  [
    "2511.2",
    "data scientist",
    "ai-data-science",
    ["statistics", "machine-learning", "python"],
    ["sql", "model-deployment"],
    ["2511.1", "2511.3"],
  ],
  [
    "2511.3",
    "machine learning engineer",
    "ai-engineering",
    ["machine-learning", "programming", "model-deployment"],
    ["cloud", "data-pipelines"],
    ["2511.2", "2512.1"],
  ],
  [
    "2519.1",
    "software tester",
    "quality-engineering",
    ["testing", "test-automation", "quality-assurance"],
    ["programming", "api"],
    ["2512.1"],
  ],
  [
    "2421.1",
    "ICT business analyst",
    "business-analysis",
    ["requirements-analysis", "process-modelling", "stakeholder-management"],
    ["sql", "testing"],
    ["2512.1"],
  ],
  [
    "2434.1",
    "ICT product manager",
    "product-delivery",
    ["product-strategy", "stakeholder-management", "delivery"],
    ["data-analysis", "technology-domain"],
    ["2421.1"],
  ],
  [
    "2519.2",
    "ICT implementation consultant",
    "solutions-consulting",
    ["requirements-analysis", "systems-support", "stakeholder-management"],
    ["api", "delivery"],
    ["2421.1", "2522.1"],
  ],
];
// Repository resilience data shaped as ESCO responses; never rendered as a proprietary fixed catalogue.
export const cachedEscoTechnologySubset = fixtureRows.map(
  ([id, title, family, essential, optional, related]) =>
    escoOccupationSchema.parse({
      id,
      uri: `http://data.europa.eu/esco/occupation/${id}`,
      preferredTitle: title,
      alternativeTitles: [],
      description: `ESCO-aligned ${title} occupation for resilient technology-role discovery.`,
      essentialSkills: essential.map(skill),
      optionalSkills: optional.map(skill),
      broaderIds: [],
      narrowerIds: [],
      relatedIds: related,
      supportedLanguage: "en",
      sourceUrl,
      retrievedAt,
      family,
    }),
);

export interface EscoProvider {
  metadata(): { provider: string; version: string; lastSynchronisedAt: string };
  search(query: string): Promise<EscoOccupation[]>;
  technologyOccupations(): Promise<EscoOccupation[]>;
}
export class CachedEscoProvider implements EscoProvider {
  metadata() {
    return {
      provider: "repository-cache",
      version: ESCO_CACHE_VERSION,
      lastSynchronisedAt: retrievedAt,
    };
  }
  async technologyOccupations() {
    return cachedEscoTechnologySubset;
  }
  async search(query: string) {
    const terms = query.toLowerCase().split(/\W+/).filter(Boolean);
    return cachedEscoTechnologySubset.filter((role) =>
      terms.some((term) =>
        `${role.preferredTitle} ${role.family} ${role.essentialSkills.map((item) => item.label).join(" ")}`.includes(
          term,
        ),
      ),
    );
  }
}
export class ApiEscoProvider implements EscoProvider {
  private readonly endpoint: string;
  private readonly fetcher: typeof fetch;
  constructor(endpoint: string, fetcher: typeof fetch = fetch) {
    this.endpoint = endpoint;
    this.fetcher = fetcher;
  }
  metadata() {
    return {
      provider: "esco-api",
      version: "configured-api",
      lastSynchronisedAt: "request-time",
    };
  }
  async technologyOccupations() {
    return this.search("information and communication technology");
  }
  async search(query: string) {
    const response = await this.fetcher(
      `${this.endpoint.replace(/\/$/, "")}/search?type=occupation&language=en&text=${encodeURIComponent(query)}`,
    );
    if (!response.ok) throw new Error("ESCO API is unavailable.");
    const body = (await response.json()) as {
      _embedded?: { results?: unknown[] };
    };
    return escoOccupationSchema.array().parse(body._embedded?.results ?? []);
  }
}
export class ResilientEscoProvider implements EscoProvider {
  private readonly primary: EscoProvider | null;
  private readonly fallback: EscoProvider;
  constructor(
    primary: EscoProvider | null,
    fallback: EscoProvider = new CachedEscoProvider(),
  ) {
    this.primary = primary;
    this.fallback = fallback;
  }
  metadata() {
    return this.primary?.metadata() ?? this.fallback.metadata();
  }
  async technologyOccupations() {
    try {
      return this.primary
        ? await this.primary.technologyOccupations()
        : await this.fallback.technologyOccupations();
    } catch {
      return this.fallback.technologyOccupations();
    }
  }
  async search(query: string) {
    try {
      return this.primary
        ? await this.primary.search(query)
        : await this.fallback.search(query);
    } catch {
      return this.fallback.search(query);
    }
  }
}
export type MarketEvidence = {
  country: string;
  observedVacancies: number;
  sampleSize: number;
  evidencePeriod: string;
  recurringCompetencies: string[];
  alternativeTitles: string[];
  languageRequirements: string[];
  workingModels: Record<string, number>;
  salaryObservations: number;
  sponsorshipObservations: string[];
  freshness: string;
  sourceCoverage: string[];
};
export type RoleRecommendation = {
  occupation: EscoOccupation;
  capabilityScore: number;
  marketReadinessScore: number;
  preferenceAlignment: number;
  countryMarketSignal:
    | "strong observed signal"
    | "moderate observed signal"
    | "limited observed signal"
    | "insufficient data"
    | "not assessed";
  mobilityStatus:
    | "viable"
    | "potentially viable"
    | "constrained"
    | "insufficient information"
    | "not assessed";
  transitionDistance:
    | "direct match"
    | "one-step adjacent"
    | "two-step transition"
    | "major retraining required"
    | "unsupported by current evidence";
  supportingEvidence: CompetencyEvidence[];
  missingEssentialCompetencies: string[];
  facts: string[];
  inferences: string[];
  unknowns: string[];
  correctiveActions: string[];
  market: MarketEvidence;
  gatePassed: boolean;
};
const strengthWeight = {
  professional: 1,
  "production-project": 0.82,
  community: 0.68,
  portfolio: 0.55,
  education: 0.35,
  "self-declared": 0.18,
} as const;
const specialisedGates: Record<string, string[][]> = {
  "data-analytics": [["data-analysis"], ["statistics"]],
  cybersecurity: [["security"], ["risk-controls", "incident-response"]],
  "ai-data-science": [["statistics"], ["machine-learning"], ["python"]],
  "ai-engineering": [
    ["machine-learning"],
    ["programming"],
    ["model-deployment"],
  ],
  "cloud-infrastructure": [["cloud"], ["infrastructure", "networking"]],
  "product-delivery": [
    ["product-strategy"],
    ["delivery"],
    ["stakeholder-management"],
  ],
  "business-analysis": [["requirements-analysis"], ["process-modelling"]],
};
const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const unique = (values: string[]) => [...new Set(values)].sort();
export function aggregateMarketEvidence(
  occupationId: string,
  country: string,
  jobs: NormalisedEuropeanJob[],
): MarketEvidence {
  const relevant = jobs.filter(
    (job) => job.country === country && job.escoOccupationId === occupationId,
  );
  const workingModels: Record<string, number> = {};
  relevant.forEach((job) => {
    const key = job.workingModel ?? "unknown";
    workingModels[key] = (workingModels[key] ?? 0) + 1;
  });
  return {
    country,
    observedVacancies: relevant.length,
    sampleSize: relevant.length,
    evidencePeriod: relevant.length
      ? "observed fixture period"
      : "not available",
    recurringCompetencies: unique(
      relevant.flatMap((job) =>
        [...job.essentialCompetencies, ...job.optionalCompetencies].map(
          (item) => item.label,
        ),
      ),
    ),
    alternativeTitles: unique(relevant.map((job) => job.title)),
    languageRequirements: unique(
      relevant.flatMap((job) => job.languageRequirements),
    ),
    workingModels,
    salaryObservations: relevant.filter((job) => job.salary?.disclosed).length,
    sponsorshipObservations: relevant.flatMap((job) =>
      job.sponsorshipEvidence.map((item) => item.sourceText),
    ),
    freshness: relevant.length
      ? relevant
          .map((job) => job.extractedAt)
          .sort()
          .at(-1)!
      : "not available",
    sourceCoverage: unique(relevant.map((job) => job.sourceName)),
  };
}
function preferenceScore(role: EscoOccupation, preferences: RolePreferences) {
  let score = 50;
  if (
    preferences.areas.some((area) =>
      role.family.includes(area.toLowerCase().replaceAll(" ", "-")),
    )
  )
    score += 25;
  if (
    preferences.codingPreference === "high" &&
    ["software", "web", "ai", "data-engineering"].some((x) =>
      role.family.includes(x),
    )
  )
    score += 15;
  if (
    preferences.stakeholderPreference === "high" &&
    ["business", "product", "consulting"].some((x) => role.family.includes(x))
  )
    score += 10;
  return clamp(score);
}
export function scoreOccupation(
  role: EscoOccupation,
  evidence: CompetencyEvidence[],
  preferences: RolePreferences,
  jobs: NormalisedEuropeanJob[],
  country: string,
  mobilityGoverned = false,
): RoleRecommendation {
  const confirmed = evidence.filter((item) => item.confirmed);
  const bySkill = new Map(confirmed.map((item) => [item.competencyId, item]));
  const matches = role.essentialSkills.flatMap(
    (item) => bySkill.get(item.id) ?? [],
  );
  const supporting = role.optionalSkills.flatMap(
    (item) => bySkill.get(item.id) ?? [],
  );
  const coverage = role.essentialSkills.length
    ? matches.length / role.essentialSkills.length
    : 0;
  const practical = matches.length
    ? matches.reduce((sum, item) => sum + strengthWeight[item.strength], 0) /
      matches.length
    : 0;
  const recency = matches.length
    ? matches.filter((item) => (item.recencyYears ?? 0) <= 5).length /
      matches.length
    : 0;
  const capabilityScore = clamp(
    coverage * 50 +
      practical * 25 +
      Math.min(supporting.length / 2, 1) * 10 +
      recency * 10 +
      (matches.length >= 2 ? 5 : 0),
  );
  const production = matches.some((item) =>
    ["professional", "production-project"].includes(item.strength),
  );
  const marketReadinessScore = clamp(
    coverage * 45 + practical * 30 + (production ? 15 : 0) + recency * 10,
  );
  const gates = specialisedGates[role.family] ?? [];
  const gatePassed = gates.every((alternatives) =>
    alternatives.some((id) => {
      const item = bySkill.get(id);
      return Boolean(
        item &&
        [
          "professional",
          "production-project",
          "community",
          "portfolio",
        ].includes(item.strength),
      );
    }),
  );
  const market = aggregateMarketEvidence(role.id, country, jobs);
  const countryMarketSignal =
    market.sampleSize < 3
      ? "insufficient data"
      : market.sampleSize >= 10
        ? "strong observed signal"
        : market.sampleSize >= 5
          ? "moderate observed signal"
          : "limited observed signal";
  const transitionDistance =
    !gatePassed && gates.length
      ? "major retraining required"
      : capabilityScore >= 70
        ? "direct match"
        : capabilityScore >= 48
          ? "one-step adjacent"
          : capabilityScore >= 28
            ? "two-step transition"
            : "unsupported by current evidence";
  const missing = role.essentialSkills
    .filter((item) => !bySkill.has(item.id))
    .map((item) => item.label);
  return {
    occupation: role,
    capabilityScore,
    marketReadinessScore,
    preferenceAlignment: preferenceScore(role, preferences),
    countryMarketSignal,
    mobilityStatus: mobilityGoverned
      ? "potentially viable"
      : "insufficient information",
    transitionDistance,
    supportingEvidence: matches,
    missingEssentialCompetencies: missing,
    facts: matches.map((item) => `${item.label}: ${item.supportingText}`),
    inferences: [
      `Shared confirmed competency coverage: ${Math.round(coverage * 100)}%.`,
    ],
    unknowns: [
      market.sampleSize < 3
        ? "Current country demand is unknown because the observed sample is insufficient."
        : "Vacancy-level sponsorship must be checked for each job.",
    ],
    correctiveActions: missing
      .slice(0, 3)
      .map((item) => `Build and confirm practical evidence for ${item}.`),
    market,
    gatePassed,
  };
}
export function discoverRolePathways(
  occupations: EscoOccupation[],
  evidence: CompetencyEvidence[],
  preferences: RolePreferences,
  jobs: NormalisedEuropeanJob[],
  country: string,
  mobilityGoverned = false,
) {
  return occupations
    .map((role) =>
      scoreOccupation(
        role,
        evidence,
        preferences,
        jobs,
        country,
        mobilityGoverned,
      ),
    )
    .sort(
      (a, b) =>
        b.capabilityScore * 0.65 +
          b.preferenceAlignment * 0.2 +
          b.marketReadinessScore * 0.15 -
          (a.capabilityScore * 0.65 +
            a.preferenceAlignment * 0.2 +
            a.marketReadinessScore * 0.15) ||
        a.occupation.id.localeCompare(b.occupation.id),
    );
}
export const laneSelectionSchema = z
  .object({
    schemaVersion: z.literal(ROLE_PATHWAYS_SCHEMA_VERSION),
    catalogueVersion: z.literal(ESCO_CACHE_VERSION),
    userId: z.string().trim().min(1),
    primary: z.string().min(1),
    secondary: z.array(z.string().min(1)).max(2),
    explorer: z.string().min(1).optional(),
    savedAt: z.string().datetime(),
  })
  .strict()
  .superRefine((value, context) => {
    const all = [value.primary, ...value.secondary, value.explorer].filter(
      (item): item is string => Boolean(item),
    );
    if (new Set(all).size !== all.length)
      context.addIssue({
        code: "custom",
        message: "Career lanes must be unique.",
      });
  });
export type LaneSelection = z.infer<typeof laneSelectionSchema>;

// Persists in-progress Career Direction state (extracted/confirmed
// competency evidence, generated recommendations, the selected role, and
// the current stage) across navigation - previously only the final
// {primary, secondary, explorer} lane selection was ever saved, so leaving
// and returning to the page always reset stage/evidence/recommendations to
// empty even when a lane had already been saved.
//
// `recommendations`/`selectedRole` are validated loosely (object shape
// only, not every RoleRecommendation/EscoOccupation field) rather than with
// a full strict mirror of those TS types - this is a same-browser,
// same-app round trip of data the app itself just computed, not a wire
// contract with another system, so a lighter check that still guards
// against corrupt/malformed localStorage is proportionate. Callers should
// treat the parsed `recommendations`/`selectedRole` as RoleRecommendation[]
// / RoleRecommendation | null after validation.
const looseRoleRecommendationSchema = z.record(z.string(), z.unknown());
export const rolePathwaysProgressSchema = z
  .object({
    schemaVersion: z.literal(ROLE_PATHWAYS_SCHEMA_VERSION),
    catalogueVersion: z.string().min(1),
    userId: z.string().trim().min(1),
    stage: z.number().int().min(1).max(5),
    candidateText: z.string(),
    evidence: z.array(competencyEvidenceSchema),
    recommendations: z.array(looseRoleRecommendationSchema),
    selectedRole: looseRoleRecommendationSchema.nullable(),
    savedAt: z.string().datetime(),
  })
  .strict();
export type RolePathwaysProgress = z.infer<typeof rolePathwaysProgressSchema>;
