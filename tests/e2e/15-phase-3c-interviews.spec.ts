import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
const userId = "00000000-0000-4000-8000-000000000001";
const shots = "screenshots/phase-3c";
const jobId = "33333333-3333-4333-8333-333333333333";
const applicationId = "44444444-4444-4444-8444-444444444444";

async function seed(page: Page, withInterview = false, completed = false) {
  await page.addInitScript(
    ({ userId, jobId, applicationId, withInterview, completed }) => {
      if (sessionStorage.getItem("phase-3c-fixture-seeded")) return;
      const now = "2026-08-02T10:00:00.000Z";
      const requirement = {
        requirement: "Terraform automation",
        sourceText: "Terraform automation",
        state: "missing",
        evidence: [],
      };
      const job = {
        id: jobId,
        analysisHistory: [
          {
            id: "analysis-1",
            version: 1,
            createdAt: now,
            decision: "Apply",
            confidence: "High",
            coverage: 70,
            criticalRisk: "Terraform evidence missing",
            nextAction: "Prepare",
            positiveEvidence: "AWS",
            reason: "Cloud alignment",
            unknowns: [],
            capability: [requirement],
          },
        ],
        analysisState: "Analysed",
        applicationId,
        capturedAt: now,
        description:
          "Cloud Engineer role requiring AWS infrastructure, Terraform automation, incident response, stakeholder communication and production observability.",
        employer: {
          state: "user-confirmed",
          value: "Calm Systems",
          sourceText: "Calm Systems",
        },
        facts: {
          contract: { state: "missing", value: "" },
          country: {
            state: "user-confirmed",
            value: "United Kingdom",
            sourceText: "United Kingdom",
          },
          education: { state: "missing", value: "" },
          employmentType: { state: "missing", value: "" },
          experience: { state: "missing", value: "" },
          language: { state: "missing", value: "" },
          location: {
            state: "user-confirmed",
            value: "London",
            sourceText: "London",
          },
          salary: { state: "missing", value: "" },
          sponsorship: { state: "missing", value: "" },
          workArrangement: { state: "missing", value: "" },
          workAuthorisation: { state: "missing", value: "" },
        },
        lane: "Cloud",
        source: "Development fixture",
        sourceUrl: "https://example.test/cloud",
        title: {
          state: "user-confirmed",
          value: "Cloud Engineer",
          sourceText: "Cloud Engineer",
        },
        updatedAt: now,
      };
      const application = {
        id: applicationId,
        jobId,
        checklist: Array(8).fill(true),
        consequentialAnswersReviewed: true,
        coverLetterRequested: false,
        createdAt: now,
        documentVersions: ["cv-v3"],
        evidenceConfirmed: true,
        screeningAnswers: [],
        selectedCvVersion: "cv-v3",
        status: withInterview ? "Interview" : "Applied",
        submissionConfirmed: true,
        unsupportedClaims: [],
        updatedAt: now,
        appliedAt: now,
      };
      localStorage.setItem(
        "autotime-phase-3b-workflow-v1:" + userId,
        JSON.stringify({
          jobs: [job],
          applications: [application],
          schemaVersion: 1,
        }),
      );
      const interview = {
        id: "55555555-5555-4555-8555-555555555555",
        userId,
        applicationId,
        jobId,
        stage: "technical",
        format: "video",
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        timezone: "Europe/London",
        durationMinutes: 60,
        participants: [{ role: "Engineering manager" }],
        status: completed ? "completed" : "preparing",
        outcome: "awaiting",
        createdAt: now,
        updatedAt: now,
        schemaVersion: "1",
        questions: [
          {
            id: "iq-terraform",
            category: "technical",
            question:
              "How would you apply Terraform automation, and what production evidence can you truthfully provide?",
            reason:
              "Linked to Terraform automation; current evidence is missing.",
            sourceReferences: [
              {
                id: "stage-technical",
                kind: "stage",
                label: "technical",
                confirmed: true,
              },
              {
                id: "req-terraform",
                kind: "requirement",
                label: "Terraform automation",
                confirmed: true,
              },
            ],
            importance: "high",
            evidenceStatus: "missing",
            userConfidence: "not_started",
            schemaVersion: "1",
          },
          {
            id: "iq-employer",
            category: "employer_questions",
            question:
              "What would you ask about infrastructure ownership and onboarding?",
            reason: "Selected for the technical stage.",
            sourceReferences: [
              {
                id: "stage-technical",
                kind: "stage",
                label: "technical",
                confirmed: true,
              },
            ],
            importance: "medium",
            evidenceStatus: "not_required",
            userConfidence: "not_started",
            schemaVersion: "1",
          },
        ],
      };
      (
        window as typeof window & { __phase3InterviewFixture?: unknown }
      ).__phase3InterviewFixture = interview;
      localStorage.setItem(
        "autotime-phase-3c-interviews-v1:" + userId,
        JSON.stringify({
          interviews: withInterview ? [interview] : [],
          schemaVersion: 1,
        }),
      );
      localStorage.setItem("autotime-analytics-consent", "denied");
      sessionStorage.setItem("phase-3c-fixture-seeded", "true");
    },
    { userId, jobId, applicationId, withInterview, completed },
  );
}

