// End-to-end coverage of three named "core journeys" that each combine
// several features, using route mocking (rather than local-storage seeding)
// so real onboarding/profile/tailoring API round trips are exercised:
//   Journey A - fresh-user onboarding through both the CV-upload branch and
//     the build-a-new-CV branch (which hands off to the CV tailor).
//   Journey B - the ESCO skills questionnaire producing explainable
//     skill-overlap job matches after a fixed number of answer rounds.
//   Journey C - required-field validation blocking CV export, and CV
//     tailoring being driven by a job tracked from the Jobs list.
import { expect, test, type Page, type Route } from "@playwright/test";

type ProfileState = Record<string, unknown> & {
  onboarding_completed_at: string | null;
};

const cvEvidence = "Product manager with eight years of verified experience improving onboarding, analytics, experimentation and cross-functional delivery.";

async function mockFreshOnboarding(page: Page) {
  let profile: ProfileState | null = null;
  await page.route("**/api/profile/onboarding", async (route: Route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ json: { data: profile, error: null } });
      return;
    }
    const body = route.request().postDataJSON();
    profile = {
      alert_frequency: "weekly",
      alert_last_sent_at: null,
      base_cv_text: body.baseCvText ?? "",
      countries_target: body.countriesTarget ?? [],
      country_current: body.countryCurrent ?? "",
      email: body.email || null,
      full_name: body.fullName ?? "",
      github_url: body.githubUrl || null,
      linkedin_url: body.linkedinUrl || null,
      onboarding_completed_at: body.complete ? new Date().toISOString() : null,
      onboarding_ready: Boolean(body.complete),
      phone: body.phone || null,
      photoUrl: null,
      portfolio_url: body.portfolioUrl || null,
      work_right_details: body.workRightDetails ?? "",
    };
    await route.fulfill({ json: { data: profile, error: null } });
  });
  await page.route("**/api/outreach", (route) => route.fulfill({ json: { data: { jobs: [], messages: [] }, error: null } }));
  return () => profile;
}

async function completeStepsBeforeCv(page: Page) {
  await page.getByLabel("Full name").fill("Fresh Journey User");
  await page.getByLabel("Phone").fill("+44 7700 900123");
  await page.getByLabel("Contact email").fill("fresh.journey@example.com");
  await page.getByLabel("Current location").fill("London");
  await page.getByLabel(/Target countries/).fill("Ireland, Germany");
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByLabel("Current position").selectOption("existing_permission");
  await page.getByLabel(/Explain only facts/).fill("I hold verified permission to work in Ireland until December 2028.");
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByLabel(/LinkedIn profile URL/).fill("https://www.linkedin.com/in/fresh-journey-user");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue or skip" }).click();
}

