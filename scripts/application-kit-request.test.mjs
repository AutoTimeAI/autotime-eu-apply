import assert from "node:assert/strict";
import test from "node:test";
import {
  candidateProfileSchema,
  jobAnalysisDraftSchema,
} from "../packages/shared/src/schemas.ts";
import { buildApplicationKitRequest } from "../apps/web/lib/application-kit-request.ts";

function job(overrides = {}) {
  return {
    id: "job-1",
    analysisHistory: [],
    analysisState: "Analysed",
    capturedAt: "2026-09-10T00:00:00.000Z",
    description: "Backend engineer role in Dublin.",
    employer: { state: "extracted", value: "Example Payments" },
    facts: {
      contract: { state: "extracted", value: "permanent" },
      country: { state: "extracted", value: "Ireland" },
      education: { state: "missing", value: "" },
      employmentType: { state: "extracted", value: "permanent" },
      experience: { state: "missing", value: "" },
      language: { state: "missing", value: "" },
      location: { state: "extracted", value: "Dublin, Ireland" },
      salary: { state: "extracted", value: "€75,000 - €90,000" },
      skills: { state: "extracted", value: "TypeScript, Node.js" },
      sponsorship: { state: "missing", value: "" },
      workArrangement: { state: "extracted", value: "Hybrid" },
      workAuthorisation: { state: "missing", value: "" },
    },
    lane: "",
    source: "Pasted vacancy",
    sourceUrl: "https://example.test/jobs/backend",
    title: { state: "extracted", value: "Backend Engineer" },
    updatedAt: "2026-09-10T00:00:00.000Z",
    ...overrides,
  };
}

const baseMobilityProfile = {
  schemaVersion: 1,
  currentCountry: "Germany",
  targetCountries: ["Ireland"],
  applicantPosition: "eu-eea-swiss-citizen",
  sponsorshipRequired: "no",
  relocationPreference: "yes",
};

test("buildApplicationKitRequest produces a request that validates against the real /api/ai/content schemas", () => {
  const request = buildApplicationKitRequest({
    job: job(),
    profile: {
      full_name: "Taylor User",
      email: "taylor@example.com",
      phone: "+44 7700 900000",
      linkedin_url: "https://www.linkedin.com/in/taylor-user",
      github_url: null,
      portfolio_url: null,
      country_current: "Germany",
      countries_target: ["Ireland", "Netherlands"],
      target_roles: "Backend Engineer",
      work_authorisation_category: "eu_eea_swiss_citizen",
      work_right_details: "EU citizen, no sponsorship required.",
      base_cv_text: "Backend engineer with TypeScript and Node.js experience.",
      experience_highlights: "Delivered payment APIs at scale.",
      project_summaries: "Led migration to PostgreSQL.",
    },
    mobilityProfile: baseMobilityProfile,
  });

  assert.doesNotThrow(() => candidateProfileSchema.parse(request.profile));
  assert.doesNotThrow(() => jobAnalysisDraftSchema.parse(request.job));
  assert.equal(request.reusableAnswers, null);

  assert.equal(request.profile.fullName, "Taylor User");
  assert.equal(request.profile.targetCountries, "Ireland, Netherlands");
  assert.equal(request.profile.sponsorshipNeeded, false);
  assert.equal(request.profile.relocationWillingness, "yes");
  assert.equal(request.job.jobTitle, "Backend Engineer");
  assert.equal(request.job.company, "Example Payments");
  assert.equal(request.job.workMode, "hybrid");
  assert.equal(request.job.jobDescription, job().description);
});

test("buildApplicationKitRequest never invents data - missing profile fields become honest empty strings, not fabricated values", () => {
  const request = buildApplicationKitRequest({
    job: job(),
    profile: {},
    mobilityProfile: baseMobilityProfile,
  });

  assert.doesNotThrow(() => candidateProfileSchema.parse(request.profile));
  assert.equal(request.profile.fullName, "");
  assert.equal(request.profile.email, "");
  assert.equal(request.profile.baseCvText, "");
  assert.equal(request.profile.targetCountries, "");
  assert.equal(request.profile.sponsorshipNeeded, false);
});

test("buildApplicationKitRequest derives sponsorshipNeeded only from an explicit sponsorship_required category", () => {
  const sponsored = buildApplicationKitRequest({
    job: job(),
    profile: { work_authorisation_category: "sponsorship_required" },
    mobilityProfile: baseMobilityProfile,
  });
  assert.equal(sponsored.profile.sponsorshipNeeded, true);

  const unsure = buildApplicationKitRequest({
    job: job(),
    profile: { work_authorisation_category: "unsure" },
    mobilityProfile: baseMobilityProfile,
  });
  assert.equal(unsure.profile.sponsorshipNeeded, false);
});

test("buildApplicationKitRequest maps work arrangement text to the schema's closed workMode enum", () => {
  const cases = [
    ["Hybrid", "hybrid"],
    ["Remote", "remote"],
    ["Fully remote (EU timezone)", "remote"],
    ["On-site only", "onsite"],
    ["", "unknown"],
    ["Flexible", "unknown"],
  ];
  for (const [input, expected] of cases) {
    const request = buildApplicationKitRequest({
      job: job({
        facts: {
          ...job().facts,
          workArrangement: { state: "extracted", value: input },
        },
      }),
      profile: {},
      mobilityProfile: baseMobilityProfile,
    });
    assert.equal(request.job.workMode, expected, `input: "${input}"`);
  }
});

test("buildApplicationKitRequest falls back to country when the vacancy has no distinct location text", () => {
  const request = buildApplicationKitRequest({
    job: job({
      facts: {
        ...job().facts,
        location: { state: "missing", value: "" },
      },
    }),
    profile: {},
    mobilityProfile: baseMobilityProfile,
  });
  assert.equal(request.job.location, "Ireland");
});

test("buildApplicationKitRequest formats a preferred salary as a real, honest figure, never inventing a number", () => {
  const withSalary = buildApplicationKitRequest({
    job: job(),
    profile: {},
    mobilityProfile: {
      ...baseMobilityProfile,
      preferredSalary: { amount: 80000, currency: "EUR", period: "year" },
    },
  });
  assert.equal(withSalary.profile.salaryExpectation, "80000 EUR/year");

  const withoutSalary = buildApplicationKitRequest({
    job: job(),
    profile: {},
    mobilityProfile: baseMobilityProfile,
  });
  assert.equal(withoutSalary.profile.salaryExpectation, "");
});
