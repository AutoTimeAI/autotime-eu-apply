// Complements 11-mobility-persistence.spec.ts by covering account-level
// side effects rather than sync mechanics: deleting the account profile
// (from Settings) cascades to removing the browser's local mobility copy,
// but signing out does not; and a "Remove from this browser" action for the
// active user must not touch another account's mobility storage key.
import { expect, test, type Route } from "@playwright/test";
import { sampleUser } from "../fixtures/sample-user";
import { seedReadyDashboardProfile } from "./helpers";

const mobilityKey = `autotime-international-mobility:v1:${sampleUser.id}`;
const profile = {
  schemaVersion: 1,
  currentCountry: "Spain",
  targetCountries: ["Ireland"],
  applicantPosition: "local-work-authorised",
  sponsorshipRequired: "no",
  relocationPreference: "yes",
};

function json(route: Route, data: unknown, status = 200) {
  return route.fulfill({
    contentType: "application/json",
    status,
    body: JSON.stringify(data),
  });
}

test("new user, account-profile deletion and logout retention are explicit", async ({
  page,
}) => {
  await page.route("**/api/sync/mobility", async (route) => {
    if (route.request().method() === "DELETE")
      return json(route, { data: { deleted: true }, error: null });
    return json(route, { data: null, error: null });
  });
  await page.goto("/dashboard/international", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "My mobility", exact: true }).click();
  await expect(
    page.getByText("No mobility profile has been saved yet."),
  ).toBeVisible();

  await page.evaluate(
    ({ key, stored }) => localStorage.setItem(key, JSON.stringify(stored)),
    { key: mobilityKey, stored: profile },
  );
  await seedReadyDashboardProfile(page);
  await page.route("**/api/sync/profile", (route) =>
    json(route, { data: { deleted: true }, error: null }),
  );
  await page.goto("/dashboard/settings", { waitUntil: "networkidle" });
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete account profile" }).click();
  await expect(
    page.getByText(/browser mobility copy was also removed/i),
  ).toBeVisible();
  expect(
    await page.evaluate((key) => localStorage.getItem(key), mobilityKey),
  ).toBeNull();

  await page.evaluate(
    ({ key, stored }) => localStorage.setItem(key, JSON.stringify(stored)),
    { key: mobilityKey, stored: profile },
  );
  await page.route("**/auth/signout", (route) =>
    json(route, { data: { signedOut: true }, error: null }),
  );
  await page.getByRole("button", { name: /test\.user@example\.com/i }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await page.waitForTimeout(1_000);
  await page.goto("/");
  expect(
    await page.evaluate((key) => localStorage.getItem(key), mobilityKey),
  ).not.toBeNull();
});

test("active-user browser deletion does not remove another account key", async ({
  page,
}) => {
  const otherKey = "autotime-international-mobility:v1:another-user";
  await page.addInitScript(
    ({ activeKey, other, stored }) => {
      localStorage.setItem(activeKey, JSON.stringify(stored));
      localStorage.setItem(other, JSON.stringify({ private: true }));
    },
    { activeKey: mobilityKey, other: otherKey, stored: profile },
  );
  const record = {
    profile,
    schemaVersion: 1,
    updatedAt: "2026-07-29T12:01:00.000Z",
    ownerContext: "authenticated-user",
    consent: {
      version: 1,
      grantedAt: "2026-07-29T12:00:00.000Z",
    },
    syncEnabled: true,
  };
  await page.route("**/api/sync/mobility", (route) =>
    json(route, { data: record, error: null }),
  );
  await page.goto("/dashboard/international", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "My mobility", exact: true }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Remove from this browser" }).click();
  expect(
    await page.evaluate((key) => localStorage.getItem(key), mobilityKey),
  ).toBeNull();
  expect(
    await page.evaluate((key) => localStorage.getItem(key), otherKey),
  ).not.toBeNull();
});
