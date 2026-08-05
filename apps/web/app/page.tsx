import Link from "next/link";

import { PublicNav } from "../components/PublicNav";
import { getUserPlan } from "../lib/feature-gate";
import { createServerClient } from "../lib/supabase/server";
import type { SubscriptionPlan } from "../lib/supabase/types";
import { getTestAuthUser } from "../lib/test-auth";

export const dynamic = "force-dynamic";

type PublicAccount = {
  email: string;
  id: string;
  plan: SubscriptionPlan;
};

async function getPublicAccount(): Promise<PublicAccount | null> {
  try {
    const testUser = getTestAuthUser();

    if (testUser) {
      return {
        email: testUser.email ?? "account",
        id: testUser.id,
        plan: await getUserPlan(testUser.id),
      };
    }

    const supabase = await createServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    return {
      email: user.email ?? "account",
      id: user.id,
      plan: await getUserPlan(user.id),
    };
  } catch {
    return null;
  }
}

const workflowSteps = [
  {
    label: "Target",
    title: "Choose fewer, stronger roles",
    body: "Score market fit, country context, sponsorship signals and timing before spending energy.",
  },
  {
    label: "Verify",
    title: "Check the work-right reality",
    body: "Keep sponsorship, relocation, notice period and location constraints visible before writing.",
  },
  {
    label: "Prove",
    title: "Build from evidence",
    body: "Turn profile facts, CV proof and reusable answers into application-ready proof points.",
  },
  {
    label: "Apply",
    title: "Write with positioning",
    body: "Generate role-specific content only after fit, gaps and supporting evidence are clear.",
  },
  {
    label: "Convert",
    title: "Prepare for the interview",
    body: "Use the same evidence trail for follow-ups, interview prep and outcome learning.",
  },
];

const signalCards = [
  {
    title: "Country-aware fit",
    body: "UK and EU applications are shaped by location, relocation, work-right and sponsorship reality.",
  },
  {
    title: "Evidence discipline",
    body: "The product pushes real proof forward and keeps weak, vague or invented claims out of the workflow.",
  },
  {
    title: "Interview conversion",
    body: "Applications, follow-ups and prep stay connected so every good role improves the next conversation.",
  },
];

const readinessProfile = [
  ["Market intent", "Ireland, Germany, Netherlands, United Kingdom, Remote Europe"],
  ["Candidate positioning", "International tech candidate moving from engineering proof into systems and delivery-facing roles"],
  [
    "Evidence depth",
    "Fintech systems, regulated banking software, technical delivery, data/analytics exposure",
  ],
  [
    "Role alignment",
    "Technical Business Analyst, Application Analyst, Systems Analyst, Implementation Consultant, Data/AI roles",
  ],
  [
    "Work-right sensitivity",
    "Sponsorship or relocation support may be needed depending on country and employer wording",
  ],
  [
    "Language fit",
    "English-first profile; local-language requirements are treated as blocker risk",
  ],
  [
    "Relocation quality gate",
    "Open only when salary, visa route, city practicality and role quality align",
  ],
  ["Timing risk", "Notice period and start-date flexibility must be checked before high-priority action"],
  ["Compensation floor", "Used as practicality pressure, never as a salary guarantee"],
  [
    "Proof gaps",
    "Stakeholder-facing delivery and application support examples need sharper evidence",
  ],
  [
    "External proof",
    "LinkedIn/portfolio presence can strengthen recruiter confidence when aligned with the CV",
  ],
] as const;

const opportunityMetrics = [
  ["EU Fit Score", "82/100"],
  ["Apply Decision", "Improve First"],
  ["Alignment Quality", "Strong, but not automatic"],
  ["Evidence Readiness", "Medium-high"],
  ["Best Market Fit", "Ireland / Germany"],
  ["Application Priority", "High Priority"],
  ["Blocker Severity", "Moderate"],
  ["Right-to-Work Reality", "Unclear - verify first"],
  ["Source Confidence", "Employer wording only"],
  ["Language Barrier", "English-friendly"],
  ["Relocation Practicality", "Possible, source check needed"],
  ["Positioning Readiness", "Reframe before applying"],
] as const;

