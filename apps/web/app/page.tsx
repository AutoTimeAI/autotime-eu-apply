import Link from "next/link"
import { redirect } from "next/navigation"

import { PublicNav } from "../components/PublicNav"
import { createServerClient } from "../lib/supabase/server"

export const dynamic = "force-dynamic"

const workflowSteps = [
  {
    title: "Paste a job description",
    body:
      "AutoTime scores fit, flags work-right risk and recommends apply, skip or improve profile first."
  },
  {
    title: "Generate tailored content",
    body:
      "AI writes a positioned cover letter and application answers using your real experience - nothing invented."
  },
  {
    title: "Track every outcome",
    body:
      "Log applications, next actions and interview signal across every source, platform and country."
  }
]

const featureBlocks = [
  {
    title: "Country-by-country focus",
    body:
      "Compare UK, Ireland, Netherlands, Germany and wider European targets before spending energy on low-fit roles."
  },
  {
    title: "Work-right strategy",
    body:
      "Clarify sponsorship, relocation, notice period and location risk before you write another application."
  },
  {
    title: "European tech workflow",
    body:
      "Save roles from common tech hiring platforms, tailor applications and track follow-up across countries."
  }
]

const strategySignals = [
  "Country fit",
  "Work-right clarity",
  "Role-language match",
  "Follow-up timing"
]

const freeFeatures = [
  "Chrome extension with local storage",
  "5 AI job analyses per month",
  "Unlimited application tracking"
]

const proFeatures = [
  "Unlimited AI analyses",
  "Cloud sync across devices",
  "Application content and interview prep"
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
          <p className="eyebrow">Built for European tech candidates</p>
          <h1>Choose the right European tech roles before you apply</h1>
          <p>
            AutoTime helps you compare country fit, work-right risk, role
            language and application effort, so your UK and EU job search is
            focused instead of scattered.
          </p>
          <div className="landing-actions">
            <Link className="primary-link" href="/login">
              Get started free
            </Link>
            <Link className="secondary-link" href="/pricing">
              See pricing
            </Link>
          </div>
          <div className="proof-strip" aria-label="AutoTime capabilities">
            {strategySignals.map((signal) => (
              <span key={signal}>{signal}</span>
            ))}
          </div>
        </div>
        <div className="landing-signal-panel" aria-label="AutoTime decision preview">
          <header>
            <span>European role brief</span>
            <strong>Worth applying</strong>
          </header>
          <dl>
            <div>
              <dt>Fit score</dt>
              <dd>84%</dd>
            </div>
            <div>
              <dt>Country</dt>
              <dd>London</dd>
            </div>
            <div>
              <dt>Profile gaps</dt>
              <dd>2 gaps</dd>
            </div>
          </dl>
          <ol>
            <li>Confirm hybrid location and sponsorship wording.</li>
            <li>Use payments delivery examples in the application.</li>
            <li>Track follow-up after 5 working days.</li>
          </ol>
        </div>
      </section>

      <section className="landing-section">
        <div className="section-heading">
          <p className="eyebrow">How it works</p>
          <h2>From European job page to clear decision</h2>
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

      <section className="landing-section feature-band">
        {featureBlocks.map((feature) => (
          <article className="landing-feature" key={feature.title}>
            <h2>{feature.title}</h2>
            <p>{feature.body}</p>
          </article>
        ))}
      </section>

      <section className="landing-section">
        <div className="section-heading">
          <p className="eyebrow">Pricing</p>
          <h2>Start local, upgrade when the search gets serious</h2>
        </div>
        <div className="pricing-teaser-grid">
          <article className="pricing-teaser">
            <div>
              <h3>Free</h3>
              <strong>£0/month</strong>
            </div>
            <ul>
              {freeFeatures.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            <Link className="secondary-link" href="/login">
              Get started free
            </Link>
          </article>
          <article className="pricing-teaser pricing-teaser-pro">
            <div>
              <h3>Pro</h3>
              <strong>£9/month</strong>
            </div>
            <ul>
              {proFeatures.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            <Link className="primary-link" href="/pricing">
              Compare plans
            </Link>
          </article>
        </div>
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
