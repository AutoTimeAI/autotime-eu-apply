import { expect, test } from "@playwright/test";

test("critical deploy surfaces respond without client errors", async ({ page, request }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "EU Apply" })).toBeVisible();

  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Open your dashboard" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Sign in with GitHub|Continue to dashboard/ })).toBeVisible();

  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".dashboard-app-shell, .dashboard-brand-stage")).toBeVisible();
  await expect(page).toHaveURL(/\/dashboard(?:\/onboarding)?/);

  const jobsResponse = await page.goto("/dashboard/jobs/browse", { waitUntil: "domcontentloaded" });
  expect(jobsResponse?.status() ?? 500, "Jobs browse returned a server error").toBeLessThan(500);
  await expect(page.locator("main, .dashboard-brand-stage")).toBeVisible();

  const account = await request.get("/api/account/me");
  expect(account.ok(), `Core account API returned ${account.status()}`).toBeTruthy();
  await expect.poll(() => pageErrors).toEqual([]);
});
