import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const userId = "00000000-0000-4000-8000-000000000001";
const output = "screenshots/phase-3-applications/review";
const now = "2026-08-04T09:00:00.000Z";

type Stage =
  | "Preparing"
  | "Needs review"
  | "Ready"
  | "Applied"
  | "Interview"
  | "Offer"
  | "Rejected"
  | "Withdrawn";

type AppSeed = {
  id: string;
  stage: Stage;
  claims?: string[];
  complete?: boolean;
};

const sourced = (value: string) => ({
  state: "user-confirmed",
  value,
  sourceText: value,
});
const missing = () => ({ state: "missing", value: "" });
function job(id: string, role: string, employer: string, location: string) {
  return {
    id,
    analysisHistory: [
      {
        capability: [
          {
            evidence: ["Confirmed profile evidence"],
            requirement: "SQL and stakeholder communication",
            sourceText: "Strong SQL and stakeholder communication required",
            state: "confirmed",
          },
        ],
        confidence: "High",
        coverage: 100,
        createdAt: now,
        criticalRisk: "None recorded",
        decision: "Apply",
        id: `analysis-${id}`,
        nextAction: "Prepare application",
        positiveEvidence: "Confirmed evidence",
        reason: "Evidence supports preparation.",
        unknowns: [],
        version: 1,
      },
    ],
    analysisState: "Analysed",
    applicationId: `app-${id}`,
    capturedAt: now,
    description:
      "A deterministic fictional vacancy used only by an authorised local test principal.",
    employer: sourced(employer),
    facts: {
      contract: sourced("permanent"),
      country: sourced(location.split(", ").at(-1) || "Germany"),
      education: missing(),
      employmentType: sourced("permanent"),
      experience: sourced("Senior"),
      language: sourced("English"),
      location: sourced(location),
      salary: missing(),
      sponsorship: missing(),
      workArrangement: sourced("Hybrid"),
      workAuthorisation: missing(),
    },
    lane: "Product analytics",
    source: "Development fixture",
    sourceUrl: "https://example.test/vacancy",
    title: sourced(role),
    updatedAt: now,
  };
}
function application(seed: AppSeed) {
  const complete =
    seed.complete ??
    ["Ready", "Applied", "Interview", "Offer", "Rejected"].includes(seed.stage);
  return {
    appliedAt: ["Applied", "Interview", "Offer", "Rejected"].includes(
      seed.stage,
    )
      ? now
      : undefined,
    applicationChannel:
      seed.stage === "Applied" ? "Company careers site" : undefined,
    checklist: complete
      ? [
          true,
          true,
          true,
          true,
          true,
          true,
          seed.stage !== "Needs review",
          seed.stage === "Applied",
        ]
      : [true, false, false, false, false, false, false, false],
    consequentialAnswersReviewed: complete,
    coverLetterRequested: false,
    createdAt: now,
    documentVersions: seed.stage === "Applied" ? ["CV v3"] : [],
    evidenceConfirmed: complete,
    followUpDate: seed.stage === "Applied" ? "2026-08-11" : undefined,
    id: `app-${seed.id}`,
    jobId: seed.id,
    referenceNumber: seed.stage === "Applied" ? "AUT-2048" : undefined,
    screeningAnswers: [],
    selectedCvVersion: "Confirmed profile",
    status: seed.stage,
    submissionConfirmed: seed.stage === "Applied",
    unsupportedClaims: seed.claims ?? [],
    updatedAt: now,
  };
}
function fixture(apps: AppSeed[]) {
  const roles = [
    ["Senior Product Analyst", "Northstar Systems", "Berlin, Germany"],
    ["Analytics Lead", "Contoso Mobility", "Amsterdam, Netherlands"],
    ["Product Operations Manager", "Fabrikam Cloud", "Dublin, Ireland"],
    ["Data Product Manager", "Adventure Works", "Paris, France"],
  ];
  return {
    schemaVersion: 1,
    jobs: apps.map((item, index) =>
      job(
        item.id,
        roles[index % roles.length][0],
        roles[index % roles.length][1],
        roles[index % roles.length][2],
      ),
    ),
    applications: apps.map(application),
  };
}
async function seed(
  page: Page,
  apps: AppSeed[],
  systemState?: "loading" | "unavailable",
) {
  const state = fixture(apps);
  if (page.url() === "about:blank") {
    await page.addInitScript(
      ({ state, systemState, userId }) => {
        if (sessionStorage.getItem("phase-3-applications-fixture-seeded"))
          return;
        localStorage.setItem(
          `autotime-phase-3b-workflow-v1:${userId}`,
          JSON.stringify(state),
        );
        localStorage.setItem("autotime-analytics-consent", "denied");
        if (systemState)
          localStorage.setItem(
            "autotime-phase-3-applications-system-state",
            systemState,
          );
        else
          localStorage.removeItem("autotime-phase-3-applications-system-state");
        sessionStorage.setItem("phase-3-applications-fixture-seeded", "true");
      },
      { state, systemState, userId },
    );
    return;
  }
  await page.evaluate(
    ({ state, systemState, userId }) => {
      localStorage.setItem(
        `autotime-phase-3b-workflow-v1:${userId}`,
        JSON.stringify(state),
      );
      if (systemState)
        localStorage.setItem(
          "autotime-phase-3-applications-system-state",
          systemState,
        );
      else
        localStorage.removeItem("autotime-phase-3-applications-system-state");
    },
    { state, systemState, userId },
  );
}
async function disableDevelopmentToolbar(page: Page) {
  const response = await page.request.post(
    "http://127.0.0.1:3000/__nextjs_devtools_config",
    { data: { disableDevIndicator: true } },
  );
  expect(response.ok()).toBe(true);
}
async function assertVisualContract(page: Page) {
  await page.mouse.move(0, 0);
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement)
      document.activeElement.blur();
  });
  await expect(page.locator("main.phase-three-applications")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(
    await page
      .locator("main.phase-three-applications .button-primary:visible")
      .count(),
  ).toBeLessThanOrEqual(1);
  const forbidden = await page
    .locator("main.phase-three-applications *")
    .evaluateAll((elements) => {
      const green = (value: string) => {
        const match = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (!match) return false;
        const [, r, g, b] = match.map(Number);
        return g > r * 1.08 && g > b * 1.04 && g > 70;
      };
      return elements.flatMap((element) => {
        const style = getComputedStyle(element);
        const values = [
          style.color,
          style.backgroundColor,
          style.borderColor,
          style.boxShadow,
        ];
        return values.some(green)
          ? [{ tag: element.tagName, className: element.className, values }]
          : [];
      });
    });
  expect(forbidden).toEqual([]);
  expect(
    await page.evaluate(() => {
      const visible = (element: Element) => {
        const box = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return (
          box.width > 0 &&
          box.height > 0 &&
          style.display !== "none" &&
          style.visibility !== "hidden"
        );
      };
      let found = false;
      const visit = (root: Document | ShadowRoot) => {
        for (const element of root.querySelectorAll(
          "[data-next-badge], [data-nextjs-dialog]",
        ))
          if (visible(element)) found = true;
        for (const element of root.querySelectorAll("*"))
          if (element.shadowRoot) visit(element.shadowRoot);
      };
      visit(document);
      return found;
    }),
  ).toBe(false);
  const targets = await page
    .locator(
      "main.phase-three-applications button:visible, main.phase-three-applications a:visible, main.phase-three-applications summary:visible",
    )
    .evaluateAll((elements) =>
      elements.map((element) => {
        const box = element.getBoundingClientRect();
        return { width: box.width, height: box.height };
      }),
    );
  expect(
    targets.every(({ width, height }) => width >= 44 || height >= 44),
  ).toBe(true);
  const nav = page.locator(".dashboard-mobile-nav:visible");
  if (await nav.count()) {
    const navBox = await nav.boundingBox();
    const primary = page.locator(
      "main.phase-three-applications .button-primary:visible",
    );
    if (navBox && (await primary.count())) {
      const buttonBox = await primary.boundingBox();
      if (buttonBox)
        expect(buttonBox.y + buttonBox.height).toBeLessThanOrEqual(navBox.y);
    }
  }
}
async function capture(page: Page, path: string) {
  await assertVisualContract(page);
  await page.screenshot({ path: `${output}/${path}`, fullPage: false });
}

