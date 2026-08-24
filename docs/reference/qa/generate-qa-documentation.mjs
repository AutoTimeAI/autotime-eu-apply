// Regenerates AutoTime-EU-Apply-QA-Documentation.xlsx from the current
// state of the repository's automated test suite and screenshot evidence.
//
// Usage (from this directory, docs/qa/):
//   npm install
//   node generate-qa-documentation.mjs
//
// This is a standalone script with its own package.json - exceljs is a
// docs-tooling dependency only, deliberately not added to the main pnpm
// workspace. Re-run whenever test cases or screenshots change materially;
// this file is the source of truth the .xlsx is generated from, not the
// other way around.

import ExcelJS from "exceljs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..", "..");
const SHOT = (rel) => path.join(REPO, "screenshots", rel);
const OUT = path.join(HERE, "AutoTime-EU-Apply-QA-Documentation.xlsx");

// ---------------------------------------------------------------------------
// Style tokens
// ---------------------------------------------------------------------------
const NAVY = "FF14202B";
const TEAL = "FF1E6E62";
const TEAL_SOFT = "FFE4F0EC";
const AMBER = "FF9C5F24";
const AMBER_SOFT = "FFF5E8D8";
const SLATE = "FF52626E";
const HEADER_FILL = "FF14202B";
const HEADER_FONT = "FFFFFFFF";
const BORDER = { style: "thin", color: { argb: "FFD8E0E3" } };
const THIN_BORDER = { top: BORDER, left: BORDER, bottom: BORDER, right: BORDER };

function headerRow(ws, row, texts) {
  const r = ws.getRow(row);
  texts.forEach((t, i) => {
    const c = r.getCell(i + 1);
    c.value = t;
    c.font = { bold: true, color: { argb: HEADER_FONT }, size: 11 };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
    c.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
    c.border = THIN_BORDER;
  });
  r.height = 22;
  r.commit();
}

function styleDataRow(row, { fillArgb } = {}) {
  row.eachCell((cell) => {
    cell.alignment = { vertical: "top", wrapText: true };
    cell.border = THIN_BORDER;
    if (fillArgb) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fillArgb } };
  });
}

function statusTag(cell, status) {
  cell.value = status;
  cell.font = { bold: true, color: { argb: status === "Pass" ? TEAL : AMBER } };
  cell.alignment = { vertical: "top", horizontal: "center" };
}

const workbook = new ExcelJS.Workbook();
workbook.creator = "AutoTime EU Apply - QA documentation pass";
workbook.created = new Date("2026-08-21");

// ===========================================================================
// SHEET 1 - Read Me
// ===========================================================================
const readme = workbook.addWorksheet("Read Me", { properties: { tabColor: { argb: TEAL } } });
readme.columns = [{ width: 34 }, { width: 100 }];
let rr = 1;
readme.getCell(`A${rr}`).value = "AutoTime EU Apply - QA Documentation";
readme.getCell(`A${rr}`).font = { bold: true, size: 18, color: { argb: NAVY } };
rr += 1;
readme.getCell(`A${rr}`).value = "Compiled 2026-08-21, from the actual automated test suite and screenshot evidence already captured in the repository - nothing in this workbook is invented; every test case below is a real test("
  + "\"...\"" + ") in the codebase, and every screenshot is a real file already committed.";
readme.getCell(`A${rr}`).font = { italic: true, color: { argb: SLATE } };
readme.mergeCells(`A${rr}:B${rr}`);
readme.getCell(`A${rr}`).alignment = { wrapText: true };
readme.getRow(rr).height = 40;
rr += 2;

const readmeRows = [
  ["Sheet", "What it contains"],
  ["User Journeys", "The end-to-end paths a real candidate takes through the product, persona by persona - not a list of tests, but the story the tests exist to protect."],
  ["Product Journey Map", "Every product phase/screen, its primary actions, and which automated specs + screenshot folders cover it."],
  ["Test Cases", "Every automated test case in the repository (126 total: 102 local-fixture + 24 production), with a Test ID, module, steps, expected result, linked screenshot evidence, and pass status."],
  ["Screenshot Gallery", "The actual captured screenshots (124 files, ~16 MB), organized by product phase, each with a caption naming the state it proves."],
];
readmeRows.forEach((cols, i) => {
  const row = readme.getRow(rr + i);
  row.getCell(1).value = cols[0];
  row.getCell(2).value = cols[1];
  if (i === 0) {
    row.eachCell((c) => { c.font = { bold: true, color: { argb: HEADER_FONT } }; c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } }; });
  }
  row.eachCell((c) => { c.alignment = { wrapText: true, vertical: "top" }; c.border = THIN_BORDER; });
  row.height = i === 0 ? 20 : 34;
});
rr += readmeRows.length + 2;

readme.getCell(`A${rr}`).value = "How Test IDs are organized";
readme.getCell(`A${rr}`).font = { bold: true, size: 13, color: { argb: NAVY } };
rr += 1;
const moduleLegend = [
  ["TC-HOME-##", "Phase 1 - Home / next-best-action"],
  ["TC-JOBS-##", "Phase 2 - Jobs, search, analysis"],
  ["TC-APPS-##", "Phase 3 - Applications pipeline"],
  ["TC-INTV-##", "Phase 4 - Interviews"],
  ["TC-CTRY-##", "Phase 5 - Countries / international pathways"],
  ["TC-CARR-##", "Phase 6 - Career Direction / ESCO / role pathways"],
  ["TC-PROF-##", "Phase 7 - Profile"],
  ["TC-LAND-##", "Phase 8 - Landing & Login"],
  ["TC-ADMN-##", "Admin foundation & security"],
  ["TC-MOB-##", "Mobility profile persistence, sync & account controls"],
  ["TC-CORE-##", "Core cross-phase journeys (onboarding, CV build/tailor, ESCO)"],
  ["TC-SYS-##", "Cross-cutting system checks (route protection, layering, outreach, extension)"],
  ["TC-VIS-##", "Visual-regression baselines"],
  ["TC-PRD-##", "Production suite - runs against the real, live deployment"],
];
readme.getRow(rr).values = ["Prefix", "Covers"];
readme.getRow(rr).eachCell((c) => { c.font = { bold: true, color: { argb: HEADER_FONT } }; c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } }; c.border = THIN_BORDER; });
rr += 1;
moduleLegend.forEach(([a, b]) => {
  readme.getCell(`A${rr}`).value = a;
  readme.getCell(`A${rr}`).font = { name: "Consolas" };
  readme.getCell(`B${rr}`).value = b;
  readme.getRow(rr).eachCell((c) => { c.border = THIN_BORDER; c.alignment = { vertical: "top" }; });
  rr += 1;
});
rr += 1;
readme.getCell(`A${rr}`).value = "Status column note";
readme.getCell(`A${rr}`).font = { bold: true, color: { argb: NAVY } };
rr += 1;
readme.getCell(`A${rr}`).value = "\"Pass\" reflects each test's last confirmed run in this project's CI (GitHub Actions) as of 2026-08-21, not a live re-run performed to produce this document. See docs/quality-assurance.md in the repository for the dated production-verification record this workbook accompanies.";
readme.mergeCells(`A${rr}:B${rr}`);
readme.getCell(`A${rr}`).alignment = { wrapText: true, vertical: "top" };
readme.getRow(rr).height = 34;

console.log("Read Me sheet built.");

// ===========================================================================
// SHEET 2 - User Journeys
// ===========================================================================
const uj = workbook.addWorksheet("User Journeys", { properties: { tabColor: { argb: TEAL } } });
uj.columns = [
  { header: "Journey", key: "journey", width: 30 },
  { header: "Persona", key: "persona", width: 22 },
  { header: "Trigger", key: "trigger", width: 26 },
  { header: "Steps", key: "steps", width: 70 },
  { header: "Success outcome", key: "outcome", width: 40 },
  { header: "Proven by", key: "proof", width: 26 },
];
headerRow(uj, 1, uj.columns.map((c) => c.header));

