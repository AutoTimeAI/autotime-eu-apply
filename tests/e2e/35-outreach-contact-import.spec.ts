import { expect, test } from "@playwright/test";

test("contact CSV requires review and consent before prefilling outreach", async ({ page }) => {
  let saved = false;
  let submitted: Record<string, unknown> | null = null;
  await page.route(/\/api\/outreach$/, (route) => route.fulfill({ json: { data: { messages: [], jobs: [] }, error: null } }));
  await page.route("**/api/outreach/contacts", async (route) => {
    if (route.request().method() === "POST") {
      submitted = route.request().postDataJSON();
      saved = true;
      await route.fulfill({ json: { data: { imported: 1, duplicates: 0 }, error: null } });
      return;
    }
    await route.fulfill({ json: { data: saved ? [{ id: "contact-1", name: "Jane Doe", role: "Talent Lead", company: "Example EU", email: "jane@example.com", profile_url: null, contact_type: "hiring_manager" }] : [], error: null } });
  });

  const contactsLoaded = page.waitForResponse((response) => response.request().method() === "GET" && response.url().includes("/api/outreach/contacts"));
  await page.goto("/dashboard/follow-ups");
  await contactsLoaded;
  await page.getByLabel("Contact CSV").setInputFiles({
    name: "contacts.csv", mimeType: "text/csv",
    buffer: Buffer.from("name,company,email,role,contact type\nJane Doe,Example EU,jane@example.com,Talent Lead,hiring manager"),
  });
  await expect(page.getByRole("cell", { name: "Jane Doe" })).toBeVisible();
  const importButton = page.getByRole("button", { name: "Import 1 contacts" });
  await expect(importButton).toBeDisabled();
  await page.getByLabel(/I confirm I am permitted/).check();
  await importButton.click();
  await expect(page.getByRole("region", { name: "Import outreach contacts" }).getByRole("status")).toContainText("Imported 1");
  expect(submitted).toMatchObject({ consent: true, contacts: [{ name: "Jane Doe", company: "Example EU", email: "jane@example.com", contactType: "hiring_manager" }] });

  await page.getByRole("button", { name: "Use in draft" }).click();
  await expect(page.getByLabel(/recruiter name/i)).toHaveValue("Jane Doe");
  await expect(page.getByLabel(/recruiter role/i)).toHaveValue("Talent Lead");
  await expect(page.getByLabel(/recruiter email/i)).toHaveValue("jane@example.com");
});
