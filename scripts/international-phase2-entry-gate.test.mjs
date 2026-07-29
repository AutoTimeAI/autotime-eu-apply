import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  assessInternationalJob,
  orchestrateJobDecision,
} from "../packages/shared/src/index.ts";

const mobility = {
  schemaVersion: 1,
  currentCountry: "United Kingdom",
  targetCountries: ["Netherlands"],
  applicantPosition: "sponsorship-required",
  sponsorshipRequired: "yes",
  relocationPreference: "yes",
};

const fit = {
  fitScore: 82,
  fitLabel: "Strong fit",
  confidenceLevel: "High",
  scoreBreakdown: [],
  matchedSignals: ["Role and skills match"],
  missingSignals: [],
  riskAreas: [],
  suggestedCvPositioning: "Lead with evidence.",
  suggestedNextAction: "Apply.",
  shortSummary: "Strong role fit.",
  disclaimer: "Guidance only.",
};

test("fit-only and local work-authorised decisions remain compatible", () => {
  const result = orchestrateJobDecision({ fit });
  assert.equal(result.decision, "Apply");
  assert.equal(result.roleFitScore, 82);
  assert.match(result.assumptions[0], /not required/i);
});

test("required missing International evidence is never positive", () => {
  const result = orchestrateJobDecision({
    fit,
    internationalRequirement: "required",
  });
  assert.equal(result.decision, "Insufficient evidence");
  assert.match(
    result.missingEvidence.at(-1),
    /International evidence required/,
  );
});

test("International blocker overrides positive role fit without a second score", () => {
  const international = assessInternationalJob({
    country: "Ireland",
    mobilityProfile: mobility,
    jobText: "Applicants must have existing right to work. No sponsorship.",
    roleDuties: "Business analysis",
    salary: { amount: 70000, currency: "EUR", period: "year" },
    contractDurationMonths: 24,
    occupationMapping: "confirmed",
  });
  const result = orchestrateJobDecision({
    fit,
    international,
    internationalRequirement: "required",
  });
  assert.equal(result.decision, "Skip");
  assert.equal(result.roleFitScore, fit.fitScore);
  assert.equal("internationalScore" in result, false);
  assert.ok(result.blockers.some((item) => /not available/i.test(item)));
});

test("unsupported countries remain explorer-only in the combined decision", () => {
  const international = assessInternationalJob({
    country: "Belgium",
    mobilityProfile: mobility,
    jobText: "Visa sponsorship available",
    roleDuties: "Business analysis",
    occupationMapping: "confirmed",
  });
  const result = orchestrateJobDecision({
    fit,
    international,
    internationalRequirement: "required",
  });
  assert.equal(international.supportLevel, "explorer");
  assert.equal(result.decision, "Investigate first");
  assert.ok(result.officialSources.length > 0);
});

test("sponsor register presence cannot become vacancy sponsorship", () => {
  const international = assessInternationalJob({
    country: "Netherlands",
    mobilityProfile: mobility,
    jobText: "Senior analyst role",
    roleDuties: "Business analysis",
    salary: { amount: 70000, currency: "EUR", period: "year" },
    contractDurationMonths: 24,
    occupationMapping: "confirmed",
    employerEvidence: {
      employerName: "Example",
      country: "Netherlands",
      sourceType: "official-register",
      status: "confirmed",
    },
  });
  assert.equal(international.decision, "Investigate first");
  assert.ok(
    international.assumptions.some((item) =>
      /does not prove sponsorship/i.test(item),
    ),
  );
});

test("server boundary derives ownership and rejects client user IDs", () => {
  const route = fs.readFileSync(
    "apps/web/app/api/sync/mobility/route.ts",
    "utf8",
  );
  const repository = fs.readFileSync(
    "apps/web/lib/mobility-profile-repository.ts",
    "utf8",
  );
  const migration = fs.readFileSync(
    "supabase/migrations/20260729120000_mobility_profiles_entry_gate.sql",
    "utf8",
  );
  assert.match(route, /getRequestUser\(request\)/);
  assert.doesNotMatch(route, /body\.user|user_id.*request/);
  assert.match(repository, /mobilityProfileSchema\.strict\(\)/);
  assert.match(repository, /user_id: authenticatedUserId/);
  assert.match(migration, /auth\.uid\(\) = user_id/g);
  assert.match(migration, /on delete cascade/i);
});

test("component controller is decomposed and navigation has six destinations", () => {
  const controller = fs.readFileSync(
    "apps/web/components/InternationalModule.tsx",
    "utf8",
  );
  const nav = fs.readFileSync("apps/web/components/UserNav.tsx", "utf8");
  assert.ok(controller.split("\n").length < 180);
  for (const component of [
    "InternationalOverview",
    "CountryWorkspace",
    "MobilityProfileForm",
    "SponsorEvidenceGuide",
    "OfficialSourcesPanel",
    "InternationalSectionNavigation",
  ]) {
    assert.match(controller, new RegExp(component));
  }
  const workflowBlock = nav.match(
    /const dashboardWorkflowNavItems[\s\S]*?\n\];?\s*function isPathInSection/,
  )?.[0];
  assert.ok(workflowBlock);
  assert.equal((workflowBlock.match(/label:/g) ?? []).length, 6);
  for (const path of [
    "/dashboard/inbox",
    "/dashboard/match-score",
    "/dashboard/documents",
    "/dashboard/cv-tailor",
  ]) {
    assert.match(workflowBlock, new RegExp(path.replaceAll("/", "\\/")));
  }
  assert.match(nav, /href="\/dashboard\/extension"[\s\S]*?role="menuitem"/);
  assert.match(nav, /href="\/dashboard\/settings"[\s\S]*?role="menuitem"/);
});
