import { expect, test } from "@playwright/test";

const userId = "00000000-0000-4000-8000-000000000001";
const backendEvidence =
  "Backend engineer with 7 years of TypeScript, Node.js, PostgreSQL, REST APIs, AWS, Docker, Kubernetes, CI/CD, production incident response and mentoring. Built payment services and reduced API latency by 35 percent.";

test("confirmed backend evidence produces and persists a user-scoped primary lane", async ({
  page,
}) => {
  await page.addInitScript(({ userId }) => {
    if (sessionStorage.getItem("role-pathways-fixture-seeded")) return;
    localStorage.removeItem("autotime-role-pathways:v1:" + userId);
    localStorage.removeItem(
      "autotime-role-pathways:v1:99999999-9999-4999-8999-999999999999",
    );
    localStorage.setItem("autotime-analytics-consent", "denied");
    sessionStorage.setItem("role-pathways-fixture-seeded", "true");
  }, { userId });

  await page.goto("/dashboard/role-pathways");
  await page.waitForTimeout(500);
  await page
    .getByRole("textbox", { name: "CV, project and experience evidence" })
    .fill(backendEvidence);
  await page.getByRole("button", { name: "Extract evidence", exact: true }).click();

  const confirmationLabels = page.locator("label.confirm-switch");
  await expect(confirmationLabels).not.toHaveCount(0);
  for (let index = 0; index < (await confirmationLabels.count()); index += 1)
    await confirmationLabels.nth(index).click();
  await expect(
    page.getByRole("checkbox", { name: "Confirm" }).first(),
  ).toBeChecked();

  await page.getByRole("button", { name: "Preferences →", exact: true }).click();
  await page
    .getByRole("button", { name: "Generate recommended pathways →", exact: true })
    .click();

  const directSoftwareRole = page.getByRole("button", {
    name: /applications programmer.*direct match/i,
  });
  await expect(directSoftwareRole).toBeVisible();
  await directSoftwareRole.click();
  await page
    .getByRole("button", { name: "Select career lanes →", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Primary lane" })
    .selectOption("2514.1");
  await page.getByRole("button", { name: "Save career lanes" }).click();
  await expect(page.getByRole("status")).toContainText("saved");

  const saved = await page.evaluate(
    ({ userId }) =>
      JSON.parse(
        localStorage.getItem("autotime-role-pathways:v1:" + userId) ?? "null",
      ),
    { userId },
  );
  expect(saved).toMatchObject({ userId, primary: "2514.1" });
  await page.reload();
  expect(
    await page.evaluate(
      ({ userId }) =>
        JSON.parse(
          localStorage.getItem("autotime-role-pathways:v1:" + userId) ?? "null",
        )?.primary,
      { userId },
    ),
  ).toBe("2514.1");
  expect(
    await page.evaluate(() =>
      localStorage.getItem(
        "autotime-role-pathways:v1:99999999-9999-4999-8999-999999999999",
      ),
    ),
  ).toBeNull();
});