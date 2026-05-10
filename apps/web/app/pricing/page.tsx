import { PublicNav } from "../../components/PublicNav"
import { PricingCards } from "../../components/PricingCard"
import { getServerEnv } from "../../lib/env"
import { getUserPlan } from "../../lib/feature-gate"
import { createServerClient } from "../../lib/supabase/server"
import type { SubscriptionPlan } from "../../lib/supabase/types"
import { getTestAuthUser } from "../../lib/test-auth"

export const dynamic = "force-dynamic"

type PricingAccount = {
  email: string
  plan: SubscriptionPlan
}

async function getPricingAccount(): Promise<PricingAccount | null> {
  try {
    const testUser = getTestAuthUser()

    if (testUser) {
      return {
        email: testUser.email ?? "account",
        plan: await getUserPlan(testUser.id)
      }
    }

    const supabase = await createServerClient()
    const {
      data: { user },
      error
    } = await supabase.auth.getUser()

    if (error || !user) {
      return null
    }

    return {
      email: user.email ?? "account",
      plan: await getUserPlan(user.id)
    }
  } catch (error: unknown) {
    return null
  }
}

const faqs = [
  {
    question: "Do I need an OpenAI account?",
    answer: "No. AutoTime provides AI through the web dashboard when available."
  },
  {
    question: "Is my data private?",
    answer:
      "Yes - designed around GDPR principles, explicit user consent, and reputable infrastructure providers."
  },
  {
    question: "Can I cancel?",
    answer: "Yes, any time from your billing portal."
  },
  {
    question: "Does it work for non-UK candidates?",
    answer:
      "Yes - built specifically for EU relocation and work-right scenarios."
  },
  {
    question: "What ATS platforms does it support?",
    answer:
      "Greenhouse, Lever, Workday, Ashby, SmartRecruiters, iCIMS, BambooHR, Teamtailor, Recruitee, Jobvite and Personio."
  }
]

const freeFeatures = [
  { label: "Chrome extension with local storage", included: true },
  { label: "5 AI job analyses per month", included: true },
  { label: "Application tracking (unlimited)", included: true },
  { label: "Work-right and country fit scoring", included: true },
  { label: "LinkedIn manual copy/paste workflow", included: true },
  { label: "CSV export", included: true },
  { label: "Cloud sync across devices", included: false },
  { label: "AI application content generation", included: false },
  { label: "Interview prep packs", included: false },
  { label: "Unlimited AI analyses", included: false }
]

const proFeatures = [
  { label: "Everything in Free", included: true },
  { label: "Cloud sync - never lose your data", included: true },
  { label: "Unlimited AI job analyses", included: true },
  { label: "AI cover letter and application content", included: true },
  { label: "Role-specific interview prep packs", included: true },
  { label: "Priority ATS platform support", included: true },
  { label: "Cancel any time", included: true }
]

export default async function PricingPage() {
  const serverEnv = getServerEnv()
  const account = await getPricingAccount()

  return (
    <main className="pricing-shell">
      <PublicNav currentPath="/pricing" user={account} />

      <header className="pricing-hero">
        <div>
          <p className="eyebrow">Pricing</p>
          <h1>Choose the search system that matches your ambition</h1>
          <p>
            Start with local-first tracking, then upgrade when unlimited AI,
            cloud sync and interview prep become worth more than the time they
            save.
          </p>
        </div>
      </header>

      <section
        className="pricing-demo-panel"
        aria-labelledby="pricing-demo-title"
      >
        <div className="section-heading">
          <p className="eyebrow">Product walkthrough</p>
          <h2 id="pricing-demo-title">See AutoTime before choosing a plan</h2>
          <p>
            A first-time user tour of profile evidence, Job Check, extension
            import, application content, tracking, interview prep and Pro.
          </p>
        </div>
        <video
          controls
          preload="metadata"
          src="/demo/autotime-first-user-demo.mp4"
        >
          Your browser does not support embedded video.
        </video>
      </section>

      <PricingCards
        accountPlan={account?.plan ?? null}
        annualPriceId={serverEnv.STRIPE_PRO_ANNUAL_PRICE_ID}
        freeFeatures={freeFeatures}
        isSignedIn={Boolean(account)}
        monthlyPriceId={serverEnv.STRIPE_PRO_MONTHLY_PRICE_ID}
        proFeatures={proFeatures}
      />

      <section className="faq-section">
        <div className="section-heading">
          <p className="eyebrow">FAQ</p>
          <h2>Clear answers before you subscribe</h2>
        </div>
        <div className="faq-grid">
          {faqs.map((faq) => (
            <article className="faq-item" key={faq.question}>
              <h3>{faq.question}</h3>
              <p>{faq.answer}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
