import { PublicNav } from "../../components/PublicNav"

const dataItems = [
  "Email address and OAuth account identifiers used for sign-in.",
  "Candidate profile information you choose to save, including role targets, work-right details and CV evidence.",
  "Application history, job descriptions, notes, status updates and interview preparation records."
]

const processors = [
  "Supabase stores account and product data in an EU region database.",
  "Vercel hosts the web application in an EU region.",
  "OpenAI API processes job descriptions and profile data when you use AI features. Data is not used to train OpenAI models, and an OpenAI data processing agreement is in place.",
  "Stripe processes payment data for subscriptions. AutoTime does not store card details.",
  "PostHog EU receives anonymised usage events only when analytics is configured and enabled."
]

export default function PrivacyPage() {
  return (
    <main className="legal-shell">
      <PublicNav />
      <header className="legal-header">
        <div>
          <p className="eyebrow">Privacy policy</p>
          <h1>How AutoTime handles your data</h1>
          <p>Last updated: 6 May 2026</p>
        </div>
      </header>

      <section className="legal-section">
        <h2>Data controller</h2>
        <p>
          The data controller is AutoTime AI Ltd (&quot;AutoTime&quot;,
          &quot;we&quot;, &quot;us&quot;), London, UK. ICO registration
          reference will be added after registration is complete. Contact:
          hello@autotimeai.com.
        </p>
      </section>

      <section className="legal-section">
        <h2>Data we collect</h2>
        <ul>
          {dataItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="legal-section">
        <h2>Storage and processors</h2>
        <ul>
          {processors.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="legal-section">
        <h2>Why we process data</h2>
        <p>
          AutoTime processes your data to provide job-fit analysis, application
          tracking, cloud sync, billing, account access, support and product
          improvement. We do not sell personal data.
        </p>
      </section>

      <section className="legal-section">
        <h2>Your GDPR rights</h2>
        <p>
          You have rights of access, deletion and portability under GDPR
          Articles 15-20, together with rights to correct inaccurate data,
          restrict processing and object where applicable. You can exercise
          access and deletion yourself at any time from Settings &gt; Your
          data rights: &quot;Export my data&quot; downloads everything stored
          about your account, and &quot;Delete my account&quot; permanently
          removes your sign-in account and all associated data. For
          corrections, restriction or objection requests, contact
          hello@autotimeai.com.
        </p>
      </section>

      <section className="legal-section">
        <h2>Retention</h2>
        <p>
          Account data is retained while your account is active. Using
          &quot;Delete my account&quot; in Settings removes your account and
          all associated data immediately and permanently, except limited
          records we must retain for legal, tax or fraud prevention reasons.
        </p>
      </section>
    </main>
  )
}
