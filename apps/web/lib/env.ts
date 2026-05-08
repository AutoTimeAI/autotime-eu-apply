import { z } from "zod"

const requiredString = (name: string) =>
  z
    .string({ error: `${name} is required` })
    .trim()
    .min(1, `${name} is required`)

const optionalString = () => z.string().trim().optional().default("")

const publicEnvSchema = z.object({
  NEXT_PUBLIC_AUTOTIME_ENV: z
    .enum(["development", "preview", "production"])
    .optional()
    .default("development"),
  NEXT_PUBLIC_SUPABASE_URL: requiredString("NEXT_PUBLIC_SUPABASE_URL").url(
    "NEXT_PUBLIC_SUPABASE_URL must be a valid URL"
  ),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: requiredString(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  ),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: requiredString(
    "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
  ),
  NEXT_PUBLIC_APP_URL: requiredString("NEXT_PUBLIC_APP_URL").url(
    "NEXT_PUBLIC_APP_URL must be a valid URL"
  ),
  NEXT_PUBLIC_POSTHOG_KEY: optionalString(),
  NEXT_PUBLIC_POSTHOG_HOST: z
    .string()
    .trim()
    .url("NEXT_PUBLIC_POSTHOG_HOST must be a valid URL")
    .optional()
    .default("https://eu.posthog.com")
})

const serverEnvSchema = publicEnvSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: requiredString("SUPABASE_SERVICE_ROLE_KEY"),
  OPENAI_API_KEY: requiredString("OPENAI_API_KEY"),
  STRIPE_SECRET_KEY: requiredString("STRIPE_SECRET_KEY"),
  STRIPE_WEBHOOK_SECRET: requiredString("STRIPE_WEBHOOK_SECRET"),
  STRIPE_PRO_MONTHLY_PRICE_ID: requiredString("STRIPE_PRO_MONTHLY_PRICE_ID"),
  STRIPE_PRO_ANNUAL_PRICE_ID: requiredString("STRIPE_PRO_ANNUAL_PRICE_ID"),
  RESEND_API_KEY: requiredString("RESEND_API_KEY")
})

export type PublicEnv = z.infer<typeof publicEnvSchema>
export type ServerEnv = z.infer<typeof serverEnvSchema>

function formatEnvError(error: z.ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ")
}

function parsePublicEnv(): PublicEnv {
  const result = publicEnvSchema.safeParse({
    NEXT_PUBLIC_AUTOTIME_ENV: process.env.NEXT_PUBLIC_AUTOTIME_ENV,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST
  })

  if (!result.success) {
    throw new Error(`Invalid public environment: ${formatEnvError(result.error)}`)
  }

  return result.data
}

function parseServerEnv(): ServerEnv {
  if (typeof window !== "undefined") {
    throw new Error("Server environment cannot be accessed in the browser")
  }

  const result = serverEnvSchema.safeParse({
    ...parsePublicEnv(),
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    STRIPE_PRO_MONTHLY_PRICE_ID: process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
    STRIPE_PRO_ANNUAL_PRICE_ID: process.env.STRIPE_PRO_ANNUAL_PRICE_ID,
    RESEND_API_KEY: process.env.RESEND_API_KEY
  })

  if (!result.success) {
    throw new Error(`Invalid server environment: ${formatEnvError(result.error)}`)
  }

  return result.data
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production"
}

export const publicEnv = parsePublicEnv()

export function getServerEnv(): ServerEnv {
  return parseServerEnv()
}

export const env = {
  public: publicEnv,
  get server(): ServerEnv {
    return getServerEnv()
  }
} as const
