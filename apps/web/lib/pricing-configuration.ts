import type { getStripePriceEnv } from "./env.server.ts"

export const billingUnavailableMessage =
  "Billing is temporarily unavailable. You can continue using the Free plan."

/**
 * Single source of truth for the amounts actually charged, shared by the
 * server-only Stripe client (lib/stripe.ts) and the client-rendered pricing
 * page (PricingCard.tsx). Previously PricingCard hardcoded its own display
 * strings ("GBP 9/month") independently of lib/stripe.ts's PLAN_DETAILS -
 * the two could drift from each other with no build-time signal, and
 * neither was checked against the live Stripe Price object for the monthly
 * plan (only the quarterly/credit-pack prices are build-verified, in
 * scripts/ensure-stripe-prices.mjs). This doesn't close that second gap on
 * its own, but it removes the display-string duplication that could drift
 * even when the underlying amounts agree.
 */
export const PRICING_PLAN_DETAILS = {
  pro_monthly: { amount: 900, currency: "gbp", interval: "month" },
  pro_quarterly: { amount: 1900, currency: "gbp", interval: "quarter" },
  ai_credit_pack: { amount: 500, credits: 25, currency: "gbp" },
} as const

function formatGbp(pence: number): string {
  return (pence / 100).toFixed(pence % 100 === 0 ? 0 : 2)
}

export const PRICING_DISPLAY = {
  free: "GBP 0/month",
  proMonthly: `GBP ${formatGbp(PRICING_PLAN_DETAILS.pro_monthly.amount)}/month`,
  proQuarterly: `GBP ${formatGbp(PRICING_PLAN_DETAILS.pro_quarterly.amount)}/3 months`,
  proQuarterlyDetail: (() => {
    const perMonth = PRICING_PLAN_DETAILS.pro_quarterly.amount / 3
    const savings =
      PRICING_PLAN_DETAILS.pro_monthly.amount * 3 -
      PRICING_PLAN_DETAILS.pro_quarterly.amount
    return `Equivalent to GBP ${formatGbp(perMonth)}/month - save GBP ${formatGbp(savings)}`
  })(),
  aiCreditPackPrice: `GBP ${formatGbp(PRICING_PLAN_DETAILS.ai_credit_pack.amount)}`,
} as const

export function readPricingConfiguration(
  readPrices: typeof getStripePriceEnv,
  requireDependencies: () => void,
): ReturnType<typeof getStripePriceEnv> | null {
  try {
    const prices = readPrices()
    requireDependencies()
    return prices
  } catch {
    return null
  }
}

export function getBillingControlState(billingAvailable: boolean): {
  disabled: boolean
  label: string
  message?: string
} {
  return billingAvailable
    ? { disabled: false, label: "Start Pro" }
    : {
        disabled: true,
        label: "Billing unavailable",
        message: billingUnavailableMessage,
      }
}
