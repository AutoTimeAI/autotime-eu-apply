"use client"

import { useState } from "react"
import { z } from "zod"

type BillingInterval = "month" | "year"

type PricingCardFeature = {
  label: string
  included: boolean
}

type PricingCardProps = {
  annualPriceId?: string
  billingInterval: BillingInterval
  ctaLabel: string
  description: string
  features: PricingCardFeature[]
  highlighted?: boolean
  monthlyPriceId?: string
  name: string
  price: string
}

type PricingCardsProps = {
  annualPriceId: string
  freeFeatures: PricingCardFeature[]
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

function PricingCard({
  annualPriceId,
  billingInterval,
  ctaLabel,
  description,
  features,
  highlighted = false,
  monthlyPriceId,
  name,
  price
}: PricingCardProps) {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const priceId = billingInterval === "year" ? annualPriceId : monthlyPriceId

  async function handleCheckout() {
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
      {priceId ? (
        <button disabled={isPending} type="button" onClick={handleCheckout}>
          {isPending ? "Starting checkout" : ctaLabel}
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
  annualPriceId,
  freeFeatures,
  monthlyPriceId,
  proFeatures
}: PricingCardsProps) {
  const [billingInterval, setBillingInterval] =
    useState<BillingInterval>("month")
  const proPrice =
    billingInterval === "year" ? "GBP 79/year" : "GBP 9/month"

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
          billingInterval={billingInterval}
          ctaLabel="Get started free"
          description="For local-first tracking and light AI usage while you validate your search."
          features={freeFeatures}
          name="Free"
          price="GBP 0/month"
        />
        <PricingCard
          annualPriceId={annualPriceId}
          billingInterval={billingInterval}
          ctaLabel="Start Pro"
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
