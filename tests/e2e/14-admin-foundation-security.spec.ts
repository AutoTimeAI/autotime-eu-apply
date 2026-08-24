// Security-boundary test for the admin foundation: an ordinary authenticated
// (non-admin) user must not see an admin menu entry, must get 403 from
// admin API endpoints (both reads and mutations), and must be redirected
// away from /admin to a login page flagged with adminDenied=1. Captures
// desktop and mobile screenshots of the denied state for review.
import { expect, test } from "@playwright/test";

test("ordinary authenticated users cannot discover or access admin functions", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.addInitScript(() =>
    window.localStorage.setItem("autotime-analytics-consent", "denied"),
  );
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/dashboard");
  await page.locator(".user-nav-trigger").click();
  await expect(page.getByRole("menuitem", { name: /admin/i })).toHaveCount(0);

  for (const path of [
    "/api/admin/overview",
    "/api/admin/users",
    "/api/admin/feature-flags",
  ]) {
    expect((await page.request.get(path)).status(), path).toBe(403);
  }
  const mutationHeaders = {
    "Content-Type": "application/json",
    Origin: new URL(page.url()).origin,
  };
  const mutationRequests = [
    page.request.post("/api/admin/feature-flags", {
      data: { enabled: true, environment: "preview", expectedVersion: 0, key: "role_pathways_enabled" },
      headers: mutationHeaders,
    }),
    page.request.post("/api/admin/market-data/refresh", {
      data: { confirm: true, idempotencyKey: "preview_test_123", provider: "esco" },
      headers: mutationHeaders,
    }),
    page.request.post("/api/admin/users/10000000-0000-4000-8000-000000000001/beta-access", {
      data: { reason: "controlled test", status: "suspended" },
      headers: mutationHeaders,
    }),
  ];
  for (const response of await Promise.all(mutationRequests)) expect(response.status()).toBe(403);

  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login\?adminDenied=1$/);
  await expect(
    page.getByText(/not authorised|admin access/i).first(),
  ).toBeVisible();
  await page.screenshot({
    path: "screenshots/admin-foundation/admin-denied-1440.png",
    fullPage: true,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page.locator("body")).not.toHaveCSS("overflow-x", "scroll");
  await page.screenshot({
    path: "screenshots/admin-foundation/admin-denied-390.png",
    fullPage: true,
  });
});
