import { expect, test, type Locator, type Page } from "@playwright/test";
import { seedReadyDashboardProfile } from "./helpers";

const destinations = [
  ["Home", "/dashboard"],
  ["Career Direction", "/dashboard/role-pathways"],
  ["Jobs", "/dashboard/jobs"],
  ["Applications", "/dashboard/applications"],
  ["Interviews", "/dashboard/interviews"],
  ["Countries", "/dashboard/international"],
  ["Profile", "/dashboard/autofill-profile"],
] as const;

const primaryMobileDestinations = [
  ["Home", "/dashboard"],
  ["Jobs", "/dashboard/jobs"],
  ["Applications", "/dashboard/applications"],
  ["Interviews", "/dashboard/interviews"],
] as const;

const moreMobileDestinations = [
  ["Career Direction", "/dashboard/role-pathways"],
  ["Countries", "/dashboard/international"],
  ["Profile", "/dashboard/autofill-profile"],
] as const;

async function assertLanded(
  page: Page,
  path: string,
  workflow: Locator,
  label: string,
) {
  await page.waitForLoadState("networkidle");
  await expect(page).toHaveURL(new RegExp(`${path.replaceAll("/", "\\/")}$`));
  await expect(
    page.locator("main, .dashboard-page, .home-experience").first(),
  ).toBeVisible();
  await expect(
    workflow.getByRole("link", { name: new RegExp(label) }),
  ).toHaveAttribute("aria-current", "page");
}

async function assertAccountMenu(page: Page) {
  await page.waitForLoadState("networkidle");
  await page.locator(".user-nav-trigger").click();
  await expect(page.locator(".user-nav-menu")).toBeVisible();
  await expect(
    page.getByRole("menuitem", { name: "Extension" }),
  ).toHaveAttribute("href", "/dashboard/extension");
  await expect(
    page.getByRole("menuitem", { name: "Settings" }),
  ).toHaveAttribute("href", "/dashboard/settings");
  await expect(
    page.getByRole("menuitem", { name: "Billing & Plan" }),
  ).toBeVisible();
}

test("desktop grouped navigation keeps all seven destinations reachable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await seedReadyDashboardProfile(page);
  await page.addInitScript(() =>
    window.localStorage.setItem("autotime-analytics-consent", "denied"),
  );
  await page.goto("/dashboard", { waitUntil: "networkidle" });
  const workflow = page.getByRole("complementary", {
    name: "Workflow navigation",
  });

  for (const [label, path] of destinations) {
    const link = workflow.getByRole("link", { name: new RegExp(label) });
    await expect(link).toBeVisible();
    await link.focus();
    await expect(link).toBeFocused();
    await link.press("Enter");
    await assertLanded(page, path, workflow, label);
  }

  await assertAccountMenu(page);
});

test("mobile grouped navigation remains keyboard reachable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedReadyDashboardProfile(page);
  await page.addInitScript(() =>
    window.localStorage.setItem("autotime-analytics-consent", "denied"),
  );
  await page.goto("/dashboard", { waitUntil: "networkidle" });
  const mobileNav = page.getByRole("navigation", {
    name: "Mobile workflow navigation",
  });

  for (const [label, path] of primaryMobileDestinations) {
    const link = mobileNav.getByRole("link", { name: label, exact: true });
    await expect(link).toBeVisible();
    await link.focus();
    await expect(link).toBeFocused();
    await link.press("Enter");
    await assertLanded(page, path, mobileNav, label);
  }

  for (const [label, path] of moreMobileDestinations) {
    await page.waitForLoadState("networkidle");
    const link = mobileNav.getByRole("link", { name: label, exact: true });
    if (!(await link.isVisible())) {
      await mobileNav.getByText("More").click();
    }
    await expect(link).toBeVisible();
    await link.click();
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(new RegExp(`${path.replaceAll("/", "\\/")}$`));
    await expect(
      page.locator("main, .dashboard-page, .home-experience").first(),
    ).toBeVisible();
    const reopenedLink = mobileNav.getByRole("link", {
      name: label,
      exact: true,
    });
    if (!(await reopenedLink.isVisible())) {
      await mobileNav.getByText("More").click();
    }
    await expect(reopenedLink).toHaveAttribute("aria-current", "page");
  }

  await assertAccountMenu(page);
  await expect(page.locator("body")).not.toHaveCSS("overflow-x", "scroll");
});
