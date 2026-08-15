import "server-only"
import Stripe from "stripe"
import { getStripePriceEnv, getStripeSecretEnv } from "./env.server.ts"

let stripeClient: Stripe | null = null

export function getStripeClient(): Stripe {
  if (!stripeClient) {
    stripeClient = new Stripe(getStripeSecretEnv().secretKey, {
      apiVersion: "2026-04-22.dahlia",
    })
  }
  return stripeClient
}

export const getPortalStripeClient = getStripeClient
export const getWebhookStripeClient = getStripeClient

export const PLAN_DETAILS = {
  pro_monthly: { amount: 900, currency: "gbp", interval: "month" },
  pro_quarterly: { amount: 1900, currency: "gbp", interval: "quarter" },
  ai_credit_pack: { amount: 500, credits: 25, currency: "gbp" },
} as const

export type PlanKey = keyof typeof PLAN_DETAILS

export function getPlans() {
  const prices = getStripePriceEnv()
  return {
    pro_monthly: { ...PLAN_DETAILS.pro_monthly, priceId: prices.proMonthly },
    pro_quarterly: {
      ...PLAN_DETAILS.pro_quarterly,
      priceId: prices.proQuarterly,
    },
    ai_credit_pack: {
      ...PLAN_DETAILS.ai_credit_pack,
      priceId: prices.creditPack,
    },
  } as const
}

export function isConfiguredStripePrice(priceId: string): boolean {
  return Object.values(getPlans()).some((plan) => plan.priceId === priceId)
}

export function getCheckoutProduct(priceId: string):
  | { credits: number; mode: "payment"; priceId: string }
  | { mode: "subscription"; plan: "pro"; priceId: string }
  | null {
  const plans = getPlans()

  if (priceId === plans.ai_credit_pack.priceId) {
    return {
      credits: plans.ai_credit_pack.credits,
      mode: "payment",
      priceId,
    }
  }

  if (
    priceId === plans.pro_monthly.priceId ||
    priceId === plans.pro_quarterly.priceId
  ) {
    return { mode: "subscription", plan: "pro", priceId }
  }

  return null
}
