"use client";

import { useState } from "react";
import { z } from "zod";
import { reportClientIssue } from "../lib/client-diagnostics";
import type { SubscriptionPlan } from "../lib/supabase/types";
import {
  billingUnavailableMessage,
  getBillingControlState,
} from "../lib/pricing-configuration";

type PricingCardAction = "checkout" | "link" | "portal";

type PricingCardFeature = {
  label: string;
  included: boolean;
};

type PricingCardProps = {
  action: PricingCardAction;
  badge?: string;
  ctaLabel: string;
  description: string;
  disabledMessage?: string;
  features: PricingCardFeature[];
  highlighted?: boolean;
  href?: string;
  name: string;
  price: string;
  priceDetail?: string;
  priceId?: string;
};

type PricingCardsProps = {
  accountPlan?: SubscriptionPlan | null;
  billingAvailable?: boolean;
  creditPackPriceId?: string;
  freeFeatures: PricingCardFeature[];
  isSignedIn?: boolean;
  monthlyPriceId?: string;
  proFeatures: PricingCardFeature[];
  quarterlyPriceId?: string;
};

const checkoutResponseSchema = z.object({
  data: z.object({ url: z.string().url() }).nullable(),
  error: z.string().nullable(),
  status: z.number(),
});

async function startCheckout(priceId: string): Promise<string> {
  const response = await fetch("/api/stripe/checkout", {
    body: JSON.stringify({
      priceId,
      returnUrl: `${window.location.origin}/dashboard`,
    }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (response.status === 401) {
    const redirectTo = encodeURIComponent("/pricing");
    window.location.assign(`/login?redirectTo=${redirectTo}`);
    return "";
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error("Please sign in before starting checkout");
  }

  const parsed = checkoutResponseSchema.parse(await response.json());
  if (!response.ok || !parsed.data?.url) {
    throw new Error(parsed.error ?? "Checkout could not be started");
  }

  return parsed.data.url;
}

async function startBillingPortal(): Promise<string> {
  const response = await fetch("/api/stripe/portal", {
    body: JSON.stringify({ returnUrl: window.location.href }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const parsed = checkoutResponseSchema.parse(await response.json());

  if (!response.ok || !parsed.data?.url) {
    throw new Error(parsed.error ?? "Billing portal could not be opened");
  }

  return parsed.data.url;
}

function PricingCard({
  action,
  badge,
  ctaLabel,
  description,
  disabledMessage,
  features,
  highlighted = false,
  href,
  name,
  price,
  priceDetail,
  priceId,
}: PricingCardProps) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout() {
    if (action === "link") {
      window.location.assign(href ?? "/login");
      return;
    }

    if (action === "portal") {
      try {
        setError(null);
        setIsPending(true);
        window.location.assign(await startBillingPortal());
      } catch (checkoutError: unknown) {
        const message =
          checkoutError instanceof Error
            ? checkoutError.message
            : "Billing portal could not be opened";
        setError(message);
        reportClientIssue({
          area: "billing",
          code: "billing.portal.open.failed",
          message,
        });
      } finally {
        setIsPending(false);
      }

      return;
    }

    if (!priceId) {
      window.location.assign("/login");
      return;
    }

    try {
      setError(null);
      setIsPending(true);
      const checkoutUrl = await startCheckout(priceId);

      if (!checkoutUrl) {
        return;
      }

      window.location.assign(checkoutUrl);
    } catch (checkoutError: unknown) {
      const message =
        checkoutError instanceof Error
          ? checkoutError.message
          : "Checkout could not be started";
      setError(message);
      reportClientIssue({
        area: "billing",
        code: "billing.checkout.start.failed",
        message,
        metadata: {
          priceId,
        },
      });
    } finally {
      setIsPending(false);
    }
  }

  return (
    <article className={highlighted ? "pricing-card featured" : "pricing-card"}>
      <div className="pricing-card-header">
        {badge ? <span className="pricing-card-badge">{badge}</span> : null}
        <h2>{name}</h2>
        <strong>{price}</strong>
        {priceDetail ? (
          <p className="pricing-price-detail">{priceDetail}</p>
        ) : null}
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
      {disabledMessage ? (
        <button disabled type="button">
          Billing unavailable
        </button>
      ) : action === "link" ? (
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
      {disabledMessage && <p className="pricing-error">{disabledMessage}</p>}
    </article>
  );
}

export function PricingCards({
  accountPlan = null,
  billingAvailable = true,
  creditPackPriceId,
  freeFeatures,
  isSignedIn = false,
  monthlyPriceId,
  proFeatures,
  quarterlyPriceId,
}: PricingCardsProps) {
  const isPaid = accountPlan === "pro";
  const billingControl = getBillingControlState(billingAvailable);

  return (
    <>
      <div className="pricing-card-grid">
        <PricingCard
          action="link"
          ctaLabel={isSignedIn ? "Open dashboard" : "Start free"}
          description="Strategic targeting, country-aware fit, tracked jobs and five monthly AI analyses."
          features={freeFeatures}
          href={isSignedIn ? "/dashboard" : "/login"}
          name="Free"
          price="GBP 0/month"
        />
        <PricingCard
          action={isPaid ? "portal" : "checkout"}
          badge="Flexible"
          ctaLabel={isPaid ? "Manage plan" : "Start Pro"}
          description="50 monthly AI actions, full workflow sync, application writing and interview prep."
          disabledMessage={
            billingControl.disabled ? billingUnavailableMessage : undefined
          }
          features={proFeatures}
          name="Pro Monthly"
          price="GBP 9/month"
          priceDetail="Cancel any time"
          priceId={monthlyPriceId}
        />
        <PricingCard
          action={isPaid ? "portal" : "checkout"}
          badge="Best value"
          ctaLabel={isPaid ? "Manage plan" : "Choose quarterly"}
          description="The complete Pro workflow with one payment every three months."
          disabledMessage={
            billingControl.disabled ? billingUnavailableMessage : undefined
          }
          features={proFeatures}
          highlighted
          name="Pro Quarterly"
          price="GBP 19/3 months"
          priceDetail="Equivalent to GBP 6.33/month - save GBP 8"
          priceId={quarterlyPriceId}
        />
      </div>
      <CreditPackPanel
        billingAvailable={billingAvailable}
        priceId={creditPackPriceId}
      />
    </>
  );
}

function CreditPackPanel({
  billingAvailable,
  priceId,
}: {
  billingAvailable: boolean;
  priceId?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function buyCredits() {
    if (!priceId) {
      window.location.assign("/login?redirectTo=%2Fpricing");
      return;
    }

    try {
      setError(null);
      setIsPending(true);
      const checkoutUrl = await startCheckout(priceId);
      if (checkoutUrl) window.location.assign(checkoutUrl);
    } catch (checkoutError: unknown) {
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : "Credit checkout could not be started",
      );
    } finally {
      setIsPending(false);
    }
  }

  return (
    <section className="credit-pack-panel" aria-labelledby="credit-pack-title">
      <div>
        <span className="pricing-card-badge">No subscription required</span>
        <h2 id="credit-pack-title">Need occasional extra AI?</h2>
        <p>
          Add 25 non-expiring AI credits for GBP 5. One successful AI action
          uses one credit after your monthly allowance.
        </p>
      </div>
      <div className="credit-pack-action">
        <strong>GBP 5</strong>
        <button
          disabled={!billingAvailable || isPending}
          type="button"
          onClick={buyCredits}
        >
          {isPending ? "Opening" : "Buy 25 credits"}
        </button>
        {!billingAvailable ? (
          <p className="pricing-error">{billingUnavailableMessage}</p>
        ) : null}
        {error ? <p className="pricing-error">{error}</p> : null}
      </div>
    </section>
  );
}
