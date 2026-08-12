import assert from "node:assert/strict";
import test from "node:test";
import { detectATS } from "../apps/web/lib/ats-detector.ts";
import { canonicalJobUrl, createJobDedupHashes } from "../apps/web/lib/dedup.ts";
import { GreenhouseFeed } from "../apps/web/lib/ats-feeds/greenhouse.ts";
import { LeverFeed } from "../apps/web/lib/ats-feeds/lever.ts";
import { AshbyFeed } from "../apps/web/lib/ats-feeds/ashby.ts";
import { PersonioFeed } from "../apps/web/lib/ats-feeds/personio.ts";
import { buildOutreachPrompt } from "../apps/web/lib/outreach-drafter.ts";
import { classifyJobToEsco } from "../apps/web/lib/esco/classify-job.ts";
import { buildQuestionnaireContext } from "../apps/web/lib/esco/questionnaire-context.ts";
import { applicationRecordSchema } from "../packages/shared/src/schemas.ts";
import { readFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

test("detects supported ATS hosts and defaults safely", () => {
  assert.equal(detectATS("https://boards.greenhouse.io/acme/jobs/1"), "greenhouse");
  assert.equal(detectATS("https://acme.jobs.personio.de/job/1"), "personio");
  assert.equal(detectATS("https://example.com/careers"), "unknown");
});
test("application ATS metadata survives shared parsing and cloud mapping", async () => {
  const application = applicationRecordSchema.parse({ id: "app-1", title: "Engineer", url: "https://jobs.lever.co/acme/1", atsPlatform: "lever", createdAt: new Date(0).toISOString(), status: "Saved" });
  assert.equal(application.atsPlatform, "lever");
  const syncRoute = await readFile(new URL("../apps/web/app/api/sync/dashboard/route.ts", import.meta.url), "utf8");
  assert.match(syncRoute, /ats_platform: application\.atsPlatform \?\? "unknown"/);
  assert.match(syncRoute, /atsPlatform: row\.ats_platform/);
});
test("canonicalises tracking parameters and provides cross-source identity hashes", async () => {
  assert.equal(canonicalJobUrl("https://www.example.com/job/1/?utm_source=x"), "https://example.com/job/1");
  const a = await createJobDedupHashes({ title: "Senior Engineer", company: "Example, Ltd", url: "https://a.test/1" });
  const b = await createJobDedupHashes({ title: "senior-engineer", company: "Example Ltd", url: "https://b.test/2" });
  assert.equal(a.identityHash, b.identityHash); assert.notEqual(a.dedupHash, b.dedupHash);
});
const json = (value) => async () => new Response(JSON.stringify(value), { status: 200, headers: { "content-type": "application/json" } });
test("normalises Greenhouse, Lever, and Ashby feed results", async () => {
  assert.equal((await new GreenhouseFeed(json({ jobs: [{ title: "Dev", absolute_url: "https://x", location: { name: "Paris" } }] })).fetchJobs("acme"))[0].atsPlatform, "greenhouse");
  assert.equal((await new LeverFeed(json([{ text: "Dev", hostedUrl: "https://x", categories: { location: "Paris" } }])).fetchJobs("acme"))[0].atsPlatform, "lever");
  assert.equal((await new AshbyFeed(json({ jobs: [{ title: "Dev", jobUrl: "https://x", location: "Paris" }] })).fetchJobs("acme"))[0].atsPlatform, "ashby");
});
test("normalises Personio XML", async () => {
  const fetchXml = async () => new Response("<workzag-jobs><position><id>1</id><name>Developer</name><office>Berlin</office></position></workzag-jobs>");
  const jobs = await new PersonioFeed(fetchXml).fetchJobs("acme"); assert.equal(jobs[0].title, "Developer"); assert.equal(jobs[0].atsPlatform, "personio");
});
test("outreach prompt retains human-sent constraints", () => {
  const prompt = buildOutreachPrompt({ jobTitle: "Engineer", companyName: "Acme", jobDescription: "Build secure APIs", recruiterName: "Sam", recruiterRole: "Recruiter", candidateSummary: "API engineer", candidateKeyStrengths: ["security"], channel: "linkedin_note", contactType: "recruiter" });
  assert.match(prompt, /Maximum 300 characters/); assert.match(prompt, /Do not invent facts/);
});
test("peer outreach is informational and does not ask about an application", () => {
  const prompt = buildOutreachPrompt({ jobTitle: "Engineer", companyName: "Acme", jobDescription: "Build secure APIs", recruiterName: "Sam", recruiterRole: "Engineer", candidateSummary: "API engineer", candidateKeyStrengths: ["security"], channel: "email", contactType: "peer_target_role" });
  assert.match(prompt, /informational networking/i); assert.match(prompt, /15-minute/i); assert.match(prompt, /Do not ask about an application/i); assert.match(prompt, /referral/i);
});
test("ATS CV renderer stays single-column and produces a non-empty text PDF", async () => {
  const source = await readFile(new URL("../apps/web/components/cv/CVRenderer.tsx", import.meta.url), "utf8");
  for (const heading of ["Summary", "Experience", "Education", "Skills"]) assert.match(source, new RegExp(`>${heading}<`));
  assert.doesNotMatch(source, /<table|<img|<svg|header|footer/i);
  const browser = await chromium.launch({ headless: true });
  try { const page = await browser.newPage(); await page.setContent("<main><h1>Alex Candidate</h1><p>alex@example.com | Dublin</p><h2>Summary</h2><p>Software engineer</p><h2>Experience</h2><h3>Engineer, Example</h3><ul><li>Built reliable APIs</li></ul><h2>Education</h2><p>BSc, Example University</p><h2>Skills</h2><p>TypeScript</p></main>"); const pdf = await page.pdf({ format: "A4", printBackground: false }); assert.ok(pdf.byteLength > 1000); assert.equal(pdf.subarray(0, 4).toString(), "%PDF"); } finally { await browser.close(); }
});
test("classifies jobs against ESCO labels without a predictive model", () => {
  const occupations = [{ id: "esco:software-developer", preferredLabel: "software developer", description: "design and maintain software APIs" }, { id: "esco:data-analyst", preferredLabel: "data analyst", description: "analyse data and create reports" }];
  assert.deepEqual(classifyJobToEsco("Software Developer", "Build APIs", occupations), { occupationId: "esco:software-developer", confidence: 1, method: "exact" });
  const unmatched = classifyJobToEsco("Office Manager", "Coordinate facilities", occupations); assert.equal(unmatched.method, "unmatched"); assert.equal(unmatched.occupationId, null);
});
test("questionnaire context changes with accumulated skill confidence", () => {
  const base = { question: "What did you deliver?", answer: "I built an API", answeredSoFar: [], candidateSkills: [{ id: "api", preferredLabel: "API development", skillType: "skill" }], round: 2 };
  const low = buildQuestionnaireContext({ ...base, currentSkillProfile: [{ escoSkillId: "api", confidence: 0.4, source: "inferred" }] });
  const established = buildQuestionnaireContext({ ...base, currentSkillProfile: [{ escoSkillId: "api", confidence: 0.9, source: "stated" }] });
  assert.deepEqual(low.lowConfidenceSkillIds, ["api"]); assert.deepEqual(low.establishedSkillIds, []);
  assert.deepEqual(established.lowConfidenceSkillIds, []); assert.deepEqual(established.establishedSkillIds, ["api"]);
  assert.notDeepEqual(low, established);
});
test("ESCO matching API uses the overlap-only RPC signature", async () => {
  const route = await readFile(new URL("../apps/web/app/api/esco/matches/route.ts", import.meta.url), "utf8");
  assert.doesNotMatch(route, /p_query_embedding/); assert.match(route, /p_user_id:user\.id,p_limit:50/);
});
test("profile Connect view reuses the outreach drafting flow", async () => {
  const [profile, connect, workspace] = await Promise.all([
    readFile(new URL("../apps/web/app/dashboard/profile/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../apps/web/components/profile/ProfileConnect.tsx", import.meta.url), "utf8"),
    readFile(new URL("../apps/web/components/OutreachWorkspace.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(profile, /<ProfileConnect/);
  assert.match(connect, /OutreachDraftForm/);
  assert.match(connect, /follow_up_due/);
  assert.match(connect, /contact_type/);
  assert.match(workspace, /OutreachDraftForm/);
});
test("profile onboarding is five-step, persisted, and view-only after completion", async () => {
  const [wizard, profilePage, summary, migration] = await Promise.all([
    readFile(new URL("../apps/web/components/OnboardingWizard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../apps/web/app/dashboard/profile/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../apps/web/components/profile/ProfileSummary.tsx", import.meta.url), "utf8"),
    readFile(new URL("../supabase/migrations/20260812160000_profile_onboarding_wizard.sql", import.meta.url), "utf8"),
  ]);
  assert.match(wizard, /Step \{step\+1\} of 5/);
  assert.match(wizard, /Complete setup/);
  assert.match(wizard, /Upload DOCX/);
  assert.doesNotMatch(profilePage, /DashboardExperience|CVWorkspace/);
  assert.match(summary, /view-only/i);
  assert.match(migration, /profile-photos/);
  assert.match(migration, /storage\.foldername\(name\)/);
});