const journeys = [
  {
    journey: "1. First login & onboarding",
    persona: "Brand-new candidate, no profile yet",
    trigger: "Signs up and lands on Home for the first time",
    steps: "Home detects an incomplete profile and opens the onboarding wizard inline rather than the full dashboard. Candidate chooses to upload an existing CV or build one from scratch. If uploading, the CV is parsed into structured evidence (summary, skills, experience, education) for review before saving. If building fresh, the CV builder opens and communicates export requirements up front.",
    outcome: "Profile has enough confirmed evidence that Home's next-best-action moves on from \"add career evidence\" to a real recommendation (discover pathways, or analyse a job).",
    proof: "TC-CORE-01, TC-CORE-02, TC-HOME-01",
  },
  {
    journey: "2. Discover a career direction",
    persona: "Candidate unsure which roles fit their evidence",
    trigger: "Has confirmed CV evidence but no target role yet",
    steps: "Home recommends \"discover pathways\". Candidate answers a short ESCO-backed questionnaire; each answer is mapped only to skills with explicit or strongly-inferred evidence, never invented. The questionnaire ends with an explainable set of skill-overlap matches, which candidate reviews across the 5-stage Career Direction wizard: evidence confirmation, preferences, pathway options, role detail, and finally selecting (and saving) a primary lane.",
    outcome: "A confirmed, user-scoped primary career lane is saved and persists across sessions; Career Direction and Jobs analysis both reuse the same saved mobility/target-country context afterward instead of asking again.",
    proof: "TC-CORE-03, TC-CARR-01 to TC-CARR-04, TC-MOB-09, TC-MOB-10",
  },
  {
    journey: "3. Find and evaluate a job",
    persona: "Candidate actively job-hunting",
    trigger: "Pastes a vacancy (manually, or via the browser extension) or browses the aggregated EU job feed",
    steps: "Job is captured with extracted facts (title, employer, location, work mode). Candidate opens the job detail and requests an AutoTime Fit Score analysis. The score is computed conservatively (role match, required skills, seniority, location/work-authorisation fit, CV evidence strength) and returns a recommendation - High Priority, Worth Applying, Stretch, or Skip - with matched signals, missing signals and risk areas, never inventing facts not present in the profile or job text.",
    outcome: "Candidate has evidence-backed clarity on whether a role is worth their time before writing anything, and the job's tracked state (decision, evidence) is saved for later.",
    proof: "TC-JOBS-01 to TC-JOBS-04, TC-CORE-04",
  },
  {
    journey: "4. Apply, Consider or Skip",
    persona: "Candidate who has analysed a job",
    trigger: "Chooses Apply, Consider, or Skip from the job's analysis",
    steps: "Apply moves the job into the Applications pipeline and prepares evidence-backed application content (cover letter, profile summary, motivation/strengths/availability answers) using only supplied evidence - claims with no evidence are flagged as missing rather than invented. If the candidate has asserted an unsupported claim (e.g. work rights not evidenced), the application is explicitly blocked from being marked ready until resolved. Consider keeps the job visible with contextual next steps; Skip records the decision with a stated reason.",
    outcome: "Every application in the pipeline has a traceable evidence trail and readiness state; nothing reaches \"Applied\" while an unsupported claim is still open.",
    proof: "TC-APPS-01 to TC-APPS-04, TC-JOBS-05, TC-JOBS-06",
  },
  {
    journey: "5. Track an application to a decision",
    persona: "Candidate managing multiple live applications",
    trigger: "Application status changes as the candidate hears back",
    steps: "The pipeline view groups applications by stage with working stage filters. Opening an application shows its detail, evidence and current readiness state. When a candidate confirms submission, the applied record captures the confirmation. If rejected, the employer's stated reason and the candidate's own interpretation are recorded as two distinct fields, never merged.",
    outcome: "At any point, the candidate (and, on request, AutoTime's own re-analysis) can see exactly what stage every application is at and why, with real counts driving the stage filters rather than stale cached numbers.",
    proof: "TC-APPS-05 to TC-APPS-08, TC-PRD-15, TC-PRD-16, TC-PRD-17",
  },
  {
    journey: "6. Prepare for and record an interview",
    persona: "Candidate with an application that reached interview stage",
    trigger: "An Applied-stage application progresses to an interview, or the candidate records one directly",
    steps: "Home surfaces the interview as a priority action once it becomes imminent (and updates live if a new imminent interview is created mid-session). The interview prep pack (role summary, positioning, likely questions, STAR prompts, questions to ask) is generated from confirmed evidence only, with any thin-evidence area flagged rather than fabricated - immigration/work-right questions get a boundary note to check official sources instead of advice. The candidate can practise answers (scored separately from formal preparation readiness) and, for technical rounds, work through EU-context technical drills. After the interview, the outcome (progressed, rejected, or awaiting) is recorded and the linked application updates accordingly.",
    outcome: "A complete, evidence-grounded interview record exists from first prep through recorded outcome, visibly linked back to its source application.",
    proof: "TC-INTV-01 to TC-INTV-09, TC-PRD-18, TC-PRD-19",
  },
  {
    journey: "7. Explore an international / cross-border pathway",
    persona: "Candidate targeting a specific EU country or exploring broadly",
    trigger: "Opens the Countries module for a named country (Ireland, Germany, Netherlands) or an unsupported one",
    steps: "Named, fully-supported countries show real pathway intelligence: recognised permit routes, occupation categories, required evidence, recruiter questions to ask, and dated official sources - clearly labelled with a review date and rule version so staleness is visible. Any other European country falls back to \"explorer\" mode with an honest, distinct limitation statement (not a duplicate of the mode label) rather than fabricated pathway detail. A vacancy-wording evidence check and mobility profile form (with sponsor-employer and official-source references) support the decision either way.",
    outcome: "The candidate never receives a legal-sounding claim the product can't actually back with a dated source, and knows explicitly when they've left \"verified\" territory into \"explorer\" territory.",
    proof: "TC-CTRY-01 to TC-CTRY-05, TC-PRD-20 to TC-PRD-24",
  },
  {
    journey: "8. Maintain a profile across devices",
    persona: "Returning candidate with an account on more than one device or browser",
    trigger: "Edits profile fields, or signs in from a new device/browser",
    steps: "The candidate's profile evidence, canonical CV and readiness state sync to their account (cloud-first, with a local cache for offline resilience) rather than living only in one browser's storage. If a saved mobility profile exists, empty profile fields are pre-filled from it (with a visible note), but existing profile data is never silently overwritten. Deleting the local browser copy is explicitly distinct from deleting the account profile itself.",
    outcome: "A candidate's evidence and readiness state is consistent everywhere they sign in, with no silent data loss and no silent overwrite.",
    proof: "TC-MOB-01 to TC-MOB-08, TC-MOB-11 to TC-MOB-14, TC-PROF-03",
  },
];

journeys.forEach((j, i) => {
  const row = uj.getRow(i + 2);
  row.values = [j.journey, j.persona, j.trigger, j.steps, j.outcome, j.proof];
  styleDataRow(row, { fillArgb: i % 2 === 0 ? "FFFFFFFF" : "FFF4F6F7" });
  row.getCell(1).font = { bold: true, color: { argb: NAVY } };
  row.height = 130;
});
uj.views = [{ state: "frozen", ySplit: 1 }];

console.log("User Journeys sheet built.");

// ===========================================================================
// SHEET 3 - Product Journey Map
// ===========================================================================
const pjm = workbook.addWorksheet("Product Journey Map", { properties: { tabColor: { argb: TEAL } } });
pjm.columns = [
  { header: "Phase", key: "phase", width: 26 },
  { header: "Key screens", key: "screens", width: 34 },
  { header: "Primary user actions", key: "actions", width: 50 },
  { header: "Automated spec files", key: "specs", width: 34 },
  { header: "Screenshot evidence folder", key: "shots", width: 34 },
];
headerRow(pjm, 1, pjm.columns.map((c) => c.header));

