import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const userId = "00000000-0000-4000-8000-000000000001";
const screenshotDir = "screenshots/phase-3b-1";

const applyVacancy = `Job title: FinTech Application Analyst
Company: Northstar Payments
Location: Dublin, Ireland
Hybrid permanent role. Salary €65,000 - €78,000.
You must have strong SQL and production support experience.
Essential experience delivering UAT and incident analysis.
Required knowledge of payment operations and stakeholder communication.
English required. We provide visa sponsorship for suitable candidates.`;

const considerVacancy = `Job title: Application Support Analyst
Company: Contoso Banking Systems
Location: Amsterdam, Netherlands
Hybrid permanent role with competitive compensation.
You must have strong SQL and production support experience.
Essential experience delivering UAT and incident analysis.
Required knowledge of Kubernetes operations and stakeholder communication.
English required. Sponsorship information is not stated.`;

const skipVacancy = `Job title: Senior FinTech Platform Analyst
Company: Fabrikam Finance
Location: London, United Kingdom
On-site permanent role. Salary £80,000 - £90,000.
You must have strong SQL and production support experience.
Essential experience delivering UAT and incident analysis.
Required knowledge of payment operations and stakeholder communication.
English required. We cannot provide visa sponsorship for this vacancy.`;

async function seedProfile(
  page: Page,
  evidence: string,
  sponsorshipNeeded = true,
) {
  await page.addInitScript(
    ({ evidence, sponsorshipNeeded, userId }) => {
      if (sessionStorage.getItem("phase-3b-fixture-seeded")) return;
      localStorage.setItem(
        `autotime-v2-companion-dashboard:${userId}`,
        JSON.stringify({
          profile: {
            fullName: "Fictional Candidate",
            email: "candidate@example.test",
            phone: "",
            linkedInUrl: "",
            githubUrl: "",
            portfolioUrl: "",
            currentCountry: "Ireland",
            currentCity: "",
            targetCountries: "Ireland, Netherlands, United Kingdom",
            targetRoles: "Application Analyst",
            workRightDetails: sponsorshipNeeded
              ? "Sponsorship required"
              : "Authorised to work",
            sponsorshipNeeded,
            relocationWillingness: "depends",
            salaryExpectation: "€60,000",
            noticePeriod: "One month",
            baseCvText: evidence,
            projectSummaries:
              "UAT delivery and incident analysis for fictional payment systems.",
            experienceHighlights: evidence,
          },
          reusableAnswers: {
            sponsorshipAnswer: "",
            relocationAnswer: "",
            workAuthorisationAnswer: "",
            noticePeriodAnswer: "",
            salaryExpectationAnswer: "",
            motivationAnswer: "",
            strengthsAnswer: "",
            availabilityAnswer: "",
          },
          jobAnalysis: {
            jobTitle: "",
            company: "",
            jobUrl: "",
            location: "",
            workMode: "unknown",
            jobDescription: "",
            notes: "",
          },
          applications: [],
          interviewPrepPacks: [],
          evidenceRecords: [],
          outcomeRecords: [],
        }),
      );
      localStorage.removeItem(`autotime-phase-3b-workflow-v1:${userId}`);
      localStorage.setItem("autotime-analytics-consent", "denied");
      sessionStorage.setItem("phase-3b-fixture-seeded", "true");
    },
    { evidence, sponsorshipNeeded, userId },
  );
}

async function addAndAnalyse(page: Page, description: string) {
  await page.goto("/dashboard/jobs");
  await page.getByRole("button", { name: "Add a job" }).first().click();
  await page.getByLabel("Job description").fill(description);
  await page
    .getByLabel("Source URL")
    .fill("https://careers.example.test/jobs/fixture");
  await page.screenshot({
    fullPage: true,
    path: `${screenshotDir}/add-job-flow-1440.png`,
  });
  await page.getByRole("button", { name: "Save job" }).click();
  await page.screenshot({
    fullPage: true,
    path: `${screenshotDir}/jobs-populated-1440.png`,
  });
  await page.getByRole("button", { name: "Review and analyse" }).click();
  await page.getByRole("button", { name: "Analyse job" }).click();
  await expect(
    page.getByRole("heading", {
      name: /confirmed evidence|role may be viable|vacancy wording conflicts|not enough/i,
    }),
  ).toBeVisible();
}

test.beforeAll(async () => {
  await mkdir(screenshotDir, { recursive: true });
});

