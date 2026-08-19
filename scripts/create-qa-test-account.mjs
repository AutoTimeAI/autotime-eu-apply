// One-off, idempotent script to create/refresh the AutoTime QA test account.
//
// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/create-qa-test-account.mjs --yes
//
// - Creates (or reuses) an auth.users row for qa-test@autotimeai.com, no password set.
// - Marks it via app_metadata.is_test_account = true (service-role only, not client-writable).
// - Seeds realistic dashboard/profile/pipeline/career-direction/international data for that
//   account only. Re-running resets this account's seeded rows to a known state; it never
//   touches any other user's data.
// - Without --yes, only prints what it would do (no writes).
import { createClient } from "@supabase/supabase-js";

const QA_EMAIL = "qa-test@autotimeai.com";
const AI_MODEL = "gpt-4.1-mini";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  throw new Error(
    "SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY are required.",
  );
}

const apply = process.argv.includes("--yes");

console.log(`Target Supabase project: ${url}`);
console.log(apply ? "Mode: APPLY (writes enabled)" : "Mode: DRY RUN (pass --yes to apply)");

if (!apply) {
  console.log(`Would create/refresh QA test account: ${QA_EMAIL}`);
  process.exit(0);
}

const admin = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function daysAgo(n) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString();
}

// Mirrors normalizeApplicationUrlKey() in apps/web/app/api/sync/dashboard/route.ts
// so seeded rows satisfy applications' unique(user_id, url_key) constraint the
// same way the app itself would compute it.
function normalizeApplicationUrlKey(applicationUrl) {
  try {
    const parsed = new URL(applicationUrl);
    parsed.hash = "";
    parsed.hostname = parsed.hostname.toLowerCase();
    parsed.pathname = parsed.pathname.replace(/\/+$/, "");
    return parsed.toString().replace(/\/$/, "").toLowerCase();
  } catch {
    return applicationUrl.trim().toLowerCase().replace(/\/$/, "");
  }
}

function must(result, label) {
  if (result.error) {
    throw new Error(`${label} failed: ${result.error.message}`);
  }
  return result.data;
}

async function findExistingUser() {
  let page = 1;
  const perPage = 200;

  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`listUsers failed: ${error.message}`);

    const match = data.users.find(
      (candidate) => candidate.email?.toLowerCase() === QA_EMAIL,
    );
    if (match) return match;

    if (data.users.length < perPage) return null;
    page += 1;
  }
}

async function findOrCreateQaUser() {
  const existing = await findExistingUser();

  if (existing) {
    if (existing.app_metadata?.is_test_account !== true) {
      const updated = must(
        await admin.auth.admin.updateUserById(existing.id, {
          app_metadata: { ...existing.app_metadata, is_test_account: true },
        }),
        "updateUserById (backfill is_test_account)",
      );
      return updated.user;
    }
    return existing;
  }

  const created = must(
    await admin.auth.admin.createUser({
      email: QA_EMAIL,
      email_confirm: true,
      app_metadata: { is_test_account: true },
      user_metadata: { full_name: "AutoTime QA Test Account" },
    }),
    "createUser",
  );
  return created.user;
}

