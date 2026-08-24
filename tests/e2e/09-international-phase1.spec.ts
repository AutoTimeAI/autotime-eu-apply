// Phase 1 coverage for the International applications page
// (/dashboard/international): country-specific evidence ledgers, switching
// the hiring country, the "no sponsorship" vacancy-wording detector, the
// one-time legacy-profile migration into the mobility form (scoped per
// user id so it can't leak across accounts), and a mobile layout pass.
// Desktop and mobile screenshots are captured for visual review.
import { expect, test, type Page } from "@playwright/test";
import { dashboardStorageKey, seedReadyDashboardProfile } from "./helpers";
import {
  sampleCandidateProfile,
  sampleReusableAnswers,
  sampleUser,
} from "../fixtures/sample-user";

const mobilityKey = `autotime-international-mobility:v1:${sampleUser.id}`;

async function openInternational(page: Page) {
  await seedReadyDashboardProfile(page);
  await page.goto("/dashboard/international");
  await expect(
    page.getByRole("heading", { name: "International applications" }),
  ).toBeVisible();
  // The dev server compiles this route on-demand on first visit; a Fast
  // Refresh mid-interaction can silently drop the next click. Wait for the
  // route to settle before interacting.
  await page.waitForLoadState("networkidle");
}

async function selectCountry(page: Page, country: string) {
  await page.getByRole("button", { name: country, exact: false }).click();
  await expect(page.getByRole("heading", { name: country })).toBeVisible();
}

test("authenticated desktop country and evidence flows", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.addInitScript(
    ({ key }) =>
      localStorage.setItem(
        key,
        JSON.stringify({
          schemaVersion: 1,
          currentCountry: "India",
          targetCountries: ["Ireland"],
          applicantPosition: "sponsorship-required",
          sponsorshipRequired: "yes",
          relocationPreference: "yes",
        }),
      ),
    { key: mobilityKey },
  );
  await openInternational(page);

  await expect(page.getByText("Profile completeness")).toBeVisible();
  await selectCountry(page, "Ireland");
  await page.getByText("Evidence ledger").click();
  await expect(
    page.getByText("Salary with currency and pay period", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Critical Skills Employment Permit"),
  ).toBeVisible();
  await expect(
    page.getByText("Occupation mapping from the role's actual duties"),
  ).toBeVisible();

  await page.getByLabel("Hiring country").selectOption("Germany");
  await expect(page.getByRole("heading", { name: "Germany" })).toBeVisible();
  await expect(
    page.getByText("Qualification or recognition evidence"),
  ).toBeVisible();

  await page.getByLabel("Hiring country").selectOption("Netherlands");
  await expect(
    page.getByRole("heading", { name: "Netherlands" }),
  ).toBeVisible();
  await expect(
    page.getByText("Recognised-sponsor status for the Dutch employing entity"),
  ).toBeVisible();

  await page.getByLabel("Hiring country").selectOption("Belgium");
  await expect(
    page.getByText("Limited coverage — verification required", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("No pathway calculation is provided in explorer mode."),
  ).toBeVisible();

  await page.getByLabel("Hiring country").selectOption("Ireland");
  await page
    .getByLabel("Paste relevant vacancy wording")
    .fill(
      "Applicants must have existing work rights. We are unable to sponsor this vacancy.",
    );
  await expect(page.getByText("Skip", { exact: true })).toBeVisible();
  await expect(
    page.getByText(
      "The vacancy states that sponsorship or new work permission is not available.",
    ),
  ).toBeVisible();

  await page.screenshot({
    path: "screenshots/international-audit-desktop.png",
    fullPage: true,
  });
});

test("legacy migration remains review-only and account scoped", async ({
  page,
}) => {
  await page.addInitScript(
    ({ dashboardKey, mobilityStorageKey, profile, reusableAnswers }) => {
      localStorage.removeItem(mobilityStorageKey);
      localStorage.setItem(
        dashboardKey,
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
            ...profile,
            currentCountry: "India",
            sponsorshipNeeded: true,
            targetCountries: "Ireland, Germany",
            workRightDetails: "Synthetic legacy permission evidence",
          },
          reusableAnswers,
        }),
      );
    },
    {
      dashboardKey: dashboardStorageKey,
      mobilityStorageKey: mobilityKey,
      profile: sampleCandidateProfile,
      reusableAnswers: sampleReusableAnswers,
    },
  );

  await page.goto("/dashboard/international");
  await expect(
    page.getByRole("heading", { name: "International applications" }),
  ).toBeVisible();
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Review my mobility" }).click();
  await expect(
    page.getByText(
      "Legacy profile evidence was copied for review. Save only after checking it.",
    ),
  ).toBeVisible();
  await expect(page.getByLabel("Current country")).toHaveValue("India");
  await expect(page.getByLabel("Current permission type")).toHaveValue(
    "Synthetic legacy permission evidence",
  );
  await expect(page.getByLabel("Applicant position")).toHaveValue(
    "sponsorship-required",
  );
  await expect(
    page.getByLabel("Sponsorship required", { exact: true }),
  ).toHaveValue("yes");

  await page
    .getByLabel("Applicant position")
    .selectOption("local-work-authorised");
  await page
    .getByLabel("Sponsorship required", { exact: true })
    .selectOption("no");
  await page
    .getByRole("button", { name: "Save verified mobility profile" })
    .click();
  await expect(
    page.getByText("Mobility profile saved in this browser for your account."),
  ).toBeVisible();

  const stored = await page.evaluate(
    (key) => localStorage.getItem(key),
    mobilityKey,
  );
  expect(stored).not.toBeNull();
  expect(JSON.parse(stored ?? "{}").applicantPosition).toBe(
    "local-work-authorised",
  );
  expect(
    await page.evaluate(
      (key) => localStorage.getItem(key),
      "autotime-international-mobility:v1:another-user",
    ),
  ).toBeNull();
});

test("authenticated mobile overview, sources and mobility form", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openInternational(page);
  await expect(page.locator("body")).not.toHaveCSS("overflow-x", "scroll");

  await page.getByRole("button", { name: "Official sources" }).click();
  await expect(
    page.getByText("Rule version", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByText("Jurisdiction", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByText("Reviewed", { exact: true }).first(),
  ).toBeVisible();

  await page.getByRole("button", { name: "My mobility", exact: true }).click();
  await expect(page.getByLabel("Applicant position")).toBeVisible();
  await expect(page.getByLabel("Permission expiry date")).toBeVisible();
  await page.screenshot({
    path: "screenshots/international-audit-mobile.png",
    fullPage: true,
  });
});
