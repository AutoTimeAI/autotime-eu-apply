import Link from "next/link"
import { redirect } from "next/navigation"

import { PublicNav } from "../components/PublicNav"
import { createServerClient } from "../lib/supabase/server"

export const dynamic = "force-dynamic"

const workflowSteps = [
  {
    title: "Import the role",
    body: "Paste the job description or bring it in from the extension."
  },
  {
    title: "Decide apply or skip",
    body:
      "See skill match, ATS fit, sponsorship likelihood, right-to-work and relocation risk separately."
  },
  {
    title: "Prepare the next move",
    body:
      "Generate positioning, save the application, prep interviews and learn from outcomes."
  }
]

const featureBlocks = [
  {
    title: "Country fit",
    body: "UK, Ireland, Netherlands, Germany and wider EU market signals."
  },
  {
    title: "Work-right risk",
    body:
      "Sponsorship wording, relocation practicality and right-to-work blockers."
  },
  {
    title: "Positioning angle",
    body: "The strongest story to use if the role is worth applying to."
  }
]

const strategySignals = [
  "Skill match",
  "ATS compatibility",
  "Sponsorship",
  "Right to work",
  "Relocation",
  "Country fit"
]

export default async function LandingPage() {
  const supabase = await createServerClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (user) {
    redirect("/dashboard")
  }

  return (
    <main className="landing-shell">
      <PublicNav />

      <section className="landing-hero">
        <div className="landing-hero-copy">
          <p className="eyebrow">UK/EU job-search OS</p>
          <h1>Decide if a European tech role is worth applying to</h1>
          <p>
            AutoTime checks country fit, work-right risk and sponsorship
            likelihood before it writes anything, so international candidates
            spend effort on realistic roles.
          </p>
          <div className="landing-actions">
            <Link className="primary-link" href="/login">
              Get started free
            </Link>
            <Link className="secondary-link" href="/pricing">
              See pricing
            </Link>
          </div>
        </div>

        <div className="landing-signal-panel" aria-label="AutoTime decision preview">
          <header>
            <span>Decision</span>
            <strong>Apply</strong>
          </header>
          <dl>
            <div>
              <dt>Fit score</dt>
              <dd>84%</dd>
            </div>
            <div>
              <dt>Work right</dt>
              <dd>Clear</dd>
            </div>
            <div>
              <dt>Sponsor signal</dt>
              <dd>Medium</dd>
            </div>
          </dl>
          <ol>
            <li>Lead with payments delivery and regulated product experience.</li>
            <li>Confirm hybrid location before spending time on tailoring.</li>
            <li>Follow up after 5 working days if no response.</li>
          </ol>
        </div>
      </section>

      <section className="landing-section">
        <div className="section-heading">
          <p className="eyebrow">Fit model</p>
          <h2>Each role is judged before content is generated</h2>
        </div>
        <div className="proof-strip landing-proof-grid" aria-label="AutoTime fit model">
          {strategySignals.map((signal) => (
            <span key={signal}>{signal}</span>
          ))}
        </div>
        <div className="feature-band">
          {featureBlocks.map((feature) => (
            <article className="landing-feature" key={feature.title}>
              <h2>{feature.title}</h2>
              <p>{feature.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section">
        <div className="section-heading">
          <p className="eyebrow">Workflow</p>
          <h2>From job import to next best action</h2>
        </div>
        <div className="landing-step-grid">
          {workflowSteps.map((step, index) => (
            <article className="landing-step" key={step.title}>
              <span>{index + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-cta-band">
        <div>
          <p className="eyebrow">Start focused</p>
          <h2>
            Free tracking first. Pro when your search needs unlimited AI and
            cloud sync.
          </h2>
        </div>
        <Link className="primary-link" href="/pricing">
          Compare plans
        </Link>
      </section>

      <footer className="landing-footer">
        <nav aria-label="Footer">
          <Link href="/">Product</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/login">Sign in</Link>
        </nav>
        <p>AutoTime EU Apply - built in London</p>
      </footer>
    </main>
  )
}