async function seedOnePerUserRows(userId) {
  must(
    await admin.from("profiles").upsert(
      {
        user_id: userId,
        full_name: "Jordan QA Test",
        email: QA_EMAIL,
        current_country: "United Kingdom",
        current_city: "London",
        country_current: "United Kingdom",
        target_countries: "Germany, Netherlands, Ireland",
        countries_target: ["Germany", "Netherlands", "Ireland"],
        target_roles: "Senior Backend Engineer, Platform Engineer",
        work_right_details:
          "UK and Irish dual citizen; full right to work across the UK and EU/EEA without sponsorship.",
        work_authorisation_category: "eu_eea_swiss_citizen",
        sponsorship_needed: false,
        relocation_willingness: "yes",
        salary_expectation: "EUR 65,000 - EUR 80,000",
        notice_period: "1 month",
        base_cv_text:
          "Senior backend engineer with 8 years building distributed systems in Go and TypeScript. Led migration of a monolith to event-driven microservices; built a real-time fraud-detection pipeline processing 2M events/day.",
        project_summaries:
          "Event-driven order platform migration (Go, Kafka). Real-time fraud detection pipeline (2M events/day). Internal developer platform adopted by 40+ engineers.",
        experience_highlights:
          "8 years backend engineering, 3 years technical leadership, distributed systems, cloud infrastructure.",
        linkedin_url: "https://www.linkedin.com/in/autotime-qa-test",
        github_url: "https://github.com/autotime-qa-test",
        photo_url: null,
        onboarding_step: 6,
        onboarding_completed_at: daysAgo(20),
        schema_version: 1,
        source_surface: "web",
      },
      { onConflict: "user_id" },
    ),
    "profiles upsert",
  );

  must(
    await admin.from("subscriptions").upsert(
      {
        user_id: userId,
        plan: "pro",
        status: "active",
        current_period_end: null,
      },
      { onConflict: "user_id" },
    ),
    "subscriptions upsert",
  );

  must(
    await admin.from("account_settings").upsert(
      {
        user_id: userId,
        default_region: "Germany",
        ai_tone: "coaching",
        notifications_enabled: false,
      },
      { onConflict: "user_id" },
    ),
    "account_settings upsert",
  );

  must(
    await admin.from("reusable_answers").upsert(
      {
        user_id: userId,
        sponsorship_answer:
          "I do not require visa sponsorship in the UK and hold an Irish/EU passport, so I am eligible to work across the EU/EEA without sponsorship.",
        relocation_answer:
          "Yes, I am open to relocating to Germany, the Netherlands, or Ireland within 8-10 weeks of an offer.",
        work_authorisation_answer:
          "UK and Irish dual citizen; full right to work across the UK and EU/EEA.",
        notice_period_answer: "One month notice period with my current employer.",
        salary_expectation_answer:
          "EUR 65,000-80,000 base, open to discussion based on total package.",
        motivation_answer:
          "Looking for a senior backend role with more ownership over distributed-systems architecture.",
        strengths_answer:
          "Distributed systems design, incident response leadership, mentoring engineers.",
        availability_answer:
          "Available for interviews on weekday evenings (CET) and weekends.",
      },
      { onConflict: "user_id" },
    ),
    "reusable_answers upsert",
  );

  must(
    await admin.from("mobility_profiles").upsert(
      {
        user_id: userId,
        profile: {
          schemaVersion: 1,
          currentCountry: "United Kingdom",
          targetCountries: ["Germany", "Netherlands", "Ireland"],
          applicantPosition: "eu-eea-swiss-citizen",
          sponsorshipRequired: "no",
          relocationPreference: "yes",
          earliestStartDate: "2026-10-01",
          minimumSalary: { amount: 65000, currency: "EUR", period: "year" },
          preferredSalary: { amount: 80000, currency: "EUR", period: "year" },
          notes: "QA seed data - not a real applicant.",
          lastVerifiedAt: new Date().toISOString(),
        },
        schema_version: 1,
        consent_version: 1,
        consent_granted_at: daysAgo(20),
        sync_enabled: true,
      },
      { onConflict: "user_id" },
    ),
    "mobility_profiles upsert",
  );
}

async function resetManyPerUserRows(userId) {
  // applications cascades to evidence_records, outcome_records,
  // interview_prep_packs, outreach_messages and cover_letters.
  await admin.from("applications").delete().eq("user_id", userId);
  await admin.from("ai_usage").delete().eq("user_id", userId);
  await admin.from("ai_credit_ledger").delete().eq("user_id", userId);
  await admin.from("user_skill_profile").delete().eq("user_id", userId);
  await admin.from("esco_questionnaire_answers").delete().eq("user_id", userId);
  await admin.from("outreach_contacts").delete().eq("user_id", userId);
}

