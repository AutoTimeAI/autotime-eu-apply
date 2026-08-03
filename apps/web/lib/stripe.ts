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
  pro_annual: { amount: 7900, currency: "gbp", interval: "year" },
} as const

export type PlanKey = keyof typeof PLAN_DETAILS

export function getPlans() {
  const prices = getStripePriceEnv()
  return {
    pro_monthly: { ...PLAN_DETAILS.pro_monthly, priceId: prices.monthly },
    pro_annual: { ...PLAN_DETAILS.pro_annual, priceId: prices.annual },
  } as const
}

export function isConfiguredStripePrice(priceId: string): boolean {
  return Object.values(getPlans()).some((plan) => plan.priceId === priceId)
}
