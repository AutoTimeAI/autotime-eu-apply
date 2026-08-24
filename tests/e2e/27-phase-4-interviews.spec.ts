// Exercises interview preparation and its links to applications and outcomes.
import { expect, test, type Page } from "@playwright/test";
import { expectNoSeriousViolations } from "./helpers/axe";
import { mkdir } from "node:fs/promises";

const userId = "00000000-0000-4000-8000-000000000001";
const output = "screenshots/phase-4-interviews/review";
const now = "2026-08-04T09:00:00.000Z";

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
            requirement: "Terraform automation",
            sourceText: "Terraform automation required",
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
    lane: "Cloud",
    source: "Development fixture",
    sourceUrl: "https://example.test/vacancy",
    title: sourced(role),
    updatedAt: now,
  };
}

function application(id: string) {
  return {
    appliedAt: now,
    applicationChannel: "Company careers site",
    checklist: Array(8).fill(true),
    consequentialAnswersReviewed: true,
    coverLetterRequested: false,
    createdAt: now,
    documentVersions: ["CV v3"],
    evidenceConfirmed: true,
    followUpDate: undefined,
    id: `app-${id}`,
    jobId: id,
    referenceNumber: "AUT-2048",
    screeningAnswers: [],
    selectedCvVersion: "Confirmed profile",
    status: "Interview",
    submissionConfirmed: true,
    unsupportedClaims: [],
    updatedAt: now,
  };
}

function question(idSuffix: string, evidenceStatus: string) {
  return {
    id: `iq-${idSuffix}`,
    category: "technical",
    question:
      "How would you apply Terraform automation, and what production evidence can you truthfully provide?",
    reason:
      "Linked to Terraform automation; current evidence is " +
      evidenceStatus +
      ".",
    sourceReferences: [
      {
        id: "stage-technical",
        kind: "stage",
        label: "technical",
        confirmed: true,
      },
      {
        id: "req-terraform",
        kind: "requirement",
        label: "Terraform automation",
        confirmed: evidenceStatus === "strong",
      },
    ],
    importance: "high",
    evidenceStatus,
    userConfidence: "not_started",
    schemaVersion: "1",
  };
}

type InterviewSeed = {
  id: string;
  jobId: string;
  stage: string;
  status: "preparing" | "completed" | "ready";
  finalReviewCompleted?: boolean;
};

function interview(seed: InterviewSeed) {
  return {
    id: seed.id,
    userId,
    applicationId: `app-${seed.jobId}`,
    jobId: seed.jobId,
    stage: seed.stage,
    format: "video",
    scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    timezone: "Europe/London",
    durationMinutes: 60,
    participants: [{ role: "Engineering manager" }],
    status: seed.status,
    outcome: "awaiting",
    finalReviewCompleted: seed.finalReviewCompleted ?? false,
    preparationVersion: 1,
    createdAt: now,
    updatedAt: now,
    schemaVersion: "1",
    questions: [question(seed.id, "missing"), question(seed.id + "-b", "strong")],
  };
}