test.beforeAll(async () => {
  await mkdir(shots, { recursive: true });
});
test("empty state and Applied application create a recruiter screen", async ({
  page,
}) => {
  await seed(page);
  await page.goto("/dashboard/interviews");
  await expect(
    page.getByRole("heading", { name: "No interviews recorded" }),
  ).toBeVisible();
  await page.screenshot({
    path: shots + "/interviews-empty-1440.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Add interview" }).first().click();
  const creationForm = page.locator("section").filter({
    has: page.getByRole("heading", { name: "Add interview" }),
  });
  await creationForm.getByLabel("Application").selectOption(applicationId);
  await creationForm.getByLabel("Stage").selectOption("recruiter_screen");
  await page.getByRole("button", { name: "Create preparation record" }).click();
  await expect(page).toHaveURL(/\/dashboard\/interviews\//);
  await page.goto("/dashboard/interviews");
  await expect(
    page.getByRole("heading", { name: "Cloud Engineer" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Open interview" }).click();
  await expect(
    page.getByRole("heading", { name: "Cloud Engineer" }),
  ).toBeVisible();
  await page.screenshot({
    path: shots + "/interview-overview-1440.png",
    fullPage: true,
  });
});
test("technical preparation exposes sources and blocks unsupported confirmation", async ({
  page,
}) => {
  await seed(page, true);
  await page.goto("/dashboard/interviews/55555555-5555-4555-8555-555555555555");
  await page.getByRole("tab", { name: "Preparation" }).click();
  await expect(page.getByText(/current evidence is missing/i)).toBeVisible();
  await page
    .getByRole("textbox", { name: "Your answer" })
    .first()
    .fill("I delivered a fictional 40% saving.");
  await page
    .getByRole("textbox", { name: "Unsupported claims" })
    .first()
    .fill("The 40% result is not confirmed.");
  await expect(
    page.getByRole("button", { name: "Confirm answer" }).first(),
  ).toBeDisabled();
  await page.screenshot({
    path: shots + "/unsupported-answer-warning-1440.png",
    fullPage: true,
  });
});
test("practice confidence remains separate from readiness", async ({
  page,
}) => {
  await seed(page, true);
  await page.goto("/dashboard/interviews/55555555-5555-4555-8555-555555555555");
  await page.getByRole("tab", { name: "Practice" }).click();
  await page.getByRole("radio", { name: "Low" }).check();
  await expect(
    page.getByText(/does not predict interview success/i),
  ).toBeVisible();
  await page.screenshot({
    path: shots + "/practice-mode-1440.png",
    fullPage: true,
  });
});
test("complete evidence review requires explicit final review before Ready", async ({
  page,
}) => {
  await seed(page, true);
  await page.goto("/dashboard/interviews/55555555-5555-4555-8555-555555555555");
  await page.getByRole("tab", { name: "Preparation" }).click();
  const firstQuestion = page
    .locator("details")
    .filter({ hasText: "How would you apply Terraform automation" });
  const firstSummary = firstQuestion.locator("summary");
  await expect(firstSummary).toHaveAttribute("aria-expanded", "true");
  await firstQuestion
    .getByRole("textbox", { name: "Your answer" })
    .fill(
      "I can explain the approach, but no production Terraform example is confirmed.",
    );
  await firstQuestion.getByRole("button", { name: "Confirm answer" }).click();

  const secondQuestion = page
    .locator("details")
    .filter({ hasText: "infrastructure ownership and onboarding" });
  const secondSummary = secondQuestion.locator("summary");
  await expect(secondSummary).toHaveAttribute("aria-expanded", "false");
  await secondSummary.focus();
  await secondSummary.press("Enter");
  await expect(secondSummary).toHaveAttribute("aria-expanded", "true");
  await expect(secondSummary).toBeFocused();
  await secondQuestion
    .getByRole("textbox", { name: "Your answer" })
    .fill("I would ask about infrastructure ownership and onboarding.");
  await secondQuestion.getByRole("button", { name: "Confirm answer" }).click();

  await page.getByRole("tab", { name: "Overview" }).click();
  await expect(
    page
      .getByRole("tabpanel", { name: "Overview" })
      .getByText("Good coverage", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Complete final review" }).click();
  await page.getByRole("button", { name: "Mark ready" }).click();
  await expect(page.getByRole("status")).toContainText("marked ready");

  await page.getByRole("tab", { name: "Preparation" }).click();
  await firstQuestion
    .getByRole("textbox", { name: "Your answer" })
    .fill("Edited after review: no production Terraform example is confirmed.");
  await firstQuestion.getByRole("button", { name: "Save draft" }).click();
  await page.getByRole("tab", { name: "Overview" }).click();
  await expect(
    page.getByRole("button", { name: "Complete final review" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Mark ready" })).toHaveCount(0);

  await page.getByRole("tab", { name: "Preparation" }).click();
  await firstQuestion.getByRole("button", { name: "Confirm answer" }).click();
  await page.getByRole("tab", { name: "Overview" }).click();
  await page.getByRole("button", { name: "Complete final review" }).click();
  await page.getByRole("button", { name: "Mark ready" }).click();
  await expect(page.getByRole("status")).toContainText("marked ready");
  await page.screenshot({
    path: shots + "/ready-after-final-review-1440.png",
    fullPage: true,
  });
});
test("progressed outcome continues into a preserved next stage", async ({
  page,
}) => {
  await seed(page, true, true);
  await page.goto("/dashboard/interviews/55555555-5555-4555-8555-555555555555");
  await page.getByRole("tab", { name: "Outcome" }).click();
  await page
    .getByRole("combobox", { name: "Outcome" })
    .selectOption("progressed");
  await page.getByRole("button", { name: "Save outcome" }).click();
  await page.getByRole("link", { name: "Add next interview stage" }).click();
  const creationForm = page.locator("section").filter({
    has: page.getByRole("heading", { name: "Add interview" }),
  });
  await creationForm.getByLabel("Stage").selectOption("behavioural");
  await page.getByRole("button", { name: "Create preparation record" }).click();
  await expect(
    page.getByText("Behavioural", { exact: true }).first(),
  ).toBeVisible();
});
test("Home and application detail surface the linked interview", async ({
  page,
}) => {
  await seed(page, true);
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: /Prepare for your .* interview/ }),
  ).toBeVisible();
  await page.screenshot({
    path: shots + "/home-interview-priority-1440.png",
    fullPage: true,
  });
  await page.goto("/dashboard/applications/" + applicationId);
  await expect(
    page.getByRole("heading", { name: "Linked interviews" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "technical" })).toBeVisible();
  await page.screenshot({
    path: shots + "/application-linked-interview-1440.png",
    fullPage: true,
  });
});
test("Home updates when an imminent interview is created in the active session", async ({
  page,
}) => {
  await seed(page, false);
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: "Choose your career starting point" }),
  ).toBeVisible();
  await page.evaluate(
    ({ userId }) => {
      const fixture = (
        window as typeof window & { __phase3InterviewFixture?: unknown }
      ).__phase3InterviewFixture;
      localStorage.setItem(
        "autotime-phase-3c-interviews-v1:" + userId,
        JSON.stringify({ interviews: [fixture], schemaVersion: 1 }),
      );
      window.dispatchEvent(
        new CustomEvent("autotime-interview-workflow-changed"),
      );
    },
    { userId },
  );
  await expect(
    page.getByRole("heading", { name: /Prepare for your .* interview/ }),
  ).toBeVisible();
});

test("recorded rejection keeps employer reason and interpretation separate", async ({
  page,
}) => {
  await seed(page, true, true);
  await page.goto("/dashboard/interviews/55555555-5555-4555-8555-555555555555");
  await page.getByRole("tab", { name: "Outcome" }).click();
  await page
    .getByRole("combobox", { name: "Outcome" })
    .selectOption("rejected");
  await page
    .getByLabel(/Your interpretation/)
    .fill("The technical gap may have affected my answer.");
  await page.getByRole("button", { name: "Save outcome" }).click();
  await expect(page.getByRole("status")).toContainText("outcome recorded");
  await page.screenshot({
    path: shots + "/outcome-recording-1440.png",
    fullPage: true,
  });
  await page.goto("/dashboard/applications");
  const rejectedApplication = page
    .locator("article.workflow-list-row, article.phase-three-application-row")
    .filter({ has: page.getByRole("heading", { name: "Cloud Engineer" }) });
  await expect(rejectedApplication).toBeVisible();
  await expect(
    rejectedApplication.getByText("Rejected", { exact: true }).first(),
  ).toBeVisible();
  await expect(page.getByRole("option", { name: "Rejected" })).toBeHidden();
  await page.screenshot({
    path: shots + "/application-pipeline-after-outcome-1440.png",
    fullPage: true,
  });
});
test("mobile preparation has no horizontal overflow and legacy route redirects", async ({
  page,
}) => {
  await seed(page, true);
  for (const [width, height] of [
    [1024, 768],
    [768, 1024],
    [390, 844],
    [360, 800],
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.goto(
      "/dashboard/interviews/55555555-5555-4555-8555-555555555555",
    );
    await page.getByRole("tab", { name: "Preparation" }).click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: shots + "/preparation-" + width + "x" + height + ".png",
      fullPage: true,
    });
  }
  await page.goto("/dashboard/interview");
  await expect(page).toHaveURL(/\/dashboard\/interviews$/);
});
