import { PublicNav } from "../../components/PublicNav"

const acceptableUse = [
  "Do not use AutoTime to automate job applications.",
  "Do not use AutoTime for bulk scraping. User-triggered import of visible job details from pages you open is allowed.",
  "Do not upload unlawful, misleading, discriminatory or malicious content.",
  "Do not attempt to bypass plan limits, rate limits, authentication or security controls."
]

export default function TermsPage() {
  return (
    <main className="legal-shell">
      <PublicNav />
      <header className="legal-header">
        <div>
          <p className="eyebrow">Terms of service</p>
          <h1>The rules for using AutoTime</h1>
          <p>Last updated: 6 May 2026</p>
        </div>
      </header>

      <section className="legal-section">
        <h2>Service</h2>
        <p>
          AutoTime AI Ltd (&quot;AutoTime&quot;, &quot;we&quot;, &quot;us&quot;)
          operates EU Apply, which helps candidates organise UK/EU job
          applications, assess job fit, prepare application content and track
          outcomes. It is not a recruiter, immigration adviser, legal adviser
          or guarantee of employment.
        </p>
      </section>

      <section className="legal-section">
        <h2>Acceptable use</h2>
        <ul>
          {acceptableUse.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="legal-section">
        <h2>Subscriptions and billing</h2>
        <p>
          Pro subscriptions are billed through Stripe on the billing interval
          selected at checkout. Prices are shown before payment. You are
          responsible for keeping billing details current.
        </p>
      </section>

      <section className="legal-section">
        <h2>Cancellation and refunds</h2>
        <p>
          You can cancel any time from the billing portal. Consumers may request
          cancellation during the 14-day cooling-off period. Refunds are
          pro-rata where legally required or approved by AutoTime in good faith.
        </p>
      </section>

      <section className="legal-section">
        <h2>AI output</h2>
        <p>
          AI features are assistive. You are responsible for reviewing outputs,
          ensuring application content is accurate and confirming that no
          experience, qualification or work-right statement is misleading.
        </p>
      </section>

      <section className="legal-section">
        <h2>Limitation of liability</h2>
        <p>
          AutoTime is provided with reasonable care, but we do not guarantee job
          interviews, offers, visa outcomes, platform availability or employer
          responses. Liability is limited to the amount you paid for the service
          in the 12 months before the claim, except where law does not allow
          limitation.
        </p>
      </section>

      <section className="legal-section">
        <h2>Governing law</h2>
        <p>
          These terms are governed by the laws of England and Wales. The courts
          of England and Wales have exclusive jurisdiction unless consumer law
          gives you mandatory rights elsewhere.
        </p>
      </section>
    </main>
  )
}