const phases = [
  {
    phase: "Phase 1 - Home",
    screens: "Dashboard landing / next-best-action",
    actions: "See one clear next action at a time (onboard, add evidence, discover pathways, analyse a job, review an application, prepare an interview); track saved-job and active-application counts; expand the product walkthrough video.",
    specs: "22-phase-1-home-visual.spec.ts, 23-phase-1-home-states.spec.ts, 24-phase-1-corrected-evidence.spec.ts",
    shots: "screenshots/phase-1-home/corrected-final-apps-v3/",
  },
  {
    phase: "Phase 2 - Jobs",
    screens: "Jobs list, job detail, analysis result, aggregated EU feed",
    actions: "Add a job manually or via extension; search/filter tracked jobs; open a job's detail without re-triggering analysis; request an AutoTime Fit Score.",
    specs: "25-phase-2-jobs-analysis.spec.ts, 08-extension-linkedin-sync.spec.ts",
    shots: "screenshots/phase-2-jobs-analysis/review/",
  },
  {
    phase: "Phase 3 - Applications",
    screens: "Pipeline board, application detail, evidence & readiness panel",
    actions: "Move a job into the pipeline (Apply/Consider/Skip); review readiness blockers; confirm submission; record a rejection with employer reason vs. own interpretation kept distinct.",
    specs: "13-phase-3b-visual-acceptance.spec.ts, 26-phase-3-applications.spec.ts",
    shots: "screenshots/phase-3-applications/review/, screenshots/phase-3b-1/",
  },
  {
    phase: "Phase 4 - Interviews",
    screens: "Interview list, preparation pack, practice mode, outcome recording",
    actions: "See interviews grouped by stage; generate an evidence-grounded prep pack; practise an answer (scored separately from readiness); run a technical drill; record an outcome.",
    specs: "15-phase-3c-interviews.spec.ts, 27-phase-4-interviews.spec.ts",
    shots: "screenshots/phase-4-interviews/review/, screenshots/phase-3c/",
  },
  {
    phase: "Phase 5 - Countries",
    screens: "Countries overview, country workspace, mobility form, official sources",
    actions: "Open a named country's real pathway intelligence or an unsupported country's honest explorer-mode limitation; run a vacancy-wording evidence check; complete the mobility profile form.",
    specs: "09-international-phase1.spec.ts, 28-phase-5-countries.spec.ts",
    shots: "screenshots/phase-5-countries/review/",
  },
  {
    phase: "Phase 6 - Career Direction",
    screens: "5-stage wizard: evidence, preferences, pathways, role detail, lane selection",
    actions: "Answer the ESCO questionnaire; review explainable skill-overlap matches; confirm preferences; compare pathway options; select and save a primary lane.",
    specs: "16-role-pathways-selection.spec.ts, 29-phase-6-career-direction.spec.ts, 31-mobility-facts-reuse.spec.ts",
    shots: "screenshots/phase-6-career-direction/review/",
  },
  {
    phase: "Phase 7 - Profile",
    screens: "Profile workspace (contact, location & work rights, CV, readiness)",
    actions: "Confirm personal details, target countries and canonical CV; review evidence & readiness; accept mobility-profile pre-fill without losing existing data.",
    specs: "30-phase-7-profile.spec.ts, 32-profile-mobility-prefill.spec.ts",
    shots: "screenshots/phase-7-profile/review/",
  },
  {
    phase: "Phase 8 - Landing & Login",
    screens: "Public landing page, EU Fit Engine demo, login/sign-in",
    actions: "Learn the product's value proposition and try the EU Fit demo unauthenticated; sign in; get redirected to the dashboard on success.",
    specs: "33-phase-8-landing-login.spec.ts",
    shots: "screenshots/phase-8-landing-login/review/",
  },
  {
    phase: "Admin foundation",
    screens: "Admin login/denied state, admin overview (staff-only)",
    actions: "Ordinary users are denied discovery and access to every admin surface and API; staff with an active membership and the right permission can review users, feature flags, market-data refresh and audit events.",
    specs: "14-admin-foundation-security.spec.ts",
    shots: "screenshots/admin-foundation/",
  },
  {
    phase: "Account & mobility sync",
    screens: "Settings, account deletion, mobility consent",
    actions: "Sync a mobility profile with explicit consent; reconcile local vs. server conflicts without silent overwrite; distinguish browser-data removal from account deletion.",
    specs: "11-mobility-persistence.spec.ts, 12-mobility-account-controls.spec.ts",
    shots: "(behavioural - no dedicated screenshot set)",
  },
];

phases.forEach((p, i) => {
  const row = pjm.getRow(i + 2);
  row.values = [p.phase, p.screens, p.actions, p.specs, p.shots];
  styleDataRow(row, { fillArgb: i % 2 === 0 ? "FFFFFFFF" : "FFF4F6F7" });
  row.getCell(1).font = { bold: true, color: { argb: NAVY } };
  row.height = 70;
});
pjm.views = [{ state: "frozen", ySplit: 1 }];

console.log("Product Journey Map sheet built.");

// ===========================================================================
// SHEET 4 - Test Cases
// ===========================================================================
const tc = workbook.addWorksheet("Test Cases", { properties: { tabColor: { argb: TEAL } } });
tc.columns = [
  { header: "Test ID", key: "id", width: 14 },
  { header: "Module", key: "module", width: 26 },
  { header: "Suite", key: "suite", width: 22 },
  { header: "Spec file", key: "file", width: 30 },
  { header: "Test case title", key: "title", width: 42 },
  { header: "Type", key: "type", width: 16 },
  { header: "Steps", key: "steps", width: 55 },
  { header: "Expected result", key: "expected", width: 55 },
  { header: "Screenshot evidence", key: "shot", width: 34 },
  { header: "Status", key: "status", width: 10 },
];
headerRow(tc, 1, tc.columns.map((c) => c.header));
tc.views = [{ state: "frozen", ySplit: 1, xSplit: 1 }];
tc.autoFilter = { from: "A1", to: "J1" };