async function seedApplications(userId) {
  const rows = [
    {
      title: "Senior Backend Engineer",
      company: "Northwind Systems",
      role_title: "Senior Backend Engineer",
      url: "https://example.com/careers/northwind/senior-backend-engineer",
      source: "company_site",
      ats_platform: "greenhouse",
      status: "Applied",
      outcome_reason: "Unknown",
      fit_score: 82,
      fit_decision: "Apply now",
      content_gate: "ready",
      next_action: "Follow up with the hiring manager",
      next_action_date: daysAgo(-5),
      notes: "QA seed data - applied via referral.",
      job_snapshot: {
        title: "Senior Backend Engineer",
        company: "Northwind Systems",
        location: "Berlin, Germany",
        country: "Germany",
      },
      content_snapshot: { cover_letter_ready: true, cv_tailored: true },
      _key: "A",
    },
    {
      title: "Platform Engineer",
      company: "Delta Cloud",
      role_title: "Platform Engineer",
      url: "https://example.com/careers/delta-cloud/platform-engineer",
      source: "job_board",
      ats_platform: "lever",
      status: "Interview",
      outcome_reason: "Interview secured",
      fit_score: 88,
      fit_decision: "Apply now",
      content_gate: "ready",
      next_action: "Prepare for the technical interview",
      next_action_date: daysAgo(-3),
      notes: "QA seed data - onsite technical interview scheduled.",
      job_snapshot: {
        title: "Platform Engineer",
        company: "Delta Cloud",
        location: "Amsterdam, Netherlands",
        country: "Netherlands",
      },
      content_snapshot: { cover_letter_ready: true, cv_tailored: true },
      _key: "B",
    },
    {
      title: "Staff Software Engineer",
      company: "Aurora Labs",
      role_title: "Staff Software Engineer",
      url: "https://example.com/careers/aurora-labs/staff-software-engineer",
      source: "company_site",
      ats_platform: "ashby",
      status: "Rejected",
      outcome_reason: "Skill mismatch",
      fit_score: 55,
      fit_decision: "Stretch application",
      content_gate: "stretch",
      notes: "QA seed data - rejected after screening call.",
      job_snapshot: {
        title: "Staff Software Engineer",
        company: "Aurora Labs",
        location: "Dublin, Ireland",
        country: "Ireland",
      },
      content_snapshot: { cover_letter_ready: true, cv_tailored: false },
      _key: "C",
    },
    {
      title: "Engineering Manager",
      company: "Helix Systems",
      role_title: "Engineering Manager",
      url: "https://example.com/careers/helix-systems/engineering-manager",
      source: "company_site",
      ats_platform: "personio",
      status: "Archived",
      outcome_reason: "Role closed",
      fit_score: 40,
      fit_decision: "Skip for now",
      content_gate: "blocked",
      notes: "QA seed data - role closed before an application was submitted.",
      job_snapshot: {
        title: "Engineering Manager",
        company: "Helix Systems",
        location: "Munich, Germany",
        country: "Germany",
      },
      content_snapshot: { cover_letter_ready: false, cv_tailored: false },
      _key: "D",
    },
    {
      title: "Backend Engineer",
      company: "Kestrel Tech",
      role_title: "Backend Engineer",
      url: "https://example.com/careers/kestrel-tech/backend-engineer",
      source: "job_board",
      ats_platform: "smartrecruiters",
      status: "Ready to apply",
      outcome_reason: "Unknown",
      fit_score: 75,
      fit_decision: "Apply now",
      content_gate: "ready",
      next_action: "Finish tailoring the CV",
      next_action_date: daysAgo(-1),
      notes: "QA seed data - draft in progress.",
      job_snapshot: {
        title: "Backend Engineer",
        company: "Kestrel Tech",
        location: "Remote (EU)",
        country: "EU (remote)",
      },
      content_snapshot: { cover_letter_ready: false, cv_tailored: true },
      _key: "E",
    },
    {
      title: "Software Engineer",
      company: "Fjord Analytics",
      role_title: "Software Engineer",
      url: "https://example.com/careers/fjord-analytics/software-engineer",
      source: "job_board",
      ats_platform: "recruitee",
      status: "Saved",
      outcome_reason: "Unknown",
      notes: "QA seed data - saved, not yet analysed.",
      job_snapshot: {
        title: "Software Engineer",
        company: "Fjord Analytics",
        location: "Copenhagen, Denmark",
        country: "Denmark",
      },
      _key: "F",
    },
  ];

  const inserted = must(
    await admin
      .from("applications")
      .insert(
        rows.map(({ _key, ...row }) => ({
          user_id: userId,
          url_key: normalizeApplicationUrlKey(row.url),
          ...row,
        })),
      )
      .select("id, title"),
    "applications insert",
  );

  const byKey = {};
  rows.forEach((row, index) => {
    byKey[row._key] = inserted[index].id;
  });
  return byKey;
}

