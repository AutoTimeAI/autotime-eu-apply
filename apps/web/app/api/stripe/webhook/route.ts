import { type NextRequest, NextResponse } from "next/server"
import type Stripe from "stripe"
import { sendUpgradeConfirmed } from "../../../../lib/email"
import { getServerEnv } from "../../../../lib/env"
import { createAdminClient } from "../../../../lib/supabase/admin"
import type { SubscriptionStatus } from "../../../../lib/supabase/types"
import { stripe } from "../../../../lib/stripe"

type ApiResponse<T> = {
  data: T | null
  error: string | null
  status: number
}

type WebhookRouteData = {
  received: boolean
}

function jsonResponse(
  body: ApiResponse<WebhookRouteData>
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

function mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  if (status === "active" || status === "trialing" || status === "past_due") {
    return status
  }

  if (status === "canceled") {
    return "cancelled"
  }

  return "past_due"
}

function getCustomerId(customer: Stripe.Subscription["customer"]): string | null {
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
  subscription: Stripe.Subscription
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
        plan: "pro",
        status: mapStripeStatus(subscription.status),
        current_period_end: currentPeriodEnd
      },
      { onConflict: "user_id" }
    )

    if (error) {
      throw new Error(error.message)
    }

    return {
      periodEnd: currentPeriodEnd ? new Date(currentPeriodEnd) : null,
      userId
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
  periodEnd: Date
): Promise<void> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase.auth.admin.getUserById(userId)

    if (error || !data.user.email) {
      return
    }

    await sendUpgradeConfirmed(data.user.email, "Pro", periodEnd)
  } catch (error: unknown) {
    return
  }
}

async function markSubscriptionCancelled(
  subscription: Stripe.Subscription
): Promise<void> {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from("subscriptions")
      .update({
        plan: "free",
        status: "cancelled",
        current_period_end: getCurrentPeriodEnd(subscription)
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

async function markInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
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
        await sendUpgradeEmailForUser(result.userId, result.periodEnd)
      }

      return
    }

    if (
      event.type === "customer.subscription.deleted" &&
      isStripeSubscription(eventObject)
    ) {
      await markSubscriptionCancelled(eventObject)
      return
    }

    if (event.type === "invoice.payment_failed" && isStripeInvoice(eventObject)) {
      await markInvoicePaymentFailed(eventObject)
    }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unable to handle Stripe event"

    throw new Error(message)
  }
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<WebhookRouteData>>> {
  try {
    const signature = request.headers.get("stripe-signature")

    if (!signature) {
      return jsonResponse({
        data: null,
        error: "Missing Stripe signature",
        status: 400
      })
    }

    const payload = await request.text()
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      getServerEnv().STRIPE_WEBHOOK_SECRET
    )

    await handleStripeEvent(event)

    return jsonResponse({
      data: { received: true },
      error: null,
      status: 200
    })
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Stripe webhook failed"

    return jsonResponse({ data: null, error: message, status: 400 })
  }
}
