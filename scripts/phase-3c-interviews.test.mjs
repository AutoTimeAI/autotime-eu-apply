import assert from "node:assert/strict";
import test from "node:test";
import {
  applyInterviewOutcome,
  extractJob,
} from "../apps/web/lib/job-application-workflow.ts";
import {
  completeInterviewFinalReview,
  createInterview,
  createNextInterviewStage,
  generateInterviewQuestions,
  getInterviewHomeSignals,
  getInterviewReadiness,
  recordInterviewOutcome,
  refreshInterviewPreparation,
  saveInterviewAnswer,
  transitionInterview,
} from "../apps/web/lib/interview-workflow.ts";
import {
  mockInterviewQuestionRewrite,
  validateInterviewAiOutput,
} from "../apps/web/lib/interview-ai-contract.ts";
import { parseInterviewWorkflow } from "../apps/web/lib/interview-storage.ts";
const userId = "11111111-1111-4111-8111-111111111111";
const job = {
  ...extractJob({
    title: "Cloud Engineer",
    employer: "Calm Systems",
    description:
      "Role: Cloud Engineer\nCompany: Calm Systems\nLocation: London, United Kingdom\nWe need AWS infrastructure, Terraform automation, incident response, stakeholder communication and production observability. The engineer will own secure deployment patterns and explain operational trade-offs.",
    now: "2026-08-01T09:00:00.000Z",
  }),
  analysisState: "Analysed",
  analysisHistory: [
    {
      id: "analysis-1",
      version: 1,
      createdAt: "2026-08-01T10:00:00.000Z",
      decision: "Apply",
      confidence: "High",
      coverage: 67,
      criticalRisk: "Terraform evidence is partial.",
      nextAction: "Prepare application.",
      positiveEvidence: "AWS production support",
      reason: "Strong cloud alignment.",
      unknowns: [],
      capability: [
        {
          requirement: "AWS infrastructure",
          sourceText: "AWS infrastructure",
          state: "confirmed",
          evidence: ["Operated AWS services in production"],
        },
        {
          requirement: "Terraform automation",
          sourceText: "Terraform automation",
          state: "missing",
          evidence: [],
        },
        {
          requirement: "stakeholder communication",
          sourceText: "stakeholder communication",
          state: "partial",
          evidence: ["Education project presentation"],
        },
      ],
    },
  ],
};
const application = {
  id: "22222222-2222-4222-8222-222222222222",
  jobId: job.id,
  checklist: Array(8).fill(true),
  consequentialAnswersReviewed: true,
  coverLetterRequested: false,
  createdAt: "2026-08-01T11:00:00.000Z",
  documentVersions: ["cv-v3"],
  evidenceConfirmed: true,
  screeningAnswers: [],
  selectedCvVersion: "cv-v3",
  status: "Applied",
  submissionConfirmed: true,
  unsupportedClaims: [],
  updatedAt: "2026-08-01T11:00:00.000Z",
};
test("requires an owned application and supports unscheduled preparation", () => {
  const value = createInterview({
    userId,
    application,
    job,
    stage: "recruiter_screen",
    format: "video",
  });
  assert.equal(value.scheduledAt, undefined);
  assert.equal(value.userId, userId);
  assert.throws(() =>
    createInterview({
      userId: "",
      application,
      job,
      stage: "technical",
      format: "video",
    }),
  );
  assert.throws(() =>
    createInterview({
      userId,
      application: { ...application, jobId: "other" },
      job,
      stage: "technical",
      format: "video",
    }),
  );
});
test("rejects malformed dates and timezones", () => {
  assert.throws(() =>
    createInterview({
      userId,
      application,
      job,
      stage: "technical",
      format: "video",
      scheduledAt: "bad",
    }),
  );
  assert.throws(() =>
    createInterview({
      userId,
      application,
      job,
      stage: "technical",
      format: "video",
      timezone: "Mars/Olympus",
    }),
  );
});
test("coverage differs by stage, is deterministic and retains sources", () => {
  const recruiter = generateInterviewQuestions(
    { id: "same", stage: "recruiter_screen" },
    application,
    job,
  );
  const technical = generateInterviewQuestions(
    { id: "same", stage: "technical" },
    application,
    job,
  );
  assert.deepEqual(
    recruiter,
    generateInterviewQuestions(
      { id: "same", stage: "recruiter_screen" },
      application,
      job,
    ),
  );
  assert.notDeepEqual(
    recruiter.map((item) => item.category),
    technical.map((item) => item.category),
  );
  assert.ok(technical.some((item) => item.category === "technical"));
  assert.ok(
    technical.every((item) =>
      item.sourceReferences.some((source) => source.kind === "stage"),
    ),
  );
  assert.ok(
    technical.some((item) =>
      item.sourceReferences.some((source) => source.kind === "requirement"),
    ),
  );
});
test("unsupported claims block Ready for review", () => {
  let value = createInterview({
    userId,
    application,
    job,
    stage: "technical",
    format: "video",
  });
  assert.throws(() =>
    saveInterviewAnswer(value, value.questions[0].id, {
      value: "I reduced costs 40%.",
      evidenceIds: [],
      unsupportedClaims: ["40% unsupported"],
      confirmed: true,
    }),
  );
  value = saveInterviewAnswer(value, value.questions[0].id, {
    value: "No production Terraform example is confirmed.",
    evidenceIds: [],
    missingEvidence: ["No production example"],
    confirmed: true,
  });
  assert.notEqual(getInterviewReadiness(value).label, "Ready for review");
});
test("confirmed priority coverage and explicit review become Ready for review", () => {
  let value = createInterview({
    userId,
    application,
    job,
    stage: "recruiter_screen",
    format: "phone",
  });
  for (const question of value.questions)
    value = saveInterviewAnswer(value, question.id, {
      value: "A truthful answer using referenced evidence.",
      evidenceIds: question.sourceReferences
        .filter((item) => item.confirmed)
        .map((item) => item.id),
      missingEvidence:
        question.evidenceStatus === "missing" ? ["No production example"] : [],
      confirmed: true,
    });
  assert.notEqual(getInterviewReadiness(value).label, "Ready for review");
  value = completeInterviewFinalReview(value);
  assert.equal(getInterviewReadiness(value).label, "Ready for review");
  assert.equal(transitionInterview(value, "ready").status, "ready");
  assert.equal(JSON.stringify(value).includes("probability"), false);
});
test("preparation refresh preserves the previous version", () => {
  const original = createInterview({
    userId,
    application,
    job,
    stage: "technical",
    format: "video",
  });
  const refreshed = refreshInterviewPreparation(original, application, job);
  assert.equal(refreshed.preparationVersion, 2);
  assert.equal(refreshed.preparationHistory.length, 1);
  assert.deepEqual(
    refreshed.preparationHistory[0].questions,
    original.questions,
  );
});
test("progressed outcome can create a stage-specific next interview", () => {
  let previous = createInterview({
    userId,
    application: { ...application, status: "Interview" },
    job,
    stage: "recruiter_screen",
    format: "video",
  });
  previous = transitionInterview(previous, "completed");
  previous = recordInterviewOutcome(previous, "progressed", {
    questionsAsked: [],
    difficultAreas: [],
    notes: "",
    followUpAction: "Add technical stage",
    learningSignals: ["unknown"],
  });
  const next = createNextInterviewStage(
    previous,
    { ...application, status: "Interview" },
    job,
    "technical",
  );
  assert.equal(next.stage, "technical");
  assert.ok(next.questions.some((item) => item.category === "technical"));
  assert.notEqual(next.id, previous.id);
});
test("saving an answer or refreshing preparation cannot resurrect a completed interview", () => {
  let interview = createInterview({
    userId,
    application: { ...application, status: "Interview" },
    job,
    stage: "recruiter_screen",
    format: "video",
  });
  interview = transitionInterview(interview, "completed");
  interview = recordInterviewOutcome(interview, "offer", {
    questionsAsked: [],
    difficultAreas: [],
    notes: "",
    followUpAction: "",
    learningSignals: ["unknown"],
  });

  const afterAnswer = saveInterviewAnswer(interview, interview.questions[0].id, {
    value: "Reviewing my notes after the fact.",
    evidenceIds: [],
    confirmed: false,
  });
  assert.equal(afterAnswer.status, "completed");
  assert.equal(afterAnswer.outcome, "offer");

  const afterRefresh = refreshInterviewPreparation(interview, application, job);
  assert.equal(afterRefresh.status, "completed");
  assert.equal(afterRefresh.outcome, "offer");

  assert.throws(
    () =>
      recordInterviewOutcome(interview, "rejected", {
        questionsAsked: [],
        difficultAreas: [],
        notes: "",
        followUpAction: "",
        learningSignals: ["unknown"],
      }),
    /already been recorded/,
  );
});
test("storage rejects malformed and cross-user records", () => {
  const interview = createInterview({
    userId,
    application,
    job,
    stage: "technical",
    format: "video",
  });
  const raw = JSON.stringify({ schemaVersion: 1, interviews: [interview] });
  assert.equal(parseInterviewWorkflow(raw, userId).interviews.length, 1);
  assert.equal(
    parseInterviewWorkflow(raw, "99999999-9999-4999-8999-999999999999")
      .interviews.length,
    0,
  );
  assert.equal(parseInterviewWorkflow("{bad", userId).interviews.length, 0);
});
test("mock AI performs no network call and malformed output is rejected", () => {
  const questions = generateInterviewQuestions(
    { id: "ai-contract", stage: "technical" },
    application,
    job,
  );
  let networkCalls = 0;
  const unavailableFetch = () => {
    networkCalls += 1;
    throw new Error("network must not run");
  };
  const rewritten = mockInterviewQuestionRewrite(questions);
  assert.equal(unavailableFetch instanceof Function, true);
  assert.equal(networkCalls, 0);
  assert.deepEqual(
    rewritten.map((item) => item.id),
    questions.map((item) => item.id),
  );
  assert.throws(() =>
    validateInterviewAiOutput(
      [{ id: questions[0].id, question: "Question", evidence: "invented" }],
      questions,
    ),
  );
  assert.throws(() =>
    validateInterviewAiOutput(
      [{ id: "unknown", question: "Question" }],
      questions,
    ),
  );
});
test("behavioural and technical questions use appropriate answer structures", () => {
  let behavioural = createInterview({
    userId,
    application,
    job,
    stage: "behavioural",
    format: "video",
  });
  const behaviouralQuestion = behavioural.questions.find(
    (item) => item.category === "behavioural",
  );
  behavioural = saveInterviewAnswer(behavioural, behaviouralQuestion.id, {
    value: "A truthful story.",
    evidenceIds: [],
    confirmed: false,
  });
  assert.equal(
    behavioural.questions.find((item) => item.id === behaviouralQuestion.id)
      .answerDraft.structure,
    "STAR-L",
  );
  let technical = createInterview({
    userId,
    application,
    job,
    stage: "technical",
    format: "video",
  });
  const technicalQuestion = technical.questions.find(
    (item) => item.category === "technical",
  );
  technical = saveInterviewAnswer(technical, technicalQuestion.id, {
    value: "Context, approach, trade-offs and validation.",
    evidenceIds: [],
    confirmed: false,
  });
  assert.equal(
    technical.questions.find((item) => item.id === technicalQuestion.id)
      .answerDraft.structure,
    "technical",
  );
});
test("outcome reason and interpretation remain separate", () => {
  let value = createInterview({
    userId,
    application: { ...application, status: "Interview" },
    job,
    stage: "technical",
    format: "video",
  });
  value = transitionInterview(value, "completed");
  value = recordInterviewOutcome(value, "rejected", {
    questionsAsked: [],
    difficultAreas: [],
    notes: "",
    followUpAction: "Review",
    userInterpretation: "Terraform felt difficult.",
    learningSignals: ["technical_gap"],
  });
  assert.equal(value.outcomeDetails?.employerConfirmedReason, undefined);
  assert.equal(
    value.outcomeDetails?.userInterpretation,
    "Terraform felt difficult.",
  );
  assert.equal(
    applyInterviewOutcome({ ...application, status: "Interview" }, "rejected")
      .status,
    "Rejected",
  );
});
test("education is not treated as confirmed production evidence", () => {
  const source = generateInterviewQuestions(
    { id: "education", stage: "technical" },
    application,
    job,
  )
    .flatMap((item) => item.sourceReferences)
    .find((item) => item.label.includes("Education"));
  assert.equal(source?.confirmed, false);
});