const positiveSignals = [
  "Fintech and regulated systems evidence maps to the role domain",
  "English-friendly wording lowers immediate language risk",
  "Hybrid flexibility may support relocation practicality",
  "Systems/application support responsibilities fit the target pivot",
];

const riskSignals = [
  "Sponsorship and right-to-work wording is not explicit enough",
  "Salary range is missing, so relocation practicality is not proven",
  "Stakeholder-facing delivery evidence must be made more visible",
  "Official employer or government source has not been checked",
];

const whyRoleFits = [
  "Domain alignment is credible because fintech and regulated systems proof already exists",
  "Role responsibilities map to application support, analysis and technical delivery",
  "The move from software engineering into systems/business-facing work is plausible if reframed with evidence",
];

const positioningPack = [
  [
    "Candidate Positioning Gap",
    "Your fintech software background is strong, but the role expects business-facing delivery. Reframe your experience around requirements, systems support, stakeholder communication and regulated banking environments.",
  ],
  [
    "Best Application Angle",
    "Position yourself as a fintech systems candidate with software engineering experience in regulated banking environments. Emphasise your ability to work across technical teams, analyse requirements and support reliable financial systems.",
  ],
  [
    "Recruiter Summary Angle",
    "Fintech systems candidate with software engineering experience in regulated banking environments, combining technical delivery, application support, data awareness and stakeholder-facing problem solving.",
  ],
  [
    "CV Improvement Suggestion",
    "Add one bullet showing how you worked with business, support or product teams in a regulated environment.",
  ],
  [
    "Interview Readiness Note",
    "Prepare examples around incident handling, stakeholder communication, requirements analysis and supporting reliable financial systems.",
  ],
] as const;

const countryPlaybook = [
  {
    country: "United Kingdom",
    guidance:
      "Use a concise UK-style CV. Highlight impact, delivery, communication and relevant technical/business outcomes. Watch for right-to-work and sponsorship wording. Verify sponsorship details against the employer and official UK government guidance.",
  },
  {
    country: "Germany",
    guidance:
      "Use a structured CV. Highlight technical depth, regulated systems experience, qualifications and relocation readiness. Watch for German language requirements and right-to-work wording. Verify visa and EU Blue Card details through official German or EU sources.",
  },
  {
    country: "Ireland",
    guidance:
      "Use a concise UK/Ireland-style CV. Highlight communication, product/business understanding, tech delivery and fintech/SaaS experience. Competition may be high, so positioning needs to be specific. Verify employment permit and sponsorship details through official Irish sources.",
  },
  {
    country: "Netherlands",
    guidance:
      "Highlight international mindset, English-speaking team experience, SaaS/product exposure and practical problem-solving. Watch for Dutch language requirements and hybrid location restrictions. Verify skilled migrant and employer sponsorship details through official Dutch sources.",
  },
  {
    country: "Poland",
    guidance:
      "Highlight technical delivery, enterprise systems, fintech support and implementation experience. Salary and relocation practicality should be checked carefully. Verify work permit and relocation requirements through official Polish sources.",
  },
  {
    country: "Remote Europe",
    guidance:
      "Check whether remote means truly Europe-wide or only within specific countries. Watch for payroll, tax and work-authorisation restrictions. Verify remote eligibility directly with the employer.",
  },
];

const mottoAlignment = [
  {
    title: "Smarter targeting",
    points: [
      "Better role selection",
      "Country fit",
      "Right-to-work check",
      "Sponsorship risk detection",
      "Language risk detection",
      "Relocation practicality",
      "Official-source verification status",
    ],
  },
  {
    title: "Stronger applications",
    points: [
      "Candidate positioning gap",
      "CV improvement suggestion",
      "Best application angle",
      "Recruiter summary angle",
      "Country-specific application guidance",
    ],
  },
  {
    title: "More interviews",
    points: [
      "Better prioritisation",
      "Fewer wasted applications",
      "Interview readiness preparation",
      "Stronger role-specific positioning",
    ],
  },
];

const euFitSignalRail = [
  ["Quality", "Alignment depth, evidence strength and blocker severity"],
  ["Risk", "Sponsorship, language, relocation and source confidence"],
  ["Decision", "Apply Now / Improve First / Verify First / Skip"],
  ["Action", "Priority, reframe, CV fix and interview proof"],
] as const;