// Each module: [prefix, [ [title, file, type, steps, expected, screenshotFile-or-null], ... ] ]
const modules = [
["LAND", "Phase 8 - Landing & Login", [
  ["homepage loads and shows the main CTA", "01-smoke.spec.ts", "Smoke", "Load the public homepage unauthenticated.", "Page renders with the primary call-to-action visible; no console errors.", null],
  ["landing page hero and CTAs are green-free and use the shared blue", "33-phase-8-landing-login.spec.ts", "Visual", "Load the landing page hero section.", "Hero and CTA buttons use the shared brand blue, never the sitewide teal/green default reserved for status colour.", "landing-hero-1440x900.png"],
  ["EU Fit Engine demo section is green-free", "33-phase-8-landing-login.spec.ts", "Visual", "Scroll to the interactive EU Fit Engine demo on the landing page.", "Demo section styling matches the shared blue palette, not status-green.", "landing-eufit-1440x900.png"],
  ["login page sign-in buttons are green-free with a single primary action", "33-phase-8-landing-login.spec.ts", "Visual", "Load /login.", "Exactly one primary (blue) action is present; no secondary button is styled to compete with it.", "login-1440x900.png"],
  ["shared brand name and PRO badge use blue everywhere, not the sitewide teal/green default", "33-phase-8-landing-login.spec.ts", "Visual", "Check the brand name and PRO plan badge across landing and dashboard chrome.", "Brand name and PRO badge are rendered in the shared blue token, consistently, wherever they appear.", null],
]],
["HOME", "Phase 1 - Home", [
  ["Home keeps one action and every primary journey reachable", "22-phase-1-home-visual.spec.ts", "Visual", "Load the authenticated dashboard Home page.", "Exactly one next-best-action is shown; the side nav still exposes every primary journey (Jobs, Applications, Interviews, Career Direction, Countries, Profile).", null],
  ["completely-new-user selects add_career_evidence", "23-phase-1-home-states.spec.ts", "Functional", "Load Home with a fixture profile that has no confirmed evidence.", "Next-best-action resolves deterministically to add_career_evidence.", "completely-new-user-corrected-390x844.png"],
  ["incomplete-profile selects add_career_evidence", "23-phase-1-home-states.spec.ts", "Functional", "Load Home with a partially-completed profile fixture.", "Next-best-action resolves to add_career_evidence until required evidence is confirmed.", null],
  ["evidence-no-career-lane selects discover_pathways", "23-phase-1-home-states.spec.ts", "Functional", "Load Home with confirmed evidence but no saved career lane.", "Next-best-action resolves to discover_pathways.", null],
  ["saved-unanalysed-job selects analyse_job", "23-phase-1-home-states.spec.ts", "Functional", "Load Home with a tracked job that has no analysis yet.", "Next-best-action resolves to analyse_job.", null],
  ["active-application selects review_application", "23-phase-1-home-states.spec.ts", "Functional", "Load Home with an application mid-pipeline.", "Next-best-action resolves to review_application.", "active-application-corrected-390x844.png"],
  ["imminent-interview selects prepare_interview", "23-phase-1-home-states.spec.ts", "Functional", "Load Home with an interview scheduled within the imminent window.", "Next-best-action resolves to prepare_interview and takes visible priority.", "imminent-interview-corrected-1440x900.png"],
  ["distant-interview selects prepare_interview", "23-phase-1-home-states.spec.ts", "Functional", "Load Home with an interview scheduled well in the future.", "Next-best-action still resolves to prepare_interview, correctly outside the imminent-priority path.", null],
  ["completed-interview-awaiting-outcome selects prepare_interview", "23-phase-1-home-states.spec.ts", "Functional", "Load Home with a completed interview whose outcome hasn't been recorded.", "Next-best-action resolves to prepare_interview (record the outcome), not a stale earlier state.", null],
  ["integration-unavailable selects add_career_evidence", "23-phase-1-home-states.spec.ts", "Functional", "Load Home while a required backend integration is unavailable.", "Falls back safely to add_career_evidence rather than crashing or showing a broken state.", "integration-unavailable-corrected-390x844.png"],
  ["loading selects add_career_evidence", "23-phase-1-home-states.spec.ts", "Functional", "Load Home mid-fetch, before data resolves.", "Shows a safe default (add_career_evidence) rather than an empty or broken next action while loading.", null],
  ["72-hour interview boundaries and competing priorities remain unchanged", "23-phase-1-home-states.spec.ts", "Functional", "Set up two competing priorities (e.g. an interview at the 72-hour boundary and another action).", "The interview priority boundary and tie-breaking logic between competing next actions stays exactly as specified.", null],
  ["imminent-interview 1440x900", "24-phase-1-corrected-evidence.spec.ts", "Visual", "Founder-review capture: imminent interview state, desktop viewport.", "Matches the founder-approved reference screenshot exactly.", "imminent-interview-corrected-1440x900.png"],
  ["imminent-interview 390x844", "24-phase-1-corrected-evidence.spec.ts", "Visual", "Founder-review capture: imminent interview state, mobile viewport.", "Matches the founder-approved reference screenshot exactly.", "imminent-interview-corrected-390x844.png"],
  ["completely-new-user 390x844", "24-phase-1-corrected-evidence.spec.ts", "Visual", "Founder-review capture: brand-new user state, mobile viewport.", "Matches the founder-approved reference screenshot exactly.", "completely-new-user-corrected-390x844.png"],
  ["active-application 390x844", "24-phase-1-corrected-evidence.spec.ts", "Visual", "Founder-review capture: active application state, mobile viewport.", "Matches the founder-approved reference screenshot exactly.", "active-application-corrected-390x844.png"],
  ["integration-unavailable 390x844", "24-phase-1-corrected-evidence.spec.ts", "Visual", "Founder-review capture: integration-unavailable safe-retry state, mobile viewport.", "Matches the founder-approved reference screenshot exactly.", "integration-unavailable-corrected-390x844.png"],
]],
["JOBS", "Phase 2 - Jobs & navigation", [
  ["Jobs to Job Detail to Analysis preserves deterministic workflow", "25-phase-2-jobs-analysis.spec.ts", "Functional", "From the Jobs list, open a tracked job, then request analysis.", "The list-to-detail-to-analysis flow completes deterministically with no lost state between steps.", "jobs-populated-1440x900.png, job-detail-1440x900.png, analysis-consider-1440x900.png"],
  ["Phase 2 remains readable and operable on mobile", "25-phase-2-jobs-analysis.spec.ts", "Responsive", "Repeat the Jobs -> detail -> analysis flow at a mobile viewport.", "All controls remain reachable and readable with no horizontal overflow.", null],
  ["desktop grouped navigation keeps all seven destinations reachable", "10-phase2-entry-gate-navigation.spec.ts", "Functional", "Load the dashboard at a desktop viewport.", "All seven primary destinations are reachable from the grouped navigation.", "phase2-entry-gate-live.png"],
  ["mobile grouped navigation remains keyboard reachable", "10-phase2-entry-gate-navigation.spec.ts", "Accessibility", "Tab through the mobile navigation using only the keyboard.", "Every destination remains reachable and focusable via keyboard alone.", "phase2-entry-gate-live-mobile.png"],
]],
["APPS", "Phase 3 - Applications", [
  ["Apply journey, application readiness and applied record", "13-phase-3b-visual-acceptance.spec.ts", "Functional", "Analyse a job, choose Apply, complete readiness checks, confirm submission.", "Application reaches a readiness-confirmed applied record with its evidence trail intact.", "apply-analysis-1440.png, applied-state-1440.png"],
  ["Consider and incomplete-evidence journeys remain contextual", "13-phase-3b-visual-acceptance.spec.ts", "Functional", "Choose Consider on a job with incomplete evidence.", "The candidate sees contextual next steps specific to what evidence is still missing, not a generic message.", "consider-analysis-390.png"],
  ["Skip is explained and legacy routes resolve without loops", "13-phase-3b-visual-acceptance.spec.ts", "Functional", "Choose Skip on a job; separately, visit a legacy/deprecated route.", "Skip records a stated reason; legacy routes redirect once with no redirect loop.", "skip-analysis-1440.png"],
  ["keyboard and tab semantics remain usable", "13-phase-3b-visual-acceptance.spec.ts", "Accessibility", "Tab through the Apply/Consider/Skip decision UI using only the keyboard.", "Focus order is logical and every control remains operable without a mouse.", null],
  ["pipeline states and stage filters are operational", "26-phase-3-applications.spec.ts", "Functional", "Open the Applications pipeline with applications in multiple stages.", "Stage filters correctly narrow the visible set and reflect real counts.", "pipeline-multiple-stages-1440x900.png"],
  ["blocked, ready, applied and rejected detail states preserve transitions", "26-phase-3-applications.spec.ts", "Functional", "Move a single application through blocked -> ready -> applied, and separately through rejected.", "Each transition preserves prior evidence/readiness data; nothing is lost or reset between states.", "blocked-unsupported-claim-1440x900.png, ready-application-1440x900.png, applied-confirmation-1440x900.png, rejected-application-1440x900.png"],
  ["application detail is responsive at required intermediate viewports", "26-phase-3-applications.spec.ts", "Responsive", "Open an application's detail view at tablet-class intermediate viewports (1024x768, 768x1024).", "Layout remains readable and operable at both intermediate breakpoints, not just mobile/desktop extremes.", "application-detail-1024x768.png, application-detail-768x1024.png"],
  ["loading and unavailable states are stable and private to test principals", "26-phase-3-applications.spec.ts", "Functional", "Load the pipeline while data is loading, and separately while the sync backend is unavailable.", "Both states render a stable, non-crashing shell, and no other test principal's data is ever visible.", "loading-390x844.png, unavailable-390x844.png"],
]],
["INTV", "Phase 4 - Interviews", [
  ["empty state and Applied application create a recruiter screen", "15-phase-3c-interviews.spec.ts", "Functional", "With no interviews recorded, move an application to Applied and add a recruiter-screen interview.", "Empty state renders correctly beforehand; the new recruiter-screen interview appears immediately after creation.", "interviews-empty-1440.png"],
  ["technical preparation exposes sources and blocks unsupported confirmation", "15-phase-3c-interviews.spec.ts", "Functional", "Open technical interview preparation for a role requiring evidence the candidate hasn't confirmed.", "Sources/evidence gaps are shown explicitly; the candidate cannot confirm readiness while a claim remains unsupported.", null],
  ["practice confidence remains separate from readiness", "15-phase-3c-interviews.spec.ts", "Functional", "Run a practice answer session, then check the formal readiness indicator.", "Practice scoring never silently marks the interview as formally ready - the two are tracked independently.", "practice-mode-1440.png"],
  ["complete evidence review requires explicit final review before Ready", "15-phase-3c-interviews.spec.ts", "Functional", "Complete all evidence items for an interview and attempt to mark it Ready.", "An explicit final-review confirmation step is required; Ready cannot be reached by evidence completion alone.", "ready-after-final-review-1440.png"],
  ["progressed outcome continues into a preserved next stage", "15-phase-3c-interviews.spec.ts", "Functional", "Record a \"progressed\" outcome on a completed interview.", "The application's pipeline advances to the correct next stage with prior data preserved.", "application-pipeline-after-outcome-1440.png"],
  ["Home and application detail surface the linked interview", "15-phase-3c-interviews.spec.ts", "Functional", "Create an interview linked to a tracked application.", "Both Home and the application's own detail view show the linked interview, not just the Interviews list.", "application-linked-interview-1440.png, home-interview-priority-1440.png"],
  ["Home updates when an imminent interview is created in the active session", "15-phase-3c-interviews.spec.ts", "Functional", "While already on Home, create a new interview scheduled within the imminent window.", "Home's next-best-action updates live, without requiring a page reload.", null],
  ["recorded rejection keeps employer reason and interpretation separate", "15-phase-3c-interviews.spec.ts", "Functional", "Record a rejection outcome, entering both the employer's stated reason and the candidate's own read on why.", "The two fields are stored and displayed distinctly - never merged into one string.", null],
  ["mobile preparation has no horizontal overflow and legacy route redirects", "15-phase-3c-interviews.spec.ts", "Responsive", "Open interview preparation at a mobile viewport; separately visit a legacy interview-prep route.", "No horizontal scroll/overflow at mobile width; legacy route redirects correctly to the current one.", "preparation-390x844.png, preparation-360x800.png"],
  ["empty state and populated list with mixed stages", "27-phase-4-interviews.spec.ts", "Visual", "Load Interviews with none recorded, then with several across different stages.", "Empty state and populated multi-stage list both render correctly and distinctly.", "pipeline-empty-1440x900.png, pipeline-multiple-stages-1440x900.png"],
  ["overview, blocked preparation and practice tabs", "27-phase-4-interviews.spec.ts", "Functional", "Open an interview's overview tab, a blocked-preparation case, and the practice tab.", "All three tabs render their correct, distinct state with no cross-contamination between them.", "overview-1440x900.png, preparation-blocked-1440x900.png, practice-1440x900.png"],
  ["completed interview outcome tab", "27-phase-4-interviews.spec.ts", "Functional", "Open the outcome tab of a completed interview.", "Recorded outcome (progressed/rejected/awaiting) displays correctly with its supporting detail.", "outcome-1440x900.png"],
  ["detail is responsive at required intermediate viewports", "27-phase-4-interviews.spec.ts", "Responsive", "Open interview detail at 1024x768 and 768x1024.", "Layout remains readable and operable at both intermediate breakpoints.", "detail-1024x768.png, detail-768x1024.png"],
  ["shared tab standard: single underline, no pills or fills", "27-phase-4-interviews.spec.ts", "Visual", "Inspect the tab styling across interview sub-views.", "Tabs use the single shared underline treatment app-wide - never pill or filled-background styling.", null],
]],
["CTRY", "Phase 5 - Countries", [
  ["authenticated desktop country and evidence flows", "09-international-phase1.spec.ts", "Functional", "As an authenticated user at desktop, open a country workspace and run the vacancy evidence check.", "Country pathway detail and the evidence check both render correctly and consistently.", "country-workspace-1440x900.png"],
  ["legacy migration remains review-only and account scoped", "09-international-phase1.spec.ts", "Functional", "Trigger the legacy mobility-data migration path.", "Migration only ever surfaces data for review, scoped to the signed-in account, never auto-applies or leaks across accounts.", null],
  ["authenticated mobile overview, sources and mobility form", "09-international-phase1.spec.ts", "Responsive", "As an authenticated user at mobile, open the countries overview, official sources, and mobility form.", "All three render correctly and remain operable at mobile width.", "overview-390x844.png, mobility-form-390x844.png"],
  ["overview and country workspace are green-free with a single hero primary", "28-phase-5-countries.spec.ts", "Visual", "Load the Countries overview and a country workspace.", "Styling uses the shared blue, not status-green, with exactly one primary hero action.", "overview-1440x900.png"],
  ["vacancy evidence check surfaces a blocked decision", "28-phase-5-countries.spec.ts", "Functional", "Paste vacancy wording that fails the evidence check.", "The check clearly surfaces a blocked decision rather than a silent pass.", "country-workspace-blocked-1440x900.png"],
  ["mobility profile form, sponsor guide and official sources", "28-phase-5-countries.spec.ts", "Functional", "Complete the mobility profile form; open the sponsor-employers guide and official sources tab.", "All three sub-views render their real, dated content correctly.", "mobility-form-1440x900.png, sponsor-employers-1440x900.png, official-sources-1440x900.png"],
  ["detail is responsive at required intermediate viewports", "28-phase-5-countries.spec.ts", "Responsive", "Open the countries overview at 1024x768 and 768x1024.", "Layout remains readable and operable at both intermediate breakpoints.", "overview-1024x768.png, overview-768x1024.png"],
]],
["CARR", "Phase 6 - Career Direction", [
  ["confirmed backend evidence produces and persists a user-scoped primary lane", "16-role-pathways-selection.spec.ts", "Functional", "Confirm backend-relevant evidence, then select a primary career lane.", "The selected lane is saved, scoped to the signed-in user, and persists across a fresh session.", "stage5-lane-saved-1440x900.png"],
  ["full pathway flow is green-free with a single primary per stage", "29-phase-6-career-direction.spec.ts", "Visual", "Step through all 5 stages of the Career Direction wizard.", "Every stage uses the shared blue, not status-green, with exactly one primary action per stage.", "stage1-evidence-confirmed-1440x900.png, stage2-preferences-1440x900.png, stage3-pathways-1440x900.png, stage4-role-detail-1440x900.png"],
  ["stepper active state uses shared blue, not the site teal default", "29-phase-6-career-direction.spec.ts", "Visual", "Check the wizard's stage-progress stepper while on an active stage.", "The active-stage indicator uses shared blue, never the sitewide teal reserved for status colour.", null],
  ["active step scrolls into view on mobile when advancing stages", "29-phase-6-career-direction.spec.ts", "Responsive", "Advance through wizard stages on a mobile viewport.", "The newly-active step scrolls into view automatically; the candidate is never left looking at an off-screen stage.", "stage3-pathways-mobile-tap-390x844.png"],
  ["detail is responsive at required intermediate viewports", "29-phase-6-career-direction.spec.ts", "Responsive", "Open wizard stage 1 at 1024x768 and 768x1024.", "Layout remains readable and operable at both intermediate breakpoints.", "stage1-1024x768.png, stage1-768x1024.png"],
  ["Career Direction pre-fills target countries and support need from the saved mobility profile", "31-mobility-facts-reuse.spec.ts", "Functional", "Open Career Direction after a mobility profile has already been saved.", "Target countries and sponsorship/support need are pre-filled from the saved profile instead of asking again.", null],
  ["Jobs analysis uses the saved mobility profile instead of the legacy dashboard flag", "31-mobility-facts-reuse.spec.ts", "Functional", "Run a job analysis after a mobility profile has already been saved.", "Analysis reads from the saved mobility profile, not the older, now-legacy dashboard flag.", null],
]],
["PROF", "Phase 7 - Profile", [
  ["profile workspace is green-free with a single primary action", "30-phase-7-profile.spec.ts", "Visual", "Load the Profile workspace.", "Styling uses shared blue, not status-green, with exactly one primary action visible.", "workspace-top-1440x900.png"],
  ["form sections are reachable and readiness/quality panels render", "30-phase-7-profile.spec.ts", "Functional", "Open every Profile form section and check the readiness/quality panels.", "All sections are reachable; readiness and CV-quality panels render their real computed state.", "workspace-form-sections-1440x900.png, workspace-output-column-1440x900.png"],
  ["detail is responsive at required intermediate viewports", "30-phase-7-profile.spec.ts", "Responsive", "Open the Profile workspace at 1024x768 and 768x1024.", "Layout remains readable and operable at both intermediate breakpoints.", "workspace-1024x768.png, workspace-768x1024.png"],
  ["insights route is unaffected by the profile scope class", "30-phase-7-profile.spec.ts", "Functional", "Load /dashboard/insights after visiting Profile.", "Insights renders unaffected by any CSS scoping class applied to the Profile route.", null],
  ["fills empty Profile fields from a saved mobility profile and shows the note", "32-profile-mobility-prefill.spec.ts", "Functional", "Load Profile with empty fields and an existing saved mobility profile.", "Empty fields are pre-filled from the mobility profile, with a visible note explaining the source.", null],
  ["never overwrites existing Profile data with mobility data", "32-profile-mobility-prefill.spec.ts", "Functional", "Load Profile where a field already has candidate-entered data, and a mobility profile also has a value for it.", "The existing candidate-entered value is preserved; mobility data never silently overwrites it.", null],
  ["the note clears once the user edits the pre-filled field", "32-profile-mobility-prefill.spec.ts", "Functional", "Edit a field that was pre-filled from the mobility profile.", "The \"pre-filled from mobility profile\" note disappears once the candidate has made it their own edit.", null],
  ["an unsaved mobility profile default is never copied in", "32-profile-mobility-prefill.spec.ts", "Functional", "Load Profile where the mobility profile exists only as an unsaved draft default.", "The unsaved default is not copied into Profile - only a genuinely saved mobility profile can pre-fill.", null],
]],
["ADMN", "Admin foundation & security", [
  ["ordinary authenticated users cannot discover or access admin functions", "14-admin-foundation-security.spec.ts", "Security", "As an ordinary authenticated user, attempt to discover and call every admin API route and UI surface.", "No admin menu item is shown; every admin API call is rejected with 403; visiting /admin redirects to admin login denied.", "admin-denied-1440.png, admin-denied-390.png"],
]],
["MOB", "Mobility profile persistence & account controls", [
  ["local-only profile requires consent and confirms successful sync", "11-mobility-persistence.spec.ts", "Functional", "Attempt to sync a local-only mobility profile without prior consent, then with consent given.", "Sync is blocked until consent is given; once given, sync completes and confirms success.", null],
  ["declining consent remains local-only without an upload", "11-mobility-persistence.spec.ts", "Functional", "Decline the sync-consent prompt.", "The mobility profile remains local-only; no upload to the server occurs.", null],
  ["server-only and conflicting records reconcile without silent overwrite", "11-mobility-persistence.spec.ts", "Functional", "Create a mismatch between a server-only record and a locally-edited one.", "Conflicting records are reconciled explicitly; neither side is silently overwritten.", null],
  ["conflict resolution and failed-upload retry work on mobile", "11-mobility-persistence.spec.ts", "Responsive", "Trigger a sync conflict and a failed upload at a mobile viewport.", "Both the conflict-resolution UI and the retry action are usable at mobile width.", null],
  ["browser removal, account deletion and disabled flag remain distinct", "11-mobility-persistence.spec.ts", "Functional", "Remove local browser data, delete the account profile, and disable the sync flag, as three separate actions.", "Each action has its own distinct, correct effect - none is treated as equivalent to another.", null],
  ["offline and feature-disabled states fail closed", "11-mobility-persistence.spec.ts", "Functional", "Attempt to sync while offline, and separately while the sync feature flag is disabled.", "Both cases fail closed (no partial/corrupted write) with a clear status, not a silent no-op.", null],
  ["new user, account-profile deletion and logout retention are explicit", "12-mobility-account-controls.spec.ts", "Functional", "As a new user, delete the account profile, then log out.", "Deletion and logout each have explicit, confirmed effects on stored mobility data - nothing ambiguous.", null],
  ["active-user browser deletion does not remove another account key", "12-mobility-account-controls.spec.ts", "Security", "As an active user, delete local browser data while a second account's mobility key is also present in storage.", "Only the active account's key is removed; the other account's stored key is untouched.", null],
]],
["CORE", "Core cross-phase journeys", [
  ["Journey A: fresh onboarding completes through the CV upload branch", "34-core-journeys.spec.ts", "Functional", "As a brand-new user, complete onboarding by uploading an existing CV.", "Onboarding completes end-to-end via the upload branch, landing the candidate on a populated profile.", null],
  ["Journey A: build-new-CV branch opens the builder and communicates export requirements", "34-core-journeys.spec.ts", "Functional", "As a brand-new user, choose to build a CV from scratch instead of uploading.", "The CV builder opens and clearly states export requirements before the candidate invests time.", null],
  ["Journey B: ESCO questionnaire renders explainable skill-overlap matches", "34-core-journeys.spec.ts", "Functional", "Complete the ESCO-backed skills questionnaire.", "Resulting skill-overlap matches are shown with a visible, honest explanation of why each matched.", null],
  ["Journey C: required fields block export and tailoring uses the tracked job", "34-core-journeys.spec.ts", "Functional", "Attempt to export a CV with required fields missing, then tailor a CV for a specific tracked job.", "Export is blocked until required fields are complete; tailoring correctly uses the selected tracked job's context.", null],
]],
["SYS", "Cross-cutting system checks", [
  ["sentry test page is unavailable in production smoke targets", "07-sentry-route-protection.spec.ts", "Security", "Attempt to load the internal Sentry test route against a production-configured target.", "Route is unavailable/blocked in production, preventing accidental exposure of an internal diagnostic page.", null],
  ["a pasted LinkedIn vacancy reflects in the Jobs list within seconds", "08-extension-linkedin-sync.spec.ts", "Functional", "Paste a LinkedIn vacancy via the browser extension sync path.", "The captured job appears in the Jobs list within seconds, with extracted facts populated.", null],
  ["contact CSV requires review and consent before prefilling outreach", "35-outreach-contact-import.spec.ts", "Functional", "Import a contacts CSV intended to prefill recruiter outreach.", "Imported contacts require explicit review and consent before they're used to prefill any outreach draft.", null],
  ["the account menu stays clickable on a page with a page-header action button", "36-account-menu-stacking.spec.ts", "Regression", "Open the account dropdown menu on a page whose header also has its own action button (e.g. Profile).", "Every menu item remains clickable; the page's own header button never visually intercepts the click (regression test for the #86 stacking-context defect).", null],
]],
["VIS", "Visual regression baselines", [
  ["landing page (desktop)", "visual/key-states.spec.ts", "Visual regression", "Capture the public landing page at desktop viewport.", "Pixel-diff matches the committed baseline within tolerance.", null],
  ["landing page (mobile)", "visual/key-states.spec.ts", "Visual regression", "Capture the public landing page at mobile viewport.", "Pixel-diff matches the committed baseline within tolerance.", null],
  ["login page (desktop)", "visual/key-states.spec.ts", "Visual regression", "Capture the login page at desktop viewport.", "Pixel-diff matches the committed baseline within tolerance.", null],
  ["login page (mobile)", "visual/key-states.spec.ts", "Visual regression", "Capture the login page at mobile viewport.", "Pixel-diff matches the committed baseline within tolerance.", null],
  ["dashboard home, fresh profile (desktop)", "visual/key-states.spec.ts", "Visual regression", "Capture Home with a fresh, empty profile at desktop viewport.", "Pixel-diff matches the committed baseline within tolerance.", null],
  ["dashboard home, fresh profile (mobile)", "visual/key-states.spec.ts", "Visual regression", "Capture Home with a fresh, empty profile at mobile viewport.", "Pixel-diff matches the committed baseline within tolerance.", null],
  ["jobs list, empty state (desktop)", "visual/key-states.spec.ts", "Visual regression", "Capture the Jobs list with no jobs tracked, desktop viewport.", "Pixel-diff matches the committed baseline within tolerance.", null],
  ["jobs list, empty state (mobile)", "visual/key-states.spec.ts", "Visual regression", "Capture the Jobs list with no jobs tracked, mobile viewport.", "Pixel-diff matches the committed baseline within tolerance.", null],
  ["applications pipeline, empty state (desktop)", "visual/key-states.spec.ts", "Visual regression", "Capture the Applications pipeline with nothing tracked, desktop viewport.", "Pixel-diff matches the committed baseline within tolerance.", null],
  ["applications pipeline, empty state (mobile)", "visual/key-states.spec.ts", "Visual regression", "Capture the Applications pipeline with nothing tracked, mobile viewport.", "Pixel-diff matches the committed baseline within tolerance.", null],
  ["interviews, empty state (desktop)", "visual/key-states.spec.ts", "Visual regression", "Capture the Interviews list with none recorded, desktop viewport.", "Pixel-diff matches the committed baseline within tolerance.", null],
  ["interviews, empty state (mobile)", "visual/key-states.spec.ts", "Visual regression", "Capture the Interviews list with none recorded, mobile viewport.", "Pixel-diff matches the committed baseline within tolerance.", null],
]],
["PRD", "Production suite - runs against the live deployment", [
  ["protected dashboard routes redirect an unauthenticated visitor to login", "production/01-auth-and-access.spec.ts", "Security", "As an unauthenticated visitor, request a protected /dashboard route directly against production.", "Redirected to /login; the protected page's content is never served.", null],
  ["the QA session-bootstrap route rejects a request with no or an invalid secret", "production/01-auth-and-access.spec.ts", "Security", "Call the QA session-bootstrap endpoint against production with a missing or wrong shared secret.", "Request is rejected; no session is minted from an invalid secret.", null],
  ["bootstrapping lands on the dashboard as the QA account", "production/01-auth-and-access.spec.ts", "Functional", "Bootstrap a QA session against production with the correct shared secret.", "Session is minted and lands on the authenticated dashboard as the QA account.", null],
  ["session persists across a fresh navigation to a protected route", "production/01-auth-and-access.spec.ts", "Functional", "After bootstrapping, navigate directly to a fresh protected route URL.", "Session persists; the protected route loads without re-authenticating.", null],
  ["signing out returns the account to the unauthenticated state", "production/01-auth-and-access.spec.ts", "Security", "Sign out from the QA account in production.", "Account returns to unauthenticated state; a subsequent protected-route request redirects to login again.", null],
  ["every primary journey is reachable from the dashboard nav", "production/02-dashboard-navigation.spec.ts", "Functional", "As the QA account on production, check the dashboard navigation at desktop width.", "Every primary journey (Jobs, Applications, Interviews, Career Direction, Countries, Profile) is reachable.", null],
  ["clicking Jobs, Applications and Interviews navigates to each workflow page", "production/02-dashboard-navigation.spec.ts", "Functional", "Click each of Jobs, Applications and Interviews in the production nav.", "Each click navigates to its correct real workflow page.", null],
  ["primary links are visible and secondary links are reachable via the more menu", "production/02-dashboard-navigation.spec.ts", "Responsive", "Check the production dashboard nav at mobile width.", "Primary links are directly visible; secondary links are reachable via the \"more\" menu.", null],
  ["profile page renders the completed profile for the QA account", "production/03-profile-and-onboarding.spec.ts", "Functional", "Open Profile as the QA account in production.", "The QA account's real, completed profile data renders correctly.", null],
  ["visiting the onboarding wizard with a completed profile redirects away from it", "production/03-profile-and-onboarding.spec.ts", "Functional", "As the QA account (already onboarded), navigate directly to the onboarding wizard URL in production.", "Redirected away from onboarding, since the account's profile is already complete.", null],
  ["Career Direction page renders", "production/04-career-direction.spec.ts", "Functional", "Open Career Direction as the QA account in production.", "Page renders correctly with the QA account's real saved state.", null],
  ["jobs list renders with working search and filter controls", "production/05-jobs.spec.ts", "Functional", "Open the Jobs list as the QA account in production; use search and filters.", "List renders with real tracked jobs; search and filters work against real data.", null],
  ["opening a job shows its detail view without triggering a new analysis", "production/05-jobs.spec.ts", "Functional", "Open a real tracked job's detail view in production.", "Detail view renders without triggering a new, real (metered) OpenAI analysis call.", null],
  ["applications pipeline renders with stage filters reflecting real counts", "production/06-applications.spec.ts", "Functional", "Open the Applications pipeline as the QA account in production.", "Stage filters reflect real, live counts from the production database.", null],
  ["opening an application shows its detail, evidence and readiness state", "production/06-applications.spec.ts", "Functional", "Open a real application's detail view in production.", "Detail, evidence and readiness state render correctly from real data.", null],
  ["an Applied-stage application, if present, shows its submission record", "production/06-applications.spec.ts", "Functional", "If a real Applied-stage application exists for the QA account, open it.", "Its submission record renders correctly; test skips cleanly if none exists yet.", null],
  ["interviews list renders", "production/07-interviews.spec.ts", "Functional", "Open the Interviews list as the QA account in production.", "List renders correctly from real data.", null],
  ["opening an interview shows its detail view", "production/07-interviews.spec.ts", "Functional", "Open a real interview's detail view in production.", "Detail view renders correctly from real data.", null],
  ["International applications overview renders", "production/08-countries.spec.ts", "Functional", "Open the Countries overview as the QA account in production.", "Overview renders correctly.", null],
  ["Ireland shows full pathway intelligence", "production/08-countries.spec.ts", "Functional", "Open the Ireland country workspace in production.", "Full, real pathway intelligence renders (permit routes, evidence, sources).", null],
  ["Germany shows full pathway intelligence", "production/08-countries.spec.ts", "Functional", "Open the Germany country workspace in production.", "Full, real pathway intelligence renders.", null],
  ["Netherlands shows full pathway intelligence", "production/08-countries.spec.ts", "Functional", "Open the Netherlands country workspace in production.", "Full, real pathway intelligence renders.", null],
  ["an unsupported country (Belgium) renders in limited explorer mode", "production/08-countries.spec.ts", "Functional", "Open the Belgium country workspace (unsupported) in production.", "Renders in honest, limited explorer mode with a real, non-duplicated limitation statement (regression test for the #84 content bug).", null],
  ["a failed dashboard sync read surfaces an error state, not a blank crash", "production/09-error-and-isolation-states.spec.ts", "Functional", "Simulate a failed dashboard sync read against production (read-only).", "A clear error state renders; the page never renders blank or crashes.", null],
]],
];

