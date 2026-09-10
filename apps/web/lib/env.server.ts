/** Validates secrets and integration settings that must remain server-only. */
import "server-only"
import { z } from "zod"
import { ConfigurationUnavailableError } from "./configuration-error.ts"
import { getSupabasePublicEnv } from "./env.ts"

const requiredString = z.string().trim().min(1)

function requireServerValue(integration: string, value: unknown): string {
  const parsed = requiredString.safeParse(value)
  if (!parsed.success) throw new ConfigurationUnavailableError(integration)
  return parsed.data
}

const placeholderValue =
  /(?:example|placeholder|offline|changeme|your[-_]|_your_|price_test_|sk_test_your|whsec_your)/i

function requireOperationalValue(integration: string, value: unknown): string {
  const parsed = requireServerValue(integration, value)
  if (placeholderValue.test(parsed)) {
    throw new ConfigurationUnavailableError(integration)
  }
  return parsed
}

/** Returns validated privileged Supabase credentials. */
export function getSupabaseServiceRoleEnv(): {
  serviceRoleKey: string
  url: string
} {
  const { url } = getSupabasePublicEnv()
  return {
    serviceRoleKey: requireServerValue(
      "privileged database",
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    ),
    url,
  }
}

/** Returns the validated Stripe secret key. */
export function getStripeSecretEnv(): { secretKey: string } {
  return {
    secretKey: requireOperationalValue("billing", process.env.STRIPE_SECRET_KEY),
  }
}

/** Returns validated Stripe price identifiers. */
export function getStripePriceEnv(): {
  creditPack: string
  proMonthly: string
  proQuarterly: string
} {
  return {
    creditPack: requireOperationalValue(
      "billing prices",
      process.env.STRIPE_AI_CREDIT_PACK_PRICE_ID,
    ),
    proMonthly: requireOperationalValue(
      "billing prices",
      process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
    ),
    proQuarterly: requireOperationalValue(
      "billing prices",
      process.env.STRIPE_PRO_QUARTERLY_PRICE_ID,
    ),
  }
}

/** Returns the validated Stripe webhook signing secret. */
export function getStripeWebhookEnv(): { webhookSecret: string } {
  return {
    webhookSecret: requireServerValue(
      "billing webhook",
      process.env.STRIPE_WEBHOOK_SECRET,
    ),
  }
}

/** Returns the validated OpenAI API key. */
export function getOpenAIEnv(): { apiKey: string } {
  return { apiKey: requireServerValue("AI", process.env.OPENAI_API_KEY) }
}

/** Returns the validated Resend API key. */
export function getResendEnv(): { apiKey: string } {
  return { apiKey: requireServerValue("email", process.env.RESEND_API_KEY) }
}

export function getAnalyticsInternalEnv(): { secret: string } {
  return {
    secret: requireServerValue(
      "analytics",
      process.env.ANALYTICS_INTERNAL_SECRET,
    ),
  }
}
