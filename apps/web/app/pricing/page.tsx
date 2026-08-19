import { PublicNav } from "../../components/PublicNav";
import { ProfileProtocolLock } from "../../components/ProfileProtocolLock";
import { PricingCards } from "../../components/PricingCard";
import { PricingFaq } from "../../components/PricingFaq";
import {
  getStripePriceEnv,
  getStripeSecretEnv,
  getSupabaseServiceRoleEnv,
} from "../../lib/env.server";
import { getCanonicalAppUrl } from "../../lib/env";
import {
  getPurchasedAiCredits,
  getRemainingAiCalls,
  getUserPlan,
} from "../../lib/feature-gate";
import { createServerClient } from "../../lib/supabase/server";
import type { SubscriptionPlan } from "../../lib/supabase/types";
import { getTestAuthUser } from "../../lib/test-auth";
import { readPricingConfiguration } from "../../lib/pricing-configuration";

export const dynamic = "force-dynamic";

type PricingAccount = {
  email: string;
  id: string;
  plan: SubscriptionPlan;
  purchasedAiCredits: number;
  remainingAiCalls: number | null;
};

async function getPricingAccount(): Promise<PricingAccount | null> {
  try {
    const testUser = getTestAuthUser();

    if (testUser) {
      return {
        email: testUser.email ?? "account",
        id: testUser.id,
        plan: await getUserPlan(testUser.id),
        purchasedAiCredits: 0,
        remainingAiCalls: await getRemainingAiCalls(testUser.id),
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

    const plan = await getUserPlan(user.id);

    return {
      email: user.email ?? "account",
      id: user.id,
      plan,
      purchasedAiCredits: await getPurchasedAiCredits(user.id),
      remainingAiCalls: await getRemainingAiCalls(user.id),
    };
  } catch (error: unknown) {
    return null;
  }
}

const faqs = [
  {
    question: "Do I need an OpenAI account?",
    answer:
      "No. AutoTime provides AI through the web dashboard when available.",
  },
  {
    question: "Is my data private?",
    answer:
      "Yes - designed around GDPR principles, explicit user consent, and reputable infrastructure providers.",
  },
  {
    question: "Can I cancel?",
    answer: "Yes, any time from your billing portal.",
  },
  {
    question: "Does it work for non-UK candidates?",
    answer:
      "Yes - it is built for country-aware fit, relocation and work-right clarity across European tech applications.",
  },
  {
    question: "What is the main advantage?",
    answer:
      "AutoTime helps you apply less randomly: target roles strategically, check fit before writing, use real evidence and prepare for interview conversion.",
  },
];

const freeFeatures = [
  { label: "Strategic role targeting workspace", included: true },
  { label: "Unlimited tracked jobs and status updates", included: true },
  { label: "5 AI actions per month", included: true },
  { label: "Work-right and country fit scoring", included: true },
  { label: "Evidence-backed positioning workflow", included: true },
  { label: "Browser extension and visible job-post import", included: true },
  { label: "Unlimited ATS-safe CV editing", included: true },
  { label: "Unlimited PDF and DOCX CV downloads", included: true },
  { label: "CSV export", included: true },
  { label: "Full profile and workflow cloud sync", included: false },
  { label: "AI application content generation", included: false },
  { label: "Interview prep packs", included: false },
  { label: "Optional 25-credit packs for GBP 5", included: true },
];

const proFeatures = [
  { label: "Everything in Free", included: true },
  { label: "Full profile and workflow cloud sync", included: true },
  { label: "50 AI actions per month", included: true },
  {
    label: "AI cover letters and application content",
    included: true,
  },
  { label: "Role-specific interview prep packs", included: true },
  { label: "Interview conversion workflow", included: true },
  { label: "Priority workflow support", included: true },
];

export default async function PricingPage() {
  const account = await getPricingAccount();
  const prices = readPricingConfiguration(getStripePriceEnv, () => {
    getStripeSecretEnv();
    getSupabaseServiceRoleEnv();
    getCanonicalAppUrl();
  });

  return (
    <main className="pricing-shell">
      <PublicNav currentPath="/pricing" user={account} />

      <ProfileProtocolLock userId={account?.id ?? ""}>
        <header className="pricing-hero">
          <div>
            <p className="eyebrow">Pricing</p>
            <h1>Quality-first European tech applications</h1>
            <p>
              Start free with strategic targeting, country-aware fit and real
              evidence discipline. Upgrade when you need more AI capacity, full
              workflow sync and interview conversion prep. Every successful AI
              action uses one clearly counted allowance unit.
            </p>
          </div>
        </header>

        <PricingCards
          accountPlan={account?.plan ?? null}
          billingAvailable={prices !== null}
          creditPackPriceId={prices?.creditPack}
          freeFeatures={freeFeatures}
          isSignedIn={Boolean(account)}
          monthlyPriceId={prices?.proMonthly}
          proFeatures={proFeatures}
          quarterlyPriceId={prices?.proQuarterly}
        />

        <section className="pricing-gate-panel" aria-label="Plan gate clarity">
          <div className="section-heading">
            <p className="eyebrow">No hidden surprises</p>
            <h2>What is locked, why, and what Pro unlocks</h2>
            <p>
              Free keeps the quality-over-quantity workflow usable. Pro adds a
              larger monthly AI allowance, application support and full
              workflow sync, with monthly or quarterly billing.
            </p>
          </div>
          <div className="pricing-gate-grid">
            <article>
              <span>Remaining AI calls</span>
              <strong>
                {account
                  ? `${account.remainingAiCalls ?? 0} available`
                  : "5/month on Free"}
              </strong>
              <p>
                Free includes limited AI analysis so you can validate quality.
              </p>
            </article>
            <article>
              <span>Locked on Free</span>
              <strong>Advanced AI + full sync</strong>
              <p>
                Application content, interview prep packs and full
                profile/workflow cloud sync require Pro. Monthly and quarterly
                billing include the same 50-action allowance.
              </p>
            </article>
            <article>
              <span>Why it is locked</span>
              <strong>Cost and evidence control</strong>
              <p>
                AI usage has real compute cost. Monthly allowances keep pricing
                sustainable while GBP 5 credit packs cover occasional peaks.
              </p>
            </article>
            <article>
              <span>Upgrade unlocks</span>
              <strong>More intelligence, same control</strong>
              <p>
                You still review everything. Purchased credits never expire and
                AutoTime does not auto-submit applications.
              </p>
            </article>
            <article>
              <span>Purchased credits</span>
              <strong>{account?.purchasedAiCredits ?? 0}</strong>
              <p>
                Purchased credits are used only after the included monthly
                allowance and carry forward until used.
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
  );
}