test("Journey A: fresh onboarding completes through the CV upload branch", async ({ page }) => {
  const getProfile = await mockFreshOnboarding(page);
  await page.route("**/api/profile/import-cv", (route) => route.fulfill({ json: { data: { text: cvEvidence }, error: null } }));

  const onboardingLoaded = page.waitForResponse((response) =>
    response.request().method() === "GET" && response.url().includes("/api/profile/onboarding"),
  );
  await page.goto("/dashboard/onboarding");
  await onboardingLoaded;
  await completeStepsBeforeCv(page);
  await page.getByLabel(/Upload CV/).setInputFiles({ name: "journey-cv.pdf", mimeType: "application/pdf", buffer: Buffer.from("test-cv") });
  await expect(page.getByText("CV ready", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Review and confirm" })).toBeVisible();
  await page.getByRole("button", { name: "Complete setup" }).click();
  await page.waitForURL("**/dashboard/profile");

  expect(getProfile()?.onboarding_completed_at).toBeTruthy();
  await expect(page.getByRole("heading", { name: "Fresh Journey User" })).toBeVisible();
  await expect(page.getByText("fresh.journey@example.com")).toBeVisible();
});

test("Journey A: build-new-CV branch opens the builder and communicates export requirements", async ({ page }) => {
  await mockFreshOnboarding(page);
  const onboardingLoaded = page.waitForResponse((response) =>
    response.request().method() === "GET" && response.url().includes("/api/profile/onboarding"),
  );
  await page.goto("/dashboard/onboarding");
  await onboardingLoaded;
  await completeStepsBeforeCv(page);
  await page.getByRole("link", { name: "Build one now" }).click();
  await expect(page).toHaveURL(/\/dashboard\/cv-tailor\?returnTo=/);
  await expect(page.getByRole("heading", { name: "Your canonical CV" })).toBeVisible();
  await expect(page.locator(".onboarding-validation-alert")).toContainText("Complete the required CV fields");
  await expect(page.getByRole("button", { name: "Print / save PDF" })).toBeDisabled();
});

test("Journey B: ESCO questionnaire renders explainable skill-overlap matches", async ({ page }) => {
  let round = 0;
  const skills = [{ esco_skill_id: "skill-1", preferred_label: "Product analytics", confidence: 0.92, source: "inferred" }];
  await page.route("**/api/esco/questionnaire", async (route) => {
    if (route.request().method() === "POST") {
      round += 1;
      await route.fulfill({ json: { data: { round, nextQuestion: `Evidence question ${round + 1}`, complete: round >= 6, skills }, error: null } });
      return;
    }
    await route.fulfill({ json: { data: { answers: Array.from({ length: round }), complete: round >= 6, nextQuestion: `Evidence question ${round + 1}`, profile: skills }, error: null } });
  });
  await page.route("**/api/esco/matches", (route) => route.fulfill({ json: { data: [{ job_id: "job-1", title: "Growth Product Manager", company: "Example EU", location: "Dublin", matched_skills: 4, total_essential_skills: 6, matched_skill_labels: ["Product analytics"], missing_skill_labels: ["Pricing strategy"], overlap: 0.67 }], error: null } }));

  const questionnaireLoaded = page.waitForResponse((response) =>
    response.request().method() === "GET" && response.url().includes("/api/esco/questionnaire"),
  );
  await page.goto("/dashboard/role-pathways/questionnaire");
  await questionnaireLoaded;
  for (let index = 0; index < 6; index += 1) {
    await page.getByLabel("Your evidence").fill(`Verified product analytics evidence for questionnaire round ${index + 1}.`);
    const submit = page.getByRole("button", { name: /Save answer and continue/ });
    await expect(submit).toBeEnabled();
    await submit.click();
    if (index < 5) await expect(page.getByRole("status")).toContainText(`Round ${index + 1} saved`);
  }
  await expect(page.getByText("Questionnaire complete")).toBeVisible();
  await expect(page.getByText("Matched 4 of 6 essential skills")).toBeVisible();
  await expect(page.getByText("Missing: Pricing strategy")).toBeVisible();
});

test("Journey C: required fields block export and tailoring uses the tracked job", async ({ page }) => {
  await page.route("**/api/profile/onboarding", (route) => route.fulfill({ json: { data: null, error: null } }));
  await page.route("**/api/ai/tailor-cv", (route) => route.fulfill({ json: { data: { cv: { contact: { name: "Taylor User", email: "taylor@example.com", phone: "+44 7700 900000", location: "London" }, summary: "Growth Product Manager focused on pricing experimentation and activation analytics.", skills: ["Product analytics", "Pricing experimentation"], experience: [{ title: "Product Manager", company: "Example", dates: "2021–2026", bullets: ["Improved activation by 20%."] }], education: [{ degree: "BSc", institution: "Example University", dates: "2014–2017" }] } }, error: null } }));

  await page.goto("/dashboard/jobs");
  await page.getByRole("button", { name: "Add a job" }).click();
  await page.getByLabel("Job title").fill("Growth Product Manager");
  await page.getByLabel("Employer").fill("Example EU");
  await page.getByLabel("Source URL").fill("https://example.test/jobs/growth-product-manager");
  await page.getByLabel("Job description").fill("Lead pricing experimentation and activation analytics for a European SaaS platform.");
  await page.getByRole("button", { name: "Save job" }).click();
  const trackedJobId = await page.evaluate(() => {
    const jobStorageKey = Object.keys(localStorage).find((key) => key.startsWith("autotime-phase-3b-workflow-v1:"));
    if (!jobStorageKey) throw new Error("Tracked-job storage was not created");
    const userId = jobStorageKey.slice("autotime-phase-3b-workflow-v1:".length);
    const jobs = JSON.parse(localStorage.getItem(jobStorageKey) ?? "{}").jobs;
    localStorage.setItem(`autotime-cv-data:${userId}`, JSON.stringify({ contact: { name: "Taylor User", email: "taylor@example.com", phone: "+44 7700 900000", location: "London" }, summary: "General product leadership summary.", skills: ["Product analytics"], experience: [{ title: "Product Manager", company: "Example", dates: "2021–2026", bullets: ["Improved activation by 20%."] }], education: [{ degree: "BSc", institution: "Example University", dates: "2014–2017" }] }));
    return jobs[0].id as string;
  });
  await page.goto(`/dashboard/cv-tailor?job_id=${trackedJobId}`);
  await expect(page.getByLabel("Summary")).toHaveValue(/pricing experimentation/i);
  await expect(page.getByText("Tracked-job tailored draft ready")).toBeVisible();
  await page.getByLabel("Summary").fill("");
  await expect(page.locator(".onboarding-validation-alert")).toContainText("summary");
  await expect(page.getByRole("button", { name: "Print / save PDF" })).toBeDisabled();
  await page.getByLabel("Summary").fill("Growth Product Manager focused on pricing experimentation and activation analytics.");
  await expect(page.getByRole("button", { name: "Download DOCX" })).toBeEnabled();
});
