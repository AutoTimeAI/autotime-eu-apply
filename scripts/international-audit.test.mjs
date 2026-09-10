import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import {
  assessInternationalJob,
  getInternationalCountryPack,
  mobilityProfileSchema,
} from "../packages/shared/src/international/index.ts";
import {
  getMobilityStorageKey,
  loadMobilityProfile,
  saveMobilityProfile,
} from "../apps/web/lib/international-mobility-storage.ts";

class MemoryStorage {
  values = new Map();
  getItem(key) {
    return this.values.get(key) ?? null;
  }
  setItem(key, value) {
    this.values.set(key, value);
  }
  removeItem(key) {
    this.values.delete(key);
  }
}

const sponsorshipProfile = mobilityProfileSchema.parse({
  currentCountry: "India",
  targetCountries: ["Ireland"],
  applicantPosition: "sponsorship-required",
  sponsorshipRequired: "yes",
  relocationPreference: "yes",
});

test("mobility storage never falls back to another user's key", () => {
  const storage = new MemoryStorage();
  saveMobilityProfile(storage, "user-a", {
    ...sponsorshipProfile,
    currentPermissionType: "User A private evidence",
  });

  const userB = loadMobilityProfile(storage, "user-b");
  assert.equal(userB.source, "empty");
  assert.equal(userB.profile.currentPermissionType, undefined);
  assert.notEqual(
    getMobilityStorageKey("user-a"),
    getMobilityStorageKey("user-b"),
  );
  assert.throws(
    () => loadMobilityProfile(storage, "  "),
    /authenticated user ID/,
  );
});

test("malformed legacy profiles are not migrated", () => {
  const storage = new MemoryStorage();
  storage.setItem(
    "autotime-v2-companion-dashboard:user-a",
    JSON.stringify({
      profile: { currentCountry: "India", sponsorshipNeeded: true },
    }),
  );
  assert.equal(loadMobilityProfile(storage, "user-a").source, "empty");
});

test("every unsupported country remains explorer-only", () => {
  for (const country of [
    "Belgium",
    "France",
    "Spain",
    "Austria",
    "Estonia",
    "Atlantis",
  ]) {
    const pack = getInternationalCountryPack(country);
    const result = assessInternationalJob({
      country,
      mobilityProfile: sponsorshipProfile,
      jobText: "Visa sponsorship and relocation support are available.",
      roleDuties: "Software engineering",
      salary: { amount: 100000, currency: "EUR", period: "year" },
    });
    assert.equal(pack.supportLevel, "explorer");
    assert.deepEqual(pack.pathways, []);
    assert.equal(result.supportLevel, "explorer");
    assert.equal(result.pathwayStatus, "not-supported");
    assert.notEqual(result.decision, "Apply");
  }
});

test("missing evidence is never promoted into evidence used", () => {
  const result = assessInternationalJob({
    country: "Ireland",
    mobilityProfile: sponsorshipProfile,
    jobText: "",
    roleDuties: "",
  });
  assert.ok(
    result.missingEvidence.includes("Salary with currency and pay period"),
  );
  assert.ok(
    result.missingEvidence.includes("Vacancy-level sponsorship confirmation"),
  );
  assert.equal(
    result.evidenceUsed.some((item) => /salary|sponsorship/i.test(item)),
    false,
  );
  assert.notEqual(result.pathwayStatus, "potentially-viable");
});

test("assessInternationalJob discloses that a supplied salary was never checked against the real threshold", () => {
  // Country packs deliberately never embed real salary thresholds (they
  // change and must be verified at the source - see e.g. germany.ts's own
  // limitations entry), and without a Stamp4 statutory check this function
  // has no way to compare a candidate's stated salary against the actual
  // current legal minimum. Before this test existed, a candidate stating a
  // salary of EUR 1,200/month for the Netherlands (real 2026 threshold:
  // EUR 5,942/month for age 30+, verified against ind.nl this session) got
  // "potentially-viable"/"Apply" with the low salary silently counted as
  // positive evidenceUsed and no disclosure anywhere that the actual
  // figure was never checked - the exact kind of quiet overconfidence this
  // engine's own design otherwise avoids.
  const result = assessInternationalJob({
    country: "Netherlands",
    mobilityProfile: sponsorshipProfile,
    jobText: "We provide visa sponsorship for suitable candidates.",
    roleDuties: "Junior support role",
    salary: { amount: 1200, currency: "EUR", period: "month" },
    contractDurationMonths: 12,
    occupationMapping: "confirmed",
    employerEvidence: {
      employerName: "Example BV",
      country: "Netherlands",
      sourceType: "official-register",
      status: "confirmed",
    },
  });
  assert.equal(result.decision, "Apply");
  assert.equal(result.stamp4Verified, false);
  assert.ok(
    result.cannotConfirm.some((item) =>
      /salary.*clears the current published minimum/i.test(item),
    ),
    "an unverified salary figure must be disclosed in cannotConfirm, not silently treated as clearing confirmation",
  );
});

