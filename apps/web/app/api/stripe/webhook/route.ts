import { type NextRequest, NextResponse } from "next/server"
import type Stripe from "stripe"
import { diagnosticJson } from "../../../../lib/diagnostics"
import { sendUpgradeConfirmed } from "../../../../lib/email"
import {
  configurationUnavailableMessage,
  isConfigurationUnavailableError,
} from "../../../../lib/configuration-error"
import {
  getStripeWebhookEnv,
  getSupabaseServiceRoleEnv,
} from "../../../../lib/env.server"
import { createAdminClient } from "../../../../lib/supabase/admin"
import type {
  Json,
  SubscriptionPlan,
  SubscriptionStatus,
} from "../../../../lib/supabase/types"
import { getWebhookStripeClient } from "../../../../lib/stripe"

type ApiResponse<T> = {
  data: T | null
  error: string | null
  status: number
}

type WebhookRouteData = {
  received: boolean
}

function jsonResponse(
  body: ApiResponse<WebhookRouteData>,
): NextResponse<ApiResponse<WebhookRouteData>> {
  return NextResponse.json(body, { status: body.status })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function getString(value: unknown): string | null {
  return typeof value === "string" ? value : null
}

function isStripeSubscription(value: unknown): value is Stripe.Subscription {
  return isRecord(value) && value.object === "subscription"
}

function isStripeInvoice(value: unknown): value is Stripe.Invoice {
  return isRecord(value) && value.object === "invoice"
}

function isStripeCheckoutSession(
  value: unknown,
): value is Stripe.Checkout.Session {
  return isRecord(value) && value.object === "checkout.session"
}

function isStripeCharge(value: unknown): value is Stripe.Charge {
  return isRecord(value) && value.object === "charge"
}

function isStripeDispute(value: unknown): value is Stripe.Dispute {
  return isRecord(value) && value.object === "dispute"
}

function getSubscriptionPlan(): SubscriptionPlan {
  return "pro"
}

function mapStripeStatus(
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

function getCustomerId(
  customer: Stripe.Subscription["customer"],
): string | null {
  return typeof customer === "string" ? customer : customer.id
}

function getCurrentPeriodEnd(subscription: Stripe.Subscription): string | null {
  const periodEnds = subscription.items.data
    .map((item) => item.current_period_end)
    .filter((periodEnd) => typeof periodEnd === "number")

  if (periodEnds.length === 0) {
    return null
  }

  return new Date(Math.max(...periodEnds) * 1000).toISOString()
}

async function upsertSubscriptionFromStripe(
  subscription: Stripe.Subscription,
): Promise<{ periodEnd: Date | null; userId: string | null }> {
  try {
    const supabase = createAdminClient()
    const userId = getString(subscription.metadata.user_id)
    const customerId = getCustomerId(subscription.customer)

    if (!userId || !customerId) {
      return { periodEnd: null, userId: null }
    }

    const currentPeriodEnd = getCurrentPeriodEnd(subscription)

    const { error } = await supabase.from("subscriptions").upsert(
      {
        user_id: userId,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
        plan: getSubscriptionPlan(),
        status: mapStripeStatus(subscription.status),
        current_period_end: currentPeriodEnd,
      },
      { onConflict: "user_id" },
    )

    if (error) {
      throw new Error(error.message)
    }

    return {
      periodEnd: currentPeriodEnd ? new Date(currentPeriodEnd) : null,
      userId,
    }
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to update subscription from Stripe"

    throw new Error(message)
  }
}

async function sendUpgradeEmailForUser(
  userId: string,
  periodEnd: Date,
  plan: SubscriptionPlan,
): Promise<void> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase.auth.admin.getUserById(userId)

    if (error || !data.user.email) {
      return
    }

    await sendUpgradeConfirmed(
      data.user.email,
      "Pro",
      periodEnd,
    )
  } catch (error: unknown) {
    return
  }
}

