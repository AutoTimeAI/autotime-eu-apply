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

export function getStripeSecretEnv(): { secretKey: string } {
  return {
    secretKey: requireServerValue("billing", process.env.STRIPE_SECRET_KEY),
  }
}

export function getStripePriceEnv(): {
  creditPack: string
  proMonthly: string
  proQuarterly: string
} {
  return {
    creditPack: requireServerValue(
      "billing prices",
      process.env.STRIPE_AI_CREDIT_PACK_PRICE_ID,
    ),
    proMonthly: requireServerValue(
      "billing prices",
      process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
    ),
    proQuarterly: requireServerValue(
      "billing prices",
      process.env.STRIPE_PRO_QUARTERLY_PRICE_ID,
    ),
  }
}

export function getStripeWebhookEnv(): { webhookSecret: string } {
  return {
    webhookSecret: requireServerValue(
      "billing webhook",
      process.env.STRIPE_WEBHOOK_SECRET,
    ),
  }
}

export function getOpenAIEnv(): { apiKey: string } {
  return { apiKey: requireServerValue("AI", process.env.OPENAI_API_KEY) }
}

export function getResendEnv(): { apiKey: string } {
  return { apiKey: requireServerValue("email", process.env.RESEND_API_KEY) }
}
