import { PublicNav } from "../../components/PublicNav"
import { ProfileProtocolLock } from "../../components/ProfileProtocolLock"
import { PricingCards } from "../../components/PricingCard"
import { PricingFaq } from "../../components/PricingFaq"
import { getServerEnv } from "../../lib/env"
import { getRemainingAiCalls, getUserPlan } from "../../lib/feature-gate"
import { createServerClient } from "../../lib/supabase/server"
import type { SubscriptionPlan } from "../../lib/supabase/types"
import { getTestAuthUser } from "../../lib/test-auth"

export const dynamic = "force-dynamic"

type PricingAccount = {
  email: string
  id: string
  plan: SubscriptionPlan
  remainingAiCalls: number | null
}

async function getPricingAccount(): Promise<PricingAccount | null> {
  try {
    const testUser = getTestAuthUser()

    if (testUser) {
      return {
        email: testUser.email ?? "account",
        id: testUser.id,
        plan: await getUserPlan(testUser.id),
        remainingAiCalls: await getRemainingAiCalls(testUser.id)
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

    const plan = await getUserPlan(user.id)

    return {
      email: user.email ?? "account",
      id: user.id,
      plan,
      remainingAiCalls: plan === "free" ? await getRemainingAiCalls(user.id) : null
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
      "LinkedIn visible job posts plus Greenhouse, Lever, Workday, Ashby, SmartRecruiters, iCIMS, BambooHR, Teamtailor, Recruitee, Jobvite and Personio."
  }
]

const freeFeatures = [
  { label: "Chrome extension with local save first", included: true },
  { label: "Tracked job sync to dashboard", included: true },
  { label: "5 AI job analyses per month", included: true },
  { label: "Application tracking (unlimited)", included: true },
  { label: "Work-right and country fit scoring", included: true },
  { label: "Visible LinkedIn and job-board import", included: true },
  { label: "CSV export", included: true },
  { label: "Full profile and workflow cloud sync", included: false },
  { label: "AI application content generation", included: false },
  { label: "Interview prep packs", included: false },
  { label: "Unlimited AI analyses", included: false }
]

const proFeatures = [
  { label: "Everything in Free", included: true },
  { label: "Full profile and workflow cloud sync", included: true },
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

      <ProfileProtocolLock userId={account?.id ?? ""}>
        <header className="pricing-hero">
          <div>
            <p className="eyebrow">Pricing</p>
            <h1>Choose your AutoTime plan</h1>
            <p>
              Start free with tracked-job sync. Upgrade when you need unlimited AI,
              full workflow sync and interview prep.
            </p>
          </div>
        </header>

        <PricingCards
          accountPlan={account?.plan ?? null}
          annualPriceId={serverEnv.STRIPE_PRO_ANNUAL_PRICE_ID}
          freeFeatures={freeFeatures}
          isSignedIn={Boolean(account)}
          monthlyPriceId={serverEnv.STRIPE_PRO_MONTHLY_PRICE_ID}
          proFeatures={proFeatures}
        />

        <section className="pricing-gate-panel" aria-label="Plan gate clarity">
          <div className="section-heading">
            <p className="eyebrow">No hidden surprise</p>
            <h2>What is locked, why, and what Pro unlocks</h2>
            <p>
              Free keeps the core workflow usable. Pro removes limits when you are
              actively applying and need unlimited AI plus full workflow sync.
            </p>
          </div>
          <div className="pricing-gate-grid">
            <article>
              <span>Remaining AI calls</span>
              <strong>
                {account
                  ? account.plan === "pro"
                    ? "Unlimited"
                    : `${account.remainingAiCalls ?? 0} this month`
                  : "Sign in to view"}
              </strong>
              <p>Free includes limited AI analysis so you can validate quality.</p>
            </article>
            <article>
              <span>Locked on Free</span>
              <strong>Advanced AI + full sync</strong>
              <p>
                Application content, interview prep packs, unlimited AI and full
                profile/workflow cloud sync require Pro.
              </p>
            </article>
            <article>
              <span>Why it is locked</span>
              <strong>Cost and evidence control</strong>
              <p>
                AI usage has real compute cost, and Pro features rely on stronger
                account-level workflow persistence.
              </p>
            </article>
            <article>
              <span>Upgrade unlocks</span>
              <strong>More intelligence, same control</strong>
              <p>
                You still review everything. AutoTime does not auto-submit or hide
                job-site actions behind the upgrade.
              </p>
            </article>
          </div>
        </section>

        <section className="faq-section">
          <div className="section-heading">
            <p className="eyebrow">FAQ</p>
            <h2>Clear answers before you subscribe</h2>
          </div>
          <PricingFaq faqs={faqs} />
        </section>
      </ProfileProtocolLock>
    </main>
  )
}
