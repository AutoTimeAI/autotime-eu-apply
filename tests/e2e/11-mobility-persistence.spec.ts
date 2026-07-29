import { expect, test, type Page, type Route } from "@playwright/test";
import { sampleUser } from "../fixtures/sample-user";

const mobilityKey = `autotime-international-mobility:v1:${sampleUser.id}`;
const profile = {
  schemaVersion: 1,
  currentCountry: "Spain",
  targetCountries: ["Ireland"],
  applicantPosition: "local-work-authorised",
  sponsorshipRequired: "no",
  relocationPreference: "yes",
};
const consent = {
  version: 1,
  grantedAt: "2026-07-29T12:00:00.000Z",
};

function record(serverProfile = profile) {
  return {
    profile: serverProfile,
    schemaVersion: 1,
    updatedAt: "2026-07-29T12:01:00.000Z",
    ownerContext: "authenticated-user",
    consent,
    syncEnabled: true,
  };
}

async function seedLocal(page: Page, value = profile) {
  await page.addInitScript(
    ({ key, stored }) => localStorage.setItem(key, JSON.stringify(stored)),
    { key: mobilityKey, stored: value },
  );
}

async function openMobility(page: Page) {
  await page.goto("/dashboard/international");
  await page.getByRole("button", { name: "My mobility", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Mobility data storage" }),
  ).toBeVisible();
}

function json(route: Route, data: unknown, status = 200) {
  return route.fulfill({
    contentType: "application/json",
    status,
    body: JSON.stringify(data),
  });
}

test("local-only profile requires consent and confirms successful sync", async ({
  page,
}) => {
  await seedLocal(page);
  let putCount = 0;
  await page.route("**/api/sync/mobility", async (route) => {
    if (route.request().method() === "GET")
      return json(route, { data: null, error: null });
    putCount += 1;
    const request = route.request().postDataJSON();
    expect(request).not.toHaveProperty("userId");
    expect(request.consent.version).toBe(1);
    return json(route, { data: record(request.profile), error: null });
  });
  await openMobility(page);
  await expect(
    page.getByText("Consent required", { exact: true }),
  ).toBeVisible();
  expect(putCount).toBe(0);
  await page
    .getByRole("button", { name: "I agree — save to my account" })
    .click();
  await expect(page.getByText("Synced", { exact: true })).toBeVisible();
  await expect(page.getByText(/Account copy confirmed/)).toBeVisible();
  expect(putCount).toBe(1);
});

test("declining consent remains local-only without an upload", async ({
  page,
}) => {
  await seedLocal(page);
  let writes = 0;
  await page.route("**/api/sync/mobility", async (route) => {
    if (route.request().method() !== "GET") writes += 1;
    return json(route, { data: null, error: null });
  });
  await openMobility(page);
  await expect(page.getByText(/decline by taking no action/i)).toBeVisible();
  expect(writes).toBe(0);
  expect(
    await page.evaluate((key) => localStorage.getItem(key), mobilityKey),
  ).not.toBeNull();
});

test("server-only and conflicting records reconcile without silent overwrite", async ({
  page,
}) => {
  const serverProfile = { ...profile, currentCountry: "Germany" };
  await page.route("**/api/sync/mobility", (route) =>
    json(route, { data: record(serverProfile), error: null }),
  );
  await openMobility(page);
  await expect(page.getByLabel("Current country")).toHaveValue("Germany");
  await expect(page.getByText("Synced", { exact: true })).toBeVisible();

  await page.close();
});

test("conflict resolution and failed-upload retry work on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedLocal(page);
  const serverProfile = { ...profile, currentCountry: "Germany" };
  let writes = 0;
  await page.route("**/api/sync/mobility", async (route) => {
    if (route.request().method() === "GET")
      return json(route, { data: record(serverProfile), error: null });
    writes += 1;
    if (writes === 1)
      return json(
        route,
        { data: null, error: "Temporary preview failure." },
        500,
      );
    const request = route.request().postDataJSON();
    return json(route, { data: record(request.profile), error: null });
  });
  await openMobility(page);
  await expect(page.getByText("Review needed", { exact: true })).toBeVisible();
  await page.getByText("Review differences").click();
  await expect(page.getByText("Browser target countries")).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Use this browser’s version" })
    .click();
  await expect(page.getByText("Sync error", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Retry account sync" }).click();
  await expect(page.getByText("Synced", { exact: true })).toBeVisible();
  await expect(page.locator("body")).not.toHaveCSS("overflow-x", "scroll");
});

test("browser removal, account deletion and disabled flag remain distinct", async ({
  page,
}) => {
  await seedLocal(page);
  await page.route("**/api/sync/mobility", async (route) => {
    if (route.request().method() === "DELETE")
      return json(route, { data: { deleted: true }, error: null });
    return json(route, { data: record(), error: null });
  });
  await openMobility(page);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Remove from this browser" }).click();
  expect(
    await page.evaluate((key) => localStorage.getItem(key), mobilityKey),
  ).toBeNull();
  await expect(page.getByText(/account copy remains/i)).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Delete account mobility profile" })
    .click();
  await expect(page.getByText(/deleted from your account/i)).toBeVisible();
});

test("offline and feature-disabled states fail closed", async ({ page }) => {
  await seedLocal(page);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: false,
    });
  });
  await page.route("**/api/sync/mobility", (route) => route.abort());
  await openMobility(page);
  await expect(page.getByText("Offline", { exact: true })).toBeVisible();

  await page.unroute("**/api/sync/mobility");
  await page.route("**/api/sync/mobility", (route) =>
    json(
      route,
      { data: null, error: "Mobility account sync is not enabled." },
      404,
    ),
  );
  await page.reload();
  await page.getByRole("button", { name: "My mobility", exact: true }).click();
  await expect(
    page.getByText("Account sync unavailable", { exact: true }),
  ).toBeVisible();
});
