import { NextResponse } from "next/server"
import { isAdminUser } from "../../../../lib/admin-access"
import { getEnvReadiness } from "../../../../lib/diagnostics"
import { createServerClient } from "../../../../lib/supabase/server"

type ProviderHealth = {
  configured: boolean
  name: string
  notes: string[]
}

function providerHealth(): ProviderHealth[] {
  const env = getEnvReadiness()
  const has = (name: string) =>
    env.some((item) => item.name === name && item.configured)

  return [
    {
      configured:
        has("NEXT_PUBLIC_SUPABASE_URL") &&
        has("NEXT_PUBLIC_SUPABASE_ANON_KEY") &&
        has("SUPABASE_SERVICE_ROLE_KEY"),
      name: "supabase",
      notes: [
        "Auth, dashboard session, subscriptions table, profile sync, and RLS depend on Supabase.",
        "OAuth providers must also be enabled in Supabase Authentication settings."
      ]
    },
    {
      configured:
        has("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY") &&
        has("STRIPE_SECRET_KEY") &&
        has("STRIPE_WEBHOOK_SECRET") &&
        has("STRIPE_PRO_MONTHLY_PRICE_ID") &&
        has("STRIPE_PRO_ANNUAL_PRICE_ID"),
      name: "stripe",
      notes: [
        "Checkout, customer portal, subscription webhooks, and plan upgrades depend on Stripe.",
        "Webhook endpoint should be /api/stripe/webhook with matching whsec value."
      ]
    },
    {
      configured: has("OPENAI_API_KEY"),
      name: "openai",
      notes: [
        "Job analysis, application content, and interview prep depend on OpenAI."
      ]
    },
    {
      configured: has("RESEND_API_KEY"),
      name: "resend",
      notes: ["Welcome and upgrade confirmation email delivery depends on Resend."]
    },
    {
      configured: has("NEXT_PUBLIC_APP_URL"),
      name: "app-url",
      notes: [
        "OAuth callback, Stripe return URLs, and portal redirects depend on NEXT_PUBLIC_APP_URL."
      ]
    },
    {
      configured: has("NEXT_PUBLIC_POSTHOG_HOST"),
      name: "analytics",
      notes: [
        "PostHog is optional unless NEXT_PUBLIC_POSTHOG_KEY is set and consent is granted."
      ]
    }
  ]
}

export async function GET() {
  const supabase = await createServerClient()
  const {
    data: { user },
    error
  } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json(
      {
        data: null,
        error: "Unauthorised",
        status: 401
      },
      { status: 401 }
    )
  }

  if (!isAdminUser(user)) {
    return NextResponse.json(
      {
        data: null,
        error: "Forbidden",
        status: 403
      },
      { status: 403 }
    )
  }

  const env = getEnvReadiness()
  const providers = providerHealth()

  return NextResponse.json({
    data: {
      checkedAt: new Date().toISOString(),
      env,
      healthy:
        env.filter((item) => item.required).every((item) => item.configured) &&
        providers.every((item) => item.configured || item.name === "analytics"),
      providers
    },
    error: null,
    status: 200
  })
}