test("a Stamp4-verified salary does not need the disclosure - the real threshold actually was checked", () => {
  const result = assessInternationalJob({
    country: "Netherlands",
    mobilityProfile: sponsorshipProfile,
    jobText: "We provide visa sponsorship for suitable candidates.",
    roleDuties: "Senior engineering role",
    salary: { amount: 90000, currency: "EUR", period: "year" },
    contractDurationMonths: 12,
    occupationMapping: "confirmed",
    employerEvidence: {
      employerName: "Example BV",
      country: "Netherlands",
      sourceType: "official-register",
      status: "confirmed",
    },
    stamp4Assessment: {
      status: "Eligible",
      pathway: "Netherlands Highly Skilled Migrant",
      occupationCode: "SOC 2135",
      occupationConfidence: "High",
      salaryDetectedEUR: 90000,
      salaryThresholdEUR: 71300,
      blockers: [],
      checkedAt: new Date().toISOString(),
    },
  });
  assert.equal(result.stamp4Verified, true);
  assert.equal(
    result.cannotConfirm.some((item) =>
      /salary.*clears the current published minimum/i.test(item),
    ),
    false,
  );
});

test("register presence is entity evidence and not vacancy sponsorship", () => {
  const confirmed = assessInternationalJob({
    country: "Netherlands",
    mobilityProfile: sponsorshipProfile,
    jobText: "International engineering team",
    roleDuties: "Build services",
    employerEvidence: {
      employerName: "Synthetic Employer BV",
      country: "Netherlands",
      sourceType: "official-register",
      status: "confirmed",
    },
  });
  assert.ok(
    confirmed.evidenceUsed.includes(
      "Employer appears on an official sponsor register.",
    ),
  );
  assert.ok(
    confirmed.missingEvidence.includes(
      "Vacancy-level sponsorship confirmation",
    ),
  );
  assert.ok(
    confirmed.assumptions.some((item) =>
      /does not prove sponsorship/.test(item),
    ),
  );

  const unconfirmed = assessInternationalJob({
    country: "Netherlands",
    mobilityProfile: sponsorshipProfile,
    jobText: "",
    roleDuties: "",
    employerEvidence: {
      employerName: "Synthetic Employer BV",
      country: "Netherlands",
      sourceType: "official-register",
      status: "unknown",
    },
  });
  assert.equal(
    unconfirmed.evidenceUsed.some((item) =>
      /official sponsor register/.test(item),
    ),
    false,
  );
});

test("official-source governance metadata is rendered by the UI", async () => {
  for (const country of ["Ireland", "Germany", "Netherlands", "Belgium"]) {
    for (const source of getInternationalCountryPack(country).sources) {
      assert.ok(source.publisher);
      assert.match(source.url, /^https:\/\//);
      assert.ok(source.jurisdiction);
      assert.match(source.reviewedAt, /^\d{4}-\d{2}-\d{2}$/);
      assert.ok(source.ruleVersion);
    }
  }
  const component = await readFile(
    new URL(
      "../apps/web/components/international/OfficialSourcesPanel.tsx",
      import.meta.url,
    ),
    "utf8",
  );
  for (const label of [
    "Jurisdiction",
    "Reviewed",
    "Rule version",
    "Open official source",
  ]) {
    assert.match(component, new RegExp(label));
  }
});

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const target = path.join(directory, entry.name);
      return entry.isDirectory() ? sourceFiles(target) : [target];
    }),
  );
  return nested.flat().filter((file) => /\.(ts|tsx)$/.test(file));
}

test("production international sources contain no personal fixtures or legal eligibility claims", async () => {
  const roots = [
    path.resolve("packages/shared/src/international"),
    path.resolve("apps/web/app/dashboard/international"),
    path.resolve("apps/web/components/InternationalModule.tsx"),
    path.resolve("apps/web/lib/international-mobility-storage.ts"),
  ];
  const files = [];
  for (const root of roots) {
    files.push(
      ...(/\.(ts|tsx)$/.test(root) ? [root] : await sourceFiles(root)),
    );
  }
  for (const file of files) {
    const content = await readFile(file, "utf8");
    assert.doesNotMatch(
      content,
      /RAJ_PROFILE|DataByRajesh|PayGuard IE|RegPulse|\bFIS\b/,
    );
    assert.doesNotMatch(
      content,
      /\b(visa|permit)\s+(eligible|eligibility guaranteed|approved)\b|\bguaranteed eligibility\b/i,
    );
  }
});
