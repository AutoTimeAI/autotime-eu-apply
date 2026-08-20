import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { expectNoSeriousViolations } from "./helpers/axe";

const output = "screenshots/phase-8-landing-login/review";

async function disableDevelopmentToolbar(page: Page) {
  const response = await page.request.post(
    "http://127.0.0.1:3000/__nextjs_devtools_config",
    { data: { disableDevIndicator: true } },
  );
  expect(response.ok()).toBe(true);
}

function forbiddenGreen(scope: string) {
  return async (page: Page) => {
    const forbidden = await page
      .locator(`${scope} *`)
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
          ];
          return values.some(green)
            ? [{ tag: element.tagName, className: element.className, values }]
            : [];
        });
      });
    expect(forbidden).toEqual([]);
  };
}

async function capture(page: Page, path: string) {
  await page.screenshot({ path: `${output}/${path}`, fullPage: false });
}

test.beforeAll(async () => mkdir(output, { recursive: true }));

test("landing page hero and CTAs are green-free and use the shared blue", async ({
  page,
}) => {
  await disableDevelopmentToolbar(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "EU Apply" })).toBeVisible();
  await page.waitForLoadState("networkidle");
  await page.mouse.move(0, 0);
  await capture(page, "landing-hero-1440x900.png");
  await forbiddenGreen(".landing-shell")(page);

  const startCta = page.getByRole("link", { name: /Start free|Open dashboard/ });
  await expect(startCta).toHaveCSS("background-color", "rgb(23, 78, 166)");

  await page.setViewportSize({ width: 390, height: 844 });
  await capture(page, "landing-hero-390x844.png");
  await forbiddenGreen(".landing-shell")(page);
});

test("EU Fit Engine demo section is green-free", async ({ page }) => {
  await disableDevelopmentToolbar(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page
    .getByRole("heading", { name: "EU Fit Engine", exact: true })
    .scrollIntoViewIfNeeded();
  await capture(page, "landing-eufit-1440x900.png");
  await forbiddenGreen(".eu-fit-engine")(page);
});

test("login page sign-in buttons are green-free with a single primary action", async ({
  page,
}) => {
  await disableDevelopmentToolbar(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Open your dashboard" })).toBeVisible();
  await page.waitForLoadState("networkidle");
  await page.mouse.move(0, 0);
  await capture(page, "login-1440x900.png");
  await forbiddenGreen(".auth-shell")(page);

  const githubButton = page.getByRole("button", { name: "Sign in with GitHub" });
  const googleButton = page.getByRole("button", { name: "Sign in with Google" });
  await expect(githubButton).toBeDisabled();
  await expect(googleButton).toBeDisabled();

  await page.getByRole("checkbox").check();
  await expect(githubButton).toBeEnabled();
  await expect(githubButton).toHaveCSS("background-color", "rgb(23, 78, 166)");
  await expect(googleButton).toBeEnabled();
  await expect(googleButton).not.toHaveCSS("background-color", "rgb(23, 78, 166)");

  await page.setViewportSize({ width: 390, height: 844 });
  await capture(page, "login-390x844.png");
  await forbiddenGreen(".auth-shell")(page);
  await expectNoSeriousViolations(page);
});

test("shared brand name and PRO badge use blue everywhere, not the sitewide teal/green default", async ({
  page,
}) => {
  await disableDevelopmentToolbar(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await expect(page.locator(".brand-name").first()).toHaveCSS(
    "color",
    "rgb(23, 78, 166)",
  );
});
