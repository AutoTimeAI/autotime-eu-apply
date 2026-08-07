import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { seedReadyDashboardProfile } from "./helpers";

const output = "screenshots/phase-7-profile/review";

async function disableDevelopmentToolbar(page: Page) {
  const response = await page.request.post(
    "http://127.0.0.1:3000/__nextjs_devtools_config",
    { data: { disableDevIndicator: true } },
  );
  expect(response.ok()).toBe(true);
}

async function gotoProfile(page: Page) {
  await page.goto("/dashboard/autofill-profile");
  await expect(
    page.getByRole("heading", { name: "Your candidate evidence workspace" }),
  ).toBeVisible();
  // First visit to this route compiles on demand in dev; a Fast Refresh
  // mid-interaction can silently drop the next click. Settle first.
  await page.waitForLoadState("networkidle");
}

async function assertVisualContract(page: Page) {
  await page.mouse.move(0, 0);
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement)
      document.activeElement.blur();
  });
  await expect(page.locator("main.phase-seven-profile")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  const forbidden = await page
    .locator("main.phase-seven-profile *")
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
      "main.phase-seven-profile button:visible, main.phase-seven-profile a:visible, main.phase-seven-profile summary:visible",
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

test("profile workspace is green-free with a single primary action", async ({
  page,
}) => {
  await disableDevelopmentToolbar(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await seedReadyDashboardProfile(page);
  await gotoProfile(page);
  await expect(
    page.getByRole("heading", { name: "Profile is ready" }),
  ).toBeVisible();
  await capture(page, "workspace-top-1440x900.png");
  await page.setViewportSize({ width: 390, height: 844 });
  await capture(page, "workspace-top-390x844.png");

  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(
    page.getByRole("button", { name: "Apply to My Profile" }),
  ).toHaveCSS("background-color", "rgb(23, 78, 166)");
  await expect(
    page.getByRole("button", { name: "Review CV", exact: true }),
  ).not.toHaveCSS("background-color", "rgb(23, 78, 166)");
  const readyPanel = page.locator(".profile-bridge-panel.ready");
  await expect(readyPanel).toHaveCSS(
    "border-left-color",
    "rgb(23, 78, 166)",
  );
});

test("form sections are reachable and readiness/quality panels render", async ({
  page,
}) => {
  await disableDevelopmentToolbar(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await seedReadyDashboardProfile(page);
  await gotoProfile(page);
  await page.getByLabel("Work-right details").scrollIntoViewIfNeeded();
  await capture(page, "workspace-form-sections-1440x900.png");
  await page
    .getByLabel("Project or delivery examples")
    .scrollIntoViewIfNeeded();
  await capture(page, "workspace-output-column-1440x900.png");
});

test("detail is responsive at required intermediate viewports", async ({
  page,
}) => {
  await disableDevelopmentToolbar(page);
  await seedReadyDashboardProfile(page);
  await page.setViewportSize({ width: 1024, height: 768 });
  await gotoProfile(page);
  await capture(page, "workspace-1024x768.png");
  await page.setViewportSize({ width: 768, height: 1024 });
  await capture(page, "workspace-768x1024.png");
  await page.setViewportSize({ width: 360, height: 800 });
  await assertVisualContract(page);
});

test("insights route is unaffected by the profile scope class", async ({
  page,
}) => {
  await disableDevelopmentToolbar(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await seedReadyDashboardProfile(page);
  await page.goto("/dashboard/insights");
  await page.waitForLoadState("networkidle");
  const hasProfileScope = await page
    .locator("main.phase-seven-profile")
    .count();
  expect(hasProfileScope).toBe(0);
});