async function grantCreditPack(session: Stripe.Checkout.Session): Promise<void> {
  if (
    session.payment_status !== "paid" ||
    session.metadata?.purchase_type !== "ai_credits"
  ) {
    return
  }

  const userId = session.metadata.user_id
  const credits = Number.parseInt(session.metadata.credits ?? "", 10)

  if (!userId || !Number.isSafeInteger(credits) || credits <= 0) {
    throw new Error("Credit checkout metadata is invalid")
  }

  const { error } = await createAdminClient().rpc("grant_ai_credit_pack", {
    p_checkout_session_id: session.id,
    p_credits: credits,
    p_user_id: userId,
  })

  if (error) {
    throw new Error(error.message)
  }
}

async function markSubscriptionCancelled(
  subscription: Stripe.Subscription,
): Promise<void> {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from("subscriptions")
      .update({
        plan: "free",
        status: "cancelled",
        current_period_end: getCurrentPeriodEnd(subscription),
      })
      .eq("stripe_subscription_id", subscription.id)

    if (error) {
      throw new Error(error.message)
    }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unable to cancel subscription"

    throw new Error(message)
  }
}

function getChargeCustomerId(charge: Stripe.Charge): string | null {
  if (!charge.customer) {
    return null
  }

  return typeof charge.customer === "string"
    ? charge.customer
    : charge.customer.id
}

async function resolveUserIdByCustomerId(
  customerId: string | null,
): Promise<string | null> {
  if (!customerId) {
    return null
  }

  const { data } = await createAdminClient()
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle()

  return data?.user_id ?? null
}

// Founder-approved policy for #139's flagged refund/dispute gap: log for
// manual review, take no automatic account action. This does not yet
// surface in the admin UI as its own section - reviewing today means
// querying operational_logs where area = 'stripe' directly. Adding a
// dedicated admin view is a natural follow-up if this proves worth
// surfacing there, not something to build speculatively here.
async function logStripeReviewEvent({
  code,
  level,
  message,
  metadata,
  userId,
}: {
  code: string
  level: "warn" | "info"
  message: string
  metadata: Record<string, unknown>
  userId: string | null
}): Promise<void> {
  try {
    await createAdminClient()
      .from("operational_logs")
      .insert({
        area: "stripe",
        code,
        level,
        message,
        metadata: JSON.parse(JSON.stringify(metadata)) as Json,
        user_id: userId,
      })
  } catch {
    // Best-effort audit trail only - never let a logging failure surface as
    // a webhook processing error (Stripe would otherwise retry forever).
  }
}

async function handleChargeRefunded(charge: Stripe.Charge): Promise<void> {
  const customerId = getChargeCustomerId(charge)
  const userId = await resolveUserIdByCustomerId(customerId)

  await logStripeReviewEvent({
    code: "stripe.charge.refunded",
    level: "info",
    message: "A Stripe charge was refunded - review for AI credit clawback.",
    metadata: {
      amountRefunded: charge.amount_refunded,
      chargeId: charge.id,
      currency: charge.currency,
      customerId,
    },
    userId,
  })
}

async function handleDisputeCreated(dispute: Stripe.Dispute): Promise<void> {
  const chargeId =
    typeof dispute.charge === "string" ? dispute.charge : dispute.charge.id
  let customerId: string | null =
    typeof dispute.charge === "string"
      ? null
      : getChargeCustomerId(dispute.charge)

  if (!customerId) {
    try {
      const charge = await getWebhookStripeClient().charges.retrieve(chargeId)
      customerId = getChargeCustomerId(charge)
    } catch {
      customerId = null
    }
  }

  const userId = await resolveUserIdByCustomerId(customerId)

  await logStripeReviewEvent({
    code: "stripe.dispute.created",
    level: "warn",
    message:
      "A Stripe dispute was opened - review for AI credit clawback or account action.",
    metadata: {
      amount: dispute.amount,
      chargeId,
      currency: dispute.currency,
      customerId,
      disputeId: dispute.id,
      reason: dispute.reason,
      status: dispute.status,
    },
    userId,
  })
}

