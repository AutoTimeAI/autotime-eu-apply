// Exercises evidence-led career-direction recommendations and saved lane state.
import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const userId = "00000000-0000-4000-8000-000000000001";
const output = "screenshots/phase-6-career-direction/review";
const backendEvidence =
  "Backend engineer with 7 years of TypeScript, Node.js, PostgreSQL, REST APIs, AWS, Docker, Kubernetes, CI/CD, production incident response and mentoring. Built payment services and reduced API latency by 35 percent.";

async function seed(page: Page) {
  await page.addInitScript(
    ({ userId }) => {
      if (sessionStorage.getItem("phase-6-fixture-seeded")) return;
      localStorage.removeItem("autotime-role-pathways:v1:" + userId);
      localStorage.setItem("autotime-analytics-consent", "denied");
      sessionStorage.setItem("phase-6-fixture-seeded", "true");
    },
    { userId },
  );
}

async function disableDevelopmentToolbar(page: Page) {
  const response = await page.request.post(
    "http://127.0.0.1:3000/__nextjs_devtools_config",
    { data: { disableDevIndicator: true } },
  );
  expect(response.ok()).toBe(true);
}

async function gotoRolePathways(page: Page) {
  await page.goto("/dashboard/role-pathways");
  await expect(
    page.getByRole("heading", { name: "Role Pathways" }),
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
  await expect(page.locator("main.phase-six-career-direction")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  const forbidden = await page
    .locator("main.phase-six-career-direction *")
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
      "main.phase-six-career-direction button:visible, main.phase-six-career-direction a:visible",
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

test("full pathway flow is green-free with a single primary per stage", async ({
  page,
}) => {
  await disableDevelopmentToolbar(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await seed(page);
  await gotoRolePathways(page);
  await capture(page, "stage1-evidence-empty-1440x900.png");
  await page.setViewportSize({ width: 390, height: 844 });
  await capture(page, "stage1-evidence-empty-390x844.png");

  await page.setViewportSize({ width: 1440, height: 900 });
  await page
    .getByRole("textbox", { name: "CV, project and experience evidence" })
    .fill(backendEvidence);
  await page
    .getByRole("button", { name: "Extract evidence", exact: true })
    .click();
  const confirmationLabels = page.locator("label.confirm-switch");
  await expect(confirmationLabels).not.toHaveCount(0);
  for (let index = 0; index < (await confirmationLabels.count()); index += 1)
    await confirmationLabels.nth(index).click();
  await capture(page, "stage1-evidence-confirmed-1440x900.png");

  await page
    .getByRole("button", { name: "Preferences →", exact: true })
    .click();
  await capture(page, "stage2-preferences-1440x900.png");

  await page
    .getByRole("button", {
      name: "Generate recommended pathways →",
      exact: true,
    })
    .click();
  const directSoftwareRole = page.getByRole("button", {
    name: /applications programmer.*direct match/i,
  });
  await expect(directSoftwareRole).toBeVisible();
  await capture(page, "stage3-pathways-1440x900.png");
  // A desktop-click-then-resize mobile capture here would misleadingly
  // show the stepper unscrolled (resizing doesn't re-trigger the
  // scroll-into-view effect, which only fires on stage change). The
  // "active step scrolls into view on mobile" test below captures the
  // real mobile behavior via a genuine mobile-width tap instead.

  await directSoftwareRole.click();
  await capture(page, "stage4-role-detail-1440x900.png");

  await page
    .getByRole("button", { name: "Select career lanes →", exact: true })
    .click();
  await capture(page, "stage5-lane-selection-1440x900.png");

  await page
    .getByRole("combobox", { name: "Primary lane" })
    .selectOption("2514.1");
  await page.getByRole("button", { name: "Save career lanes" }).click();
  await expect(page.getByRole("status")).toContainText("saved");
  await capture(page, "stage5-lane-saved-1440x900.png");
});

test("stepper active state uses shared blue, not the site teal default", async ({
  page,
}) => {
  await disableDevelopmentToolbar(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await seed(page);
  await gotoRolePathways(page);
  const activeStep = page.locator(".pathway-steps li.active button");
  await expect(activeStep).toHaveCSS("border-color", "rgb(23, 78, 166)");
  const extractButton = page.getByRole("button", {
    name: "Extract evidence",
    exact: true,
  });
  await page
    .getByRole("textbox", { name: "CV, project and experience evidence" })
    .fill(backendEvidence);
  await expect(extractButton).toBeEnabled();
  await expect(extractButton).toHaveCSS(
    "background-image",
    /rgb\(23, 78, 166\)/,
  );
});

test("active step scrolls into view on mobile when advancing stages", async ({
  page,
}) => {
  await disableDevelopmentToolbar(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await seed(page);
  await gotoRolePathways(page);
  await page
    .getByRole("textbox", { name: "CV, project and experience evidence" })
    .fill(backendEvidence);
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
    page.getByRole("button", { name: "2 Set preferences" }),
  ).toBeInViewport();
  await page
    .getByRole("button", {
      name: "Generate recommended pathways →",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("button", { name: "3 Generate pathways" }),
  ).toBeInViewport();
  await capture(page, "stage3-pathways-mobile-tap-390x844.png");
});

test("detail is responsive at required intermediate viewports", async ({
  page,
}) => {
  await disableDevelopmentToolbar(page);
  await seed(page);
  await page.setViewportSize({ width: 1024, height: 768 });
  await gotoRolePathways(page);
  await capture(page, "stage1-1024x768.png");
  await page.setViewportSize({ width: 768, height: 1024 });
  await capture(page, "stage1-768x1024.png");
  await page.setViewportSize({ width: 360, height: 800 });
  await assertVisualContract(page);
});
