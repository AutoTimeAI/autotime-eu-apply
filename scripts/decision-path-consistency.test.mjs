import assert from "node:assert/strict";
import test from "node:test";
import { assessApplicationDecision } from "../apps/web/platform/application-preparation/decision-adapter.ts";
import {
  analyseJob,
  extractJob,
} from "../apps/web/lib/job-application-workflow.ts";

const evidence =
  "Backend engineer with six years of TypeScript, Node.js, PostgreSQL, secure API, cloud delivery, and automated testing experience.";

const vacancy = (sponsorshipText) => `Job title: Backend Engineer
Company: Example Payments
Location: Dublin, Ireland
Hybrid permanent role. Salary EUR 75,000 - EUR 90,000.
You must have strong TypeScript and Node.js experience.
Essential experience building PostgreSQL services and secure APIs.
Required knowledge of cloud delivery and automated testing.
English required. ${sponsorshipText}`;

const profile = {
  fullName: "Test Candidate",
  email: "candidate@example.test",
  phone: "",
  linkedInUrl: "",
  githubUrl: "",
  portfolioUrl: "",
  currentCountry: "India",
  currentCity: "Bengaluru",
  targetCountries: "Ireland",
  targetRoles: "Backend Engineer",
  workRightDetails: "Requires employer sponsorship in Ireland.",
  sponsorshipNeeded: true,
  relocationWillingness: "yes",
  salaryExpectation: "",
  noticePeriod: "",
  baseCvText: evidence,
  projectSummaries: "",
  experienceHighlights: "",
};

const applicationInput = (description) => ({
  profile,
  job: {
    jobTitle: "Backend Engineer",
    company: "Example Payments",
    jobUrl: "https://example.test/jobs/backend-engineer",
    location: "Ireland",
    workMode: "hybrid",
    jobDescription: description,
    notes: "",
  },
  reusableAnswers: null,
  context: {
    candidatePosition: "foreign-candidate",
    targetCountry: "Ireland",
  },
});

async function decisionsFor(description) {
  const job = extractJob({
    description,
    sourceUrl: "https://example.test/jobs/backend-engineer",
  });
  const workspace = analyseJob(job, evidence, {
    mobilityProfile: {
      schemaVersion: 1,
      applicantPosition: "sponsorship-required",
      currentCountry: "India",
      targetCountries: ["Ireland"],
      sponsorshipRequired: "yes",
      relocationPreference: "yes",
    },
    sponsorshipRequired: true,
  });
  const preparation = await assessApplicationDecision(
    applicationInput(description),
  );
  return { preparation, workspace };
}

for (const rejection of [
  "We cannot provide visa sponsorship for this vacancy.",
  "We are unable to sponsor this role.",
  "Applicants must have existing right to work in Ireland.",
  "This role is available without sponsorship.",
]) {
  test(`both live decision paths block explicit sponsorship rejection: ${rejection}`, async () => {
    const { preparation, workspace } = await decisionsFor(vacancy(rejection));

    assert.equal(workspace.decision, "Skip");
    assert.equal(preparation.decision, "Skip");
    assert.ok(workspace.criticalRisk.length > 0);
    assert.ok(preparation.blockers.length > 0);
  });
}

test("both live decision paths allow preparation when sponsorship is explicit and evidence is strong", async () => {
  const { preparation, workspace } = await decisionsFor(
    vacancy("We provide visa sponsorship for suitable candidates."),
  );

  assert.notEqual(workspace.decision, "Skip");
  assert.notEqual(workspace.decision, "Insufficient information");
  assert.notEqual(preparation.decision, "Skip");
  assert.notEqual(preparation.decision, "Insufficient evidence");
});