async function seedEvidence(userId, appIds) {
  must(
    await admin.from("evidence_records").insert([
      {
        user_id: userId,
        application_id: appIds.A,
        check_key: "right-to-work",
        check_label: "Right to work",
        status: "found",
        evidence_text: "EU/EEA citizenship confirmed in profile.",
        source_type: "profile",
        source_label: "Candidate profile",
        explanation: "Candidate holds EU/EEA citizenship, satisfying the right-to-work requirement.",
        limit_text: "Self-reported; not independently verified.",
      },
      {
        user_id: userId,
        application_id: appIds.A,
        check_key: "portfolio-link",
        check_label: "Portfolio link",
        status: "missing",
        evidence_text: "No public portfolio or GitHub activity summary was found for this role.",
        source_type: "cv",
        source_label: "Base CV",
        missing_input: "Link to a public project or writeup relevant to backend systems.",
        explanation: "Job listing asks for public examples of system design work.",
        limit_text: "Evidence check only inspects linked profile fields.",
      },
      {
        user_id: userId,
        application_id: appIds.D,
        check_key: "sponsorship-availability",
        check_label: "Sponsorship availability",
        status: "risk",
        evidence_text: "Job listing does not mention visa sponsorship for this role.",
        source_type: "job_text",
        source_label: "Job listing",
        risk_flag: "sponsorship_unclear",
        explanation: "No sponsorship statement found; role location requires a work permit for non-EU citizens.",
        limit_text: "Based on job text only; company policy may differ from the listing.",
      },
      {
        user_id: userId,
        application_id: appIds.D,
        check_key: "management-experience",
        check_label: "Management experience",
        status: "limit",
        evidence_text: "Profile shows technical leadership but no formal people-management title.",
        source_type: "profile",
        source_label: "Candidate profile",
        explanation: "Role requires 2+ years as a formal people manager.",
        limit_text: "Evidence check cannot infer unlisted management experience.",
      },
    ]),
    "evidence_records insert",
  );
}

async function seedOutcomes(userId, appIds) {
  must(
    await admin.from("outcome_records").insert([
      {
        user_id: userId,
        application_id: appIds.B,
        role_title: "Platform Engineer",
        company: "Delta Cloud",
        country: "Netherlands",
        source: "job_board",
        status: "Interview",
        outcome_reason: "Interview secured",
        decision_index_at_save: 88,
        decision_label_at_save: "Apply now",
        content_gate_at_save: "ready",
        applied_at: daysAgo(10),
        interview_at: daysAgo(-3),
        notes: "QA seed data - technical interview scheduled.",
      },
      {
        user_id: userId,
        application_id: appIds.C,
        role_title: "Staff Software Engineer",
        company: "Aurora Labs",
        country: "Ireland",
        source: "company_site",
        status: "Rejected",
        outcome_reason: "Skill mismatch",
        decision_index_at_save: 55,
        decision_label_at_save: "Stretch application",
        content_gate_at_save: "stretch",
        applied_at: daysAgo(18),
        closed_at: daysAgo(4),
        notes: "QA seed data - rejected after screening call.",
      },
      {
        user_id: userId,
        application_id: appIds.D,
        role_title: "Engineering Manager",
        company: "Helix Systems",
        country: "Germany",
        source: "company_site",
        status: "Archived",
        outcome_reason: "Role closed",
        decision_index_at_save: 40,
        decision_label_at_save: "Skip for now",
        content_gate_at_save: "blocked",
        closed_at: daysAgo(6),
        notes: "QA seed data - role closed before an application was submitted.",
      },
    ]),
    "outcome_records insert",
  );
}