test.beforeAll(async () => mkdir(output, { recursive: true }));

test("pipeline states and stage filters are operational", async ({ page }) => {
  await disableDevelopmentToolbar(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await seed(page, []);
  await page.goto("/dashboard/applications");
  await expect(
    page.getByRole("heading", { name: "No applications yet" }),
  ).toBeVisible();
  await capture(page, "pipeline-empty-1440x900.png");
  await page.setViewportSize({ width: 390, height: 844 });
  await capture(page, "pipeline-empty-390x844.png");

  await seed(page, [
    { id: "one", stage: "Preparing" },
    {
      id: "two",
      stage: "Needs review",
      claims: ["Invented 40% efficiency improvement"],
    },
    { id: "three", stage: "Ready", complete: true },
    { id: "four", stage: "Applied", complete: true },
  ]);
  await page.reload();
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(
    page.getByRole("heading", { name: "Senior Product Analyst" }),
  ).toBeVisible();
  await expect(page.getByText(/Unsupported claim/)).toBeVisible();
  await capture(page, "pipeline-multiple-stages-1440x900.png");
  await page.setViewportSize({ width: 390, height: 844 });
  await capture(page, "pipeline-multiple-stages-390x844.png");

  const preparing = page.getByRole("button", { name: /Preparing 1/ });
  await preparing.focus();
  await expect(preparing).toHaveCSS("outline-color", "rgb(81, 69, 205)");
  await preparing.click();
  await expect(page.getByRole("article")).toHaveCount(1);
});

test("blocked, ready, applied and rejected detail states preserve transitions", async ({
  page,
}) => {
  await disableDevelopmentToolbar(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await seed(page, [
    {
      id: "blocked",
      stage: "Needs review",
      claims: ["Invented 40% efficiency improvement"],
      complete: true,
    },
  ]);
  await page.goto("/dashboard/applications/app-blocked");
  await expect(page.getByRole("button", { name: "Mark ready" })).toBeDisabled();
  await expect(page.getByText(/Blocked: remove or correct/)).toBeVisible();
  const mapping = page.getByText("View evidence mappings");
  await expect(mapping.locator("xpath=..")).not.toHaveAttribute("open", "");
  await mapping.click();
  await expect(mapping.locator("xpath=..")).toHaveAttribute("open", "");
  await capture(page, "blocked-unsupported-claim-1440x900.png");
  await page.setViewportSize({ width: 390, height: 844 });
  await capture(page, "blocked-unsupported-claim-390x844.png");

  await seed(page, [{ id: "ready", stage: "Ready", complete: true }]);
  await page.goto("/dashboard/applications/app-ready");
  await expect(
    page.getByRole("button", { name: "Mark as applied" }),
  ).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 900 });
  await capture(page, "ready-application-1440x900.png");
  await page.setViewportSize({ width: 390, height: 844 });
  await capture(page, "ready-application-390x844.png");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Mark as applied" }).click();
  await expect(
    page.getByRole("heading", { name: "Submission record" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      ({ userId }) =>
        JSON.parse(
          localStorage.getItem(`autotime-phase-3b-workflow-v1:${userId}`) ||
            "null",
        ).applications[0].submissionConfirmed,
      { userId },
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 1440, height: 900 });
  await capture(page, "applied-confirmation-1440x900.png");
  await page.setViewportSize({ width: 390, height: 844 });
  await capture(page, "applied-confirmation-390x844.png");

  await seed(page, [{ id: "rejected", stage: "Rejected", complete: true }]);
  await page.goto("/dashboard/applications/app-rejected");
  await expect(page.getByText("Rejected", { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 900 });
  await capture(page, "rejected-application-1440x900.png");
});

test("application detail is responsive at required intermediate viewports", async ({
  page,
}) => {
  await disableDevelopmentToolbar(page);
  await seed(page, [{ id: "detail", stage: "Needs review", complete: false }]);
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto("/dashboard/applications/app-detail");
  await capture(page, "application-detail-1024x768.png");
  await page.setViewportSize({ width: 768, height: 1024 });
  await capture(page, "application-detail-768x1024.png");
  await page.setViewportSize({ width: 360, height: 800 });
  await assertVisualContract(page);
});

test("loading and unavailable states are stable and private to test principals", async ({
  page,
}) => {
  await disableDevelopmentToolbar(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await seed(page, [], "loading");
  await page.goto("/dashboard/applications");
  await expect(page.getByRole("status")).toHaveText(
    /Loading your private application workspace/,
  );
  await capture(page, "loading-390x844.png");

  await seed(page, [], "unavailable");
  await page.reload();
  await expect(page.locator('section[role="alert"]')).toContainText(
    "temporarily unavailable",
  );
  await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
  await capture(page, "unavailable-390x844.png");
});
