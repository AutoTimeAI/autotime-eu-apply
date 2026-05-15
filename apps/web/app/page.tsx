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
          <p className="eyebrow">Strategic European tech applications</p>
          <h1 id="landing-title">AutoTime AI</h1>
          <p>
            A quality-first workspace for targeting stronger European tech
            roles, checking country-aware fit, proving your experience and
            converting more interviews.
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
            AutoTime keeps the process ordered: decide whether the role is worth
            effort, gather proof, write from that proof, then prepare to
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

      <section className="landing-cta-band" aria-labelledby="landing-cta-title">
        <div>
          <p className="eyebrow">Release path</p>
          <h2 id="landing-cta-title">
            Start with one target country, one role family and real evidence.
          </h2>
          <p>
            The best version of AutoTime is narrow on purpose: fewer roles,
            clearer fit and stronger proof before every application.
          </p>
        </div>
        <Link className="primary-link" href={account ? "/dashboard" : "/login"}>
          {account ? "Continue workflow" : "Build my evidence"}
        </Link>
      </section>
    </main>
  );
}
