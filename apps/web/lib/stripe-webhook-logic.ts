import type Stripe from "stripe"
import type { SubscriptionPlan, SubscriptionStatus } from "./supabase/types"

/**
 * Pure, DB-free logic extracted from the webhook route handler so it can be
 * unit-tested directly with real Stripe-shaped fixtures. Previously this
 * logic only lived inline in app/api/stripe/webhook/route.ts, where the
 * only test coverage was a source-text regex check that the route "called
 * the right RPC name" - the logic itself (status mapping, period-end
 * selection, metadata validation) was never actually exercised by a test.
 */

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

export function getString(value: unknown): string | null {
  return typeof value === "string" ? value : null
}

export function isStripeSubscription(
  value: unknown,
): value is Stripe.Subscription {
  return isRecord(value) && value.object === "subscription"
}

export function isStripeInvoice(value: unknown): value is Stripe.Invoice {
  return isRecord(value) && value.object === "invoice"
}

export function isStripeCheckoutSession(
  value: unknown,
): value is Stripe.Checkout.Session {
  return isRecord(value) && value.object === "checkout.session"
}

export function isStripeCharge(value: unknown): value is Stripe.Charge {
  return isRecord(value) && value.object === "charge"
}

export function isStripeDispute(value: unknown): value is Stripe.Dispute {
  return isRecord(value) && value.object === "dispute"
}

export function getSubscriptionPlan(): SubscriptionPlan {
  return "pro"
}

export function mapStripeStatus(
  status: Stripe.Subscription.Status,
): SubscriptionStatus {
  switch (status) {
    case "active":
    case "trialing":
    case "past_due":
    case "incomplete":
    case "incomplete_expired":
    case "unpaid":
    case "paused":
      return status
    case "canceled":
      return "cancelled"
  }
}

export function getCustomerId(
  customer: Stripe.Subscription["customer"],
): string | null {
  return typeof customer === "string" ? customer : customer.id
}

export function getCurrentPeriodEnd(
  subscription: Stripe.Subscription,
): string | null {
  const periodEnds = subscription.items.data
    .map((item) => item.current_period_end)
    .filter((periodEnd) => typeof periodEnd === "number")

  if (periodEnds.length === 0) {
    return null
  }

  return new Date(Math.max(...periodEnds) * 1000).toISOString()
}

export function getChargeCustomerId(charge: Stripe.Charge): string | null {
  if (!charge.customer) {
    return null
  }

  return typeof charge.customer === "string"
    ? charge.customer
    : charge.customer.id
}

export class CreditPackMetadataError extends Error {}

/**
 * Validates a completed/paid checkout session's credit-pack metadata,
 * returning the fields needed to grant credits or `null` if this session
 * isn't a paid credit-pack purchase at all (not an error - most checkout
 * sessions are subscriptions, not credit packs). Throws
 * CreditPackMetadataError only when the session IS a paid credit-pack
 * purchase but its metadata is missing/malformed - the caller is expected
 * to let that propagate so Stripe retries the event, since a metadata bug
 * on a real paid session should be visible, not silently swallowed.
 */
export function validateCreditPackMetadata(
  session: Stripe.Checkout.Session,
): { credits: number; userId: string } | null {
  if (
    session.payment_status !== "paid" ||
    session.metadata?.purchase_type !== "ai_credits"
  ) {
    return null
  }

  const userId = session.metadata.user_id
  const credits = Number.parseInt(session.metadata.credits ?? "", 10)

  if (!userId || !Number.isSafeInteger(credits) || credits <= 0) {
    throw new CreditPackMetadataError("Credit checkout metadata is invalid")
  }

  return { credits, userId }
}
