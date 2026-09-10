// Acceptance gate 19 (docs/reports/acceptance-gate-audit-2026-09-10.md):
// "one continuous E2E journey from vacancy capture through approved kit to
// outcome status." Every other spec in this suite exercises one phase in
// isolation, usually by seeding localStorage with an already-decided
// fixture (see e.g. 26-phase-3-applications.spec.ts's `job()`/`application()`
// helpers, which hand-craft `analysisHistory[0].decision` directly). That
// proves each screen renders correctly, but never proves the screens are
// actually the same job/application/interview threaded through by real ID,
// or that a real click-through from one phase reaches the next.
//
// This spec starts from nothing but a candidate's CV evidence and walks the
// live UI, and only the live UI, through every phase: paste a vacancy ->
// real analyseJob() decision -> prepare an application -> clear both
// readiness checks -> mark applied -> add an interview (auto-links via
// applicationId) -> mark it completed -> record an "offer" outcome. The
// final assertion reads the tracked application back out of localStorage
// and checks its status is "Offer" - proving the interview outcome step
// actually reached back and changed the *application's* status, which is
// gate 19's literal "outcome status", not just the interview's own record.
import { expect, test, type Page } from "@playwright/test";
import { expectNoSeriousViolations } from "./helpers/axe";

const userId = "00000000-0000-4000-8000-000000000001";

// Deliberately the same shape phase-3b-workflow.test.mjs's own
// strongVacancy/strongEvidence pair uses (proven there to reach "Apply" via
// analyseJob directly) - every material fact present (title, employer,
// country, salary, sponsorship wording) and three well-evidenced
// requirements, so a real click-through reaches "Apply" without needing to
// fabricate a stronger fixture than a real user's vacancy paste would be.
const vacancy = `Job title: Backend Engineer
Company: Example Payments
Location: Dublin, Ireland
Hybrid permanent role. Salary €75,000 - €90,000.
You must have strong TypeScript and Node.js experience.
Essential experience building PostgreSQL services and secure APIs.
Required knowledge of cloud delivery and automated testing.
We provide visa sponsorship for suitable candidates.`;
const cvEvidence =
  "Backend engineer using TypeScript, Node.js, PostgreSQL, secure APIs, cloud delivery and automated testing for payment services.";

async function disableDevelopmentToolbar(page: Page) {
  const response = await page.request.post(
    "http://127.0.0.1:3000/__nextjs_devtools_config",
    { data: { disableDevIndicator: true } },
  );
  expect(response.ok()).toBe(true);
}

// Seeds only candidate CV evidence (the one thing a returning user already
// has confirmed before ever touching the Jobs page) - no job, application,
// or interview state. Everything from vacancy capture onward is produced by
// real clicks against the live UI, not pre-seeded.
//
// This journey crosses several full-navigation route boundaries
// (window.location.assign, not router.push - jobs -> application detail,
// application detail -> interviews). page.addInitScript's callback reruns
// before *every* navigation for the life of the page, not just the first -
// so without the sessionStorage guard below, this would silently re-seed
// (and, worse, re-run the removeItem calls) on each of those reloads,
// wiping out the job/application/interview state the previous step just
// created. Same guard pattern as 26-phase-3-applications.spec.ts's seed().
async function seedCvEvidence(page: Page) {
  await page.addInitScript(
    ({ userId, cvEvidence }) => {
      if (sessionStorage.getItem("continuous-journey-seeded")) return;
      localStorage.setItem(
        `autotime-v2-companion-dashboard:${userId}`,
        JSON.stringify({
          profile: {
            baseCvText: cvEvidence,
            sponsorshipNeeded: true,
          },
        }),
      );
      localStorage.removeItem(`autotime-phase-3b-workflow-v1:${userId}`);
      localStorage.removeItem(`autotime-phase-3c-interviews-v1:${userId}`);
      localStorage.setItem("autotime-analytics-consent", "denied");
      sessionStorage.setItem("continuous-journey-seeded", "true");
    },
    { userId, cvEvidence },
  );
}

function readWorkflowState(page: Page) {
  return page.evaluate(
    ({ userId }) =>
      JSON.parse(
        localStorage.getItem(`autotime-phase-3b-workflow-v1:${userId}`) ||
          "null",
      ),
    { userId },
  );
}