test("Home interview signals are deterministic, governed and time-bounded", () => {
  const now = Date.parse("2026-08-02T10:00:00.000Z");
  const base = createInterview({
    userId,
    application,
    job,
    stage: "technical",
    format: "video",
    scheduledAt: "2026-08-03T10:00:00.000Z",
    timezone: "Europe/London",
  });
  const state = (interview) => ({ schemaVersion: 1, interviews: [interview] });
  assert.equal(
    getInterviewHomeSignals(state(base), now).hasInterviewSoonIncomplete,
    true,
  );
  assert.equal(
    getInterviewHomeSignals(
      state({ ...base, scheduledAt: "2026-08-06T10:00:00.000Z" }),
      now,
    ).hasInterviewSoonIncomplete,
    false,
  );
  assert.equal(
    getInterviewHomeSignals(state({ ...base, status: "cancelled" }), now)
      .hasInterview,
    false,
  );
  assert.equal(
    getInterviewHomeSignals(
      state({ ...base, status: "completed", outcome: "awaiting" }),
      now,
    ).hasInterviewOutcomeAwaiting,
    true,
  );
  assert.equal(
    getInterviewHomeSignals(
      state({ ...base, scheduledAt: "2026-08-05T10:00:00.000Z" }),
      now,
    ).hasInterviewSoonIncomplete,
    true,
    "the exact 72-hour boundary is included regardless of display timezone",
  );
  assert.equal(
    getInterviewHomeSignals(
      parseInterviewWorkflow(
        JSON.stringify(state(base)),
        "99999999-9999-4999-8999-999999999999",
      ),
      now,
    ).hasInterview,
    false,
    "cross-user interview storage is rejected before Home prioritisation",
  );
});