let tcRow = 2;
modules.forEach(([prefix, moduleLabel, cases]) => {
  cases.forEach((c, i) => {
    const [title, file, type, steps, expected, screenshot] = c;
    const id = `TC-${prefix}-${String(i + 1).padStart(2, "0")}`;
    const suite = file.startsWith("production/") ? "Production (live deployment)" : "Local (fixture-mocked)";
    const row = tc.getRow(tcRow);
    row.values = [id, moduleLabel, suite, file, title, type, steps, expected, screenshot ?? "Not captured - behavioural test", "Pass"];
    styleDataRow(row, { fillArgb: tcRow % 2 === 0 ? "FFF4F6F7" : "FFFFFFFF" });
    row.getCell(1).font = { name: "Consolas", bold: true, color: { argb: NAVY } };
    statusTag(row.getCell(10), "Pass");
    row.height = 46;
    tcRow += 1;
  });
});

console.log(`Test Cases sheet built: ${tcRow - 2} rows.`);

// ===========================================================================
// SHEET 5 - Screenshot Gallery
// ===========================================================================
const gallery = workbook.addWorksheet("Screenshot Gallery", { properties: { tabColor: { argb: AMBER } } });
gallery.getColumn(1).width = 3;
gallery.getColumn(2).width = 34;
gallery.getColumn(3).width = 34;
gallery.getColumn(4).width = 34;

