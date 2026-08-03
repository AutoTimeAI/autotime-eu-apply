import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  evaluateCapabilityReadiness,
  getHomeNextAction,
} from "../apps/web/lib/capability-readiness.ts";
import {
  createProgressiveOnboardingState,
  getProgressiveOnboardingStorageKey,
  loadProgressiveOnboarding,
  saveProgressiveOnboarding,
} from "../apps/web/lib/progressive-onboarding-storage.ts";

const tests = [];
const test = (name, run) => tests.push({ name, run });
const evidence = { experience: true };
const preferences = {
  basicWorkPreferences: true,
  targetCountry: true,
  workAuthorisationStructured: true,
};

test("authenticated incomplete user can view Home", () => {
  assert.equal(
    evaluateCapabilityReadiness("view_dashboard", { authenticated: true })
      .state,
    "ready",
  );
});

test("unauthenticated dashboard remains protected by its server layout", () => {
  const layout = readFileSync("apps/web/app/dashboard/layout.tsx", "utf8");
  assert.match(layout, /supabase\.auth\.getUser\(\)/);
  assert.match(layout, /getTestAuthUser\(\)/);
  assert.match(layout, /redirect\("\/login"\)/);
});

test("incomplete users are not redirected by navigation", () => {
  const navigation = readFileSync("apps/web/components/UserNav.tsx", "utf8");
  assert.doesNotMatch(navigation, /protocol-locked-link|90% before using/);
  assert.match(navigation, /href=\{item\.href\}/);
});

test("Role Pathways and job analysis have different requirements", () => {
  const pathways = evaluateCapabilityReadiness("discover_pathways", {
    authenticated: true,
    evidence,
    preferences: { basicWorkPreferences: true },
  });
  const job = evaluateCapabilityReadiness("analyse_job", {
    authenticated: true,
    evidence,
    preferences: { targetCountry: true },
  });
  assert.equal(pathways.state, "ready_with_limitations");
  assert.equal(job.state, "needs_information");
  assert.equal(job.requiredMissing[0].id, "job_description");
});

test("mobility does not require career evidence", () => {
  assert.equal(
    evaluateCapabilityReadiness("assess_mobility", {
      authenticated: true,
      preferences,
    }).state,
    "ready",
  );
});

test("application preparation requires confirmed supporting evidence", () => {
  const result = evaluateCapabilityReadiness("prepare_application", {
    authenticated: true,
    evidence,
    preferences,
    job: { selected: true },
    application: { evidenceUseConfirmed: false },
  });
  assert.equal(result.state, "needs_information");
  assert.ok(
    result.requiredMissing.some((item) => item.id === "evidence_confirmation"),
  );
});

test("autofill readiness is specific to fields on the form", () => {
  const result = evaluateCapabilityReadiness("use_autofill", {
    authenticated: true,
    autofill: {
      requiredFields: ["email", "phone"],
      verifiedFields: ["email"],
    },
  });
  assert.deepEqual(
    result.requiredMissing.map((item) => item.id),
    ["autofill_phone"],
  );
});

test("application answer approval requires explicit review", () => {
  const result = evaluateCapabilityReadiness("approve_application_answers", {
    authenticated: true,
    evidence: { supportingEvidenceConfirmed: true },
    application: {
      generatedAnswerAvailable: true,
      explicitReview: false,
    },
  });
  assert.ok(
    result.requiredMissing.some((item) => item.id === "explicit_review"),
  );
});

test("recommended information never becomes a hard block", () => {
  const result = evaluateCapabilityReadiness("discover_pathways", {
    authenticated: true,
    evidence,
    preferences: { basicWorkPreferences: true },
  });
  assert.equal(result.requiredMissing.length, 0);
  assert.equal(result.state, "ready_with_limitations");
});

test("required information provides a contextual next action", () => {
  const result = evaluateCapabilityReadiness(
    "analyse_job",
    {
      authenticated: true,
    },
    "/dashboard/jobs",
  );
  assert.equal(result.state, "needs_information");
  assert.equal(result.nextAction?.returnTo, "/dashboard/jobs");
});

