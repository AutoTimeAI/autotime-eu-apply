import assert from "node:assert/strict";
import test from "node:test";
import { detectATS } from "../apps/web/lib/ats-detector.ts";
import { canonicalJobUrl, createJobDedupHashes } from "../apps/web/lib/dedup.ts";
import { GreenhouseFeed } from "../apps/web/lib/ats-feeds/greenhouse.ts";
import { LeverFeed } from "../apps/web/lib/ats-feeds/lever.ts";
import { AshbyFeed } from "../apps/web/lib/ats-feeds/ashby.ts";
import { PersonioFeed } from "../apps/web/lib/ats-feeds/personio.ts";
import { SmartRecruitersFeed } from "../apps/web/lib/ats-feeds/smartrecruiters.ts";
import { RecruiteeFeed } from "../apps/web/lib/ats-feeds/recruitee.ts";
import { buildOutreachInstructions } from "../apps/web/lib/outreach-drafter.ts";
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
test("normalises Greenhouse, Lever, Ashby, and SmartRecruiters feed results", async () => {
  assert.equal((await new GreenhouseFeed(json({ jobs: [{ title: "Dev", absolute_url: "https://x", location: { name: "Paris" } }] })).fetchJobs("acme"))[0].atsPlatform, "greenhouse");
  assert.equal((await new LeverFeed(json([{ text: "Dev", hostedUrl: "https://x", categories: { location: "Paris" } }])).fetchJobs("acme"))[0].atsPlatform, "lever");
  assert.equal((await new AshbyFeed(json({ jobs: [{ title: "Dev", jobUrl: "https://x", location: "Paris" }] })).fetchJobs("acme"))[0].atsPlatform, "ashby");
  const smartRecruiters = await new SmartRecruitersFeed(json({ content: [{ id: "dev-1", name: "Dev", company: { name: "Acme" }, location: { city: "Paris", country: "France" }, releasedDate: "2026-08-18T10:00:00Z" }] })).fetchJobs("acme");
  assert.deepEqual(smartRecruiters[0], {
    title: "Dev", company: "Acme", location: "Paris, France",
    url: "https://jobs.smartrecruiters.com/acme/dev-1", postedDate: "2026-08-18T10:00:00Z",
    atsPlatform: "smartrecruiters", descriptionRaw: "",
  });
});
test("normalises Personio XML", async () => {
  const fetchXml = async () => new Response("<workzag-jobs><position><id>1</id><name>Developer</name><office>Berlin</office></position></workzag-jobs>");
  const jobs = await new PersonioFeed(fetchXml).fetchJobs("acme"); assert.equal(jobs[0].title, "Developer"); assert.equal(jobs[0].atsPlatform, "personio");
});
test("caps an oversized Personio feed before regex-scanning it, instead of scanning it unbounded", async () => {
  const padding = "x".repeat(6_000_000);
  const fetchXml = async () => new Response(`<workzag-jobs><!--${padding}--><position><id>1</id><name>Developer</name><office>Berlin</office></position></workzag-jobs>`);
  const start = Date.now();
  const jobs = await new PersonioFeed(fetchXml).fetchJobs("acme");
  assert.ok(Date.now() - start < 2000);
  // The padding comment pushes the real <position> past the 5,000,000
  // character cap, so it's truncated away rather than scanned - this
  // asserts the cap actually applies, not just that scanning is fast.
  assert.equal(jobs.length, 0);
});
test("normalises Recruitee public careers offers and drops incomplete entries", async () => {
  const jobs = await new RecruiteeFeed(json({ offers: [{ title: "Engineer", careers_url: "https://acme.recruitee.com/o/engineer", city: "Dublin", country: "Ireland", created_at: "2026-08-18T10:00:00Z", description: "Build reliable systems" }, { title: "Missing URL" }] })).fetchJobs("acme");
  assert.deepEqual(jobs, [{ title: "Engineer", company: "acme", location: "Dublin, Ireland", url: "https://acme.recruitee.com/o/engineer", postedDate: "2026-08-18T10:00:00Z", atsPlatform: "recruitee", descriptionRaw: "Build reliable systems" }]);
});
test("outreach prompt retains human-sent constraints", () => {
  const prompt = buildOutreachInstructions({ channel: "linkedin_note", contactType: "recruiter" });
  assert.match(prompt, /Maximum 300 characters/); assert.match(prompt, /Do not invent facts/);
});
test("peer outreach is informational and does not ask about an application", () => {
  const prompt = buildOutreachInstructions({ channel: "email", contactType: "peer_target_role" });
  assert.match(prompt, /informational networking/i); assert.match(prompt, /15-minute/i); assert.match(prompt, /Do not ask about an application/i); assert.match(prompt, /referral/i);
});
test("outreach instructions never embed caller-supplied free text, only the closed channel/contactType enums", () => {
  const prompt = buildOutreachInstructions({ channel: "email", contactType: "recruiter" });
  assert.doesNotMatch(prompt, /Build secure APIs/);
  assert.doesNotMatch(prompt, /Acme/);
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
test("token-overlap confidence does not max out just because an occupation's own vocabulary is tiny", () => {
  const occupations = [{ id: "esco:chef", preferredLabel: "Chef", description: null }];
  const result = classifyJobToEsco("Software Developer", "This role builds backend systems and APIs for the engineering team. The office chef prepares lunch every Friday, which the whole department enjoys.", occupations);
  assert.notEqual(result.occupationId, "esco:chef");
  assert.equal(result.method, "unmatched");
});
test("token-overlap still matches a realistic job description against an occupation with a real, substantive vocabulary", () => {
  // A normalization fix for the tiny-vocab exploit above must not also
  // punish the normal case where a real occupation entry (label +
  // description) is naturally much shorter than a full job posting - that
  // size gap is expected, not a sign of a bad match.
  const occupations = [
    {
      id: "esco:backend-developer",
      preferredLabel: "Backend Software Developer",
      description:
        "Designs, builds and maintains server-side application logic, APIs and databases, working with backend frameworks and cloud infrastructure.",
    },
  ];
  const result = classifyJobToEsco(
    "Senior Backend Engineer",
    "We are hiring a Senior Backend Engineer to join our platform team in Berlin. You will design, build and maintain server-side application logic and APIs, working closely with our infrastructure team on cloud deployments. The ideal candidate has strong experience with backend frameworks, databases, and distributed systems. This is a hybrid role with flexible working hours and a competitive salary. You'll collaborate with product managers and designers to ship reliable, well-tested software, and mentor junior engineers on the team.",
    occupations,
  );
  assert.equal(result.occupationId, "esco:backend-developer");
  assert.equal(result.method, "token-overlap");
  assert.ok(result.confidence >= 0.3);
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
test("profile onboarding is persisted, guided, and view-only after completion", async () => {
  const [wizard, profilePage, summary, migration] = await Promise.all([
    readFile(new URL("../apps/web/components/OnboardingWizard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../apps/web/app/dashboard/profile/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../apps/web/components/profile/ProfileSummary.tsx", import.meta.url), "utf8"),
    readFile(new URL("../supabase/migrations/20260812160000_profile_onboarding_wizard.sql", import.meta.url), "utf8"),
  ]);
  const compactWizard = wizard.replace(/\s+/g, " ");
  assert.match(compactWizard, /Step \{step \+ 1\} of 6/);
  assert.match(compactWizard, /right-to-work position for your target countries/i);
  assert.match(compactWizard, /AI: check clarity and missing facts/);
  assert.match(compactWizard, /Complete setup/);
  assert.match(compactWizard, /Upload a DOCX/);
  assert.doesNotMatch(profilePage, /DashboardExperience|CVWorkspace/);
  assert.doesNotMatch(summary, /<(input|textarea)\b/i);
  assert.equal(summary.match(/<select\b/gi)?.length, 1);
  assert.match(summary, /id="profile-alert-frequency"/);
  assert.match(summary, /dashboard\/onboarding\?edit=/);
  assert.match(migration, /profile-photos/);
  assert.match(migration, /storage\.foldername\(name\)/);
});
test("dashboard and onboarding share the restrained EU brand backdrop", async () => {
  const [shell, backdrop] = await Promise.all([
    readFile(new URL("../apps/web/components/DashboardShell.tsx", import.meta.url), "utf8"),
    readFile(new URL("../apps/web/components/BrandBackdrop.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(shell, /<BrandBackdrop/);
  assert.match(backdrop, /autotime-mark\.png/);
  assert.match(backdrop, /Evidence first/);
  assert.match(backdrop, /Better applications/);
});

test("cover letters are conservative, editable, and versioned per tracked job", async () => {
  const [server, route, workspace, migration] = await Promise.all([
    readFile(new URL("../apps/web/lib/openai-server.ts", import.meta.url), "utf8"),
    readFile(new URL("../apps/web/app/api/ai/cover-letter/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../apps/web/components/cv/CVWorkspace.tsx", import.meta.url), "utf8"),
    readFile(new URL("../supabase/migrations/20260815120000_cover_letter_versions.sql", import.meta.url), "utf8"),
  ]);
  assert.match(server, /tailorCoverLetterWithOpenAI/);
  assert.match(server, /Never invent employers, qualifications/);
  assert.match(route, /feature:"cover-letter"/);
  assert.match(route, /latest\.data\?\.version\?\?0/);
  assert.match(workspace, /Generate cover letter/);
  assert.match(workspace, /Save edits/);
  assert.match(migration, /unique \(user_id, job_id, version\)/);
  assert.match(migration, /cover_letters_select_own/);
});

test("extension match overlay reuses ESCO evidence without LinkedIn scraping", async () => {
  const [overlay, endpoint, entrypoint] = await Promise.all([
    readFile(new URL("../apps/extension/lib/match-overlay.ts", import.meta.url), "utf8"),
    readFile(new URL("../apps/web/app/api/esco/score-job/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../apps/extension/entrypoints/autotime.content.ts", import.meta.url), "utf8"),
  ]);
  assert.match(overlay, /isLinkedInUrl\(window\.location\.href\)/);
  assert.match(overlay, /mode==="api-reference"\?\{url:window\.location\.href\}/);
  assert.match(overlay, /essential skills matched/);
  assert.match(endpoint, /esco_occupation_skills/);
  assert.match(endpoint, /user_skill_profile/);
  assert.match(entrypoint, /showEscoMatchOverlay/);
});

test("LinkedIn scoring requires browser-icon action and explicit risk acknowledgement", async () => {
  const [overlay, entrypoint, background, compliance] = await Promise.all([
    readFile(new URL("../apps/extension/lib/match-overlay.ts", import.meta.url), "utf8"),
    readFile(new URL("../apps/extension/entrypoints/autotime.content.ts", import.meta.url), "utf8"),
    readFile(new URL("../apps/extension/entrypoints/background/index.ts", import.meta.url), "utf8"),
    readFile(new URL("../docs/reference/job-aggregation-compliance.md", import.meta.url), "utf8"),
  ]);
  assert.match(background, /chrome\.action\.onClicked/);
  assert.match(background, /AUTOTIME_LINKEDIN_MATCH_REQUEST/);
  assert.match(entrypoint, /message\?\.type !== "AUTOTIME_LINKEDIN_MATCH_REQUEST"/);
  assert.match(overlay, /linkedin-single-page-match-risk-acknowledged/);
  assert.match(overlay, /outside LinkedIn’s terms/);
  assert.match(overlay, /detectJobPage\(\{allowLinkedInRead:true\}\)/);
  assert.doesNotMatch(overlay, /job_listings.*insert|local\.set\([^)]*jobDescription/s);
  assert.match(compliance, /Product-owner exception/);
});

test("matched-job alerts are explainable, user-controlled, and advance only after delivery", async () => {
  const [migration, edgeFunction, profile, route, cron] = await Promise.all([
    readFile(new URL("../supabase/migrations/20260815140000_email_job_alerts.sql", import.meta.url), "utf8"),
    readFile(new URL("../supabase/functions/sync-job-alerts/index.ts", import.meta.url), "utf8"),
    readFile(new URL("../apps/web/components/profile/ProfileSummary.tsx", import.meta.url), "utf8"),
    readFile(new URL("../apps/web/app/api/profile/alerts/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../supabase/cron/job-ingestion.sql", import.meta.url), "utf8"),
  ]);
  assert.match(migration, /alert_frequency.*daily.*weekly.*off/s);
  assert.match(migration, /alert_last_sent_at/);
  assert.match(edgeFunction, /match_esco_jobs/);
  assert.match(edgeFunction, /essential skills matched/);
  assert.match(edgeFunction, /await sendEmail[\s\S]*alert_last_sent_at/);
  assert.match(profile, /Email job alerts/);
  assert.match(profile, /Daily/);
  assert.match(route, /z\.enum\(\["daily", "weekly", "off"\]\)/);
  assert.match(cron, /sync-job-alerts/);
  assert.match(cron, /x-cron-secret/);
});

test("every cron-triggered edge function compares its secret in constant time", async () => {
  const files = [
    "../supabase/functions/sync-eures/index.ts",
    "../supabase/functions/sync-job-alerts/index.ts",
    "../supabase/functions/sync-job-sources/index.ts",
  ];
  const sources = await Promise.all(
    files.map((path) => readFile(new URL(path, import.meta.url), "utf8")),
  );

  for (const [index, source] of sources.entries()) {
    assert.match(source, /function safeEqual/, files[index]);
    assert.match(
      source,
      /!safeEqual\(request\.headers\.get\("x-cron-secret"\)\s*\?\?\s*""\s*,\s*cronSecret\)/,
      files[index],
    );
    assert.doesNotMatch(
      source,
      /request\.headers\.get\("x-cron-secret"\)\s*!==\s*cronSecret/,
      files[index],
    );
  }
});

test("the sync-job-sources cron caps an oversized Personio feed before regex-scanning it", async () => {
  const source = await readFile(
    new URL("../supabase/functions/sync-job-sources/index.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /const MAX_PERSONIO_XML_LENGTH = 5_000_000;/);
  assert.match(source, /\.slice\(0,MAX_PERSONIO_XML_LENGTH\)/);
});

test("job-aggregation identity hashes include location, not just title+company", async () => {
  // Two genuinely different, concurrently-open postings for the same role
  // at the same company (e.g. different cities) must not collide on
  // identity_hash - otherwise the later one silently overwrites the
  // earlier one via the job_listings upsert (onConflict: identity_hash).
  const [eures, jobSources] = await Promise.all([
    readFile(new URL("../supabase/functions/sync-eures/index.ts", import.meta.url), "utf8"),
    readFile(new URL("../supabase/functions/sync-job-sources/index.ts", import.meta.url), "utf8"),
  ]);

  assert.match(
    eures,
    /hash\(`\$\{normalise\(title\)\}\|\$\{normalise\(company\)\}\|\$\{normalise\(location\)\}`\)/,
  );
  const jobSourcesIdentityHashes = [
    ...jobSources.matchAll(/hash\(`\$\{norm\(j\.title\)\}\|\$\{norm\(j\.company\)\}([^`]*)`\)/g),
  ];
  assert.ok(jobSourcesIdentityHashes.length >= 2, "expected both ATS-feed and aggregator identity hashes")
  for (const match of jobSourcesIdentityHashes) {
    assert.match(match[1], /\$\{norm\(j\.location\)\}/);
  }
})

test("job-ingestion edge functions canonicalize a URL before hashing it into dedup_hash", async () => {
  // dedup_hash previously hashed the raw URL, so the same posting re-fetched
  // with a different utm_/ref tracking parameter hashed differently every
  // time - mirroring apps/web/lib/dedup.ts's canonicalJobUrl (stripping
  // tracking params, www., trailing slash, and sorting query params) closes
  // that gap without needing a cross-runtime shared module.
  const eures = await readFile(
    new URL("../supabase/functions/sync-eures/index.ts", import.meta.url),
    "utf8",
  );
  const jobSources = await readFile(
    new URL("../supabase/functions/sync-job-sources/index.ts", import.meta.url),
    "utf8",
  );

  assert.match(eures, /function canonicalJobUrl\(value: string\): string \{/);
  assert.match(eures, /dedup_hash: await hash\(canonicalJobUrl\(url\) \|\| identityHash\)/);
  assert.doesNotMatch(eures, /dedup_hash: await hash\(url \|\| identityHash\)/);

  assert.match(jobSources, /function canonicalJobUrl\(value: string\): string \{/);
  const dedupHashCalls = jobSources.match(/dedup_hash:await hash\(canonicalJobUrl\(j\.url\)\)/g) ?? [];
  assert.equal(dedupHashCalls.length, 2);
  assert.doesNotMatch(jobSources, /dedup_hash:await hash\(j\.url\)/);
});