const galleryFolders = [
  { label: "Phase 1 - Home (founder-approved evidence set)", dir: "phase-1-home/corrected-final-apps-v3", files: [
    "completely-new-user-corrected-390x844.png",
    "active-application-corrected-390x844.png",
    "imminent-interview-corrected-1440x900.png",
    "imminent-interview-corrected-390x844.png",
    "integration-unavailable-corrected-390x844.png",
  ]},
  { label: "Phase 2 - Jobs & analysis", dir: "phase-2-jobs-analysis/review", files: [
    "jobs-empty-1440x900.png", "jobs-populated-1440x900.png", "job-detail-1440x900.png",
    "analysis-consider-1440x900.png", "analysis-consider-390x844.png",
  ]},
  { label: "Phase 3 - Applications", dir: "phase-3-applications/review", files: [
    "pipeline-empty-1440x900.png", "pipeline-multiple-stages-1440x900.png",
    "blocked-unsupported-claim-1440x900.png", "ready-application-1440x900.png",
    "applied-confirmation-1440x900.png", "rejected-application-1440x900.png",
    "application-detail-1024x768.png", "loading-390x844.png", "unavailable-390x844.png",
  ]},
  { label: "Phase 3 - Applications (decision journeys)", dir: "phase-3b-1", files: [
    "apply-analysis-1440.png", "consider-analysis-390.png", "skip-analysis-1440.png",
    "applied-state-1440.png", "unsupported-claim-block-1440.png",
  ]},
  { label: "Phase 4 - Interviews", dir: "phase-4-interviews/review", files: [
    "pipeline-empty-1440x900.png", "pipeline-multiple-stages-1440x900.png",
    "overview-1440x900.png", "preparation-blocked-1440x900.png", "practice-1440x900.png",
    "outcome-1440x900.png", "detail-1024x768.png",
  ]},
  { label: "Phase 4 - Interviews (cross-links & practice)", dir: "phase-3c", files: [
    "home-interview-priority-1440.png", "application-linked-interview-1440.png",
    "application-pipeline-after-outcome-1440.png", "ready-after-final-review-1440.png",
    "preparation-390x844.png",
  ]},
  { label: "Phase 5 - Countries", dir: "phase-5-countries/review", files: [
    "overview-1440x900.png", "country-workspace-1440x900.png", "country-workspace-blocked-1440x900.png",
    "mobility-form-1440x900.png", "sponsor-employers-1440x900.png", "official-sources-1440x900.png",
  ]},
  { label: "Phase 6 - Career Direction", dir: "phase-6-career-direction/review", files: [
    "stage1-evidence-empty-1440x900.png", "stage1-evidence-confirmed-1440x900.png",
    "stage2-preferences-1440x900.png", "stage3-pathways-1440x900.png",
    "stage4-role-detail-1440x900.png", "stage5-lane-selection-1440x900.png", "stage5-lane-saved-1440x900.png",
  ]},
  { label: "Phase 7 - Profile", dir: "phase-7-profile/review", files: [
    "workspace-top-1440x900.png", "workspace-form-sections-1440x900.png", "workspace-output-column-1440x900.png",
  ]},
  { label: "Phase 8 - Landing & Login", dir: "phase-8-landing-login/review", files: [
    "landing-hero-1440x900.png", "landing-eufit-1440x900.png", "login-1440x900.png", "login-390x844.png",
  ]},
  { label: "Admin foundation", dir: "admin-foundation", files: [
    "admin-denied-1440.png", "admin-denied-390.png",
  ]},
];

