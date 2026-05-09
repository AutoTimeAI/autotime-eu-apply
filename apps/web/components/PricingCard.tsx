"use client"

import { useState } from "react"
import { z } from "zod"
import type { SubscriptionPlan } from "../lib/supabase/types"

type BillingInterval = "month" | "year"
type PricingCardAction = "checkout" | "link" | "portal"

type PricingCardFeature = {
  label: string
  included: boolean
}

type PricingCardProps = {
  action: PricingCardAction
  annualPriceId?: string
  billingInterval: BillingInterval
  ctaLabel: string
  description: string
  features: PricingCardFeature[]
  highlighted?: boolean
  href?: string
  monthlyPriceId?: string
  name: string
  price: string
}

type PricingCardsProps = {
  accountPlan?: SubscriptionPlan | null
  annualPriceId: string
  freeFeatures: PricingCardFeature[]
  isSignedIn?: boolean
  monthlyPriceId: string
  proFeatures: PricingCardFeature[]
}

const checkoutResponseSchema = z.object({
  data: z.object({ url: z.string().url() }).nullable(),
  error: z.string().nullable(),
  status: z.number()
})

async function startCheckout(priceId: string): Promise<string> {
  const response = await fetch("/api/stripe/checkout", {
    body: JSON.stringify({
      priceId,
      returnUrl: `${window.location.origin}/dashboard`
    }),
    headers: {
      "Content-Type": "application/json"
    },
    method: "POST"
  })

  if (response.status === 401) {
    const redirectTo = encodeURIComponent("/pricing")
    window.location.assign(`/login?redirectTo=${redirectTo}`)
    return ""
  }

  const contentType = response.headers.get("content-type") ?? ""
  if (!contentType.includes("application/json")) {
    throw new Error("Please sign in before starting checkout")
  }

  const parsed = checkoutResponseSchema.parse(await response.json())
  if (!response.ok || !parsed.data?.url) {
    throw new Error(parsed.error ?? "Checkout could not be started")
  }

  return parsed.data.url
}

async function startBillingPortal(): Promise<string> {
  const response = await fetch("/api/stripe/portal", {
    body: JSON.stringify({ returnUrl: window.location.href }),
    headers: {
      "Content-Type": "application/json"
    },
    method: "POST"
  })
  const parsed = checkoutResponseSchema.parse(await response.json())

  if (!response.ok || !parsed.data?.url) {
    throw new Error(parsed.error ?? "Billing portal could not be opened")
  }

  return parsed.data.url
}

function PricingCard({
  action,
  annualPriceId,
  billingInterval,
  ctaLabel,
  description,
  features,
  highlighted = false,
  href,
  monthlyPriceId,
  name,
  price
}: PricingCardProps) {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const priceId = billingInterval === "year" ? annualPriceId : monthlyPriceId

  async function handleCheckout() {
    if (action === "link") {
      window.location.assign(href ?? "/login")
      return
    }

    if (action === "portal") {
      try {
        setError(null)
        setIsPending(true)
        window.location.assign(await startBillingPortal())
      } catch (checkoutError: unknown) {
        const message =
          checkoutError instanceof Error
            ? checkoutError.message
            : "Billing portal could not be opened"
        setError(message)
      } finally {
        setIsPending(false)
      }

      return
    }

    if (!priceId) {
      window.location.assign("/login")
      return
    }

    try {
      setError(null)
      setIsPending(true)
      const checkoutUrl = await startCheckout(priceId)

      if (!checkoutUrl) {
        return
      }

      window.location.assign(checkoutUrl)
    } catch (checkoutError: unknown) {
      const message =
        checkoutError instanceof Error
          ? checkoutError.message
          : "Checkout could not be started"
      setError(message)
    } finally {
      setIsPending(false)
    }
  }

  return (
    <article className={highlighted ? "pricing-card featured" : "pricing-card"}>
      <div className="pricing-card-header">
        <h2>{name}</h2>
        <strong>{price}</strong>
        <p>{description}</p>
      </div>
      <ul className="pricing-feature-list">
        {features.map((feature) => (
          <li
            className={feature.included ? "included" : "excluded"}
            key={feature.label}
          >
            <span aria-hidden="true">{feature.included ? "+" : "-"}</span>
            {feature.label}
          </li>
        ))}
      </ul>
      {action === "link" ? (
        <a className="secondary-link" href={href ?? "/login"}>
          {ctaLabel}
        </a>
      ) : priceId || action === "portal" ? (
        <button disabled={isPending} type="button" onClick={handleCheckout}>
          {isPending ? "Opening" : ctaLabel}
        </button>
      ) : (
        <a className="secondary-link" href="/login">
          {ctaLabel}
        </a>
      )}
      {error && <p className="pricing-error">{error}</p>}
    </article>
  )
}

export function PricingCards({
  accountPlan = null,
  annualPriceId,
  freeFeatures,
  isSignedIn = false,
  monthlyPriceId,
  proFeatures
}: PricingCardsProps) {
  const [billingInterval, setBillingInterval] =
    useState<BillingInterval>("month")
  const proPrice =
    billingInterval === "year" ? "GBP 79/year" : "GBP 9/month"
  const isPro = accountPlan === "pro"

  return (
    <>
      <div className="billing-toggle" aria-label="Billing interval">
        <button
          className={billingInterval === "month" ? "active" : ""}
          type="button"
          onClick={() => setBillingInterval("month")}
        >
          Monthly
        </button>
        <button
          className={billingInterval === "year" ? "active" : ""}
          type="button"
          onClick={() => setBillingInterval("year")}
        >
          Annual
          <span>save 27%</span>
        </button>
      </div>
      <div className="pricing-card-grid">
        <PricingCard
          action="link"
          billingInterval={billingInterval}
          ctaLabel={isSignedIn ? "Open workspace" : "Get started free"}
          description="For local-first tracking and light AI usage while you validate your search."
          features={freeFeatures}
          href={isSignedIn ? "/dashboard" : "/login"}
          name="Free"
          price="GBP 0/month"
        />
        <PricingCard
          action={isPro ? "portal" : "checkout"}
          annualPriceId={annualPriceId}
          billingInterval={billingInterval}
          ctaLabel={isPro ? "Manage plan" : "Start Pro"}
          description="For serious UK/EU applications, unlimited AI and resilient cloud sync."
          features={proFeatures}
          highlighted
          monthlyPriceId={monthlyPriceId}
          name="Pro"
          price={proPrice}
        />
      </div>
    </>
  )
}
