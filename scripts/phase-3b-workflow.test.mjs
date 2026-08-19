import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  analyseJob,
  createApplication,
  duplicateJob,
  extractJob,
  getApplicationReadiness,
  getApplicationReviewQueue,
  isRestrictedJobUrl,
  transitionApplication,
} from "../apps/web/lib/job-application-workflow.ts";

const strongVacancy = `Job title: Backend Engineer
Company: Example Payments
Location: Dublin, Ireland
Hybrid permanent role. Salary €75,000 - €90,000.
You must have strong TypeScript and Node.js experience.
Essential experience building PostgreSQL services and secure APIs.
Required knowledge of cloud delivery and automated testing.
English required. We provide visa sponsorship for suitable candidates.`;

const strongEvidence =
  "Backend engineer using TypeScript, Node.js, PostgreSQL, secure APIs, cloud delivery and automated testing for payment services.";
const job = extractJob({
  description: strongVacancy,
  sourceUrl: "https://example.test/jobs/backend",
});
assert.equal(job.title.value, "Backend Engineer");
assert.equal(job.title.state, "extracted");
assert.equal(job.facts.salary.sourceText, "€75,000 - €90,000");
assert.equal(job.facts.country.value, "Ireland");
assert.equal(job.facts.education.state, "missing");
assert.throws(() => extractJob({ description: "short" }), /80/);
assert.throws(() => extractJob({ description: "x".repeat(50_001) }), /50,000/);
assert.equal(
  isRestrictedJobUrl("https://www.linkedin.com/jobs/view/123"),
  true,
);
assert.equal(isRestrictedJobUrl("https://jobs.example.test/123"), false);
assert.equal(duplicateJob([job], job)?.id, job.id);

const apply = analyseJob(job, strongEvidence, { sponsorshipRequired: true });
assert.equal(apply.decision, "Apply");
assert.ok(apply.capability.every((item) => item.sourceText.length > 0));
assert.ok(apply.capability.some((item) => item.state === "confirmed"));

const identical = analyseJob(job, strongEvidence, {
  sponsorshipRequired: true,
});
assert.deepEqual(
  {
    capability: identical.capability,
    coverage: identical.coverage,
    decision: identical.decision,
    reason: identical.reason,
    unknowns: identical.unknowns,
  },
  {
    capability: apply.capability,
    coverage: apply.coverage,
    decision: apply.decision,
    reason: apply.reason,
    unknowns: apply.unknowns,
  },
);

const silentSponsorship = extractJob({
  description: strongVacancy.replace(
    "We provide visa sponsorship for suitable candidates.",
    "Applications close on 30 September.",
  ),
});
const silentResult = analyseJob(silentSponsorship, strongEvidence, {
  sponsorshipRequired: true,
});
assert.notEqual(silentResult.decision, "Skip");
assert.ok(
  silentResult.unknowns.includes("Vacancy-specific sponsorship wording"),
);
assert.equal(silentSponsorship.facts.salary.state, "extracted");

const noSalary = extractJob({
  description: strongVacancy.replace(
    "Salary €75,000 - €90,000.",
    "Competitive compensation.",
  ),
});
assert.equal(noSalary.facts.salary.state, "missing");
assert.notEqual(
  analyseJob(noSalary, strongEvidence).criticalRisk,
  "Salary unsuitable",
);

const incompatible = extractJob({
  description: strongVacancy.replace(
    "We provide visa sponsorship for suitable candidates.",
    "We cannot provide visa sponsorship for this vacancy.",
  ),
});
assert.equal(
  analyseJob(incompatible, strongEvidence, { sponsorshipRequired: true })
    .decision,
  "Skip",
);
assert.equal(analyseJob(job, "", {}).decision, "Insufficient information");
assert.ok(analyseJob(job, "I used TypeScript once.", {}).decision !== "Apply");

let application = createApplication(job);
assert.equal(application.jobId, job.id);
assert.throws(() => createApplication({ ...job, id: "" }), /owned job/);
assert.equal(getApplicationReadiness(application, job).ready, false);
assert.throws(
  () => transitionApplication(application, "Ready", job),
  /blocker/,
);
application = {
  ...application,
  consequentialAnswersReviewed: true,
  evidenceConfirmed: true,
  status: "Needs review",
};
assert.equal(getApplicationReadiness(application, job).ready, true);
application = transitionApplication(application, "Ready", job);
assert.equal(getApplicationReviewQueue({ schemaVersion: 1, jobs: [{ ...job, analysisHistory: [apply] }], applications: [application] }).length, 1);
assert.equal(getApplicationReviewQueue({ schemaVersion: 1, jobs: [{ ...job, analysisHistory: [apply] }], applications: [{ ...application, unsupportedClaims: ["Invented claim"] }] }).length, 0);
assert.throws(
  () => transitionApplication(application, "Applied", job),
  /Confirm/,
);
application = transitionApplication(application, "Applied", job, true);
assert.ok(application.appliedAt);
assert.equal(application.submissionConfirmed, true);
assert.equal(application.coverLetterRequested, false);
assert.equal(application.documentVersions.length, 0);

const blocked = {
  ...createApplication(job),
  consequentialAnswersReviewed: true,
  evidenceConfirmed: true,
  status: "Needs review",
  unsupportedClaims: ["Invented revenue metric"],
};
assert.equal(getApplicationReadiness(blocked, job).ready, false);
assert.throws(() => transitionApplication(blocked, "Ready", job), /blocker/);

const [storage, component, extensionStorage, proofContract, readiness] =
  await Promise.all([
    readFile(
      new URL("../apps/web/lib/job-workflow-storage.ts", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL(
        "../apps/web/components/JobApplicationWorkspace.tsx",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(
      new URL("../apps/extension/lib/storage.ts", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../packages/shared/src/schemas.ts", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../apps/web/lib/capability-readiness.ts", import.meta.url),
      "utf8",
    ),
  ]);
assert.ok(storage.includes("`${baseKey}:${userId}`"));
assert.match(storage, /Authenticated user ID is required/);
assert.match(component, /This URL will be saved as metadata/);
assert.match(component, /I reviewed every consequential answer directly/);
assert.match(component, /window\.confirm/);
assert.doesNotMatch(component, /fetch\([^)]*linkedin|fetch\([^)]*indeed/i);
assert.match(extensionStorage, /saved-applications/);
assert.match(extensionStorage, /ApplicationSyncState/);
assert.match(proofContract, /evidenceRecordSchema/);
assert.doesNotMatch(readiness, /PROFILE_EXECUTION_THRESHOLD|90%/);

console.log("Phase 3B workflow safeguards: PASS");