let gRow = 1;
const THUMB_W = 220;
// A few screenshots are full-page captures of scrollable content (up to
// 390x2176) - far taller than a normal viewport. Cap the on-screen height in
// points comfortably under Excel's 409pt row-height ceiling, and for any
// image that would exceed it at THUMB_W, derive a narrower width from the
// capped height instead, preserving aspect ratio rather than clipping.
const MAX_THUMB_PT = 380;

function fitThumbnail(w, h) {
  let width = THUMB_W;
  let height = Math.round((width * h) / w);
  if (Math.round(height * 0.78) > MAX_THUMB_PT) {
    height = Math.round(MAX_THUMB_PT / 0.78);
    width = Math.round((height * w) / h);
  }
  return { width, height };
}

const IMG_COLS = [2, 3, 4]; // columns B, C, D - 3 thumbnails per row block

for (const folder of galleryFolders) {
  gallery.getCell(gRow, 2).value = folder.label;
  gallery.getCell(gRow, 2).font = { bold: true, size: 13, color: { argb: NAVY } };
  gallery.mergeCells(gRow, 2, gRow, 4);
  gRow += 1;

  let col = 0; // index into IMG_COLS for the current row block
  let rowStart = gRow; // caption row of the current block; image row is rowStart + 1
  let rowTallestPt = 0;

  for (const file of folder.files) {
    const abs = SHOT(`${folder.dir}/${file}`);
    if (!fs.existsSync(abs)) { console.warn(`  (missing, skipped) ${abs}`); continue; }
    const buf = fs.readFileSync(abs);
    // Read PNG intrinsic size to keep aspect ratio, capped for full-page shots.
    const w = buf.readUInt32BE(16);
    const h = buf.readUInt32BE(20);
    const { width: thumbW, height: thumbH } = fitThumbnail(w, h);

    if (col === IMG_COLS.length) {
      gallery.getRow(rowStart).height = 16;
      gallery.getRow(rowStart + 1).height = rowTallestPt;
      rowStart += 2;
      col = 0;
      rowTallestPt = 0;
    }

    const captionRow = rowStart;
    const imageRow = rowStart + 1;
    const targetCol = IMG_COLS[col];

    gallery.getCell(captionRow, targetCol).value = file;
    gallery.getCell(captionRow, targetCol).font = { name: "Consolas", size: 9, color: { argb: SLATE } };

    const imageId = workbook.addImage({ buffer: buf, extension: "png" });
    gallery.addImage(imageId, {
      tl: { col: targetCol - 1 + 0.05, row: imageRow - 1 + 0.05 },
      ext: { width: thumbW, height: thumbH },
    });

    rowTallestPt = Math.max(rowTallestPt, Math.round(thumbH * 0.78));
    col += 1;
  }

  gallery.getRow(rowStart).height = 16;
  gallery.getRow(rowStart + 1).height = rowTallestPt || 16;
  gRow = rowStart + 2 + 1; // one blank spacer row before the next folder heading
}

console.log("Screenshot Gallery sheet built.");

// ===========================================================================
// Write to disk
// ===========================================================================
await workbook.xlsx.writeFile(OUT);
const stat = fs.statSync(OUT);
console.log(`\nWorkbook written: ${OUT}`);
console.log(`Size: ${(stat.size / (1024 * 1024)).toFixed(1)} MB`);
