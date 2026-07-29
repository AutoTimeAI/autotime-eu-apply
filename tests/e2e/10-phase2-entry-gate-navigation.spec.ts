import { expect, test, type Page } from "@playwright/test";
import { seedReadyDashboardProfile } from "./helpers";

const destinations = [
  ["Overview", "/dashboard"],
  ["Jobs", "/dashboard/jobs"],
  ["Applications", "/dashboard/applications"],
  ["International", "/dashboard/international"],
  ["Profile", "/dashboard/autofill-profile"],
  ["Insights", "/dashboard/insights"],
] as const;

async function verifyDestinations(page: Page) {
  await seedReadyDashboardProfile(page);
  await page.goto("/dashboard");
  const workflow = page.getByRole("complementary", {
    name: "Workflow navigation",
  });

  for (const [label, path] of destinations) {
    const link = workflow.getByRole("link", { name: new RegExp(label) });
    await expect(link).toBeVisible();
    await link.focus();
    await expect(link).toBeFocused();
    await link.press("Enter");
    await expect(page).toHaveURL(new RegExp(`${path.replaceAll("/", "\\/")}$`));
    await expect(page.locator("main, .dashboard-page").first()).toBeVisible();
    await expect(
      workflow.getByRole("link", { name: new RegExp(label) }),
    ).toHaveAttribute("aria-current", "page");
  }

  await page.getByRole("button", { name: /test\.user@example\.com/i }).click();
  await expect(
    page.getByRole("menuitem", { name: "Extension" }),
  ).toHaveAttribute("href", "/dashboard/extension");
  await expect(
    page.getByRole("menuitem", { name: "Settings" }),
  ).toHaveAttribute("href", "/dashboard/settings");
  await expect(page.getByRole("menuitem", { name: "Plans" })).toHaveAttribute(
    "href",
    "/pricing",
  );
}

test("desktop grouped navigation keeps all six destinations reachable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await verifyDestinations(page);
});

test("mobile grouped navigation remains keyboard reachable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await verifyDestinations(page);
  await expect(page.locator("body")).not.toHaveCSS("overflow-x", "scroll");
});