async function markInvoicePaymentFailed(
  invoice: Stripe.Invoice,
): Promise<void> {
  try {
    const parent = invoice.parent
    const subscriptionId =
      parent?.type === "subscription_details"
        ? typeof parent.subscription_details?.subscription === "string"
          ? parent.subscription_details.subscription
          : parent.subscription_details?.subscription.id
        : null

    if (!subscriptionId) {
      return
    }

    const supabase = createAdminClient()
    const { error } = await supabase
      .from("subscriptions")
      .update({ status: "past_due" })
      .eq("stripe_subscription_id", subscriptionId)

    if (error) {
      throw new Error(error.message)
    }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unable to mark invoice failed"

    throw new Error(message)
  }
}

async function claimStripeEvent(event: Stripe.Event): Promise<boolean> {
  const supabase = createAdminClient()
  const { error } = await supabase.from("stripe_webhook_events").insert({
    event_id: event.id,
    event_type: event.type,
  })

  if (!error) {
    return true
  }

  if (error.code === "23505") {
    return false
  }

  throw new Error(error.message)
}

async function releaseStripeEventClaim(event: Stripe.Event): Promise<void> {
  const supabase = createAdminClient()
  await supabase.from("stripe_webhook_events").delete().eq("event_id", event.id)
}

async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  try {
    const eventObject = event.data.object

    if (
      (event.type === "customer.subscription.created" ||
        event.type === "customer.subscription.updated") &&
      isStripeSubscription(eventObject)
    ) {
      const result = await upsertSubscriptionFromStripe(eventObject)

      if (
        event.type === "customer.subscription.created" &&
        result.userId &&
        result.periodEnd
      ) {
        await sendUpgradeEmailForUser(
          result.userId,
          result.periodEnd,
          getSubscriptionPlan(),
        )
      }

      return
    }

    if (
      (event.type === "checkout.session.completed" ||
        event.type === "checkout.session.async_payment_succeeded") &&
      isStripeCheckoutSession(eventObject)
    ) {
      await grantCreditPack(eventObject)
      return
    }

    if (
      event.type === "customer.subscription.deleted" &&
      isStripeSubscription(eventObject)
    ) {
      await markSubscriptionCancelled(eventObject)
      return
    }

    if (
      event.type === "invoice.payment_failed" &&
      isStripeInvoice(eventObject)
    ) {
      await markInvoicePaymentFailed(eventObject)
      return
    }

    if (event.type === "charge.refunded" && isStripeCharge(eventObject)) {
      await handleChargeRefunded(eventObject)
      return
    }

    if (
      event.type === "charge.dispute.created" &&
      isStripeDispute(eventObject)
    ) {
      await handleDisputeCreated(eventObject)
    }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unable to handle Stripe event"

    throw new Error(message)
  }
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<WebhookRouteData>>> {
  try {
    const signature = request.headers.get("stripe-signature")

    if (!signature) {
      return diagnosticJson({
        area: "stripe",
        code: "stripe.webhook.signature.missing",
        data: null,
        error: "Missing Stripe signature",
        request,
        status: 400,
      })
    }

    const payload = await request.text()
    getSupabaseServiceRoleEnv()
    const event = getWebhookStripeClient().webhooks.constructEvent(
      payload,
      signature,
      getStripeWebhookEnv().webhookSecret,
    )

    const claimed = await claimStripeEvent(event)

    if (claimed) {
      try {
        await handleStripeEvent(event)
      } catch (error: unknown) {
        await releaseStripeEventClaim(event)
        throw error
      }
    }

    return jsonResponse({
      data: { received: true },
      error: null,
      status: 200,
    })
  } catch (error: unknown) {
    if (isConfigurationUnavailableError(error)) {
      return diagnosticJson({
        area: "stripe",
        code: "stripe.webhook.unavailable",
        data: null,
        error: configurationUnavailableMessage,
        request,
        status: 503,
      })
    }

    return diagnosticJson({
      area: "stripe",
      code: "stripe.webhook.failed",
      data: null,
      error: "Invalid webhook request",
      log: true,
      request,
      status: 400,
    })
  }
}
