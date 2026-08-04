import { expect, test, type Page } from "@playwright/test";

const userId = "00000000-0000-4000-8000-000000000001";
const mobilityKey = `autotime-international-mobility:v1:${userId}`;

async function seedMobility(
  page: Page,
  sponsorshipRequired: "yes" | "no" | "unsure",
  targetCountries: string[],
) {
  await page.addInitScript(
    ({ key, sponsorshipRequired, targetCountries }) =>
      localStorage.setItem(
        key,
        JSON.stringify({
          schemaVersion: 1,
          currentCountry: "United Kingdom",
          targetCountries,
          applicantPosition: "local-work-authorised",
          sponsorshipRequired,
          relocationPreference: "yes",
        }),
      ),
    { key: mobilityKey, sponsorshipRequired, targetCountries },
  );
}

test("Career Direction pre-fills target countries and support need from the saved mobility profile", async ({
  page,
}) => {
  await seedMobility(page, "no", ["Germany", "Netherlands"]);
  await page.goto("/dashboard/role-pathways");
  await expect(page.getByRole("heading", { name: "Role Pathways" })).toBeVisible();
  // First visit to this route compiles on demand in dev; a Fast Refresh
  // mid-interaction can silently leave the form looking unresponsive.
  await page.waitForLoadState("networkidle");

  // Stage 2 (where the prefilled preferences render) is only reachable
  // after evidence is confirmed, so drive the real flow to get there.
  await page
    .getByRole("textbox", { name: "CV, project and experience evidence" })
    .fill(
      "Backend engineer with 7 years of TypeScript, Node.js, PostgreSQL, REST APIs, AWS, Docker, Kubernetes, CI/CD, production incident response and mentoring.",
    );
  await page
    .getByRole("button", { name: "Extract evidence", exact: true })
    .click();
  const confirmationLabels = page.locator("label.confirm-switch");
  await expect(confirmationLabels).not.toHaveCount(0);
  for (let index = 0; index < (await confirmationLabels.count()); index += 1)
    await confirmationLabels.nth(index).click();
  await page
    .getByRole("button", { name: "Preferences →", exact: true })
    .click();

  await expect(
    page.getByRole("checkbox", { name: "Germany" }),
  ).toBeChecked();
  await expect(
    page.getByRole("checkbox", { name: "Netherlands" }),
  ).toBeChecked();
  await expect(
    page.getByRole("checkbox", { name: "Ireland" }),
  ).not.toBeChecked();
  await expect(
    page.getByLabel("Work-authorisation support"),
  ).toHaveValue("no");
  await expect(
    page.getByText("pre-filled from your saved", { exact: false }),
  ).toBeVisible();
});

test("Jobs analysis uses the saved mobility profile instead of the legacy dashboard flag", async ({
  page,
}) => {
  const jobId = "job-mobility-1";
  await seedMobility(page, "yes", ["Germany"]);
  await page.addInitScript(
    ({ userId, jobId }) => {
      localStorage.setItem(
        `autotime-v2-companion-dashboard:${userId}`,
        JSON.stringify({
          applications: [],
          evidenceRecords: [],
          interviewPrepPacks: [],
          jobAnalysis: {
            company: "",
            jobDescription: "",
            jobTitle: "",
            jobUrl: "",
            location: "",
            notes: "",
            workMode: "unknown",
          },
          outcomeRecords: [],
          profile: {
            baseCvText: "Backend engineer with production experience.",
            experienceHighlights: "Built payment services.",
            projectSummaries: "",
            targetRoles: "",
            sponsorshipNeeded: false,
          },
          reusableAnswers: {},
        }),
      );
      localStorage.setItem(
        `autotime-phase-3b-workflow-v1:${userId}`,
        JSON.stringify({
          schemaVersion: 1,
          jobs: [
            {
              id: jobId,
              analysisHistory: [],
              analysisState: "Not analysed",
              capturedAt: "2026-08-04T09:00:00.000Z",
              description:
                "Backend role requiring TypeScript and AWS. We are unable to offer sponsorship for this vacancy.",
              employer: {
                state: "user-confirmed",
                value: "Fixture Co",
                sourceText: "Fixture Co",
              },
              facts: {
                contract: { state: "missing", value: "" },
                country: {
                  state: "user-confirmed",
                  value: "Germany",
                  sourceText: "Germany",
                },
                education: { state: "missing", value: "" },
                employmentType: { state: "missing", value: "" },
                experience: { state: "missing", value: "" },
                language: { state: "missing", value: "" },
                location: {
                  state: "user-confirmed",
                  value: "Berlin, Germany",
                  sourceText: "Berlin, Germany",
                },
                salary: { state: "missing", value: "" },
                sponsorship: {
                  state: "user-confirmed",
                  value:
                    "We are unable to offer sponsorship for this vacancy.",
                  sourceText:
                    "We are unable to offer sponsorship for this vacancy.",
                },
                workArrangement: { state: "missing", value: "" },
                workAuthorisation: { state: "missing", value: "" },
              },
              lane: "",
              source: "Development fixture",
              sourceUrl: "https://example.test/vacancy",
              title: {
                state: "user-confirmed",
                value: "Backend Engineer",
                sourceText: "Backend Engineer",
              },
              updatedAt: "2026-08-04T09:00:00.000Z",
            },
          ],
          applications: [],
        }),
      );
      localStorage.setItem("autotime-analytics-consent", "denied");
    },
    { userId, jobId },
  );

  await page.goto(`/dashboard/jobs/${jobId}`);
  await expect(
    page.getByRole("heading", { name: "Backend Engineer" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Analyse job" }).click();
  await expect(
    page.getByText("Your saved mobility profile:"),
  ).toBeVisible();
  await expect(page.getByText("Sponsorship required")).toBeVisible();
  // The vacancy explicitly can't sponsor and the mobility profile says
  // sponsorship IS required, so this must resolve to Skip, not Apply.
  await expect(page.getByText("Skip", { exact: true }).first()).toBeVisible();
});