async function seedInterviewPrep(userId, appIds) {
  must(
    await admin.from("interview_prep_packs").insert([
      {
        user_id: userId,
        application_id: appIds.B,
        role_summary:
          "Platform Engineer building internal developer tooling and cloud infrastructure for a 200-person SaaS company.",
        positioning_statement:
          "Frame yourself as a hands-on platform engineer who reduces friction for product teams and has run production infrastructure at scale.",
        fit_and_gap_recap:
          "Strong match on distributed systems and infrastructure; light on Kubernetes-specific tooling mentioned in the listing.",
        likely_questions: [
          "Walk me through a production incident you led the response for.",
          "How would you design a multi-region deployment pipeline?",
          "How do you decide what to build in-house versus buy?",
        ],
        star_answer_prompts: [
          "Situation: on-call incident affecting checkout. Task: restore service and prevent recurrence.",
          "Situation: legacy CI pipeline was blocking releases. Task: redesign for speed and reliability.",
        ],
        project_talking_points: [
          "Event-driven order platform migration (Go, Kafka)",
          "Internal developer platform adopted by 40+ engineers",
        ],
        skills_to_revise: ["Kubernetes networking", "Terraform module design"],
        questions_to_ask_employer: [
          "What does the on-call rotation look like for this team?",
          "How is platform work prioritised against product roadmap requests?",
        ],
        final_prep_checklist: [
          "Review Delta Cloud's engineering blog",
          "Prepare two incident-response stories",
          "Confirm interview logistics and timezone",
        ],
      },
    ]),
    "interview_prep_packs insert",
  );
}

async function seedCoverLetters(userId, appIds) {
  must(
    await admin.from("cover_letters").insert([
      {
        user_id: userId,
        job_id: appIds.A,
        company_name: "Northwind Systems",
        job_title: "Senior Backend Engineer",
        version: 1,
        content: "QA seed data - draft 1 of a tailored cover letter for Northwind Systems.",
      },
      {
        user_id: userId,
        job_id: appIds.A,
        company_name: "Northwind Systems",
        job_title: "Senior Backend Engineer",
        version: 2,
        content: "QA seed data - draft 2 with tightened opening paragraph and quantified impact.",
      },
      {
        user_id: userId,
        job_id: appIds.B,
        company_name: "Delta Cloud",
        job_title: "Platform Engineer",
        version: 1,
        content: "QA seed data - tailored cover letter for Delta Cloud, emphasising platform reliability work.",
      },
    ]),
    "cover_letters insert",
  );
}

async function seedOutreach(userId, appIds) {
  must(
    await admin.from("outreach_messages").insert([
      {
        user_id: userId,
        job_id: appIds.A,
        recruiter_name: "Alex Recruiter",
        recruiter_role: "Talent Partner",
        recruiter_email: "alex.recruiter@example.com",
        channel: "linkedin_note",
        draft_body: "QA seed data - short LinkedIn note referencing the Senior Backend Engineer role.",
        status: "drafted",
        contact_type: "recruiter",
      },
      {
        user_id: userId,
        job_id: appIds.B,
        recruiter_name: "Sam Hiring Manager",
        recruiter_role: "Engineering Manager",
        recruiter_email: "sam.hiring-manager@example.com",
        channel: "email",
        draft_subject: "Following up on the Platform Engineer interview",
        draft_body: "QA seed data - follow-up email after the technical interview was scheduled.",
        status: "sent",
        sent_at: daysAgo(2),
        follow_up_due: daysAgo(-5),
        contact_type: "hiring_manager",
      },
    ]),
    "outreach_messages insert",
  );

  must(
    await admin.from("outreach_contacts").insert([
      {
        user_id: userId,
        name: "Alex Recruiter",
        role: "Talent Partner",
        company: "Northwind Systems",
        email: "alex.recruiter@example.com",
        contact_type: "recruiter",
        source: "manual",
        dedupe_key: "alex.recruiter@example.com",
        consented_at: daysAgo(20),
      },
      {
        user_id: userId,
        name: "Sam Hiring Manager",
        role: "Engineering Manager",
        company: "Delta Cloud",
        email: "sam.hiring-manager@example.com",
        contact_type: "hiring_manager",
        source: "manual",
        dedupe_key: "sam.hiring-manager@example.com",
        consented_at: daysAgo(15),
      },
    ]),
    "outreach_contacts insert",
  );
}

