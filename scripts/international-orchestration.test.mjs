import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  assessInternationalJob,
  mobilityProfileSchema,
  orchestrateJobDecision,
} from "../packages/shared/src/international/index.ts";

const baseProfile = mobilityProfileSchema.parse({
  currentCountry: "India",
  targetCountries: ["Ireland"],
  applicantPosition: "sponsorship-required",
  sponsorshipRequired: "yes",
  relocationPreference: "yes",
});

function goodFit(overrides = {}) {
  return {
    fitScore: 80,
    fitLabel: "Strong fit",
    confidenceLevel: "High",
    scoreBreakdown: [],
    matchedSignals: ["SQL", "UAT"],
    missingSignals: [],
    riskAreas: [],
    suggestedCvPositioning: "",
    suggestedNextAction: "Apply now.",
    shortSummary: "",
    disclaimer: "",
    ...overrides,
  };
}

test("orchestrateJobDecision follows fit-only decision when international evidence is not relevant", () => {
  const result = orchestrateJobDecision({
    fit: goodFit(),
    internationalRequirement: "not-relevant",
  });
  assert.equal(result.decision, "Apply");
  assert.ok(
    result.assumptions.includes(
      "International evidence is not required for this decision.",
    ),
  );
});

test("orchestrateJobDecision returns Insufficient evidence when international evidence is required but missing", () => {
  const result = orchestrateJobDecision({
    fit: goodFit(),
    internationalRequirement: "required",
  });
  assert.equal(result.decision, "Insufficient evidence");
  assert.ok(
    result.missingEvidence.includes(
      "International evidence required for this applicant and hiring country",
    ),
  );
});

test("a confirmed international blocker overrides an otherwise strong fit score", () => {
  const international = assessInternationalJob({
    country: "Ireland",
    mobilityProfile: baseProfile,
    jobText: "We are unable to sponsor this vacancy",
    roleDuties: "Software engineering",
  });
  const result = orchestrateJobDecision({
    fit: goodFit(),
    international,
    internationalRequirement: "required",
  });
  assert.equal(result.decision, "Skip");
  assert.ok(result.blockers.length > 0);
});

test("explorer-mode (unsupported country) international evidence downgrades to Investigate first, not blocked", () => {
  const international = assessInternationalJob({
    country: "Belgium",
    mobilityProfile: baseProfile,
    jobText: "Relocation available",
    roleDuties: "",
  });
  const result = orchestrateJobDecision({
    fit: goodFit(),
    international,
    internationalRequirement: "required",
  });
  assert.equal(result.decision, "Investigate first");
});

test("a weak fit score is Skip regardless of clean international evidence", () => {
  const international = assessInternationalJob({
    country: "Ireland",
    mobilityProfile: baseProfile,
    jobText: "Visa sponsorship available for this systems engineering role",
    roleDuties: "Build services",
    salary: { amount: 60000, currency: "EUR", period: "year" },
    contractDurationMonths: 24,
    occupationMapping: "confirmed",
  });
  assert.equal(international.decision, "Apply");
  const result = orchestrateJobDecision({
    fit: goodFit({ fitScore: 30 }),
    international,
    internationalRequirement: "required",
  });
  assert.equal(result.decision, "Skip");
});

test("a clean Stamp4-verified assessment with a strong fit produces Apply", () => {
  const international = assessInternationalJob({
    country: "Ireland",
    mobilityProfile: baseProfile,
    jobText: "Visa sponsorship available for this systems engineering role",
    roleDuties: "Build services",
    contractDurationMonths: 24,
    stamp4Assessment: {
      status: "Eligible",
      pathway: "Ireland Critical Skills Employment Permit",
      occupationCode: "SOC 2135",
      occupationConfidence: "High",
      salaryDetectedEUR: 55000,
      salaryThresholdEUR: 40904,
      blockers: [],
      checkedAt: new Date().toISOString(),
    },
  });
  assert.equal(international.decision, "Apply");
  const result = orchestrateJobDecision({
    fit: goodFit(),
    international,
    internationalRequirement: "required",
  });
  assert.equal(result.decision, "Apply");
  assert.ok(result.evidenceUsed.some((item) => /Stamp4 verified/.test(item)));
});

// ai/content/route.ts imports "next/server", which the plain node test
// runner can't resolve outside Next.js's own bundler - static-inspection
// against the real source is this codebase's established pattern for
// verifying Next.js-coupled files (see docs/quality-assurance.md's #170
// entry for diagnostics.ts). This is the live enforcement point for the
// content-generation gate the audit found had no Stamp4/international
// awareness at all - confirms the fix actually wired the real boundary in,
// not just that orchestrateJobDecision itself works correctly in isolation.
test("the content-generation gate actually calls orchestrateJobDecision, not the deprecated evaluateCountryFit", async () => {
  const source = await readFile(
    new URL("../apps/web/app/api/ai/content/route.ts", import.meta.url),
    "utf8",
  );
  assert.match(source, /orchestrateJobDecision\(/);
  assert.match(source, /evaluateAutoTimeFitScore\(/);
  assert.match(source, /assessInternationalJob\(/);
  assert.doesNotMatch(source, /evaluateCountryFit\(/);
  assert.match(source, /combined\.decision === "Skip"/);
  assert.match(source, /combined\.decision === "Insufficient evidence"/);
});