test("vacancy capture through analysis, application, interview and outcome status is one connected journey", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await disableDevelopmentToolbar(page);
  await seedCvEvidence(page);

  // 1. Capture: paste a real vacancy through the live Jobs UI.
  await page.goto("/dashboard/jobs");
  await page.getByRole("button", { name: "Add a job" }).first().click();
  await page.getByLabel("Job description").fill(vacancy);
  await page.getByRole("button", { name: "Save job" }).click();
  await expect(
    page.getByRole("heading", { name: "Backend Engineer" }),
  ).toBeVisible();

  // 2. Decision: the real analyseJob() engine, run from the UI, not a
  // pre-seeded decision.
  await Promise.all([
    page.waitForURL(/\/dashboard\/jobs\//, { timeout: 30_000 }),
    page.getByRole("button", { name: "Review and analyse" }).click(),
  ]);
  await page.getByRole("button", { name: "Analyse job" }).click();
  await expect(page.getByText("Apply", { exact: true })).toBeVisible();
  const afterAnalysis = await readWorkflowState(page);
  expect(afterAnalysis.jobs).toHaveLength(1);
  const jobId: string = afterAnalysis.jobs[0].id;
  expect(afterAnalysis.jobs[0].analysisHistory.at(-1).decision).toBe("Apply");

  // 3. Approved kit / preparation: move to the Application tab and prepare
  // an application from the Apply decision - this is gate 19's "approved
  // kit" step for the live workspace (JobApplicationWorkspace has no
  // AI-generated kit content yet - see docs/reference/technical-debt.md's
  // "two independent live decision engines" entry - so "approved" here
  // means the human evidence/claims review this workspace actually
  // enforces via getApplicationReadiness, exercised below).
  await page.getByRole("tab", { name: "Application" }).click();
  await Promise.all([
    page.waitForURL(/\/dashboard\/applications\//, { timeout: 30_000 }),
    page
      .getByRole("button", { name: "Prepare application" })
      .first()
      .click(),
  ]);
  const afterPrepare = await readWorkflowState(page);
  expect(afterPrepare.applications).toHaveLength(1);
  const applicationId: string = afterPrepare.applications[0].id;
  expect(afterPrepare.applications[0].jobId).toBe(jobId);
  expect(page.url()).toContain(`/dashboard/applications/${applicationId}`);

  await expectNoSeriousViolations(page, {
    include: "main.phase-three-application-detail",
  });

  // 4. Readiness: the two consequential checks getApplicationReadiness
  // actually gates on (see job-application-workflow.ts's
  // getApplicationReadiness - the 8-item checklist is not part of this
  // gate, only these two plus employer/title, already satisfied by
  // extraction, and an empty unsupportedClaims list).
  await page.getByRole("button", { name: "Start final review" }).click();
  await page
    .getByRole("checkbox", {
      name: "I confirmed the selected evidence supports the application.",
    })
    .check();
  await page
    .getByRole("checkbox", {
      name: "I reviewed every consequential answer directly.",
    })
    .check();
  await expect(page.getByRole("button", { name: "Mark ready" })).toBeEnabled();
  await page.getByRole("button", { name: "Mark ready" }).click();

  // 5. Applied.
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Mark as applied" }).click();
  await expect(
    page.getByRole("heading", { name: "Submission record" }),
  ).toBeVisible();
  const afterApplied = await readWorkflowState(page);
  expect(afterApplied.applications[0].status).toBe("Applied");

  // 6. Interview: "Add interview" carries applicationId across, and
  // creating it hands the browser straight to the new interview's own
  // detail page - the same continuity check as steps 2-3, one route deeper.
  await Promise.all([
    page.waitForURL(/\/dashboard\/interviews\?applicationId=/),
    page.getByRole("link", { name: "Add interview" }).click(),
  ]);
  await expect(
    page.getByRole("heading", { name: "Add interview" }),
  ).toBeVisible();
  await Promise.all([
    page.waitForURL(/\/dashboard\/interviews\/(?!$)[^/?]+$/, {
      timeout: 30_000,
    }),
    page
      .getByRole("button", { name: "Create preparation record" })
      .click(),
  ]);
  const afterInterviewCreated = await readWorkflowState(page);
  expect(afterInterviewCreated.applications[0].status).toBe("Interview");
  const interviewId = page.url().split("/").pop();
  expect(interviewId).toBeTruthy();

  // 7. Completed, then the Outcome tab records a terminal outcome.
  await page.getByRole("button", { name: "Mark completed" }).click();
  await page.getByRole("tab", { name: "Outcome" }).click();
  await page.getByRole("combobox", { name: "Outcome" }).selectOption("offer");
  await page.getByRole("button", { name: "Save outcome" }).click();
  await expect(page.getByText("Interview outcome recorded.")).toBeVisible();

  // 8. Outcome status: the terminal assertion. An interview outcome of
  // "offer" must have reached back through applyInterviewOutcome and
  // changed the *application's* status to "Offer" - the actual
  // "through ... to outcome status" gate 19 asks for, not merely a
  // same-page confirmation message.
  const final = await readWorkflowState(page);
  const finalApplication = final.applications.find(
    (item: { id: string }) => item.id === applicationId,
  );
  expect(finalApplication.status).toBe("Offer");
  const interviews = await page.evaluate(
    ({ userId }) =>
      JSON.parse(
        localStorage.getItem(`autotime-phase-3c-interviews-v1:${userId}`) ||
          "null",
      ),
    { userId },
  );
  expect(interviews.interviews).toHaveLength(1);
  expect(interviews.interviews[0].id).toBe(interviewId);
  expect(interviews.interviews[0].applicationId).toBe(applicationId);
  expect(interviews.interviews[0].outcome).toBe("offer");
});
