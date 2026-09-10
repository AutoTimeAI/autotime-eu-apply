import assert from "node:assert/strict";
import test from "node:test";
import {
  assessInternationalJob,
  germanyCountryPack,
  irelandCountryPack,
  isStamp4SponsorshipCovered,
  migrateCandidateProfileToMobilityProfile,
  mobilityProfileSchema,
  netherlandsCountryPack,
  ukCountryPack,
  vacancyRejectsSponsorship,
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

test("vacancyRejectsSponsorship catches real denial phrasing a plain substring list misses", () => {
  // Regression: sponsorshipRejectionSignals is a literal substring list
  // (e.g. "no sponsorship", "cannot provide visa sponsorship"), which does
  // NOT match real vacancy wording where the denial word and "sponsorship"
  // are separated by another word - "No visa sponsorship is available" has
  // no literal "no sponsorship" substring ("visa" sits in between), and "We
  // are unable to provide visa sponsorship" has no literal "unable to
  // sponsor" or "cannot provide visa sponsorship" substring either. Both
  // silently fell through to "Apply" for a sponsorship-required candidate
  // until vacancyRejectsSponsorship gained a permissive regex fallback
  // alongside the literal list (found via scripts/decision-quality-
  // evaluation.test.mjs's DQ-012/DQ-029 regressing to 30/32).
  assert.equal(
    vacancyRejectsSponsorship("No visa sponsorship is available."),
    true,
  );
  assert.equal(
    vacancyRejectsSponsorship("We are unable to provide visa sponsorship."),
    true,
  );
  assert.equal(
    vacancyRejectsSponsorship("We cannot offer sponsorship for this role."),
    true,
  );
  // Must not become over-broad: ordinary positive/neutral sponsorship
  // wording must not trip the same check.
  assert.equal(
    vacancyRejectsSponsorship("We provide visa sponsorship for suitable candidates."),
    false,
  );
  assert.equal(
    vacancyRejectsSponsorship("Sponsorship information is not stated."),
    false,
  );
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
    ukCountryPack,
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

test("UK is a full-support pack, not the explorer fallback", () => {
  const result = assessInternationalJob({
    country: "United Kingdom",
    mobilityProfile: baseProfile,
    jobText: "",
    roleDuties: "",
    occupationMapping: "uncertain",
  });
  assert.equal(result.supportLevel, "full");
  assert.equal(ukCountryPack.pathways[0], "Skilled Worker visa");
});

test("isStamp4SponsorshipCovered matches exactly the 4 countries Stamp4 has real threshold data for", () => {
  assert.equal(isStamp4SponsorshipCovered("uk"), true);
  assert.equal(isStamp4SponsorshipCovered("ireland"), true);
  assert.equal(isStamp4SponsorshipCovered("netherlands"), true);
  assert.equal(isStamp4SponsorshipCovered("germany"), true);
  assert.equal(isStamp4SponsorshipCovered("france"), false);
  assert.equal(isStamp4SponsorshipCovered("european-explorer"), false);
});

test("a clean Stamp4 assessment satisfies salary/occupation evidence without a manual confirmation", () => {
  const result = assessInternationalJob({
    country: "Ireland",
    mobilityProfile: baseProfile,
    jobText: "Systems analyst role",
    roleDuties: "Business systems analysis",
    occupationMapping: "not-checked",
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
  assert.equal(result.stamp4Verified, true);
  assert.ok(
    !result.missingEvidence.includes(
      "Occupation mapping from the role's actual duties",
    ),
  );
  assert.ok(
    !result.missingEvidence.includes("Salary with currency and pay period"),
  );
  assert.ok(
    result.evidenceUsed.some((item) => /Stamp4 verified.*clears the/.test(item)),
  );
});

test("a Stamp4 blocker (e.g. salary below the real threshold) becomes a confirmed blocker, same weight as any other", () => {
  const result = assessInternationalJob({
    country: "Netherlands",
    mobilityProfile: baseProfile,
    jobText: "Highly skilled migrant role",
    roleDuties: "Engineering",
    occupationMapping: "confirmed",
    salary: { amount: 60000, currency: "EUR", period: "year" },
    contractDurationMonths: 24,
    stamp4Assessment: {
      status: "Ineligible",
      pathway: "Netherlands Highly Skilled Migrant",
      occupationCode: "SOC 2135",
      occupationConfidence: "High",
      salaryDetectedEUR: 60000,
      salaryThresholdEUR: 71304,
      blockers: [
        "Detected salary €60,000 is below the default €71,304 pathway threshold.",
      ],
      checkedAt: new Date().toISOString(),
    },
  });
  assert.equal(result.pathwayStatus, "confirmed-blocker");
  assert.equal(result.decision, "Skip");
  assert.ok(
    result.confirmedBlockers.some((item) =>
      item.includes("Stamp4 legal-eligibility check"),
    ),
  );
});

test("no Stamp4 data (France/generic-EU, or an unreachable service) leaves the existing text-signal behaviour unchanged", () => {
  const result = assessInternationalJob({
    country: "Ireland",
    mobilityProfile: baseProfile,
    jobText: "",
    roleDuties: "",
    occupationMapping: "uncertain",
  });
  assert.equal(result.stamp4Verified, false);
  assert.ok(
    result.missingEvidence.includes(
      "Occupation mapping from the role's actual duties",
    ),
  );
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
