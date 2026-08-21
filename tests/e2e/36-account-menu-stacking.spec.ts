import { expect, test } from "@playwright/test";
import { seedReadyDashboardProfile } from "./helpers";

// Regression coverage for a real production defect: the account dropdown
// (UserNav) and its main-content sibling (.dashboard-body) are both direct
// children of .dashboard-app-shell, and a blanket rule in phase-1-brand.css
// gives every such child the same z-index so it can layer above the brand
// backdrop. That flattened the topbar's intended higher z-index down to a
// tie with page content, so on pages whose header renders an action button
// near the same top-right corner (e.g. Profile's "Review evidence &
// readiness"), that button visually intercepted clicks meant for the open
// account menu. See apps/web/app/dashboard/phase-1-brand.css.
test("the account menu stays clickable on a page with a page-header action button", async ({
  page,
}) => {
  await seedReadyDashboardProfile(page);
  await page.goto("/dashboard/profile", { waitUntil: "networkidle" });

  await page.locator(".user-nav-trigger").click();
  const settings = page.getByRole("menuitem", { name: "Settings" });
  await expect(settings).toBeVisible();
  await settings.click();
  await expect(page).toHaveURL(/\/dashboard\/settings$/);
});
