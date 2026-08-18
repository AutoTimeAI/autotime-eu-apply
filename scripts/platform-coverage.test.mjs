import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { PLATFORM_COVERAGE, PLATFORM_NAMES, getCoveragePlatform, getPublicCoverageSummary, isCoverageStale } from "../packages/shared/src/platform-coverage.ts";
import { getJobCaptureMode, getJobPlatform, inferJobPageDetails } from "../apps/extension/lib/job-page.ts";
import { getCoverageRequesterHash, normalizeCoverageReportUrl } from "../apps/web/lib/coverage-report.ts";

const fixtures = JSON.parse(await readFile(new URL("../apps/extension/tests/fixtures/platform-coverage.json", import.meta.url), "utf8"));

test("registry contains every named platform exactly once", () => {
  assert.equal(PLATFORM_COVERAGE.length, 26);
  assert.deepEqual([...new Set(PLATFORM_COVERAGE.map((item) => item.platform))].sort(), [...PLATFORM_NAMES].sort());
  assert.equal(new Set(PLATFORM_COVERAGE.flatMap((item) => item.domains)).size, PLATFORM_COVERAGE.flatMap((item) => item.domains).length);
});

test("sanitized fixtures resolve to the registry and expected capture mode", () => {
  assert.equal(fixtures.length, 26);
  for (const [platform, url] of fixtures) {
    const entry = PLATFORM_COVERAGE.find((item) => item.platform === platform);
    assert.ok(entry, `missing registry entry for ${platform}`);
    assert.equal(getCoveragePlatform(url), platform);
    assert.equal(getJobPlatform(url), platform);
    assert.equal(getJobCaptureMode(url), entry.expectedCaptureMode);
  }
});

test("generic extraction preserves visible fixture facts without guessing", () => {
  for (const [platform, url] of fixtures.filter(([name]) => name !== "LinkedIn")) {
    const result = inferJobPageDetails({ url, heading: "Software Engineer", company: "Example Europe Ltd", location: "Paris, France", description: "Build reliable European software services." });
    assert.equal(result.platform, platform);
    assert.equal(result.roleTitle, "Software Engineer");
    assert.equal(result.company, "Example Europe Ltd");
    assert.equal(result.location, "Paris, France");
    assert.match(result.jobDescription, /reliable European software/);
  }
});

test("freshness and aggregate claims exclude stale records", () => {
  assert.equal(isCoverageStale("2026-08-01", new Date("2026-08-30T00:00:00Z")), false);
  assert.equal(isCoverageStale("2026-08-01", new Date("2026-09-01T00:00:01Z")), true);
  assert.deepEqual(getPublicCoverageSummary(new Date("2026-08-18T00:00:00Z")), { platforms: 26, currentPlatforms: 26, captureVerified: 5, nativeFeeds: 5 });
  assert.equal(getPublicCoverageSummary(new Date("2026-10-01T00:00:00Z")).currentPlatforms, 0);
});

test("autofill remains reviewed and cannot submit an external application", async () => {
  const source = await readFile(new URL("../apps/extension/lib/autofill.ts", import.meta.url), "utf8");
  assert.match(source, /value\.trim\(\) === ""/);
  assert.doesNotMatch(source, /\.submit\(|requestSubmit\(|click\(\)/);
});

test("public reports normalize URLs and reject private or credentialed targets", () => {
  assert.equal(normalizeCoverageReportUrl("HTTPS://Example.com/jobs/1?token=secret#apply"), "https://example.com/jobs/1");
  for (const value of ["http://localhost/job", "http://127.0.0.1/job", "http://192.168.1.2/job", "http://[::1]/job", "http://[fd00::1]/job", "https://user:pass@example.com/job", "ftp://example.com/job"]) {
    assert.throws(() => normalizeCoverageReportUrl(value));
  }
  assert.match(getCoverageRequesterHash("203.0.113.1", "secret"), /^[a-f0-9]{64}$/);
  assert.notEqual(getCoverageRequesterHash("203.0.113.1", "secret"), getCoverageRequesterHash("203.0.113.2", "secret"));
});
