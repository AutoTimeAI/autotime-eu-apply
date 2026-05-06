import Stripe from "stripe"
import { getServerEnv } from "./env"

const serverEnv = getServerEnv()

export const stripe = new Stripe(serverEnv.STRIPE_SECRET_KEY, {
  apiVersion: "2026-04-22.dahlia"
})

export const PLANS = {
  pro_monthly: {
    priceId: serverEnv.STRIPE_PRO_MONTHLY_PRICE_ID,
    amount: 900,
    currency: "gbp",
    interval: "month"
  },
  pro_annual: {
    priceId: serverEnv.STRIPE_PRO_ANNUAL_PRICE_ID,
    amount: 7900,
    currency: "gbp",
    interval: "year"
  }
} as const

export type PlanKey = keyof typeof PLANS

export function isConfiguredStripePrice(priceId: string): boolean {
  return Object.values(PLANS).some((plan) => plan.priceId === priceId)
}
