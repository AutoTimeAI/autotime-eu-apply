import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const viewports = [
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
  { width: 360, height: 800 },
];

test.beforeAll(async () => {
  await mkdir(path.join("screenshots", "phase-1-home", "after"), {
    recursive: true,
  });
});

test("Home keeps one action and every primary journey reachable", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem("autotime-analytics-consent", "denied");
    window.__AUTOTIME_HOME_TEST_FIXTURE__ = {
      context: {
        hasCareerEvidence: false,
        hasCareerLane: false,
        hasTargetCountry: false,
        hasSavedJob: false,
        hasUnanalysedJob: false,
        hasSuitableAnalysedJob: false,
        hasReadyApplication: false,
        hasFollowUpDue: false,
        hasInterview: false,
      },
    };
  });

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto("/dashboard", { waitUntil: "networkidle" });

    const primaryActions = page.locator(
      ".home-experience a.primary-button, .home-experience button:not(.secondary-button):not(.text-button)",
    );
    await expect(primaryActions).toHaveCount(1);

    const mobile = viewport.width <= 900;
    const workflowNav = page.locator(
      mobile ? ".mobile-workflow-nav" : ".dashboard-workflow-nav",
    );
    for (const name of ["Home", "Jobs", "Applications", "Interviews"]) {
      await expect(
        workflowNav.getByRole("link", { name, exact: true }),
      ).toBeVisible();
    }
    if (mobile) {
      const more = workflowNav.locator(".mobile-more-menu");
      await more.locator("summary").click();
      for (const name of ["Career Direction", "Countries", "Profile"]) {
        await expect(
          more.getByRole("link", { name, exact: true }),
        ).toBeVisible();
      }
      await more.locator("summary").click();
    } else {
      for (const name of ["Career Direction", "Countries", "Profile"]) {
        await expect(
          workflowNav.getByRole("link", { name, exact: true }),
        ).toBeVisible();
      }
    }

    const metrics = await page.evaluate(() => ({
      overflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      words: (document.querySelector(".home-experience")?.textContent ?? "")
        .trim()
        .split(/\s+/)
        .filter(Boolean).length,
      panels: document.querySelectorAll(
        ".home-experience .next-best-action-card,.home-experience .home-progress",
      ).length,
    }));
    expect(metrics.overflow).toBeLessThanOrEqual(1);
    expect(metrics.words).toBeLessThan(100);
    expect(metrics.panels).toBe(2);

    await page.screenshot({
      path: path.join(
        "screenshots",
        "phase-1-home",
        "after",
        `home-after-exact-${viewport.width}x${viewport.height}.png`,
      ),
      fullPage: false,
    });
  }
});
