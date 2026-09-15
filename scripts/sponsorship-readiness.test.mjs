import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  SPONSORSHIP_RULESET_VERSION,
  assessSponsorshipReadiness,
} from "../packages/shared/src/international/sponsorship-readiness.ts";

const assess = (overrides = {}) => assessSponsorshipReadiness({
  roleTitle: "Business Systems Analyst",
  country: "Ireland",
  salary: "€55,000",
  rawText: "Permanent Business Systems Analyst. Salary €55,000.",
  ...overrides,
}, "2026-09-15T12:00:00.000Z");

describe("integrated Stamp4 sponsorship readiness", () => {
  it("preserves the Ireland target-lane contract and version provenance", () => {
    const result = assess();
    assert.equal(result.occupationCode, "SOC 2135");
    assert.equal(result.salaryThresholdEUR, 40_904);
    assert.equal(result.rulesetVersion, SPONSORSHIP_RULESET_VERSION);
    assert.equal(result.ruleClaims[0].claimId, "ie-csep-relevant-degree-salary-2026");
    assert.match(result.ruleClaims[0].sourceUrl, /^https:\/\/enterprise\.gov\.ie\//);
  });

  it("preserves UK salary conversion and blocker behavior", () => {
    const result = assess({ country: "United Kingdom", salary: "£38,000" });
    assert.equal(result.salaryThresholdEUR, Math.round(41_700 * 1.17));
    assert.match(result.blockers[0], /below/);
    assert.match(result.ruleClaims[0].transformation, /1\.17/);
  });

  it("preserves Netherlands and Germany thresholds", () => {
    const netherlands = assess({ country: "Netherlands", salary: "EUR 75,000" });
    assert.equal(netherlands.salaryThresholdEUR, 71_304);
    assert.equal(netherlands.ruleClaims[0].sourcePeriod, "month");
    assert.match(netherlands.ruleClaims[0].transformation, /multiplying.*by 12/);
    assert.equal(assess({ country: "Germany", salary: "€48,000" }).salaryThresholdEUR, 50_700);
  });

  it("blocks explicit no-sponsorship wording", () => {
    assert.ok(assess({ rawText: "Must have right to work without sponsorship." }).blockers.length > 0);
  });

  it("does not claim a salary pass when salary is missing", () => {
    const result = assess({ salary: null, rawText: "Permanent role with sponsorship support." });
    assert.equal(result.salaryDetectedEUR, null);
    assert.equal(result.blockers.length, 0);
  });

  it("extracts a salary conservatively from vacancy wording", () => {
    const result = assess({ salary: null, rawText: "Visa sponsorship available. Salary: €55,000 per year." });
    assert.equal(result.salaryDetectedEUR, 55_000);
    assert.equal(result.blockers.length, 0);
  });

  it("does not mistake dates, experience, or headcount for salary", () => {
    const result = assess({
      salary: null,
      rawText: "Start in 2026. Join a team of 50 and bring 5 years of experience.",
    });
    assert.equal(result.salaryDetectedEUR, null);
  });

  it("annualizes explicitly monthly Dutch salary", () => {
    const result = assess({
      country: "Netherlands",
      salary: null,
      rawText: "Compensation €6,000 per month excluding holiday allowance.",
    });
    assert.equal(result.salaryDetectedEUR, 72_000);
    assert.equal(result.blockers.length, 0);
  });

  it("treats an unlabelled UK salary range as GBP only when explicitly supplied", () => {
    const result = assess({ country: "United Kingdom", salary: "45,000 - 52,000", rawText: "" });
    assert.equal(result.salaryDetectedEUR, Math.round(45_000 * 1.17));
  });
});
