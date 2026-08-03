import assert from "node:assert/strict";
import { MockRoleIntelligenceProvider } from "../apps/web/lib/role-intelligence.ts";
import {
  ESCO_CACHE_VERSION,
  cachedEscoTechnologySubset,
  competencyEvidenceSchema,
  discoverRolePathways,
  laneSelectionSchema,
  rolePreferencesSchema,
  scoreOccupation,
} from "../packages/shared/src/role-pathways.ts";
const preferences = rolePreferencesSchema.parse({
  countries: ["Ireland"],
  workStyle: "mixed",
  codingPreference: "some",
  stakeholderPreference: "some",
  workingModel: "flexible",
  salaryPreference: "",
  supportRequired: "unsure",
  languages: [],
  areas: [],
});
const ev = (
  competencyId,
  strength = "professional",
  supportingText = `Used ${competencyId} in a production FinTech platform.`,
) =>
  competencyEvidenceSchema.parse({
    competencyId,
    label: competencyId.replaceAll("-", " "),
    supportingText,
    source: "cv",
    strength,
    confirmed: true,
    recencyYears: 1,
  });
const role = (family) =>
  cachedEscoTechnologySubset.find((item) => item.family === family);
assert.equal(ESCO_CACHE_VERSION, "esco-fixture-2026.1");
assert.ok(
  cachedEscoTechnologySubset.every(
    (item) => item.id && item.uri && item.sourceUrl,
  ),
);
const fintech = [
  ev("programming"),
  ev("software-design"),
  ev("testing"),
  ev("api"),
  ev("payments"),
  ev("sql"),
  ev("data-modelling"),
  ev("data-pipelines"),
];
const result = discoverRolePathways(
  cachedEscoTechnologySubset,
  fintech,
  preferences,
  [],
  "Ireland",
);
assert.ok(
  new Set(result.slice(0, 6).map((item) => item.occupation.family)).size > 1,
  "FinTech evidence spans role families",
);
assert.equal(
  scoreOccupation(
    role("data-analytics"),
    [ev("sql")],
    preferences,
    [],
    "Ireland",
  ).gatePassed,
  false,
  "SQL alone is not a data analyst recommendation",
);
assert.equal(
  scoreOccupation(
    role("cybersecurity"),
    [ev("systems-support")],
    preferences,
    [],
    "Ireland",
  ).gatePassed,
  false,
  "support is not cybersecurity",
);
const degree = scoreOccupation(
  role("software-engineering"),
  [ev("programming", "education")],
  preferences,
  [],
  "Ireland",
);
const production = scoreOccupation(
  role("software-engineering"),
  [ev("programming", "professional")],
  preferences,
  [],
  "Ireland",
);
assert.ok(
  degree.capabilityScore < production.capabilityScore,
  "education weighs less than production",
);
const aiPortfolio = scoreOccupation(
  role("ai-engineering"),
  [
    ev("machine-learning", "portfolio"),
    ev("programming", "portfolio"),
    ev("model-deployment", "portfolio"),
  ],
  preferences,
  [],
  "Ireland",
);
const aiProfessional = scoreOccupation(
  role("ai-engineering"),
  [ev("machine-learning"), ev("programming"), ev("model-deployment")],
  preferences,
  [],
  "Ireland",
);
assert.ok(aiPortfolio.capabilityScore < aiProfessional.capabilityScore);
assert.equal(
  scoreOccupation(
    role("cloud-infrastructure"),
    [ev("cloud", "education")],
    preferences,
    [],
    "Ireland",
  ).gatePassed,
  false,
);
assert.equal(
  scoreOccupation(
    role("cybersecurity"),
    [ev("security")],
    preferences,
    [],
    "Ireland",
  ).gatePassed,
  false,
);
const changed = {
  ...preferences,
  codingPreference: "high",
  areas: ["software engineering"],
};
const baseRole = scoreOccupation(
  role("software-engineering"),
  fintech,
  preferences,
  [],
  "Ireland",
);
const preferredRole = scoreOccupation(
  role("software-engineering"),
  fintech,
  changed,
  [],
  "Ireland",
);
assert.equal(
  baseRole.capabilityScore,
  preferredRole.capabilityScore,
  "preference cannot manufacture capability",
);
assert.ok(preferredRole.preferenceAlignment >= baseRole.preferenceAlignment);
assert.equal(baseRole.countryMarketSignal, "insufficient data");
assert.match(baseRole.unknowns.join(" "), /unknown|insufficient/i);
assert.equal(baseRole.mobilityStatus, "insufficient information");
assert.doesNotMatch(
  JSON.stringify(baseRole),
  /probability|chance of getting hired/i,
);
assert.throws(() =>
  laneSelectionSchema.parse({
    schemaVersion: 1,
    catalogueVersion: ESCO_CACHE_VERSION,
    userId: "",
    primary: "2512.1",
    secondary: [],
    savedAt: new Date().toISOString(),
  }),
);
assert.throws(() =>
  laneSelectionSchema.parse({
    schemaVersion: 1,
    catalogueVersion: "old",
    userId: "u",
    primary: "2512.1",
    secondary: [],
    savedAt: new Date().toISOString(),
  }),
);
assert.deepEqual(
  discoverRolePathways(
    cachedEscoTechnologySubset,
    fintech,
    preferences,
    [],
    "Ireland",
  ),
  result,
  "recommendations are deterministic",
);
const provider = new MockRoleIntelligenceProvider();
const extractedBackend = await provider.extractCandidateEvidence({
  text: "Backend engineer with 7 years of TypeScript, Node.js, PostgreSQL, REST APIs, AWS, Docker, Kubernetes, CI/CD, production incident response and mentoring. Built payment services and reduced API latency by 35 percent.",
});
const confirmedBackend = extractedBackend.evidence.map((item) => ({
  ...item,
  confirmed: true,
}));
const integratedBackend = discoverRolePathways(
  cachedEscoTechnologySubset,
  confirmedBackend,
  preferences,
  [],
  "Ireland",
);
assert.ok(
  integratedBackend.some(
    (item) =>
      ["software-engineering", "integration"].includes(item.occupation.family) &&
      ["direct match", "one-step adjacent"].includes(item.transitionDistance),
  ),
  "mock extraction, competency IDs and deterministic scoring integrate into a credible software pathway",
);
assert.ok(
  integratedBackend
    .filter((item) => item.occupation.family === "data-analytics")
    .every((item) => !item.gatePassed),
  "SQL in a backend profile cannot bypass the data-analysis gate",
);

console.log("Role Pathways deterministic safeguards: PASS");