async function seed(page: Page, interviews: InterviewSeed[]) {
  const jobs = interviews.map((item, index) =>
    job(
      item.jobId,
      ["Senior Cloud Engineer", "Platform Analyst", "Data Product Manager"][
        index % 3
      ],
      ["Northstar Systems", "Contoso Mobility", "Fabrikam Cloud"][index % 3],
      ["Berlin, Germany", "Amsterdam, Netherlands", "Dublin, Ireland"][
        index % 3
      ],
    ),
  );
  const applications = interviews.map((item) => application(item.jobId));
  const records = interviews.map(interview);
  if (page.url() === "about:blank") {
    await page.addInitScript(
      ({ userId, jobs, applications, records }) => {
        if (sessionStorage.getItem("phase-4-interviews-fixture-seeded"))
          return;
        localStorage.setItem(
          `autotime-phase-3b-workflow-v1:${userId}`,
          JSON.stringify({ jobs, applications, schemaVersion: 1 }),
        );
        localStorage.setItem(
          `autotime-phase-3c-interviews-v1:${userId}`,
          JSON.stringify({ interviews: records, schemaVersion: 1 }),
        );
        localStorage.setItem("autotime-analytics-consent", "denied");
        sessionStorage.setItem("phase-4-interviews-fixture-seeded", "true");
      },
      { userId, jobs, applications, records },
    );
    return;
  }
  await page.evaluate(
    ({ userId, jobs, applications, records }) => {
      localStorage.setItem(
        `autotime-phase-3b-workflow-v1:${userId}`,
        JSON.stringify({ jobs, applications, schemaVersion: 1 }),
      );
      localStorage.setItem(
        `autotime-phase-3c-interviews-v1:${userId}`,
        JSON.stringify({ interviews: records, schemaVersion: 1 }),
      );
    },
    { userId, jobs, applications, records },
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
  await expect(page.locator("main.phase-four-interviews")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(
    await page
      .locator("main.phase-four-interviews .button-primary:visible")
      .count(),
  ).toBeLessThanOrEqual(1);
  const forbidden = await page
    .locator("main.phase-four-interviews *")
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
      "main.phase-four-interviews button:visible, main.phase-four-interviews a:visible, main.phase-four-interviews summary:visible",
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
      "main.phase-four-interviews .button-primary:visible",
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

test("empty state and populated list with mixed stages", async ({ page }) => {
  await disableDevelopmentToolbar(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await seed(page, []);
  await page.goto("/dashboard/interviews");
  await expect(
    page.getByRole("heading", { name: "No interviews recorded" }),
  ).toBeVisible();
  await capture(page, "pipeline-empty-1440x900.png");
  await page.setViewportSize({ width: 390, height: 844 });
  await capture(page, "pipeline-empty-390x844.png");

  await seed(page, [
    { id: "i1", jobId: "one", stage: "technical", status: "preparing" },
    { id: "i2", jobId: "two", stage: "recruiter_screen", status: "ready" },
    { id: "i3", jobId: "three", stage: "final", status: "completed" },
  ]);
  await page.reload();
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(
    page.getByRole("heading", { name: "Senior Cloud Engineer" }),
  ).toBeVisible();
  await capture(page, "pipeline-multiple-stages-1440x900.png");
  await page.setViewportSize({ width: 390, height: 844 });
  await capture(page, "pipeline-multiple-stages-390x844.png");
});

test("overview, blocked preparation and practice tabs", async ({ page }) => {
  await disableDevelopmentToolbar(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await seed(page, [
    { id: "i1", jobId: "one", stage: "technical", status: "preparing" },
  ]);
  await page.goto("/dashboard/interviews/i1");
  await expect(
    page.getByRole("heading", { name: "Senior Cloud Engineer" }),
  ).toBeVisible();
  await capture(page, "overview-1440x900.png");

  await page.getByRole("tab", { name: "Preparation" }).click();
  await expect(page.getByText(/current evidence is missing/i)).toBeVisible();
  await capture(page, "preparation-blocked-1440x900.png");
  await page.setViewportSize({ width: 390, height: 844 });
  await capture(page, "preparation-blocked-390x844.png");

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole("tab", { name: "Practice" }).click();
  await capture(page, "practice-1440x900.png");
});

test("completed interview outcome tab", async ({ page }) => {
  await disableDevelopmentToolbar(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await seed(page, [
    { id: "i1", jobId: "one", stage: "final", status: "completed" },
  ]);
  await page.goto("/dashboard/interviews/i1");
  await page.getByRole("tab", { name: "Outcome" }).click();
  await expect(page.getByRole("combobox", { name: "Outcome" })).toBeVisible();
  await capture(page, "outcome-1440x900.png");
  await page.setViewportSize({ width: 390, height: 844 });
  await capture(page, "outcome-390x844.png");
});

test("detail is responsive at required intermediate viewports", async ({
  page,
}) => {
  await disableDevelopmentToolbar(page);
  await seed(page, [
    { id: "i1", jobId: "one", stage: "technical", status: "preparing" },
  ]);
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto("/dashboard/interviews/i1");
  await capture(page, "detail-1024x768.png");
  await page.setViewportSize({ width: 768, height: 1024 });
  await capture(page, "detail-768x1024.png");
  await page.setViewportSize({ width: 360, height: 800 });
  await assertVisualContract(page);
  await expectNoSeriousViolations(page, {
    include: "main.phase-four-interview-detail",
  });
});

test("shared tab standard: single underline, no pills or fills", async ({
  page,
}) => {
  await disableDevelopmentToolbar(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await seed(page, [
    { id: "i1", jobId: "one", stage: "technical", status: "preparing" },
  ]);
  await page.goto("/dashboard/interviews/i1");
  const overviewTab = page.getByRole("tab", { name: "Overview" });
  await expect(overviewTab).toHaveAttribute("aria-selected", "true");
  await expect(overviewTab).toHaveCSS(
    "border-bottom-color",
    "rgb(23, 78, 166)",
  );
  const preparationTab = page.getByRole("tab", { name: "Preparation" });
  await expect(preparationTab).toHaveCSS(
    "border-bottom-color",
    "rgba(0, 0, 0, 0)",
  );
  await preparationTab.focus();
  await expect(preparationTab).toHaveCSS("outline-color", "rgb(81, 69, 205)");
});
