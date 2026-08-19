import assert from "node:assert/strict";
import test from "node:test";
import { reconcileJobWorkflow } from "../apps/web/lib/job-workflow-sync.ts";

const emptySourced = { state: "missing", value: "" };
const emptyFacts = {
  contract: emptySourced,
  country: emptySourced,
  education: emptySourced,
  employmentType: emptySourced,
  experience: emptySourced,
  language: emptySourced,
  location: emptySourced,
  salary: emptySourced,
  skills: emptySourced,
  sponsorship: emptySourced,
  workArrangement: emptySourced,
  workAuthorisation: emptySourced,
};

function job(id, updatedAt, overrides = {}) {
  return {
    analysisHistory: [],
    analysisState: "Not analysed",
    capturedAt: updatedAt,
    description: "",
    employer: emptySourced,
    facts: emptyFacts,
    id,
    lane: "",
    source: "Saved job",
    sourceUrl: `https://example.test/${id}`,
    title: { state: "extracted", value: `Job ${id}` },
    updatedAt,
    ...overrides,
  };
}

function application(id, jobId, updatedAt, overrides = {}) {
  return {
    checklist: [true, false, false, false, false, false, false, false],
    consequentialAnswersReviewed: false,
    coverLetterRequested: false,
    createdAt: updatedAt,
    documentVersions: [],
    evidenceConfirmed: false,
    id,
    jobId,
    screeningAnswers: [],
    selectedCvVersion: "Confirmed profile",
    status: "Preparing",
    submissionConfirmed: false,
    unsupportedClaims: [],
    updatedAt,
    ...overrides,
  };
}

test("job present only locally is kept and queued for upload with no expected version", () => {
  const result = reconcileJobWorkflow({
    localJobs: [job("job-1", "2026-01-01T00:00:00.000Z")],
    localApplications: [],
    server: null,
  });
  assert.equal(result.jobs.length, 1);
  assert.equal(result.jobs[0].id, "job-1");
  assert.deepEqual(
    result.jobsToUpload.map((item) => [item.job.id, item.expectedUpdatedAt]),
    [["job-1", null]],
  );
});

test("job present only on the server is adopted locally without being queued for upload", () => {
  const result = reconcileJobWorkflow({
    localJobs: [],
    localApplications: [],
    server: { jobs: [job("job-1", "2026-01-01T00:00:00.000Z")], applications: [] },
  });
  assert.equal(result.jobs.length, 1);
  assert.equal(result.jobs[0].id, "job-1");
  assert.equal(result.jobsToUpload.length, 0);
});

test("identical updatedAt on both sides is treated as already in sync", () => {
  const shared = "2026-01-01T00:00:00.000Z";
  const result = reconcileJobWorkflow({
    localJobs: [job("job-1", shared)],
    localApplications: [],
    server: { jobs: [job("job-1", shared)], applications: [] },
  });
  assert.equal(result.jobs.length, 1);
  assert.equal(result.jobsToUpload.length, 0);
});

test("newer local job wins and is queued for upload with the server's version as the CAS token", () => {
  const result = reconcileJobWorkflow({
    localJobs: [job("job-1", "2026-01-02T00:00:00.000Z", { lane: "local-edit" })],
    localApplications: [],
    server: {
      jobs: [job("job-1", "2026-01-01T00:00:00.000Z", { lane: "server-version" })],
      applications: [],
    },
  });
  assert.equal(result.jobs.length, 1);
  assert.equal(result.jobs[0].lane, "local-edit");
  assert.deepEqual(
    result.jobsToUpload.map((item) => [item.job.id, item.expectedUpdatedAt]),
    [["job-1", "2026-01-01T00:00:00.000Z"]],
  );
});

test("newer server job wins and local is not queued for upload", () => {
  const result = reconcileJobWorkflow({
    localJobs: [job("job-1", "2026-01-01T00:00:00.000Z", { lane: "local-stale" })],
    localApplications: [],
    server: {
      jobs: [job("job-1", "2026-01-02T00:00:00.000Z", { lane: "server-newer" })],
      applications: [],
    },
  });
  assert.equal(result.jobs.length, 1);
  assert.equal(result.jobs[0].lane, "server-newer");
  assert.equal(result.jobsToUpload.length, 0);
});

test("applications reconcile independently of jobs using the same rules", () => {
  const result = reconcileJobWorkflow({
    localJobs: [],
    localApplications: [
      application("app-1", "job-1", "2026-01-01T00:00:00.000Z"),
      application("app-2", "job-2", "2026-01-02T00:00:00.000Z", { status: "Applied" }),
    ],
    server: {
      jobs: [],
      applications: [
        application("app-2", "job-2", "2026-01-01T00:00:00.000Z", { status: "Preparing" }),
      ],
    },
  });
  const byId = Object.fromEntries(result.applications.map((item) => [item.id, item]));
  assert.equal(byId["app-1"].status, "Preparing");
  assert.equal(byId["app-2"].status, "Applied");
  assert.deepEqual(
    result.applicationsToUpload.map((item) => item.application.id),
    ["app-1", "app-2"],
  );
});

test("empty local and empty server reconcile to nothing", () => {
  const result = reconcileJobWorkflow({
    localJobs: [],
    localApplications: [],
    server: null,
  });
  assert.deepEqual(result, {
    jobs: [],
    applications: [],
    jobsToUpload: [],
    applicationsToUpload: [],
  });
});
