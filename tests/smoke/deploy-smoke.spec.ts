import { expect, test } from "@playwright/test";

test("critical deploy surfaces respond without client errors", async ({ page, request }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "EU Apply" })).toBeVisible();

  // WebKit can still have a homepage navigation in flight after the heading
  // becomes visible. Use a fresh tab so that late navigation cannot interrupt
  // the independent login/deploy surface check.
  const appPage = await page.context().newPage();
  appPage.on("pageerror", (error) => pageErrors.push(error.message));
  await appPage.goto("/login", { waitUntil: "domcontentloaded" });
  await expect(appPage.getByRole("heading", { name: "Open your dashboard" })).toBeVisible();
  await expect(appPage.getByRole("button", { name: /Sign in with GitHub|Continue to dashboard/ })).toBeVisible();

  await appPage.goto("/dashboard", { waitUntil: "domcontentloaded" });
  await expect(appPage.locator(".dashboard-app-shell, .dashboard-brand-stage")).toBeVisible();
  await expect(appPage).toHaveURL(/\/dashboard(?:\/onboarding)?/);

  const jobsResponse = await request.get("/dashboard/jobs/browse", { maxRedirects: 0 });
  expect(jobsResponse.status(), "Jobs browse returned a server error").toBeLessThan(500);

  const account = await request.get("/api/account/me");
  expect(account.ok(), `Core account API returned ${account.status()}`).toBeTruthy();
  await expect.poll(() => pageErrors).toEqual([]);
});
