import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { seedReadyDashboardProfile } from "./helpers";
import { sampleUser } from "../fixtures/sample-user";

const output = "screenshots/phase-5-countries/review";
const mobilityKey = `autotime-international-mobility:v1:${sampleUser.id}`;

async function seedMobility(page: Page) {
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
}

async function disableDevelopmentToolbar(page: Page) {
  const response = await page.request.post(
    "http://127.0.0.1:3000/__nextjs_devtools_config",
    { data: { disableDevIndicator: true } },
  );
  expect(response.ok()).toBe(true);
}

async function gotoInternational(page: Page) {
  await page.goto("/dashboard/international");
  await expect(
    page.getByRole("heading", { name: "International applications" }),
  ).toBeVisible();
  // The dev server compiles this route on-demand on first visit; a Fast
  // Refresh mid-interaction can silently drop a click. Wait for the route
  // to settle before the first click.
  await page.waitForLoadState("networkidle");
}

async function assertVisualContract(page: Page) {
  await page.mouse.move(0, 0);
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement)
      document.activeElement.blur();
  });
  await expect(page.locator("main.phase-five-countries")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  const forbidden = await page
    .locator("main.phase-five-countries *")
    .evaluateAll((elements) => {
      const green = (value: string) => {
        const match = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (!match) return false;
        const [, r, g, b] = match.map(Number);
        return g > r * 1.08 && g > b * 1.04 && g > 70;
      };
      return elements.flatMap((element) => {
        const style = getComputedStyle(element);
        const values = [
          style.color,
          style.backgroundColor,
          style.borderColor,
          style.boxShadow,
        ];
        return values.some(green)
          ? [{ tag: element.tagName, className: element.className, values }]
          : [];
      });
    });
  expect(forbidden).toEqual([]);
  const targets = await page
    .locator(
      "main.phase-five-countries button:visible, main.phase-five-countries a:visible, main.phase-five-countries summary:visible",
    )
    .evaluateAll((elements) =>
      elements.map((element) => {
        const box = element.getBoundingClientRect();
        return { width: box.width, height: box.height };
      }),
    );
  expect(
    targets.every(({ width, height }) => width >= 44 || height >= 44),
  ).toBe(true);
}

async function capture(page: Page, path: string) {
  await assertVisualContract(page);
  await page.screenshot({ path: `${output}/${path}`, fullPage: false });
}

test.beforeAll(async () => mkdir(output, { recursive: true }));

test("overview and country workspace are green-free with a single hero primary", async ({
  page,
}) => {
  await disableDevelopmentToolbar(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await seedMobility(page);
  await seedReadyDashboardProfile(page);
  await gotoInternational(page);
  await capture(page, "overview-1440x900.png");
  await page.setViewportSize({ width: 390, height: 844 });
  await capture(page, "overview-390x844.png");

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole("button", { name: "Ireland", exact: false }).click();
  await expect(page.getByRole("heading", { name: "Ireland" })).toBeVisible();
  await capture(page, "country-workspace-1440x900.png");
});

test("vacancy evidence check surfaces a blocked decision", async ({
  page,
}) => {
  await disableDevelopmentToolbar(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await seedMobility(page);
  await seedReadyDashboardProfile(page);
  await gotoInternational(page);
  await page.getByRole("button", { name: "Country workspace" }).click();
  await page
    .getByLabel("Paste relevant vacancy wording")
    .fill(
      "Applicants must have existing work rights. We are unable to sponsor this vacancy.",
    );
  await expect(page.getByText("Skip", { exact: true })).toBeVisible();
  await capture(page, "country-workspace-blocked-1440x900.png");
});

test("mobility profile form, sponsor guide and official sources", async ({
  page,
}) => {
  await disableDevelopmentToolbar(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await seedReadyDashboardProfile(page);
  await gotoInternational(page);
  await page.getByRole("button", { name: "My mobility", exact: true }).click();
  await expect(page.getByLabel("Applicant position")).toBeVisible();
  await capture(page, "mobility-form-1440x900.png");
  await page.setViewportSize({ width: 390, height: 844 });
  await capture(page, "mobility-form-390x844.png");

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole("button", { name: "Sponsor employers" }).click();
  await expect(
    page.getByRole("heading", { name: "Sponsor employers" }),
  ).toBeVisible();
  await capture(page, "sponsor-employers-1440x900.png");

  await page.getByRole("button", { name: "Official sources" }).click();
  await expect(
    page.getByRole("heading", { name: "Official sources" }),
  ).toBeVisible();
  await capture(page, "official-sources-1440x900.png");
});

test("detail is responsive at required intermediate viewports", async ({
  page,
}) => {
  await disableDevelopmentToolbar(page);
  await seedMobility(page);
  await seedReadyDashboardProfile(page);
  await page.setViewportSize({ width: 1024, height: 768 });
  await gotoInternational(page);
  await capture(page, "overview-1024x768.png");
  await page.setViewportSize({ width: 768, height: 1024 });
  await capture(page, "overview-768x1024.png");
  await page.setViewportSize({ width: 360, height: 800 });
  await assertVisualContract(page);
});

test("shared tab standard: single underline, no pills or fills", async ({
  page,
}) => {
  await disableDevelopmentToolbar(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await seedReadyDashboardProfile(page);
  await gotoInternational(page);
  const overviewTab = page.getByRole("button", {
    name: "Overview",
    exact: true,
  });
  await expect(overviewTab).toHaveCSS("border-bottom-color", "rgb(23, 78, 166)");
  const mobilityTab = page.getByRole("button", {
    name: "My mobility",
    exact: true,
  });
  await expect(mobilityTab).toHaveCSS(
    "border-bottom-color",
    "rgba(0, 0, 0, 0)",
  );
  await mobilityTab.focus();
  await expect(mobilityTab).toHaveCSS("outline-color", "rgb(81, 69, 205)");
});
