// Exercises the AI application-kit generation button on the application
// detail page (JobApplicationWorkspace) - the live workspace's own port of
// the capability DashboardExperience's dead "application-answers" tab had
// (see docs/reference/technical-debt.md). Mocks /api/ai/content directly
// rather than requiring a real OpenAI key, so both the success and the
// blocked-eligibility paths are deterministic in CI.
import { expect, test, type Page } from "@playwright/test";

const userId = "00000000-0000-4000-8000-000000000001";
const now = "2026-08-04T09:00:00.000Z";
const sourced = (value: string) => ({ state: "user-confirmed", value, sourceText: value });
const missing = () => ({ state: "missing", value: "" });

function job() {
  return {
    id: "one",
    analysisHistory: [
      {
        capability: [],
        confidence: "High",
        coverage: 100,
        createdAt: now,
        criticalRisk: "None recorded",
        decision: "Apply",
        id: "analysis-one",
        nextAction: "Prepare application",
        positiveEvidence: "Confirmed evidence",
        reason: "Evidence supports preparation.",
        unknowns: [],
        version: 1,
      },
    ],
    analysisState: "Analysed",
    applicationId: "app-one",
    capturedAt: now,
    description:
      "A deterministic fictional vacancy used only by an authorised local test principal.",
    employer: sourced("Northstar Systems"),
    facts: {
      contract: sourced("permanent"),
      country: sourced("Germany"),
      education: missing(),
      employmentType: sourced("permanent"),
      experience: sourced("Senior"),
      language: sourced("English"),
      location: sourced("Berlin, Germany"),
      salary: missing(),
      sponsorship: missing(),
      workArrangement: sourced("Hybrid"),
      workAuthorisation: missing(),
    },
    lane: "Product analytics",
    source: "Development fixture",
    sourceUrl: "https://example.test/vacancy",
    title: sourced("Senior Product Analyst"),
    updatedAt: now,
  };
}
function application() {
  return {
    appliedAt: undefined,
    applicationChannel: undefined,
    checklist: [true, true, true, true, true, true, true, false],
    consequentialAnswersReviewed: true,
    coverLetterRequested: false,
    createdAt: now,
    documentVersions: [],
    evidenceConfirmed: true,
    followUpDate: undefined,
    id: "app-one",
    jobId: "one",
    referenceNumber: undefined,
    screeningAnswers: [],
    selectedCvVersion: "Confirmed profile",
    status: "Needs review",
    submissionConfirmed: false,
    unsupportedClaims: [],
    updatedAt: now,
  };
}
async function seed(page: Page) {
  await page.addInitScript(
    ({ userId, jobRecord, applicationRecord }) => {
      localStorage.setItem(
        `autotime-phase-3b-workflow-v1:${userId}`,
        JSON.stringify({
          schemaVersion: 1,
          jobs: [jobRecord],
          applications: [applicationRecord],
        }),
      );
      localStorage.setItem("autotime-analytics-consent", "denied");
    },
    { userId, jobRecord: job(), applicationRecord: application() },
  );
  await page.route("**/api/profile/onboarding", (route) =>
    route.fulfill({
      json: {
        data: {
          full_name: "Taylor User",
          email: "taylor@example.com",
          phone: "+44 7700 900000",
          linkedin_url: "https://www.linkedin.com/in/taylor-user",
          github_url: null,
          portfolio_url: null,
          country_current: "Germany",
          countries_target: ["Germany"],
          target_roles: "Product Analyst",
          work_authorisation_category: "eu_eea_swiss_citizen",
          work_right_details: "EU citizen, no sponsorship required.",
          base_cv_text:
            "Senior product analyst with experience in SQL, product analytics and experimentation.",
          experience_highlights: "Improved onboarding activation.",
          project_summaries: "Delivered SQL analysis with stakeholders.",
        },
        error: null,
      },
    }),
  );
}

test("generates and saves a cover letter, and shows the rest of the kit to copy", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await seed(page);
  let requestBody: unknown;
  await page.route("**/api/ai/content", async (route) => {
    requestBody = route.request().postDataJSON();
    await route.fulfill({
      json: {
        data: {
          content: {
            coverLetter: "Dear Hiring Manager, I am applying for this role.",
            profileSummary: "Senior product analyst focused on activation.",
            motivationAnswer: "This role matches my product analytics background.",
            strengthsAnswer: "SQL, experimentation and stakeholder communication.",
            availabilityAnswer: "Available to start within four weeks.",
          },
        },
        error: null,
      },
    });
  });

  await page.goto("/dashboard/applications/app-one");
  await expect(
    page.getByRole("heading", { name: "Draft with AutoTime AI" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Generate application kit" }).click();
  await expect(
    page.getByText("Application kit generated with AutoTime AI."),
  ).toBeVisible();

  // The cover letter is the only field persisted to the tracked application.
  const stored = await page.evaluate(
    ({ userId }) =>
      JSON.parse(
        localStorage.getItem(`autotime-phase-3b-workflow-v1:${userId}`) ||
          "null",
      ),
    { userId },
  );
  expect(stored.applications[0].coverLetter).toBe(
    "Dear Hiring Manager, I am applying for this role.",
  );
  expect(stored.applications[0].coverLetterRequested).toBe(true);

  // The other three drafts render for copying but are never written back to
  // the persisted application record.
  await expect(page.getByText("Senior product analyst focused on activation.")).toBeVisible();
  await expect(page.getByText("This role matches my product analytics background.")).toBeVisible();
  await expect(page.getByText("SQL, experimentation and stakeholder communication.")).toBeVisible();
  expect(stored.applications[0]).not.toHaveProperty("profileSummary");
  expect(stored.applications[0]).not.toHaveProperty("motivationAnswer");

  await page
    .getByRole("article", { name: "" })
    .filter({ hasText: "Motivation answer" })
    .getByRole("button", { name: "Copy" })
    .click();
  await expect(page.getByText("Motivation answer copied.")).toBeVisible();
  const clipboard = await page.evaluate(() => navigator.clipboard.readText());
  expect(clipboard).toBe("This role matches my product analytics background.");

  // The request actually sent real, confirmed evidence - not a blank/mock body.
  expect(requestBody).toMatchObject({
    profile: { fullName: "Taylor User", sponsorshipNeeded: false },
    job: { jobTitle: "Senior Product Analyst", company: "Northstar Systems" },
    reusableAnswers: null,
  });
});

test("a blocked eligibility response is shown as an honest status message, not a crash", async ({
  page,
}) => {
  await seed(page);
  await page.route("**/api/ai/content", (route) =>
    route.fulfill({
      status: 422,
      json: {
        data: null,
        error:
          "Content generation blocked: Missing required evidence: CV text.",
      },
    }),
  );

  await page.goto("/dashboard/applications/app-one");
  await page.getByRole("button", { name: "Generate application kit" }).click();
  await expect(
    page.getByText(
      "Content generation blocked: Missing required evidence: CV text.",
    ),
  ).toBeVisible();
  // No draft content should render when generation was blocked.
  await expect(page.locator(".phase-three-kit-draft")).toHaveCount(0);
});
