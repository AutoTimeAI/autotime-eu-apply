import { expect, test, type Page } from "@playwright/test";

const userId = "00000000-0000-4000-8000-000000000001";
const mobilityKey = `autotime-international-mobility:v1:${userId}`;
const dashboardKey = `autotime-v2-companion-dashboard:${userId}`;

function dashboardState(profileOverrides: Record<string, unknown>) {
  return {
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
      fullName: "",
      email: "",
      phone: "",
      linkedInUrl: "",
      githubUrl: "",
      portfolioUrl: "",
      currentCountry: "",
      currentCity: "",
      targetCountries: "",
      targetRoles: "",
      workRightDetails: "",
      sponsorshipNeeded: false,
      relocationWillingness: "depends",
      salaryExpectation: "",
      noticePeriod: "",
      baseCvText: "",
      projectSummaries: "",
      experienceHighlights: "",
      ...profileOverrides,
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
  };
}

async function seed(
  page: Page,
  mobility: { currentCountry: string; targetCountries: string[] } | null,
  profileOverrides: Record<string, unknown>,
) {
  await page.addInitScript(
    ({ mobilityKey, dashboardKey, mobility, state }) => {
      // addInitScript re-runs on every navigation (including reload); only
      // seed once so a later reload doesn't stomp a user edit back to the
      // original fixture.
      if (sessionStorage.getItem("profile-mobility-prefill-seeded")) return;
      if (mobility) {
        localStorage.setItem(
          mobilityKey,
          JSON.stringify({
            schemaVersion: 1,
            currentCountry: mobility.currentCountry,
            targetCountries: mobility.targetCountries,
            applicantPosition: "local-work-authorised",
            sponsorshipRequired: "unsure",
            relocationPreference: "yes",
          }),
        );
      }
      localStorage.setItem(dashboardKey, JSON.stringify(state));
      localStorage.setItem("autotime-analytics-consent", "denied");
      sessionStorage.setItem("profile-mobility-prefill-seeded", "true");
    },
    {
      mobilityKey,
      dashboardKey,
      mobility,
      state: dashboardState(profileOverrides),
    },
  );
}

async function gotoProfile(page: Page) {
  await page.goto("/dashboard/autofill-profile");
  await expect(
    page.getByRole("heading", { name: "Your candidate evidence workspace" }),
  ).toBeVisible();
  await page.waitForLoadState("networkidle");
}

test("fills empty Profile fields from a saved mobility profile and shows the note", async ({
  page,
}) => {
  await seed(
    page,
    { currentCountry: "Germany", targetCountries: ["Ireland", "Netherlands"] },
    { currentCountry: "", targetCountries: "" },
  );
  await gotoProfile(page);

  await expect(page.getByLabel("Current country")).toHaveValue("Germany");
  await expect(page.getByLabel("Target countries")).toHaveValue(
    "Ireland, Netherlands",
  );
  await expect(
    page.getByText("Pre-filled from your saved").first(),
  ).toBeVisible();
  expect(
    await page.getByText("Pre-filled from your saved").count(),
  ).toBe(2);
});

test("never overwrites existing Profile data with mobility data", async ({
  page,
}) => {
  // Deliberately not "United Kingdom": DashboardExperience's own
  // clearLegacyProfilePlaceholders() treats an unaccompanied "United
  // Kingdom" currentCountry as an unconfirmed legacy placeholder and wipes
  // it, which would defeat this test's purpose of proving real user data
  // survives untouched.
  await seed(
    page,
    { currentCountry: "Germany", targetCountries: ["Netherlands"] },
    { currentCountry: "Spain", targetCountries: "" },
  );
  await gotoProfile(page);

  await expect(page.getByLabel("Current country")).toHaveValue("Spain");
  // Target countries was empty, so it still fills from mobility...
  await expect(page.getByLabel("Target countries")).toHaveValue("Netherlands");
  // ...but only one note shows, for the field that was actually empty.
  expect(
    await page.getByText("Pre-filled from your saved").count(),
  ).toBe(1);
});

test("the note clears once the user edits the pre-filled field", async ({
  page,
}) => {
  await seed(
    page,
    { currentCountry: "Germany", targetCountries: [] },
    { currentCountry: "", targetCountries: "" },
  );
  await gotoProfile(page);

  await expect(page.getByLabel("Current country")).toHaveValue("Germany");
  await expect(
    page.getByText("Pre-filled from your saved").first(),
  ).toBeVisible();

  await page.getByLabel("Current country").fill("France");
  await expect(page.getByText("Pre-filled from your saved")).toHaveCount(0);

  await page.reload();
  await page.waitForLoadState("networkidle");
  await expect(page.getByLabel("Current country")).toHaveValue("France");
  await expect(page.getByText("Pre-filled from your saved")).toHaveCount(0);
});

test("an unsaved mobility profile default is never copied in", async ({
  page,
}) => {
  // No mobility profile saved at all — loadMobilityProfile falls back to
  // the unsaved form default (targetCountries: ["Ireland"]), which must
  // never be treated as a fact.
  await seed(page, null, { currentCountry: "", targetCountries: "" });
  await gotoProfile(page);

  await expect(page.getByLabel("Current country")).toHaveValue("");
  await expect(page.getByLabel("Target countries")).toHaveValue("");
  await expect(page.getByText("Pre-filled from your saved")).toHaveCount(0);
});
