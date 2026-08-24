import assert from "node:assert/strict";
import test from "node:test";
import { reconcileInterviewWorkflow } from "../apps/web/lib/interview-workflow-sync.ts";

function interview(id, updatedAt, overrides = {}) {
  return {
    id,
    userId: "user-1",
    applicationId: "app-1",
    jobId: "job-1",
    stage: "recruiter_screen",
    format: "video",
    participants: [],
    status: "scheduled",
    outcome: "awaiting",
    questions: [],
    preparationVersion: 1,
    preparationHistory: [],
    finalReviewCompleted: false,
    createdAt: updatedAt,
    updatedAt,
    schemaVersion: "1",
    ...overrides,
  };
}

test("interview present only locally is kept and queued for upload with no expected version", () => {
  const result = reconcileInterviewWorkflow({
    localInterviews: [interview("iv-1", "2026-01-01T00:00:00.000Z")],
    server: null,
  });
  assert.equal(result.interviews.length, 1);
  assert.equal(result.interviews[0].id, "iv-1");
  assert.deepEqual(
    result.interviewsToUpload.map((item) => [item.interview.id, item.expectedUpdatedAt]),
    [["iv-1", null]],
  );
});

test("interview present only on the server is adopted locally without being queued for upload", () => {
  const result = reconcileInterviewWorkflow({
    localInterviews: [],
    server: { interviews: [interview("iv-1", "2026-01-01T00:00:00.000Z")] },
  });
  assert.equal(result.interviews.length, 1);
  assert.equal(result.interviews[0].id, "iv-1");
  assert.equal(result.interviewsToUpload.length, 0);
});

test("identical updatedAt on both sides is treated as already in sync", () => {
  const shared = "2026-01-01T00:00:00.000Z";
  const result = reconcileInterviewWorkflow({
    localInterviews: [interview("iv-1", shared)],
    server: { interviews: [interview("iv-1", shared)] },
  });
  assert.equal(result.interviews.length, 1);
  assert.equal(result.interviewsToUpload.length, 0);
});

test("newer local interview wins and is queued for upload with the server's version as the CAS token", () => {
  const result = reconcileInterviewWorkflow({
    localInterviews: [
      interview("iv-1", "2026-01-02T00:00:00.000Z", { status: "preparing" }),
    ],
    server: {
      interviews: [
        interview("iv-1", "2026-01-01T00:00:00.000Z", { status: "scheduled" }),
      ],
    },
  });
  assert.equal(result.interviews.length, 1);
  assert.equal(result.interviews[0].status, "preparing");
  assert.deepEqual(
    result.interviewsToUpload.map((item) => [item.interview.id, item.expectedUpdatedAt]),
    [["iv-1", "2026-01-01T00:00:00.000Z"]],
  );
});

test("newer server interview wins and local is not queued for upload", () => {
  const result = reconcileInterviewWorkflow({
    localInterviews: [
      interview("iv-1", "2026-01-01T00:00:00.000Z", { status: "scheduled" }),
    ],
    server: {
      interviews: [
        interview("iv-1", "2026-01-02T00:00:00.000Z", { status: "completed" }),
      ],
    },
  });
  assert.equal(result.interviews.length, 1);
  assert.equal(result.interviews[0].status, "completed");
  assert.equal(result.interviewsToUpload.length, 0);
});

test("multiple interviews reconcile independently using the same rules", () => {
  const result = reconcileInterviewWorkflow({
    localInterviews: [
      interview("iv-1", "2026-01-01T00:00:00.000Z"),
      interview("iv-2", "2026-01-02T00:00:00.000Z", { status: "preparing" }),
    ],
    server: {
      interviews: [
        interview("iv-2", "2026-01-01T00:00:00.000Z", { status: "scheduled" }),
      ],
    },
  });
  const byId = Object.fromEntries(result.interviews.map((item) => [item.id, item]));
  assert.equal(byId["iv-1"].status, "scheduled");
  assert.equal(byId["iv-2"].status, "preparing");
  assert.deepEqual(
    result.interviewsToUpload.map((item) => item.interview.id),
    ["iv-1", "iv-2"],
  );
});

test("empty local and empty server reconcile to nothing", () => {
  const result = reconcileInterviewWorkflow({ localInterviews: [], server: null });
  assert.deepEqual(result, { interviews: [], interviewsToUpload: [] });
});