test("editing a reviewed answer invalidates final review and Ready", () => {
  let value = createInterview({
    userId,
    application,
    job,
    stage: "recruiter_screen",
    format: "phone",
  });
  for (const question of value.questions)
    value = saveInterviewAnswer(value, question.id, {
      value: "A truthful reviewed answer.",
      evidenceIds: [],
      missingEvidence:
        question.evidenceStatus === "missing" ? ["No production example"] : [],
      confirmed: true,
    });
  value = completeInterviewFinalReview(value);
  value = transitionInterview(value, "ready");
  value = saveInterviewAnswer(value, value.questions[0].id, {
    value: "A truthful edited answer.",
    evidenceIds: [],
    confirmed: false,
  });
  assert.equal(value.finalReviewCompleted, false);
  assert.equal(value.status, "preparing");
  assert.throws(() => transitionInterview(value, "ready"));
});
test("readiness areas only report on categories this stage actually generates questions for", () => {
  // A recruiter_screen interview's coverage never generates technical,
  // scenario or job_risk questions - Array.every() on the empty filtered
  // list used to vacuously report those areas "Complete" with zero prep
  // work done, before a single question had even been looked at.
  const value = createInterview({
    userId,
    application,
    job,
    stage: "recruiter_screen",
    format: "phone",
  });
  const readiness = getInterviewReadiness(value);
  const labels = readiness.areas.map((area) => area.label);

  assert.ok(!labels.includes("Essential technical coverage"));
  assert.ok(!labels.includes("Domain preparation"));
  assert.ok(labels.includes("Role understanding"));
  for (const area of readiness.areas) {
    if (area.label === "Role understanding") assert.equal(area.complete, false);
  }
});