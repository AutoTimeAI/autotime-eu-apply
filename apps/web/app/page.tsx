import Link from "next/link"
import { redirect } from "next/navigation"

import { createServerClient } from "../lib/supabase/server"

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
    title: "Work-right intelligence",
    body:
      "Sponsorship risk, relocation fit and country-specific application strategy before you spend effort."
  },
  {
    title: "AI without the setup",
    body:
      "No API keys. No configuration. AI job analysis and content generation works immediately."
  },
  {
    title: "Chrome extension + web dashboard",
    body:
      "Save jobs as you browse. Review, track and prep interviews on any device."
  }
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
      <nav className="product-nav" aria-label="Primary">
        <Link className="dashboard-brand" href="/">
          AutoTime <span>EU Apply</span>
        </Link>
        <div>
          <Link href="/pricing">Pricing</Link>
          <Link href="/privacy">Privacy</Link>
          <Link className="nav-cta" href="/login">
            Sign in
          </Link>
        </div>
      </nav>

      <section className="landing-hero">
        <div className="landing-hero-copy">
          <p className="eyebrow">Built for UK/EU tech candidates</p>
          <h1>Apply smarter to UK and EU tech roles</h1>
          <p>
            AutoTime analyses job fit, checks work-right risk, generates
            tailored application content and tracks every outcome - so you
            spend effort only where it converts.
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
            <span>Work-right risk</span>
            <span>AI application content</span>
            <span>Outcome tracking</span>
          </div>
        </div>
        <div className="landing-signal-panel" aria-label="AutoTime decision preview">
          <header>
            <span>Live decision brief</span>
            <strong>Apply now</strong>
          </header>
          <dl>
            <div>
              <dt>Fit score</dt>
              <dd>84%</dd>
            </div>
            <div>
              <dt>Work-right risk</dt>
              <dd>Low</dd>
            </div>
            <div>
              <dt>Profile gaps</dt>
              <dd>2 gaps</dd>
            </div>
          </dl>
          <ol>
            <li>Tailor cover letter around payments delivery.</li>
            <li>Confirm hybrid London requirement before applying.</li>
            <li>Save next action for follow-up in 5 working days.</li>
          </ol>
        </div>
      </section>

      <section className="landing-section">
        <div className="section-heading">
          <p className="eyebrow">How it works</p>
          <h2>From job page to decision in minutes</h2>
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
          <Link href="/pricing">Pricing</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <a href="https://github.com" rel="noreferrer" target="_blank">
            GitHub
          </a>
        </nav>
        <p>AutoTime EU Apply - built in London</p>
      </footer>
    </main>
  )
}