test("next action priority is deterministic for a new user", () => {
  assert.equal(
    getHomeNextAction({
      hasCareerEvidence: false,
      hasCareerLane: false,
      hasTargetCountry: false,
      hasSavedJob: false,
      hasUnanalysedJob: false,
      hasSuitableAnalysedJob: false,
      hasReadyApplication: false,
      hasFollowUpDue: false,
      hasInterview: false,
    }).id,
    "add_career_evidence",
  );
});

test("evidence without a lane produces a pathways action", () => {
  assert.equal(
    getHomeNextAction({
      hasCareerEvidence: true,
      hasCareerLane: false,
      hasTargetCountry: false,
      hasSavedJob: false,
      hasUnanalysedJob: false,
      hasSuitableAnalysedJob: false,
      hasReadyApplication: false,
      hasFollowUpDue: false,
      hasInterview: false,
    }).id,
    "discover_pathways",
  );
});

test("an unanalysed saved job produces Analyse Job", () => {
  assert.equal(
    getHomeNextAction({
      hasCareerEvidence: true,
      hasCareerLane: true,
      hasTargetCountry: true,
      hasSavedJob: true,
      hasUnanalysedJob: true,
      hasSuitableAnalysedJob: false,
      hasReadyApplication: false,
      hasFollowUpDue: false,
      hasInterview: false,
    }).id,
    "analyse_job",
  );
});

test("a ready application produces submission confirmation", () => {
  assert.equal(
    getHomeNextAction({
      hasCareerEvidence: true,
      hasCareerLane: true,
      hasTargetCountry: true,
      hasSavedJob: true,
      hasUnanalysedJob: false,
      hasSuitableAnalysedJob: false,
      hasReadyApplication: true,
      hasFollowUpDue: false,
      hasInterview: false,
    }).id,
    "submit_ready_application",
  );
});

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

test("existing onboarding values are reused on resumption", () => {
  const storage = memoryStorage();
  const initial = {
    ...createProgressiveOnboardingState("user-a"),
    currentStep: "direction",
    evidencePath: "cv",
    targetCountries: "Ireland",
    workAuthorisation: "Sponsorship required",
  };
  saveProgressiveOnboarding(storage, "user-a", initial);
  assert.deepEqual(
    loadProgressiveOnboarding(storage, "user-a").targetCountries,
    "Ireland",
  );
});

test("onboarding state is isolated by authenticated user ID", () => {
  assert.notEqual(
    getProgressiveOnboardingStorageKey("user-a"),
    getProgressiveOnboardingStorageKey("user-b"),
  );
  const storage = memoryStorage();
  saveProgressiveOnboarding(
    storage,
    "user-a",
    createProgressiveOnboardingState("user-a"),
  );
  assert.equal(loadProgressiveOnboarding(storage, "user-b").userId, "user-b");
});

test("malformed onboarding state is rejected safely", () => {
  const storage = memoryStorage();
  storage.setItem(getProgressiveOnboardingStorageKey("user-a"), "{bad json");
  assert.equal(
    loadProgressiveOnboarding(storage, "user-a").currentStep,
    "career",
  );
});

test("lower overall completion cannot bypass application confirmation", () => {
  const result = evaluateCapabilityReadiness("prepare_application", {
    authenticated: true,
    evidence: {
      cv: true,
      education: true,
      experience: true,
      projects: true,
      confirmedSkills: true,
      supportingEvidenceConfirmed: true,
    },
    preferences: {
      ...preferences,
      basicWorkPreferences: true,
      careerLane: true,
      codingPreference: true,
      languageInformation: true,
      salaryPreference: true,
      vacancyCountry: true,
    },
    job: { selected: true, analysed: true, description: true },
    application: { evidenceUseConfirmed: false },
  });
  assert.equal(result.state, "needs_information");
});

for (const { name, run } of tests) {
  await run();
  console.log(`ok - ${name}`);
}

console.log(`Phase 3A readiness safeguards: ${tests.length} passed`);