async function seedAiUsageAndCredits(userId) {
  const usageRows = [
    { feature: "cv-tailoring", days: 14 },
    { feature: "cover-letter", days: 13 },
    { feature: "job-analysis", days: 12 },
    { feature: "job-analysis", days: 9 },
    { feature: "cover-letter", days: 8 },
    { feature: "interview-prep", days: 3 },
    { feature: "interview-answer-coach", days: 2 },
    { feature: "esco-questionnaire", days: 20 },
  ].map(({ feature, days }) => ({
    user_id: userId,
    feature,
    model: AI_MODEL,
    prompt_tokens: 900,
    completion_tokens: 450,
    cost_usd: 0.008,
    created_at: daysAgo(days),
  }));

  must(await admin.from("ai_usage").insert(usageRows), "ai_usage insert");

  must(
    await admin.from("ai_credit_ledger").insert([
      {
        user_id: userId,
        delta: 50,
        reason: "admin",
        feature: "qa-test-account-seed",
      },
    ]),
    "ai_credit_ledger insert",
  );
}

async function seedCareerDirection(userId) {
  const { data: skills } = await admin
    .from("esco_skills")
    .select("id, preferred_label")
    .limit(5);

  if (skills && skills.length > 0) {
    const sources = ["stated", "inferred", "confirmed"];
    must(
      await admin.from("user_skill_profile").insert(
        skills.map((skill, index) => ({
          user_id: userId,
          esco_skill_id: skill.id,
          confidence: 0.6 + (index % 4) * 0.1,
          source: sources[index % sources.length],
        })),
      ),
      "user_skill_profile insert",
    );
  } else {
    console.warn(
      "No esco_skills rows found - skipping user_skill_profile seed (run scripts/import-esco.mjs first if you want this covered).",
    );
  }

  must(
    await admin.from("esco_questionnaire_answers").insert([
      { user_id: userId, sequence: 1, question: "What kind of problems energise you most at work?", answer: "Designing systems that stay reliable under real production load.", next_question: "How do you like to work with other engineers?" },
      { user_id: userId, sequence: 2, question: "How do you like to work with other engineers?", answer: "Pairing on tricky design decisions, mentoring on the side.", next_question: "What size of company do you want next?" },
      { user_id: userId, sequence: 3, question: "What size of company do you want next?", answer: "A 100-500 person scale-up with an established platform team.", next_question: "How important is people-management scope to you?" },
      { user_id: userId, sequence: 4, question: "How important is people-management scope to you?", answer: "Open to it eventually, but want a strong IC track for now.", next_question: "Which countries are you targeting?" },
      { user_id: userId, sequence: 5, question: "Which countries are you targeting?", answer: "Germany, the Netherlands, and Ireland.", next_question: "What would make an offer an easy yes?" },
      { user_id: userId, sequence: 6, question: "What would make an offer an easy yes?", answer: "Ownership of a clear platform domain and a visible path to staff engineer.", next_question: null },
    ]),
    "esco_questionnaire_answers insert",
  );
}

async function main() {
  const user = await findOrCreateQaUser();
  console.log(`QA test account user id: ${user.id}`);
  console.log(`Set this in your production env as: QA_TEST_ACCOUNT_USER_ID=${user.id}`);

  await seedOnePerUserRows(user.id);
  await resetManyPerUserRows(user.id);

  const appIds = await seedApplications(user.id);
  await seedEvidence(user.id, appIds);
  await seedOutcomes(user.id, appIds);
  await seedInterviewPrep(user.id, appIds);
  await seedCoverLetters(user.id, appIds);
  await seedOutreach(user.id, appIds);
  await seedAiUsageAndCredits(user.id);
  await seedCareerDirection(user.id);

  console.log("QA test account seeded successfully.");
}

main().catch((error) => {
  console.error("QA test account seeding failed:", error.message);
  process.exitCode = 1;
});