export default async function HomePage() {
  const account = await getPublicAccount();

  return (
    <main className="landing-shell">
      <PublicNav currentPath="/" user={account} />

      <section className="landing-hero" aria-labelledby="landing-title">
        <video
          aria-hidden="true"
          autoPlay
          className="landing-hero-media"
          loop
          muted
          playsInline
          src="/demo/autotime-first-user-demo.mp4"
        />
        <div className="landing-hero-overlay" />
        <div className="landing-hero-content">
          <p className="eyebrow">
            Private Beta v1 - founder-led early access
          </p>
          <h1 id="landing-title">EU Apply</h1>
          <p>
            A quality-first workspace for targeting stronger European tech
            roles, checking country-aware fit, proving your experience and
            improving applications with guided beta feedback.
          </p>
          <div className="landing-actions">
            <Link
              className="primary-link"
              href={account ? "/dashboard" : "/login"}
            >
              {account ? "Open dashboard" : "Start free"}
            </Link>
            <Link className="secondary-link" href="/pricing">
              View plans
            </Link>
          </div>
          <div className="landing-hero-signals" aria-label="Product strengths">
            <span>Strategic targeting</span>
            <span>Country-aware fit</span>
            <span>Work-right clarity</span>
            <span>Evidence-backed positioning</span>
            <span>Interview conversion</span>
          </div>
        </div>
      </section>

      <section className="landing-section" aria-labelledby="workflow-title">
        <div className="section-heading">
          <p className="eyebrow">Workflow system</p>
          <h2 id="workflow-title">
            Follow the application logic top to bottom
          </h2>
          <p>
            EU Apply keeps the process ordered: decide whether the role is
            worth effort, gather proof, write from that proof, then prepare to
            convert.
          </p>
        </div>
        <div className="landing-step-grid">
          {workflowSteps.map((step, index) => (
            <article className="landing-step" key={step.label}>
              <span>{index + 1}</span>
              <strong>{step.label}</strong>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section" aria-labelledby="signals-title">
        <div className="section-heading">
          <p className="eyebrow">Quality over quantity</p>
          <h2 id="signals-title">
            Built around the decisions that actually change interview chances
          </h2>
        </div>
        <div className="feature-band">
          {signalCards.map((card) => (
            <article className="landing-feature" key={card.title}>
              <h3>{card.title}</h3>
              <p>{card.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="eu-fit-engine" aria-labelledby="eu-fit-title">
        <div className="eu-fit-header">
          <div className="section-heading">
            <p className="eyebrow">Core product layer</p>
            <h2 id="eu-fit-title">EU Fit Engine</h2>
            <p>
              Advanced role-quality intelligence for international tech
              candidates deciding where UK/EU applications deserve effort, what
              could block them, and how to position before applying.
            </p>
          </div>
          <div className="eu-fit-scorecard" aria-label="Sample fit result">
            <span>Sample fit result</span>
            <strong>82</strong>
            <p>Improve First</p>
          </div>
        </div>

        <div className="eu-fit-statement">
          <strong>
            Smarter targeting. Stronger applications. More interviews.
          </strong>
          <p>
            EU Fit Engine evaluates alignment quality, evidence depth, blocker
            risk, source confidence and positioning readiness instead of acting
            like a basic job tracker or static country guide.
          </p>
        </div>

        <div className="eu-fit-signal-rail" aria-label="EU Fit Engine workflow">
          {euFitSignalRail.map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>

        <div className="eu-fit-system-grid">
          <article className="eu-fit-card">
            <header className="eu-fit-card-header">
              <span className="eu-fit-step">1</span>
              <div>
                <h3>Candidate Readiness Profile</h3>
                <p>
                  The engine starts from market intent, evidence depth and
                  blocker sensitivity, not a generic profile checklist.
                </p>
              </div>
            </header>
            <dl className="eu-fit-profile-list">
              {readinessProfile.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </article>

          <article className="eu-fit-card eu-fit-analysis-card">
            <header className="eu-fit-card-header">
              <span className="eu-fit-step">2</span>
              <div>
                <h3>Sample EU Fit Engine analysis</h3>
                <p>
                  Demo sample only. Advanced outputs separate fit quality,
                  blocker risk and source confidence before recommending action.
                </p>
              </div>
            </header>
            <dl className="eu-fit-metric-grid">
              {opportunityMetrics.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>

            <div className="eu-fit-signal-columns">
              <section>
                <h4>Positive Signals</h4>
                <ul>
                  {positiveSignals.map((signal) => (
                    <li key={signal}>{signal}</li>
                  ))}
                </ul>
              </section>
              <section>
                <h4>Risk Signals</h4>
                <ul>
                  {riskSignals.map((signal) => (
                    <li key={signal}>{signal}</li>
                  ))}
                </ul>
              </section>
            </div>

            <section className="eu-fit-reasons">
              <h4>Why This Role Fits</h4>
              <ul>
                {whyRoleFits.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </section>
          </article>
        </div>

        <div className="eu-fit-trust-workflow">
          <div>
            <p className="eyebrow">Trusted-source workflow</p>
            <h3>Official Verification Status</h3>
            <p>
              Needs official verification. Right-to-work and sponsorship wording
              should be checked against the employer careers page and relevant
              government immigration guidance before applying.
            </p>
          </div>
          <span>Official-source verification layer planned for MVP evolution</span>
        </div>

        <article className="eu-fit-card">
          <header className="eu-fit-card-header">
            <span className="eu-fit-step">3</span>
            <div>
              <h3>Application Positioning Pack</h3>
              <p>
                The score becomes a practical positioning pack before applying.
              </p>
            </div>
          </header>
          <dl className="eu-fit-positioning-list">
            {positioningPack.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </article>

        <section className="eu-fit-playbook" aria-labelledby="playbook-title">
          <div className="section-heading">
            <p className="eyebrow">Demo country playbook</p>
            <h3 id="playbook-title">EU Country Playbook</h3>
            <p>
              These examples are guidance prompts, not fixed country statistics.
              Visa, salary, sponsorship and labour-market assumptions need
              official-source verification before decisions.
            </p>
          </div>
          <div className="eu-fit-country-grid">
            {countryPlaybook.map((item) => (
              <article key={item.country}>
                <h4>{item.country}</h4>
                <p>{item.guidance}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="eu-fit-motto" aria-label="Motto alignment">
          {mottoAlignment.map((pillar) => (
            <article key={pillar.title}>
              <h3>{pillar.title}</h3>
              <ul>
                {pillar.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </article>
          ))}
        </section>

        <div className="eu-fit-difference">
          <strong>Why this is different</strong>
          <p>
            EU Fit Engine is not a generic job board, tracker, CV tool, cover
            letter generator, or static country statistics page. It is a
            cautious decision-support layer for international tech candidates
            weighing role match, country reality, sponsorship wording, language
            risk, relocation practicality, evidence strength and application
            positioning.
          </p>
        </div>

        <div className="eu-fit-notes">
          <p>
            EU Fit Engine uses job-description signals, candidate profile
            context, and official-source checks where available. Visa,
            sponsorship, salary, and country-specific guidance should always be
            verified against official employer, government, or EU sources before
            making decisions.
          </p>
          <p>
            No job, visa, sponsorship, or interview guarantees. EU Apply helps
            users make better application decisions, strengthen positioning,
            and prepare more effectively.
          </p>
        </div>
      </section>

      <section className="landing-cta-band" aria-labelledby="landing-cta-title">
        <div>
          <p className="eyebrow">Release path</p>
          <h2 id="landing-cta-title">
            Start with one target country, one role family and real evidence.
          </h2>
          <p>
            The best version of EU Apply is narrow on purpose: fewer roles,
            clearer fit and stronger proof before every application.
          </p>
        </div>
        <Link className="primary-link" href={account ? "/dashboard" : "/login"}>
          {account ? "Continue workflow" : "Build my evidence"}
        </Link>
      </section>

      <footer className="landing-footer">
        <p>&copy; {new Date().getFullYear()} AutoTime AI Ltd. EU Apply is a product of AutoTime AI Ltd.</p>
        <nav aria-label="Footer">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </nav>
      </footer>
    </main>
  );
}
