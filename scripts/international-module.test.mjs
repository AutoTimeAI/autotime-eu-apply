import assert from "node:assert/strict";
import test from "node:test";
import {
  assessInternationalJob,
  germanyCountryPack,
  irelandCountryPack,
  migrateCandidateProfileToMobilityProfile,
  mobilityProfileSchema,
  netherlandsCountryPack,
} from "../packages/shared/src/international/index.ts";

const baseProfile = mobilityProfileSchema.parse({
  currentCountry: "India",
  targetCountries: ["Ireland"],
  applicantPosition: "sponsorship-required",
  sponsorshipRequired: "yes",
  relocationPreference: "yes",
});

test("mobility profile requires salary currency and period", () => {
  assert.equal(
    mobilityProfileSchema.safeParse({
      ...baseProfile,
      minimumSalary: { amount: 50000 },
    }).success,
    false,
  );
  assert.equal(
    mobilityProfileSchema.safeParse({
      ...baseProfile,
      minimumSalary: { amount: 50000, currency: "eur", period: "year" },
    }).success,
    true,
  );
});

test("legacy profile migration preserves old evidence", () => {
  const migrated = migrateCandidateProfileToMobilityProfile({
    fullName: "Sample Applicant",
    email: "",
    phone: "",
    linkedInUrl: "",
    githubUrl: "",
    portfolioUrl: "",
    currentCountry: "India",
    currentCity: "",
    targetCountries: "Ireland, Germany",
    targetRoles: "Engineer",
    workRightDetails: "Permission status needs employer confirmation",
    sponsorshipNeeded: true,
    relocationWillingness: "depends",
    salaryExpectation: "Previously entered free text",
    noticePeriod: "30 days",
    baseCvText: "Synthetic CV",
    projectSummaries: "",
    experienceHighlights: "",
  });
  assert.deepEqual(migrated.targetCountries, ["Ireland", "Germany"]);
  assert.match(migrated.notes ?? "", /Previously entered free text/);
  assert.equal(
    migrated.currentPermissionType,
    "Permission status needs employer confirmation",
  );
});

test("Ireland incomplete evidence requires investigation", () => {
  const result = assessInternationalJob({
    country: "Ireland",
    mobilityProfile: baseProfile,
    jobText: "",
    roleDuties: "",
    occupationMapping: "uncertain",
  });
  assert.equal(result.decision, "Investigate first");
  assert.ok(
    result.missingEvidence.includes(
      "Occupation mapping from the role's actual duties",
    ),
  );
});

test("Germany requires qualification evidence", () => {
  const result = assessInternationalJob({
    country: "Germany",
    mobilityProfile: baseProfile,
    jobText: "Relocation support",
    roleDuties: "Software engineering",
    qualificationEvidence: "missing",
    occupationMapping: "confirmed",
  });
  assert.ok(
    result.missingEvidence.includes("Qualification or recognition evidence"),
  );
});

test("Netherlands separates register evidence from vacancy sponsorship", () => {
  const result = assessInternationalJob({
    country: "Netherlands",
    mobilityProfile: baseProfile,
    jobText: "International team",
    roleDuties: "Platform engineering",
    occupationMapping: "confirmed",
    employerEvidence: {
      employerName: "Example BV",
      country: "Netherlands",
      sourceType: "official-register",
      status: "confirmed",
    },
  });
  assert.ok(
    result.evidenceUsed.includes(
      "Employer appears on an official sponsor register.",
    ),
  );
  assert.ok(
    result.assumptions.some((item) => /does not prove sponsorship/.test(item)),
  );
});

test("unsupported European countries never receive pathway conclusions", () => {
  const result = assessInternationalJob({
    country: "Belgium",
    mobilityProfile: baseProfile,
    jobText: "Relocation available",
    roleDuties: "",
  });
  assert.equal(result.supportLevel, "explorer");
  assert.equal(result.pathwayStatus, "not-supported");
  assert.match(result.cannotConfirm.join(" "), /eligibility conclusion/);
});

test("negative sponsorship wording is a blocker when sponsorship is needed", () => {
  const result = assessInternationalJob({
    country: "Ireland",
    mobilityProfile: baseProfile,
    jobText: "We are unable to sponsor this vacancy",
    roleDuties: "Software engineering",
  });
  assert.equal(result.pathwayStatus, "confirmed-blocker");
  assert.equal(result.decision, "Skip");
});

test("local work-authorised applicants are not blocked by missing sponsorship wording", () => {
  const result = assessInternationalJob({
    country: "Ireland",
    mobilityProfile: {
      ...baseProfile,
      applicantPosition: "local-work-authorised",
      sponsorshipRequired: "no",
    },
    jobText: "Software engineering role",
    roleDuties: "Build services",
    salary: { amount: 60000, currency: "EUR", period: "year" },
    contractDurationMonths: 24,
    occupationMapping: "confirmed",
  });
  assert.equal(result.confirmedBlockers.length, 0);
  assert.equal(result.decision, "Apply");
});

test("official sources contain required governance metadata", () => {
  for (const pack of [
    irelandCountryPack,
    germanyCountryPack,
    netherlandsCountryPack,
  ]) {
    for (const source of pack.sources) {
      assert.ok(
        source.publisher &&
          source.url &&
          source.jurisdiction &&
          source.reviewedAt &&
          source.ruleVersion,
      );
    }
  }
});

test("production international code contains no personal Stamp4 fixtures", async () => {
  const files = [
    "../packages/shared/src/international/types.ts",
    "../packages/shared/src/international/assessment.ts",
    "../apps/web/components/InternationalModule.tsx",
  ];
  for (const file of files) {
    const text = await (
      await import("node:fs/promises")
    ).readFile(new URL(file, import.meta.url), "utf8");
    assert.doesNotMatch(text, /RAJ_PROFILE|PayGuard IE|RegPulse|FIS/);
    assert.doesNotMatch(text, /\bvisa eligible\b|\bguaranteed eligibility\b/i);
  }
});