test("Apply journey, application readiness and applied record", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await seedProfile(
    page,
    "SQL production support UAT incident analysis payment operations stakeholder communication",
    false,
  );
  await page.goto("/dashboard/jobs");
  await page.screenshot({
    fullPage: true,
    path: `${screenshotDir}/jobs-empty-1440.png`,
  });
  await addAndAnalyse(page, applyVacancy);
  await expect(page.getByText("Apply", { exact: true })).toBeVisible();
  await page.screenshot({
    fullPage: true,
    path: `${screenshotDir}/apply-analysis-1440.png`,
  });
  await page
    .getByRole("heading", { name: /Requirement evidence|Why it fits/ })
    .scrollIntoViewIfNeeded();
  for (const mapping of await page
    .locator(".evidence-row summary, .phase-two-evidence-row summary")
    .all()) {
    await mapping.click();
  }
  await page.screenshot({
    fullPage: true,
    path: `${screenshotDir}/evidence-mapping-1440.png`,
  });
  await page.getByRole("button", { name: "Prepare application" }).click();
  await expect(
    page.getByRole("heading", { name: "Application checklist" }),
  ).toBeVisible();
  await page.screenshot({
    fullPage: true,
    path: `${screenshotDir}/application-checklist-1440.png`,
  });
  await page.getByLabel(/confirmed the selected evidence/i).check();
  await page.getByLabel(/reviewed every consequential answer/i).check();
  await page
    .getByLabel("Unsupported-claim review")
    .fill("Invented 40% efficiency improvement");
  await page.getByRole("button", { name: "Start final review" }).click();
  await expect(page.getByRole("button", { name: "Mark ready" })).toBeDisabled();
  await page.screenshot({
    fullPage: true,
    path: `${screenshotDir}/unsupported-claim-block-1440.png`,
  });
  await page.getByLabel("Unsupported-claim review").fill("");
  await expect(page.getByRole("button", { name: "Mark ready" })).toBeEnabled();
  await page.getByRole("button", { name: "Mark ready" }).click();
  await page.screenshot({
    fullPage: true,
    path: `${screenshotDir}/ready-state-1440.png`,
  });
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Mark as applied" }).click();
  await expect(
    page.getByRole("heading", { name: "Submission record" }),
  ).toBeVisible();
  await page.getByLabel("Follow-up date").fill("2026-08-15");
  await page.screenshot({
    fullPage: true,
    path: `${screenshotDir}/applied-state-1440.png`,
  });
  await page.goto("/dashboard/applications");
  await page.screenshot({
    fullPage: true,
    path: `${screenshotDir}/applications-pipeline-1440.png`,
  });

  for (const [width, height] of [
    [1024, 768],
    [768, 1024],
    [390, 844],
    [360, 800],
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.screenshot({
      fullPage: true,
      path: `${screenshotDir}/applications-${width}x${height}.png`,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
});

test("Consider and incomplete-evidence journeys remain contextual", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await seedProfile(
    page,
    "SQL production support UAT incident analysis stakeholder communication",
    true,
  );
  await addAndAnalyse(page, considerVacancy);
  await expect(
    page.getByText(/Consider|Insufficient information/, { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: /Material unknowns|Resolve the unknowns/,
    }),
  ).toBeVisible();
  await page.screenshot({
    fullPage: true,
    path: `${screenshotDir}/consider-analysis-1440.png`,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    fullPage: true,
    path: `${screenshotDir}/consider-analysis-390.png`,
  });
  expect(page.url()).toContain("/dashboard/jobs/");
});

test("Skip is explained and legacy routes resolve without loops", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await seedProfile(
    page,
    "SQL production support UAT incident analysis payment operations stakeholder communication",
    true,
  );
  await addAndAnalyse(page, skipVacancy);
  await expect(page.getByText("Skip", { exact: true })).toBeVisible();
  await expect(
    page.getByText(/conflicts with the stated sponsorship requirement/i),
  ).toBeVisible();
  await page.screenshot({
    fullPage: true,
    path: `${screenshotDir}/skip-analysis-1440.png`,
  });
  for (const route of [
    "match-score",
    "inbox",
    "cv-tailor",
    "application-answers",
    "documents",
    "follow-ups",
  ]) {
    await page.goto(`/dashboard/${route}`, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(new RegExp(`/dashboard/(jobs|applications)$`));
  }
});

test("keyboard and tab semantics remain usable", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await seedProfile(
    page,
    "SQL production support UAT incident analysis",
    false,
  );
  await addAndAnalyse(page, applyVacancy);
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).toBeVisible();
  await expect(
    page.getByRole("tablist", { name: "Job sections" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
