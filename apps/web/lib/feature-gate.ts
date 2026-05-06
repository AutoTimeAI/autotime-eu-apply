import { createAdminClient } from "./supabase/admin"
import type { SubscriptionPlan } from "./supabase/types"

export const FREE_AI_CALLS_PER_MONTH = 5

type CachedPlan = {
  plan: SubscriptionPlan
  expiresAt: number
}

export class FeatureGateError extends Error {
  constructor(
    public readonly code: "LIMIT_REACHED" | "NOT_PRO",
    public readonly remainingCalls: number,
    message: string
  ) {
    super(message)
    this.name = "FeatureGateError"
  }
}

const planCache = new Map<string, CachedPlan>()
const planCacheTtlMs = 60_000

function getCachedPlan(userId: string): SubscriptionPlan | null {
  const cachedPlan = planCache.get(userId)

  if (!cachedPlan || cachedPlan.expiresAt <= Date.now()) {
    planCache.delete(userId)
    return null
  }

  return cachedPlan.plan
}

function setCachedPlan(userId: string, plan: SubscriptionPlan): void {
  planCache.set(userId, {
    plan,
    expiresAt: Date.now() + planCacheTtlMs
  })
}

function normalisePlan(plan: SubscriptionPlan | null | undefined) {
  return plan === "pro" ? "pro" : "free"
}

export async function getUserPlan(
  userId: string
): Promise<SubscriptionPlan> {
  try {
    const cachedPlan = getCachedPlan(userId)

    if (cachedPlan) {
      return cachedPlan
    }

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("subscriptions")
      .select("plan")
      .eq("user_id", userId)
      .maybeSingle()

    if (error) {
      throw new Error(error.message)
    }

    const plan = normalisePlan(data?.plan)
    setCachedPlan(userId, plan)

    return plan
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unable to read user plan"

    throw new Error(message)
  }
}

export async function isProUser(userId: string): Promise<boolean> {
  try {
    const plan = await getUserPlan(userId)
    return plan === "pro"
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unable to check Pro plan"

    throw new Error(message)
  }
}

async function getMonthlyAiCallCount(userId: string): Promise<number> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase.rpc("get_monthly_ai_calls", {
      p_user_id: userId
    })

    if (error) {
      throw new Error(error.message)
    }

    return data ?? 0
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to read monthly AI usage"

    throw new Error(message)
  }
}

export async function getRemainingAiCalls(userId: string): Promise<number> {
  try {
    if (await isProUser(userId)) {
      return Number.POSITIVE_INFINITY
    }

    const monthlyCalls = await getMonthlyAiCallCount(userId)
    return Math.max(0, FREE_AI_CALLS_PER_MONTH - monthlyCalls)
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to calculate remaining AI calls"

    throw new Error(message)
  }
}

export async function trackAiCall(
  userId: string,
  opts: {
    feature: string
    model: string
    promptTokens: number
    completionTokens: number
    costUsd: number
  }
): Promise<void> {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from("ai_usage").insert({
      user_id: userId,
      feature: opts.feature,
      model: opts.model,
      prompt_tokens: opts.promptTokens,
      completion_tokens: opts.completionTokens,
      cost_usd: opts.costUsd
    })

    if (error) {
      throw new Error(error.message)
    }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unable to track AI usage"

    throw new Error(message)
  }
}

export async function assertCanUseAi(userId: string): Promise<void> {
  try {
    if (await isProUser(userId)) {
      return
    }

    const remainingCalls = await getRemainingAiCalls(userId)

    if (remainingCalls <= 0) {
      throw new FeatureGateError(
        "LIMIT_REACHED",
        0,
        "Free AI call limit reached. Upgrade to Pro to continue."
      )
    }
  } catch (error: unknown) {
    if (error instanceof FeatureGateError) {
      throw error
    }

    const message =
      error instanceof Error ? error.message : "Unable to check AI access"

    throw new Error(message)
  }
}
