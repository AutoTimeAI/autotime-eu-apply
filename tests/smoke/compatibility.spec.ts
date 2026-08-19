import { expect, test } from "@playwright/test";

test("public compatibility matrix is honest and usable", async ({ page }) => {
  await page.goto("/compatibility");
  await expect(page.getByRole("heading", { name: "Know what works before you apply." })).toBeVisible();
  await expect(page.getByRole("table")).toBeVisible();
  await expect(page.getByRole("row", { name: /LinkedIn Manual only Manual only/ })).toBeVisible();
  await expect(page.getByText("26", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Report an unsupported site" })).toBeVisible();
  await expect(page.getByText(/AutoTime never submits an external application/)).toBeVisible();
});

test("compatibility matrix remains accessible on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/compatibility");
  await expect(page.getByRole("heading", { name: "Know what works before you apply." })).toBeVisible();
  await expect(page.getByLabel("Platform")).toBeVisible();
  await expect(page.getByLabel("Public job or application URL")).toBeVisible();
  await expect(page.locator("[data-nextjs-dialog]")).toHaveCount(0);
});
